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
    api_key TEXT
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
    error_message VARCHAR(200)
);

CREATE TABLE prompt_versions (
    prompt_version_id UUID PRIMARY KEY,
    name VARCHAR(50),
    version_number INT,
    s3_url VARCHAR(200),
    created_at TIMESTAMP,
    is_active BOOLEAN
);

CREATE TABLE evaluations (
    evaluation_id UUID PRIMARY KEY,
    trace_id UUID REFERENCES traces(trace_id),
    evaluator_llm VARCHAR(200),
    score INT
);

-- Create indexes
CREATE INDEX idx_traces_user_id ON traces(user_id);
CREATE INDEX idx_traces_agent_id ON traces(agent_id);
CREATE INDEX idx_spans_trace_id ON spans(trace_id);
CREATE INDEX idx_spans_status ON spans(status);
CREATE INDEX idx_prompt_versions_version_number ON prompt_versions(version_number);
CREATE INDEX idx_evaluations_trace_id ON evaluations(trace_id);
CREATE UNIQUE INDEX idx_agents_api_key ON agents(api_key);
