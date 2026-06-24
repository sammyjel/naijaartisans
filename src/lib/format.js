// Format a number as Nigerian Naira, e.g. 5000 -> "₦5,000"
export function naira(amount) {
  if (amount == null || amount === "") return null;
  const n = Number(amount);
  if (Number.isNaN(n)) return null;
  return "₦" + n.toLocaleString("en-NG");
}

// Render a price range from min/max.
export function priceRange(min, max) {
  const lo = naira(min);
  const hi = naira(max);
  if (lo && hi) return `${lo} – ${hi}`;
  if (lo) return `From ${lo}`;
  if (hi) return `Up to ${hi}`;
  return "Negotiable";
}

// True if a featuredUntil / proUntil timestamp is still in the future.
export function isFeatured(until) {
  return until ? new Date(until).getTime() > Date.now() : false;
}

// Sort services so featured artisans come first (stable: preserves input order otherwise).
export function featuredFirst(services) {
  return [...services].sort(
    (a, b) => (isFeatured(b.artisan?.featuredUntil) ? 1 : 0) - (isFeatured(a.artisan?.featuredUntil) ? 1 : 0)
  );
}

// "18:00" -> "6:00 PM"
export function formatTime(hhmm) {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
}

// Open/closed status given opening hours, computed in Nigerian time (WAT, UTC+1).
export function businessStatus(openTime, closeTime) {
  if (!openTime || !closeTime) return null;
  const watNow = new Date(Date.now() + 60 * 60 * 1000); // shift UTC -> WAT
  const mins = watNow.getUTCHours() * 60 + watNow.getUTCMinutes();
  const [oh, om] = openTime.split(":").map(Number);
  const [ch, cm] = closeTime.split(":").map(Number);
  const open = oh * 60 + om;
  const close = ch * 60 + cm;
  const isOpen = close > open ? mins >= open && mins < close : mins >= open || mins < close;
  return { isOpen, openLabel: formatTime(openTime), closeLabel: formatTime(closeTime) };
}

export function timeAgo(date) {
  const d = new Date(date);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  const intervals = [
    [31536000, "year"],
    [2592000, "month"],
    [604800, "week"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ];
  for (const [secs, label] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count > 1 ? "s" : ""} ago`;
  }
  return "just now";
}
