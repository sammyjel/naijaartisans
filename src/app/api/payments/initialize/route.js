import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { paystackInitialize, paystackConfigured } from "@/lib/paystack";
import { PLANS } from "@/lib/monetization";
import { SITE_URL } from "@/lib/seo";

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  if (!paystackConfigured()) {
    return NextResponse.json({ error: "Payments aren't enabled yet." }, { status: 503 });
  }

  const { plan, email: providedEmail } = await request.json().catch(() => ({}));
  const planDef = PLANS.find((p) => p.id === plan);
  if (!planDef) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });

  // Paystack requires an email. Use the account email, or one provided now.
  const email = (user.email || providedEmail || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "An email is required to pay. Please add one." }, { status: 400 });
  }
  // Save the email if the account didn't have one (best-effort).
  if (!user.email) {
    try {
      await prisma.user.update({ where: { id: user.id }, data: { email } });
    } catch {
      /* email may already belong to another account — ignore, payment can still proceed */
    }
  }

  const reference = `na_${plan}_${user.id}_${crypto.randomBytes(6).toString("hex")}`;
  try {
    const data = await paystackInitialize({
      email,
      amountKobo: planDef.price * 100,
      reference,
      metadata: { userId: user.id, plan, name: user.name },
      callbackUrl: `${SITE_URL}/dashboard?payment=processing`,
    });
    return NextResponse.json({ authorization_url: data.authorization_url });
  } catch (e) {
    console.error("paystack init error", e);
    return NextResponse.json({ error: "Could not start payment. Try again." }, { status: 502 });
  }
}
