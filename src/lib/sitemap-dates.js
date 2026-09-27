// Date helpers for the sitemap, in a module with no database import so the
// lastmod policy can be unit-tested (tests/sitemap.test.mjs).
//
// The policy these enforce: a URL gets a <lastmod> only when a real timestamp
// exists for it. Nothing here ever falls back to "now" — a sitemap claiming all
// 174 pages changed this morning is worse than no lastmod at all, because it is a
// lie a crawler learns to discount.

const MONTHS = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

/**
 * Parses an editorial date like "June 2026" into a Date at the first of that
 * month (UTC), which is the actual precision of the source.
 *
 * Returns null — never a fallback date — when the value cannot be understood.
 *
 * @param {string|undefined|null} value
 * @returns {Date|null}
 */
export function parseEditorialDate(value) {
  if (!value || typeof value !== "string") return null;
  const m = value.trim().toLowerCase().match(/^([a-z]+)\s+(\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[1]];
  const year = Number(m[2]);
  if (month === undefined || !Number.isFinite(year)) return null;
  return new Date(Date.UTC(year, month, 1));
}

/**
 * The newer of two possibly-null dates, or null when both are null.
 * Used to roll per-city service timestamps up into a per-category one.
 *
 * @param {Date|string|null|undefined} a
 * @param {Date|string|null|undefined} b
 * @returns {Date|string|null}
 */
export function newest(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

/**
 * Builds the optional lastModified fragment for a sitemap entry: `{}` when there
 * is no timestamp, so Next omits the element entirely.
 *
 * @param {Date|string|null|undefined} when
 */
export function lastMod(when) {
  return when ? { lastModified: when } : {};
}
