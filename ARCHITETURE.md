# Orbis Architecture and Feature Breakdown

This document captures the current architecture and feature surface of Orbis, with deeper detail on:
- `observability_sdk` (instrumentation and span pipeline)
- LLM Playground (`frontend/app/dashboard/playground` + related API routes)

## 1. High-Level System Architecture

Orbis is split into 4 core layers:

1. SDK Layer (`observability_sdk`)
- Instruments app code, LLM calls, and tool operations.
- Builds span objects with trace context and metadata.
- Buffers and ships spans to ingestion API.

2. Ingestion + Processing Layer (`data-pipeline`)
- Accepts spans at `POST /span`.
- Authenticates API keys, enforces tenant identity and rate limits.
- Queues spans for asynchronous processing and persistence.
- Hosts websocket endpoints for real-time updates.

3. Query/API Layer (`backend/query_api.py` + backend routers)
- Exposes read APIs for traces/spans/metrics.
- Enforces auth and per-user access boundaries.
- Includes prompt/versioning and profile APIs.

4. Frontend Layer (`frontend`)
- Dashboard, trace views, analytics, prompt tooling.
- LLM Playground for side-by-side model evaluation and replay.
- Supabase-authenticated persistence for user keys and playground state.

## 2. Current Product Features (Broad)

### Observability and Tracing
- Trace and span capture with parent-child relationships.
- Span lifecycle fields (`running/success/error`, duration, errors).
- LLM metadata capture (model, prompt/input, output, tokens, cost).
- Span type taxonomy (`function`, `llm`, `tool`, `http`, `database`, `cli`, etc.).
- Streaming metrics (`is_streaming`, `time_to_first_token`, `tokens_per_second`).

### Prompt Versioning
- Prompt registration and hash-based change detection.
- Backend persistence of prompt versions.
- Semantic versioning logic in backend.
- Prompt diff and prompt family/version retrieval APIs.

### Frontend Analytics and Trace UX
- Trace list, graph views, filtering/search.
- Cost/token charts and anomaly-related components.
- Prompt sidebars, prompt comparison, version indicators.

### Security and Multi-Tenant Boundaries
- Supabase JWT auth for frontend/backend query routes.
- API key auth for SDK/agent ingestion path.
- Tenant ownership checks in trace/prompt/profile paths.
- RLS policies for Supabase playground/provider-key tables.

## 3. SDK Architecture (`observability_sdk`) - Detailed

### 3.1 Core building blocks

1. Span model (`observability_sdk/core/span.py`)
- Canonical payload for all instrumentation paths.
- Includes:
  - Identity/context: `trace_id`, `span_id`, `parent_span_id`, `user_id`, `agent_id`
  - Timing/status: `start_time`, `end_time`, `duration_ms`, `status`, `error_message`
  - LLM fields: `model`, `prompt`, `output`, token/cost fields
  - Streaming fields: TTFT/tokens-per-second
  - Prompt versioning fields: `prompt_id`, `prompt_name`, `prompt_version`, `prompt_hash`
  - Tool/http/db/cli metadata fields

2. Context propagation (`observability_sdk/core/context.py`)
- Uses `ContextVar` to track the currently active span.
- Enables nested spans and parent linkage.

3. Collector and transport (`observability_sdk/collector/collector.py`)
- Background worker thread + queue.
- Batching and periodic flush.
- Per-span POST to ingestion endpoint (`{api_url}/span`).
- Optional gzip compression for larger payloads.
- Retry behavior for network/server errors.

4. Runtime config (`observability_sdk/collector/config.py`)
- Env-driven or programmatic config via `configure(...)`.
- Controls API URL/key, batch size, flush interval, retries, compression, debug, auto-flush on root span.

### 3.2 Instrumentation APIs

1. `@observe` decorator (`observability_sdk/decorators/observe.py`)
- Wraps user functions as `span_type="function"` spans.
- Captures args/kwargs as input and return value as output.
- Preserves parent context if nested.
- Supports prompt metadata registration hooks.

2. `@observe_tool` decorator (`observability_sdk/decorators/observe_tool.py`)
- Wraps custom tool-style operations.
- Captures structured `tool_input`/`tool_output`.
- Allows category + span type customization.

3. Provider auto-instrumentation (`observability_sdk/integrations/*`)
- OpenAI, Anthropic, Gemini, xAI, Groq, Mistral, DeepSeek + LangChain callback path.
- Monkey patches provider SDK client calls.
- Captures model/prompt/output/tokens/cost and streaming metrics.
- `instrument_all()` / `uninstrument_all()` available.

