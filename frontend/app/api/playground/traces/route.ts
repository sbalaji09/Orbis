import { NextRequest, NextResponse } from "next/server";
import { getAuthHeaders } from "@/lib/supabase/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface TraceWithPrompt {
  id: string;
  timestamp: string;
  prompt: string;
  model: string | null;
  status: string;
}

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
    const response = await fetch(`${API_BASE_URL}/traces?limit=20`, {
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

    // For each trace, fetch the first span to get the prompt/input
    const tracesWithPrompts: TraceWithPrompt[] = await Promise.all(
      traces.map(async (trace: any) => {
        try {
          // Fetch spans for this trace
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

            // Find the first span with input data
            const spanWithInput = spans.find(
              (span: any) => span.input_preview || span.input_blob_url
            );

            if (spanWithInput) {
              let prompt = spanWithInput.input_preview || "";

              // If there's a blob URL, fetch the full input
              if (spanWithInput.input_blob_url && !prompt) {
                try {
                  const blobResponse = await fetch(spanWithInput.input_blob_url);
                  if (blobResponse.ok) {
                    const blobData = await blobResponse.text();
                    prompt = blobData;
                  }
                } catch (e) {
                  console.error("Error fetching blob data:", e);
                }
              }

              // Extract prompt from the input if it's structured
              let extractedPrompt = prompt;
              try {
                const parsedInput = JSON.parse(prompt);
                if (parsedInput.messages && Array.isArray(parsedInput.messages)) {
                  // Extract content from messages array
                  const userMessage = parsedInput.messages.find(
                    (msg: any) => msg.role === "user"
                  );
                  if (userMessage?.content) {
                    extractedPrompt = userMessage.content;
                  }
                } else if (parsedInput.prompt) {
                  extractedPrompt = parsedInput.prompt;
                } else if (typeof parsedInput === "string") {
                  extractedPrompt = parsedInput;
                }
              } catch (e) {
                // If not JSON, use the raw prompt
              }

              return {
                id: trace.trace_id,
                timestamp: trace.start_time,
                prompt: extractedPrompt.substring(0, 500), // Limit to 500 chars for display
                model: spanWithInput.llm_model || "unknown",
                status: trace.status,
              };
            }
          }
        } catch (error) {
          console.error(`Error fetching spans for trace ${trace.trace_id}:`, error);
        }

        // Fallback if we can't get the prompt
        return {
          id: trace.trace_id,
          timestamp: trace.start_time,
          prompt: "No prompt available",
          model: "unknown",
          status: trace.status,
        };
      })
    );

    // Filter out traces without valid prompts
    const validTraces = tracesWithPrompts.filter(
      (t) => t.prompt && t.prompt !== "No prompt available"
    );

    return NextResponse.json({
      traces: validTraces,
    });
  } catch (error: any) {
    console.error("Error fetching playground traces:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
