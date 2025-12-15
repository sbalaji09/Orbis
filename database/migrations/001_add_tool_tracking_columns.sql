-- Migration: Add Tool Tracking Columns to Spans Table
-- Description: Extends the spans table to support tracking of tools, HTTP calls, CLI commands, and software usage
-- Date: 2025-12-15

-- Add span_type column to distinguish between different span types
ALTER TABLE spans ADD COLUMN IF NOT EXISTS span_type VARCHAR(50) DEFAULT 'llm';

-- Add general tool metadata column (JSONB for flexibility)
ALTER TABLE spans ADD COLUMN IF NOT EXISTS tool_metadata JSONB;

-- HTTP/API call fields
ALTER TABLE spans ADD COLUMN IF NOT EXISTS http_method VARCHAR(10);
ALTER TABLE spans ADD COLUMN IF NOT EXISTS http_url VARCHAR(500);
ALTER TABLE spans ADD COLUMN IF NOT EXISTS http_status_code INT;
ALTER TABLE spans ADD COLUMN IF NOT EXISTS api_name VARCHAR(100);

-- Database operation fields
ALTER TABLE spans ADD COLUMN IF NOT EXISTS db_type VARCHAR(50);
ALTER TABLE spans ADD COLUMN IF NOT EXISTS db_operation VARCHAR(50);
ALTER TABLE spans ADD COLUMN IF NOT EXISTS db_query TEXT;

-- CLI/Software fields
ALTER TABLE spans ADD COLUMN IF NOT EXISTS software_name VARCHAR(100);
ALTER TABLE spans ADD COLUMN IF NOT EXISTS software_type VARCHAR(50);
ALTER TABLE spans ADD COLUMN IF NOT EXISTS cli_command TEXT;
ALTER TABLE spans ADD COLUMN IF NOT EXISTS cli_exit_code INT;
ALTER TABLE spans ADD COLUMN IF NOT EXISTS cli_stdout TEXT;
ALTER TABLE spans ADD COLUMN IF NOT EXISTS cli_stderr TEXT;

-- Custom tool fields
ALTER TABLE spans ADD COLUMN IF NOT EXISTS tool_name VARCHAR(100);
ALTER TABLE spans ADD COLUMN IF NOT EXISTS tool_category VARCHAR(50);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_spans_span_type ON spans(span_type);
CREATE INDEX IF NOT EXISTS idx_spans_software_name ON spans(software_name);
CREATE INDEX IF NOT EXISTS idx_spans_tool_name ON spans(tool_name);
CREATE INDEX IF NOT EXISTS idx_spans_http_url ON spans(http_url);
CREATE INDEX IF NOT EXISTS idx_spans_tool_category ON spans(tool_category);

-- Update existing spans to have span_type='llm' (for backward compatibility)
UPDATE spans SET span_type = 'llm' WHERE span_type IS NULL;

-- Add comment to table
COMMENT ON COLUMN spans.span_type IS 'Type of span: llm, tool, http, database, cli, browser, function';
COMMENT ON COLUMN spans.tool_metadata IS 'Flexible JSONB field for additional tool-specific metadata';
COMMENT ON COLUMN spans.http_method IS 'HTTP method for API calls: GET, POST, PUT, DELETE, etc.';
COMMENT ON COLUMN spans.http_url IS 'URL for HTTP/API calls';
COMMENT ON COLUMN spans.http_status_code IS 'HTTP response status code';
COMMENT ON COLUMN spans.cli_command IS 'Shell command executed';
COMMENT ON COLUMN spans.cli_exit_code IS 'Exit code of CLI command (0 = success)';
COMMENT ON COLUMN spans.tool_name IS 'Name of the custom tool';
COMMENT ON COLUMN spans.tool_category IS 'Category of tool: search, calculator, api, etc.';