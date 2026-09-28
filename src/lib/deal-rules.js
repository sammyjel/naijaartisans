// The rules governing a deal between a customer and an artisan.
//
// Kept in its own module with NO database import so the state machine can be
// unit-tested directly (tests/deals.test.mjs). This is the part of the system
// where a mistake is both invisible and expensive: the public "X jobs completed"
// badge is derived from these transitions, so a rule that lets the wrong party
// advance a deal does not throw an error — it silently inflates a trust signal.
//
// ── WHY THE CUSTOMER CONFIRMS ──────────────────────────────────────────────
//
// The requirement was that the system, not the artisan, decides how many jobs an
// artisan has completed. A single "mark complete" button owned by the artisan
// would not do that: it is self-reporting with extra steps, and the badge would
// mean nothing the moment one artisan noticed.
//
// So completion is two-sided. The artisan reports the work is done, which moves
// the deal to AWAITING_CONFIRMATION and counts for nothing. The customer — who
// has no reason to confirm work they did not receive — is the only party who can
// reach COMPLETED, and only COMPLETED is counted. The artisan drives the deal
// forward, exactly as asked, but cannot award themselves the credit.
//
// The deal itself can only be created by a customer accepting a quote on their
// own job, so an artisan cannot invent a counterparty either.

/** A deal in progress. The artisan is doing the work. */
export const IN_PROGRESS = "IN_PROGRESS";
/** The artisan says the work is finished. Waiting on the customer. Counts for nothing. */
export const AWAITING_CONFIRMATION = "AWAITING_CONFIRMATION";
/** The customer confirmed. This is the ONLY state that counts towards the badge. */
export const COMPLETED = "COMPLETED";
/** Called off by either side. */
export const CANCELLED = "CANCELLED";

export const DEAL_STATUSES = [IN_PROGRESS, AWAITING_CONFIRMATION, COMPLETED, CANCELLED];

/** Statuses that are final — nothing may move a deal out of one. */
export const TERMINAL_STATUSES = [COMPLETED, CANCELLED];

/** Statuses that hold the job off the open board. */
export const ACTIVE_STATUSES = [IN_PROGRESS, AWAITING_CONFIRMATION];

/**
 * Every allowed move, keyed by action.
 *
 * `actor` is which side of the deal may perform it — deliberately explicit
 * rather than inferred, because "whoever is logged in" is how an artisan ends up
 * able to confirm their own work.
 */
export const TRANSITIONS = {
  mark_done: {
    actor: "artisan",
    from: [IN_PROGRESS],
    to: AWAITING_CONFIRMATION,
    label: "Mark the work as done",
  },
  confirm: {
    actor: "customer",
    from: [AWAITING_CONFIRMATION],
    to: COMPLETED,
    label: "Confirm the job was completed",
  },
  dispute: {
    // The customer's answer to a premature "done". Returns the deal to the
    // artisan rather than cancelling it, because most of these are "nearly".
    actor: "customer",
    from: [AWAITING_CONFIRMATION],
    to: IN_PROGRESS,
    label: "Not finished yet",
  },
  cancel: {
    actor: "either",
    from: [IN_PROGRESS, AWAITING_CONFIRMATION],
    to: CANCELLED,
    label: "Cancel this deal",
  },
};

export const DEAL_ACTIONS = Object.keys(TRANSITIONS);

/** Human labels for each status, used in the UI and in emails. */
export const STATUS_LABELS = {
  [IN_PROGRESS]: "Transaction in process",
  [AWAITING_CONFIRMATION]: "Waiting for customer to confirm",
  [COMPLETED]: "Completed",
  [CANCELLED]: "Cancelled",
};

/** True when this status is counted towards the artisan's public completed total. */
export function countsAsCompleted(status) {
  return status === COMPLETED;
}

/** True when a deal in this status blocks a new deal on the same job. */
export function isActive(status) {
  return ACTIVE_STATUSES.includes(status);
}

/**
 * Which side of a deal a user is on, or null if they are neither.
 *
 * Returning null rather than throwing matters: this is called on every request
 * to a deal endpoint, and "not a party to this deal" is an authorisation answer,
 * not an exceptional one.
 *
 * @param {{customerId: string, artisanId: string}} deal
 * @param {string} userId
 * @returns {"customer"|"artisan"|null}
 */
export function roleInDeal(deal, userId) {
  if (!deal || !userId) return null;
  if (deal.customerId === userId) return "customer";
  if (deal.artisanId === userId) return "artisan";
  return null;
}

/**
 * Whether `userId` may perform `action` on `deal`, and why not if they may not.
 *
 * @param {{status: string, customerId: string, artisanId: string}} deal
 * @param {string} action
 * @param {string} userId
 * @returns {{ok: true, to: string, actorRole: "customer"|"artisan"} | {ok: false, reason: string, status: number}}
 */
export function canTransition(deal, action, userId) {
  const rule = TRANSITIONS[action];
  if (!rule) return { ok: false, reason: "Unknown action.", status: 400 };

  const role = roleInDeal(deal, userId);
  if (!role) return { ok: false, reason: "This is not your deal.", status: 403 };

  if (rule.actor !== "either" && rule.actor !== role) {
    // The message names the other party on purpose. An artisan who tries to
    // confirm their own completion should be told who actually does it, not
    // given a bare 403 that reads like a bug.
    const who = rule.actor === "customer" ? "customer" : "artisan";
    return {
      ok: false,
      reason:
        action === "confirm"
          ? "Only the customer can confirm a job is complete. This is what makes your completed-jobs count trustworthy."
          : `Only the ${who} can do that.`,
      status: 403,
    };
  }

  if (!rule.from.includes(deal.status)) {
    if (TERMINAL_STATUSES.includes(deal.status)) {
      return {
        ok: false,
        reason: `This deal is already ${STATUS_LABELS[deal.status].toLowerCase()}.`,
        status: 409,
      };
    }
    return { ok: false, reason: "That is not possible from the current status.", status: 409 };
  }

  return { ok: true, to: rule.to, actorRole: role };
}

/**
 * The actions a given user can currently take, for rendering buttons.
 *
 * The UI must not offer a button the API will refuse — a "Confirm" button shown
 * to an artisan teaches them the count is theirs to award.
 *
 * @returns {Array<{action: string, label: string, to: string}>}
 */
export function availableActions(deal, userId) {
  return DEAL_ACTIONS.filter((a) => canTransition(deal, a, userId).ok).map((a) => ({
    action: a,
    label: TRANSITIONS[a].label,
    to: TRANSITIONS[a].to,
  }));
}

/**
 * The job status that matches a deal status.
 *
 * A job with work underway must leave the open board, or it keeps being
 * broadcast to artisans who cannot win it. A cancelled deal reopens the job,
 * because the customer still needs the work done.
 */
export function jobStatusForDeal(dealStatus) {
  if (dealStatus === COMPLETED) return "COMPLETED";
  if (dealStatus === CANCELLED) return "OPEN";
  return "IN_PROGRESS";
}
