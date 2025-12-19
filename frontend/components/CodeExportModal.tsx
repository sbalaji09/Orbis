import { useState, Fragment } from "react";
import {
  Dialog,
  Transition,
  TransitionChild,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
}

type Language = "python" | "typescript" | "curl";

const generateCode = (language: Language, prompt: string): string => {
  switch (language) {
    case "python":
      return `import openai

# Configure your API client
client = openai.OpenAI(
    api_key="YOUR_API_KEY_HERE"
)

# Your prompt
prompt = """${prompt}"""

# Call the model
response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "user", "content": prompt}
    ],
    temperature=0.7,
    max_tokens=1000
)

# Get the response
output = response.choices[0].message.content
print(output)

# Get usage information
print(f"Tokens used: {response.usage.total_tokens}")
print(f"Input tokens: {response.usage.prompt_tokens}")
print(f"Output tokens: {response.usage.completion_tokens}")`;

    case "typescript":
      return `import OpenAI from "openai";

// Configure your API client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Your prompt
const prompt = \`${prompt}\`;

// Call the model
async function generateCompletion() {
  const response = await client.chat.completions.create({
    model: "gpt-4",
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
      return `curl https://api.openai.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \\
  -d '{
    "model": "gpt-4",
    "messages": [
      {
        "role": "user",
        "content": "${prompt.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"
      }
    ],
    "temperature": 0.7,
    "max_tokens": 1000
  }'`;

    default:
      return "";
  }
};

export function CodeExportModal({ isOpen, onClose, prompt }: CodeExportModalProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("python");
  const [copied, setCopied] = useState(false);

  const code = generateCode(selectedLanguage, prompt);

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
                    <pre className="p-4 bg-foreground text-background border-2 border-black font-mono text-xs overflow-x-auto max-h-[500px] overflow-y-auto">
                      {code}
                    </pre>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t-2 border-black bg-background">
                  <p className="text-[10px] text-black/40 font-mono">
                    {`// Remember to replace YOUR_API_KEY_HERE with your actual API key`}
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