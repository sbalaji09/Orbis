# Tool Tracking: Complete Implementation & User Experience Guide

## User Experience: Before & After

### BEFORE (Current State)
Users can only track LLM calls:

```python
# test_openai_groq.py (current example)
from orbis import observe
from openai import OpenAI

client = OpenAI()

@observe(name="chat_completion")
def ask_gpt(question: str):
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": question}]
    )
    return response.choices[0].message.content

# Only the LLM call is tracked
ask_gpt("What is Python?")
```

**Result**: 1 span showing GPT call with tokens, cost, latency

### AFTER (With Tool Tracking)
Users can track LLM calls + tools/APIs/software:

```python
from orbis import observe, observe_tool, instrument_http
import httpx
import subprocess

# Enable HTTP auto-instrumentation
instrument_http(httpx)

@observe_tool(name="github_api", category="http")
def get_github_user(username: str):
    """This will be tracked as a 'tool' span"""
    response = httpx.get(f"https://api.github.com/users/{username}")
    return response.json()

@observe_tool(name="git_status", category="cli")
def check_git_status():
    """This will be tracked as a 'cli' span"""
    result = subprocess.run(["git", "status"], capture_output=True, text=True)
    return result.stdout

@observe(name="my_agent_workflow")
def run_agent():
    # 1. LLM call - tracked automatically
    advice = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": "Should I check GitHub?"}]
    )

    # 2. HTTP API call - tracked automatically (because we called instrument_http)
    user_data = httpx.get("https://api.github.com/users/octocat").json()

    # 3. Custom tool - tracked with @observe_tool
    github_user = get_github_user("octocat")

    # 4. CLI command - tracked with @observe_tool
    git_status = check_git_status()

    # 5. Another LLM call - tracked automatically
    summary = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": f"Summarize: {github_user}"}]
    )

    return summary

run_agent()
```

**Result**: 1 trace with 5 spans:
1. Span (LLM): GPT-4 advice
2. Span (HTTP): httpx GET request
3. Span (Tool/HTTP): GitHub API call
4. Span (Tool/CLI): git status command
5. Span (LLM): GPT-4 summary

Each span shows type-specific metadata!

---

## What Changes Where

### 1. SDK Changes (observability_sdk/)

#### File: `observability_sdk/core/span.py`
**What changes**: Add new fields to the Span dataclass

**Why**: Need to store tool-specific metadata (HTTP status, CLI output, DB queries, etc.)

**New fields added**:
```python
@dataclass
class Span:
    # ... existing fields ...

    # NEW FIELDS
    span_type: str = "llm"  # Type of span
    http_url: Optional[str] = None  #  For HTTP calls
    http_status_code: Optional[int] = None
    cli_command: Optional[str] = None  # For CLI tools
    cli_exit_code: Optional[int] = None
    db_query: Optional[str] = None  # For database calls
    tool_name: Optional[str] = None  # For custom tools
    tool_metadata: Optional[Dict] = None  # Flexible metadata
```

**Backward compatible**: Existing LLM-only code still works because all new fields are `Optional`

---

#### NEW File: `observability_sdk/decorators/observe_tool.py`
**What it does**: Provides `@observe_tool()` decorator for custom tools

**User API**:
```python
from orbis import observe_tool

@observe_tool(name="web_search", category="search")
def search_google(query: str) -> str:
    # Your tool code here
    results = call_google_api(query)
    return results
```

**What it does internally**:
1. Creates a Span with `span_type="tool"`
2. Sets `tool_name="web_search"`
3. Captures input (`query`) and output (`results`)
4. Sends span to data pipeline (same as LLM spans)

---

#### NEW File: `observability_sdk/integrations/http_integration.py`
**What it does**: Auto-instruments HTTP libraries (httpx, requests)

**User API**:
```python
from orbis import instrument_http
import httpx

# Enable auto-tracking for all httpx calls
instrument_http(httpx)

# Now this is automatically tracked as a span!
response = httpx.get("https://api.github.com/users/octocat")
```

**How it works**:
1. Monkey-patches `httpx.get()`, `httpx.post()`, etc.
2. Wraps each call in span creation
3. Captures: URL, method, status code, latency
4. Sends span to data pipeline

**Implementation approach** (similar to how you already wrap OpenAI):
```python
import httpx

_original_get = httpx.get
_original_post = httpx.post

def _tracked_get(url, **kwargs):
    span = Span(
        name=f"httpx.GET",
        span_type="http",
        http_url=url,
        http_method="GET"
    )

    try:
        response = _original_get(url, **kwargs)
        span.http_status_code = response.status_code
        span.output_data = response.text[:200]  # Preview
        span.complete(status="success")
        return response
    except Exception as e:
        span.set_error(e)
        span.complete(status="error")
        raise
    finally:
        get_collector().collect(span)

# Monkey-patch
httpx.get = _tracked_get
httpx.post = _tracked_post  # Similar implementation
```

