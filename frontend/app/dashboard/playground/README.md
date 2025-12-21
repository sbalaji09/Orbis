# Model Playground

A powerful comparison tool for testing and evaluating multiple AI models side-by-side with real-time metrics and cost analysis.

## Features

- **Multi-Model Comparison**: Compare up to 4 models simultaneously
- **Provider Logos**: Quickly identify provider/model at a glance
- **Cost + Performance Metrics**: Tokens, latency, and estimated USD cost per model
- **Diff Mode**: Line-by-line output diffs and metric deltas (tokens/cost/time) vs a baseline/previous run
- **Guardrails**: Lightweight checks (JSON validity, must-contain keywords, max latency, max cost)
- **Replay From Trace**: Load a real production trace as a baseline to re-run and compare
- **Baseline Library**: Save approved runs and reload them later (stored in browser localStorage)
- **Run History + A/B Compare**: Keep the last 10 runs and diff any two runs (A vs B)
- **Regression Report**: One-click report table (pass/fail + deltas) across selected models
- **Smart Caching**: In-memory LRU cache (1-hour TTL) prevents duplicate API calls and saves credits
- **Code Export**: Provider-aware exports (Python/TypeScript/cURL) + VS Code Dark+ syntax highlighting
- **Error Handling**: Graceful error display with retry logic

## Supported Models

| Model | Provider | Input Cost | Output Cost |
|-------|----------|------------|-------------|
| Grok 4.1 Fast | xAI | $0.20/M tokens | $0.50/M tokens |
| GPT-4o | OpenAI | $2.50/M tokens | $10.00/M tokens |
| Llama 3.3 70B | Groq | $0.59/M tokens | $0.79/M tokens |
| Gemini 2.5 Flash Lite | Google | $0.10/M tokens | $0.40/M tokens |
| Mistral Large | Mistral AI | $0.50/M tokens | $1.50/M tokens |
| Claude 3.5 Sonnet | Anthropic | $3.00/M tokens | $15.00/M tokens |

## Setup

### 1. Install Dependencies

Dependencies are installed in `frontend` (including `openai`, `react-markdown`, and `shiki` for code highlighting).

```bash
cd frontend
npm install
```

### 2. Configure API Keys

Add your API keys to `frontend/.env.local`:

```bash
# Model API Keys for Playground
OPENAI_API_KEY=sk-...
XAI_API_KEY=xai-...
GROQ_API_KEY=gsk_...
MISTRAL_API_KEY=...
ANTHROPIC_API_KEY=...
GEMINI_API_KEY=...
```

### Optional: Demo/Sandbox Keys (Orbis-hosted)

If you want the playground to work for new users *without* them pasting keys immediately, you can configure server-side demo keys.

These are read only by the Next.js server (never exposed to the browser):

```bash
# Optional: Orbis demo keys (fallback if the main key is missing)
ORBIS_DEMO_GROQ_API_KEY=gsk_...
ORBIS_DEMO_OPENAI_API_KEY=sk-...
ORBIS_DEMO_XAI_API_KEY=xai-...
ORBIS_DEMO_MISTRAL_API_KEY=...
ORBIS_DEMO_ANTHROPIC_API_KEY=...
ORBIS_DEMO_GEMINI_API_KEY=...
```

The API route will use `*_API_KEY` first, and fall back to `ORBIS_DEMO_*` if the primary key is not configured.

### Per-User Provider Keys (Supabase)

If you want users to connect provider keys in the UI (recommended), set up:

1) Run `frontend/supabase/provider_api_keys.sql` in the Supabase SQL editor.
2) Run `frontend/supabase/playground_persistence.sql` in the Supabase SQL editor (baselines, runs, last state).
3) Set `ORBIS_PROVIDER_KEYS_ENCRYPTION_KEY` on the Next.js server (base64-encoded 32 bytes).
   - Example command: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

