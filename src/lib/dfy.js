// Done-for-you orders: create, take payment, deliver, revise, complete.
// Packages and the pure rules live in dfy-catalog.js.
//
// Flow:  brief -> 50% deposit (Paystack) -> IN_PROGRESS -> owner assigns a
//        deliverer -> owner posts previews -> AWAITING_BALANCE -> customer
//        approves and pays the balance (or asks for a change) -> COMPLETED ->
//        owner posts the final files.
//
// Payments are confirmed ONLY by the Paystack webhook (see applyOrderPayment),
// never by the browser coming back from checkout.

import crypto from "crypto";
import { prisma } from "./prisma";
import { SITE_URL } from "./seo";
import { sendEmail } from "./email";
import { emailHtml } from "./followups";
import { paystackInitialize } from "./paystack";
import { alertOrderStarted, alertDepositPaid, alertBalancePaid, alertPaymentProblem, notifyOperator } from "./alerts";
import { orderReference, splitPrice, pendingPayment, canRequestRevision, nairaK } from "./dfy-catalog";

const base = () => String(SITE_URL).replace(/\/+$/, "");
export const trackingPath = (order) => `/orders/${order.reference}?t=${order.accessToken}`;

/** Mirrors a catalogue package into ServicePackage (orders reference it by id). */
async function ensurePackage(pkg) {
  const data = {
    title: pkg.title,
    summary: pkg.summary,
    description: pkg.description,
    category: pkg.category,
    kind: "DIGITAL",
    priceKobo: pkg.priceKobo,
    depositPct: pkg.depositPct,
    costKobo: pkg.costKobo,
    turnaroundDays: pkg.turnaroundDays,
    revisions: pkg.revisions,
    deliverables: pkg.deliverables,
    requirements: pkg.questions.map((q) => q.label),
    isActive: pkg.active,
  };
  return prisma.servicePackage.upsert({ where: { slug: pkg.slug }, create: { slug: pkg.slug, ...data }, update: data });
}

async function startPayment(order, kind, amountKobo) {
  const reference = `dfy_${order.reference}_${kind.toLowerCase()}_${crypto.randomBytes(4).toString("hex")}`;
  const data = await paystackInitialize({
    email: order.customerEmail,
    amountKobo,
    reference,
    metadata: { kind: "dfy", orderId: order.id, payKind: kind, orderRef: order.reference },
    callbackUrl: `${base()}${trackingPath(order)}&paid=1`,
  });
  return data.authorization_url;
}

/** Creates the order and returns the Paystack URL for the deposit. */
export async function createOrder({ pkg, answers, name, email, phone, customerId }) {
  const sp = await ensurePackage(pkg);
  const { priceKobo, depositKobo, balanceKobo } = splitPrice(pkg);

  let order;
  for (let attempt = 0; attempt < 4 && !order; attempt += 1) {
    try {
      order = await prisma.serviceOrder.create({
        data: {
          reference: orderReference(crypto.randomBytes(2).toString("hex")),
          accessToken: crypto.randomBytes(18).toString("base64url"),
          packageId: sp.id,
          customerId: customerId || null,
          customerName: name,
          customerEmail: email,
          customerPhone: phone || null,
          briefJson: JSON.stringify(answers),
          priceKobo,
          depositKobo,
          balanceKobo,
          costKobo: pkg.costKobo,
        },
      });
    } catch (e) {
      if (e?.code !== "P2002") throw e; // reference collision: try another code
    }
  }
  if (!order) throw new Error("Could not allocate an order reference");

  await alertOrderStarted(order, sp).catch(() => {});
  return { order, url: await startPayment(order, "DEPOSIT", depositKobo) };
}

/** Customer approves the delivered work: start the balance payment (or finish if none). */
export async function startBalancePayment(order) {
  const due = pendingPayment(order);
  if (!due || due.kind !== "BALANCE") return { error: "Nothing to pay on this order right now." };
  if (due.amountKobo <= 0) {
    await prisma.serviceOrder.update({ where: { id: order.id }, data: { status: "COMPLETED", completedAt: new Date() } });
    return { completed: true };
  }
  return { url: await startPayment(order, "BALANCE", due.amountKobo) };
}

