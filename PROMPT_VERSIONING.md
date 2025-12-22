# Prompt Versioning with Auto-Versioning

## Overview

Orbis features **automatic semantic versioning** for prompts - the first observability platform to automatically detect when your prompts change and intelligently version them as **major** or **minor** changes.

### The Big Idea

**Other tools (Langfuse/Braintrust):** "Click 'Create New Version', name it, save it, deploy it"

**Orbis:** "Just write code. We detect when your prompt changed."

```typescript
// Day 1
{ role: 'system', content: 'You are a helpful assistant.' }
// Orbis: Created v1.0 automatically

// Day 3 - you change it slightly
{ role: 'system', content: 'You are a helpful, concise assistant.' }
// Orbis: Created v1.1 (detected minor change), shows diff, starts tracking comparison metrics

// Day 7 - major rewrite
{ role: 'system', content: 'You are an expert code reviewer...' }
// Orbis: Created v2.0 (detected major change)
```

**Zero manual work.** Versions create themselves.

---

## Features

### 1. Auto-Versioning (MAJOR/MINOR Detection)

The system automatically analyzes changes between prompt versions using multiple factors:

**Minor Changes (1.0 → 1.1):**

- Small text edits (< 40% content changed)
- Parameter tweaks
- Formatting changes
- Adding examples
- Clarifying language

**Major Changes (1.0 → 2.0):**

- Structural changes (> 40% content changed)
- Role modifications (`system`, `role:` keywords)
- Output format changes
- New constraints or rules (`must`, `always`, `never`)
- Significant semantic shifts (5+ sentences changed)

**Algorithm Factors:**

1. **Diff Ratio**: Percentage of content changed using sequence matching
2. **Structural Changes**: Count of modified structural indicators (role, format, rules, etc.)
3. **Semantic Changes**: Number of sentences added/removed/modified
4. **Key Phrase Detection**: Tracks changes in critical instructions

### 2. Auto-Generated Insights

When comparing versions, Orbis automatically shows:

✨ **Cost Savings**

```
💰 40% cheaper than v1.2
```

⚡ **Performance Changes**

```
⚡ 25% faster than v1.2
```

✅ **Quality Improvements**

```
✅ 3.5% fewer errors
```

📊 **Recommendations**

```
✨ v1.3 is recommended: Lower cost with same or better quality
```

### 3. Production-Ready UI

- **Visual Change Indicators**: See MAJOR/MINOR badges on each version
- **Side-by-Side Comparison**: Synchronized scrolling for easy diff review
- **Unified Diff View**: GitHub-style line-by-line differences
- **Performance Metrics**: Cost, latency, error rate for each version
- **One-Click Rollback**: Revert to any previous version instantly
- **Sample Outputs**: See real outputs from each version

### 4. Smart Analytics

Every version tracks:

- **Trace count**: How many times this version was used
- **Avg cost**: Cost per execution
- **Avg latency**: Response time
- **Error rate**: Percentage of failed executions
- **Best version badge**: Automatically highlights the best-performing version

---

## Backend Implementation

### Semantic Versioning Engine

Located in `backend/semantic_versioning.py`:

```python
from semantic_versioning import get_next_version

# Automatically determine next version
new_version, change_analysis = get_next_version(
    current_version="1.2",
    old_content="You are a helpful assistant.",
    new_content="You are a helpful, concise assistant."
)
# Returns: ("1.3", VersionChange(change_type='minor', diff_ratio=0.15, ...))
```

**Key Components:**

1. **SemanticVersionAnalyzer**: Core analysis engine

   - `analyze_changes()`: Determines major vs minor
   - `_calculate_diff_ratio()`: Uses difflib.SequenceMatcher
   - `_detect_structural_changes()`: Regex pattern matching
   - `_detect_semantic_changes()`: Sentence-level analysis

2. **VersionChange**: Analysis result dataclass
   ```python
   @dataclass
   class VersionChange:
       old_version: str
       new_version: str
       change_type: str  # 'major' or 'minor'
       diff_ratio: float
       structural_changes: int
       semantic_changes: int
       details: Dict[str, any]
   ```

