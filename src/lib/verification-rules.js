// Artisan verification: who may ask, and what state a profile is in.
//
// No database import, so the rules are unit-testable. Verification is asked for
// on the site (dashboard → "Get verified"), never by the owner cold-messaging
// an artisan from a personal number: in Nigeria that reads as a scam, and it
// did (2026-10-30, the first WhatsApp check got a curse back).

import { phoneProblem } from "./phone.js";

/** Work photos an artisan must have on their profile before asking. */
export const MIN_PHOTOS = 2;

/** Said everywhere verification is mentioned. */
export const NEVER_ASK =
  "NaijaArtisans will never ask you for money, BVN, OTP, PIN or bank details — not on WhatsApp, by phone or by email. If anyone does, it isn't us.";

/** One invitation per artisan, ever: re-pressing the admin button resumes, it never repeats. */
export const inviteKey = (userId) => `verify-invite:v1:${userId}`;

/**
 * @param {{suspendedAt?:Date|null, verifiedAt?:Date|null, verifyRequestedAt?:Date|null, verifyDeclinedReason?:string|null}} u
 * @returns {"suspended"|"verified"|"declined"|"pending"|"none"}
 */
export function verificationStatus(u) {
  if (u.suspendedAt) return "suspended";
  if (u.verifiedAt) return "verified";
  if (u.verifyDeclinedReason) return "declined";
  if (u.verifyRequestedAt) return "pending";
  return "none";
}

/**
 * What is still missing before an artisan can ask. Empty means ready.
 *
 * @param {{phone?:string|null, photoCount:number, listingCount:number, area?:string}} p
 * @param {{requireArea?:boolean}} [opts]
 * @returns {string[]}
 */
export function requestProblems({ phone, photoCount, listingCount, area }, { requireArea = true } = {}) {
  const out = [];
  if (!phone || phoneProblem(phone)) out.push("Add a working phone number, so customers can reach you.");
  if (listingCount < 1) out.push("List at least one service.");
  if (photoCount < MIN_PHOTOS) out.push(`Add at least ${MIN_PHOTOS} photos of your work (you have ${photoCount}).`);
  if (requireArea && !String(area || "").trim()) out.push("Tell us the area you work in.");
  return out;
}
