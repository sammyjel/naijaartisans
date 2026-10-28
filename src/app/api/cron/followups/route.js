// Daily follow-up on stalled jobs (src/lib/followups.js), plus monthly-plan
// renewal reminders (src/lib/renewals.js) on the cron run.
//
//   GET  — Vercel Cron, daily (vercel.json). Vercel sends
//          "Authorization: Bearer $CRON_SECRET"; with CRON_SECRET unset the
//          route refuses, so a missing variable fails closed rather than letting
//          anyone on the internet trigger emails to the whole user base.
//   POST — the admin dashboard. { send: false } previews, { send: true } sends.

import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { runFollowUps } from "@/lib/followups";
import { runRenewals } from "@/lib/renewals";
import { alertOverdueOrders } from "@/lib/dfy";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function cronAuthorized(request) {
  const expected = (process.env.CRON_SECRET || "").trim();
  if (!expected) return false;
  const presented = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (presented.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ presented.charCodeAt(i);
  return diff === 0;
}

export async function GET(request) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  try {
    const result = await runFollowUps({ send: true });
    const { items, ...summary } = result;
    console.log("[followups] cron", summary);
    // Renewal reminders ride the same daily run. A failure there must not
    // hide the follow-up result, so it is reported alongside, not thrown.
    let renewals;
    try {
      renewals = await runRenewals({ send: true });
      delete renewals.items;
    } catch (err) {
      console.error("[renewals] cron failed:", err);
      renewals = { error: "Renewal run failed." };
    }
    console.log("[renewals] cron", renewals);
    // Done-for-you orders past their due date: the owner is told every morning
    // until each is delivered.
    let orders;
    try {
      orders = await alertOverdueOrders();
    } catch (err) {
      console.error("[dfy] overdue check failed:", err);
      orders = { error: "Overdue check failed." };
    }
    return NextResponse.json({ ...summary, renewals, orders });
  } catch (err) {
    console.error("[followups] cron failed:", err);
    return NextResponse.json({ error: "Follow-up run failed." }, { status: 500 });
  }
}

export async function POST(request) {
  if (!isAdmin()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  try {
    return NextResponse.json(await runFollowUps({ send: body.send === true }));
  } catch (err) {
    console.error("[followups] admin run failed:", err);
    return NextResponse.json({ error: "Follow-up run failed." }, { status: 500 });
  }
}
