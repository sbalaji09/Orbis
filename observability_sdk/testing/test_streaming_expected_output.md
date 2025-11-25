# Expected Streaming Test Output (With Real API Keys)

This document shows what you would see when running streaming tests with real OpenAI and Anthropic API keys.

## OpenAI Streaming Test

### Console Output
```
🚀 TEST 1: OpenAI Streaming Story Generation
----------------------------------------------------------------------
📡 Streaming response:
Once upon a time, in a small village nestled between mountains...
span queued: openai.gpt-4o-mini          ← LLM span created
span queued: openai_streaming_story      ← Decorator span created
```

### SDK Span Data Sent
```json
{
  "trace_id": "abc123...",
  "span_id": "def456...",
  "parent_span_id": ["parent789..."],
  "name": "openai.gpt-4o-mini",          ← OpenAI LLM span
  "model": "gpt-4o-mini",
  "input_tokens": 25,
  "output_tokens": 52,
  "total_cost": 0.0000345,               ← $0.15/1M input, $0.60/1M output
  "is_streaming": true,                  ← Streaming flag
  "time_to_first_token": 145.23,         ← Milliseconds
  "tokens_per_second": 187.4,            ← Tokens/sec
  "status": "success"
}
```

### Dashboard View
```
TRACE: openai_streaming_story
└── openai.gpt-4o-mini
    Status: ✅ SUCCESS
    Duration: 1.2s
    Cost: $0.0000345
    🌊 STREAMING
    ⚡ TTFT: 145ms
    🚀 Speed: 187 tok/s
    Tokens: 25 → 52
```

---

## Anthropic Streaming Test

### Console Output
```
🚀 TEST 1: Anthropic Streaming Story Generation
----------------------------------------------------------------------
📡 Streaming response:
In the heart of Silicon Valley, a team of engineers...
span queued: anthropic.claude-sonnet-4-20250514    ← LLM span created
span queued: anthropic_streaming_story             ← Decorator span created
```

### SDK Span Data Sent
```json
{
  "trace_id": "xyz789...",
  "span_id": "uvw456...",
  "parent_span_id": ["parent123..."],
  "name": "anthropic.claude-sonnet-4-20250514",
  "model": "claude-sonnet-4-20250514",
  "input_tokens": 28,
  "output_tokens": 68,
  "total_cost": 0.001104,                ← $3/1M input, $15/1M output  
  "is_streaming": true,
  "time_to_first_token": 223.45,         ← Milliseconds
  "tokens_per_second": 156.8,            ← Tokens/sec
  "status": "success"
}
```

### Dashboard View
```
TRACE: anthropic_streaming_story
└── anthropic.claude-sonnet-4-20250514
    Status: ✅ SUCCESS
    Duration: 1.8s
    Cost: $0.001104
    🌊 STREAMING
    ⚡ TTFT: 223ms
    🚀 Speed: 157 tok/s
    Tokens: 28 → 68
```

---

## Key Differences: Streaming vs Non-Streaming

| Metric | Streaming | Non-Streaming |
|--------|-----------|---------------|
| `is_streaming` | `true` | `false` |
| `time_to_first_token` | 100-500ms | `null` |
| `tokens_per_second` | 100-300 | `null` |
| User Experience | Progressive | Wait for complete |
| Total Duration | Same | Same |

---

## What Mock Tests Verify

Our current mock tests successfully verify:
✅ Span creation and completion logic
✅ Error handling in finally blocks  
✅ Token counting from response usage
✅ Cost calculations
✅ Parent-child relationships
✅ Context propagation

❌ Cannot verify without API keys:
- Actual LLM span creation (requires real API call)
- Real network timing
- Actual provider responses

---

## To Test With Real API Keys

1. Get API keys from OpenAI and Anthropic
2. Set environment variables:
```bash
   export OPENAI_API_KEY="sk-..."
   export ANTHROPIC_API_KEY="sk-ant-..."
```
3. Run:
```bash
   python3.12 observability_sdk/testing/test_openai_real.py
   python3.12 observability_sdk/testing/test_anthropic_real.py
```
4. Check dashboard at http://localhost:3000
5. Verify LLM spans show streaming metrics