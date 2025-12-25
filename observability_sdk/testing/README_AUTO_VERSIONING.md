# Auto-Versioning Test Guide

## Overview
`test_auto_versioning.py` demonstrates the automatic semantic versioning feature. It shows how the backend automatically detects major vs minor changes without manual version specification.

## What This Test Does

The test creates 6 progressive versions of a customer support prompt:

1. **v1.0** - Initial simple prompt (first version always 1.0)
2. **v1.1** - Minor change: Added example
3. **v1.2** - Minor change: Improved wording
4. **v2.0** - Major change: Added role, rules, format, constraints
5. **v2.1** - Minor change: Small addition after major version
6. **v3.0** - Major change: Complete rewrite with JSON format

## Prerequisites

1. **Backend must be running**:
   ```bash
   cd backend
   uvicorn main:app --reload --port 8080
   ```

2. **Database migration applied**:
   ```bash
   psql -d orbis -f database/migrations/002_add_semantic_versioning.sql
   ```

3. **Python dependencies**:
   ```bash
   pip install requests
   ```

## Running the Test

```bash
cd observability_sdk/testing
python3 test_auto_versioning.py
```

## Expected Output

The test will show:
- ✅ Each version creation with semantic version assignment
- 📊 Change analysis (diff ratio, structural changes, semantic changes)
- 🔍 Explanation of why each change was classified as major/minor
- 📋 Summary of all versions created
- ✅ Validation that auto-versioning worked correctly

## Sample Output

```
==================================================================
TEST 1: Create Initial Version (Expected: 1.0)
==================================================================

📝 Creating prompt: 'customer_support_agent'
Content: You are a helpful customer support agent.

✅ RESULT - Initial Version Created
----------------------------------------------------------------------
  Semantic Version: 1.0
  Version Number:   1
  Change Type:      initial
  Prompt ID:        xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx...

==================================================================
TEST 2: Minor Change - Add Example (Expected: 1.1)
==================================================================

📝 Updating prompt with minor addition
Content: You are a helpful customer support agent. For example...

🔍 Change: Added a simple example (< 40% diff, no structural keywords)

✅ RESULT - Minor Change Detected
----------------------------------------------------------------------
  Semantic Version: 1.1
  Version Number:   2
  Change Type:      minor

  📊 Change Analysis:
     - Diff Ratio:         25.00%
     - Structural Changes: 0
     - Semantic Changes:   1
----------------------------------------------------------------------

...
```

## Versioning Logic

The backend uses these rules (from `backend/semantic_versioning.py`):

### Major Version Bump (X.y → X+1.0)
Triggered when **ANY** of these conditions are met:
- Diff ratio ≥ 40%
- Structural changes ≥ 2 (keywords like "role:", "rules:", "format:", "must", "never")
- Semantic changes ≥ 5 (sentence-level modifications)

### Minor Version Bump (x.Y → x.Y+1)
Triggered when:
- Changes don't meet major criteria
- Content is different from previous version

### No Version Change
When:
- Content is identical to previous version (same hash)

## Troubleshooting

### Test fails with connection error
- Ensure backend is running on `http://localhost:8080`
- Check `uvicorn main:app --reload --port 8080`

### Versions don't match expected sequence
- Check backend logs for semantic versioning errors
- Verify migration `002_add_semantic_versioning.sql` was applied
- Check if `semantic_version` column exists in `prompt_versions` table

### No versions returned in summary
- Check database connection
- Verify API key is correct
- Check backend logs for errors

## Database Verification

After running the test, verify in PostgreSQL:

```sql
-- View all versions created
SELECT version_number, semantic_version, created_at, is_active
FROM prompt_versions
WHERE name = 'customer_support_agent'
  AND agent_id = 'autoversion-test-agent'
ORDER BY version_number ASC;

-- Expected result:
-- version_number | semantic_version | created_at           | is_active
-- ---------------+------------------+----------------------+-----------
--              1 | 1.0              | 2024-12-24 10:30:00  | f
--              2 | 1.1              | 2024-12-24 10:30:01  | f
--              3 | 1.2              | 2024-12-24 10:30:02  | f
--              4 | 2.0              | 2024-12-24 10:30:03  | f
--              5 | 2.1              | 2024-12-24 10:30:04  | f
--              6 | 3.0              | 2024-12-24 10:30:05  | t
```

## Next Steps After Test

1. **UI Testing**: Create/update prompts via frontend and verify visual indicators
2. **Analytics**: Check if cost/latency/errors aggregate correctly per version
3. **Rollback**: Test rollback creates new minor version with old content
4. **Real Usage**: Link actual LLM traces to prompt versions via `prompt_id` parameter
5. **SDK Integration**: Test using `@observe` decorator with auto-versioning

## Related Files

- Main test: `test_auto_versioning.py`
- Semantic versioning logic: `backend/semantic_versioning.py`
- Database migration: `database/migrations/002_add_semantic_versioning.sql`
- API endpoints: `backend/prompt_api.py`
- Frontend components: `frontend/components/Version*.tsx`
- Unit tests: `backend/test_semantic_versioning.py`
