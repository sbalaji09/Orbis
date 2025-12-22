# Quick Start: Auto-Versioning Feature

## 🚀 Getting Started in 5 Minutes

### Step 1: Run Database Migration

```bash
cd /Users/snehilk/Desktop/Coding/Orbis

# Connect to your database and run migration
psql -U postgres -d orbis -f database/migrations/002_add_semantic_versioning.sql
```

Expected output:

```
ALTER TABLE
UPDATE 0
ALTER TABLE
CREATE INDEX
COMMENT
```

### Step 2: Restart Backend

```bash
cd backend
python3 run_server.py
```

The backend will automatically use the new semantic versioning logic.

### Step 3: Test It Out!

#### Via API

```bash
# Create first version (will be v1.0)
curl -X POST "http://localhost:8000/prompts/prompts" \
  -H "X-API-Key: your-test-api-key" \
  -d "agent_id=test-agent-123" \
  -d "name=test_prompt" \
  -d "content=You are a helpful assistant."

# Response will include: "semantic_version": "1.0"
```

```bash
# Make a minor change (will be v1.1)
curl -X POST "http://localhost:8000/prompts/prompts" \
  -H "X-API-Key: your-test-api-key" \
  -d "agent_id=test-agent-123" \
  -d "name=test_prompt" \
  -d "content=You are a helpful, friendly assistant."

# Response will include: "semantic_version": "1.1"
# Check backend logs for: "Auto-versioning: 1.0 -> 1.1 (minor change)"
```

```bash
# Make a major change (will be v2.0)
curl -X POST "http://localhost:8000/prompts/prompts" \
  -H "X-API-Key: your-test-api-key" \
  -d "agent_id=test-agent-123" \
  -d "name=test_prompt" \
  -d "content=Role: Expert code reviewer. Output format: JSON with fields {summary, issues}."

# Response will include: "semantic_version": "2.0"
# Check backend logs for: "Auto-versioning: 1.1 -> 2.0 (major change)"
```

### Step 4: View in Dashboard

1. Navigate to http://localhost:3000/dashboard
2. Click on any span that has a prompt
3. Go to "Versions" tab
4. You should see:
   - v1.0, v1.1, v2.0 displayed
   - [MINOR] badge on v1.1
   - [MAJOR] badge on v2.0
   - Performance metrics for each

### Step 5: Compare Versions

1. In the Versions tab, check the boxes for v1.0 and v2.0
2. Click "Analyze Comparison"
3. You'll see:
   - Auto-generated insights card
   - Cost/latency/error comparison
   - Side-by-side view
   - Diff view
   - AI analysis (if OpenAI API key is set)

---

## ✅ Verification Checklist

Run through this checklist to verify everything works:

- [ ] Database migration completed without errors
- [ ] Backend starts without errors
- [ ] Creating first prompt returns `semantic_version: "1.0"`
- [ ] Minor change increments to `1.1` (check backend logs)
- [ ] Major change increments to `2.0` (check backend logs)
- [ ] Dashboard shows semantic versions (v1.0, v1.1, v2.0)
- [ ] Change indicators appear (MINOR/MAJOR badges)
- [ ] Comparison view shows insights card
- [ ] Rollback creates new minor version

---

## 🧪 Run Tests (Optional)

```bash
cd backend

# Install pytest if needed
pip install pytest

# Run semantic versioning tests
python -m pytest test_semantic_versioning.py -v

# Expected: All tests pass
```

---

## 📊 Backend Log Messages

When auto-versioning works correctly, you'll see:

```
Auto-versioning: 1.0 -> 1.1 (minor change)
  - Diff ratio: 15.23%
  - Structural changes: 0
  - Semantic changes: 1

Auto-versioning: 1.1 -> 2.0 (major change)
  - Diff ratio: 65.42%
  - Structural changes: 3
  - Semantic changes: 8
```

---

## 🎯 Example Use Case: Prompt Evolution

Let's track a realistic prompt evolution:

### Version 1.0 (Initial)

