import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { loadDashboard } from "@/lib/data";
import { highlightModel, type HighlightModel } from "@/lib/highlight";

// Node runtime: we read bundled font/logo files and reuse loadDashboard's fs path.
export const runtime = "nodejs";

// PepRoulette palette (kept in sync with globals.css).
const C = {
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
const TILE_COLORS = [C.gold, C.cyan, C.lime, C.pink];

// Resolve from process.cwd() (the function root on Vercel) — the same pattern
// lib/data.ts uses for its bundled fixture, and exactly where
// outputFileTracingIncludes (next.config.ts) places these files. A relative
// import.meta.url path would resolve inside .next/server and 500 in prod.
const asset = (rel: string) => path.join(process.cwd(), rel);

async function loadAssets() {
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

function Podium({ podium }: { podium: HighlightModel["podium"] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}>
      {podium.map((p) => {
        const first = p.rank === 1;
        return (
          <div
            key={p.rank}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "20px 26px",
              borderRadius: 20,
              border: `2px solid ${first ? "rgba(255,210,63,0.45)" : C.line}`,
              background: first ? "rgba(255,210,63,0.10)" : "rgba(255,255,255,0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "Anton",
                fontSize: 34,
                width: 44,
                color: first ? C.gold : C.muted,
              }}
            >
              {p.rank}
            </div>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: C.ink }}>
              {p.manager}
            </div>
            <div
              style={{
                display: "flex",
                marginLeft: "auto",
                fontFamily: "Fredoka",
                fontWeight: 700,
                fontSize: 38,
                color: first ? C.gold : C.ink,
              }}
            >
              {p.points}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Tiles({ tiles }: { tiles: HighlightModel["tiles"] }) {
  // Satori has no CSS grid — lay the 4 tiles out as two flex rows of two.
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
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: C.muted,
                }}
              >
                {t.label}
              </div>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, marginTop: 12, color: C.ink }}>
                {t.name}
              </div>
              <div
                style={{
                  display: "flex",
                  fontFamily: "Fredoka",
                  fontWeight: 700,
                  fontSize: 60,
                  marginTop: 6,
                  color: TILE_COLORS[(ri * 2 + ci) % TILE_COLORS.length],
                }}
              >
                {t.value}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Card({ m, logoSrc }: { m: HighlightModel; logoSrc: string }) {
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
        background: "linear-gradient(160deg, #161320 0%, #0b0912 72%)",
      }}
    >
      <BrandRow logoSrc={logoSrc} gameweek={m.gameweek} />

      <div style={{ display: "flex", fontSize: 22, fontWeight: 800, letterSpacing: 6, color: C.muted, marginTop: 44 }}>
        HIGHLIGHT OF THE WEEK
      </div>

      {m.headline ? (
        <div style={{ display: "flex", flexDirection: "column", marginTop: 10 }}>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 104, lineHeight: 0.92, color: C.ink }}>
            {m.headline.manager}
          </div>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 104, lineHeight: 0.92, color: C.pink }}>
            {m.headline.line}.
          </div>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 34, color: C.lime, marginTop: 18 }}>
            {m.headline.points} PTS — MANAGER OF THE WEEK
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", fontFamily: "Anton", fontSize: 72, marginTop: 12, color: C.ink }}>
          Highlights land after GW1
        </div>
      )}

      {m.podium.length > 0 && (
        <div style={{ display: "flex", marginTop: 40 }}>
          <Podium podium={m.podium} />
        </div>
      )}

      {m.tiles.length > 0 && (
        <div style={{ display: "flex", marginTop: 20 }}>
          <Tiles tiles={m.tiles} />
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", marginTop: "auto", fontSize: 22, color: C.muted }}>
        <span style={{ color: C.soft, fontWeight: 700 }}>peproulette.vercel.app</span>
      </div>
    </div>
  );
}

export async function GET() {
  const [data, { fonts, logoSrc }] = await Promise.all([loadDashboard(), loadAssets()]);
  const model = highlightModel(data);

  return new ImageResponse(<Card m={model} logoSrc={logoSrc} />, {
    width: 1080,
    height: 1350,
    fonts,
    headers: {
      // Match the page's 5-min revalidate; let the CDN serve stale while refreshing.
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
