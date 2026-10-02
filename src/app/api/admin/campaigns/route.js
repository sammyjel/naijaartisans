// Campaigns, for the Marketing Hub.
//
//   GET  /api/admin/campaigns   list + the attribution report
//   POST /api/admin/campaigns   create one
//
// Admin-only. A campaign slug IS the utm_campaign value, so creating one is what
// makes a tagged link resolvable to a named campaign rather than a loose string.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { attributionSummary } from "@/lib/attribution";
import { normaliseTag, buildCampaignUrl, SOURCES } from "@/lib/utm";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const [campaigns, summary] = await Promise.all([
    prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { _count: { select: { attributions: true } } },
    }),
    attributionSummary(),
  ]);

  return NextResponse.json({ campaigns, summary, sources: SOURCES });
}

export async function POST(request) {
  if (!isAdmin()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Give the campaign a name." }, { status: 400 });

  const slug = normaliseTag(body.slug || name);
  if (!slug) return NextResponse.json({ error: "That name has no usable characters." }, { status: 400 });

  const destination = String(body.destination || "/").trim() || "/";

  try {
    const campaign = await prisma.campaign.create({
      data: {
        name,
        slug,
        destination,
        objective: String(body.objective || "TRAFFIC"),
        audience: String(body.audience || "NIGERIA"),
        status: "ACTIVE",
        notes: body.notes ? String(body.notes).slice(0, 2000) : null,
      },
    });

    // Hand back a ready-to-paste link per platform. Generating them here rather
    // than in the browser keeps one definition of how a tagged URL is built.
    const links = SOURCES.map((source) => ({
      source,
      url: buildCampaignUrl({
        destination,
        source,
        medium: source === "email" ? "email" : "social",
        campaign: slug,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://naijaartisans.com",
      }),
    }));

    return NextResponse.json({ campaign, links }, { status: 201 });
  } catch (err) {
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: `A campaign already uses the tag "${slug}". Two campaigns sharing a tag would share one row in every report.` },
        { status: 409 }
      );
    }
    console.error("[campaigns] create failed:", err);
    return NextResponse.json({ error: "Could not create the campaign." }, { status: 500 });
  }
}
