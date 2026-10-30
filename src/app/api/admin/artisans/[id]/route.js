// POST — owner trust & safety actions on one artisan.
//   { action: "verify" }              the Verified badge; the artisan is told
//   { action: "decline", reason }     turn down a verification request; the artisan is told why
//   { action: "unverify" }            remove the badge
//   { action: "suspend", reason } / { action: "unsuspend" }
// A suspended artisan is hidden from every public page and job alert
// (LISTED_ARTISAN) and is logged out (getCurrentUser returns null).

import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { revalidateFor } from "@/lib/cached-queries";
import { decideVerification } from "@/lib/verification";

const DATA = {
  unverify: () => ({ verifiedAt: null }),
  suspend: (body) => ({ suspendedAt: new Date(), suspendReason: String(body.reason || "").trim().slice(0, 300) || null }),
  unsuspend: () => ({ suspendedAt: null, suspendReason: null }),
};

export async function POST(request, { params }) {
  if (!isAdmin()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const known = body.action === "verify" || body.action === "decline" || DATA[body.action];
  if (!known) return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  const artisan = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, role: true } });
  if (!artisan || artisan.role !== "ARTISAN") return NextResponse.json({ error: "Artisan not found." }, { status: 404 });

  if (body.action === "verify" || body.action === "decline") {
    await decideVerification(artisan.id, body.action, body.reason);
  } else {
    await prisma.user.update({ where: { id: artisan.id }, data: DATA[body.action](body) });
  }
  // Listings and the profile are cached; drop them so the change shows now.
  revalidateFor("artisan", [`/artisans/${artisan.id}`, "/browse", "/"]);
  return NextResponse.json({ ok: true });
}
