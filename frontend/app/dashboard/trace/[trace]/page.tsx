import { notFound } from "next/navigation";
import TraceGraphServer from "@/components/TraceGraphServer";
import { getTrace } from "@/lib/api-server";

// Revalidate every 10 seconds
export const revalidate = 10;

export default async function TraceOverview({
  params,
}: {
  params: Promise<{ trace: string }>;
}) {
  const resolvedParams = await params;
  const traceId = resolvedParams.trace;

  // Check if trace exists in database
  const trace = await getTrace(traceId.toString());
  if (!trace) {
    notFound();
  }

  return <TraceGraphServer traceId={traceId} />;
}
