import type { z } from "zod";
import { createClient } from "./supabase/server";
import { penaltyEventSchema, type PenaltyEvent } from "./penalties-schema";

export { PENALTY_TYPES, penaltyEventSchema } from "./penalties-schema";
export type { PenaltyType, PenaltyEvent } from "./penalties-schema";

const TABLE = "manual_penalty_events";

export async function listPenaltyEvents(): Promise<PenaltyEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, gameweek, player_name, event_type")
    .order("gameweek", { ascending: false })
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PenaltyEvent[];
}

export async function addPenaltyEvent(input: z.infer<typeof penaltyEventSchema>): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).insert(input);
  if (error) throw new Error(error.message);
}

export async function deletePenaltyEvent(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
