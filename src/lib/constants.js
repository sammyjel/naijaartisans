// Shared client-safe constants.
// Cities covering all 36 Nigerian states + FCT (capitals) plus major hubs.
export const CITIES = [
  "Aba",
  "Abakaliki",
  "Abeokuta",
  "Abuja",
  "Ado-Ekiti",
  "Akure",
  "Asaba",
  "Awka",
  "Bauchi",
  "Benin City",
  "Birnin Kebbi",
  "Calabar",
  "Damaturu",
  "Dutse",
  "Enugu",
  "Gombe",
  "Gusau",
  "Ibadan",
  "Ilorin",
  "Jalingo",
  "Jos",
  "Kaduna",
  "Kano",
  "Katsina",
  "Lafia",
  "Lagos",
  "Lokoja",
  "Maiduguri",
  "Makurdi",
  "Minna",
  "Nnewi",
  "Onitsha",
  "Osogbo",
  "Owerri",
  "Port Harcourt",
  "Sokoto",
  "Umuahia",
  "Uyo",
  "Warri",
  "Yenagoa",
  "Yola",
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