---

#### NEW File: `observability_sdk/integrations/cli_integration.py`
**What it does**: Track CLI command execution

**User API**:
```python
from orbis import observe_cli

@observe_cli(name="git_operations")
def deploy():
    run_command("git pull origin main")
    run_command("docker build -t myapp .")
    run_command("kubectl apply -f deployment.yaml")
```

**Or use helper function**:
```python
from orbis import run_tracked_command

# Automatically creates a span for this CLI command
output = run_tracked_command("git status")
```

---

### 2. Database Changes (database/init.sql)

#### What changes: Add new columns to `spans` table

**SQL Migration**:
```sql
-- Add new columns for tool tracking
ALTER TABLE spans ADD COLUMN IF NOT EXISTS span_type VARCHAR(50) DEFAULT 'llm';
ALTER TABLE spans ADD COLUMN IF NOT EXISTS tool_metadata JSONB;
ALTER TABLE spans ADD COLUMN IF NOT EXISTS http_method VARCHAR(10);
ALTER TABLE spans ADD COLUMN IF NOT EXISTS http_url VARCHAR(500);
ALTER TABLE spans ADD COLUMN IF NOT EXISTS http_status_code INT;
ALTER TABLE spans ADD COLUMN IF NOT EXISTS db_type VARCHAR(50);
ALTER TABLE spans ADD COLUMN IF NOT EXISTS db_query TEXT;
ALTER TABLE spans ADD COLUMN IF NOT EXISTS software_name VARCHAR(100);
ALTER TABLE spans ADD COLUMN IF NOT EXISTS cli_command TEXT;
ALTER TABLE spans ADD COLUMN IF NOT EXISTS cli_exit_code INT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_spans_span_type ON spans(span_type);
CREATE INDEX IF NOT EXISTS idx_spans_software_name ON spans(software_name);
```

**Why these are needed**:
- Store tool-specific metadata alongside LLM metadata
- Query spans by type (e.g., "show me all HTTP calls")
- Analyze tool performance separately

**Backward compatible**: All new columns are nullable, existing LLM spans still work

---

### 3. Backend Changes (backend/)

#### File: `backend/db_connection.py`
**What changes**: Update `insert_span()` function to handle new fields

**Current code** (simplified):
```python
def insert_span(span_data: dict):
    cursor.execute("""
        INSERT INTO spans (span_id, trace_id, name, model, prompt_tokens, ...)
        VALUES (%s, %s, %s, %s, %s, ...)
    """, (span_data['span_id'], span_data['trace_id'], ...))
```

**Updated code**:
```python
def insert_span(span_data: dict):
    # Handle both LLM spans and tool spans
    cursor.execute("""
        INSERT INTO spans (
            span_id, trace_id, name,
            model, prompt_tokens,  -- LLM fields
            span_type, http_url, http_status_code,  -- Tool fields
            cli_command, cli_exit_code,
            tool_metadata  -- Catch-all JSON
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        span_data.get('span_id'),
        span_data.get('trace_id'),
        span_data.get('name'),
        span_data.get('model'),  # Will be None for non-LLM spans
        span_data.get('prompt_tokens'),  # Will be None for non-LLM spans
        span_data.get('span_type', 'llm'),  # Default to llm
        span_data.get('http_url'),  # Will be None for non-HTTP spans
        span_data.get('http_status_code'),
        span_data.get('cli_command'),  # Will be None for non-CLI spans
        span_data.get('cli_exit_code'),
        json.dumps(span_data.get('tool_metadata', {}))  # JSONB for flexibility
    ))
```

**Why**: Backend needs to persist the new fields from SDK

---

#### File: `backend/query_api.py`
**What changes**: Add new endpoints for tool analytics

**New endpoints**:
```python
# Get tool usage statistics
@app.get("/api/agents/{agent_id}/tool-usage")
def get_tool_usage(agent_id: str):
    """Returns: {tool_name: count, avg_latency, error_rate}"""

# Get spans filtered by type
@app.get("/api/traces/{trace_id}/spans?span_type=http")
def get_spans_by_type(trace_id: str, span_type: str):
    """Returns all HTTP spans in a trace"""

# Get performance breakdown
@app.get("/api/traces/{trace_id}/performance-breakdown")
def get_performance_breakdown(trace_id: str):
    """Returns: {llm: 30%, http: 50%, cli: 20%}"""
```

---

### 4. Data Pipeline Changes (data-pipeline/)

#### File: `data-pipeline/worker.py`
**What changes**: Update span processing logic to handle different span types

