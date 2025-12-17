import { Span } from "@/lib/types";
import { getSpanTypeConfig } from "@/lib/span-type-config";

function Skeleton({
  width = "w-20",
  height = "h-4",
}: {
  width?: string;
  height?: string;
}) {
  return (
    <div className={`${width} ${height} bg-gray-200 animate-pulse rounded`} />
  );
}

function formatDuration(duration: number | null): string {
  if (duration === null) return "N/A";
  if (duration < 1) return `${duration.toFixed(2)}ms`;
  if (duration < 1000) return `${duration.toFixed(0)}ms`;
  return `${(duration / 1000).toFixed(3)}s`;
}

function formatCost(cost: number | null): string {
  if (cost === null) return "N/A";
  return `$${cost.toFixed(4)}`;
}

function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return new Date(date.toString() + "Z").toLocaleString();
}

interface SpanDetailsProps {
  span: Span;
}

export default function SpanDetails({ span: currentSpan }: SpanDetailsProps) {
  return (
    <div className="space-y-5 bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.15)] p-6">
      {/* Prompt Versioning Information */}
      {(currentSpan.prompt_id ||
        currentSpan.prompt_version ||
        currentSpan.prompt_hash) && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-black/40 uppercase tracking-wide">
            {`/* Prompt Version */`}
          </h4>
          <div className="p-3 bg-white border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
            <div className="space-y-2 text-xs">
              {currentSpan.prompt_id && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-black/60 uppercase tracking-wide text-[10px] w-14 shrink-0">
                    ID
                  </span>
                  <span className="font-mono text-foreground">
                    {currentSpan.prompt_id}
                  </span>
                </div>
              )}

              {currentSpan.prompt_name && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-black/60 uppercase tracking-wide text-[10px] w-14 shrink-0">
                    Name
                  </span>
                  <span className="font-mono text-foreground">
                    {currentSpan.prompt_name}
                  </span>
                </div>
              )}

              {currentSpan.prompt_version && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-black/60 uppercase tracking-wide text-[10px] w-14 shrink-0">
                    Ver
                  </span>
                  <span className="font-mono text-foreground">
                    {currentSpan.prompt_version}
                  </span>
                </div>
              )}

              {currentSpan.prompt_hash && (
                <div className="flex items-start gap-2 pt-2 border-t-2 border-black/10">
                  <span className="font-medium text-black/60 uppercase tracking-wide text-[10px] w-14 shrink-0">
                    Hash
                  </span>
                  <span className="font-mono text-muted break-all text-[10px] leading-relaxed">
                    {currentSpan.prompt_hash}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Span Type Info */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-black/40 uppercase tracking-wide">
          {`/* Span Type */`}
        </h4>
        {(() => {
          const typeConfig = getSpanTypeConfig(currentSpan.span_type);
          return (
            <div
              className={`inline-flex items-center gap-2 px-3 py-2 ${typeConfig.color} ${typeConfig.textColor} border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,0.1)]`}
            >
              <span className="text-lg">{typeConfig.icon}</span>
              <span className="font-bold">{typeConfig.label}</span>
            </div>
          );
        })()}

        {/* HTTP-specific details */}
        {currentSpan.span_type === "http" && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            {currentSpan.http_method && (
              <div className="flex flex-col gap-1 p-3 bg-white border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
                <span className="text-[10px] font-medium text-black/60 uppercase">
                  Method
                </span>
                <span className="font-mono font-bold">
                  {currentSpan.http_method}
                </span>
              </div>
            )}
            {currentSpan.http_status_code && (
              <div className="flex flex-col gap-1 p-3 bg-white border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
                <span className="text-[10px] font-medium text-black/60 uppercase">
                  Status
                </span>
                <span
                  className={`font-mono font-bold ${
                    currentSpan.http_status_code >= 400
                      ? "text-error"
                      : "text-success"
                  }`}
                >
                  {currentSpan.http_status_code}
                </span>
              </div>
            )}
            {currentSpan.http_url && (
              <div className="col-span-2 flex flex-col gap-1 p-3 bg-white border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
                <span className="text-[10px] font-medium text-black/60 uppercase">
                  URL
                </span>
                <span className="font-mono text-xs break-all">
                  {currentSpan.http_url}
                </span>
              </div>
            )}
          </div>
        )}

        {/* CLI-specific details */}
        {currentSpan.span_type === "cli" && (
          <div className="space-y-3 mt-3">
            {currentSpan.cli_command && (
              <div className="flex flex-col gap-1 p-3 bg-black border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
                <span className="text-[10px] font-medium text-white/60 uppercase">
                  Command
                </span>
                <code className="font-mono text-xs text-green-400 break-all">
                  {currentSpan.cli_command}
                </code>
              </div>
            )}
            {currentSpan.cli_exit_code !== null &&
              currentSpan.cli_exit_code !== undefined && (
                <div className="flex flex-col gap-1 p-3 bg-white border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,0.1)] w-fit">
                  <span className="text-[10px] font-medium text-black/60 uppercase">
                    Exit Code
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      currentSpan.cli_exit_code === 0
                        ? "text-success"
                        : "text-error"
                    }`}
                  >
                    {currentSpan.cli_exit_code}
                  </span>
                </div>
              )}
          </div>
        )}

        {/* Tool-specific details */}
        {currentSpan.span_type === "tool" && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            {currentSpan.tool_name && (
              <div className="flex flex-col gap-1 p-3 bg-white border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
                <span className="text-[10px] font-medium text-black/60 uppercase">
                  Tool Name
                </span>
                <span className="font-mono font-semibold">
                  {currentSpan.tool_name}
                </span>
              </div>
            )}
            {currentSpan.tool_category && (
              <div className="flex flex-col gap-1 p-3 bg-white border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
                <span className="text-[10px] font-medium text-black/60 uppercase">
                  Category
                </span>
                <span className="font-mono">{currentSpan.tool_category}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timing Information */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-black/40 uppercase tracking-wide">
          {`/* Performance */`}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 p-3 bg-white border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
            <span className="text-[10px] font-medium text-black/60 uppercase tracking-wide">
              Duration
            </span>
            <span className="text-lg font-mono">
              {currentSpan.duration !== null ? (
                formatDuration(currentSpan.duration)
              ) : (
                <Skeleton width="w-16" height="h-6" />
              )}
            </span>
          </div>
          <div className="flex flex-col gap-1 p-3 bg-mustard/10 border-2 border-mustard shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
            <span className="text-[10px] font-medium text-black/60 uppercase tracking-wide">
              Cost
            </span>
            <span className="text-lg text-mustard font-mono">
              {currentSpan.cost !== null ? (
                formatCost(currentSpan.cost)
              ) : (
                <Skeleton width="w-16" height="h-6" />
              )}
            </span>
          </div>
        </div>
        <div className="text-[11px] text-black/60 space-y-1 pt-2 border-t-2 border-black/10">
          <div className="flex items-center gap-2">
            <span className="font-medium w-14">{`// Start`}</span>
            <span className="font-mono">
              {formatDate(currentSpan.start_time)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium w-14">{`// End`}</span>
            <span className="font-mono">
              {currentSpan.end_time ? (
                formatDate(currentSpan.end_time)
              ) : (
                <Skeleton width="w-32" height="h-4" />
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Streaming Metrics */}
      {currentSpan.is_streaming && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-black/40 uppercase tracking-wide">
            {`/* Streaming Metrics */`}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 p-3 bg-success/10 border-2 border-success shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
              <span className="text-[10px] font-medium text-black/60 uppercase tracking-wide">
                Time to First Token
              </span>
              <span className="text-lg font-mono text-success">
                {currentSpan.time_to_first_token !== null ? (
                  `${currentSpan.time_to_first_token.toFixed(0)}ms`
                ) : (
                  <Skeleton width="w-16" height="h-6" />
                )}
              </span>
            </div>
            <div className="flex flex-col gap-1 p-3 bg-babyblue/10 border-2 border-babyblue shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
              <span className="text-[10px] font-medium text-black/60 uppercase tracking-wide">
                Tokens Per Second
              </span>
              <span className="text-lg font-mono text-babyblue">
                {currentSpan.tokens_per_second !== null ? (
                  `${currentSpan.tokens_per_second.toFixed(1)} tok/s`
                ) : (
                  <Skeleton width="w-16" height="h-6" />
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Token Information */}
      {(currentSpan.prompt_tokens !== null ||
        currentSpan.completion_tokens !== null) && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-black/40 uppercase tracking-wide">
            {`/* Token Usage */`}
          </h4>
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 p-3 bg-white border-2 border-black">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium text-black/60 uppercase tracking-wide">
                  Prompt
                </span>
                <span className="text-base font-mono">
                  {currentSpan.prompt_tokens !== null ? (
                    currentSpan.prompt_tokens.toLocaleString()
                  ) : (
                    <Skeleton width="w-12" height="h-5" />
                  )}
                </span>
              </div>
            </div>
            <div className="text-black/60 text-sm">+</div>
            <div className="flex-1 flex items-center gap-2 p-3 bg-white border-2 border-black">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium text-black/60 uppercase tracking-wide">
                  Completion
                </span>
                <span className="text-base font-mono">
                  {currentSpan.completion_tokens !== null ? (
                    currentSpan.completion_tokens.toLocaleString()
                  ) : (
                    <Skeleton width="w-12" height="h-5" />
                  )}
                </span>
              </div>
            </div>
            <div className="text-muted text-sm">=</div>
            <div className="flex-1 flex items-center gap-2 p-3 bg-babyblue/10 border-2 border-babyblue/50">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium text-muted uppercase tracking-wide">
                  Total
                </span>
                <span className="text-base text-foreground font-mono">
                  {currentSpan.prompt_tokens !== null &&
                  currentSpan.completion_tokens !== null ? (
                    (
                      currentSpan.prompt_tokens + currentSpan.completion_tokens
                    ).toLocaleString()
                  ) : (
                    <Skeleton width="w-12" height="h-5" />
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      {(currentSpan.input_preview !== null ||
        currentSpan.output_preview !== null) && (
        <div className="grid grid-cols-2 gap-3">
          {/* Input Preview */}
          {currentSpan.input_preview !== null && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wide">
                Input
              </h4>
              <div className="p-4 rounded-lg bg-background border border-border flex-1">
                <p className="text-xs text-foreground/80 leading-snug whitespace-nowrap overflow-hidden text-ellipsis font-mono">
                  {currentSpan.input_preview}
                </p>
              </div>
              {currentSpan.input_blob_url !== null && (
                <a
                  href={currentSpan.input_blob_url}
                  className="inline-flex items-center gap-1.5 text-xs text-babyblue hover:text-foreground font-medium transition group"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>View complete input</span>
                  <svg
                    className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              )}
            </div>
          )}

          {/* Output Preview */}
          {currentSpan.output_preview !== null && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wide">
                Output
              </h4>
              <div className="p-4 rounded-lg bg-background border border-border flex-1">
                <p className="text-xs text-foreground/80 leading-snug whitespace-nowrap overflow-hidden text-ellipsis font-mono">
                  {currentSpan.output_preview}
                </p>
              </div>
              {currentSpan.output_blob_url !== null && (
                <a
                  href={currentSpan.output_blob_url}
                  className="inline-flex items-center gap-1.5 text-xs text-babyblue hover:text-foreground font-medium transition group"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>View complete output</span>
                  <svg
                    className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {currentSpan.error_message !== null && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-error uppercase tracking-wide">
            Error
          </h4>
          <div className="p-4 rounded-lg bg-red-50 border border-error/30">
            <p className="text-xs text-error/90 leading-relaxed wrap-break-word font-mono">
              {currentSpan.error_message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