```python
prompt = "Summarize the following text concisely."
```

**Auto-assigned:** v1.0

### Version 1.1 (Minor - Add Detail)

```python
prompt = "Summarize the following text concisely in a professional tone."
```

**Auto-detected:** Minor change (added 5 words)
**Auto-assigned:** v1.1

### Version 1.2 (Minor - Add Example)

```python
prompt = """Summarize the following text concisely in a professional tone.
Example: "The report indicates..."
"""
```

**Auto-detected:** Minor change (added example)
**Auto-assigned:** v1.2

### Version 2.0 (Major - Restructure)

```python
prompt = """Role: Professional summarizer

Task: Create a concise summary
Rules:
- Maximum 3 sentences
- Focus on key insights
- Maintain neutral tone
"""
```

**Auto-detected:** Major change (structure + role + rules)
**Auto-assigned:** v2.0

### Version 2.1 (Minor - Refinement)

```python
prompt = """Role: Professional summarizer

Task: Create a concise summary
Rules:
- Maximum 3 sentences
- Focus on key insights and metrics
- Maintain neutral tone
"""
```

**Auto-detected:** Minor change (added "and metrics")
**Auto-assigned:** v2.1

---

## 🔧 Customizing Thresholds

If auto-detection isn't working as expected, adjust thresholds in `backend/semantic_versioning.py`:

```python
class SemanticVersionAnalyzer:
    # Make it more sensitive (more major versions)
    MAJOR_DIFF_THRESHOLD = 0.3  # 30% instead of 40%

    # Make it less sensitive (more minor versions)
    MAJOR_DIFF_THRESHOLD = 0.5  # 50% instead of 40%

    # Require more structural changes for major
    STRUCTURAL_CHANGE_THRESHOLD = 3  # 3 instead of 2
```

Restart backend after changes.

---

## 💡 Tips for Best Results

1. **Use structured prompts** with clear sections (Role:, Task:, Rules:)
2. **Meaningful changes** trigger better detection
3. **Check backend logs** to understand version decisions
4. **Monitor analytics** to see which versions perform best
5. **Use comparisons** to validate changes before deploying

---

## 🐛 Troubleshooting

### Issue: All versions are 1.0

**Solution:** Migration didn't run or backend using old code

```bash
# Check if column exists
psql -U postgres -d orbis -c "\d prompt_versions"
# Should show semantic_version column

# Restart backend
```

### Issue: All changes are major

**Solution:** Threshold too low

```python
# In semantic_versioning.py
MAJOR_DIFF_THRESHOLD = 0.6  # Increase from 0.4
```

### Issue: Frontend shows version_number instead of semantic_version

**Solution:** Frontend needs rebuild

```bash
cd frontend
pnpm run dev
# Hard refresh browser (Cmd+Shift+R)
```

### Issue: Comparison shows no insights

**Solution:** Not enough usage data

- Create some test traces with the prompts
- Wait for analytics to populate
- Refresh dashboard

---

## 🎉 Success Indicators

You know it's working when:

1. ✅ Backend logs show "Auto-versioning" messages
2. ✅ Dashboard displays v1.0, v1.1, v2.0 format
3. ✅ MAJOR/MINOR badges appear
4. ✅ Comparison shows cost/latency insights
5. ✅ Rollback creates new minor version
6. ✅ No manual version input required

---

## 📚 Next Steps

1. **Read full docs:** See `PROMPT_VERSIONING.md`
2. **Configure alerts:** Set up regression detection
3. **Integrate SDK:** Use observability_sdk in your app
4. **Monitor dashboards:** Track version performance
5. **Optimize prompts:** Use insights to improve

---

## 🆘 Need Help?

- Check `PROMPT_VERSIONING.md` for detailed docs
- Review `AUTO_VERSIONING_SUMMARY.md` for implementation details
- Run tests: `pytest backend/test_semantic_versioning.py -v`
- Check backend logs for auto-versioning messages

**That's it!** Auto-versioning is now active. Just change your prompts and let Orbis handle the rest. 🚀
