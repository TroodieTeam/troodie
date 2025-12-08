# Task CM-12: Simplify Campaign Creation Form

**Priority:** 🟡 P2 - Medium
**Severity:** Low
**Feature:** CM-7 (Campaign Creation)
**Estimated Effort:** 3-4 hours
**Status:** Not Started
**Related Audit:** `.tasks/creator-marketplace-audit-findings.md` - Section 6

---

## Problem Statement

The campaign creation form collects several fields that add friction without providing value. After deep analysis from a restaurant owner's perspective, we identified 4 fields that should be removed:

| Field | Issue |
|-------|-------|
| `posting_schedule` | Micromanagement; use requirements if timing matters |
| `brand_guidelines` | Redundant with description + requirements |
| `content_type[]` | Redundant with deliverables |
| `target_audience` | Not actionable; audience implicit in creator selection |

---

## Current Form Structure (4 Steps)

```
Step 1: Campaign Basics
  - Title (required)
  - Description (required)
  - Brand Guidelines (optional)  ← REMOVE

Step 2: Budget & Timeline
  - Budget (required)
  - Deadline (required)
  - Posting Schedule (optional)  ← REMOVE

Step 3: Deliverables
  - Deliverables (required)

Step 4: Content & Audience
  - Content Types (required)     ← REMOVE
  - Target Audience (optional)   ← REMOVE
  - Requirements (optional)
```

---

## Proposed Form Structure (3 Steps)

```
Step 1: Campaign Basics
  - Title (required)
  - Description (required) - Updated placeholder to include guidelines prompt

Step 2: Budget & Timeline
  - Budget (required)
  - Deadline (required)

Step 3: Deliverables & Requirements
  - Deliverables (required)
  - Requirements (optional)
```

---

## Technical Requirements

### File: `app/(tabs)/business/campaigns/create.tsx`

### 1. Update Form Data Interface

```typescript
// BEFORE
interface CampaignFormData {
  title: string;
  description: string;
  budget: string;
  deadline: string;
  requirements: string[];
  deliverables: Deliverable[];
  target_audience: string;      // REMOVE
  content_type: string[];       // REMOVE
  posting_schedule: string;     // REMOVE
  brand_guidelines: string;     // REMOVE
}

// AFTER
interface CampaignFormData {
  title: string;
  description: string;
  budget: string;
  deadline: string;
  requirements: string[];
  deliverables: Deliverable[];
}
```

### 2. Update Initial State

```typescript
// BEFORE
const [formData, setFormData] = useState<CampaignFormData>({
  title: '',
  description: '',
  budget: '',
  deadline: '',
  requirements: [],
  deliverables: [],
  target_audience: '',
  content_type: [],
  posting_schedule: '',
  brand_guidelines: '',
});

// AFTER
const [formData, setFormData] = useState<CampaignFormData>({
  title: '',
  description: '',
  budget: '',
  deadline: '',
  requirements: [],
  deliverables: [],
});
```

### 3. Update Step Count

```typescript
// BEFORE
const totalSteps = 4;

// AFTER
const totalSteps = 3;
```

### 4. Update Step Validation

```typescript
// BEFORE
const validateStep = (step: number): boolean => {
  switch (step) {
    case 1:
      return formData.title.trim() !== '' && formData.description.trim() !== '';
    case 2:
      return formData.budget !== '' && formData.deadline !== '';
    case 3:
      return formData.deliverables.length > 0;
    case 4:
      return formData.content_type.length > 0; // Content types required
    default:
      return false;
  }
};

// AFTER
const validateStep = (step: number): boolean => {
  switch (step) {
    case 1:
      return formData.title.trim() !== '' && formData.description.trim() !== '';
    case 2:
      return formData.budget !== '' && formData.deadline !== '';
    case 3:
      return formData.deliverables.length > 0;
    default:
      return false;
  }
};
```

### 5. Update Step Indicator

```typescript
// BEFORE
{[1, 2, 3, 4].map((step) => (

// AFTER
{[1, 2, 3].map((step) => (
```

### 6. Remove Step 4 Render

Delete or comment out `renderStep4()` function.

