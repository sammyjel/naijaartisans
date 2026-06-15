// Re-use the same branded banner for X/Twitter cards.
// Runtime config must be literal in this file (Next can't read re-exported config).
import OgImage from "./opengraph-image";

export const runtime = "edge";
export const alt = "NaijaArtisans — Find trusted artisans across Nigeria";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default OgImage;
