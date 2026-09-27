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

  // The charge must actually cover the plan being claimed. The signature proves
  // Paystack sent this, but not that the amount matches what the plan costs —
  // and the entitlement below is granted purely on `metadata.plan`.
  const expectedKobo = planDef.price * 100;
  if (typeof amount !== "number" || amount < expectedKobo) {
    console.error("paystack amount below plan price", { reference, amount, expectedKobo, plan });
    return new Response("Amount does not match plan", { status: 200 });
  }

  // Record the payment and grant the entitlement ATOMICALLY.
  //
  // Two separate problems are solved by the one transaction:
  //
  //  1. Double grant. This used to be findUnique-then-return with the Payment
  //     row written last. Paystack retries on any non-2xx, so two retries could
  //     both pass the "already processed?" check and both extend the
  //     subscription before either row existed — one payment, two months of Pro.
  //     Inserting inside the transaction makes the `reference` unique
  //     constraint the lock, and the loser rolls back having changed nothing.
  //
  //  2. Paid but not activated. Claiming the reference in its own statement and
  //     granting afterwards would mean a crash in between leaves the customer
  //     charged with no subscription — and every retry then hits the unique
  //     constraint and refuses to finish the job. Rolling both together means a
  //     failure leaves no trace and the retry genuinely retries.
  const field = plan === "pro" ? "proUntil" : "featuredUntil";
  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: { reference, userId, plan, amount, status: "success" },
      });

      const userRec = await tx.user.findUnique({
        where: { id: userId },
        select: { [field]: true },
      });
      if (!userRec) throw Object.assign(new Error("no such user"), { code: "NO_USER" });

      // Extend from the current expiry when it is still in the future, so buying
      // a second month adds to the first rather than restarting it.
      const current = userRec[field];
      const base = current && new Date(current) > new Date() ? new Date(current) : new Date();
      const extended = new Date(base.getTime() + planDef.days * DAY);

      await tx.user.update({ where: { id: userId }, data: { [field]: extended } });
    });
  } catch (e) {
    // P2002 = unique violation: this reference was already fully processed.
    if (e?.code === "P2002") return new Response("Already processed", { status: 200 });
    // An unknown user is not retryable — 200 stops Paystack hammering us.
    if (e?.code === "NO_USER") {
      console.error("paystack webhook for unknown user", { reference, userId });
      return new Response("No user", { status: 200 });
    }
    // Anything else is transient: 500 asks Paystack to retry, and nothing was
    // written, so the retry starts clean.
    console.error("activation failed", e);
    return new Response("Activation failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
