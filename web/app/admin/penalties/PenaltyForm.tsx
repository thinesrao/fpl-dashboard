"use client";
import { PENALTY_TYPES } from "@/lib/penalties-schema";

export function PenaltyForm({
  players, action,
}: { players: string[]; action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[100px_1fr_180px_auto] sm:items-end">
      <label className="text-sm">
        <span className="mb-1 block text-[--muted]">Gameweek</span>
        <input name="gameweek" type="number" min={1} max={38} required aria-label="gameweek"
          className="w-full rounded-lg border border-[--line] bg-[--panel] px-3 py-2 text-[--ink]" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-[--muted]">Player</span>
        <input name="player_name" list="player-list" required aria-label="player" autoComplete="off"
          placeholder="Start typing…"
          className="w-full rounded-lg border border-[--line] bg-[--panel] px-3 py-2 text-[--ink]" />
        <datalist id="player-list">
          {players.map((p) => <option key={p} value={p} />)}
        </datalist>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-[--muted]">Event</span>
        <select name="event_type" aria-label="event" defaultValue="Penalty Scored"
          className="w-full rounded-lg border border-[--line] bg-[--panel] px-3 py-2 text-[--ink]">
          {PENALTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <button type="submit" className="rounded-lg bg-[--accent] px-4 py-2 font-semibold text-[#06231a]">
        Add
      </button>
    </form>
  );
}
