import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  getCachedResponse,
  setCachedResponse,
} from "@/lib/playground-cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { ProviderKeyProvider } from "@/lib/provider-keys";
import { decryptProviderKey } from "@/lib/provider-keys.server";

interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  costPerInputToken: number;
  costPerOutputToken: number;
}

interface GenerateRequest {
  prompt: string;
  models: string[];
  customModels?: Record<
    string,
    {
      provider: ProviderKeyProvider;
      modelName: string;
      costPerInputToken?: number;
      costPerOutputToken?: number;
    }
  >;
}

interface ModelOutput {
  model: ModelConfig;
  output: string;
  inputTokens: number;
  outputTokens: number;
  latency: number;
  totalCost: number;
  timestamp: number;
  error?: string;
  cached?: boolean;
}

// Model configuration mapping
const MODEL_CONFIGS: Record<string, ModelConfig> = {
  "grok-4-1": {
    id: "grok-4-1",
    name: "Grok 4.1 Fast",
    provider: "xAI",
    costPerInputToken: 0.0000002,
    costPerOutputToken: 0.0000005,
  },
  "gpt-4o": {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    costPerInputToken: 0.0000025,
    costPerOutputToken: 0.00001,
  },
  "groq-llama": {
    id: "groq-llama",
    name: "Llama 3.3 70B",
    provider: "Groq",
    costPerInputToken: 0.00000059,
    costPerOutputToken: 0.00000079,
  },
  "gemini-2.5-flash-lite": {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    provider: "Google",
    costPerInputToken: 0.0000001,
    costPerOutputToken: 0.0000004,
  },
  "mistral-large": {
    id: "mistral-large",
    name: "Mistral Large",
    provider: "Mistral AI",
    costPerInputToken: 0.0000005,
    costPerOutputToken: 0.0000015,
  },
  "deepseek-chat": {
    id: "deepseek-chat",
    name: "DeepSeek Chat",
    provider: "DeepSeek",
    costPerInputToken: 0.00000028,
    costPerOutputToken: 0.00000042,
  },
};

function getEnvOrDemoProviderKey(primaryEnvVar: string) {
  // Normal (BYOK) key
  const primary = process.env[primaryEnvVar];
  if (primary) return primary;

  // Optional Orbis-hosted demo/sandbox key fallback (server-side only)
  // Example: OPENAI_API_KEY -> ORBIS_DEMO_OPENAI_API_KEY
  const demo = process.env[`ORBIS_DEMO_${primaryEnvVar}`];
  if (demo) return demo;

  return null;
}

function openAICompatClient(apiKey: string, baseURL?: string) {
  return new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
}

async function getUserProviderKey(
  provider: ProviderKeyProvider
): Promise<string | null> {
  try {
    const supabase = await createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("provider_api_keys")
      .select("encrypted_key")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .maybeSingle();

    if (error || !data?.encrypted_key) return null;
    return decryptProviderKey(data.encrypted_key);
  } catch {
    return null;
  }
}

async function resolveProviderKey(
  envVar: string,
  provider: ProviderKeyProvider
): Promise<string> {
  const envOrDemo = getEnvOrDemoProviderKey(envVar);
  if (envOrDemo) return envOrDemo;
  const userKey = await getUserProviderKey(provider);
  if (userKey) return userKey;
  throw new Error(
    `${envVar} not configured and no saved key found for provider '${provider}' (connect a key in the UI or set ORBIS_DEMO_${envVar})`
  );
}

async function callGemini(
  prompt: string,
  modelName: string
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const apiKey = await resolveProviderKey("GEMINI_API_KEY", "gemini");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      modelName
    )}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const inputTokens = data.usageMetadata?.promptTokenCount || 0;
  const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;

  return { content, inputTokens, outputTokens };
}

