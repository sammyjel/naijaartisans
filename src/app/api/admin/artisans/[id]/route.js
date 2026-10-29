// POST — owner trust & safety actions on one artisan.
//   { action: "verify" } / { action: "unverify" }   the Verified badge
//   { action: "suspend", reason } / { action: "unsuspend" }
// A suspended artisan is hidden from every public page and job alert
// (LISTED_ARTISAN) and is logged out (getCurrentUser returns null).

import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { revalidateFor } from "@/lib/cached-queries";

const DATA = {
  verify: () => ({ verifiedAt: new Date() }),
  unverify: () => ({ verifiedAt: null }),
  suspend: (body) => ({ suspendedAt: new Date(), suspendReason: String(body.reason || "").trim().slice(0, 300) || null }),
  unsuspend: () => ({ suspendedAt: null, suspendReason: null }),
};

export async function POST(request, { params }) {
  if (!isAdmin()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const make = DATA[body.action];
  if (!make) return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  const artisan = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, role: true } });
  if (!artisan || artisan.role !== "ARTISAN") return NextResponse.json({ error: "Artisan not found." }, { status: 404 });

  await prisma.user.update({ where: { id: artisan.id }, data: make(body) });
  // Listings and the profile are cached; drop them so the change shows now.
  revalidateFor("artisan", [`/artisans/${artisan.id}`, "/browse", "/"]);
  return NextResponse.json({ ok: true });
}
