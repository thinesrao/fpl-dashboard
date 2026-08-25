import { loadDashboard } from "./data";
import { getSheet } from "./types";

export async function listPlayerNames(): Promise<string[]> {
  const data = await loadDashboard();
  const rows = getSheet(data, "_player_names");
  return rows
    .map((r) => String(r.Player_Name ?? ""))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}
