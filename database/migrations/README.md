# Database Migrations

This directory contains SQL migration scripts for the Orbis database.

## Running Migrations

### Option 1: Using psql (Command Line)

```bash
# Make sure you're in the project root
cd /Users/rahulthennarasu/Documents/GitHub/Orbis

# Run the migration
psql $DIRECT_CONNECTION -f database/migrations/001_add_tool_tracking_columns.sql
```

### Option 2: Using psql with .env file

```bash
# Load environment variables
source .env

# Run migration
psql $DIRECT_CONNECTION -f database/migrations/001_add_tool_tracking_columns.sql
```

### Option 3: Using Python script

```bash
# Run the migration script (we'll create this next)
python3.12 database/migrations/run_migration.py
```

---

## Migration 001: Add Tool Tracking Columns

**File**: `001_add_tool_tracking_columns.sql`

**Purpose**: Extends the `spans` table to support tracking of:
- HTTP/API calls
- CLI commands
- Database operations
- Custom tools
- Software usage

**Changes**:
- Adds `span_type` column to distinguish span types (llm, tool, http, cli, etc.)
- Adds HTTP-specific fields (method, URL, status code)
- Adds CLI-specific fields (command, exit code, stdout, stderr)
- Adds tool-specific fields (tool name, category)
- Adds database-specific fields (query, operation, type)
- Adds `tool_metadata` JSONB column for flexible metadata storage
- Creates indexes for better query performance

**Backward Compatible**: Yes
- All new columns are nullable
- Existing spans are updated to have `span_type='llm'`
- Existing queries will continue to work

---

## Rollback

If you need to undo the migration:

```bash
psql $DIRECT_CONNECTION -f database/migrations/001_add_tool_tracking_columns_rollback.sql
```

**Warning**: This will remove all tool tracking columns and their data!

---

## Verifying Migration

After running the migration, verify it worked:

```sql
-- Check if new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'spans'
  AND column_name IN ('span_type', 'http_url', 'cli_command', 'tool_name')
ORDER BY column_name;

-- Check indexes
SELECT indexname
FROM pg_indexes
WHERE tablename = 'spans'
  AND indexname LIKE 'idx_spans_%'
ORDER BY indexname;
```

Expected output:
```
 column_name  | data_type
--------------+-----------
 cli_command  | text
 http_url     | character varying
 span_type    | character varying
 tool_name    | character varying
```

---

## Testing After Migration

After running the migration, re-run your SDK tests:

```bash
cd observability_sdk/testing
python3.12 test_tool_decorator.py
python3.12 test_http_tracking.py
python3.12 test_cli_tracking.py
python3.12 test_quick_demo.py
```

Then check the database:

```sql
-- See all span types
SELECT span_type, COUNT(*)
FROM spans
GROUP BY span_type;

-- See tool spans
SELECT span_id, name, span_type, tool_name, tool_category
FROM spans
WHERE span_type = 'tool'
ORDER BY start_time DESC
LIMIT 10;

-- See HTTP spans
SELECT span_id, name, http_method, http_url, http_status_code
FROM spans
WHERE span_type = 'http'
ORDER BY start_time DESC
LIMIT 10;

-- See CLI spans
SELECT span_id, name, cli_command, cli_exit_code
FROM spans
WHERE span_type = 'cli'
ORDER BY start_time DESC
LIMIT 10;
```