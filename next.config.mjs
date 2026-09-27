/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["react-leaflet", "@react-leaflet/core"],
  poweredByHeader: false,

  images: {
    // Avatars live in Vercel Blob, whose hostname is per-store
    // (<storeId>.public.blob.vercel-storage.com), hence the wildcard. Without this
    // next/image rejects the URL outright — which is why the older avatar spots
    // use a plain <img>. New surfaces use next/image so a 3MB phone photo is not
    // shipped whole into a 44px circle.
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },

  async headers() {
    // ── Content-Security-Policy ─────────────────────────────────────────────
    //
    // Every host below was found by grepping src/ rather than copied from a
    // template, because a CSP assembled from a blog post is how the map on
    // artisan profiles silently stops loading.
    //
    //   unpkg.com                     Leaflet marker PNGs (LocationMap, AdminMap)
    //   *.tile.openstreetmap.org      Leaflet map tiles
    //   *.public.blob.vercel-storage  artisan avatars + portfolio photos
    //   js/api.paystack.co            Featured/Pro checkout
    //   *.googlesyndication.com etc.  AdSense (renders only once the client id is set)
    //   *.vercel-insights.com         @vercel/analytics beacon
    //
    // KNOWN LIMITATION — script-src keeps 'unsafe-inline'.
    //
    // Next.js 14 inlines its own bootstrap and flight-data scripts. Removing
    // 'unsafe-inline' therefore needs per-request nonces, which must come from
    // middleware, and a per-request nonce forces every page to render
    // dynamically. That would undo the ISR work in this same release and put the
    // site straight back to a cache MISS on every marketing page. Caching 153
    // pages is worth more than a strict script-src on a site with no
    // user-generated HTML, so the trade is taken deliberately and written down
    // rather than hidden. Revisit if user-supplied markup is ever rendered.
    //
    // object-src 'none', base-uri 'self' and frame-ancestors 'none' are the parts
    // that actually blunt injection and clickjacking here, and they are strict.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://*.googlesyndication.com https://js.paystack.co https://*.vercel-insights.com https://*.vercel-scripts.com",
      // Tailwind and Leaflet both inject style attributes/elements at runtime.
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://*.tile.openstreetmap.org https://unpkg.com https://*.googlesyndication.com https://*.g.doubleclick.net",
      "font-src 'self' data:",
      "connect-src 'self' https://*.public.blob.vercel-storage.com https://api.paystack.co https://*.vercel-insights.com https://*.googlesyndication.com",
      // Paystack completes checkout in an iframe.
      "frame-src 'self' https://js.paystack.co https://checkout.paystack.com https://*.googlesyndication.com https://*.g.doubleclick.net",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      // Modern equivalent of X-Frame-Options: DENY, which is kept below for older browsers.
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    const base = [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        // geolocation stays allowed on our own origin: "artisans near me" asks for
        // it. Everything else the browser would otherwise permit is switched off.
        value:
          "camera=(), microphone=(), payment=(), usb=(), magnetometer=(), gyroscope=(), geolocation=(self)",
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      // Cross-origin isolation, chosen for what this site actually does:
      //   COOP same-origin           — a popup we open cannot reach back into window
      //   CORP cross-origin          — our pages may still be embedded as images by
      //                                others; same-origin here would break the
      //                                Paystack/AdSense embeds above.
      // COEP is deliberately NOT set: it would require CORP headers on every
      // third-party asset (OSM tiles, AdSense) that we do not control.
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
    ];

    return [
      { source: "/:path*", headers: base },
      {
        // Anything showing someone's own data or the admin console must not be
        // held in a shared cache.
        source: "/(dashboard|admin|login|register|reset-password|forgot-password)/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
      {
        // API responses carry contact details and account state; never cache.
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
