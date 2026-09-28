// Nigerian phone numbers, normalised for dialling and for WhatsApp links.
//
// No database import, so the rules are unit-testable. They need to be: members
// type their number in at least four shapes ("08012345678", "8012345678",
// "+234 801 234 5678", "234-801-234-5678") and a wa.me link built from the wrong
// one fails silently — WhatsApp opens on a "phone number shared via url is
// invalid" screen rather than erroring, so a bad link looks like a WhatsApp
// problem rather than ours.

const NG_CODE = "234";

/**
 * Normalises a Nigerian number to international digits, or null if it cannot be.
 *
 * Returns null rather than a best guess on anything unrecognisable: a link to
 * the wrong person is worse than no link.
 *
 * @param {string|null|undefined} raw
 * @returns {string|null} e.g. "2348012345678"
 */
export function toInternationalNG(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return null;

  // 0803... — the everyday local form. Drop the trunk 0, prepend 234.
  if (digits.length === 11 && digits.startsWith("0")) return NG_CODE + digits.slice(1);

  // 803... — written without the trunk 0.
  if (digits.length === 10 && !digits.startsWith("0")) return NG_CODE + digits;

  // 234803... — already international, with or without a leading +.
  if (digits.length === 13 && digits.startsWith(NG_CODE)) return digits;

  // 0234... — a trunk 0 typed in front of the country code.
  if (digits.length === 14 && digits.startsWith("0" + NG_CODE)) return digits.slice(1);

  // Anything else may be a non-Nigerian number; pass it through only if it is a
  // plausible international length, otherwise refuse.
  if (digits.length >= 11 && digits.length <= 15) return digits;

  return null;
}

/**
 * A wa.me link for this number, optionally prefilled, or null.
 *
 * @param {string|null|undefined} raw
 * @param {string} [message]
 * @returns {string|null}
 */
export function whatsAppLink(raw, message) {
  const num = toInternationalNG(raw);
  if (!num) return null;
  const q = message ? "?text=" + encodeURIComponent(message) : "";
  return `https://wa.me/${num}${q}`;
}
