import { NextRequest, NextResponse } from "next/server";
import { getAuthHeaders } from "@/lib/supabase/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  try {
    const authHeaders = await getAuthHeaders();

    if (!authHeaders.Authorization) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Fetch recent traces
    const response = await fetch(`${API_BASE_URL}/traces?limit=5`, {
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch traces");
    }

    const data = await response.json();
    const traces = data.traces || [];

    // For the first trace, fetch all spans to debug
    const debugInfo = [];

    for (const trace of traces.slice(0, 3)) {
      const spansResponse = await fetch(
        `${API_BASE_URL}/traces/${trace.trace_id}/spans`,
        {
          headers: {
            ...authHeaders,
          },
          cache: "no-store",
        }
      );

      if (spansResponse.ok) {
        const spansData = await spansResponse.json();
        const spans = spansData.spans || [];

        debugInfo.push({
          trace_id: trace.trace_id,
          trace_name: trace.name,
          span_count: spans.length,
          spans: spans.map((span: any) => ({
            span_id: span.span_id,
            name: span.name,
            span_type: span.span_type,
            has_prompt: !!span.prompt,
            has_input_preview: !!span.input_preview,
            has_input_blob_url: !!span.input_blob_url,
            prompt_sample: span.prompt ? span.prompt.substring(0, 100) : null,
            input_preview_sample: span.input_preview ? span.input_preview.substring(0, 100) : null,
            model: span.model || span.llm_model || null,
            all_fields: Object.keys(span),
          }))
        });
      }
    }

    return NextResponse.json({
      debug: debugInfo,
    });
  } catch (error: any) {
    console.error("Error in debug traces:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
