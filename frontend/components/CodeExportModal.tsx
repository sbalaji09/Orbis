import { useState, Fragment, useMemo, useEffect } from "react";
import {
  Dialog,
  Transition,
  TransitionChild,
  DialogPanel,
  DialogTitle,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { ModelConfig } from "@/app/dashboard/playground/PlaygroundClient";
import { ModelLogo } from "@/components/ModelLogo";

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  availableModels: ModelConfig[];
  defaultModelId?: string;
}

type Language = "python" | "typescript" | "curl";

type ExportTarget =
  | {
      kind: "openai_compat";
      provider: string;
      envVar: string;
      baseURL?: string;
      modelName: string;
    }
  | {
      kind: "gemini";
      provider: string;
      envVar: string;
      modelName: string;
    }
  | {
      kind: "anthropic";
      provider: string;
      envVar: string;
      modelName: string;
    };

function getExportTarget(modelId: string): ExportTarget | null {
  switch (modelId) {
    case "gpt-4o":
      return {
        kind: "openai_compat",
        provider: "OpenAI",
        envVar: "OPENAI_API_KEY",
        modelName: "gpt-4o",
      };
    case "grok-4-1":
      return {
        kind: "openai_compat",
        provider: "xAI",
        envVar: "XAI_API_KEY",
        baseURL: "https://api.x.ai/v1",
        modelName: "grok-4-1-fast-reasoning",
      };
    case "groq-llama":
      return {
        kind: "openai_compat",
        provider: "Groq",
        envVar: "GROQ_API_KEY",
        baseURL: "https://api.groq.com/openai/v1",
        modelName: "llama-3.3-70b-versatile",
      };
    case "mistral-large":
      return {
        kind: "openai_compat",
        provider: "Mistral AI",
        envVar: "MISTRAL_API_KEY",
        baseURL: "https://api.mistral.ai/v1",
        modelName: "mistral-large-latest",
      };
    case "claude-sonnet":
      return {
        kind: "anthropic",
        provider: "Anthropic",
        envVar: "ANTHROPIC_API_KEY",
        modelName: "claude-3-5-sonnet-20241022",
      };
    case "gemini-2.5-flash-lite":
      return {
        kind: "gemini",
        provider: "Google",
        envVar: "GEMINI_API_KEY",
        modelName: "gemini-2.5-flash-lite",
      };
    default:
      return null;
  }
}

