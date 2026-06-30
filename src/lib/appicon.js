import { ImageResponse } from "next/og";

// Renders the NaijaArtisans app icon (brand-green tile with a white "N") at any
// size. Used by the /icons/* routes to provide PWA / Play Store icons without
// committing binary PNGs. `maskable` fills the whole canvas (Android applies its
// own mask); otherwise the tile has rounded corners.
export function renderAppIcon(size, maskable = false) {
  const radius = maskable ? 0 : Math.round(size * 0.2);
  const fontSize = Math.round(size * (maskable ? 0.5 : 0.62));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#039855",
          borderRadius: radius,
          color: "#ffffff",
          fontFamily: "sans-serif",
          fontWeight: 800,
          fontSize,
        }}
      >
        N
      </div>
    ),
    { width: size, height: size }
  );
}