**Current code** (simplified):
```python
def process_span(span_data):
    # Calculate LLM cost
    cost = calculate_llm_cost(span_data['model'], span_data['input_tokens'])
    span_data['total_cost'] = cost
    return span_data
```

**Updated code**:
```python
def process_span(span_data):
    span_type = span_data.get('span_type', 'llm')

    if span_type == 'llm':
        # Calculate LLM cost
        cost = calculate_llm_cost(span_data['model'], span_data['input_tokens'])
        span_data['total_cost'] = cost

    elif span_type == 'http':
        # Track HTTP metrics
        track_api_usage(span_data['http_url'])
        if span_data.get('http_status_code', 0) >= 500:
            flag_api_error(span_data)

    elif span_type == 'cli':
        # Track CLI usage
        if span_data.get('cli_exit_code', 0) != 0:
            flag_cli_error(span_data)

    return span_data
```

**Why**: Different span types need different processing logic

---

### 5. Frontend Changes (frontend/)

#### File: `frontend/src/components/TraceDAG.tsx`
**What changes**: Update DAG visualization to show different span types with different colors/icons

**Current code**: All spans look the same (blue, brain icon)

**Updated code**:
```tsx
function getSpanStyle(span: Span) {
  switch(span.span_type) {
    case 'llm':
      return { color: 'blue', icon: '🧠', label: span.model };
    case 'http':
      return { color: 'green', icon: '🌐', label: span.http_url };
    case 'cli':
      return { color: 'purple', icon: '⚙️', label: span.cli_command };
    case 'database':
      return { color: 'orange', icon: '🗄️', label: span.db_type };
    default:
      return { color: 'gray', icon: '⚡', label: span.name };
  }
}
```

**Visual result**:
```
┌─────────────┐
│ 🧠 GPT-4    │  (Blue - LLM span)
└──────┬──────┘
       │
       ├─► ┌────────────────┐
       │   │ 🌐 GitHub API  │  (Green - HTTP span)
       │   └────────────────┘
       │
       └─► ┌────────────────┐
           │ ⚙️ git status  │  (Purple - CLI span)
           └────────────────┘
```

---

#### File: `frontend/src/components/SpanDetailView.tsx`
**What changes**: Show different metadata based on span type

**Current code**: Always shows LLM fields (prompt, tokens, model)

**Updated code**:
```tsx
function SpanDetailView({ span }: { span: Span }) {
  return (
    <div>
      <h3>{span.name}</h3>
      <p>Duration: {span.duration}ms</p>

      {span.span_type === 'llm' && (
        <>
          <p>Model: {span.model}</p>
          <p>Tokens: {span.input_tokens} → {span.output_tokens}</p>
          <p>Cost: ${span.total_cost}</p>
        </>
      )}

      {span.span_type === 'http' && (
        <>
          <p>Method: {span.http_method}</p>
          <p>URL: {span.http_url}</p>
          <p>Status: {span.http_status_code}</p>
        </>
      )}

      {span.span_type === 'cli' && (
        <>
          <p>Command: {span.cli_command}</p>
          <p>Exit Code: {span.cli_exit_code}</p>
          <p>Output: <pre>{span.cli_stdout}</pre></p>
        </>
      )}
    </div>
  );
}
```

---

## Testing: Step-by-Step

### Test 1: HTTP Tool Tracking

Create: `observability_sdk/testing/test_http_tracking.py`

```python
from orbis import observe, instrument_http
import httpx

# Enable HTTP tracking
instrument_http(httpx)

@observe(name="test_github_api")
def test_http_tool():
    # This HTTP call will be automatically tracked as a span
    response = httpx.get("https://api.github.com/users/octocat")
    return response.json()

if __name__ == "__main__":
    result = test_http_tool()
    print("Done! Check your Orbis dashboard")
```

**Run**:
```bash
python observability_sdk/testing/test_http_tracking.py
```

**Expected result in dashboard**:
- 1 trace with 2 spans:
  1. Parent span: `test_github_api` (function)
  2. Child span: `httpx.GET https://api.github.com/users/octocat` (HTTP)
    - Shows: URL, status code 200, latency

---

### Test 2: CLI Tool Tracking

Create: `observability_sdk/testing/test_cli_tracking.py`

```python
from orbis import observe, run_tracked_command

@observe(name="test_git_commands")
def test_cli_tool():
    # This CLI command will be tracked as a span
    status = run_tracked_command("git status")
    log = run_tracked_command("git log --oneline -5")
    return f"Status: {status}\nLog: {log}"

if __name__ == "__main__":
    result = test_cli_tool()
    print("Done! Check your Orbis dashboard")
```

**Expected result in dashboard**:
- 1 trace with 3 spans:
  1. Parent: `test_git_commands` (function)
  2. Child 1: `git status` (CLI)
  3. Child 2: `git log --oneline -5` (CLI)

