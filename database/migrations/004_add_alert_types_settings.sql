-- Migration: Extend alert settings for budget, error rate, latency, and prompt regression alerts
-- Description: Adds new alert configuration columns to cost_alert_settings (reused by /cost/anomalies).

ALTER TABLE cost_alert_settings
    ADD COLUMN IF NOT EXISTS budget_alerts_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS monthly_budget_usd FLOAT,
    ADD COLUMN IF NOT EXISTS monthly_budget_alert_percent FLOAT DEFAULT 90.0,

    ADD COLUMN IF NOT EXISTS error_rate_alerts_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS error_rate_threshold_pct FLOAT DEFAULT 5.0,
    ADD COLUMN IF NOT EXISTS error_rate_window_minutes INT DEFAULT 60,
    ADD COLUMN IF NOT EXISTS error_rate_min_traces INT DEFAULT 20,

    ADD COLUMN IF NOT EXISTS latency_alerts_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS latency_p95_threshold_seconds FLOAT DEFAULT 2.0,
    ADD COLUMN IF NOT EXISTS latency_window_minutes INT DEFAULT 60,
    ADD COLUMN IF NOT EXISTS latency_min_spans INT DEFAULT 50,

    ADD COLUMN IF NOT EXISTS prompt_regression_alerts_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS prompt_regression_window_hours INT DEFAULT 24,
    ADD COLUMN IF NOT EXISTS prompt_regression_error_rate_increase_pp FLOAT DEFAULT 2.0,
    ADD COLUMN IF NOT EXISTS prompt_regression_latency_increase_seconds FLOAT DEFAULT 0.5,
    ADD COLUMN IF NOT EXISTS prompt_regression_min_traces INT DEFAULT 20;

