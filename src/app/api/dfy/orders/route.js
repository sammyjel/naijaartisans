// POST — place a done-for-you order and get the Paystack URL for the deposit.
// No account needed: a checkout that demands registration loses the sale.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { paystackConfigured } from "@/lib/paystack";
import { packageBySlug, validateBrief } from "@/lib/dfy-catalog";
import { createOrder } from "@/lib/dfy";

export async function POST(request) {
  if (!paystackConfigured()) {
    return NextResponse.json({ error: "Online payment is not switched on yet. Please contact us to order." }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));
  const pkg = packageBySlug(body.slug);
  if (!pkg) return NextResponse.json({ error: "That package is not available." }, { status: 404 });

  const name = String(body.name || "").trim().slice(0, 120);
  const email = String(body.email || "").trim().toLowerCase().slice(0, 200);
  const phone = String(body.phone || "").trim().slice(0, 40);
  if (name.length < 2) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Please enter a valid email — your files and receipt go there." }, { status: 400 });

  const brief = validateBrief(pkg, body.answers);
  if (!brief.ok) return NextResponse.json({ error: brief.error }, { status: 400 });

  const user = await getCurrentUser().catch(() => null);
  try {
    const { url } = await createOrder({ pkg, answers: brief.answers, name, email, phone, customerId: user?.id });
    return NextResponse.json({ authorization_url: url });
  } catch (e) {
    console.error("[dfy] order failed", e);
    return NextResponse.json({ error: "Could not start your order. Please try again." }, { status: 502 });
  }
}
