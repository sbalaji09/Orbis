export type SpanType = "llm" | "http" | "cli" | "tool" | "function";

export const spanTypeConfig: Record<
  SpanType,
  {
    label: string;
    color: string;
    textColor: string;
    borderColor: string;
    hexColor: string; // For programmatic use (MiniMap, etc.)
  }
> = {
  llm: {
    label: "LLM",
    color: "bg-[#3b82f6]",
    textColor: "text-white",
    borderColor: "border-[#3b82f6]",
    hexColor: "#3b82f6",
  },
  http: {
    label: "HTTP",
    color: "bg-[#f97316]",
    textColor: "text-white",
    borderColor: "border-[#f97316]",
    hexColor: "#f97316",
  },
  cli: {
    label: "CLI",
    color: "bg-[#f97316]",
    textColor: "text-white",
    borderColor: "border-[#f97316]",
    hexColor: "#f97316",
  },
  tool: {
    label: "Tool",
    color: "bg-[#84cc16]",
    textColor: "text-black",
    borderColor: "border-[#84cc16]",
    hexColor: "#84cc16",
  },
  function: {
    label: "Function",
    color: "bg-[#ec4899]",
    textColor: "text-white",
    borderColor: "border-[#ec4899]",
    hexColor: "#ec4899",
  },
};

export function getSpanTypeConfig(spanType: string | null) {
  const type = (spanType || "function") as SpanType;
  return spanTypeConfig[type] || spanTypeConfig.function;
}

export function getSpanTypeHexColor(spanType: string | null): string {
  const config = getSpanTypeConfig(spanType);
  return config.hexColor;
}
