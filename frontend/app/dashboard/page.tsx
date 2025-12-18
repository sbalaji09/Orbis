import { getAgents, getTraces } from "@/lib/api-server";
import DashboardClient from "./DashboardClient";

// Revalidate every 10 seconds
export const revalidate = 10;

export default async function Dashboard() {
  try {
    const [agents, traces] = await Promise.all([getAgents(), getTraces()]);
    return <DashboardClient initialAgents={agents} initialTraces={traces} />;
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    // Return empty arrays if fetch fails (user might not be authenticated yet)
    return <DashboardClient initialAgents={[]} initialTraces={[]} />;
  }
}
