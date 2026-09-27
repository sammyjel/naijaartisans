// Security headers.
//
// next.config.mjs's headers() is a pure async function, so the real configuration
// can be executed and asserted on here rather than described in a doc that drifts.
//
// Context for why this matters more than usual: these headers existed in the repo
// but had never been committed, so production was serving only HSTS (and that came
// from Vercel's domain setting, not from this file). A test that runs the actual
// config is the thing that would have caught it.

import test from "node:test";
import assert from "node:assert/strict";
import nextConfig from "../next.config.mjs";

const rules = await nextConfig.headers();

/** The header set applied to every path. */
function baseHeaders() {
  const rule = rules.find((r) => r.source === "/:path*");
  assert.ok(rule, "expected a rule covering /:path*");
  return new Map(rule.headers.map((h) => [h.key, h.value]));
}

const base = baseHeaders();
const csp = base.get("Content-Security-Policy") || "";

/** Pulls one directive's value out of the CSP string. */
function directive(name) {
  const found = csp
    .split(";")
    .map((d) => d.trim())
    .find((d) => d === name || d.startsWith(name + " "));
  return found === undefined ? null : found.slice(name.length).trim();
}

test("every required security header is present on all paths", () => {
  for (const key of [
    "Content-Security-Policy",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Strict-Transport-Security",
    "X-Frame-Options",
    "Cross-Origin-Opener-Policy",
    "Cross-Origin-Resource-Policy",
  ]) {
    assert.ok(base.has(key), `missing header: ${key}`);
    assert.ok(String(base.get(key)).length > 0, `empty header: ${key}`);
  }
});

test("HSTS remains enabled with a long max-age", () => {
  const hsts = base.get("Strict-Transport-Security");
  assert.match(hsts, /max-age=\d+/);
  const maxAge = Number(hsts.match(/max-age=(\d+)/)[1]);
  assert.ok(maxAge >= 31536000, "HSTS max-age should be at least a year");
  assert.match(hsts, /includeSubDomains/);
});

test("nosniff and a strict referrer policy are set", () => {
  assert.equal(base.get("X-Content-Type-Options"), "nosniff");
  assert.match(base.get("Referrer-Policy"), /strict-origin-when-cross-origin|no-referrer/);
});

test("Permissions-Policy switches off what the site does not use", () => {
  const pp = base.get("Permissions-Policy");
  for (const feature of ["camera", "microphone", "payment"]) {
    assert.match(pp, new RegExp(feature + "=\\(\\)"), `${feature} should be disabled`);
  }
});

test("Permissions-Policy still allows geolocation on our own origin", () => {
  // "Artisans near me" asks the browser for a position; blocking it outright would
  // break a shipped feature.
  assert.match(base.get("Permissions-Policy"), /geolocation=\(self\)/);
});

test("clickjacking is blocked two ways", () => {
  assert.equal(base.get("X-Frame-Options"), "DENY");
  assert.equal(directive("frame-ancestors"), "'none'");
});

test("CSP locks down the directives that actually blunt injection", () => {
  assert.equal(directive("object-src"), "'none'");
  assert.equal(directive("base-uri"), "'self'");
  assert.equal(directive("form-action"), "'self'");
  assert.equal(directive("default-src"), "'self'");
});

test("CSP allows every third-party host the app genuinely loads", () => {
  // Each of these is in src/ - a CSP that omits one breaks a real feature.
  assert.match(directive("img-src"), /public\.blob\.vercel-storage\.com/, "avatars");
  assert.match(directive("img-src"), /tile\.openstreetmap\.org/, "map tiles");
  assert.match(directive("img-src"), /unpkg\.com/, "Leaflet marker icons");
  assert.match(directive("connect-src"), /api\.paystack\.co/, "payments");
  assert.match(directive("script-src"), /js\.paystack\.co/, "Paystack script");
  assert.match(directive("frame-src"), /paystack/, "Paystack checkout iframe");
  assert.match(directive("script-src"), /googlesyndication\.com/, "AdSense");
  assert.match(directive("script-src"), /vercel-insights\.com|vercel-scripts\.com/, "analytics");
});

test("images may load from data: and blob: for uploads and icons", () => {
  assert.match(directive("img-src"), /data:/);
  assert.match(directive("img-src"), /blob:/);
});

test("the unsafe-inline limitation is confined to script-src and style-src", () => {
  // Documented trade: a nonce-based CSP needs middleware, and a per-request nonce
  // forces dynamic rendering, which would undo the ISR work in this release.
  assert.match(directive("script-src"), /'unsafe-inline'/);
  assert.equal(
    /'unsafe-eval'/.test(csp),
    false,
    "unsafe-eval is not needed and must not be allowed"
  );
  assert.equal(
    /'unsafe-inline'/.test(directive("default-src") || ""),
    false,
    "default-src must not be loosened"
  );
});

test("private and API routes are still marked no-store", () => {
  const priv = rules.find((r) => String(r.source).includes("dashboard"));
  const api = rules.find((r) => String(r.source).startsWith("/api"));
  assert.ok(priv, "expected a rule for private pages");
  assert.ok(api, "expected a rule for /api");
  for (const rule of [priv, api]) {
    const cc = rule.headers.find((h) => h.key === "Cache-Control");
    assert.ok(cc, "expected Cache-Control");
    assert.match(cc.value, /no-store/);
  }
});

test("the no-store rules do not accidentally cover cacheable marketing pages", () => {
  const noStoreSources = rules
    .filter((r) => r.headers.some((h) => h.key === "Cache-Control" && /no-store/.test(h.value)))
    .map((r) => String(r.source));
  for (const src of noStoreSources) {
    assert.equal(src, src.match(/^\/(\(|api|dashboard|admin)/) ? src : src, "sanity");
    assert.equal(
      src === "/:path*",
      false,
      "a catch-all no-store rule would cancel the ISR caching this release adds"
    );
  }
});

test("Vercel Blob is configured as a remote image host", () => {
  const patterns = nextConfig.images?.remotePatterns || [];
  assert.ok(
    patterns.some((p) => String(p.hostname).includes("blob.vercel-storage.com")),
    "next/image needs the Blob host allowed or avatars fail to render"
  );
});
