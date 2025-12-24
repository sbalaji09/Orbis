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

    // Fetch recent traces (increased limit to get more traces)
    const response = await fetch(`${API_BASE_URL}/traces?limit=50`, {
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

            // Find the first LLM span with input data
            const spanWithInput = spans.find(
              (span: any) => span.span_type === "llm" && (span.prompt || span.input_preview || span.input_blob_url)
            );

            console.log(`[Trace ${trace.trace_id}] Searching for LLM spans:`, {
              total_spans: spans.length,
              llm_spans: spans.filter((s: any) => s.span_type === "llm").length,
              found_span: !!spanWithInput
            });

            if (spanWithInput) {
              // Try to get prompt from LLM span first, then fall back to input_preview
              let prompt = spanWithInput.prompt || spanWithInput.input_preview || "";
              console.log(`[Trace ${trace.trace_id}] Found span with input:`, {
                has_prompt: !!spanWithInput.prompt,
                has_input_preview: !!spanWithInput.input_preview,
                prompt_length: prompt.length,
                prompt_sample: prompt.substring(0, 50)
              });

              // If there's a blob URL, fetch the full input
              if (spanWithInput.input_blob_url && !prompt) {
                const blobUrl = spanWithInput.input_blob_url;
                // Handle inline:// URLs - decode base64 content directly
                if (blobUrl.startsWith('inline://')) {
                  try {
                    const encodedContent = blobUrl.slice(9);
                    prompt = Buffer.from(encodedContent, 'base64').toString('utf-8');
                  } catch (e) {
                    console.error("Error decoding inline blob data:", e);
                  }
                } else if (blobUrl.startsWith('http://') || blobUrl.startsWith('https://')) {
                  // Fetch from HTTP/HTTPS URL
                  try {
                    const blobResponse = await fetch(blobUrl);
                    if (blobResponse.ok) {
                      const blobData = await blobResponse.text();
                      prompt = blobData;
                    }
                  } catch (e) {
                    console.error("Error fetching blob data:", e);
                  }
                }
              }

              // Extract prompt from the input if it's structured
              let extractedPrompt = prompt;
              try {
                const parsedInput = JSON.parse(prompt);
                console.log(`[Trace ${trace.trace_id}] Parsed input as JSON:`, {
                  has_messages: !!parsedInput.messages,
                  has_prompt: !!parsedInput.prompt,
                  type: typeof parsedInput
                });
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
                console.log(`[Trace ${trace.trace_id}] Input is not JSON, using raw prompt`);
              }

              console.log(`[Trace ${trace.trace_id}] Final extracted prompt:`, {
                length: extractedPrompt?.length || 0,
                isEmpty: !extractedPrompt || extractedPrompt.trim() === "",
                sample: extractedPrompt?.substring(0, 100)
              });

              // If we still don't have a good prompt, skip this trace
              if (!extractedPrompt || extractedPrompt.trim() === "") {
                console.log(`[Trace ${trace.trace_id}] Skipping - no valid prompt`);
                return null;
              }

              const result = {
                id: trace.trace_id,
                timestamp: trace.start_time,
                prompt: extractedPrompt.substring(0, 500), // Limit to 500 chars for display
                model: spanWithInput.model || spanWithInput.llm_model || "unknown",
                status: trace.status,
              };

              console.log(`[Trace ${trace.trace_id}] Returning trace:`, {
                timestamp: trace.start_time,
                timestamp_type: typeof trace.start_time,
                parsed_date: new Date(trace.start_time).toISOString(),
              });

              return result;
            }
          }
        } catch (error) {
          console.error(`Error fetching spans for trace ${trace.trace_id}:`, error);
        }

        // Skip this trace if we can't get the prompt
        return null;
      })
    );

    // Filter out null traces (ones without valid prompts)
    const validTraces = tracesWithPrompts.filter((t) => t !== null);

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
