import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import TraceGraphServer from "@/components/TraceGraphServer";
import TraceOverviewClient from "./TraceOverviewClient";
import { getTrace } from "@/lib/api-server";

// TODO: In production, get from auth/session
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

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

  const cookieStore = cookies();
  const apiKey = (await cookieStore).get("X-User-ID")?.value ?? DEFAULT_USER_ID;

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
