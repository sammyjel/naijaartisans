import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signToken } from "@/lib/auth";
import { ADMIN_COOKIE } from "@/lib/admin";

const SEVEN_DAYS = 60 * 60 * 24 * 7;

export async function POST(request) {
  const key = (process.env.ADMIN_KEY || "").trim();
  if (!key) return NextResponse.json({ error: "Admin access is not configured yet." }, { status: 500 });

  const { password } = await request.json().catch(() => ({}));
  if (!password || password.trim() !== key) {
    return NextResponse.json({ error: "Incorrect admin password." }, { status: 401 });
  }

  const token = signToken({ admin: true });
  cookies().set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SEVEN_DAYS,
  });
  return NextResponse.json({ ok: true });
}
