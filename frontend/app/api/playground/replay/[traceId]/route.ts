import { NextRequest, NextResponse } from "next/server";
import { getAuthHeaders } from "@/lib/supabase/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function extractUserPrompt(raw: string): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.messages && Array.isArray(parsed.messages)) {
      const user = parsed.messages.find((m: any) => m?.role === "user");
      if (typeof user?.content === "string") return user.content;
    }
    if (typeof parsed?.prompt === "string") return parsed.prompt;
    if (typeof parsed === "string") return parsed;
  } catch {}
  return raw;
}

function extractOutputText(raw: string): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    const choice = parsed?.choices?.[0];
    const content =
      choice?.message?.content ??
      choice?.delta?.content ??
      choice?.text ??
      parsed?.output ??
      parsed?.text;
    if (typeof content === "string") return content;
    if (typeof parsed === "string") return parsed;
  } catch {}
  return raw;
}

async function fetchBlobText(url: string): Promise<string | null> {
  if (!url) return null;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ traceId: string }> }
) {
  try {
    const { traceId } = await context.params;
    const authHeaders = await getAuthHeaders();

    if (!authHeaders.Authorization) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const spansResponse = await fetch(`${API_BASE_URL}/traces/${traceId}/spans`, {
      headers: { ...authHeaders },
      cache: "no-store",
    });

    if (!spansResponse.ok) {
      const errorBody = await spansResponse.text().catch(() => "");
      return NextResponse.json(
        { error: "Failed to fetch trace spans", details: errorBody },
        { status: spansResponse.status }
      );
    }

    const spansData = await spansResponse.json();
    const spans = spansData.spans || [];

    const llmSpan =
      spans.find(
        (s: any) =>
          s?.span_type === "llm" &&
          (s?.prompt || s?.input_preview || s?.input_blob_url) &&
          (s?.output_preview || s?.output_blob_url)
      ) ||
      spans.find(
        (s: any) =>
          s?.span_type === "llm" && (s?.prompt || s?.input_preview || s?.input_blob_url)
      ) ||
      null;

    if (!llmSpan) {
      return NextResponse.json(
        { error: "No LLM span found for trace" },
        { status: 404 }
      );
    }

    let promptRaw = llmSpan.prompt || llmSpan.input_preview || "";
    if ((!promptRaw || !promptRaw.trim()) && llmSpan.input_blob_url) {
      const blobText = await fetchBlobText(llmSpan.input_blob_url);
      if (blobText) promptRaw = blobText;
    }

    let outputRaw = llmSpan.output_preview || "";
    if ((!outputRaw || !outputRaw.trim()) && llmSpan.output_blob_url) {
      const blobText = await fetchBlobText(llmSpan.output_blob_url);
      if (blobText) outputRaw = blobText;
    }

    const prompt = extractUserPrompt(promptRaw);
    const output = extractOutputText(outputRaw);

    const durationRaw = llmSpan.duration;
    const durationMs =
      typeof durationRaw === "number"
        ? durationRaw
        : durationRaw
          ? Number(durationRaw)
          : null;
    const latencySec =
      typeof durationMs === "number" && Number.isFinite(durationMs)
        ? durationMs / 1000
        : null;

    // guardrails: keep payloads reasonable
    const maxLen = 50_000;
    const promptTrimmed = prompt.length > maxLen ? prompt.slice(0, maxLen) : prompt;
    const outputTrimmed = output.length > maxLen ? output.slice(0, maxLen) : output;

    return NextResponse.json({
      traceId,
      prompt: promptTrimmed,
      output: outputTrimmed,
      model: llmSpan.llm_model || llmSpan.model || null,
      provider: llmSpan.provider || null,
      promptTokens: llmSpan.prompt_tokens ?? null,
      completionTokens: llmSpan.completion_tokens ?? null,
      latencySec,
      totalCost: llmSpan.cost ?? null,
      spanId: llmSpan.span_id ?? null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