---

### Test 3: Combined LLM + Tools

Create: `observability_sdk/testing/test_agent_with_tools.py`

```python
from orbis import observe, instrument_http
from openai import OpenAI
import httpx

client = OpenAI()
instrument_http(httpx)

@observe(name="research_agent")
def research_github_user(username: str):
    # 1. LLM decides what to do
    plan = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": f"I need info about GitHub user {username}"}]
    )

    # 2. HTTP API call to GitHub
    user_data = httpx.get(f"https://api.github.com/users/{username}").json()

    # 3. LLM summarizes the data
    summary = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": f"Summarize this user: {user_data}"}]
    )

    return summary.choices[0].message.content

if __name__ == "__main__":
    result = research_github_user("octocat")
    print(result)
    print("\nCheck your Orbis dashboard!")
```

**Expected result in dashboard**:
- 1 trace with 4 spans:
  1. Parent: `research_agent` (function)
  2. Child 1: GPT-4 call (LLM) - planning
  3. Child 2: GET https://api.github.com/users/octocat (HTTP)
  4. Child 3: GPT-4 call (LLM) - summarization

**DAG visualization**:
```
┌───────────────────┐
│ research_agent    │
└────────┬──────────┘
         │
         ├─► ┌──────────────┐
         │   │ 🧠 GPT-4     │ (planning)
         │   └──────────────┘
         │
         ├─► ┌──────────────┐
         │   │ 🌐 GitHub API│
         │   └──────────────┘
         │
         └─► ┌──────────────┐
             │ 🧠 GPT-4     │ (summarize)
             └──────────────┘
```

---

## Summary: What Changes

| Component | What Changes | Why | Backward Compatible? |
|-----------|-------------|-----|---------------------|
| **SDK - span.py** | Add tool fields to Span dataclass | Store tool metadata | ✅ Yes (all fields Optional) |
| **SDK - observe_tool.py** | NEW decorator for custom tools | User-friendly API | ✅ N/A (new feature) |
| **SDK - http_integration.py** | NEW auto-instrumentation for HTTP | Track API calls | ✅ N/A (opt-in) |
| **SDK - cli_integration.py** | NEW CLI tracking | Track shell commands | ✅ N/A (opt-in) |
| **Database - init.sql** | Add columns to spans table | Persist tool data | ✅ Yes (nullable columns) |
| **Backend - db_connection.py** | Update INSERT query | Handle new fields | ✅ Yes (checks for None) |
| **Backend - query_api.py** | Add tool analytics endpoints | Query tool usage | ✅ N/A (new endpoints) |
| **Data Pipeline - worker.py** | Add tool processing logic | Process tools differently | ✅ Yes (checks span_type) |
| **Frontend - TraceDAG.tsx** | Different colors for span types | Visual distinction | ✅ Yes (defaults to existing) |
| **Frontend - SpanDetailView.tsx** | Conditional rendering by type | Show relevant fields | ✅ Yes (checks span_type) |

---

## Implementation Order

1. **Phase 1: SDK Foundation** (Week 1)
   - Update `span.py` with new fields
   - Create `observe_tool.py` decorator
   - Test with simple custom tools

2. **Phase 2: HTTP Tracking** (Week 1-2)
   - Create `http_integration.py`
   - Test with httpx/requests
   - Verify spans are created

3. **Phase 3: Database** (Week 2)
   - Run SQL migration
   - Update `db_connection.py`
   - Verify spans are stored

4. **Phase 4: Frontend** (Week 3)
   - Update DAG visualization
   - Update span detail view
   - Test end-to-end

5. **Phase 5: Advanced Features** (Week 4)
   - CLI tracking
   - Tool analytics dashboard
   - Performance breakdown charts

---

## Can This Be Done?

**YES**, and here's why:

1. **You already do tool tracking in LangChain integration**
   - See `langchain_integration.py` lines 231-307 - you track LangChain tools
   - This is the same concept, just generalized

2. **Architecture supports it**
   - Spans already have a flexible structure
   - Data pipeline already processes different span types
   - Frontend already renders DAG from span data

3. **Minimal breaking changes**
   - All new fields are optional
   - Existing LLM tracking continues to work
   - Tool tracking is opt-in (users call `instrument_http()`)

4. **Similar to existing features**
   - `instrument_http()` is like your existing OpenAI/Anthropic integration
   - `@observe_tool()` is like `@observe()`
   - Just extending existing patterns

**Main work**:
- SDK: ~200 lines for HTTP instrumentation
- Database: 10-line migration
- Backend: Update 2 functions
- Frontend: Update 2 components

**Total estimate**: 1-2 weeks for full implementation with testing
