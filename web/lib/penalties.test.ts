import { penaltyEventSchema, PENALTY_TYPES } from "@/lib/penalties-schema";

test("penaltyEventSchema accepts a valid event", () => {
  const ok = penaltyEventSchema.safeParse({
    gameweek: 3, player_name: "A.Becker (Liverpool)", event_type: "Penalty Scored",
  });
  expect(ok.success).toBe(true);
});

test("penaltyEventSchema rejects bad gameweek and unknown event_type", () => {
  expect(penaltyEventSchema.safeParse({ gameweek: 0, player_name: "X", event_type: "Penalty Scored" }).success).toBe(false);
  expect(penaltyEventSchema.safeParse({ gameweek: 3, player_name: "X", event_type: "Goal" }).success).toBe(false);
});

test("PENALTY_TYPES matches the pipeline vocabulary", () => {
  expect(PENALTY_TYPES).toEqual(["Penalty Scored", "Penalty Won", "Penalty Missed", "Penalty Saved"]);
});
