// POST — the owner posts a job for a customer who agreed to it (job-sourcing test).
// See src/lib/sourced-jobs.js.

import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { postJobForCustomer } from "@/lib/sourced-jobs";

// Alerting artisans is awaited (see /api/jobs), so allow it time.
export const maxDuration = 60;

export async function POST(request) {
  if (!isAdmin()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const r = await postJobForCustomer(body);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r, { status: 201 });
}