async function callModel(
  modelId: string,
  prompt: string,
  customModels: GenerateRequest["customModels"] | undefined,
  retries = 2
): Promise<ModelOutput> {
  const custom = customModels?.[modelId];
  const modelConfig: ModelConfig | undefined = custom
    ? {
        id: modelId,
        name: custom.modelName,
        provider:
          custom.provider === "gemini"
            ? "Google"
            : custom.provider === "openai"
            ? "OpenAI"
            : custom.provider === "xai"
            ? "xAI"
            : custom.provider === "groq"
            ? "Groq"
            : custom.provider === "mistral"
            ? "Mistral AI"
            : custom.provider === "deepseek"
            ? "DeepSeek"
            : "OpenAI",
        costPerInputToken: custom.costPerInputToken ?? 0,
        costPerOutputToken: custom.costPerOutputToken ?? 0,
      }
    : MODEL_CONFIGS[modelId];

  if (!modelConfig) {
    return {
      model: modelConfig || { id: modelId } as ModelConfig,
      output: "",
      inputTokens: 0,
      outputTokens: 0,
      latency: 0,
      totalCost: 0,
      timestamp: Date.now(),
      error: `Unknown model: ${modelId}`,
    };
  }

  // Check cache first
  const cachedResult = getCachedResponse(prompt, modelId);
  if (cachedResult) {
    console.log(`[Cache HIT] ${modelId} - Using cached response`);
    return {
      model: modelConfig,
      ...cachedResult,
      cached: true,
    };
  }

  console.log(`[Cache MISS] ${modelId} - Calling API`);
  const startTime = Date.now();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      let output: string;
      let inputTokens: number;
      let outputTokens: number;

      // Handle Gemini separately since it uses a different API
      if (modelId === "gemini-2.5-flash-lite" || custom?.provider === "gemini") {
        const geminiModel =
          custom?.provider === "gemini"
            ? custom.modelName
            : "gemini-2.5-flash-lite";
        const geminiResponse = await callGemini(prompt, geminiModel);
        output = geminiResponse.content;
        inputTokens = geminiResponse.inputTokens;
        outputTokens = geminiResponse.outputTokens;
      } else {
        let client: OpenAI;
        let modelName: string;
        let apiKey: string;
        let baseURL: string | undefined;

        // Get the appropriate client and model name for each provider
        if (custom) {
          modelName = custom.modelName;
          switch (custom.provider) {
            case "openai":
              apiKey = await resolveProviderKey("OPENAI_API_KEY", "openai");
              baseURL = undefined;
              break;
            case "xai":
              apiKey = await resolveProviderKey("XAI_API_KEY", "xai");
              baseURL = "https://api.x.ai/v1";
              break;
            case "groq":
              apiKey = await resolveProviderKey("GROQ_API_KEY", "groq");
              baseURL = "https://api.groq.com/openai/v1";
              break;
            case "mistral":
              apiKey = await resolveProviderKey("MISTRAL_API_KEY", "mistral");
              baseURL = "https://api.mistral.ai/v1";
              break;
            case "deepseek":
              apiKey = await resolveProviderKey("DEEPSEEK_API_KEY", "deepseek");
              baseURL = "https://api.deepseek.com/v1";
              break;
            default:
              throw new Error(`Unsupported provider: ${custom.provider}`);
          }
          client = openAICompatClient(apiKey, baseURL);
        } else {
          switch (modelId) {
            case "gpt-4o":
              apiKey = await resolveProviderKey("OPENAI_API_KEY", "openai");
              baseURL = undefined;
              client = openAICompatClient(apiKey, baseURL);
              modelName = "gpt-4o";
              break;
            case "grok-4-1":
              apiKey = await resolveProviderKey("XAI_API_KEY", "xai");
              baseURL = "https://api.x.ai/v1";
              client = openAICompatClient(apiKey, baseURL);
              modelName = "grok-4-1-fast-reasoning";
              break;
            case "groq-llama":
              apiKey = await resolveProviderKey("GROQ_API_KEY", "groq");
              baseURL = "https://api.groq.com/openai/v1";
              client = openAICompatClient(apiKey, baseURL);
              modelName = "llama-3.3-70b-versatile";
              break;
            case "mistral-large":
              apiKey = await resolveProviderKey("MISTRAL_API_KEY", "mistral");
              baseURL = "https://api.mistral.ai/v1";
              client = openAICompatClient(apiKey, baseURL);
              modelName = "mistral-large-latest";
              break;
            case "deepseek-chat":
              apiKey = await resolveProviderKey("DEEPSEEK_API_KEY", "deepseek");
              baseURL = "https://api.deepseek.com/v1";
              client = openAICompatClient(apiKey, baseURL);
              modelName = "deepseek-chat";
              break;
            default:
              throw new Error(`Unsupported model: ${modelId}`);
          }
        }

        // Make the API call
        const response = await client.chat.completions.create({
          model: modelName,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        });

        output = response.choices[0]?.message?.content || "";
        inputTokens = response.usage?.prompt_tokens || 0;
        outputTokens = response.usage?.completion_tokens || 0;
      }

      const latency = (Date.now() - startTime) / 1000;
      const totalCost =
        inputTokens * modelConfig.costPerInputToken +
        outputTokens * modelConfig.costPerOutputToken;

      const result = {
        model: modelConfig,
        output,
        inputTokens,
        outputTokens,
        latency,
        totalCost,
        timestamp: Date.now(),
        cached: false,
      };

      // Store successful response in cache
      setCachedResponse(prompt, modelId, {
        output: result.output,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latency: result.latency,
        totalCost: result.totalCost,
        timestamp: result.timestamp,
      });

      return result;
    } catch (error: any) {
      // If this is the last retry, return the error
      if (attempt === retries) {
        const latency = (Date.now() - startTime) / 1000;
        return {
          model: modelConfig,
          output: "",
          inputTokens: 0,
          outputTokens: 0,
          latency,
          totalCost: 0,
          timestamp: Date.now(),
          error: error.message || "Failed to generate response",
        };
      }
      // Wait before retrying (exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }

  // This should never be reached due to the error return in the catch block
  throw new Error("Unexpected error in callModel");
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { prompt, models, customModels } = body;

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    if (!models || models.length === 0) {
      return NextResponse.json(
        { error: "At least one model must be selected" },
        { status: 400 }
      );
    }

    if (models.length > 4) {
      return NextResponse.json(
        { error: "Maximum 4 models can be selected" },
        { status: 400 }
      );
    }

    // Call all models in parallel
    const results = await Promise.all(
      models.map((modelId) => callModel(modelId, prompt, customModels))
    );

    return NextResponse.json({
      outputs: results,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("Error in playground generate API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
