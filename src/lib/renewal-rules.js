// When a paid plan's holder is reminded to renew. DB-free so it can be tested
// and imported by plain node scripts.
//
// Plans are pay-per-month, not card subscriptions: most artisans pay by bank
// transfer or USSD, which Paystack cannot debit again. So a plan simply ends
// at featuredUntil / proUntil, and these reminders are what turn a one-off
// payment into a monthly one.

const DAY = 24 * 60 * 60 * 1000;

/** Remind this many days before the plan ends. */
export const REMIND_BEFORE_DAYS = 3;
/** And once more if it ended within this many days and was not renewed. */
export const EXPIRED_GRACE_DAYS = 3;

export const PLAN_FIELDS = { featured: "featuredUntil", pro: "proUntil" };

/**
 * One reminder per plan per billing period: the expiry date is in the key,
 * and paying moves the expiry, so a renewed plan gets fresh reminders next
 * month while a daily cron re-run sends nothing twice.
 */
export function renewalKey(stage, plan, userId, until) {
  return `renewal:${stage}:${plan}:${userId}:${new Date(until).toISOString().slice(0, 10)}`;
}

/**
 * @param {{ id: string, featuredUntil?: Date|string|null, proUntil?: Date|string|null }} user
 * @returns {Array<{ stage: "expiring"|"expired", plan: "featured"|"pro", until: Date, daysLeft: number, dedupeKey: string }>}
 */
export function decideRenewals(user, now = new Date()) {
  const out = [];
  for (const [plan, field] of Object.entries(PLAN_FIELDS)) {
    if (!user[field]) continue;
    const until = new Date(user[field]);
    const ms = until.getTime() - now.getTime();
    let stage = null;
    if (ms > 0 && ms <= REMIND_BEFORE_DAYS * DAY) stage = "expiring";
    else if (ms <= 0 && -ms <= EXPIRED_GRACE_DAYS * DAY) stage = "expired";
    if (!stage) continue;
    out.push({
      stage,
      plan,
      until,
      daysLeft: Math.max(0, Math.ceil(ms / DAY)),
      dedupeKey: renewalKey(stage, plan, user.id, until),
    });
  }
  // Pro includes Featured placement, so while Pro is still running a Featured
  // reminder would ask them to pay for something they already have.
  const proActive = user.proUntil && new Date(user.proUntil) > now;
  return proActive ? out.filter((r) => r.plan !== "featured") : out;
}
