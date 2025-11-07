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
    input_preview VARCHAR(200),
    input_blob_url VARCHAR(250),
    output_preview VARCHAR(200),
    output_blob_url VARCHAR(250),
    status VARCHAR(50),
    llm_model VARCHAR(50),
    prompt_tokens INT,
    completion_tokens INT,
    cost FLOAT,
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