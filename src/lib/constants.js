// Shared client-safe constants.
export const CITIES = [
  "Lagos",
  "Abuja",
  "Port Harcourt",
  "Kano",
  "Ibadan",
  "Benin City",
  "Enugu",
  "Kaduna",
  "Owerri",
  "Uyo",
  "Abeokuta",
  "Jos",
];

// URL-safe slug for a city, e.g. "Port Harcourt" -> "port-harcourt".
export function citySlug(city) {
  return city.toLowerCase().trim().replace(/\s+/g, "-");
}

// Resolve a slug back to its canonical city name, or null if unknown.
export function cityFromSlug(slug) {
  if (!slug) return null;
  const s = slug.toLowerCase();
  return CITIES.find((c) => citySlug(c) === s) || null;
}
