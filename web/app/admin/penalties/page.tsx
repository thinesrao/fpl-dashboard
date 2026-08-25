import { listPenaltyEvents } from "@/lib/penalties";
import { listPlayerNames } from "@/lib/players";
import { addPenaltyAction, deletePenaltyAction } from "./actions";
import { PenaltyForm } from "./PenaltyForm";
import { PublishButton } from "../PublishButton";

export const dynamic = "force-dynamic";

export default async function PenaltiesPage() {
  const [events, players] = await Promise.all([listPenaltyEvents(), listPlayerNames()]);
  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl">Penalty events</h1>
        <PublishButton />
      </div>
      <div className="mb-8 rounded-2xl border border-[--line] bg-[--panel] p-4">
        <PenaltyForm players={players} action={addPenaltyAction} />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[--muted]">
            <th className="py-2">GW</th><th>Player</th><th>Event</th><th></th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="border-t border-[--line]">
              <td className="py-2">{e.gameweek}</td>
              <td>{e.player_name}</td>
              <td>{e.event_type}</td>
              <td className="text-right">
                <form action={deletePenaltyAction}>
                  <input type="hidden" name="id" value={e.id} />
                  <button className="text-[--muted] hover:text-[--live]">Delete</button>
                </form>
              </td>
            </tr>
          ))}
          {events.length === 0 && (
            <tr><td colSpan={4} className="py-4 text-[--muted]">No penalty events yet.</td></tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
