import { ImageResponse } from "next/og";
import { loadDashboard } from "@/lib/data";
import { highlightModel } from "@/lib/highlight";
import { loadHighlightAssets, LandscapeCard } from "@/lib/highlight-card";

// The link-preview image (WhatsApp/Twitter/Slack unfurls). Same highlight
// render as the shareable card, in a landscape 1200×630 crop. Node runtime for
// the bundled font/logo reads; regenerated every 5 min to track live data.
export const runtime = "nodejs";
export const revalidate = 300;

export const alt = "PepRoulette — gameweek highlight";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const [data, { fonts, logoSrc }] = await Promise.all([loadDashboard(), loadHighlightAssets()]);
  const model = highlightModel(data);

  return new ImageResponse(<LandscapeCard m={model} logoSrc={logoSrc} />, {
    ...size,
    fonts,
  });
}
