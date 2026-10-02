// Recording which campaign produced a customer.
//
// Called at CONVERSION only — never on a visit. See the comment block on the
// Attribution model in prisma/schema.prisma for why that distinction is the
// whole design and not an optimisation.

import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { isConversion } from "./utm";
import { track } from "./metrics";

const COOKIE = "na_attr";

/**
 * Reads the attribution cookie written by CampaignTracker.
 *
 * Returns null rather than throwing on anything malformed: a visitor with a
 * corrupted cookie should still be able to post a job.
 */
export function readAttributionCookie() {
  try {
    const raw = cookies().get(COOKIE)?.value;
    if (!raw) return null;
    const data = JSON.parse(decodeURIComponent(raw));
    if (!data || typeof data !== "object") return null;
    return {
      source: String(data.utm_source || "direct").slice(0, 80),
      medium: String(data.utm_medium || "none").slice(0, 80),
      campaignTag: String(data.utm_campaign || "").slice(0, 80),
      content: String(data.utm_content || "").slice(0, 80),
      term: String(data.utm_term || "").slice(0, 80),
      landingPath: data.p ? String(data.p).slice(0, 300) : null,
    };
  } catch {
    return null;
  }
}

/**
 * Records a conversion against whatever campaign the visitor arrived with.
 *
 * NEVER THROWS. This is called from inside the job-posting and deal paths, and a
 * job that saved must not fail because a marketing row did not. Marketing data
 * is worth strictly less than the thing being measured.
 *
 * Untagged conversions are recorded too, as source "direct". Storing only the
 * tagged ones would make every campaign look responsible for 100% of business.
 *
 * @param {{
 *   conversion: string,
 *   userId?: string|null,
 *   subjectType?: string|null,
 *   subjectId?: string|null,
 *   conversionPath?: string|null,
 * }} input
 */
export async function recordConversion({
  conversion,
  userId = null,
  subjectType = null,
  subjectId = null,
  conversionPath = null,
}) {
  try {
    if (!isConversion(conversion)) {
      // Refuse unknown names rather than storing them: a typo'd event produces
      // a report that looks complete and is wrong.
      console.warn("[attribution] ignoring unknown conversion:", conversion);
      return null;
    }

    const attr = readAttributionCookie() || {
      source: "direct",
      medium: "none",
      campaignTag: "",
      content: "",
      term: "",
      landingPath: null,
    };

    // Resolve the tag to a real campaign when one exists. A tag that matches
    // nothing is still stored — that is how a mistyped link stays debuggable
    // instead of disappearing from the report.
    let campaignId = null;
    if (attr.campaignTag) {
      const campaign = await prisma.campaign.findUnique({
        where: { slug: attr.campaignTag },
        select: { id: true },
      });
      campaignId = campaign?.id ?? null;
    }

    const row = await prisma.attribution.create({
      data: {
        conversion,
        campaignId,
        source: attr.source,
        medium: attr.medium,
        campaignTag: attr.campaignTag,
        content: attr.content,
        term: attr.term,
        landingPath: attr.landingPath,
        conversionPath,
        userId,
        subjectType,
        subjectId,
      },
      select: { id: true },
    });

    track("conversion_attributed", {
      conversion,
      source: attr.source,
      medium: attr.medium,
      campaign: attr.campaignTag || null,
      matched: Boolean(campaignId),
    });

    return row;
  } catch (e) {
    console.error("[attribution] recordConversion failed:", e?.message || e);
    return null;
  }
}

/**
 * The report the whole system exists to produce: which source actually produced
 * customers, not which produced likes.
 *
 * One groupBy rather than a query per source — this runs on an admin page that
 * must not become its own reason to wake the database.
 *
 * @param {{ since?: Date }} [opts]
 */
export async function attributionSummary(opts = {}) {
  const since = opts.since || new Date(Date.now() - 90 * 86400000);

  const [bySource, byConversion, byCampaign, recent, total] = await Promise.all([
    prisma.attribution.groupBy({
      by: ["source", "medium"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.attribution.groupBy({
      by: ["conversion"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.attribution.groupBy({
      by: ["campaignTag"],
      where: { createdAt: { gte: since }, campaignTag: { not: "" } },
      _count: { _all: true },
    }),
    prisma.attribution.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true, conversion: true, source: true, medium: true, campaignTag: true,
        landingPath: true, conversionPath: true, createdAt: true,
        campaign: { select: { name: true, slug: true } },
      },
    }),
    prisma.attribution.count({ where: { createdAt: { gte: since } } }),
  ]);

  return {
    since,
    total,
    bySource: bySource
      .map((r) => ({ source: r.source, medium: r.medium, count: r._count._all }))
      .sort((a, b) => b.count - a.count),
    byConversion: byConversion
      .map((r) => ({ conversion: r.conversion, count: r._count._all }))
      .sort((a, b) => b.count - a.count),
    byCampaign: byCampaign
      .map((r) => ({ campaign: r.campaignTag, count: r._count._all }))
      .sort((a, b) => b.count - a.count),
    recent,
  };
}
