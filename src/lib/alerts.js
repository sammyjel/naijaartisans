// Operator alerts — "what just happened on my site" email.
//
// This exists because the done-for-you business has a clock on it. A directory
// listing can sit unread for a week and nothing is lost; a paid order has a
// customer waiting, a deliverer to brief and a due date. Missing one for a day
// is a refund.
//
// Every alert is best-effort and never throws: an email provider being down
// must not fail a payment webhook, because Paystack would then retry the whole
// thing and we would be reasoning about double-delivery instead of a missing
// notification.

import { sendEmail, emailConfigured } from "./email";

// Where alerts go.
//
// Falls back to LEAD_NOTIFY_EMAIL, which the contact and lead routes already
// use for "the owner's inbox". Introducing a second variable for the same idea
// is how one of them ends up stale and the alerts nobody is receiving are the
// ones nobody notices. Set OPERATOR_ALERT_EMAIL only to route order alerts
// somewhere different from lead alerts.
const DEFAULT_OPERATOR_EMAIL = "sammyjelng@gmail.com";

export function operatorRecipients() {
  const raw = (
    process.env.OPERATOR_ALERT_EMAIL ||
    process.env.LEAD_NOTIFY_EMAIL ||
    DEFAULT_OPERATOR_EMAIL
  ).trim();
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Which site an alert came from, so one inbox can serve several deployments. */
function siteName() {
  return (process.env.SITE_NAME || "NaijaArtisans").trim();
}

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function render({ title, intro, rows, cta, urgent }) {
  const bar = urgent ? "#b45309" : "#0f4a80";
  const body = (rows || [])
    .filter(Boolean)
    .map(
      ([label, value]) =>
        `<tr>
           <td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px;white-space:nowrap">${esc(label)}</td>
           <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600">${esc(value)}</td>
         </tr>`
    )
    .join("");

  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;max-width:560px">
  <div style="background:${bar};color:#fff;padding:14px 18px;border-radius:10px 10px 0 0">
    <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.75">${esc(siteName())}</div>
    <div style="font-size:18px;font-weight:800;margin-top:2px">${esc(title)}</div>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:0;border-radius:0 0 10px 10px;padding:18px">
    ${intro ? `<p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.55">${esc(intro)}</p>` : ""}
    <table style="border-collapse:collapse;width:100%">${body}</table>
    ${
      cta
        ? `<p style="margin:18px 0 0">
             <a href="${esc(cta.href)}" style="display:inline-block;background:#0f4a80;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:700;font-size:14px">${esc(cta.label)}</a>
           </p>`
        : ""
    }
    <p style="margin:18px 0 0;color:#94a3b8;font-size:12px">
      Sent by ${esc(siteName())}. Change the recipient with the OPERATOR_ALERT_EMAIL environment variable.
    </p>
  </div>
</div>`;
}

/**
 * Sends an operator alert. Returns a result rather than throwing so callers can
 * log and carry on.
 *
 * @param {{title:string, intro?:string, rows?:Array<[string,string]>, cta?:{label:string,href:string}, urgent?:boolean, subject?:string}} input
 */
export async function notifyOperator(input) {
  if (!emailConfigured()) {
    console.warn(`[alert] ${input.title} — RESEND_API_KEY not set, not emailed.`);
    return { sent: false, reason: "not_configured" };
  }
  const to = operatorRecipients();
  if (to.length === 0) return { sent: false, reason: "no_recipient" };

  try {
    return await sendEmail({
      to,
      subject: input.subject || `[${siteName()}] ${input.title}`,
      html: render(input),
    });
  } catch (e) {
    console.error("[alert] failed:", e);
    return { sent: false, reason: "error" };
  }
}

// ── Specific alerts ─────────────────────────────────────────────────────────
// Named functions rather than ad-hoc calls at each site, so the wording of a
// given event is defined once and cannot drift between the webhook and the API.

const naira = (kobo) => "₦" + Math.round((kobo || 0) / 100).toLocaleString("en-NG");

function orderUrl(reference) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://naijaartisans.com").replace(/\/+$/, "");
  return `${base}/admin/orders/${reference}`;
}

/** A customer has started an order but has not paid the deposit yet. */
export function alertOrderStarted(order, pkg) {
  return notifyOperator({
    title: "New order started",
    intro: "Someone has filled in a brief and been sent to Paystack. Nothing is owed to anyone until the deposit lands.",
    rows: [
      ["Order", order.reference],
      ["Package", pkg.title],
      ["Customer", `${order.customerName} · ${order.customerEmail}`],
      order.customerPhone ? ["Phone", order.customerPhone] : null,
      ["Price", naira(order.priceKobo)],
      ["Deposit due", naira(order.depositKobo)],
    ],
    cta: { label: "Open order", href: orderUrl(order.reference) },
  });
}

/**
 * The deposit has cleared. This is the one that matters: the clock starts here
 * and someone has to be assigned.
 */
export function alertDepositPaid(order, pkg) {
  return notifyOperator({
    title: "Deposit paid — assign someone",
    subject: `[${siteName()}] PAID ${naira(order.depositKobo)} — ${pkg.title} (${order.reference})`,
    intro: `The deposit has cleared and the customer is now waiting. Due in ${pkg.turnaroundDays} days. Assign a deliverer before you do anything else today.`,
    urgent: true,
    rows: [
      ["Order", order.reference],
      ["Package", pkg.title],
      ["Customer", `${order.customerName} · ${order.customerEmail}`],
      order.customerPhone ? ["Phone", order.customerPhone] : null,
      ["Deposit received", naira(order.depositKobo)],
      ["Balance still due", naira(order.balanceKobo)],
      ["Budget for delivery", naira(order.costKobo)],
      ["Expected margin", naira(order.priceKobo - order.costKobo)],
      order.dueAt ? ["Due", new Date(order.dueAt).toDateString()] : null,
    ],
    cta: { label: "Assign a deliverer", href: orderUrl(order.reference) },
  });
}

/** The closing balance has cleared — the job is fully paid. */
export function alertBalancePaid(order, pkg) {
  return notifyOperator({
    title: "Balance paid — order complete",
    rows: [
      ["Order", order.reference],
      ["Package", pkg.title],
      ["Customer", order.customerName],
      ["Total collected", naira(order.priceKobo)],
      ["Paid to deliverer", naira(order.fulfillerCostKobo ?? order.costKobo)],
      ["Margin", naira(order.priceKobo - (order.fulfillerCostKobo ?? order.costKobo))],
    ],
    cta: { label: "Open order", href: orderUrl(order.reference) },
  });
}

/** A payment we expected did not go through. */
export function alertPaymentProblem(order, detail) {
  return notifyOperator({
    title: "Payment problem",
    urgent: true,
    intro: "A payment did not complete as expected. Nothing has been fulfilled.",
    rows: [
      ["Order", order?.reference ?? "unknown"],
      ["Detail", detail],
    ],
    cta: order ? { label: "Open order", href: orderUrl(order.reference) } : undefined,
  });
}

/** An order is past its promised delivery date. Driven by a scheduled check. */
export function alertOrderOverdue(order, pkg, daysLate) {
  return notifyOperator({
    title: `Order overdue by ${daysLate} day${daysLate === 1 ? "" : "s"}`,
    urgent: true,
    intro: "This was promised to a paying customer and has not been delivered. Chase the deliverer or refund.",
    rows: [
      ["Order", order.reference],
      ["Package", pkg?.title ?? "—"],
      ["Customer", `${order.customerName} · ${order.customerEmail}`],
      ["Assigned to", order.fulfillerName || "NOBODY — never assigned"],
      ["Was due", order.dueAt ? new Date(order.dueAt).toDateString() : "—"],
    ],
    cta: { label: "Open order", href: orderUrl(order.reference) },
  });
}
