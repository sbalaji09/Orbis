# Tool Tracking Tests

This directory contains test scripts for the new tool tracking features in Orbis SDK.

## Prerequisites

### 1. Install Dependencies

```bash
# Required for all tests
pip install httpx

# Required for comprehensive agent test
pip install openai
```

### 2. Set OpenAI API Key (for comprehensive test only)

```bash
export OPENAI_API_KEY="your-api-key-here"
```

### 3. Start Data Pipeline (Backend)

Make sure your Orbis data pipeline is running on `http://localhost:8000/ingest`

```bash
# From the project root
docker-compose up
# OR run the data pipeline directly
```

## Running the Tests

### Test 1: HTTP Tracking

Tests automatic tracking of HTTP requests using httpx.

```bash
cd observability_sdk/testing
python test_http_tracking.py
```

**What it tests:**
- ✓ Automatic tracking of `httpx.get()` calls
- ✓ Automatic tracking of `httpx.post()` calls
- ✓ Capture of URL, method, status code
- ✓ Multiple HTTP calls in one trace

**Expected output:**
- 1 trace with 4 spans (1 function + 3 HTTP calls)
- Each HTTP span shows: method, URL, status code

---

### Test 2: Custom Tool Decorator

Tests the `@observe_tool` decorator for tracking custom tools.

```bash
cd observability_sdk/testing
python test_tool_decorator.py
```

**What it tests:**
- ✓ `@observe_tool` decorator
- ✓ Different tool categories (calculator, text, analytics)
- ✓ Capture of tool inputs and outputs
- ✓ Multiple tool calls in one trace

**Expected output:**
- 1 trace with 5 spans (1 function + 4 custom tools)
- Each tool span shows: name, category, input, output

---

### Test 3: CLI Command Tracking

Tests tracking of shell commands using `run_tracked_command()`.

```bash
cd observability_sdk/testing
python test_cli_tracking.py
```

**What it tests:**
- ✓ `run_tracked_command()` utility
- ✓ Capture of command, exit code, stdout, stderr
- ✓ Common CLI commands (pwd, ls, python, git)

**Expected output:**
- 1 trace with 6 spans (1 function + 5 CLI commands)
- Each CLI span shows: command, exit code, output

---

### Test 4: Comprehensive Agent Test (RECOMMENDED)

Tests a real AI agent workflow combining LLM + Tools + HTTP + CLI.

```bash
cd observability_sdk/testing
python test_agent_with_tools.py
```

**What it tests:**
- ✓ LLM tracking (OpenAI GPT-3.5)
- ✓ HTTP tracking (GitHub API via httpx)
- ✓ Custom tools (`@observe_tool`)
- ✓ CLI tracking (`run_tracked_command`)
- ✓ Proper span nesting and hierarchy

**Expected output:**
- 1 trace with ~8-10 spans showing complete agent workflow:
  1. Parent: research_github_user_agent (function)
  2. Child 1: OpenAI call (LLM - planning)
  3. Child 2: github_user_lookup (tool)
     - Grandchild: httpx.GET (HTTP)
  4. Child 3: repo_counter (tool)
  5. Child 4: git_check (tool)
     - Grandchild: cli.git (CLI)
  6. Child 5: OpenAI call (LLM - summary)

**This is the BEST test** to see all features working together!

---

## Viewing Results

### Option 1: Orbis Dashboard (Recommended)

Go to your Orbis dashboard and you should see:

1. **Traces Page**: New traces for each test
2. **Trace Detail Page**: Click a trace to see the DAG visualization
3. **DAG Visualization**: See the span hierarchy with different types
4. **Span Details**: Click a span to see type-specific metadata:
   - LLM spans: model, tokens, cost, prompt, completion
   - HTTP spans: method, URL, status code
   - Tool spans: tool name, category, input, output
   - CLI spans: command, exit code, stdout, stderr

### Option 2: Console Output

Each test prints:
- What it's doing in real-time
- Success indicators (✓)
- Expected dashboard results

### Option 3: Database (For Debugging)

Query the `spans` table directly:

```sql
-- See all span types
SELECT span_type, COUNT(*)
FROM spans
GROUP BY span_type;

-- See HTTP spans
SELECT name, http_method, http_url, http_status_code
FROM spans
WHERE span_type = 'http';

-- See CLI spans
SELECT name, cli_command, cli_exit_code
FROM spans
WHERE span_type = 'cli';

-- See tool spans
SELECT name, tool_name, tool_category
FROM spans
WHERE span_type = 'tool';
```

---

## Troubleshooting

### Issue: "httpx not installed"
```bash
pip install httpx
```

### Issue: "openai not installed"
```bash
pip install openai
```

### Issue: "Connection refused to localhost:8000"
Make sure your Orbis data pipeline is running:
```bash
docker-compose up
```

### Issue: "OpenAI API key not set"
```bash
export OPENAI_API_KEY="sk-your-key-here"
```

### Issue: Spans not appearing in database

Check:
1. Is the data pipeline running?
2. Is Redis running?
3. Is PostgreSQL running?
4. Check data pipeline logs for errors

### Issue: Database schema errors

You may need to run the database migration first (see next section).

---

## What's Next?

After successfully running these SDK tests, you'll need to:

1. **Update Database Schema** - Add new columns to support tool tracking
2. **Update Backend** - Modify `db_connection.py` to handle new span fields
3. **Update Frontend** - Modify DAG visualization to show different span types

See `TOOL_TRACKING_IMPLEMENTATION_PLAN.md` for the full implementation roadmap.

---

## Expected Behavior Summary

| Test | Traces | Spans | Span Types |
|------|--------|-------|------------|
| HTTP Tracking | 1 | 4 | function, http (3x) |
| Tool Decorator | 1 | 5 | function, tool (4x) |
| CLI Tracking | 1 | 6 | function, cli (5x) |
| **Comprehensive Agent** | **1** | **~10** | **function, llm (2x), http, tool (3x), cli** |

The comprehensive agent test is the most realistic and demonstrates how all features work together in a real AI agent workflow!