"use client";
import type { DashboardData } from "@/lib/types";
import { Header } from "./Header";
import { Tabs } from "./Tabs";
import { StandardTab } from "./StandardTab";
import { SpecialTab } from "./SpecialTab";

export function DashboardShell({ data, highlight }: { data: DashboardData; highlight?: string }) {
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
        <Tabs
          items={[
            { key: "standard", label: "🏆 Standard Awards", content: <StandardTab data={data} highlight={highlight} /> },
            { key: "special", label: "🏅 Special Awards", content: <SpecialTab data={data} /> },
            { key: "detailed", label: "📊 Detailed Standings", content: <div /> },
          ]}
        />
      </main>
    </>
  );
}
