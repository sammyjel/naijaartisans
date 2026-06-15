import { ImageResponse } from "next/og";

// Branded 1200x630 banner shown when the site is shared on WhatsApp,
// Facebook, X, LinkedIn, etc. Generated on the edge — no image file needed.
export const runtime = "edge";
export const alt = "NaijaArtisans — Find trusted artisans across Nigeria";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #05603a 0%, #027a48 55%, #039855 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo lockup */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 20,
              background: "white",
              color: "#027a48",
              fontSize: 56,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            N
          </div>
          <div style={{ marginLeft: 24, fontSize: 44, fontWeight: 800 }}>NaijaArtisans</div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>
            Find trusted artisans
          </div>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, color: "#a6f4c5" }}>
            near you in Nigeria
          </div>
          <div style={{ fontSize: 34, marginTop: 28, color: "#d1fadf", maxWidth: 900 }}>
            Plumbers, electricians, tailors, caterers, mechanics & more. Post a job for free and get
            quotes from skilled hands around you.
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>naijaartisans.com</div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              background: "rgba(255,255,255,0.15)",
              padding: "12px 28px",
              borderRadius: 999,
            }}
          >
            Post a job — it&apos;s free
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
