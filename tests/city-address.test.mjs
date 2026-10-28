// Structured-data address for a city (Google Search Console asked for addressRegion).

import test from "node:test";
import assert from "node:assert/strict";
import { CITIES, STATE_BY_CITY, cityAddress } from "../src/lib/constants.js";

test("every city the site offers has a state", () => {
  const missing = CITIES.filter((c) => !STATE_BY_CITY[c]);
  assert.deepEqual(missing, []);
});

test("the address carries locality, state and country", () => {
  assert.deepEqual(cityAddress("Port Harcourt"), {
    "@type": "PostalAddress",
    addressLocality: "Port Harcourt",
    addressRegion: "Rivers",
    addressCountry: "NG",
  });
});

test("an unknown city gets no guessed state, and no street or postcode is invented", () => {
  const a = cityAddress("Somewhere");
  assert.equal(a.addressRegion, undefined);
  assert.equal(a.streetAddress, undefined);
  assert.equal(a.postalCode, undefined);
});
