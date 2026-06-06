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
