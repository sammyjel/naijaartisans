// POST — invite unverified artisans to get verified, from the site.
//   { send: false } counts and returns the message; { send: true } sends the
//   next batch (INVITE_BATCH). Each artisan is invited once, ever.

import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { inviteUnverified } from "@/lib/verification";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request) {
  if (!isAdmin()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  try {
    return NextResponse.json(await inviteUnverified({ send: body.send === true }));
  } catch (e) {
    console.error("[verify] invite failed:", e);
    return NextResponse.json({ error: "Invite failed." }, { status: 500 });
  }
}
