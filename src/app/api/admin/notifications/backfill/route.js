// One-off backfill trigger: alert every artisan to the OPEN jobs that were
// posted before job alerts existed.
//
// This exists as a route rather than only as a local script because
// RESEND_API_KEY is a Sensitive Vercel environment variable — it cannot be read
// by any local process, so the send has to run here. The logic itself is shared
// with scripts/backfill-job-alerts.mjs via src/lib/job-digest.js.
//
//   POST .../backfill { kind: "jobs" }    open jobs -> every artisan
//   POST .../backfill { kind: "quotes" }  unseen quotes -> the customer who posted
//
// Without `send: true` each one only reports what it would do.
//
// Auth: an admin session cookie, or a bearer token matching BACKFILL_TOKEN.
// The token form is what makes this callable from a terminal without handing a
// password around; it is only accepted when BACKFILL_TOKEN is actually set, so
// an unset variable fails closed rather than opening the route.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { runJobBackfill } from "@/lib/job-digest";
import { runQuoteBackfill } from "@/lib/quote-backfill";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request) {
  if (isAdmin()) return true;

  const expected = (process.env.BACKFILL_TOKEN || "").trim();
  if (!expected) return false;

  const header = request.headers.get("authorization") || "";
  const presented = header.replace(/^Bearer\s+/i, "").trim();
  if (!presented || presented.length !== expected.length) return false;

  // Constant-time-ish compare. The token is long and random, so this is
  // belt-and-braces, but a length-leaking early return on a shared secret is
  // not worth keeping.
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ presented.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const lines = [];
  // Defaults to "jobs" so the original call shape keeps working.
  const kind = body.kind === "quotes" ? "quotes" : "jobs";
  const run = kind === "quotes" ? runQuoteBackfill : runJobBackfill;

  try {
    const result = await run(prisma, {
      send: body.send === true,
      log: (line) => lines.push(line),
    });
    return NextResponse.json({ ok: true, kind, ...result, log: lines });
  } catch (e) {
    console.error("backfill failed:", e);
    return NextResponse.json({ error: "Backfill failed.", detail: e.message, log: lines }, { status: 500 });
  }
}