const generateCode = (
  language: Language,
  prompt: string,
  exportTarget: ExportTarget | null,
  selectedModelLabel: string
): string => {
  const promptEscaped = prompt.replace(/`/g, "\\`");
  const promptForJson = prompt.replace(/"/g, '\\"').replace(/\n/g, "\\n");

  if (!exportTarget) {
    return `// Unknown model selection: ${selectedModelLabel}\n// Please pick a supported model.`;
  }

  switch (language) {
    case "python":
      if (exportTarget.kind === "gemini") {
        return `import os
from observability_sdk import configure, instrument_all, observe
from google import genai
from google.genai import types

# Orbis / Observability SDK configuration
configure(
    api_key=os.environ.get("ORBIS_API_KEY", "YOUR_ORBIS_API_KEY"),
    project_id=os.environ.get("ORBIS_PROJECT_ID", "YOUR_PROJECT_ID"),
    api_url=os.environ.get("ORBIS_API_URL", "http://localhost:8080"),
)

instrument_all()

PROMPT = """${prompt}"""

client = genai.Client(api_key=os.environ.get("${exportTarget.envVar}", "YOUR_API_KEY"))

@observe(
    name="playground_export",
    metadata={"provider": "${exportTarget.provider}", "model": "${exportTarget.modelName}"}
)
def run():
    response = client.models.generate_content(
        model="${exportTarget.modelName}",
        contents=PROMPT,
        config=types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=1000,
        ),
    )
    print(response.text)

run()`;
      }
      if (exportTarget.kind === "anthropic") {
        return `import os
from anthropic import Anthropic

client = Anthropic(api_key=os.environ.get("${exportTarget.envVar}", "YOUR_API_KEY_HERE"))

prompt = """${prompt}"""

msg = client.messages.create(
    model="${exportTarget.modelName}",
    max_tokens=1000,
    temperature=0.7,
    messages=[{"role": "user", "content": prompt}],
)

print(msg.content[0].text)
`;
      }

      return `import os
from observability_sdk import configure, instrument_all, observe
import openai

# Orbis / Observability SDK configuration
configure(
    api_key=os.environ.get("ORBIS_API_KEY", "YOUR_ORBIS_API_KEY"),
    project_id=os.environ.get("ORBIS_PROJECT_ID", "YOUR_PROJECT_ID"),
    api_url=os.environ.get("ORBIS_API_URL", "http://localhost:8080"),
)

instrument_all()

PROMPT = """${prompt}"""

client = openai.OpenAI(
    api_key=os.environ.get("${exportTarget.envVar}", "YOUR_API_KEY")${
      exportTarget.baseURL ? `,\n    base_url="${exportTarget.baseURL}"` : ""
    }
)

@observe(
    name="playground_export",
    metadata={"provider": "${exportTarget.provider}", "model": "${exportTarget.modelName}"}
)
def run():
    response = client.chat.completions.create(
        model="${exportTarget.modelName}",
        messages=[{"role": "user", "content": PROMPT}],
        temperature=0.7,
        max_tokens=1000,
    )

    print(response.choices[0].message.content)

    # Optional usage info
    if response.usage:
        print(f"Input tokens: {response.usage.prompt_tokens}")
        print(f"Output tokens: {response.usage.completion_tokens}")

run()`;

    case "typescript":
      if (exportTarget.kind === "anthropic") {
        return `// npm i @anthropic-ai/sdk
import { Anthropic } from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.${exportTarget.envVar} });
const prompt = \`${promptEscaped}\`;

async function main() {
  const msg = await client.messages.create({
    model: "${exportTarget.modelName}",
    max_tokens: 1000,
    temperature: 0.7,
    messages: [{ role: "user", content: prompt }],
  });
  console.log(msg.content?.[0]?.type === "text" ? msg.content[0].text : "");
}

main();`;
      }
      if (exportTarget.kind === "gemini") {
        return `// Gemini TypeScript example (no Orbis JS SDK shown here)
// npm i @google/genai
import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({ apiKey: process.env.${exportTarget.envVar} });
const prompt = \`${promptEscaped}\`;

async function main() {
  const response = await client.models.generateContent({
    model: "${exportTarget.modelName}",
    contents: prompt,
  });
  console.log(response.text);
}

main();`;
      }

      return `import OpenAI from "openai";

// Configure your API client
const client = new OpenAI({
  apiKey: process.env.${exportTarget.envVar},${
    exportTarget.baseURL ? `\n  baseURL: "${exportTarget.baseURL}",` : ""
  }
});

// Your prompt
const prompt = \`${promptEscaped}\`;

// Call the model
async function generateCompletion() {
  const response = await client.chat.completions.create({
    model: "${exportTarget.modelName}",
    messages: [
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  // Get the response
  const output = response.choices[0].message.content;
  console.log(output);

  // Get usage information
  console.log(\`Tokens used: \${response.usage?.total_tokens}\`);
  console.log(\`Input tokens: \${response.usage?.prompt_tokens}\`);
  console.log(\`Output tokens: \${response.usage?.completion_tokens}\`);
}

generateCompletion();`;

    case "curl":
      if (exportTarget.kind === "anthropic") {
        return `curl https://api.anthropic.com/v1/messages \\
  -H "Content-Type: application/json" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "x-api-key: YOUR_API_KEY_HERE" \\
  -d '{
    "model": "${exportTarget.modelName}",
    "max_tokens": 1000,
    "temperature": 0.7,
    "messages": [
      {
        "role": "user",
        "content": "${promptForJson}"
      }
    ]
  }'`;
      }
      if (exportTarget.kind === "gemini") {
        return `curl "https://generativelanguage.googleapis.com/v1beta/models/${exportTarget.modelName}:generateContent?key=YOUR_API_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "contents": [
      { "parts": [{ "text": "${promptForJson}" }] }
    ],
    "generationConfig": { "temperature": 0.7, "maxOutputTokens": 1000 }
  }'`;
      }

      return `curl ${(exportTarget.baseURL ?? "https://api.openai.com/v1")}/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \\
  -d '{
    "model": "${exportTarget.modelName}",
    "messages": [
      {
        "role": "user",
        "content": "${promptForJson}"
      }
    ],
    "temperature": 0.7,
    "max_tokens": 1000
  }'`;

    default:
      return "";
  }
};

export function CodeExportModal({
  isOpen,
  onClose,
  prompt,
  availableModels,
  defaultModelId,
}: CodeExportModalProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("python");
  const [selectedModelId, setSelectedModelId] = useState<string>(
    defaultModelId ?? availableModels[0]?.id ?? "gpt-4o"
  );
  const [copied, setCopied] = useState(false);

  const selectedModelLabel = useMemo(() => {
    const model = availableModels.find((m) => m.id === selectedModelId);
    return model ? `${model.name} (${model.provider})` : selectedModelId;
  }, [availableModels, selectedModelId]);

  const selectedModel = useMemo(() => {
    return (
      availableModels.find((m) => m.id === selectedModelId) ??
      availableModels[0] ??
      null
    );
  }, [availableModels, selectedModelId]);

  const exportTarget = useMemo(
    () => getExportTarget(selectedModelId),
    [selectedModelId]
  );

  const code = generateCode(
    selectedLanguage,
    prompt,
    exportTarget,
    selectedModelLabel
  );

  const [highlightedHtml, setHighlightedHtml] = useState<string>("");
  const [isHighlighting, setIsHighlighting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (!code.trim()) {
      setHighlightedHtml("");
      return;
    }

    const controller = new AbortController();
    setIsHighlighting(true);

    (async () => {
      try {
        const res = await fetch("/api/playground/highlight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, language: selectedLanguage }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as { html?: string };
        setHighlightedHtml(data.html ?? "");
      } catch (e) {
        if (!controller.signal.aborted) setHighlightedHtml("");
      } finally {
        if (!controller.signal.aborted) setIsHighlighting(false);
      }
    })();

    return () => controller.abort();
  }, [code, isOpen, selectedLanguage]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="fixed inset-0" style={{ zIndex: 99999 }}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-3xl border-2 border-black bg-white shadow-[8px_8px_0_rgba(0,0,0,0.3)]">
                {/* Header */}
                <div className="px-6 py-4 bg-mustard/10 border-b-2 border-black flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-lg font-semibold">
                      Export Code
                    </DialogTitle>
                    <p className="text-xs text-black/60 font-mono mt-1">
                      {`// Copy your prompt as code in different languages`}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-black/5 transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-muted"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Model Selector */}
                <div className="px-6 py-4 border-b-2 border-black bg-white">
                  <label className="text-xs text-black/60 uppercase tracking-wide block mb-2">
                    Model
                  </label>
                  <div className="flex items-center gap-3">
                    <Listbox value={selectedModelId} onChange={setSelectedModelId}>
                      <div className="relative">
                        <ListboxButton className="w-[320px] px-3 py-2 pr-10 border-2 border-black bg-white text-sm font-medium shadow-[3px_3px_0_rgba(0,0,0,0.15)] hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-babyblue/50">
                          <span className="flex items-center gap-2 min-w-0">
                            <ModelLogo provider={selectedModel?.provider ?? "?"} size={18} />
                            <span className="truncate">
                              {selectedModel?.name ?? "Select a model"}
                              {selectedModel?.provider ? (
                                <span className="text-black/40">{` (${selectedModel.provider})`}</span>
                              ) : null}
                            </span>
                          </span>
                          <svg
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/70"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </ListboxButton>

                        <ListboxOptions className="absolute mt-2 w-[320px] max-h-64 overflow-auto border-2 border-black bg-white shadow-[6px_6px_0_rgba(0,0,0,0.25)] z-[100000] focus:outline-none">
                          {availableModels.map((m) => (
                            <ListboxOption
                              key={m.id}
                              value={m.id}
                              className={({ active }) =>
                                `cursor-pointer select-none px-3 py-2 border-b border-black/10 last:border-b-0 ${
                                  active ? "bg-babyblue/10" : "bg-white"
                                }`
                              }
                            >
                              {({ selected }) => (
                                <div className="flex items-center gap-2 min-w-0">
                                  <ModelLogo provider={m.provider} size={18} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{m.name}</p>
                                    <p className="text-[10px] text-black/40 font-mono truncate">
                                      {m.provider}
                                    </p>
                                  </div>
                                  {selected && (
                                    <span className="w-5 h-5 bg-black text-mustard border-2 border-black flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_rgba(0,0,0,0.15)]">
                                      <svg
                                        className="w-3 h-3"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={3}
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    </span>
                                  )}
                                </div>
                              )}
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </div>
                    </Listbox>
                    <p className="text-[10px] text-black/50 font-mono">
                      {exportTarget?.kind === "gemini"
                        ? "// Gemini example uses google-genai style client"
                        : exportTarget?.kind === "anthropic"
                        ? "// Claude example uses Anthropic Messages API"
                        : "// OpenAI-compatible endpoint"}
                    </p>
                  </div>
                </div>

                {/* Language Selector */}
                <div className="px-6 py-4 border-b-2 border-black bg-white">
                  <div className="flex gap-2">
                    {(["python", "typescript", "curl"] as Language[]).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setSelectedLanguage(lang)}
                        className={`px-4 py-2 text-sm font-medium border-2 transition-all ${
                          selectedLanguage === lang
                            ? "border-black bg-black text-mustard shadow-[3px_3px_0_rgba(0,0,0,0.2)]"
                            : "border-black/30 bg-white text-black hover:border-black"
                        }`}
                      >
                        {lang === "python" && "Python"}
                        {lang === "typescript" && "TypeScript"}
                        {lang === "curl" && "cURL"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Code Display */}
                <div className="p-6">
                  <div className="relative">
                    <button
                      onClick={handleCopy}
                      className="absolute top-3 right-3 px-3 py-2 bg-black text-mustard border-2 border-black text-xs font-medium hover:bg-black/90 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.2)] z-10"
                    >
                      {copied ? "✓ Copied!" : "Copy Code"}
                    </button>
                    <div className="border-2 border-black shadow-[3px_3px_0_rgba(0,0,0,0.15)] max-h-[500px] overflow-auto bg-[#1e1e1e] text-[#d4d4d4]">
                      {highlightedHtml ? (
                        <div
                          className="text-xs font-mono [&_pre]:m-0 [&_pre]:p-4 [&_pre]:!bg-[#1e1e1e] [&_pre]:overflow-visible [&_code]:font-mono"
                          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                        />
                      ) : (
                        <pre className="p-4 font-mono text-xs whitespace-pre overflow-visible">
                          {code}
                        </pre>
                      )}
                      {isHighlighting && (
                        <div className="px-4 pb-3 text-[10px] text-white/40 font-mono">
                          // highlighting…
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t-2 border-black bg-background">
                  <p className="text-[10px] text-black/40 font-mono">
                    {`// Remember to set your provider key (${exportTarget?.envVar ?? "API_KEY"}) and Orbis keys (ORBIS_API_KEY / ORBIS_PROJECT_ID)`}
                  </p>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
