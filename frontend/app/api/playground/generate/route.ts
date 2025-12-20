import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  getCachedResponse,
  setCachedResponse,
} from "@/lib/playground-cache";

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
  "gpt-5": {
    id: "gpt-5",
    name: "GPT-5",
    provider: "OpenAI",
    costPerInputToken: 0.000005,
    costPerOutputToken: 0.000015,
  },
  "groq-llama": {
    id: "groq-llama",
    name: "Llama 3.3 70B",
    provider: "Groq",
    costPerInputToken: 0.00000059,
    costPerOutputToken: 0.00000079,
  },
  "mistral-large": {
    id: "mistral-large",
    name: "Mistral Large",
    provider: "Mistral AI",
    costPerInputToken: 0.0000005,
    costPerOutputToken: 0.0000015,
  },
  "deepseek-v3": {
    id: "deepseek-v3",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    costPerInputToken: 0.00000028,
    costPerOutputToken: 0.00000042,
  },
};

// Initialize API clients
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  return new OpenAI({ apiKey });
}

function getXAIClient() {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY not configured");
  return new OpenAI({
    apiKey,
    baseURL: "https://api.x.ai/v1",
  });
}

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");
  return new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

function getMistralClient() {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error("MISTRAL_API_KEY not configured");
  return new OpenAI({
    apiKey,
    baseURL: "https://api.mistral.ai/v1",
  });
}

function getDeepSeekClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");
  return new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com/v1",
  });
}

async function callModel(
  modelId: string,
  prompt: string,
  retries = 2
): Promise<ModelOutput> {
  const modelConfig = MODEL_CONFIGS[modelId];

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
      let client: OpenAI;
      let modelName: string;

      // Get the appropriate client and model name for each provider
      switch (modelId) {
        case "gpt-5":
          client = getOpenAIClient();
          modelName = "gpt-4o"; // Using GPT-4o as GPT-5 placeholder
          break;
        case "grok-4-1":
          client = getXAIClient();
          modelName = "grok-4-1-fast-reasoning";
          break;
        case "groq-llama":
          client = getGroqClient();
          modelName = "llama-3.3-70b-versatile";
          break;
        case "mistral-large":
          client = getMistralClient();
          modelName = "mistral-large-latest";
          break;
        case "deepseek-v3":
          client = getDeepSeekClient();
          modelName = "deepseek-chat";
          break;
        default:
          throw new Error(`Unsupported model: ${modelId}`);
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

      const latency = (Date.now() - startTime) / 1000;
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      const totalCost =
        inputTokens * modelConfig.costPerInputToken +
        outputTokens * modelConfig.costPerOutputToken;

      const result = {
        model: modelConfig,
        output: response.choices[0]?.message?.content || "",
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
    const { prompt, models } = body;

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
      models.map((modelId) => callModel(modelId, prompt))
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
