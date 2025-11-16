-- Migration to add agent_id column to traces and fix agents table
-- This handles cases where agent_id column exists but doesn't have proper defaults

-- Step 1: Drop and recreate agents table with correct schema (UUID-based)
DROP TABLE IF EXISTS agents CASCADE;

CREATE TABLE agents (
    agent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    agent_name VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    api_key VARCHAR(280)
);

-- Step 2: Drop agent_id column from traces if it exists (will be recreated with proper FK)
ALTER TABLE traces DROP COLUMN IF EXISTS agent_id CASCADE;

-- Step 3: Add agent_id column to traces with proper foreign key
ALTER TABLE traces ADD COLUMN agent_id UUID REFERENCES agents(agent_id);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_traces_agent_id ON traces(agent_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_api_key ON agents(api_key);

-- Step 5: Verify the schema
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'agents'
ORDER BY ordinal_position;
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'agents'
ORDER BY ordinal_position;
