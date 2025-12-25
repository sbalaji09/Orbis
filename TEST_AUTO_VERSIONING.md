# Auto-Versioning Integration Test Plan

## Current Status
- ✅ Core logic implemented in `backend/semantic_versioning.py`
- ✅ Database migration applied (`002_add_semantic_versioning.sql`)
- ✅ API endpoints support semantic versioning
- ✅ Unit tests: 18/19 passing
- ❓ Integration testing needed

## Test Scenarios

### Test 1: Create First Version (Should be 1.0)
```bash
# Using the API directly
curl -X POST http://localhost:8000/prompts/prompts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-autoversion",
    "content": "You are a helpful assistant.",
    "user_id": "test-user",
    "agent_id": "test-agent"
  }'

# Expected response should include:
# "semantic_version": "1.0"
```

### Test 2: Minor Change (Should increment to 1.1)
```bash
# Add a small example - should be minor bump
curl -X POST http://localhost:8000/prompts/prompts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-autoversion",
    "content": "You are a helpful assistant. For example, you can help with coding tasks.",
    "user_id": "test-user",
    "agent_id": "test-agent"
  }'

# Expected: "semantic_version": "1.1"
```

### Test 3: Major Change (Should increment to 2.0)
```bash
# Complete rewrite with structural changes
curl -X POST http://localhost:8000/prompts/prompts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-autoversion",
    "content": "Role: Expert code reviewer\n\nRules:\n- Must provide constructive feedback\n- Always check for security issues\n- Never ignore edge cases\n\nFormat:\n- Use markdown for code blocks\n- Provide specific line numbers",
    "user_id": "test-user",
    "agent_id": "test-agent"
  }'

# Expected: "semantic_version": "2.0"
```

### Test 4: Get All Versions
```bash
curl http://localhost:8000/prompts/test-autoversion/versions?user_id=test-user&agent_id=test-agent

# Expected: Array with all 3 versions (1.0, 1.1, 2.0)
```

### Test 5: Get Specific Version Content
```bash
# Get version 1.1 content
curl "http://localhost:8000/prompts/test-autoversion/content?semantic_version=1.1&user_id=test-user&agent_id=test-agent"

# Expected: Content from version 1.1
```

### Test 6: Rollback to Previous Version
```bash
curl -X POST http://localhost:8000/prompts/test-autoversion/rollback \
  -H "Content-Type: application/json" \
  -d '{
    "target_version_number": 1,
    "user_id": "test-user",
    "agent_id": "test-agent"
  }'

# Expected: Creates new version 2.1 with content from 1.0
```

### Test 7: Analytics Per Version
```bash
curl "http://localhost:8000/prompts/analytics/test-autoversion?user_id=test-user&agent_id=test-agent"

# Expected: Cost, latency, error rate per semantic version
```

## SDK Integration Test

```python
from observability_sdk.core.prompt_versioning import PromptRegistry

# Initialize registry
registry = PromptRegistry()

# Test 1: Register first prompt (should be 1.0)
prompt1 = registry.register_prompt(
    name="sdk-test",
    content="You are a helpful assistant.",
    user_id="test-user",
    agent_id="test-agent",
    metadata={"purpose": "testing"}
)
print(f"First version: {prompt1.version}")  # Should be "1.0"

# Test 2: Detect no change (should return same version)
prompt2 = registry.register_prompt(
    name="sdk-test",
    content="You are a helpful assistant.",  # Same content
    user_id="test-user",
    agent_id="test-agent"
)
print(f"No change version: {prompt2.version}")  # Should be "1.0"

# Test 3: Minor change (should be 1.1)
prompt3 = registry.register_prompt(
    name="sdk-test",
    content="You are a helpful assistant. You can help with many tasks.",
    user_id="test-user",
    agent_id="test-agent"
)
print(f"Minor change: {prompt3.version}")  # Should be "1.1"

# Test 4: Major change (should be 2.0)
prompt4 = registry.register_prompt(
    name="sdk-test",
    content="""Role: Expert assistant

Rules:
- Must provide accurate information
- Always cite sources
- Never make assumptions

Format: Structured JSON response""",
    user_id="test-user",
    agent_id="test-agent"
)
print(f"Major change: {prompt4.version}")  # Should be "2.0"
```

## Frontend Visual Test

1. Start frontend: `cd frontend && npm run dev`
2. Navigate to prompts page
3. Create/update prompts and verify:
   - ✅ Version badges show MAJOR (red) or MINOR (blue)
   - ✅ Version transitions display (e.g., "1.0 → 1.1")
   - ✅ Version list shows all semantic versions
   - ✅ Comparison card shows cost/latency differences between versions

## Database Verification

```sql
-- Check semantic version column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'prompt_versions' AND column_name = 'semantic_version';

-- View all versions for a prompt
SELECT version_number, semantic_version, created_at, is_active
FROM prompt_versions
WHERE name = 'test-autoversion'
ORDER BY version_number DESC;

-- Check index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'prompt_versions' AND indexname = 'idx_prompt_versions_semantic_version';
```

## Edge Cases to Test

1. **First version of prompt**: Should always be "1.0"
2. **Identical content**: Should not create new version
3. **Empty to content**: Should be major change
4. **Large rewrite (>40% diff)**: Should be major even without structural keywords
5. **Multiple structural keywords**: Should be major
6. **Tenant isolation**: Different agents should have independent versioning
7. **Rollback creates new version**: Rollback should create new minor bump, not overwrite

## What's Left for Versioning?

Based on the implementation, here's what might still need attention:

### ✅ Already Done
- Automatic semantic versioning logic
- Database schema with migration
- API endpoints (create, list, get, rollback, analytics)
- Frontend components with visual indicators
- SDK integration
- Unit tests
- Documentation

### ❓ Still Need to Test/Verify
1. **Integration tests** (above scenarios)
2. **Data pipeline interaction** - Verify traces/spans correctly associate with semantic versions
3. **Analytics accuracy** - Ensure cost/latency/errors aggregate correctly per version
4. **Rollback behavior** - Test rollback creates correct new version
5. **Concurrent updates** - What happens if two users update same prompt simultaneously?
6. **Migration status** - Has the DB migration been applied to production/staging?

### 🔧 Potential Improvements (Optional)
1. **Configurable thresholds** - Make MAJOR_DIFF_THRESHOLD configurable per user/agent
2. **Change changelog** - Auto-generate human-readable changelog from version changes
3. **Version tags/labels** - Allow naming versions ("production", "staging", "experimental")
4. **Approval workflow** - Require approval before major version bumps
5. **A/B testing integration** - Compare performance between versions automatically
6. **Revert chain** - Track which versions were created via rollback

## Quick Start Testing

```bash
# 1. Ensure backend is running
cd backend && uvicorn main:app --reload

# 2. Run unit tests
python3.12 -m pytest test_semantic_versioning.py -v

# 3. Test API manually (use curl commands above)

# 4. Check database
psql -d orbis -c "SELECT * FROM prompt_versions WHERE name = 'test-autoversion' ORDER BY version_number DESC;"

# 5. Test frontend
cd frontend && npm run dev
```
