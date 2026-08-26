"use client";
import { useState } from "react";
import type { DashboardData } from "@/lib/types";
import { verdict, talkingPoints } from "@/lib/story";
import { Header } from "./Header";
import { LiveSection } from "./LiveSection";
import { OverlayProvider } from "./OverlayContext";
import { VerdictHero } from "./VerdictHero";
import { TalkingPoints } from "./TalkingPoints";
import { RaceBoard } from "./RaceBoard";
import { TrophyCabinet } from "./TrophyCabinet";
import { HallOfFame } from "./HallOfFame";
import { ManagerProfile } from "./ManagerProfile";
import { TrophyDetail } from "./TrophyDetail";

export function DashboardShell({ data }: { data: DashboardData }) {
  const [openManagerName, setOpenManagerName] = useState<string | null>(null);
  const [openTrophyKey, setOpenTrophyKey] = useState<string | null>(null);

  return (
    <OverlayProvider value={{ openManager: setOpenManagerName, openTrophy: setOpenTrophyKey }}>
      <Header gameweek={data.meta.lastFinishedGw} lastUpdated={data.meta.lastUpdatedUtc} />
      <main className="mx-auto max-w-5xl px-5 pb-16">
        <LiveSection />
        <VerdictHero v={verdict(data)} gameweek={data.meta.lastFinishedGw} />

        <section className="pb-8">
          <h2 className="font-display mb-4 text-[13px] uppercase tracking-[0.2em] text-[--muted]">
            The talking points
          </h2>
          <TalkingPoints tp={talkingPoints(data)} />
        </section>

        <section className="pb-8">
          <RaceBoard data={data} />
        </section>

        <section className="pb-8">
          <TrophyCabinet data={data} />
        </section>

        <section className="pb-8">
          <HallOfFame data={data} />
        </section>
      </main>

      {openManagerName && (
        <ManagerProfile data={data} name={openManagerName} onClose={() => setOpenManagerName(null)} />
      )}
      {openTrophyKey && (
        <TrophyDetail data={data} trophyKey={openTrophyKey} onClose={() => setOpenTrophyKey(null)} />
      )}
    </OverlayProvider>
  );
}
