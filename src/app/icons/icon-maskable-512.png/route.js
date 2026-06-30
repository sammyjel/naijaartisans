import { renderAppIcon } from "@/lib/appicon";

export const runtime = "edge";

export function GET() {
  return renderAppIcon(512, true);
}
