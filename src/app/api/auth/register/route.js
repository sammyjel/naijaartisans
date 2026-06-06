import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, setAuthCookie } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();
    let { name, email, phone, password, role, city, bio } = body;

    name = (name || "").trim();
    email = (email || "").trim().toLowerCase() || null;
    phone = (phone || "").trim() || null;
    city = (city || "").trim() || null;
    bio = (bio || "").trim() || null;
    role = role === "ARTISAN" ? "ARTISAN" : "CUSTOMER";

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

    const user = await prisma.user.create({
      data: { name, email, phone, password: await hashPassword(password), role, city, bio },
      select: { id: true, name: true, email: true, phone: true, role: true, city: true },
    });

    setAuthCookie(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    console.error("register error", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
