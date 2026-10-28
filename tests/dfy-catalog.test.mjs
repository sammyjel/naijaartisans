// Done-for-you packages and order rules.

import test from "node:test";
import assert from "node:assert/strict";
import {
  PACKAGES, activePackages, packageBySlug, splitPrice, orderReference,
  validateBrief, pendingPayment, canRequestRevision, nairaK,
} from "../src/lib/dfy-catalog.js";

test("the five packages are on sale", () => {
  assert.deepEqual(activePackages().map((p) => p.slug), [
    "logo-design", "social-media-pack", "advert-package", "cv-cover-letter", "digital-marketing",
  ]);
});

test("every package leaves a margin and has what the pages need", () => {
  for (const p of PACKAGES) {
    assert.ok(p.costKobo < p.priceKobo, `${p.slug} costs more to deliver than it sells for`);
    assert.ok(p.deliverables.length > 0 && p.questions.some((q) => q.required), p.slug);
    assert.ok(p.turnaroundDays > 0 && p.depositPct > 0 && p.depositPct <= 100, p.slug);
    assert.equal(new Set(p.questions.map((q) => q.id)).size, p.questions.length, `${p.slug} has duplicate question ids`);
  }
});

test("deposit + balance always add up to the price, in whole naira", () => {
  for (const p of PACKAGES) {
    const s = splitPrice(p);
    assert.equal(s.depositKobo + s.balanceKobo, p.priceKobo);
    assert.equal(s.depositKobo % 100, 0);
  }
  assert.deepEqual(splitPrice(packageBySlug("logo-design")), { priceKobo: 2500000, depositKobo: 1250000, balanceKobo: 1250000 });
  assert.equal(nairaK(1250000), "₦12,500");
});

test("an unknown or inactive slug sells nothing", () => {
  assert.equal(packageBySlug("nope"), null);
  assert.equal(packageBySlug(undefined), null);
});

test("order references look like NA-YYMM-XXXX", () => {
  assert.equal(orderReference("4f2a", new Date("2026-10-28T10:00:00Z")), "NA-2610-4F2A");
});

test("the brief requires the required answers, trims, caps and drops unknown keys", () => {
  const pkg = packageBySlug("logo-design");
  assert.equal(validateBrief(pkg, { what: "x" }).ok, false);
  const r = validateBrief(pkg, { business: "  Ada Foods ", what: "Catering", hacker: "<script>", examples: "x".repeat(900) });
  assert.equal(r.ok, true);
  assert.equal(r.answers.business, "Ada Foods");
  assert.equal(r.answers.hacker, undefined);
  assert.equal(r.answers.examples.length, 500);
});

test("which payment is owed, and what it moves the order to", () => {
  const o = { depositKobo: 100, balanceKobo: 200 };
  assert.deepEqual(pendingPayment({ ...o, status: "AWAITING_DEPOSIT" }), { kind: "DEPOSIT", amountKobo: 100, next: "IN_PROGRESS" });
  assert.deepEqual(pendingPayment({ ...o, status: "AWAITING_BALANCE" }), { kind: "BALANCE", amountKobo: 200, next: "COMPLETED" });
  for (const status of ["IN_PROGRESS", "COMPLETED", "CANCELLED", "REFUNDED"]) assert.equal(pendingPayment({ ...o, status }), null, status);
});

test("changes can be asked for only on delivered work, within the allowance", () => {
  const pkg = { revisions: 2 };
  assert.equal(canRequestRevision({ status: "AWAITING_BALANCE", revisionsUsed: 1 }, pkg), true);
  assert.equal(canRequestRevision({ status: "AWAITING_BALANCE", revisionsUsed: 2 }, pkg), false);
  assert.equal(canRequestRevision({ status: "IN_PROGRESS", revisionsUsed: 0 }, pkg), false);
});
