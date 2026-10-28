// Monthly-plan renewal reminders. Runs from the same daily cron as the job
// follow-ups (GET /api/cron/followups). Rules live in renewal-rules.js.
//
// Same idempotency as follow-ups: notification rows keyed by dedupeKey are
// inserted with skipDuplicates, and only PENDING rows are emailed.

import { prisma } from "./prisma";
import { deliverPending } from "./notifications";
import { emailHtml } from "./followups";
import { PLANS, ngn } from "./monetization";
import { decideRenewals, REMIND_BEFORE_DAYS, EXPIRED_GRACE_DAYS } from "./renewal-rules";

const MAX_EMAILS_PER_RUN = 40;
const DAY = 24 * 60 * 60 * 1000;

const TYPE = { expiring: "RENEWAL_DUE", expired: "PLAN_EXPIRED" };

function until(d) {
  return new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "long" });
}

/** Title and body for one reminder. Plain text; the template escapes it. */
export function renewalMessage(r) {
  const plan = PLANS.find((p) => p.id === r.plan);
  const price = `${ngn(plan.price)} for another month`;
  if (r.stage === "expiring") {
    return {
      title: `Your ${plan.name} ends ${r.daysLeft <= 1 ? "tomorrow" : `in ${r.daysLeft} days`}`,
      body:
        `Your ${plan.name} runs until ${until(r.until)}. Renew now (${price}) to stay at the top of search without a break — ` +
        "paying early adds a month on top of the days you have left. There is no automatic charge; you only pay when you choose to renew.",
      url: "/dashboard#upgrade",
    };
  }
  return {
    title: `Your ${plan.name} has ended`,
    body:
      `Your ${plan.name} ended on ${until(r.until)}, so your profile is back among the free listings. ` +
      `Renew (${price}) to get your top placement back today.`,
    url: "/dashboard#upgrade",
  };
}

/** @param {{ send?: boolean, now?: Date }} [opts] without send, reports only. */
export async function runRenewals(opts = {}) {
  const now = opts.now || new Date();
  const send = opts.send === true;

  const from = new Date(now.getTime() - EXPIRED_GRACE_DAYS * DAY);
  const to = new Date(now.getTime() + REMIND_BEFORE_DAYS * DAY);
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { featuredUntil: { gte: from, lte: to } },
        { proUntil: { gte: from, lte: to } },
      ],
    },
    select: { id: true, name: true, featuredUntil: true, proUntil: true },
  });

  const planned = [];
  for (const u of users) {
    for (const r of decideRenewals(u, now)) planned.push({ ...r, userId: u.id, name: u.name, ...renewalMessage(r) });
  }
  const items = planned.map((p) => ({ name: p.name, plan: p.plan, stage: p.stage, until: p.until }));
  if (!send || !planned.length) return { dryRun: !send, due: planned.length, emailed: 0, items };

  await prisma.notification.createMany({
    data: planned.map((p) => ({
      userId: p.userId,
      type: TYPE[p.stage],
      title: p.title,
      body: p.body,
      url: p.url,
      dedupeKey: p.dedupeKey,
    })),
    skipDuplicates: true,
  });

  const pending = await prisma.notification.findMany({
    where: { dedupeKey: { in: planned.map((p) => p.dedupeKey) }, emailStatus: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: MAX_EMAILS_PER_RUN,
    select: { id: true, type: true, title: true, body: true, url: true, user: { select: { name: true, email: true } } },
  });
  const delivery = await deliverPending(pending, (n) =>
    emailHtml({ name: n.user?.name, title: n.title, body: n.body, url: n.url, cta: "Renew my plan" })
  );

  return { dryRun: false, due: planned.length, ...delivery, items };
}
