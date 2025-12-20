import { getCostTrends, getCostByAgent, getCostByModel } from "@/lib/api-server";
import CostDashboardClient from "./CostDashboardClient";

export const revalidate = 30;

export default async function CostDashboard() {
  try {
    const [trends, byAgent, byModel] = await Promise.all([
      getCostTrends(30),
      getCostByAgent(),
      getCostByModel(),
    ]);

    return (
      <CostDashboardClient
        initialTrends={trends}
        initialByAgent={byAgent}
        initialByModel={byModel}
      />
    );
  } catch (error) {
    console.error("Failed to fetch cost dashboard data:", error);
    return (
      <CostDashboardClient
        initialTrends={[]}
        initialByAgent={[]}
        initialByModel={[]}
      />
    );
  }
}
