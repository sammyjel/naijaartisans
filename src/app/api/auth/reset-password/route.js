import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function POST(request) {
  const { token, password } = await request.json().catch(() => ({}));

  if (!token) return NextResponse.json({ error: "Invalid reset link." }, { status: 400 });
  if (!password || password.length < 6)
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const user = await prisma.user.findFirst({
    where: { resetTokenHash: tokenHash, resetTokenExpiry: { gt: new Date() } },
    select: { id: true },
  });

  if (!user)
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await hashPassword(password),
      resetTokenHash: null,
      resetTokenExpiry: null,
    },
  });

  return NextResponse.json({ ok: true });
}
