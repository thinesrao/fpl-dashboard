import { readFile } from "node:fs/promises";
import path from "node:path";
import type { HighlightModel, Hero } from "./highlight";

// Shared building blocks for the gameweek-highlight image, rendered by Satori
// (next/og) in two compositions: a 1080×1350 portrait for the share/download
// button, and a 1200×630 landscape for link-preview (opengraph) unfurls.

// PepRoulette palette (kept in sync with globals.css).
export const C = {
  ink: "#ffffff",
  muted: "#8f8aa3",
  soft: "#c8c4d6",
  line: "#231f30",
  pink: "#ff2e93",
  lime: "#c6ff00",
  gold: "#ffd23f",
  cyan: "#4ad9ff",
  purple: "#9b5cff",
};
// Per-competition accent: Classic = lime, Challenge = cyan.
const COMP_COLOR: Record<string, string> = { Classic: C.lime, Challenge: C.cyan };
const TILE_COLORS = [C.pink, C.gold, C.purple, C.cyan];

const BG = "linear-gradient(160deg, #161320 0%, #0b0912 72%)";

// Resolve from process.cwd() (the function root on Vercel) — the same pattern
// lib/data.ts uses for its bundled fixture, and exactly where
// outputFileTracingIncludes (next.config.ts) places these files. A relative
// import.meta.url path would resolve inside .next/server and 500 in prod.
const asset = (rel: string) => path.join(process.cwd(), rel);

/** Read the bundled TTFs + logo. Returns the `fonts` array next/og expects and
 * the logo as a data-URI (embedded so the image is self-contained). */
export async function loadHighlightAssets() {
  const [anton, interReg, interBold, interX, fredoka, logo] = await Promise.all([
    readFile(asset("assets/fonts/Anton-Regular.ttf")),
    readFile(asset("assets/fonts/Inter-Regular.ttf")),
    readFile(asset("assets/fonts/Inter-Bold.ttf")),
    readFile(asset("assets/fonts/Inter-ExtraBold.ttf")),
    readFile(asset("assets/fonts/Fredoka-Bold.ttf")),
    readFile(asset("public/logo-mark.png")),
  ]);
  const fonts = [
    { name: "Anton", data: anton, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: interReg, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: interBold, weight: 700 as const, style: "normal" as const },
    { name: "Inter", data: interX, weight: 800 as const, style: "normal" as const },
    { name: "Fredoka", data: fredoka, weight: 700 as const, style: "normal" as const },
  ];
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  return { fonts, logoSrc };
}

function BrandRow({ logoSrc, gameweek }: { logoSrc: string; gameweek: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
      <img src={logoSrc} width={57} height={72} style={{ marginRight: 20 }} alt="" />
      <div style={{ display: "flex", fontFamily: "Anton", fontSize: 40, letterSpacing: 1 }}>
        <span style={{ color: C.ink }}>PEP</span>
        <span style={{ color: C.pink }}>ROULETTE</span>
      </div>
      <div style={{ display: "flex", marginLeft: "auto" }}>
        <div
          style={{
            display: "flex",
            fontFamily: "Anton",
            fontSize: 30,
            color: C.lime,
            border: `2px solid rgba(198,255,0,0.4)`,
            background: "rgba(198,255,0,0.10)",
            borderRadius: 999,
            padding: "8px 22px",
            letterSpacing: 2,
          }}
        >
          GW {gameweek}
        </div>
      </div>
    </div>
  );
}

/** One Manager-of-the-Week hero block. `nameSize` scales the name to the layout
 * (larger in portrait, smaller side-by-side in landscape). */
function HeroBlock({ hero, nameSize }: { hero: Hero; nameSize: number }) {
  const color = COMP_COLOR[hero.competition] ?? C.lime;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", fontSize: 20, fontWeight: 800, letterSpacing: 4, color }}>
        {hero.competition.toUpperCase()} · MANAGER OF THE WEEK
      </div>
      <div style={{ display: "flex", fontFamily: "Anton", fontSize: nameSize, lineHeight: 0.98, color: C.ink, marginTop: 8 }}>
        {hero.manager}
      </div>
      <div style={{ display: "flex", fontFamily: "Anton", fontSize: Math.round(nameSize * 0.4), color, marginTop: 6 }}>
        {hero.points} PTS
      </div>
    </div>
  );
}

function TalkingTiles({ tiles }: { tiles: HighlightModel["tiles"] }) {
  // Satori has no CSS grid — lay tiles out as flex rows of two.
  const rows = [tiles.slice(0, 2), tiles.slice(2, 4)].filter((r) => r.length > 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: "flex", gap: 14, width: "100%" }}>
          {row.map((t, ci) => (
            <div
              key={t.label}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                padding: "22px 24px",
                borderRadius: 20,
                border: `2px solid ${C.line}`,
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ display: "flex", fontSize: 19, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: C.muted }}>
                {t.label}
              </div>
              <div style={{ display: "flex", fontSize: 28, fontWeight: 700, marginTop: 10, color: C.ink }}>{t.name}</div>
              <div style={{ display: "flex", fontSize: 24, fontWeight: 700, marginTop: 6, color: TILE_COLORS[(ri * 2 + ci) % TILE_COLORS.length] }}>
                {t.detail}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Portrait 1080×1350 — the shareable/downloadable card (full detail). */
export function PortraitCard({ m, logoSrc }: { m: HighlightModel; logoSrc: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: 72,
        color: C.ink,
        fontFamily: "Inter",
        background: BG,
      }}
    >
      <BrandRow logoSrc={logoSrc} gameweek={m.gameweek} />

      {/* Center the content group between the brand row and footer so the space
          is balanced rather than pooling in one big gap. */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: 56 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 22, fontWeight: 800, letterSpacing: 6, color: C.muted, marginBottom: 24 }}>
            MANAGERS OF THE WEEK
          </div>
          {m.heroes.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
              {m.heroes.map((h) => (
                <HeroBlock key={h.competition} hero={h} nameSize={76} />
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", fontFamily: "Anton", fontSize: 72, color: C.ink }}>
              Highlights land after GW1
            </div>
          )}
        </div>

        {m.tiles.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 22, fontWeight: 800, letterSpacing: 6, color: C.muted, marginBottom: 18 }}>
              TALKING POINTS
            </div>
            <TalkingTiles tiles={m.tiles} />
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", fontSize: 22, color: C.muted }}>
        <span style={{ color: C.soft, fontWeight: 700 }}>peproulette.vercel.app</span>
      </div>
    </div>
  );
}

/** Landscape 1200×630 — the link-preview (opengraph) unfurl: the two Managers
 * of the Week side by side. Tiles are dropped so it stays legible small. */
export function LandscapeCard({ m, logoSrc }: { m: HighlightModel; logoSrc: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: 56,
        color: C.ink,
        fontFamily: "Inter",
        background: BG,
      }}
    >
      <BrandRow logoSrc={logoSrc} gameweek={m.gameweek} />

      {m.heroes.length > 0 ? (
        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 48 }}>
          {m.heroes.map((h) => (
            <div key={h.competition} style={{ display: "flex", flex: 1 }}>
              <HeroBlock hero={h} nameSize={56} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flex: 1, alignItems: "center", fontFamily: "Anton", fontSize: 52, color: C.ink }}>
          Highlights land after GW1
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", fontSize: 20, color: C.muted }}>
        <span style={{ color: C.soft, fontWeight: 700 }}>peproulette.vercel.app</span>
      </div>
    </div>
  );
}
