import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, setAuthCookie } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();
    let { name, email, phone, password, role, city, bio, ref, latitude, longitude, openTime, closeTime, categoryId } = body;

    name = (name || "").trim();
    email = (email || "").trim().toLowerCase() || null;
    phone = (phone || "").trim() || null;
    city = (city || "").trim() || null;
    bio = (bio || "").trim() || null;
    role = role === "ARTISAN" ? "ARTISAN" : "CUSTOMER";

    // Optional business hours ("HH:MM"); keep only valid values.
    const timeRe = /^\d{1,2}:\d{2}$/;
    openTime = timeRe.test((openTime || "").trim()) ? openTime.trim() : null;
    closeTime = timeRe.test((closeTime || "").trim()) ? closeTime.trim() : null;

    // Validate optional geolocation (only store sensible coordinates).
    const lat = Number(latitude);
    const lng = Number(longitude);
    const hasGeo = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (!email && !phone)
      return NextResponse.json({ error: "Provide an email or a phone number." }, { status: 400 });
    if (!password || password.length < 6)
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });

    // Uniqueness checks
    if (email) {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) return NextResponse.json({ error: "Email is already registered." }, { status: 409 });
    }
    if (phone) {
      const exists = await prisma.user.findUnique({ where: { phone } });
      if (exists) return NextResponse.json({ error: "Phone number is already registered." }, { status: 409 });
    }

    // Referral attribution — only link to a real existing referrer.
    let referredById = null;
    const refId = (ref || "").trim();
    if (refId) {
      const referrer = await prisma.user.findUnique({ where: { id: refId }, select: { id: true } });
      if (referrer && referrer.id !== null) referredById = referrer.id;
    }

    const user = await prisma.user.create({
      data: {
        name, email, phone, password: await hashPassword(password), role, city, bio, referredById,
        ...(hasGeo ? { latitude: lat, longitude: lng } : {}),
        ...(openTime ? { openTime } : {}),
        ...(closeTime ? { closeTime } : {}),
      },
      select: { id: true, name: true, email: true, phone: true, role: true, city: true },
    });

    // If an artisan picked a trade, create a starter listing so they show up on
    // "Find Artisans" immediately (they can edit prices/details later).
    if (user.role === "ARTISAN") {
      const catId = (categoryId || "").trim();
      if (catId) {
        try {
          const cat = await prisma.category.findUnique({ where: { id: catId }, select: { id: true, name: true } });
          if (cat) {
            await prisma.service.create({
              data: {
                title: cat.name,
                description: bio || `${cat.name} services${city ? ` in ${city}` : " in Nigeria"}.`,
                city: city || "Nigeria",
                categoryId: cat.id,
                artisanId: user.id,
              },
            });
          }
        } catch (e) {
          console.error("starter service creation failed", e); // never block signup
        }
      }
    }

    // Reward the referrer with extra Featured time (extend from now or their current expiry).
    if (referredById) {
      try {
        const referrer = await prisma.user.findUnique({
          where: { id: referredById },
          select: { featuredUntil: true },
        });
        const base = referrer?.featuredUntil && new Date(referrer.featuredUntil) > new Date()
          ? new Date(referrer.featuredUntil)
          : new Date();
        const extended = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days per referral
        await prisma.user.update({ where: { id: referredById }, data: { featuredUntil: extended } });
      } catch (e) {
        console.error("referral reward failed", e); // never block signup on this
      }
    }

    setAuthCookie(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    console.error("register error", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
