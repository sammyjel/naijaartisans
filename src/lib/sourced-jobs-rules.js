// Jobs the owner posts on a customer's behalf (the job-sourcing test, Nov 2026).
//
// No database import, so the rules are unit-testable. The flow: the owner finds
// a fresh public request ("I need a plumber in Lekki"), the person agrees, and
// the owner posts it for them so they never have to sign up. The person's
// details are only ever entered with their agreement — never copied from
// someone else's post (NDPA 2023, and the site's trust).

import { phoneProblem, toInternationalNG } from "./phone.js";

/** utm_campaign of the sourcing test; the reply links in the kit use the same tag. */
export const SOURCING_CAMPAIGN = "sourcing-test";
/** Attribution medium that marks a job posted by the owner for a customer. */
export const ON_BEHALF_MEDIUM = "on-behalf";
export const SOURCES = ["x", "facebook", "nairaland", "whatsapp", "other"];

/**
 * Cleans the admin form and lists what is wrong with it. Empty `problems` means
 * the job can be posted.
 *
 * @param {Record<string, unknown>} body
 * @returns {{ data: object, problems: string[] }}
 */
export function checkOnBehalfJob(body = {}) {
  const s = (v, max) => String(v ?? "").trim().slice(0, max);
  const data = {
    name: s(body.name, 80),
    phone: s(body.phone, 30),
    email: s(body.email, 120).toLowerCase() || null,
    categoryId: s(body.categoryId, 40),
    city: s(body.city, 60),
    title: s(body.title, 120),
    description: s(body.description, 2000),
    budget: body.budget ? parseInt(String(body.budget).replace(/[^\d]/g, ""), 10) || null : null,
    source: SOURCES.includes(body.source) ? body.source : "other",
    consent: body.consent === true,
  };

  const problems = [];
  if (!data.consent) problems.push("Tick the box to confirm the customer agreed to this job being posted and to artisans contacting them.");
  if (!data.name) problems.push("Enter the customer's name.");
  const bad = phoneProblem(data.phone);
  if (bad) problems.push(`Customer phone: ${bad}`);
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) problems.push("That email address doesn't look right.");
  if (!data.categoryId) problems.push("Pick the trade.");
  if (!data.city) problems.push("Enter the city or area.");
  if (data.title.length < 5) problems.push("Give the job a short title (at least 5 characters).");
  if (data.description.length < 10) problems.push("Describe the job in a sentence or two.");
  return { data, problems };
}

/**
 * The spellings one Nigerian number may already be stored under, so an existing
 * account is reused instead of colliding with the unique phone column.
 *
 * @param {string} raw
 * @returns {string[]}
 */
export function phoneVariants(raw) {
  const trimmed = String(raw ?? "").trim();
  const intl = toInternationalNG(trimmed); // e.g. "2348031234567"
  const out = new Set([trimmed]);
  if (intl) {
    out.add(intl);
    out.add("+" + intl);
    if (intl.startsWith("234")) out.add("0" + intl.slice(3));
  }
  return [...out].filter(Boolean);
}
