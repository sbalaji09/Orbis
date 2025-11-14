import { getTraceSpans } from "@/lib/api-server";
import TraceGraphClient from "./TraceGraphClient";

export default async function TraceGraph({ traceId }: { traceId: number }) {
  const spans = await getTraceSpans(traceId.toString());

  if (spans.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-foreground/60">No spans found for this trace</p>
        </div>
      </div>
    );
  }

  return <TraceGraphClient spans={spans} />;
}
