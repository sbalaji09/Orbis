import { getAgents, getTraces } from "@/lib/api-server";
import DashboardClient from "./DashboardClient";

// Revalidate every 10 seconds
export const revalidate = 10;

export default async function Dashboard() {
  const [agents, traces] = await Promise.all([getAgents(), getTraces()]);

  return (
    <DashboardClient initialAgents={agents} initialTraces={traces} />
  );
}
