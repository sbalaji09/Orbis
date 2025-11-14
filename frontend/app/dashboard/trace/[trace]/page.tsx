import { notFound } from "next/navigation";
import TraceGraphServer from "@/components/TraceGraphServer";
import { getTrace } from "@/lib/api-server";

// Force dynamic rendering - no static generation
export const dynamic = "force-dynamic";

export default async function TraceOverview({
  params,
}: {
  params: Promise<{ trace: string }>;
}) {
  const resolvedParams = await params;
  const traceId = parseInt(resolvedParams.trace, 10);

  // Check if trace ID is a valid number
  if (isNaN(traceId)) {
    notFound();
  }

  // Check if trace exists in database
  const trace = await getTrace(traceId.toString());
  if (!trace) {
    notFound();
  }

  return <TraceGraphServer traceId={traceId} />;
}
