export type SpanType = "llm" | "http" | "cli" | "tool" | "function";

export const spanTypeConfig: Record<SpanType, {
  label: string;
  color: string; 
  textColor: string;
  borderColor: string;
  icon: string;
}> = {
  llm: {
    label: "LLM",
    color: "bg-[#5B5FFF]",
    textColor: "text-white",
    borderColor: "border-[#5B5FFF]",
    icon: "🧠",
  },
  http: {
    label: "HTTP",
    color: "bg-[#10B981]",
    textColor: "text-white",
    borderColor: "border-[#10B981]",
    icon: "🌐",
  },
  cli: {
    label: "CLI",
    color: "bg-[#8b5cf6]",
    textColor: "text-white",
    borderColor: "border-[#8b5cf6]",
    icon: "⚙️",
  },
  tool: {
    label: "Tool",
    color: "bg-[#e8c302]",
    textColor: "text-black",
    borderColor: "border-[#e8c302]",
    icon: "🔧",
  },
  function: {
    label: "Function",
    color: "bg-[#64748b]",
    textColor: "text-white",
    borderColor: "border-[#64748b]",
    icon: "ƒ",
  },
};

export function getSpanTypeConfig(spanType: string | null) {
  const type = (spanType || "function") as SpanType;
  return spanTypeConfig[type] || spanTypeConfig.function;
}