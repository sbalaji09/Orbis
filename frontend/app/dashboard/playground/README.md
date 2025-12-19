# Model Playground

A powerful comparison tool for testing and evaluating multiple AI models side-by-side with real-time metrics and cost analysis.

## Features

- **Multi-Model Comparison**: Compare up to 4 models simultaneously
- **Cost Analysis**: Real-time token usage and cost tracking per model
- **Performance Metrics**: Latency, tokens/second, and efficiency comparisons
- **Trace Integration**: Load prompts from your observability traces
- **Code Export**: Export prompts as code in Python, TypeScript, or cURL
- **Error Handling**: Graceful error display with retry logic

## Supported Models

| Model | Provider | Input Cost | Output Cost |
|-------|----------|------------|-------------|
| Grok 4.1 | xAI | $0.002/M tokens | $0.008/M tokens |
| GPT-5 (GPT-4o) | OpenAI | $0.005/M tokens | $0.015/M tokens |
| Llama 3.1 70B | Groq | $0.0005/M tokens | $0.0008/M tokens |
| Mistral Large | Mistral AI | $0.003/M tokens | $0.009/M tokens |
| DeepSeek V3 | DeepSeek | $0.0003/M tokens | $0.0006/M tokens |

## Setup

### 1. Install Dependencies

The OpenAI SDK has already been installed:

```bash
cd frontend
npm install openai
```

### 2. Configure API Keys

Add your API keys to `frontend/.env.local`:

```bash
# Model API Keys for Playground
OPENAI_API_KEY=sk-...
XAI_API_KEY=xai-...
GROQ_API_KEY=gsk_...
MISTRAL_API_KEY=...
DEEPSEEK_API_KEY=...
```

#### Where to Get API Keys:

- **OpenAI**: https://platform.openai.com/api-keys
- **xAI (Grok)**: https://console.x.ai/
- **Groq**: https://console.groq.com/keys
- **Mistral AI**: https://console.mistral.ai/api-keys/
- **DeepSeek**: https://platform.deepseek.com/api_keys

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
- **`CodeExportModal.tsx`**: Export prompts as code
- **`TraceLoaderModal.tsx`**: Load prompts from trace history

### API Routes

#### `POST /api/playground/generate`
Generates responses from selected models in parallel.

**Request:**
```json
{
  "prompt": "Explain quantum computing",
  "models": ["gpt-5", "grok-4-1", "deepseek-v3"]
}
```

**Response:**
```json
{
  "outputs": [
    {
      "model": { "id": "gpt-5", "name": "GPT-5", ... },
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

## Usage

### Basic Comparison

1. Enter a prompt in the text area
2. Select 1-4 models to compare
3. Click "Generate & Compare"
4. View side-by-side results with metrics

### Loading from Traces

1. Click "Load from Trace"
2. Select a recent trace from the list
3. The prompt will be loaded into the playground
4. Modify and test with different models

### Exporting Code

1. Enter a prompt
2. Click "Export Code"
3. Select language (Python/TypeScript/cURL)
4. Copy the generated code

Example Python export:
```python
from openai import OpenAI

client = OpenAI(api_key="your-api-key")

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "user", "content": "Your prompt here"}
    ]
)

print(response.choices[0].message.content)
```

## Error Handling

The playground includes comprehensive error handling:

- **API Key Missing**: Clear error message indicating which key is needed
- **Rate Limits**: Exponential backoff with up to 2 retries
- **Network Errors**: Graceful degradation - successful models display while failed ones show errors
- **Invalid Models**: User-friendly error messages

## Performance

- **Parallel Execution**: All model calls run simultaneously for faster results
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
- Some models (GPT-5/GPT-4o) are slower than others
- Groq and DeepSeek typically respond fastest
- Network latency affects all models equally

### Traces Not Loading
- Ensure you're authenticated with Supabase
- Verify the backend API is running on port 8000
- Check that traces exist in your database

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
  -d '{"prompt":"Hello","models":["gpt-5"]}'
```

## Security

- API keys are server-side only (not exposed to browser)
- API routes use Next.js middleware for authentication
- Trace data access is user-scoped via Supabase auth
- No sensitive data stored in frontend state

## Future Enhancements

- [ ] User-specific cost tracking and limits
- [ ] Playground run history in database
- [ ] Model response quality ratings
- [ ] Batch testing multiple prompts
- [ ] A/B testing framework
- [ ] Custom model configurations
- [ ] Response caching for identical prompts