/** Restarts a deposit payment for an order whose first checkout was abandoned. */
export async function restartDepositPayment(order) {
  const due = pendingPayment(order);
  if (!due || due.kind !== "DEPOSIT") return { error: "The deposit is already paid." };
  return { url: await startPayment(order, "DEPOSIT", due.amountKobo) };
}

function customerEmail(order, { title, body, cta }) {
  return sendEmail({
    to: order.customerEmail,
    subject: `${title} (${order.reference})`,
    html: emailHtml({ name: order.customerName, title, body, cta, url: trackingPath(order) }),
  }).catch((e) => console.error("[dfy] customer email failed:", e));
}

/**
 * Records a Paystack charge.success for an order. Called by the payments
 * webhook. The ServicePayment insert (unique reference) is the idempotency
 * lock: a retried webhook rolls back without changing anything.
 *
 * @returns {Promise<{status:number, body:string}>}
 */
export async function applyOrderPayment(data) {
  const meta = data.metadata || {};
  const order = await prisma.serviceOrder.findUnique({ where: { id: String(meta.orderId || "") }, include: { package: true } });
  if (!order) return { status: 200, body: "Unknown order" };

  const due = pendingPayment(order);
  if (!due || due.kind !== meta.payKind || data.amount !== due.amountKobo) {
    // Paid for something no longer owed (double payment, status moved on) or
    // the wrong amount. Money has moved, so a human must look at it.
    // A Paystack retry of a payment we already applied lands here too, because
    // the order has since moved on. That is not a problem, just a duplicate.
    const already = await prisma.servicePayment.findUnique({ where: { reference: data.reference } });
    if (already) return { status: 200, body: "Already processed" };
    await alertPaymentProblem(order, `Paystack ${data.reference}: ${meta.payKind} of ${nairaK(data.amount)} received while the order is ${order.status} (expected ${due ? `${due.kind} ${nairaK(due.amountKobo)}` : "no payment"}). Check and refund if needed.`).catch(() => {});
    return { status: 200, body: "Not expected" };
  }

  const now = new Date();
  const update =
    due.kind === "DEPOSIT"
      ? { status: "IN_PROGRESS", dueAt: new Date(now.getTime() + order.package.turnaroundDays * 86400000) }
      : { status: "COMPLETED", completedAt: now };

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      await tx.servicePayment.create({
        data: {
          reference: data.reference,
          orderId: order.id,
          kind: due.kind,
          amountKobo: data.amount,
          feeKobo: typeof data.fees === "number" ? data.fees : 0,
          status: "PAID",
          paidAt: now,
          rawJson: JSON.stringify({ channel: data.channel, paid_at: data.paid_at, domain: data.domain }),
        },
      });
      // Conditional on the status we checked, so two different payments for the
      // same stage cannot both advance the order.
      const res = await tx.serviceOrder.updateMany({ where: { id: order.id, status: order.status }, data: update });
      if (res.count !== 1) throw Object.assign(new Error("order moved"), { code: "MOVED" });
      return tx.serviceOrder.findUnique({ where: { id: order.id } });
    });
  } catch (e) {
    if (e?.code === "P2002") return { status: 200, body: "Already processed" };
    if (e?.code === "MOVED") return { status: 200, body: "Order moved" };
    console.error("[dfy] payment apply failed", e);
    return { status: 500, body: "Apply failed" };
  }

  const pkg = order.package;
  if (due.kind === "DEPOSIT") {
    await alertDepositPaid(updated, pkg).catch(() => {});
    await customerEmail(updated, {
      title: `We've started your ${pkg.title}`,
      body:
        `Thank you, your deposit of ${nairaK(updated.depositKobo)} is confirmed. Your work is now in progress and is due by ` +
        `${updated.dueAt.toLocaleDateString("en-NG", { day: "numeric", month: "long" })}. ` +
        "We will email you when it is ready to review. You only pay the balance once you are happy with it.",
      cta: "Track your order",
    });
  } else {
    await alertBalancePaid(updated, pkg).catch(() => {});
    await customerEmail(updated, {
      title: `Thank you — your ${pkg.title} is complete`,
      body: "Your final payment is confirmed. Your final files will appear on your order page shortly (we will email you as soon as they are up).",
      cta: "Open your order",
    });
  }
  return { status: 200, body: "OK" };
}

