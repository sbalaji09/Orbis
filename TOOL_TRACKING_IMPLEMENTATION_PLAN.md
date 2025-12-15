# Tool & Software Tracking Implementation Plan

## Overview
Extend Orbis to track not just LLM calls, but also:
- Tool/API calls (HTTP requests, database queries, vector databases)
- Software usage (CLI tools, browser automation, desktop apps)
- Custom functions and operations

This provides **complete observability** for AI agents.

## 1. Extended Span Data Model

### Current State
- Spans only track LLM-specific fields (model, tokens, cost)
- Database schema focuses on LLM metrics

### New Span Types
```python
span_type: str  # "llm", "tool", "http", "database", "cli", "browser", "function"
```

### Type-Specific Fields

#### HTTP/API Calls
- `http_method`: str (GET, POST, etc.)
- `http_url`: str
- `http_status_code`: int
- `http_headers`: dict (optional, sanitized)
- `api_name`: str (e.g., "stripe", "github", "slack")
- `rate_limit_remaining`: int (optional)

#### Database Operations
- `db_type`: str (postgresql, mongodb, pinecone, redis)
- `db_operation`: str (SELECT, INSERT, UPDATE, DELETE)
- `db_query`: str
- `db_rows_affected`: int
- `db_host`: str

#### CLI/Software
- `software_name`: str (git, docker, npm, kubectl)
- `software_type`: str (cli_tool, desktop_app, browser_automation)
- `cli_command`: str
- `cli_exit_code`: int
- `cli_stdout`: str (truncated)
- `cli_stderr`: str (truncated)

#### Browser Automation
- `browser_type`: str (chromium, firefox, webkit)
- `browser_url`: str
- `browser_actions`: list (click, type, navigate)
- `screenshots`: list[str] (S3 URLs)

#### Custom Tools
- `tool_name`: str
- `tool_input`: dict
- `tool_output`: dict
- `tool_category`: str (search, calculator, custom)

## 2. Database Schema Changes

### New Columns for `spans` Table
```sql
ALTER TABLE spans ADD COLUMN span_type VARCHAR(50) DEFAULT 'llm';
ALTER TABLE spans ADD COLUMN tool_metadata JSONB;
ALTER TABLE spans ADD COLUMN http_method VARCHAR(10);
ALTER TABLE spans ADD COLUMN http_url VARCHAR(500);
ALTER TABLE spans ADD COLUMN http_status_code INT;
ALTER TABLE spans ADD COLUMN db_type VARCHAR(50);
ALTER TABLE spans ADD COLUMN db_operation VARCHAR(50);
ALTER TABLE spans ADD COLUMN db_query TEXT;
ALTER TABLE spans ADD COLUMN software_name VARCHAR(100);
ALTER TABLE spans ADD COLUMN software_type VARCHAR(50);
ALTER TABLE spans ADD COLUMN cli_command TEXT;
ALTER TABLE spans ADD COLUMN cli_exit_code INT;

CREATE INDEX idx_spans_span_type ON spans(span_type);
CREATE INDEX idx_spans_software_name ON spans(software_name);
CREATE INDEX idx_spans_http_url ON spans(http_url);
```

### Backward Compatibility
- All new columns are nullable
- Default `span_type='llm'` for existing rows
- Existing LLM-only spans continue to work

## 3. SDK Implementation

### 3.1 HTTP Auto-Instrumentation

```python
# observability_sdk/integrations/http_integration.py

def instrument_http(library='httpx'):
    """
    Auto-instrument HTTP libraries (httpx, requests)

    Usage:
        from orbis import instrument_http
        instrument_http('httpx')

        # Now all HTTP calls are tracked
        response = httpx.get('https://api.github.com/users/octocat')
    """
```

### 3.2 CLI Tool Tracking

```python
# observability_sdk/integrations/cli_integration.py

@observe_cli()
def run_command(command: str):
    """
    Track CLI command execution

    Usage:
        run_command('git status')
        run_command('docker build -t myapp .')
    """
```

### 3.3 Database Instrumentation

```python
# observability_sdk/integrations/database_integration.py

def instrument_database(db_type='postgresql'):
    """
    Auto-instrument database clients

    Supports:
    - PostgreSQL (psycopg2, asyncpg)
    - MongoDB (pymongo)
    - Redis (redis-py)
    - Pinecone, Weaviate (vector DBs)
    """
```

