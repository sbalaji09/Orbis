-- Migration: Fix daily_cost_aggregates upsert constraint
-- Description: Ensures a unique index exists for ON CONFLICT (user_id, date).

CREATE UNIQUE INDEX IF NOT EXISTS daily_cost_aggregates_user_date_uidx
ON daily_cost_aggregates (user_id, date);