When configured, the playground will use keys in this order:
1) `*_API_KEY` (BYOK server env)
2) `ORBIS_DEMO_*_API_KEY` (optional demo sandbox env)
3) Supabase-stored per-user key (via the Provider Keys panel)

#### Where to Get API Keys:

- **OpenAI**: https://platform.openai.com/api-keys
- **xAI (Grok)**: https://console.x.ai/
- **Groq**: https://console.groq.com/keys
- **Mistral AI**: https://console.mistral.ai/api-keys/
- **Anthropic (Claude)**: https://console.anthropic.com/
- **Gemini**: https://aistudio.google.com/app/apikey

### 3. Start the Development Server

```bash
npm run dev
```

Navigate to: http://localhost:3000/dashboard/playground

## Architecture

### Frontend Components

- **`PlaygroundClient.tsx`**: Main client component with state management
- **`InputPanel.tsx`**: Prompt input and model selection UI
- **`ModelComparison.tsx`**: Side-by-side output comparison view
- **`OutputCard.tsx`**: Individual model output display with metrics
- **`RegressionReport.tsx`**: Compact pass/fail table + metric deltas
- **`CodeExportModal.tsx`**: Export prompts as code
- **`TraceLoaderModal.tsx`**: Load prompts from trace history

### API Routes

#### `POST /api/playground/generate`
Generates responses from selected models in parallel.

**Request:**
```json
{
  "prompt": "Explain quantum computing",
  "models": ["gpt-4o", "grok-4-1", "claude-sonnet"]
}
```

**Response:**
```json
{
  "outputs": [
    {
      "model": { "id": "gpt-4o", "name": "GPT-4o", ... },
      "output": "Quantum computing is...",
      "inputTokens": 45,
      "outputTokens": 312,
      "latency": 2.4,
      "totalCost": 0.0000687,
      "timestamp": 1734567890123
    }
  ]
}
```

#### `GET /api/playground/traces`
Fetches recent traces with their prompts for quick loading.

**Response:**
```json
{
  "traces": [
    {
      "id": "trace-uuid",
      "timestamp": "2024-12-19T10:30:00Z",
      "prompt": "User's original prompt",
      "model": "gpt-4",
      "status": "success"
    }
  ]
}
```

#### `GET /api/playground/replay/:traceId`
Fetches a trace’s prompt and baseline output (used by “Replay & Set Baseline”).

Returns:
- `prompt` (extracted user prompt)
- `output` (extracted model output)
- `model/provider` + token/cost/latency (when available)

#### `POST /api/playground/highlight`
Server-side code highlighting for the Export modal (Shiki Dark+).

## Usage

### Basic Comparison

1. Enter a prompt in the text area
2. Select 1-4 models to compare
3. Click "Generate & Compare"
4. View side-by-side results with metrics

### Diff Mode

Diff Mode compares model outputs against a “compare-to” reference:
- **Baseline** (saved or replayed from a trace), if set
- Otherwise, the **previous run**, if available
- Or an **A/B compare** selection (Run B vs Run A)

Turn on “Diff Mode” in the Model Outputs section to see line diffs. Tokens/cost/time deltas appear under the quick metrics.

### Guardrails

Guardrails are lightweight checks that only affect pass/fail badges and the Regression Report (they do not change model generation):
- **Require JSON output**: passes if `JSON.parse(output)` succeeds
- **Must contain**: comma-separated substrings that must appear in the output
- **Max latency (s)**: fails if latency exceeds the threshold
- **Max cost ($)**: fails if cost exceeds the threshold

### Replay From Trace (Baseline)

1. Click "Load from Trace"
2. Select a recent trace
3. Click "Replay & Set Baseline"
4. Click Generate to rerun the same prompt and compare vs the baseline output

### Baseline Library

- Click "Save Current Run" to store an approved run as a baseline
- Click "Load" to set the baseline + restore the prompt/outputs

Baselines are stored in the browser via localStorage (not in Supabase yet).

### Run History + A/B Compare

