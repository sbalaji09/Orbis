# Orbis Codebase Analysis

## 1. How the SDK Auto-Instruments OpenAI/Anthropic Calls

The Orbis SDK uses monkey patching to automatically instrument LLM API calls. This is implemented in the integrations modules:

### OpenAI Instrumentation (`observability_sdk/integrations/openai_integration.py`)

- **Monkey Patching**: The `OpenAIInstrumentor` class patches `completions.Completions.create` at the class level using `functools.wraps`
- **Span Creation**: For each API call, creates a `Span` object with:
  - `name`: `"openai.{model}"`
  - `span_type`: `"llm"`
  - `model`, `prompt`, `is_streaming` metadata
  - Inherits `trace_id` and sets `parent_span_id` from current context
- **Streaming Handling**: Wraps streaming responses with `_wrap_openai_stream()` which:
  - Tracks `time_to_first_token`
  - Accumulates full content
  - Extracts token usage from final chunk
  - Calculates `tokens_per_second`
- **Cost Calculation**: Uses pricing tables for different OpenAI models, calculating cost as `(input_tokens/1M) * input_rate + (output_tokens/1M) * output_rate`
- **Context Propagation**: Sets span as current context during execution

### Anthropic Instrumentation (`observability_sdk/integrations/anthropic_integration.py`)

- **Similar Approach**: Patches `anthropic.resources.messages.Messages.create`
- **Event-Based Streaming**: Handles Anthropic's event types (`content_block_delta`, `message_start`, `message_delta`)
- **Token Extraction**: Pulls tokens from `message_start` and `message_delta` events
- **Cost Calculation**: Uses Anthropic pricing tables with input/output rates per 1M tokens

### Global Instrumentation

Both instrumentors are exposed via `instrument_all()` / `uninstrument_all()` functions that enable/disable all LLM providers simultaneously.

## 2. How Spans Are Created and Parent IDs Are Attached

Spans are created in `observability_sdk/core/span.py` as a dataclass with comprehensive metadata fields.

### Span Creation Process

```python
span = Span(
    name=f"openai.{model}",
    span_type="llm",
    user_id=config.user_id,
    agent_id=config.project_id,
    model=model,
    prompt=extract_prompt_from_messages(messages),
    is_streaming=is_streaming,
)
```

### Parent ID Attachment

- **Context Inheritance**: Uses `get_current_span()` to get parent context
- **Trace Continuity**: If parent exists, inherits `trace_id` and sets `parent_span_id = [parent.span_id]`
- **Context Setting**: Calls `set_current_span(span)` to make current span active for child spans
- **Async Safety**: Uses `ContextVar` for thread-safe context propagation

### Span Lifecycle

- **Initialization**: `status = "running"`, records `start_time` and `_start_perf`
- **Completion**: `complete(status)` sets `end_time`, calculates `duration_ms`, sets final status
- **Serialization**: `to_dict()` converts to JSON with all metadata fields

## 3. How Context Is Propagated Across Async Boundaries

Context propagation uses Python's `contextvars` module for async-safe span tracking.

### Core Implementation (`observability_sdk/core/context.py`)

```python
from contextvars import ContextVar

_current_span: ContextVar[Optional[Span]] = ContextVar('current_span', default=None)

def get_current_span() -> Optional[Span]:
    return _current_span.get()

def set_current_span(span: Optional[Span]) -> None:
    _current_span.set(span)
```

### Async Propagation Flow

1. **Span Creation**: New span inherits parent's `trace_id` and sets `parent_span_id`
2. **Context Setting**: `set_current_span(span)` stores span in `ContextVar`
3. **Nested Operations**: Child operations automatically inherit context via `ContextVar`
4. **Automatic Cleanup**: Context is automatically propagated across `await` boundaries
5. **Exception Safety**: `finally` blocks restore previous context

### Instrumentation Pattern

```python
parent_span = get_current_span()
set_current_span(span)

try:
    # Execute instrumented code
    result = await some_async_operation()  # Context preserved across await
finally:
    set_current_span(parent_span)  # Restore context
```

## 4. How the DAG Is Reconstructed from Spans

The DAG (Directed Acyclic Graph) is reconstructed on the frontend using parent-child relationships stored in spans.

### Frontend Reconstruction (`frontend/components/TraceGraphClient.tsx`)

#### `calculateDAGLayout()` Function

1. **Level Calculation**: Recursively determines depth level for each span based on `parent_span_ids`

   ```typescript
   function getLevel(spanId: string): number {
     const span = spanMap.get(spanId);
     if (!span.parent_span_ids?.length) return 0;
     const maxParentLevel = Math.max(...span.parent_span_ids.map(getLevel));
     return maxParentLevel + 1;
   }
   ```

2. **Grouping by Level**: Groups spans by their calculated depth level

3. **Node Positioning**: Positions nodes horizontally within levels, vertically between levels
   - `horizontalSpacing = 280px`
   - `verticalSpacing = 200px`
   - Centers levels horizontally

#### Edge Creation

- **ReactFlow Integration**: Uses ReactFlow library for graph rendering
- **Automatic Edges**: Creates edges from child nodes to parent nodes based on `parent_span_ids`
- **Visual Styling**: Uses span type colors and markers for edge connections

#### Real-time Updates

- **Polling**: Fetches spans every 2 seconds via SWR
- **Layout Recalculation**: Recalculates DAG layout when spans change
- **WebSocket**: Receives real-time span updates for live graph updates

## 5. How API Keys Are Encrypted and Stored

API keys use a multi-layer security approach combining hashing, caching, and database storage.

### Key Generation (`backend/profile_api.py`)

```python
def generate_key_with_string(input_string: str) -> str:
    random_bytes = secrets.token_bytes(16)
    combined = input_string.encode('utf-8') + random_bytes
    api_key = base64.urlsafe_b64encode(combined).decode('utf-8')
    return api_key
```

### Storage Security

#### Database Storage

- **Hashing**: API keys are hashed using `bcrypt` before database storage
- **Schema**: Stored as `TEXT` in `agents.api_key` column
- **Verification**: `bcrypt.checkpw()` for authentication

#### Redis Caching

- **Plaintext Cache**: Plaintext keys cached in Redis for fast auth lookup
- **Cache Keys**:
  - `api_key:{plaintext}` → `user_id`
  - `api_key_agent:{plaintext}` → `agent_id`
- **Secure Cache Keys**: Cache lookup keys use SHA256 hash with secret salt
  ```python
  def hash_api_key_for_cache(api_key: str) -> str:
      return hashlib.sha256(f"{CACHE_SECRET}:{api_key}".encode()).hexdigest()
  ```

### Authentication Flow

1. **Fast Path**: Check Redis cache with hashed key
2. **Slow Path**: Query database, verify bcrypt hash against all agent keys
3. **Cache Population**: Store successful auth results in Redis with TTL

### Security Features

- **No Plaintext Persistence**: Plaintext keys only exist in memory/transit
- **Bcrypt Hashing**: Slow, salted hashing resistant to rainbow table attacks
- **Cache Invalidation**: Keys can be invalidated across Redis instances
- **TTL Expiration**: Cached entries expire automatically
