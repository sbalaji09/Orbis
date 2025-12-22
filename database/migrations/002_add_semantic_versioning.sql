-- Migration: Add semantic versioning support
-- Changes version_number from INT to VARCHAR to support "1.2" format
-- This migration is backward compatible - existing INT versions will be converted to "X.0" format

-- Step 1: Add new column for semantic version
ALTER TABLE prompt_versions 
ADD COLUMN semantic_version VARCHAR(20);

-- Step 2: Migrate existing data (convert INT to semantic version format)
-- INT 1 -> "1.0", INT 2 -> "2.0", etc.
UPDATE prompt_versions 
SET semantic_version = version_number || '.0'
WHERE semantic_version IS NULL;

-- Step 3: Make semantic_version NOT NULL
ALTER TABLE prompt_versions 
ALTER COLUMN semantic_version SET NOT NULL;

-- Step 4: Add metadata column for version change analysis if not exists
-- (metadata column already exists, so we'll just ensure it has proper structure)

-- Step 5: Create index for semantic version queries
CREATE INDEX idx_prompt_versions_semantic_version ON prompt_versions(name, semantic_version DESC);

-- Step 6: Add comment documenting the change
COMMENT ON COLUMN prompt_versions.semantic_version IS 'Semantic version in MAJOR.MINOR format (e.g., 1.0, 1.2, 2.0). Auto-incremented based on change magnitude.';

-- Note: We keep version_number for backward compatibility
-- Future queries should use semantic_version instead
