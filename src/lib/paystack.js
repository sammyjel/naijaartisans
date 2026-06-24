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
export function verifyPaystackSignature(rawBody, signature) {
  const key = (process.env.PAYSTACK_SECRET_KEY || "").trim();
  if (!key || !signature) return false;
  const hash = crypto.createHmac("sha512", key).update(rawBody).digest("hex");
  return hash === signature;
}
