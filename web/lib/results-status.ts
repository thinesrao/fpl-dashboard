import type { DashboardMeta } from "./types";

export type ResultsStatus = {
  /** True only when the shown gameweek is fully settled AND penalties reviewed. */
  final: boolean;
  label: string;
  detail: string;
};

/**
 * Whether the currently shown results are the true, final numbers. Final needs
 * both: FPL bonus points settled (data_checked) AND the admin having confirmed
 * manual penalties through the shown gameweek. Otherwise it's provisional, with
 * a short reason for what's still pending.
 */
export function resultsStatus(meta: DashboardMeta): ResultsStatus {
  const bonusIn = meta.lastFinishedGwDataChecked === true;
  const reviewedThroughGw = meta.penaltiesReviewedThroughGw ?? 0;
  const penaltiesIn = meta.lastFinishedGw > 0 && reviewedThroughGw >= meta.lastFinishedGw;

  if (bonusIn && penaltiesIn) {
    return { final: true, label: "Final result", detail: "Bonus & penalties confirmed" };
  }
  const detail = !bonusIn ? "Bonus points pending" : "Penalty review pending";
  return { final: false, label: "Provisional", detail };
}