- The last 10 runs are stored (localStorage)
- Rename runs for clarity
- Pick any two runs as **A** and **B**, then click “Compare A/B”
  - A becomes the “compare-to”
  - B becomes the current outputs

### Regression Report

Click “Run Report” to generate outputs and show a compact table:
- Guardrail pass/fail per model
- Metric deltas vs baseline/compare-to (when available)

### Exporting Code

1. Enter a prompt
2. Click "Export Code"
3. Select language (Python/TypeScript/cURL)
4. Copy the generated code

Exports are provider-aware (OpenAI-compatible base URLs for Groq/Mistral/xAI, Gemini separately, and native Anthropic for Claude).

## Error Handling

The playground includes comprehensive error handling:

- **API Key Missing**: Clear error message indicating which key is needed
- **Rate Limits**: Exponential backoff with up to 2 retries
- **Network Errors**: Graceful degradation - successful models display while failed ones show errors
- **Invalid Models**: User-friendly error messages

## Performance

- **Parallel Execution**: All model calls run simultaneously for faster results
- **Smart Caching**:
  - Caches responses by prompt + model combination (SHA-256 hash)
  - 1-hour TTL (time-to-live) with sliding window
  - Max 100 cached entries (LRU eviction)
  - Instant results for repeated prompts (no API calls)
  - Displays "Cached" badge on cached responses
  - Saves API credits and reduces latency to ~0s
- **Retry Logic**: Automatic retry with exponential backoff (1s, 2s delays)
- **Token Limits**: Capped at 1000 output tokens per request for cost control

## Cost Optimization

- **Real-time Cost Display**: See costs before and after generation
- **Efficiency Badges**: Highlights cheapest, fastest, and most efficient models
- **Token Tracking**: Input/output token breakdown per model

## Metrics Explained

- **Tokens**: Total input + output tokens used
- **Cost**: Actual cost in USD (input tokens × input rate + output tokens × output rate)
- **Latency**: Time from request to complete response
- **Efficiency**: Cost per 1000 tokens (lower is better)

## Troubleshooting

### "API key not configured" Error
- Verify the API key is set in `.env.local`
- Restart the Next.js dev server after adding keys
- Check that the key format is correct (starts with correct prefix)

### Slow Response Times
- Some models (OpenAI / Mistral) can be slower than others
- Groq typically responds fastest
- Network latency affects all models equally

### Traces Not Loading
- Ensure you're authenticated with Supabase
- Verify the backend API is running on port 8000
- Check that traces exist in your database

### Baselines / Runs Reset When Navigating
- The playground stores state in localStorage
- If you are in private browsing mode, storage may be cleared between navigations

## Development

### Adding a New Model

1. Add model config to `AVAILABLE_MODELS` in `PlaygroundClient.tsx`:
```typescript
{
  id: "new-model-id",
  name: "New Model",
  provider: "Provider Name",
  costPerInputToken: 0.000001,
  costPerOutputToken: 0.000002,
  color: "#hexcolor",
}
```

2. Add case to `callModel()` in `app/api/playground/generate/route.ts`:
```typescript
case "new-model-id":
  client = getNewProviderClient();
  modelName = "actual-model-name";
  break;
```

3. Add API key to `.env.local`:
```bash
NEW_PROVIDER_API_KEY=...
```

### Running Tests

```bash
# Test API endpoint directly
curl -X POST http://localhost:3000/api/playground/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello","models":["gpt-4o"]}'
```

## Security

- API keys are server-side only (not exposed to browser)
- API routes use Next.js middleware for authentication
- Trace data access is user-scoped via Supabase auth
- Baselines / run history are stored in localStorage (do not store secrets in prompts)

## Future Enhancements

- [ ] Persist baselines/runs to Supabase for cross-device + team sharing
- [ ] Batch/dataset mode (CSV inputs, aggregates, pass rate)
- [x] More robust JSON guardrail (accept fenced JSON blocks)
- [ ] “Approve/promote” baseline flow with notes and audit trail
- [ ] Saved/shareable regression reports
