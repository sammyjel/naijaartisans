import crypto from "crypto";

const BASE = "https://api.paystack.co";

export function paystackConfigured() {
  return Boolean((process.env.PAYSTACK_SECRET_KEY || "").trim());
}

// Start a transaction; returns { authorization_url, reference, ... }.
export async function paystackInitialize({ email, amountKobo, reference, metadata, callbackUrl }) {
  const key = (process.env.PAYSTACK_SECRET_KEY || "").trim();
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      amount: amountKobo,
      reference,
      metadata,
      callback_url: callbackUrl,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.status) throw new Error(data.message || "Paystack initialize failed");
  return data.data;
}

// Verify the x-paystack-signature header against the raw request body.
//
// Compared in constant time: `===` on a hex digest returns as soon as it finds a
// differing character, and that timing difference is measurable. It is a slow
// attack over a network, but the fix costs nothing.
export function verifyPaystackSignature(rawBody, signature) {
  const key = (process.env.PAYSTACK_SECRET_KEY || "").trim();
  if (!key || !signature) return false;
  const expected = crypto.createHmac("sha512", key).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(signature), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
