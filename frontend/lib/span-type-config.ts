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
    borderColor: "border-[#5B5FFF]",
    hexColor: "#5B5FFF",
  },
  http: {
    label: "HTTP",
    color: "bg-[#f97316]",
    textColor: "text-white",
    borderColor: "border-[#10B981]",
    hexColor: "#10B981",
  },
  cli: {
    label: "CLI",
    color: "bg-[#f97316]",
    textColor: "text-white",
    borderColor: "border-[#8b5cf6]",
    hexColor: "#8b5cf6",
  },
  tool: {
    label: "Tool",
    color: "bg-[#84cc16]",
    textColor: "text-black",
    borderColor: "border-[#e8c302]",
    hexColor: "#e8c302",
  },
  function: {
    label: "Function",
    color: "bg-[#ec4899]",
    textColor: "text-white",
    borderColor: "border-[#D1437C]",
    hexColor: "#D1437C",
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
