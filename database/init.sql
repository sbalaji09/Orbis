-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS evaluations CASCADE;
DROP TABLE IF EXISTS spans CASCADE;
DROP TABLE IF EXISTS traces CASCADE;
DROP TABLE IF EXISTS prompt_versions CASCADE;
DROP TABLE IF EXISTS agents CASCADE;

-- Create agents table first (referenced by traces)
CREATE TABLE agents (
    agent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    agent_name VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    api_key TEXT,
    retention_days INT,
    archive_retention_days INT,
    retention_enabled BOOLEAN
);

-- Create prompt_versions before spans (spans references prompt_versions)
CREATE TABLE prompt_versions (
    prompt_id UUID PRIMARY KEY,
    name VARCHAR(50),
    version_number INT,
    s3_url VARCHAR(200),
    created_at TIMESTAMP,
    is_active BOOLEAN,
    agent_id UUID REFERENCES agents(agent_id),
    prompt_hash TEXT,
    content_preview TEXT,
    metadata JSONB,
    parent_version_id UUID
);

-- Create tables with UUID for trace_id and span_id
CREATE TABLE traces (
    trace_id UUID PRIMARY KEY,
    trace_hash_id TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration FLOAT DEFAULT 0,
    total_cost FLOAT DEFAULT 0,
    total_tokens INT DEFAULT 0,
    status VARCHAR(50),
    user_id UUID,
    agent_id UUID REFERENCES agents(agent_id)
);

CREATE TABLE traces_archive (
    trace_archive_id UUID PRIMARY KEY,
    trace_hash_id TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration FLOAT DEFAULT 0,
    total_cost FLOAT DEFAULT 0,
    total_tokens INT DEFAULT 0,
    status VARCHAR(50),
    user_id UUID,
    agent_id UUID REFERENCES agents(agent_id),
    archived_at TIMESTAMP
);

CREATE TABLE spans (
    span_id UUID PRIMARY KEY,
    trace_id UUID REFERENCES traces(trace_id),
    parent_span_ids UUID[],
    name VARCHAR(100),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration FLOAT,
    input_preview VARCHAR(200),
    input_blob_url VARCHAR(250),
    output_preview VARCHAR(200),
    output_blob_url VARCHAR(250),
    llm_model VARCHAR(50),
    prompt_tokens INT,
    completion_tokens INT,
    cost FLOAT,
    status VARCHAR(50),
    error_message VARCHAR(200),
    is_streaming BOOLEAN DEFAULT FALSE,
    time_to_first_token FLOAT,
    tokens_per_second FLOAT,
    prompt_id UUID REFERENCES prompt_versions(prompt_id),
    prompt_name VARCHAR(50),
    prompt_version TEXT,
    prompt_hash TEXT,
    span_type VARCHAR,
    tool_metadata JSONB,
    http_method VARCHAR,
);

CREATE TABLE spans_archive (
    span_archive_id UUID PRIMARY KEY,
    trace_id UUID,  -- No FK constraint: traces may be in traces or traces_archive
    parent_span_ids UUID[],
    name VARCHAR(100),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration FLOAT,
    input_preview VARCHAR(200),
    input_blob_url VARCHAR(250),
    output_preview VARCHAR(200),
    output_blob_url VARCHAR(250),
    llm_model VARCHAR(50),
    prompt_tokens INT,
    completion_tokens INT,
    cost FLOAT,
    status VARCHAR(50),
    error_message VARCHAR(200),
    is_streaming BOOLEAN DEFAULT FALSE,
    time_to_first_token FLOAT,
    tokens_per_second FLOAT,
    prompt_id UUID,  -- No FK: prompt_versions may be deleted
    prompt_name VARCHAR(50),
    prompt_version TEXT,
    prompt_hash TEXT,
    span_type VARCHAR,
    tool_metadata JSONB,
    http_method VARCHAR,
    archived_at TIMESTAMP
);

CREATE TABLE evaluations (
    evaluation_id UUID PRIMARY KEY,
    trace_id UUID REFERENCES traces(trace_id),
    evaluator_llm VARCHAR(200),
    score INT
);

CREATE TABLE daily_cost_aggregates (
    aggregate_id UUID PRIMARY KEY,
    user_id UUID,
    date TIMESTAMP,
    total_cost FLOAT,
    total_tokens FLOAT,
    by_model JSONB,
    UNIQUE(user_id, date)
)

-- Create indexes
CREATE INDEX idx_traces_user_id ON traces(user_id);
CREATE INDEX idx_traces_agent_id ON traces(agent_id);
CREATE INDEX idx_daily_cost_aggregates_user_date ON daily_cost_aggregates(user_id, date DESC);
CREATE INDEX idx_spans_trace_id ON spans(trace_id);
CREATE INDEX idx_spans_status ON spans(status);
CREATE INDEX idx_prompt_versions_version_number ON prompt_versions(version_number);
CREATE INDEX idx_evaluations_trace_id ON evaluations(trace_id);
CREATE UNIQUE INDEX idx_agents_api_key ON agents(api_key);
CREATE INDEX prompts_per_agent ON prompt_versions(agent_id, name);
CREATE INDEX prompt_analytics ON spans(prompt_id, prompt_version);
CREATE INDEX created_at ON spans(start_time);
CREATE INDEX archival_query ON spans(start_time, trace_id);

-- Archive table indexes
CREATE INDEX idx_spans_archive_trace_id ON spans_archive(trace_id);
CREATE INDEX idx_spans_archive_start_time ON spans_archive(start_time);
CREATE INDEX idx_traces_archive_agent_id ON traces_archive(agent_id);
CREATE INDEX idx_traces_archive_start_time ON traces_archive(start_time);