// Jobs the owner posts on a customer's behalf.

import test from "node:test";
import assert from "node:assert/strict";
import { checkOnBehalfJob, phoneVariants, SOURCES } from "../src/lib/sourced-jobs-rules.js";

const good = {
  name: "Ada Obi",
  phone: "0803 123 4567",
  email: "",
  categoryId: "cat1",
  city: "Lekki, Lagos",
  title: "Fix leaking kitchen sink",
  description: "Sink has been leaking under the cabinet since Monday.",
  budget: "₦15,000",
  source: "facebook",
  consent: true,
};

test("a complete form with consent passes and is cleaned", () => {
  const { data, problems } = checkOnBehalfJob(good);
  assert.deepEqual(problems, []);
  assert.equal(data.budget, 15000);
  assert.equal(data.email, null);
  assert.equal(data.source, "facebook");
});

test("no job is posted without the customer's agreement", () => {
  const { problems } = checkOnBehalfJob({ ...good, consent: undefined });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /agreed/);
  // "true" as a string from a sloppy client is not consent either
  assert.equal(checkOnBehalfJob({ ...good, consent: "true" }).problems.length, 1);
});

test("an incomplete phone number is refused", () => {
  const { problems } = checkOnBehalfJob({ ...good, phone: "0803 123" });
  assert.ok(problems.some((p) => p.startsWith("Customer phone")));
});

test("missing fields are each reported", () => {
  const { problems } = checkOnBehalfJob({ consent: true });
  assert.ok(problems.length >= 5);
});

test("a bad email is refused, a good one lowercased", () => {
  assert.ok(checkOnBehalfJob({ ...good, email: "not-an-email" }).problems.length === 1);
  assert.equal(checkOnBehalfJob({ ...good, email: "Ada@Example.com" }).data.email, "ada@example.com");
});

test("unknown source falls back to other", () => {
  assert.equal(checkOnBehalfJob({ ...good, source: "tiktok" }).data.source, "other");
  assert.ok(SOURCES.includes("whatsapp"));
});

test("phone variants cover the shapes one number is stored in", () => {
  const v = phoneVariants("0803 123 4567");
  for (const s of ["0803 123 4567", "2348031234567", "+2348031234567", "08031234567"]) assert.ok(v.includes(s), s);
});
