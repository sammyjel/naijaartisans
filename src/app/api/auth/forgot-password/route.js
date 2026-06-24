import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailConfigured } from "@/lib/email";
import { SITE_URL } from "@/lib/seo";

const ONE_HOUR = 60 * 60 * 1000;

export async function POST(request) {
  // If no email provider is set up, tell the page so it shows a helpful message
  // instead of pretending an email was sent.
  if (!emailConfigured()) {
    return NextResponse.json({ ok: true, configured: false });
  }

  const { email } = await request.json().catch(() => ({}));
  const cleaned = (email || "").trim().toLowerCase();

  // Always respond the same way so we never reveal which emails are registered.
  const generic = NextResponse.json({ ok: true, configured: true });
  if (!cleaned || !cleaned.includes("@")) return generic;

  try {
    const user = await prisma.user.findUnique({ where: { email: cleaned }, select: { id: true, name: true } });
    if (!user) return generic;

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: { resetTokenHash: tokenHash, resetTokenExpiry: new Date(Date.now() + ONE_HOUR) },
    });

    const link = `${SITE_URL}/reset-password?token=${rawToken}`;
    await sendEmail({
      to: cleaned,
      subject: "Reset your NaijaArtisans password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#027a48">NaijaArtisans</h2>
          <p>Hi ${user.name?.split(" ")[0] || "there"},</p>
          <p>We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
          <p><a href="${link}" style="display:inline-block;background:#027a48;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Reset my password</a></p>
          <p style="color:#666;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
          <p style="color:#999;font-size:12px">Or paste this link into your browser: ${link}</p>
        </div>
      `,
    });
  } catch (e) {
    console.error("forgot-password error", e);
  }

  return generic;
}
