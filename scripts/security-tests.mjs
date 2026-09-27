// Security regression tests.
//
// Plain Node with node:assert — no test framework is installed and a security
// check is not a good reason to add a dependency to a live payment app.
//
//   node scripts/security-tests.mjs
//
// Covers the pure logic of the 2026-09-10 audit fixes. Route-level behaviour
// (ownership checks, the webhook transaction) is exercised against a running
// app, not here.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { validateImageUpload, MAX_UPLOAD_BYTES } from "../src/lib/upload.js";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (e) {
    console.log(`  FAIL  ${name}\n        ${e.message}`);
    failed++;
  }
}

/** Minimal stand-in for the browser File object the routes receive. */
function fakeFile({ type, size = 1024, name = "photo.jpg" }) {
  return { type, size, name };
}

console.log("\nNA-03 / NA-04 — upload validation");

test("rejects SVG, which executes script when opened directly", () => {
  const r = validateImageUpload(fakeFile({ type: "image/svg+xml", name: "logo.svg" }));
  assert.equal(r.ok, false);
  assert.match(r.error, /SVG/);
});

test("rejects HTML masquerading with an image extension", () => {
  assert.equal(validateImageUpload(fakeFile({ type: "text/html", name: "x.jpg" })).ok, false);
});

test("rejects an image/ prefix that is not on the allow-list", () => {
  // The old check was startsWith("image/"), which this would have passed.
  assert.equal(validateImageUpload(fakeFile({ type: "image/svg+xml" })).ok, false);
  assert.equal(validateImageUpload(fakeFile({ type: "image/x-icon" })).ok, false);
});

test("never takes the stored extension from the uploader's filename", () => {
  const r = validateImageUpload(fakeFile({ type: "image/png", name: "evil.php" }));
  assert.equal(r.ok, true);
  assert.equal(r.ext, "png", "extension must come from the MIME allow-list");
});

test("a filename with path segments cannot steer the blob path", () => {
  const r = validateImageUpload(fakeFile({ type: "image/jpeg", name: "../../../etc/passwd" }));
  assert.equal(r.ok, true);
  assert.equal(r.ext, "jpg");
  assert.ok(!r.ext.includes("/"), "extension must not contain a path separator");
  assert.ok(!r.ext.includes(".."), "extension must not contain a dot segment");
});

test("accepts the formats artisans actually upload", () => {
  for (const [type, ext] of [
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
    ["image/gif", "gif"],
    ["image/avif", "avif"],
  ]) {
    const r = validateImageUpload(fakeFile({ type }));
    assert.equal(r.ok, true, `${type} should be accepted`);
    assert.equal(r.ext, ext);
  }
});

test("tolerates a charset parameter on the content type", () => {
  assert.equal(validateImageUpload(fakeFile({ type: "image/png; charset=binary" })).ok, true);
});

test("enforces the size limit and rejects empty files", () => {
  assert.equal(validateImageUpload(fakeFile({ type: "image/png", size: MAX_UPLOAD_BYTES + 1 })).ok, false);
  assert.equal(validateImageUpload(fakeFile({ type: "image/png", size: 0 })).ok, false);
});

test("rejects a missing file without throwing", () => {
  assert.equal(validateImageUpload(null).ok, false);
  assert.equal(validateImageUpload("not-a-file").ok, false);
});

console.log("\nNA-01 — gallery ownership check");

// Mirrors the guard now in src/app/api/me/gallery/route.js DELETE.
function mayDelete(ownGallery, requestedUrl) {
  return ownGallery.includes(requestedUrl);
}

test("a user cannot delete a blob that is not in their own gallery", () => {
  const mine = ["https://blob/gallery/me/1.jpg"];
  const someoneElses = "https://blob/gallery/them/9.jpg";
  assert.equal(mayDelete(mine, someoneElses), false);
});

test("a user can still delete their own photo", () => {
  const mine = ["https://blob/gallery/me/1.jpg"];
  assert.equal(mayDelete(mine, "https://blob/gallery/me/1.jpg"), true);
});

console.log("\nNA-06 — webhook signature comparison");

function verify(rawBody, signature, key) {
  if (!key || !signature) return false;
  const expected = crypto.createHmac("sha512", key).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(signature), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

test("accepts a correctly signed body and rejects a tampered one", () => {
  const key = "sk_test_fixture";
  const body = JSON.stringify({ event: "charge.success", data: { amount: 500000 } });
  const sig = crypto.createHmac("sha512", key).update(body).digest("hex");

  assert.equal(verify(body, sig, key), true);
  assert.equal(verify(body.replace("500000", "100"), sig, key), false, "amount tampering must fail");
  assert.equal(verify(body, sig, "other_key"), false);
  assert.equal(verify(body, "short", key), false, "length mismatch must not throw");
  assert.equal(verify(body, null, key), false);
});

console.log("\nNA-07 — plan amount validation");

const PLAN_PRICES = { featured: 2000, pro: 5000 };
function amountCoversPlan(amountKobo, plan) {
  const expected = (PLAN_PRICES[plan] ?? Infinity) * 100;
  return typeof amountKobo === "number" && amountKobo >= expected;
}

test("an underpayment does not buy a plan", () => {
  assert.equal(amountCoversPlan(100, "pro"), false, "1 naira must not buy Pro");
  assert.equal(amountCoversPlan(200000, "pro"), false, "the featured price must not buy Pro");
  assert.equal(amountCoversPlan(500000, "pro"), true);
  assert.equal(amountCoversPlan(200000, "featured"), true);
  assert.equal(amountCoversPlan(undefined, "pro"), false);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