### Database Schema

Migration: `database/migrations/002_add_semantic_versioning.sql`

```sql
ALTER TABLE prompt_versions
ADD COLUMN semantic_version VARCHAR(20) NOT NULL;

CREATE INDEX idx_prompt_versions_semantic_version
ON prompt_versions(name, semantic_version DESC);
```

**Fields:**

- `version_number`: INT - Sequential integer (backward compatible)
- `semantic_version`: VARCHAR - Semantic version like "1.2" or "2.0"
- `prompt_hash`: TEXT - SHA-256 hash for change detection
- `content_preview`: TEXT - First 500 chars (or full content if S3 disabled)
- `parent_version_id`: UUID - Links rollbacks to original version

### API Routes

**POST /prompts/prompts**

```python
# Creates new version with automatic semantic versioning
{
    "agent_id": "uuid",
    "name": "summarization_prompt",
    "content": "..."
}

# Returns:
{
    "prompt_id": "uuid",
    "version_number": 3,
    "semantic_version": "1.2",  # Auto-calculated
    "prompt_hash": "abc123..."
}
```

**GET /prompts/{name}/versions**

```python
# Returns all versions with semantic versions
[
    {
        "version_number": 3,
        "semantic_version": "1.2",
        "created_at": "2024-01-15T10:30:00Z",
        "is_active": true,
        "prompt_hash": "abc123..."
    },
    ...
]
```

**POST /prompts/{name}/rollback**

```python
# Rollback creates new minor version
# Example: Rolling back to v1 from v2.3 creates v2.4 with v1's content
```

**GET /prompts/compare**

```python
# Returns detailed comparison with LLM analysis
{
    "prompts": {
        "version1": { "content": "...", "analytics": {...} },
        "version2": { "content": "...", "analytics": {...} }
    },
    "diff": { "added": [...], "removed": [...], "raw": "..." },
    "llm_analysis": "Detailed AI comparison..."
}
```

---

## Frontend Components

### VersionsList Component

Shows all versions with:

- Semantic version badges (v1.2, v2.0)
- MAJOR/MINOR change indicators
- Performance metrics
- Selection for comparison
- One-click rollback

**Key Features:**

```tsx
<VersionChangeIndicator
  semantic_version="1.2"
  previous_semantic_version="1.1"
/>
// Displays: [MINOR] 1.1 → 1.2
```

### VersionComparisonCard

Auto-generated insights component:

```tsx
<VersionComparisonCard
  version1={{ version_number: 1, analytics: {...} }}
  version2={{ version_number: 2, analytics: {...} }}
/>
```

**Automatically shows:**

- Cost difference (%, $)
- Latency difference (%, ms)
- Error rate change
- Recommendations
- Emoji-coded insights (💰 cheaper, ⚡ faster, ✅ better quality)

### PromptComparisonView

Full-screen comparison modal with:

- Side-by-side view (synced scrolling)
- Unified diff view
- Sample outputs comparison
- LLM-powered analysis
- Auto-generated insights card

---

## Usage Examples

### In Your Application Code

```python
from observability_sdk.core.prompt_versioning import PromptRegistry

registry = PromptRegistry()

# Register a prompt (auto-versioned on backend)
registry.register_prompt(
    prompt_id="summarization",
    version="auto",  # Version determined automatically
    prompt_text="You are a helpful assistant...",
    agent_id="agent-123",
    api_key="your-api-key"
)
```

### Via API

```bash
# Create new version (auto-versioned)
curl -X POST "http://localhost:8000/prompts/prompts" \
  -H "X-API-Key: your-key" \
  -d "agent_id=agent-123" \
  -d "name=my_prompt" \
  -d "content=You are a helpful assistant."

# Returns: { "semantic_version": "1.0", ... }

# Update prompt (auto-detects change magnitude)
curl -X POST "http://localhost:8000/prompts/prompts" \
  -H "X-API-Key: your-key" \
  -d "agent_id=agent-123" \
  -d "name=my_prompt" \
  -d "content=You are a helpful, expert assistant with deep knowledge."

# Returns: { "semantic_version": "2.0", ... }  # Major change detected
```

