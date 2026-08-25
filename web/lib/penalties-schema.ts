import { z } from "zod";

export const PENALTY_TYPES = ["Penalty Scored", "Penalty Won", "Penalty Missed", "Penalty Saved"] as const;
export type PenaltyType = (typeof PENALTY_TYPES)[number];

export const penaltyEventSchema = z.object({
  gameweek: z.coerce.number().int().min(1).max(38),
  player_name: z.string().min(1),
  event_type: z.enum(PENALTY_TYPES),
});

export type PenaltyEvent = {
  id: string;
  gameweek: number;
  player_name: string;
  event_type: PenaltyType;
};
