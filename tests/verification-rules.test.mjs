// Artisan verification rules.

import test from "node:test";
import assert from "node:assert/strict";
import { verificationStatus, requestProblems, inviteKey, MIN_PHOTOS, NEVER_ASK } from "../src/lib/verification-rules.js";

const d = new Date("2026-10-30T10:00:00Z");

test("status: suspended beats verified beats declined beats pending", () => {
  assert.equal(verificationStatus({ suspendedAt: d, verifiedAt: d }), "suspended");
  assert.equal(verificationStatus({ verifiedAt: d, verifyRequestedAt: d }), "verified");
  assert.equal(verificationStatus({ verifyRequestedAt: d, verifyDeclinedReason: "x" }), "declined");
  assert.equal(verificationStatus({ verifyRequestedAt: d }), "pending");
  assert.equal(verificationStatus({}), "none");
});

test("an artisan needs a phone, a listing, enough photos and an area", () => {
  const ok = { phone: "08031234567", photoCount: MIN_PHOTOS, listingCount: 1, area: "Ikeja" };
  assert.deepEqual(requestProblems(ok), []);
  assert.equal(requestProblems({ ...ok, phone: "" }).length, 1);
  assert.equal(requestProblems({ ...ok, phone: "0803" }).length, 1);
  assert.equal(requestProblems({ ...ok, listingCount: 0 }).length, 1);
  assert.match(requestProblems({ ...ok, photoCount: 1 })[0], /you have 1/);
  assert.equal(requestProblems({ ...ok, area: "  " }).length, 1);
  assert.deepEqual(requestProblems({ ...ok, area: "" }, { requireArea: false }), []);
});

test("one invitation per artisan, and the message says we never ask for money", () => {
  assert.equal(inviteKey("u1"), "verify-invite:v1:u1");
  assert.match(NEVER_ASK, /never ask you for money, BVN, OTP, PIN or bank details/);
});
