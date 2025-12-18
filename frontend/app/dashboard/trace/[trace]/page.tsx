import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import TraceGraphServer from "@/components/TraceGraphServer";
import TraceOverviewClient from "./TraceOverviewClient";
import { getTrace } from "@/lib/api-server";

// Revalidate every 10 seconds
export const revalidate = 10;

export default async function TraceOverview({params,}: {params: Promise<{ trace: string }>;}) {
  const resolvedParams = await params;
  const traceId = resolvedParams.trace;

  // check trace's existence in database
  const trace = await getTrace(traceId.toString());
  if (!trace) {
    notFound();
  }

  // Get API key from cookie for WebSocket authentication
  // To set: document.cookie = "X-API-Key=YOUR_API_KEY; path=/; max-age=31536000"
  // Generate a key: cd backend && python3 create_test_api_key.py
  const cookieStore = cookies();
  const apiKey = (await cookieStore).get("X-API-Key")?.value ?? "";

  return (
    <TraceOverviewClient
      traceId={traceId}
      apiKey={apiKey}
    >
      {/* Existing graph rendering stays the same, just placed inside the client wrapper */}
      <TraceGraphServer traceId={traceId} />
    </TraceOverviewClient>
  );
}