4. Non-LLM operational instrumentation
- HTTP tracking (`instrument_http` export).
- CLI tracking (`run_tracked_command` export).

### 3.3 SDK prompt versioning flow

1. `PromptRegistry.register_prompt(...)` creates/records prompt versions in memory.
2. Generates SHA-256 prompt hash.
3. Optionally persists to backend (`/prompts/prompts`) when `agent_id + api_key` are available.
4. Backend UUID can be attached back to spans for linkage.

### 3.4 SDK -> backend ingestion flow

1. Instrumented code creates a span.
2. Span is completed and serialized (`to_dict`).
3. Collector queues and flushes span(s) to ingestion API.
4. API key is sent in `X-API-Key` header when configured.

## 4. Ingestion and Query Backends

### 4.1 Ingestion API (`data-pipeline/ingestion_api.py`)
- Primary write endpoint: `POST /span`.
- Validates auth, rate limits, UUID formats, and tenant identity.
- Accepts extended span schema (prompt versioning + tool tracking fields).
- Integrates prompt router.

### 4.2 Data pipeline workers and queues
- Redis queue modules for async processing.
- Worker consumes queued spans and persists to DB.
- DLQ and inspection tooling present.

### 4.3 Query API (`backend/query_api.py`)
- `GET /traces` with pagination/status filter.
- `GET /traces/{trace_id}`.
- `GET /traces/{trace_id}/spans`.
- Token-based auth dependency and access checks.
- Includes prompt + profile routers.

### 4.4 Realtime path
- Websocket server in `data-pipeline/websocket_server.py`.
- Endpoints include trace-scoped and dashboard scoped subscriptions.
- API key auth and trace ownership checks in websocket flow.

## 5. LLM Playground Architecture - Detailed

Main path:
- Page: `frontend/app/dashboard/playground/page.tsx`
- Client state/UI: `frontend/app/dashboard/playground/PlaygroundClient.tsx`
- API routes: `frontend/app/api/playground/*`

### 5.1 Core playground capabilities

1. Multi-model comparison
- Up to 4 models per run.
- Parallel backend generation calls.
- Side-by-side outputs with tokens/cost/latency.

2. Supported built-in model configs
- OpenAI `gpt-4o`
- xAI `grok-4-1`
- Groq `llama-3.3-70b-versatile`
- Google `gemini-2.5-flash-lite`
- Mistral `mistral-large`
- Anthropic `claude-sonnet` (mapped to Claude 3.5 Sonnet ID)

3. Custom model/provider support
- `customModels` payload allows provider + model name + optional token pricing.

4. Guardrails and regression workflows
- JSON output enforcement, must-contain terms, latency ceiling, cost ceiling.
- Regression report generation and compare labels.

5. Baselines, run history, and A/B compare
- Save/load baseline runs.
- Persist run history (last N, default 10 in UI behavior).
- Compare Run A vs Run B.

6. Replay from production traces
- Pull prompt/output from existing trace spans.
- Set replay as baseline and rerun against selected models.

7. Code export
- Provider-aware snippet generation in Python/TypeScript/cURL.
- Server-side syntax highlighting route (Shiki Dark+).

### 5.2 Playground generation route (`POST /api/playground/generate`)

Route file:
- `frontend/app/api/playground/generate/route.ts`

Behavior:
1. Validates request (`prompt`, `models`, max 4).
2. For each model, `callModel(...)` runs in parallel via `Promise.all`.
3. Provider-specific call strategy:
- Gemini uses Google Generative Language endpoint.
- Anthropic uses native Anthropic Messages endpoint.
- OpenAI-compatible providers use `openai` SDK with provider base URLs.
4. Tracks per-model:
- output text
- input/output token counts
- latency seconds
- estimated total cost from configured token rates
5. Retries failures with exponential backoff.
6. Returns partial model errors without failing entire batch.

### 5.3 Playground caching

File:
- `frontend/lib/playground-cache.ts`

Current implementation:
- In-memory LRU cache on server runtime.
- Key: SHA-256 of `modelId:prompt`.
- TTL: 1 hour.
- Capacity: 100 entries.
- Sliding expiration on read (`updateAgeOnGet`).

### 5.4 Provider key architecture (playground)

API route:
- `frontend/app/api/provider-keys/route.ts`

