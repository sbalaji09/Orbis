import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getSpan,
  getPromptVersions,
  getPromptAnalytics,
} from "@/lib/api-server";
import { getSpanTypeConfig } from "@/lib/span-type-config";
import { Bot, Globe, Terminal, Wrench, Zap } from "lucide-react";
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
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-2">
              {(() => {
                const typeConfig = getSpanTypeConfig(span.span_type);
                const IconComponent =
                  span.span_type === "llm"
                    ? Bot
                    : span.span_type === "http"
                    ? Globe
                    : span.span_type === "cli"
                    ? Terminal
                    : span.span_type === "tool"
                    ? Wrench
                    : Zap;

                return (
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 ${typeConfig.color} ${typeConfig.textColor} border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,0.1)]`}
                  >
                    <IconComponent className="w-4 h-4 shrink-0" />
                    <span className="font-bold text-xs uppercase tracking-wide whitespace-nowrap">
                      {typeConfig.label}
                    </span>
                  </div>
                );
              })()}
              <div className="h-8 w-px bg-black/20 shrink-0" />
              <h1 className="text-3xl font-bold tracking-tight leading-none">
                {span.name || "Span Details"}
              </h1>
            </div>
            {span.llm_model && (
              <p className="text-sm text-black/60 font-medium ml-30">
                {span.llm_model}
              </p>
            )}
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 border-2 ${
              status.bg
            } ${status.dot.replace("bg-", "border-")} shrink-0 self-start`}
          >
            <div className={`w-2 h-2 ${status.dot}`} />
            <span
              className={`text-xs font-bold uppercase tracking-wide ${status.text}`}
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
