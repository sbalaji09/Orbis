CREATE TABLE traces (
    trace_id INT PRIMARY KEY,
    start_time DATETIME,
    end_time DATETIME,
    duration INTERVAL NOT NULL,
    total_cost FLOAT,
    total_tokens INT,
    status VARCHAR(50),
    user_id INT
);

CREATE TABLE spans (
    span_id INT PRIMARY KEY,
    trace_id INTEGER REFERENCES traces(trace_id),
    parent_span_id INTEGER REFERENCES spans(span_id),
    start_time DATETIME,
    end_time DATETIME,
    duration INTERVAL NOT NULL,
    -- the input and output preview are just the first 200 characters of the input and output for quick viewing when displaying on the frontend DAG--
    input_preview VARCHAR(200),
    -- the input and output blob urls are used for storing the url at which the data is stored--
    input_blob_url VARCHAR(250),
    output_preview VARCHAR(200),
    output_blob_url VARCHAR(250),
    llm_model VARCHAR(50),
    prompt_tokens INT,
    completion_tokens INT,
    cost FLOAT,
    status VARCHAR(50),
    error_message VARCHAR(200),
);

CREATE TABLE prompt_versions (
    prompt_version_id INT PRIMARY KEY,
    name VARCHAR(50),
    version_number INT,
    s3_url VARCHAR(200),
    created_at DATETIME,
    is_active BOOLEAN,
);

CREATE TABLE evaluations (
    evaluation_id INT PRIMARY KEY,
    trace_id INTEGER REFERENCES traces(trace_id),
    evaluator_llm VARCHAR(200),
    score INT
);


CREATE INDEX idx_traces_user_id ON traces(user_id);
CREATE INDEX idx_spans_trace_id ON spans(trace_id);
CREATE INDEX idx_spans_parent_span_id ON spans(parent_span_id);
CREATE INDEX idx_spans_status ON spans(status);
CREATE INDEX idx_prompt_versions_version_number ON prompt_versions(version_number);
CREATE INDEX idx_evaluations_trace_id ON evaluations(trace_id);
