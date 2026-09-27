// Re-running the backfill must not email anyone twice, and bursts must not be
// thrown away by Resend's rate limit.
//
// Both of these were broken in production on 2026-09-28: 17 of 45 digests were
// lost to 429s, and a retry would have sent the other 28 a duplicate. The
// dedupeKey only ever protected the in-app rows — nothing protected the email.
//
// runJobBackfill takes its PrismaClient as an argument, so the whole thing runs
// here against a fake with no database.

import test from "node:test";
import assert from "node:assert/strict";

process.env.RESEND_API_KEY = "test-key";
process.env.EMAIL_MAX_PER_SECOND = "1000"; // read at import; keeps the suite fast

const { runJobBackfill } = await import("../src/lib/job-digest.js");
const { sendEmail } = await import("../src/lib/email.js");

const JOBS = [
  {
    id: "job1",
    title: "Fix a leaking pipe",
    city: "Lagos",
    budget: 20000,
    createdAt: new Date("2026-09-01T00:00:00Z"),
    categoryId: "plumbing",
    customerId: "cust1",
    category: { name: "Plumbing" },
    _count: { quotes: 0 },
  },
];

const ARTISANS = [
  { id: "a1", name: "Ada", email: "ada@example.test", city: "Lagos", createdAt: new Date("2026-01-01"), services: [{ categoryId: "plumbing" }] },
  { id: "a2", name: "Bola", email: "bola@example.test", city: "Lagos", createdAt: new Date("2026-01-02"), services: [] },
  { id: "a3", name: "Chidi", email: null, city: "Abuja", createdAt: new Date("2026-01-03"), services: [] },
];

/** @param {string[]} sentUserIds artisans who already hold a SENT notification */
function fakePrisma(sentUserIds = []) {
  const calls = { createMany: 0, updateMany: [] };
  return {
    calls,
    jobRequest: { findMany: async () => JOBS },
    user: { findMany: async () => ARTISANS },
    notification: {
      findMany: async () => sentUserIds.map((userId) => ({ userId })),
      createMany: async ({ data }) => {
        calls.createMany += 1;
        return { count: data.length };
      },
      updateMany: async ({ where }) => {
        calls.updateMany.push(where.userId);
        return { count: 1 };
      },
    },
  };
}

/** Captures every recipient sendEmail is asked to write to. */
function captureFetch() {
  const to = [];
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    to.push(body.to);
    return { ok: true, status: 200, headers: new Map(), text: async () => "" };
  };
  return to;
}

const origFetch = globalThis.fetch;
test.afterEach(() => {
  globalThis.fetch = origFetch;
});

// ── the regression ─────────────────────────────────────────────────────────

test("a re-run skips artisans who already received their digest", async () => {
  const to = captureFetch();
  await runJobBackfill(fakePrisma(["a1"]), { send: true, operatorEmail: "owner@example.test" });

  assert.ok(!to.includes("ada@example.test"), "Ada already had her digest and must not get a second");
  assert.ok(to.includes("bola@example.test"), "Bola is still owed hers");
});

test("the first run emails everyone who has an address", async () => {
  const to = captureFetch();
  await runJobBackfill(fakePrisma([]), { send: true, operatorEmail: "owner@example.test" });

  assert.ok(to.includes("ada@example.test"));
  assert.ok(to.includes("bola@example.test"));
});

test("an artisan with no email address is never counted as a recipient", async () => {
  const to = captureFetch();
  const result = await runJobBackfill(fakePrisma([]), { send: false });

  assert.equal(result.withEmail, 2);
  assert.equal(result.withoutEmail, 1, "Chidi has no address");
  assert.equal(to.length, 0, "a dry run sends nothing");
});

test("withoutEmail counts missing addresses, not excluded recipients", async () => {
  // The two must not be conflated: after a partial run the excluded artisans
  // are reachable, they have simply already been reached.
  const result = await runJobBackfill(fakePrisma(["a1"]), { send: false });
  assert.equal(result.alreadyEmailed, 1);
  assert.equal(result.withEmail, 1);
  assert.equal(result.withoutEmail, 1, "still just Chidi");
});

test("a dry run writes nothing", async () => {
  const p = fakePrisma([]);
  await runJobBackfill(p, { send: false });
  assert.equal(p.calls.createMany, 0);
  assert.equal(p.calls.updateMany.length, 0);
});

// ── rate limiting ──────────────────────────────────────────────────────────

test("a 429 is retried rather than dropped", async () => {
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    if (attempts === 1) {
      return {
        ok: false,
        status: 429,
        headers: new Map([["retry-after", "0"]]),
        text: async () => '{"name":"rate_limit_exceeded"}',
      };
    }
    return { ok: true, status: 200, headers: new Map(), text: async () => "" };
  };

  const res = await sendEmail({ to: "x@example.test", subject: "s", html: "<p>h</p>" });
  assert.equal(res.sent, true, "a rate-limited send must recover, not be lost");
  assert.equal(attempts, 2);
});

test("a rate limit that never clears is reported as rate_limited, not a generic failure", async () => {
  globalThis.fetch = async () => ({
    ok: false,
    status: 429,
    headers: new Map([["retry-after", "0"]]),
    text: async () => '{"name":"rate_limit_exceeded"}',
  });

  const res = await sendEmail({ to: "x@example.test", subject: "s", html: "<p>h</p>" });
  assert.equal(res.sent, false);
  assert.equal(res.reason, "rate_limited", "the operator needs to know a retry is worth it");
});

test("a rejected address is not retried", async () => {
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    return { ok: false, status: 422, headers: new Map(), text: async () => '{"name":"validation_error"}' };
  };

  const res = await sendEmail({ to: "nope", subject: "s", html: "<p>h</p>" });
  assert.equal(res.sent, false);
  assert.equal(res.reason, "send_failed");
  assert.equal(attempts, 1, "retrying a permanent 4xx only burns rate-limit budget");
});

test("the sender paces itself below the configured ceiling", async () => {
  // Re-imported with a low ceiling so the limiter is actually exercised.
  process.env.EMAIL_MAX_PER_SECOND = "4";
  const { sendEmail: paced } = await import("../src/lib/email.js?paced");

  globalThis.fetch = async () => ({ ok: true, status: 200, headers: new Map(), text: async () => "" });

  const started = Date.now();
  await Promise.all(
    Array.from({ length: 6 }, (_, i) =>
      paced({ to: `p${i}@example.test`, subject: "s", html: "<p>h</p>" })
    )
  );
  assert.ok(
    Date.now() - started >= 900,
    "6 sends at a ceiling of 4/s must span more than a second, or the limiter does nothing"
  );
  process.env.EMAIL_MAX_PER_SECOND = "1000";
});
