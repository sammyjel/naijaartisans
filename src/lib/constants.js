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

// State for every city above, for structured data (Google's JobPosting report
// asks for jobLocation.address.addressRegion). The city is all the site knows
// about where a job is, so street and postcode are deliberately not guessed.
export const STATE_BY_CITY = {
  Aba: "Abia",
  Abakaliki: "Ebonyi",
  Abeokuta: "Ogun",
  Abuja: "Federal Capital Territory",
  "Ado-Ekiti": "Ekiti",
  Akure: "Ondo",
  Asaba: "Delta",
  Awka: "Anambra",
  Bauchi: "Bauchi",
  "Benin City": "Edo",
  "Birnin Kebbi": "Kebbi",
  Calabar: "Cross River",
  Damaturu: "Yobe",
  Dutse: "Jigawa",
  Enugu: "Enugu",
  Gombe: "Gombe",
  Gusau: "Zamfara",
  Ibadan: "Oyo",
  Ilorin: "Kwara",
  Jalingo: "Taraba",
  Jos: "Plateau",
  Kaduna: "Kaduna",
  Kano: "Kano",
  Katsina: "Katsina",
  Lafia: "Nasarawa",
  Lagos: "Lagos",
  Lokoja: "Kogi",
  Maiduguri: "Borno",
  Makurdi: "Benue",
  Minna: "Niger",
  Nnewi: "Anambra",
  Onitsha: "Anambra",
  Osogbo: "Osun",
  Owerri: "Imo",
  "Port Harcourt": "Rivers",
  Sokoto: "Sokoto",
  Umuahia: "Abia",
  Uyo: "Akwa Ibom",
  Warri: "Delta",
  Yenagoa: "Bayelsa",
  Yola: "Adamawa",
};

/** schema.org PostalAddress for a city: locality, state when known, country. */
export function cityAddress(city) {
  return {
    "@type": "PostalAddress",
    addressLocality: city,
    ...(STATE_BY_CITY[city] ? { addressRegion: STATE_BY_CITY[city] } : {}),
    addressCountry: "NG",
  };
}

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
