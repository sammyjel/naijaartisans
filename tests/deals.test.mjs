// The deal state machine, and the one rule the completed-jobs badge rests on:
// an artisan cannot confirm their own completion.
//
// If that rule breaks, nothing throws. The badge simply becomes self-reported
// and every number on every profile quietly stops meaning anything, which is
// precisely the failure this feature was built to prevent. Hence the weight of
// coverage here relative to the size of the module.

import test from "node:test";
import assert from "node:assert/strict";
import {
  canTransition,
  availableActions,
  roleInDeal,
  countsAsCompleted,
  jobStatusForDeal,
  isActive,
  IN_PROGRESS,
  AWAITING_CONFIRMATION,
  COMPLETED,
  CANCELLED,
  DEAL_ACTIONS,
} from "../src/lib/deal-rules.js";

const CUSTOMER = "cust1";
const ARTISAN = "art1";
const STRANGER = "someone-else";

const deal = (status) => ({ status, customerId: CUSTOMER, artisanId: ARTISAN });

// ── the rule the whole feature depends on ──────────────────────────────────

test("an artisan CANNOT confirm their own completion", () => {
  const v = canTransition(deal(AWAITING_CONFIRMATION), "confirm", ARTISAN);
  assert.equal(v.ok, false, "if this ever passes, the completed-jobs badge is self-awarded");
  assert.equal(v.status, 403);
  assert.match(v.reason, /customer/i, "the artisan should be told who actually confirms");
});

test("only the customer can move a deal to COMPLETED", () => {
  const v = canTransition(deal(AWAITING_CONFIRMATION), "confirm", CUSTOMER);
  assert.equal(v.ok, true);
  assert.equal(v.to, COMPLETED);
  assert.equal(v.actorRole, "customer");
});

test("an artisan is never offered a confirm button", () => {
  for (const status of [IN_PROGRESS, AWAITING_CONFIRMATION, COMPLETED, CANCELLED]) {
    const offered = availableActions(deal(status), ARTISAN).map((a) => a.action);
    assert.ok(!offered.includes("confirm"), `confirm offered to the artisan in ${status}`);
  }
});

test("COMPLETED is the only status that counts towards the badge", () => {
  assert.equal(countsAsCompleted(COMPLETED), true);
  assert.equal(countsAsCompleted(AWAITING_CONFIRMATION), false, "artisan-reported is not completed");
  assert.equal(countsAsCompleted(IN_PROGRESS), false);
  assert.equal(countsAsCompleted(CANCELLED), false);
});

// ── who may do what ────────────────────────────────────────────────────────

test("the artisan reports the work done", () => {
  const v = canTransition(deal(IN_PROGRESS), "mark_done", ARTISAN);
  assert.equal(v.ok, true);
  assert.equal(v.to, AWAITING_CONFIRMATION);
});

test("a customer cannot mark the work done on the artisan's behalf", () => {
  const v = canTransition(deal(IN_PROGRESS), "mark_done", CUSTOMER);
  assert.equal(v.ok, false);
  assert.equal(v.status, 403);
});

test("someone who is not party to the deal can do nothing at all", () => {
  assert.equal(roleInDeal(deal(IN_PROGRESS), STRANGER), null);
  for (const action of DEAL_ACTIONS) {
    const v = canTransition(deal(IN_PROGRESS), action, STRANGER);
    assert.equal(v.ok, false, `a stranger was allowed to ${action}`);
    assert.equal(v.status, 403);
  }
  assert.deepEqual(availableActions(deal(IN_PROGRESS), STRANGER), []);
});

test("either side may cancel", () => {
  assert.equal(canTransition(deal(IN_PROGRESS), "cancel", CUSTOMER).ok, true);
  assert.equal(canTransition(deal(IN_PROGRESS), "cancel", ARTISAN).ok, true);
});

test("the customer can push back on a premature 'done'", () => {
  const v = canTransition(deal(AWAITING_CONFIRMATION), "dispute", CUSTOMER);
  assert.equal(v.ok, true);
  assert.equal(v.to, IN_PROGRESS, "a disputed deal returns to the artisan rather than dying");
});

// ── terminal states ────────────────────────────────────────────────────────

test("nothing moves a completed deal", () => {
  for (const action of DEAL_ACTIONS) {
    for (const who of [CUSTOMER, ARTISAN]) {
      assert.equal(
        canTransition(deal(COMPLETED), action, who).ok,
        false,
        `${action} was allowed on a completed deal`
      );
    }
  }
});

test("nothing moves a cancelled deal", () => {
  for (const action of DEAL_ACTIONS) {
    for (const who of [CUSTOMER, ARTISAN]) {
      assert.equal(canTransition(deal(CANCELLED), action, who).ok, false);
    }
  }
});

test("a deal cannot be confirmed before the artisan says it is done", () => {
  const v = canTransition(deal(IN_PROGRESS), "confirm", CUSTOMER);
  assert.equal(v.ok, false, "skipping AWAITING_CONFIRMATION would bypass the artisan entirely");
  assert.equal(v.status, 409);
});

test("an unknown action is refused rather than ignored", () => {
  const v = canTransition(deal(IN_PROGRESS), "complete_it_now", CUSTOMER);
  assert.equal(v.ok, false);
  assert.equal(v.status, 400);
});

// ── the job board ──────────────────────────────────────────────────────────

test("a running deal takes the job off the open board", () => {
  // Otherwise the job keeps being broadcast to artisans who cannot win it.
  assert.equal(jobStatusForDeal(IN_PROGRESS), "IN_PROGRESS");
  assert.equal(jobStatusForDeal(AWAITING_CONFIRMATION), "IN_PROGRESS");
  assert.ok(isActive(IN_PROGRESS) && isActive(AWAITING_CONFIRMATION));
});

test("a cancelled deal puts the job back on the board", () => {
  // The customer still needs the work done.
  assert.equal(jobStatusForDeal(CANCELLED), "OPEN");
  assert.equal(isActive(CANCELLED), false);
});

test("a completed deal closes the job as completed, not merely closed", () => {
  assert.equal(jobStatusForDeal(COMPLETED), "COMPLETED");
});

// ── the buttons the UI renders ─────────────────────────────────────────────

test("every offered action is one the API would actually accept", () => {
  // The panel renders availableActions() verbatim, so a button that canTransition
  // would refuse is a button that errors when clicked.
  for (const status of [IN_PROGRESS, AWAITING_CONFIRMATION, COMPLETED, CANCELLED]) {
    for (const who of [CUSTOMER, ARTISAN, STRANGER]) {
      for (const a of availableActions(deal(status), who)) {
        assert.equal(
          canTransition(deal(status), a.action, who).ok,
          true,
          `${status}/${who} offered ${a.action} but the API refuses it`
        );
      }
    }
  }
});

test("the customer's choice while waiting is confirm, dispute or cancel", () => {
  const offered = availableActions(deal(AWAITING_CONFIRMATION), CUSTOMER).map((a) => a.action).sort();
  assert.deepEqual(offered, ["cancel", "confirm", "dispute"]);
});
