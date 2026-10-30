// Artisan verification, end to end:
//
//   1. inviteUnverified   the owner presses "Invite" on /admin/artisans; every
//                         unverified artisan gets an in-app notice + email.
//   2. requestVerification  the artisan confirms their area on the dashboard
//                         (needs a phone, a listing and MIN_PHOTOS work photos).
//   3. decideVerification the owner reviews on /admin/artisans and verifies or
//                         declines; the artisan is told either way.
//
// Rules live in verification-rules.js (DB-free, tested).

import { prisma } from "./prisma";
import { deliverPending } from "./notifications";
import { emailHtml } from "./followups";
import { notifyOperator } from "./alerts";
import { SITE_URL } from "./seo";
import { MIN_PHOTOS, NEVER_ASK, inviteKey, requestProblems, verificationStatus } from "./verification-rules";

const SELECT = {
  id: true, name: true, role: true, phone: true, galleryUrls: true,
  verifiedAt: true, suspendedAt: true, verifyRequestedAt: true, verifyArea: true, verifyDeclinedReason: true,
  _count: { select: { services: true } },
};

/** Invitations sent per press of the admin button. Keeps one run inside the
 *  function time limit and the email provider's daily allowance; pressing again
 *  sends the next batch (rows already SENT are never re-sent). */
export const INVITE_BATCH = 40;

const INVITE = {
  title: "Security check: get your free ✓ Verified badge",
  body:
    "To protect customers and genuine artisans from fraudsters, NaijaArtisans is now verifying every artisan on the site. " +
    "Fake profiles are being removed, and verified artisans get a ✓ Verified badge on their profile and in search results, so customers trust them faster. " +
    "Please complete your verification on our website: log in, open your dashboard, make sure you have at least " + MIN_PHOTOS +
    " photos of your work, and tap \"Request verification\". It takes two minutes and it is free. " + NEVER_ASK,
  url: "/dashboard#verify",
};

export async function loadVerification(userId) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: SELECT });
  if (!u) return null;
  const photoCount = (u.galleryUrls || []).length;
  return {
    status: verificationStatus(u),
    verifiedAt: u.verifiedAt,
    requestedAt: u.verifyRequestedAt,
    area: u.verifyArea || "",
    declinedReason: u.verifyDeclinedReason,
    photoCount,
    minPhotos: MIN_PHOTOS,
    // Area is typed in the same form, so it is not a blocker yet.
    missing: requestProblems({ phone: u.phone, photoCount, listingCount: u._count.services }, { requireArea: false }),
  };
}

export async function requestVerification(userId, { area, confirm }) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: SELECT });
  if (!u || u.role !== "ARTISAN") return { error: "Only artisans can be verified.", status: 403 };
  const status = verificationStatus(u);
  if (status === "verified") return { error: "You are already verified.", status: 400 };
  if (status === "pending") return { error: "Your request is already with us. We'll let you know soon.", status: 400 };
  if (status === "suspended") return { error: "This account is suspended.", status: 403 };
  if (confirm !== true) return { error: "Please tick the box to confirm your details are true.", status: 400 };

  const cleanArea = String(area || "").trim().slice(0, 120);
  const problems = requestProblems({ phone: u.phone, photoCount: (u.galleryUrls || []).length, listingCount: u._count.services, area: cleanArea });
  if (problems.length) return { error: problems.join(" "), status: 400 };

  await prisma.user.update({
    where: { id: userId },
    data: { verifyRequestedAt: new Date(), verifyArea: cleanArea, verifyDeclinedReason: null },
  });
  notifyOperator({
    title: "Verification request",
    intro: `${u.name} has asked to be verified. Check their photos and details, then verify or decline.`,
    rows: [["Artisan", u.name], ["Area", cleanArea], ["Photos", String((u.galleryUrls || []).length)]],
    cta: { label: "Review requests", href: String(SITE_URL).replace(/\/+$/, "") + "/admin/artisans?f=requests" },
  }).catch(() => {});
  return { ok: true };
}

async function tellArtisan(userId, type, title, body, url, dedupeKey, cta) {
  await prisma.notification.createMany({ data: [{ userId, type, title, body, url, dedupeKey }], skipDuplicates: true });
  const pending = await prisma.notification.findMany({
    where: { dedupeKey, emailStatus: "PENDING" },
    select: { id: true, title: true, body: true, url: true, user: { select: { name: true, email: true } } },
  });
  return deliverPending(pending, (n) => emailHtml({ name: n.user?.name, title: n.title, body: n.body, url: n.url, cta }));
}

/** @param {"verify"|"decline"} decision */
export async function decideVerification(artisanId, decision, reason) {
  const stamp = Date.now();
  if (decision === "verify") {
    await prisma.user.update({ where: { id: artisanId }, data: { verifiedAt: new Date(), verifyDeclinedReason: null } });
    await tellArtisan(
      artisanId, "VERIFY_APPROVED", "You're verified ✓",
      "Thank you for completing the security check. Your profile now shows the ✓ Verified badge to customers. Keep adding photos of new work and asking happy customers for reviews.",
      `/artisans/${artisanId}`, `verify-approved:${artisanId}:${stamp}`, "See my profile"
    ).catch(() => {});
    return;
  }
  const why = String(reason || "").trim().slice(0, 300) || "We could not confirm your details from what was on your profile.";
  await prisma.user.update({ where: { id: artisanId }, data: { verifyDeclinedReason: why, verifiedAt: null } });
  await tellArtisan(
    artisanId, "VERIFY_DECLINED", "Your verification needs one more step",
    `We couldn't verify your profile yet: ${why} Please update your profile and request verification again from your dashboard. ${NEVER_ASK}`,
    "/dashboard#verify", `verify-declined:${artisanId}:${stamp}`, "Update and try again"
  ).catch(() => {});
}

/**
 * Invites every unverified, unsuspended artisan who has not been invited yet.
 * { send: false } only counts.
 */
export async function inviteUnverified({ send = false } = {}) {
  const artisans = await prisma.user.findMany({
    where: { role: "ARTISAN", verifiedAt: null, suspendedAt: null, verifyRequestedAt: null },
    select: { id: true },
  });
  const keys = artisans.map((a) => inviteKey(a.id));
  const already = await prisma.notification.count({ where: { dedupeKey: { in: keys }, emailStatus: { not: "PENDING" } } });
  const remaining = artisans.length - already;
  if (!send) return { dryRun: true, eligible: artisans.length, remaining, batch: Math.min(remaining, INVITE_BATCH), preview: INVITE };

  await prisma.notification.createMany({
    data: artisans.map((a) => ({ userId: a.id, type: "VERIFY_INVITE", title: INVITE.title, body: INVITE.body, url: INVITE.url, dedupeKey: inviteKey(a.id) })),
    skipDuplicates: true,
  });
  const pending = await prisma.notification.findMany({
    where: { dedupeKey: { in: keys }, emailStatus: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: INVITE_BATCH,
    select: { id: true, title: true, body: true, url: true, user: { select: { name: true, email: true } } },
  });
  const delivery = await deliverPending(pending, (n) => emailHtml({ name: n.user?.name, title: n.title, body: n.body, url: n.url, cta: "Get verified" }));
  const left = await prisma.notification.count({ where: { dedupeKey: { in: keys }, emailStatus: "PENDING" } });
  return { dryRun: false, eligible: artisans.length, ...delivery, left };
}
