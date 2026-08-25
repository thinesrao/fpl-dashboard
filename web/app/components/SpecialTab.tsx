"use client";
import type { DashboardData } from "@/lib/types";
import { getSheet } from "@/lib/types";
import { awardLeader } from "@/lib/transforms";
import { SPECIAL_AWARDS } from "@/lib/awards";
import { AwardCard } from "./AwardCard";

export function SpecialTab({ data }: { data: DashboardData }) {
  const cards = SPECIAL_AWARDS.map((a) => ({ ...a, leader: awardLeader(getSheet(data, a.key)) }))
    .filter((a) => a.leader !== null);
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((a) => (
        <AwardCard key={a.key} title={a.title} suffix={a.suffix} leader={a.leader} />
      ))}
    </div>
  );
}
