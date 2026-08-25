import { loadDashboard } from "@/lib/data";
import { DashboardShell } from "./components/DashboardShell";

export const revalidate = 300;

export default async function Page() {
  const data = await loadDashboard();
  return <DashboardShell data={data} />;
}