### 7. Update Step 1 Description Placeholder

```typescript
// BEFORE
placeholder="Describe what you want creators to showcase..."

// AFTER
placeholder="Describe what you want creators to showcase. Include any specific hashtags, mentions, or guidelines..."
```

### 8. Remove Posting Schedule from Step 2

Delete the "Posting Schedule" input section from `renderStep2()`.

### 9. Remove Brand Guidelines from Step 1

Delete the "Brand Guidelines" input section from `renderStep1()`.

### 10. Move Requirements to Step 3

Add requirements section to `renderStep3()` after deliverables:

```tsx
const renderStep3 = () => {
  // ... existing deliverables code ...

  return (
    <View>
      {/* Deliverables Section - existing */}
      <Text style={styles.stepTitle}>Deliverables</Text>
      {/* ... deliverable add form ... */}
      {/* ... deliverable list ... */}

      {/* Requirements Section - moved from Step 4 */}
      <View style={{ marginTop: 24 }}>
        <Text style={styles.sectionTitle}>Additional Requirements (Optional)</Text>
        <Text style={styles.sectionHint}>
          Add specific asks like hashtags, mentions, or timing
        </Text>
        {/* ... requirement input and list ... */}
      </View>
    </View>
  );
};
```

### 11. Update handleSubmit

```typescript
// BEFORE
const deliverableRequirements = {
  deliverables: formData.deliverables,
  target_audience: formData.target_audience,
  content_type: formData.content_type,
  posting_schedule: formData.posting_schedule,
  brand_guidelines: formData.brand_guidelines,
};

// AFTER
const deliverableRequirements = {
  deliverables: formData.deliverables,
  // Removed: target_audience, content_type, posting_schedule, brand_guidelines
};
```

---

## Removed UI Elements

### From Step 1 (renderStep1):
- Remove "Brand Guidelines" TextInput section

### From Step 2 (renderStep2):
- Remove "Posting Schedule" TextInput section

### Step 4 (renderStep4):
- Delete entire function
- Remove `{currentStep === 4 && renderStep4()}` from render

### Constants to Remove:
```typescript
// DELETE this constant
const CONTENT_TYPES = [
  'Photo Posts',
  'Video Content',
  'Reels/Stories',
  'Blog Reviews',
  'Live Streaming',
];
```

---

## Database Impact

**No migration needed.** The `deliverable_requirements` JSONB field can store any structure. We're simply not populating the removed fields anymore.

Existing campaigns with these fields will continue to work; the data just won't be displayed (it wasn't being displayed before anyway).

---

## Testing Requirements

### Unit Tests

1. Form submits successfully with new 3-step flow
2. Validation works correctly for each step
3. Campaign created with correct data structure

### Integration Tests

1. Create campaign end-to-end with new form
2. Verify campaign appears in business dashboard
3. Verify campaign appears in creator explore
4. Verify deliverables stored correctly

### Regression Tests

1. Existing campaigns still display correctly
2. No errors from missing fields in old campaigns

---

## Acceptance Criteria

- [ ] Form reduced from 4 steps to 3 steps
- [ ] Brand Guidelines field removed from Step 1
- [ ] Posting Schedule field removed from Step 2
- [ ] Content Types selection removed entirely
- [ ] Target Audience field removed entirely
- [ ] Requirements moved to Step 3 (with deliverables)
- [ ] Step indicators show 3 steps
- [ ] Validation updated for 3 steps
- [ ] Description placeholder updated with guidelines hint
- [ ] Form submits successfully
- [ ] Campaign created in database correctly
- [ ] No TypeScript errors

---

## UX Improvement

The simplified form provides a better restaurant owner experience:

**Before:** 7+ fields across 4 steps, some redundant
**After:** 5 fields across 3 steps, each essential

Restaurant owners can now create campaigns faster with less cognitive load.

---

## Related Files

- `app/(tabs)/business/campaigns/create.tsx` - Campaign creation form
- `types/campaign.ts` - Campaign types (if exists)

---

## Notes

- Low risk change - only removing unused form fields
- No database migration required
- Improves UX for restaurant owners
- Should be done alongside CM-13 (display deliverables to creators)
