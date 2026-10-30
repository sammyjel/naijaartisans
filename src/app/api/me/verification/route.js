// GET  — the logged-in artisan's verification state (VerificationCard).
// POST — { area, confirm: true } asks to be verified. See src/lib/verification.js.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadVerification, requestVerification } from "@/lib/verification";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  return NextResponse.json(await loadVerification(user.id));
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const r = await requestVerification(user.id, body);
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(await loadVerification(user.id));
}
