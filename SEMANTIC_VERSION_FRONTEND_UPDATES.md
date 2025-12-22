# Semantic Version Frontend Updates

## Overview

All frontend components have been updated to display semantic versions (e.g., `v1.2`) instead of integer version numbers (e.g., `v2`) throughout the UI, while maintaining backward compatibility with integer versions.

## Pattern Used

All version displays use the fallback pattern:

```typescript
semantic_version || version_number;
```

This ensures that:

- New versions with semantic versioning display as `v1.2`, `v2.0`, etc.
- Legacy versions without semantic_version display as `v1`, `v2`, etc.

## Files Updated

### Type Definitions

- **`frontend/lib/types.ts`**

  - Added `semantic_version?: string` to `PromptVersion` interface

- **`frontend/lib/prompt-api.ts`**

  - Added `semantic_version?: string` to API response type

- **`frontend/lib/prompt-api-client.ts`**
  - Added `semantic_version?: string` to client-side types

### Components

#### Display Components

- **`frontend/components/PromptAnalytics.tsx`**

  - Updated best version display: `v${bestVersion.semantic_version || bestVersion.version_number}`

- **`frontend/components/PromptVersionPanel.tsx`**

  - Already using proper fallback pattern for version badges

- **`frontend/components/PromptContentViewer.tsx`**
  - Added `semanticVersion?: string` prop
  - Updated badge display to use semantic version with fallback

#### Comparison Components

- **`frontend/components/PromptComparisonView.tsx`**

  - Added `version1Semantic?: string` and `version2Semantic?: string` props
  - Updated all 4 PromptBadge instances:
    - Header badges (2 instances)
    - Side-by-side view badges (2 instances)
  - All use pattern: `v${versionSemantic || versionNumber}`

- **`frontend/components/VersionComparisonCard.tsx`**
  - Already using proper fallback pattern for v1Label and v2Label

#### Page Components

- **`frontend/app/dashboard/span/[spanId]/SpanDetailClient.tsx`**

  - Updated `comparisonVersions` state to include semantic versions:
    ```typescript
    [number, number, string | undefined, string | undefined];
    ```
  - Modified `handleCompare()` to extract and store semantic versions
  - Updated `viewingContent` state to include `semanticVersion?: string`
  - Modified `handleView()` to extract semantic version from versions array
  - Passed semantic versions to both PromptComparisonView and PromptContentViewer

- **`frontend/app/dashboard/span/[spanId]/VersionsList.tsx`**
  - Updated comparison selection badges to find and display semantic versions
  - Version list already using proper fallback pattern

## Version Display Locations

All version displays now show semantic versions:

1. **Prompt Analytics Dashboard**

   - Best performing version badge

2. **Version List**

   - Individual version badges
   - Comparison selection badges
   - Version change indicators (MAJOR/MINOR)

3. **Comparison Modal**

   - Header version badges (both versions)
   - Side-by-side panel headers (both versions)
   - Auto-generated insights (uses semantic versions in recommendations)

4. **Content Viewer**
   - Version badge in modal header

## Data Flow

### From Backend to Frontend

```
Backend API Response
└─> semantic_version: "1.2"
    └─> Frontend Types (PromptVersion)
        └─> Component Props
            └─> Display: v1.2
```

### Fallback Chain

```
Display Value = semantic_version || version_number
Examples:
  - "1.2" || 5  →  "v1.2"
  - undefined || 5  →  "v5"
```

## Backward Compatibility

The implementation ensures full backward compatibility:

1. **Database**: Both `semantic_version` VARCHAR and `version_number` INT columns exist
2. **API**: Returns both fields in responses
3. **Frontend**: All displays check `semantic_version` first, fall back to `version_number`
4. **Logic**: All comparisons, sorting, and indexing still use `version_number` as the primary key

## Version Number Usage

`version_number` is still used for:

- **Map keys**: `analytics.get(version_number)`
- **Sorting**: `sort((a, b) => b.version_number - a.version_number)`
- **Comparisons**: `version.version_number === bestVersion.version_number`
- **Callbacks**: `onView(version_number)`, `onRollback(version_number)`
- **Internal logic**: Version selection state management

Only **display** uses semantic versions.

## Testing Checklist

To verify the updates work correctly:

1. ✅ Run database migration `002_add_semantic_versioning.sql`
2. ✅ Restart backend server
3. ✅ Create new prompts - should show semantic versions (v1.0)
4. ✅ Make minor change - should increment to v1.1
5. ✅ Make major change - should increment to v2.0
6. ✅ Check version list displays semantic versions
7. ✅ Compare two versions - should show semantic versions in modal
8. ✅ View version content - should show semantic version in modal
9. ✅ Check analytics best version - should show semantic version
10. ✅ Verify legacy versions still display as v1, v2, etc.

## Next Steps

After deployment, monitor:

1. Version display consistency across all UI components
2. Comparison modal showing correct semantic versions
3. Analytics showing semantic versions for best performing prompts
4. No display regression for legacy integer versions