---

## Configuration

### Thresholds (Customizable in semantic_versioning.py)

```python
class SemanticVersionAnalyzer:
    # Diff ratio thresholds
    MAJOR_DIFF_THRESHOLD = 0.4  # 40% changed = major
    MINOR_DIFF_THRESHOLD = 0.1  # 10-40% = minor

    # Structural change threshold
    STRUCTURAL_CHANGE_THRESHOLD = 2  # 2+ indicators = major

    # Major change indicators (regex patterns)
    MAJOR_CHANGE_INDICATORS = [
        r'\brole\s*:',
        r'\bsystem\b',
        r'\bformat\s*:',
        r'\bmust\s+(?:not\s+)?',
        ...
    ]
```

---

## Comparison with Other Tools

| Feature                | Orbis          | Langfuse  | Braintrust |
| ---------------------- | -------------- | --------- | ---------- |
| Auto-versioning        | ✅ Yes         | ❌ Manual | ❌ Manual  |
| Major/Minor detection  | ✅ Yes         | ❌ No     | ❌ No      |
| Auto insights          | ✅ Yes         | ⚠️ Basic  | ⚠️ Basic   |
| One-click rollback     | ✅ Yes         | ✅ Yes    | ✅ Yes     |
| Performance comparison | ✅ Auto        | ⚠️ Manual | ⚠️ Manual  |
| Cost tracking          | ✅ Per version | ✅ Yes    | ✅ Yes     |
| Change detection       | ✅ Automatic   | ❌ Manual | ❌ Manual  |

---

## Migration Guide

To enable semantic versioning in existing database:

```bash
# Run migration
psql -U postgres -d orbis -f database/migrations/002_add_semantic_versioning.sql

# Existing versions will be converted:
# version_number: 1 → semantic_version: "1.0"
# version_number: 2 → semantic_version: "2.0"
```

To rollback:

```bash
psql -U postgres -d orbis -f database/migrations/002_add_semantic_versioning_rollback.sql
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   User Changes Prompt                    │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│            POST /prompts/prompts (API)                   │
│  1. Compute SHA-256 hash of new content                 │
│  2. Check if hash already exists (dedup)                │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│          SemanticVersionAnalyzer.analyze()               │
│  • Calculate diff_ratio (SequenceMatcher)               │
│  • Detect structural changes (regex patterns)           │
│  • Count semantic changes (sentence-level)              │
│  • Classify: MAJOR (2.0) or MINOR (1.1)                 │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│         db.insert_prompt_row()                           │
│  • Store with semantic_version                           │
│  • Update version_number (backward compat)              │
│  • Save to S3 (optional) or content_preview             │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              Frontend Auto-Updates                       │
│  • Displays v1.2 badge                                   │
│  • Shows MAJOR/MINOR indicator                           │
│  • Enables comparison with previous versions            │
└─────────────────────────────────────────────────────────┘
```

---

## Future Enhancements

1. **A/B Testing**: Toggle to split traffic between versions
2. **Regression Alerts**: Notify when error rate jumps
3. **Prompt Optimization**: AI suggests shorter/better prompts
4. **Replay Testing**: Test new prompt against last N real inputs
5. **Cost Savings Suggestions**: "Switch to v1.2 to save 40%"
6. **Remote Prompts**: Change prompts without redeploying code

---

## Troubleshooting

**Q: Versions not auto-incrementing?**
A: Check that `semantic_version` column exists in database. Run migration if needed.

**Q: All changes detected as major?**
A: Adjust `MAJOR_DIFF_THRESHOLD` in `semantic_versioning.py` to be more lenient (e.g., 0.5 instead of 0.4).

**Q: Want to force a major version bump?**
A: Currently auto-detected only. Manual override coming in v2.

**Q: Can I revert to integer versions?**
A: Yes, run the rollback migration. But you'll lose semantic versioning benefits.

---

## License

MIT - Part of Orbis Observability Platform
