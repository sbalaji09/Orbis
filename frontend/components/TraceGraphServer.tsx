import { getTraceSpans } from "@/lib/api-server";
import TraceGraphClient from "./TraceGraphClient";

// Revalidate every 10 seconds
export const revalidate = 10;

export default async function TraceGraph({ traceId }: { traceId: string }) {
  const spans = await getTraceSpans(traceId);

  if (spans.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-muted/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
          <p className="text-sm text-muted font-medium">
            No spans found for this trace
          </p>
        </div>
      </div>
    );
  }

  return <TraceGraphClient spans={spans} />;
}
