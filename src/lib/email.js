// Minimal email sender using Resend's HTTP API (no SDK dependency).
// Configure with RESEND_API_KEY and EMAIL_FROM in your environment.
//
// ── RATE LIMITING ──────────────────────────────────────────────────────────
//
// Resend allows 10 requests per second and answers 429 above that. Every path
// that matters here sends in bursts — a new job broadcasts to ~50 artisans, the
// backfill sends 45 digests — so an unpaced sender does not merely risk the
// limit, it exceeds it every time. It did: the 2026-09-28 backfill lost 17 of
// 45 digests to 429s, and nothing retried them.
//
// So pacing lives here rather than in any one caller. Both the live broadcast
// and the backfill go through sendEmail, and neither should have to remember.
// The limiter is per-instance, which is the right scope: a burst comes from one
// invocation looping over recipients, not from many instances at once.

const MAX_PER_SECOND = Math.max(1, Number(process.env.EMAIL_MAX_PER_SECOND || 5));
const MAX_ATTEMPTS = Math.max(1, Number(process.env.EMAIL_MAX_ATTEMPTS || 4));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Timestamps of recent sends, oldest first. Kept trimmed to the last second.
const recent = [];

/** Blocks until sending now would stay within MAX_PER_SECOND. */
async function acquireSlot() {
  for (;;) {
    const now = Date.now();
    while (recent.length && now - recent[0] >= 1000) recent.shift();
    if (recent.length < MAX_PER_SECOND) {
      recent.push(now);
      return;
    }
    // Wait until the oldest request falls out of the window.
    await sleep(1000 - (now - recent[0]) + 5);
  }
}

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Sends one email.
 *
 * @returns {Promise<{sent:boolean, reason?:string, status?:number, attempts?:number}>}
 *   `reason` is "not_configured", "rate_limited" (429 survived every retry),
 *   "send_failed" (a non-retryable API error) or "error" (network/throw).
 *   Never throws — callers treat a failed send as a failed send, not a crash.
 */
export async function sendEmail({ to, subject, html }) {
  const key = (process.env.RESEND_API_KEY || "").trim();
  if (!key) {
    console.warn("RESEND_API_KEY not set — email not sent.");
    return { sent: false, reason: "not_configured" };
  }
  const from = (process.env.EMAIL_FROM || "NaijaArtisans <onboarding@resend.dev>").trim();

  let lastStatus;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    await acquireSlot();
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, subject, html }),
      });
      if (res.ok) return { sent: true, status: res.status, attempts: attempt };

      lastStatus = res.status;
      const body = await res.text().catch(() => "");

      // 429 and 5xx are worth another go; 4xx otherwise means this message will
      // never be accepted (bad address, rejected domain) and retrying only
      // burns rate-limit budget that a recoverable send could have used.
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt === MAX_ATTEMPTS) {
        console.error("Resend send failed:", res.status, body);
        return {
          sent: false,
          reason: res.status === 429 ? "rate_limited" : "send_failed",
          status: res.status,
          attempts: attempt,
        };
      }

      // Honour Retry-After when Resend sends one, otherwise back off.
      const header = Number(res.headers.get("retry-after"));
      const waitMs = Number.isFinite(header) && header > 0 ? header * 1000 : 500 * 2 ** (attempt - 1);
      console.warn(`Resend ${res.status} — retrying in ${waitMs}ms (attempt ${attempt}/${MAX_ATTEMPTS})`);
      await sleep(waitMs);
    } catch (e) {
      if (attempt === MAX_ATTEMPTS) {
        console.error("Resend error:", e);
        return { sent: false, reason: "error", attempts: attempt };
      }
      await sleep(500 * 2 ** (attempt - 1));
    }
  }

  return { sent: false, reason: "send_failed", status: lastStatus, attempts: MAX_ATTEMPTS };
}
