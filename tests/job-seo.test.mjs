// The vacancy rule itself.
//
// Fixtures are the real open jobs as they stood on 2026-10-03, because the bug
// this rule fixes was not hypothetical: six of eight were adverts being served
// to Google as JobPostings.

import test from "node:test";
import assert from "node:assert/strict";
import {
  vacancyEligibility,
  isIndexableVacancy,
  validThrough,
  VACANCY_DAYS,
  NOT_OPEN,
  POSTER_IS_NOT_A_CUSTOMER,
  ELIGIBLE,
  APPROVED_BY_ADMIN,
  INDEXABLE_VACANCY_WHERE,
} from "../src/lib/job-seo.js";

// ── the rule ───────────────────────────────────────────────────────────────

test("a customer's open job is a vacancy", () => {
  const r = vacancyEligibility({ status: "OPEN", posterRole: "CUSTOMER" });
  assert.equal(r.indexable, true);
  assert.equal(r.reason, ELIGIBLE);
});

test("an artisan's self-advert is not a vacancy", () => {
  // "I'm a professional graphics designer" is not a job opening.
  const r = vacancyEligibility({ status: "OPEN", posterRole: "ARTISAN" });
  assert.equal(r.indexable, false);
  assert.equal(r.reason, POSTER_IS_NOT_A_CUSTOMER);
});

test("a filled job is not a vacancy whoever posted it", () => {
  for (const status of ["IN_PROGRESS", "COMPLETED", "CLOSED"]) {
    const r = vacancyEligibility({ status, posterRole: "CUSTOMER" });
    assert.equal(r.indexable, false, `${status} should not be indexable`);
    assert.equal(r.reason, NOT_OPEN);
  }
});

test("status is checked before role, so the reason is the useful one", () => {
  // A closed advert is reported as closed rather than as an advert — the status
  // is the thing that changed most recently and the thing worth acting on.
  assert.equal(
    vacancyEligibility({ status: "COMPLETED", posterRole: "ARTISAN" }).reason,
    NOT_OPEN
  );
});

// ── missing input must fail closed ─────────────────────────────────────────

test("a job whose poster could not be loaded is not given the benefit of the doubt", () => {
  // Silence costs one rich result. A wrong claim risks all of them.
  for (const job of [
    { status: "OPEN" },
    { status: "OPEN", posterRole: undefined },
    { status: "OPEN", posterRole: null },
    { status: "OPEN", posterRole: "" },
  ]) {
    assert.equal(isIndexableVacancy(job), false, `${JSON.stringify(job)} should not be indexable`);
  }
});

test("no input at all does not throw", () => {
  for (const job of [undefined, null, {}]) {
    assert.equal(isIndexableVacancy(job), false);
  }
});

test("role matching is exact, not fuzzy", () => {
  // A lowercase or near-miss role must not slip through.
  for (const role of ["customer", "Customer", "CUSTOMERS", "ADMIN"]) {
    assert.equal(
      isIndexableVacancy({ status: "OPEN", posterRole: role }),
      false,
      `${role} should not count as CUSTOMER`
    );
  }
});

test("status matching is exact too", () => {
  for (const status of ["open", "Open", "OPENED"]) {
    assert.equal(isIndexableVacancy({ status, posterRole: "CUSTOMER" }), false);
  }
});

// ── the expiry window ──────────────────────────────────────────────────────

test("validThrough is VACANCY_DAYS after the posting date", () => {
  const created = new Date("2026-10-03T00:00:00.000Z");
  const got = new Date(validThrough(created));
  const days = Math.round((got - created) / 86400000);
  assert.equal(days, VACANCY_DAYS);
});

test("validThrough accepts an ISO string as well as a Date", () => {
  // Cached query results come back serialised, so this gets both.
  assert.equal(
    validThrough("2026-10-03T00:00:00.000Z"),
    validThrough(new Date("2026-10-03T00:00:00.000Z"))
  );
});

test("validThrough is always in the future relative to posting", () => {
  assert.ok(new Date(validThrough(new Date())) > new Date());
});

// ── the 2026-10-03 board, end to end ──────────────────────────────────────

test("the real board resolves to exactly the two genuine jobs", () => {
  const board = [
    { title: "Smart Building Automation & Electrical Systems", status: "OPEN", posterRole: "ARTISAN" },
    { title: "Smart Building Automation & Electrical Systems", status: "OPEN", posterRole: "ARTISAN" },
    { title: "I'm a professional graphics designer", status: "OPEN", posterRole: "ARTISAN" },
    { title: "Range of carpentry work", status: "OPEN", posterRole: "CUSTOMER" },
    { title: "Street wear fashion designer", status: "OPEN", posterRole: "ARTISAN" },
    { title: "Painting and screeding", status: "OPEN", posterRole: "ARTISAN" },
    { title: "Quality Aluminum Roofing", status: "OPEN", posterRole: "ARTISAN" },
    { title: "Plumbing Technician", status: "OPEN", posterRole: "CUSTOMER" },
  ];
  const indexable = board.filter(isIndexableVacancy).map((j) => j.title);
  assert.deepEqual(indexable, ["Range of carpentry work", "Plumbing Technician"]);
});

// ── admin approval (2026-10-15) ───────────────────────────────────────────

test("an approved artisan-posted job is a vacancy", () => {
  // "Pile breaker" — an artisan hiring labourers at Eko Atlantic.
  const r = vacancyEligibility({ status: "OPEN", posterRole: "ARTISAN", approved: true });
  assert.equal(r.indexable, true);
  assert.equal(r.reason, APPROVED_BY_ADMIN);
});

test("approval never revives a filled job", () => {
  for (const status of ["IN_PROGRESS", "COMPLETED", "CLOSED"]) {
    const r = vacancyEligibility({ status, posterRole: "ARTISAN", approved: true });
    assert.equal(r.indexable, false, `${status} should not be indexable even when approved`);
    assert.equal(r.reason, NOT_OPEN);
  }
});

test("approval must be exactly true, not merely truthy", () => {
  // A timestamp, string or 1 passed by mistake must not open the gate.
  for (const approved of [new Date(), "true", "yes", 1, {}, false, null, undefined]) {
    assert.equal(
      isIndexableVacancy({ status: "OPEN", posterRole: "ARTISAN", approved }),
      false,
      `approved=${JSON.stringify(approved)} should not count`
    );
  }
});

test("an unapproved artisan job is still not a vacancy (the 2026-10-03 rule holds)", () => {
  assert.equal(isIndexableVacancy({ status: "OPEN", posterRole: "ARTISAN", approved: false }), false);
});

test("the sitemap filter admits the same two routes as the rule", () => {
  // INDEXABLE_VACANCY_WHERE is a Prisma filter and cannot run here, so check its
  // shape: OPEN, and either a customer poster or an approval.
  assert.equal(INDEXABLE_VACANCY_WHERE.status, "OPEN");
  assert.deepEqual(INDEXABLE_VACANCY_WHERE.OR, [
    { customer: { role: "CUSTOMER" } },
    { vacancyApprovedAt: { not: null } },
  ]);
});