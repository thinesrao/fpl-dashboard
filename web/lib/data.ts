import { readFile } from "node:fs/promises";
import path from "node:path";
import { normalizeDashboard, type DashboardData } from "./types";

export async function loadDashboard(): Promise<DashboardData> {
  const url = process.env.NEXT_PUBLIC_DASHBOARD_URL;
  if (url) {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`Failed to load dashboard.json: ${res.status}`);
    return normalizeDashboard(await res.json());
  }
  const file = path.join(process.cwd(), "fixtures", "dashboard.sample.json");
  return normalizeDashboard(JSON.parse(await readFile(file, "utf-8")));
}
