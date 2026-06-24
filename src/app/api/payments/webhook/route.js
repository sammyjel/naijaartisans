import { prisma } from "@/lib/prisma";
import { verifyPaystackSignature } from "@/lib/paystack";
import { PLANS } from "@/lib/monetization";

const DAY = 24 * 60 * 60 * 1000;

export async function POST(request) {
  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  if (!verifyPaystackSignature(raw, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad payload", { status: 400 });
  }

  if (event?.event !== "charge.success") return new Response("Ignored", { status: 200 });

  const data = event.data || {};
  const reference = data.reference;
  const amount = data.amount;
  const userId = data.metadata?.userId;
  const plan = data.metadata?.plan;
  const planDef = PLANS.find((p) => p.id === plan);
  if (!reference || !userId || !planDef) return new Response("Missing data", { status: 200 });

  // Idempotency: skip if we've already recorded this reference.
  try {
    const existing = await prisma.payment.findUnique({ where: { reference } });
    if (existing) return new Response("Already processed", { status: 200 });
  } catch {
    /* Payment table may not exist yet — still activate below */
  }

  // Extend the right entitlement from now (or current expiry, whichever is later).
  const field = plan === "pro" ? "proUntil" : "featuredUntil";
  try {
    const userRec = await prisma.user.findUnique({ where: { id: userId }, select: { [field]: true } });
    if (!userRec) return new Response("No user", { status: 200 });
    const current = userRec[field];
    const base = current && new Date(current) > new Date() ? new Date(current) : new Date();
    const extended = new Date(base.getTime() + planDef.days * DAY);
    await prisma.user.update({ where: { id: userId }, data: { [field]: extended } });
  } catch (e) {
    console.error("activation error", e);
    return new Response("Activation failed", { status: 500 });
  }

  // Record the payment (best-effort; also enforces idempotency next time).
  try {
    await prisma.payment.create({ data: { reference, userId, plan, amount: amount || planDef.price * 100, status: "success" } });
  } catch {
    /* table missing or duplicate — entitlement already granted */
  }

  return new Response("OK", { status: 200 });
}