Resolution order for generation route:
1. Server environment key (`*_API_KEY`)
2. Demo environment fallback (`ORBIS_DEMO_*_API_KEY`)
3. User-saved provider key from Supabase (`provider_api_keys`)

Storage security:
- Keys encrypted server-side with AES-256-GCM envelope.
- Requires `ORBIS_PROVIDER_KEYS_ENCRYPTION_KEY` (base64 32-byte key).
- Supabase table only stores encrypted value.
- RLS policies restrict read/write/delete to owner.

### 5.5 Playground persistence architecture

Persisted entities (Supabase):
- `playground_state` (last UI state snapshot)
- `playground_baselines`
- `playground_runs`

Routes:
- `GET/POST /api/playground/state`
- `GET/POST/DELETE /api/playground/baselines`
- `GET/POST/DELETE /api/playground/runs`

Behavior:
- Authenticated users: server-side persistence enabled.
- Unauthenticated users: endpoints return 401, UI behaves without remote persistence.

### 5.6 Trace replay architecture

Routes:
- `GET /api/playground/traces`
- `GET /api/playground/replay/:traceId`

Flow:
1. Frontend route calls Query API (`/traces`, then `/traces/{id}/spans`) using Supabase bearer token headers.
2. Finds suitable LLM span.
3. Extracts prompt/output from inline fields or blob URLs (`inline://` decode or HTTP fetch).
4. Normalizes message-formatted payloads into plain prompt/output text.

## 6. End-to-End Data Flows

### Flow A: SDK instrumentation to dashboard visibility
1. User app runs with Orbis SDK instrumentation.
2. SDK emits spans to ingestion API.
3. Data pipeline validates and queues spans.
4. Worker writes traces/spans/aggregates to storage.
5. Query API serves trace/spans to frontend dashboard and replay routes.

### Flow B: Playground generation and evaluation
1. User selects models and submits prompt.
2. Playground generate route resolves provider credentials.
3. Model calls execute in parallel.
4. Outputs + metrics + costs are returned and optionally cached.
5. User saves run/baseline and can persist state/history in Supabase.
6. User can compare, diff, export code, or run regression checks.

## 7. Important Config Surfaces

### SDK/env
- `OBSERVABILITY_API_URL`
- `OBSERVABILITY_API_KEY`
- `OBSERVABILITY_PROJECT_ID`
- `OBSERVABILITY_USER_ID`
- batching/retry/compression flags in SDK config

### Frontend/playground env
- `OPENAI_API_KEY`, `XAI_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`
- `ORBIS_DEMO_*` equivalents for sandbox fallback
- `ORBIS_PROVIDER_KEYS_ENCRYPTION_KEY`
- `NEXT_PUBLIC_API_URL` for query/trace APIs

## 8. Notable Current Constraints and Observations

- Playground server cache is process-local in-memory (not shared across instances).
- Playground built-in model price tables are static in code; they may diverge from live provider pricing over time.
- Replay extraction is best-effort and depends on span field availability (`prompt`, previews, blob URLs).
- Mixed auth modes exist (JWT for dashboard/query; API keys for ingestion/SDK), which is intentional but operationally important.

## 9. Key Files (Quick Map)

SDK:
- `observability_sdk/core/span.py`
- `observability_sdk/decorators/observe.py`
- `observability_sdk/decorators/observe_tool.py`
- `observability_sdk/collector/collector.py`
- `observability_sdk/collector/config.py`
- `observability_sdk/integrations/__init__.py`
- `observability_sdk/core/prompt_versioning.py`

Ingestion + Query:
- `data-pipeline/ingestion_api.py`
- `data-pipeline/worker.py`
- `data-pipeline/websocket_server.py`
- `backend/query_api.py`
- `backend/prompt_api.py`
- `backend/auth_utils.py`

Playground:
- `frontend/app/dashboard/playground/PlaygroundClient.tsx`
- `frontend/app/api/playground/generate/route.ts`
- `frontend/app/api/playground/traces/route.ts`
- `frontend/app/api/playground/replay/[traceId]/route.ts`
- `frontend/app/api/playground/state/route.ts`
- `frontend/app/api/playground/runs/route.ts`
- `frontend/app/api/playground/baselines/route.ts`
- `frontend/app/api/provider-keys/route.ts`
- `frontend/lib/playground-cache.ts`
- `frontend/lib/provider-keys.server.ts`

DB SQL for playground/provider keys:
- `database/playground/provider_api_keys.sql`
- `database/playground/playground_persistence.sql`
