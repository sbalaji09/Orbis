import { getAgents, getTraces } from "@/lib/api-server";
import { TraceListClient } from "./TraceListClient";

// Revalidate every 10 seconds
export const revalidate = 10;

export default async function TraceList() {
  // Fetch data on server
  const [agents, traces] = await Promise.all([getAgents(), getTraces()]);

  return <TraceListClient agents={agents} traces={traces} />;
}
