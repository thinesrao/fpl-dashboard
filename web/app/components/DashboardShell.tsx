"use client";
import { useState } from "react";
import type { DashboardData } from "@/lib/types";
import { getSheet } from "@/lib/types";
import { Header } from "./Header";
import { Tabs } from "./Tabs";
import { StandardTab } from "./StandardTab";
import { SpecialTab } from "./SpecialTab";
import { DetailedTab } from "./DetailedTab";
import { ManagerSelect } from "./ManagerSelect";

export function DashboardShell({ data }: { data: DashboardData }) {
  const [highlight, setHighlight] = useState("");
  const managers = getSheet(data, "classic_league_standings").map((r) => String(r.Manager ?? ""));
  return (
    <>
      <Header gameweek={data.meta.lastFinishedGw} lastUpdated={data.meta.lastUpdatedUtc} />
      <main className="mx-auto max-w-5xl px-5 pb-16">
        <section className="pb-2 pt-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[--accent]">
            Mini-League · Pep&apos;s Roulette
          </p>
          <h1 className="font-display mt-2 text-3xl">The race, in full.</h1>
          <p className="mt-1 text-xs text-[--muted]">
            Awards final to Gameweek {data.meta.lastFinishedGw}
          </p>
        </section>
        <ManagerSelect managers={managers} value={highlight} onChange={setHighlight} />
        <Tabs
          items={[
            { key: "standard", label: "🏆 Standard Awards", content: <StandardTab data={data} highlight={highlight || undefined} /> },
            { key: "special", label: "🏅 Special Awards", content: <SpecialTab data={data} /> },
            { key: "detailed", label: "📊 Detailed Standings", content: <DetailedTab data={data} highlight={highlight || undefined} /> },
          ]}
        />
      </main>
    </>
  );
}
