import { ImageResponse } from "next/og";
import { loadDashboard } from "@/lib/data";
import { highlightModel } from "@/lib/highlight";
import { loadHighlightAssets, PortraitCard } from "@/lib/highlight-card";

// Node runtime: we read bundled font/logo files and reuse loadDashboard's fs path.
export const runtime = "nodejs";

export async function GET() {
  const [data, { fonts, logoSrc }] = await Promise.all([loadDashboard(), loadHighlightAssets()]);
  const model = highlightModel(data);

  return new ImageResponse(<PortraitCard m={model} logoSrc={logoSrc} />, {
    width: 1080,
    height: 1350,
    fonts,
    headers: {
      // Match the page's 5-min revalidate; let the CDN serve stale while refreshing.
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
