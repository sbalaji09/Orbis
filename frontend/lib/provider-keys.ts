export type ProviderKeyProvider =
  | "openai"
  | "xai"
  | "groq"
  | "mistral"
  | "deepseek"
  | "gemini";

export const PROVIDERS: Array<{ id: ProviderKeyProvider; label: string }> = [
  { id: "openai", label: "OpenAI" },
  { id: "xai", label: "xAI" },
  { id: "groq", label: "Groq" },
  { id: "mistral", label: "Mistral AI" },
  { id: "deepseek", label: "DeepSeek" },
  { id: "gemini", label: "Google (Gemini)" },
];
