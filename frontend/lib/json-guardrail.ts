export function extractJsonCandidate(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Prefer fenced code blocks: ```json ... ```
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  // If the whole output looks like JSON, use it.
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    return trimmed;
  }

  // Heuristic: try to parse the largest {...} or [...] slice
  const firstObject = trimmed.indexOf("{");
  const lastObject = trimmed.lastIndexOf("}");
  if (firstObject !== -1 && lastObject !== -1 && lastObject > firstObject) {
    return trimmed.slice(firstObject, lastObject + 1).trim();
  }

  const firstArray = trimmed.indexOf("[");
  const lastArray = trimmed.lastIndexOf("]");
  if (firstArray !== -1 && lastArray !== -1 && lastArray > firstArray) {
    return trimmed.slice(firstArray, lastArray + 1).trim();
  }

  return null;
}

export function safeIsJson(text: string): boolean {
  const candidate = extractJsonCandidate(text) ?? text;
  try {
    JSON.parse(candidate);
    return true;
  } catch {
    return false;
  }
}

