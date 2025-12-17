import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getSpan,
  getPromptVersions,
  getPromptAnalytics,
} from "@/lib/api-server";
import SpanDetailClient from "./SpanDetailClient";

export default async function SpanDetailPage({
  params,
}: {
  params: Promise<{ spanId: string }>;
}) {
  const { spanId } = await params;
  const span = await getSpan(spanId);

  if (!span) {
    notFound();
  }

  // Fetch prompt versions and analytics server-side if prompt_name exists
  let initialVersions = [];
  let initialAnalytics = [];
  if (span.prompt_name) {
    [initialVersions, initialAnalytics] = await Promise.all([
      getPromptVersions(span.prompt_name),
      getPromptAnalytics(span.prompt_name),
    ]);
  }

  const statusConfig = {
    success: { bg: "bg-emerald-50", text: "text-success", dot: "bg-success" },
    error: { bg: "bg-red-50", text: "text-error", dot: "bg-error" },
    running: { bg: "bg-sky-50", text: "text-babyblue", dot: "bg-babyblue" },
    pending: { bg: "bg-amber-50", text: "text-warning", dot: "bg-warning" },
    cancelled: { bg: "bg-gray-50", text: "text-muted", dot: "bg-muted" },
  };

  const status = statusConfig[span.status as keyof typeof statusConfig] || {
    bg: "bg-gray-50",
    text: "text-muted",
    dot: "bg-muted",
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Link
            href={`/dashboard/trace/${span.trace_id}`}
            className="inline-flex items-center gap-1 text-xs text-black/40 hover:text-babyblue transition-colors"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Trace
          </Link>
        </div>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              {span.name || "Span Details"}
            </h1>
            {span.llm_model && (
              <p className="text-sm text-black/60 font-medium">
                {span.llm_model}
              </p>
            )}
          </div>
          <div
            className={`flex items-center gap-1.5 px-4 py-2 border-2 ${
              status.bg
            } ${status.dot.replace(
              "bg-",
              "border-"
            )} shrink-0 transition-transform duration-200`}
          >
            <div className={`w-2 h-2 ${status.dot}`} />
            <span
              className={`text-sm font-bold uppercase tracking-wide ${status.text}`}
            >
              {span.status}
            </span>
          </div>
        </div>

        {/* Client component with tabs and interactivity */}
        <SpanDetailClient
          initialSpan={span}
          initialVersions={initialVersions}
          initialAnalytics={initialAnalytics}
        />
      </div>
    </div>
  );
}