### 3.4 Custom Tool Decorator

```python
# observability_sdk/decorators/observe_tool.py

@observe_tool(name="web_search", category="search")
def search_web(query: str) -> str:
    """Custom tool tracking"""
    results = call_search_api(query)
    return results
```

## 4. Backend Processing

### Update `worker.py` / Data Pipeline
- Process different span types appropriately
- Extract metrics by span type
- Calculate costs for paid APIs (not just LLMs)

### Update `db_connection.py`
- Insert tool metadata into JSONB column
- Handle new span fields
- Create helper functions for querying by span type

## 5. Frontend Visualization

### DAG Enhancements
- Different colors/icons for span types:
  - LLM: Blue, brain icon 🧠
  - HTTP: Green, globe icon 🌐
  - Database: Orange, database icon 🗄️
  - CLI: Purple, terminal icon ⚙️
  - Browser: Teal, browser icon 🌐
  - Function: Gray, function icon ⚡

### Span Detail View
- Conditional rendering based on `span_type`
- LLM spans: show prompts, tokens, model
- HTTP spans: show method, URL, status, headers
- Database spans: show query, rows, duration
- CLI spans: show command, exit code, output

### New Dashboards
1. **Tool Usage Dashboard**
   - Most frequently used tools
   - Average latency by tool
   - Error rates by tool

2. **Performance Breakdown**
   - Time spent in LLM vs Tools
   - Bottleneck identification

3. **Cost Analysis**
   - LLM costs vs API costs
   - Most expensive tools

## 6. Real-World Examples

### Example 1: DevOps Agent
```python
from orbis import observe, instrument_http, instrument_cli

instrument_cli()
instrument_http()

@observe(name="deploy_to_production")
def deploy():
    # Git operations - auto-tracked
    run_command("git pull origin main")

    # Tests - auto-tracked
    run_command("pytest tests/")

    # Docker - auto-tracked
    run_command("docker build -t myapp:v2.0 .")
    run_command("docker push myapp:v2.0")

    # Kubernetes - auto-tracked
    run_command("kubectl set image deployment/myapp myapp=myapp:v2.0")

    # Slack notification - auto-tracked HTTP
    httpx.post("https://hooks.slack.com/services/...",
               json={"text": "Deployed v2.0"})
```

Result: Complete trace showing every step of deployment

### Example 2: Customer Service Agent
```python
@observe(name="process_refund")
def process_refund(order_id: str):
    # Database lookup - tracked
    order = db.query(f"SELECT * FROM orders WHERE id = {order_id}")

    # API call - tracked
    refund = stripe.refunds.create(charge=order['charge_id'])

    # Email - tracked
    sendgrid.send(to=order['email'], subject="Refund processed")

    return refund
```

## 7. Implementation Priority

### Phase 1 (Week 1): Core Infrastructure
- [x] Update Span data model
- [ ] Create database migration
- [ ] Update backend insertion logic

### Phase 2 (Week 2): HTTP & CLI Tracking
- [ ] HTTP auto-instrumentation (httpx, requests)
- [ ] CLI command tracking
- [ ] Example scripts

### Phase 3 (Week 3): Database & Custom Tools
- [ ] Database instrumentation
- [ ] Custom tool decorator
- [ ] More examples

### Phase 4 (Week 4): Frontend & Analytics
- [ ] Update DAG visualization
- [ ] Tool usage dashboard
- [ ] Performance analytics

## 8. Competitive Advantage

**Current competitors** (LangSmith, Helicone, Braintrust):
- ✓ Track LLM calls
- ✗ Track tool/API calls (limited)

**Orbis**:
- ✓ Track LLM calls
- ✓ Track ANY tool/API call
- ✓ Track software usage
- ✓ Complete agent workflow visibility
- ✓ Performance bottleneck detection across entire stack
- ✓ Cost breakdown for all operations

This is especially valuable as agents become more complex and spend MORE time using tools than calling LLMs.

## 9. Success Metrics

After implementation, users can answer:
1. "Which tool in my agent workflow is the slowest?"
2. "How much do my API calls cost vs my LLM calls?"
3. "What's the success rate of each tool?"
4. "Which tools does my agent use most frequently?"
5. "Where are the bottlenecks in my agent workflow?"

Currently, these questions are impossible to answer without tool tracking.
