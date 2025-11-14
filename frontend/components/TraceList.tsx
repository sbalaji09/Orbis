import { getAgents, getTraces } from "@/lib/api-server";
import { TraceListClient } from "./TraceListClient";

export default async function TraceList() {
  // Fetch data on server
  const [agents, traces] = await Promise.all([getAgents(), getTraces()]);

  return <TraceListClient agents={agents} traces={traces} />;
}
