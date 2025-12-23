-- Migration: Add cost anomaly detection tables
-- Description: Creates tables for tracking cost anomalies and user alert preferences

-- Cost anomalies table - stores detected anomalies
CREATE TABLE IF NOT EXISTS cost_anomalies (
    anomaly_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    anomaly_type VARCHAR(50) NOT NULL,  -- 'daily_spike', 'trace_spike', 'runaway_loop', 'high_token_response'
    severity VARCHAR(20) NOT NULL,       -- 'info', 'warning', 'critical'

    -- Detection details
    detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    period_start TIMESTAMP,              -- Start of the period being compared
    period_end TIMESTAMP,                -- End of the period being compared

    -- Metrics that triggered the anomaly
    actual_value FLOAT NOT NULL,         -- The observed value (e.g., today's cost)
    expected_value FLOAT,                -- The expected/baseline value (e.g., average cost)
    threshold_value FLOAT,               -- The threshold that was exceeded
    deviation_percent FLOAT,             -- Percentage deviation from expected

    -- Context
    trace_id UUID,                       -- Related trace (if applicable)
    agent_id UUID,                       -- Related agent (if applicable)
    model VARCHAR(50),                   -- Related model (if applicable)

    -- Human-readable message
    title VARCHAR(200) NOT NULL,
    description TEXT,

    -- Status tracking
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,

    -- Indexes for foreign keys
    CONSTRAINT fk_cost_anomalies_trace FOREIGN KEY (trace_id) REFERENCES traces(trace_id) ON DELETE SET NULL,
    CONSTRAINT fk_cost_anomalies_agent FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE SET NULL
);

-- User alert preferences table
CREATE TABLE IF NOT EXISTS cost_alert_settings (
    user_id UUID PRIMARY KEY,

    -- Daily cost thresholds
    daily_cost_threshold FLOAT DEFAULT 10.0,           -- Alert when daily cost exceeds this
    daily_spike_multiplier FLOAT DEFAULT 3.0,          -- Alert when cost is Nx the daily average

    -- Trace-level thresholds
    trace_cost_threshold FLOAT DEFAULT 1.0,            -- Alert for individual traces costing more than this
    trace_token_threshold INT DEFAULT 50000,           -- Alert for traces using more than this many tokens

    -- Response-level thresholds
    high_token_response_threshold INT DEFAULT 10000,   -- Alert for single responses with high token count

    -- Loop detection
    loop_detection_enabled BOOLEAN DEFAULT TRUE,       -- Enable runaway loop detection
    loop_similarity_threshold FLOAT DEFAULT 0.9,       -- Similarity threshold for detecting loops
    loop_count_threshold INT DEFAULT 10,               -- Number of similar calls before alerting

    -- Notification preferences (for future use)
    email_alerts_enabled BOOLEAN DEFAULT FALSE,
    webhook_url VARCHAR(500),
    alert_cooldown_minutes INT DEFAULT 60,             -- Minimum time between similar alerts

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_cost_anomalies_user_id ON cost_anomalies(user_id);
CREATE INDEX IF NOT EXISTS idx_cost_anomalies_detected_at ON cost_anomalies(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_cost_anomalies_type ON cost_anomalies(anomaly_type);
CREATE INDEX IF NOT EXISTS idx_cost_anomalies_severity ON cost_anomalies(severity);
CREATE INDEX IF NOT EXISTS idx_cost_anomalies_unacknowledged ON cost_anomalies(user_id, is_acknowledged) WHERE is_acknowledged = FALSE;

-- Daily cost aggregates table for efficient anomaly detection
CREATE TABLE IF NOT EXISTS daily_cost_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    total_cost FLOAT NOT NULL DEFAULT 0,
    total_tokens INT NOT NULL DEFAULT 0,
    trace_count INT NOT NULL DEFAULT 0,
    span_count INT NOT NULL DEFAULT 0,
    avg_cost_per_trace FLOAT,
    max_trace_cost FLOAT,

    -- Breakdown by model (JSONB for flexibility)
    cost_by_model JSONB DEFAULT '{}',

    -- Breakdown by agent (JSONB for flexibility)
    cost_by_agent JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_cost_summary_user_date ON daily_cost_summary(user_id, date DESC);

-- Function to update daily cost summary (can be called by worker or trigger)
CREATE OR REPLACE FUNCTION update_daily_cost_summary(p_user_id UUID, p_date DATE)
RETURNS void AS $$
BEGIN
    INSERT INTO daily_cost_summary (
        user_id,
        date,
        total_cost,
        total_tokens,
        trace_count,
        span_count,
        avg_cost_per_trace,
        max_trace_cost,
        cost_by_model,
        cost_by_agent,
        updated_at
    )
    SELECT
        t.user_id,
        p_date,
        COALESCE(SUM(s.cost), 0),
        COALESCE(SUM(s.prompt_tokens + s.completion_tokens), 0),
        COUNT(DISTINCT t.trace_id),
        COUNT(s.span_id),
        COALESCE(AVG(t.total_cost), 0),
        COALESCE(MAX(t.total_cost), 0),
        COALESCE(
            (SELECT jsonb_object_agg(model, model_cost)
             FROM (
                 SELECT s2.llm_model as model, SUM(s2.cost) as model_cost
                 FROM spans s2
                 JOIN traces t2 ON t2.trace_id = s2.trace_id
                 WHERE t2.user_id = p_user_id
                 AND DATE(t2.start_time) = p_date
                 AND s2.llm_model IS NOT NULL
                 GROUP BY s2.llm_model
             ) model_costs
            ), '{}'::jsonb
        ),
        COALESCE(
            (SELECT jsonb_object_agg(agent_name, agent_cost)
             FROM (
                 SELECT COALESCE(a.agent_name, 'unknown') as agent_name, SUM(s2.cost) as agent_cost
                 FROM spans s2
                 JOIN traces t2 ON t2.trace_id = s2.trace_id
                 LEFT JOIN agents a ON t2.agent_id = a.agent_id
                 WHERE t2.user_id = p_user_id
                 AND DATE(t2.start_time) = p_date
                 GROUP BY a.agent_name
             ) agent_costs
            ), '{}'::jsonb
        ),
        NOW()
    FROM traces t
    LEFT JOIN spans s ON t.trace_id = s.trace_id
    WHERE t.user_id = p_user_id
    AND DATE(t.start_time) = p_date
    GROUP BY t.user_id
    ON CONFLICT (user_id, date)
    DO UPDATE SET
        total_cost = EXCLUDED.total_cost,
        total_tokens = EXCLUDED.total_tokens,
        trace_count = EXCLUDED.trace_count,
        span_count = EXCLUDED.span_count,
        avg_cost_per_trace = EXCLUDED.avg_cost_per_trace,
        max_trace_cost = EXCLUDED.max_trace_cost,
        cost_by_model = EXCLUDED.cost_by_model,
        cost_by_agent = EXCLUDED.cost_by_agent,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
