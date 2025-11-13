import { notFound } from "next/navigation";
import TraceGraph from "@/components/TraceGraph";
import { isValidTraceId } from "@/lib/traceUtils";

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

  // Check if trace ID exists in our data (will query DB in production)
  if (!isValidTraceId(traceId)) {
    notFound();
  }

  return <TraceGraph traceId={traceId} />;
}
