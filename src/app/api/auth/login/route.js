import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setAuthCookie } from "@/lib/auth";

export async function POST(request) {
  try {
    const { identifier, password } = await request.json();
    const id = (identifier || "").trim();

    if (!id || !password)
      return NextResponse.json({ error: "Enter your email/phone and password." }, { status: 400 });

    // identifier can be an email or a phone number
    const isEmail = id.includes("@");
    const user = await prisma.user.findUnique({
      where: isEmail ? { email: id.toLowerCase() } : { phone: id },
    });

    if (!user || !(await verifyPassword(password, user.password)))
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });

    setAuthCookie(user.id);
    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, city: user.city },
    });
  } catch (err) {
    console.error("login error", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
