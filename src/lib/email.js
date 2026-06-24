// Minimal email sender using Resend's HTTP API (no SDK dependency).
// Configure with RESEND_API_KEY and EMAIL_FROM in your environment.

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail({ to, subject, html }) {
  const key = (process.env.RESEND_API_KEY || "").trim();
  if (!key) {
    console.warn("RESEND_API_KEY not set — email not sent.");
    return { sent: false, reason: "not_configured" };
  }
  const from = process.env.EMAIL_FROM || "NaijaArtisans <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Resend send failed:", res.status, body);
      return { sent: false, reason: "send_failed" };
    }
    return { sent: true };
  } catch (e) {
    console.error("Resend error:", e);
    return { sent: false, reason: "error" };
  }
}
