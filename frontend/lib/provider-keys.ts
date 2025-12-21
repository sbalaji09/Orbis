export type ProviderKeyProvider =
  | "openai"
  | "xai"
  | "groq"
  | "mistral"
  | "anthropic"
  | "gemini";

export const PROVIDERS: Array<{ id: ProviderKeyProvider; label: string }> = [
  { id: "openai", label: "OpenAI" },
  { id: "xai", label: "xAI" },
  { id: "groq", label: "Groq" },
  { id: "mistral", label: "Mistral AI" },
  { id: "anthropic", label: "Anthropic (Claude)" },
  { id: "gemini", label: "Google (Gemini)" },
];
