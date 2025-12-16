-- Rollback Migration: Remove Tool Tracking Columns from Spans Table
-- Description: Removes all tool tracking columns added in migration 001
-- Date: 2025-12-15

-- Drop indexes first
DROP INDEX IF EXISTS idx_spans_span_type;
DROP INDEX IF EXISTS idx_spans_software_name;
DROP INDEX IF EXISTS idx_spans_tool_name;
DROP INDEX IF EXISTS idx_spans_http_url;
DROP INDEX IF EXISTS idx_spans_tool_category;

-- Drop columns
ALTER TABLE spans DROP COLUMN IF EXISTS span_type;
ALTER TABLE spans DROP COLUMN IF EXISTS tool_metadata;
ALTER TABLE spans DROP COLUMN IF EXISTS http_method;
ALTER TABLE spans DROP COLUMN IF EXISTS http_url;
ALTER TABLE spans DROP COLUMN IF EXISTS http_status_code;
ALTER TABLE spans DROP COLUMN IF EXISTS api_name;
ALTER TABLE spans DROP COLUMN IF EXISTS db_type;
ALTER TABLE spans DROP COLUMN IF EXISTS db_operation;
ALTER TABLE spans DROP COLUMN IF EXISTS db_query;
ALTER TABLE spans DROP COLUMN IF EXISTS software_name;
ALTER TABLE spans DROP COLUMN IF EXISTS software_type;
ALTER TABLE spans DROP COLUMN IF EXISTS cli_command;
ALTER TABLE spans DROP COLUMN IF EXISTS cli_exit_code;
ALTER TABLE spans DROP COLUMN IF EXISTS cli_stdout;
ALTER TABLE spans DROP COLUMN IF EXISTS cli_stderr;
ALTER TABLE spans DROP COLUMN IF EXISTS tool_name;
ALTER TABLE spans DROP COLUMN IF EXISTS tool_category;