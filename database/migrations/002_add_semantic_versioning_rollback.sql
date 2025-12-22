-- Rollback migration for semantic versioning
-- This reverts the changes made by 002_add_semantic_versioning.sql

-- Step 1: Drop the index
DROP INDEX IF EXISTS idx_prompt_versions_semantic_version;

-- Step 2: Drop the semantic_version column
ALTER TABLE prompt_versions 
DROP COLUMN IF EXISTS semantic_version;

-- Rolled back successfully
