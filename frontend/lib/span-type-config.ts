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
    color: "bg-[#5B5FFF]",
    textColor: "text-white",
    borderColor: "border-[#5B5FFF]",
    hexColor: "#5B5FFF",
  },
  http: {
    label: "HTTP",
    color: "bg-[#10B981]",
    textColor: "text-white",
    borderColor: "border-[#10B981]",
    hexColor: "#10B981",
  },
  cli: {
    label: "CLI",
    color: "bg-[#8b5cf6]",
    textColor: "text-white",
    borderColor: "border-[#8b5cf6]",
    hexColor: "#8b5cf6",
  },
  tool: {
    label: "Tool",
    color: "bg-[#e8c302]",
    textColor: "text-black",
    borderColor: "border-[#e8c302]",
    hexColor: "#e8c302",
  },
  function: {
    label: "Function",
    color: "bg-[#D1437C]",
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