/** Owner: record who is doing the work. */
export async function assignFulfiller(order, { name, note, costNaira, userId }) {
  const cost = Number(costNaira);
  return prisma.serviceOrder.update({
    where: { id: order.id },
    data: {
      fulfillerName: String(name || "").slice(0, 120) || null,
      fulfillerNote: String(note || "").slice(0, 1000) || null,
      fulfillerType: userId ? "PLATFORM_ARTISAN" : "EXTERNAL",
      fulfillerUserId: userId || null,
      fulfillerCostKobo: Number.isFinite(cost) && cost > 0 ? Math.round(cost) * 100 : null,
    },
  });
}

/**
 * Owner: post work to the customer. While the balance is unpaid this should be
 * PREVIEWS (watermarked / low-res); after completion, the final files.
 */
export async function addDelivery(order, { note, links }) {
  const fileUrls = String(links || "")
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s))
    .slice(0, 20);
  if (!fileUrls.length && !String(note || "").trim()) return { error: "Add at least one link or a note." };

  const isFinal = order.status === "COMPLETED";
  if (!isFinal && order.status !== "IN_PROGRESS") return { error: `Cannot deliver an order that is ${order.status}.` };

  await prisma.delivery.create({ data: { orderId: order.id, note: String(note || "").slice(0, 2000) || null, fileUrls, accepted: isFinal } });
  const updated = isFinal
    ? order
    : await prisma.serviceOrder.update({
        where: { id: order.id },
        data: { status: "AWAITING_BALANCE", deliveredAt: new Date(), revisionNote: null },
      });

  const pkg = await prisma.servicePackage.findUnique({ where: { id: order.packageId } });
  await customerEmail(updated, isFinal
    ? { title: `Your final files are ready`, body: `The final files for your ${pkg.title} are on your order page. Thank you for choosing NaijaArtisans!`, cta: "Download your files" }
    : {
        title: `Your ${pkg.title} is ready to review`,
        body:
          `Have a look at your work. If you are happy, approve it and pay the balance of ${nairaK(updated.balanceKobo)} to receive the final files. ` +
          `If something needs changing, tell us on the same page (${Math.max(0, pkg.revisions - updated.revisionsUsed)} round(s) of changes left).`,
        cta: "Review your work",
      });
  return { ok: true };
}

/** Customer: ask for changes on delivered work. */
export async function requestRevision(order, note) {
  const pkg = await prisma.servicePackage.findUnique({ where: { id: order.packageId } });
  if (!canRequestRevision(order, pkg)) return { error: "No more changes can be requested on this order. Contact us if something is wrong." };
  const text = String(note || "").trim().slice(0, 2000);
  if (text.length < 5) return { error: "Please say what you would like changed." };

  const updated = await prisma.serviceOrder.update({
    where: { id: order.id },
    data: { status: "IN_PROGRESS", revisionsUsed: { increment: 1 }, revisionNote: text },
  });
  await notifyOperator({
    title: "Customer asked for changes",
    urgent: true,
    intro: "Pass this to the deliverer and post the updated work on the order page.",
    rows: [
      ["Order", order.reference],
      ["Package", pkg.title],
      ["Customer", `${order.customerName} · ${order.customerEmail}`],
      ["Deliverer", order.fulfillerName || "not assigned"],
      ["Revision", `${updated.revisionsUsed} of ${pkg.revisions}`],
      ["They said", text],
    ],
    cta: { label: "Open order", href: `${base()}/admin/orders/${order.reference}` },
  }).catch(() => {});
  return { ok: true };
}

/** Customer-facing lookup: the reference AND the secret token must match. */
export async function orderForCustomer(reference, token) {
  if (!reference || !token) return null;
  const order = await prisma.serviceOrder.findUnique({
    where: { reference: String(reference) },
    include: { package: true, deliveries: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) return null;
  const a = Buffer.from(order.accessToken);
  const b = Buffer.from(String(token));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return order;
}

/** Daily: tell the owner about orders past their due date and still not delivered. */
export async function alertOverdueOrders(now = new Date()) {
  const { alertOrderOverdue } = await import("./alerts");
  const late = await prisma.serviceOrder.findMany({
    where: { status: "IN_PROGRESS", dueAt: { lt: now } },
    include: { package: true },
    take: 20,
  });
  for (const o of late) {
    const days = Math.max(1, Math.floor((now - o.dueAt) / 86400000));
    await alertOrderOverdue(o, o.package, days).catch(() => {});
  }
  return { overdue: late.length };
}
