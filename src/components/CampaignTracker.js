"use client";

// Captures campaign tags from the URL into a cookie. Costs nothing.
//
// ── WHY THIS IS A CLIENT COMPONENT AND NOT MIDDLEWARE ──────────────────────
//
// Middleware is the textbook place for this, and it would be the wrong choice
// here twice over:
//
//   1. Middleware runs on every request, so it opts the whole site out of
//      static rendering. The 141 ISR pages that were just made cacheable to end
//      the Neon compute outage would start rendering per-request again.
//   2. It runs for crawlers too, and this site has 174 indexed URLs.
//
// Doing it in the browser means Googlebot never triggers it, cached pages stay
// cached, and no server work happens until the visitor actually converts.
//
// The cookie is first-party, holds no personal data — only the campaign tags
// the visitor arrived with — and is read server-side at conversion time.

import { useEffect } from "react";

const COOKIE = "na_attr";
const MAX_AGE_DAYS = 30;

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

function tag(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function hasCookie() {
  try {
    return document.cookie.split("; ").some((c) => c.startsWith(COOKIE + "="));
  } catch {
    return false;
  }
}

export default function CampaignTracker() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);

      const utm = {};
      let tagged = false;
      for (const k of UTM_KEYS) {
        const v = tag(params.get(k));
        if (v) {
          utm[k] = v;
          tagged = true;
        }
      }

      // FIRST TOUCH WINS. If a visitor already carries attribution, a later
      // untagged visit must not overwrite it with "direct" — that is how a
      // campaign loses credit for a customer who went away to think about it
      // and came back a week later, which is most of them.
      if (!tagged && hasCookie()) return;

      let payload;
      if (tagged) {
        payload = { ...utm, p: window.location.pathname, t: Date.now() };
      } else {
        if (hasCookie()) return;
        // Untagged first visit: record the referrer honestly rather than
        // guessing a campaign. An inflated campaign report is worse than none.
        let source = "direct";
        let medium = "none";
        const ref = document.referrer || "";
        if (ref) {
          try {
            const host = new URL(ref).hostname.replace(/^www\./, "");
            // Our own pages are not a referral source.
            if (host && host !== window.location.hostname) {
              source = tag(host);
              medium = "referral";
            } else {
              return; // internal navigation — nothing to record
            }
          } catch {
            source = "unknown";
            medium = "referral";
          }
        }
        payload = { utm_source: source, utm_medium: medium, p: window.location.pathname, t: Date.now() };
      }

      const value = encodeURIComponent(JSON.stringify(payload));
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie =
        `${COOKIE}=${value}; path=/; max-age=${MAX_AGE_DAYS * 86400}; SameSite=Lax${secure}`;
    } catch {
      // Attribution is never worth breaking a page over.
    }
  }, []);

  return null;
}
