# Engineering Task: Campaign Status Consistency

## Overview
Ensure campaign status values are consistent across database, TypeScript types, and UI components.

## Current State

### Database Constraint
- **Status**: ✅ Fixed (migration `20250122_add_draft_status_to_campaigns.sql`)
- **Allowed values**: `pending`, `draft`, `active`, `review`, `completed`, `cancelled`

### TypeScript Types
- **File**: `types/campaign.ts`
- **Current**: `status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'`
- **Issue**: Includes `'paused'` which is not in database constraint
- **Missing**: `'pending'` and `'review'` which are in database constraint

### UI Components
- **Status**: ⚠️ Needs review
- **Files to check**:
  - `app/(tabs)/business/campaigns/index.tsx` - Has draft filter
  - `app/admin/campaigns/[id].tsx` - Has draft color handling
  - `app/admin/campaigns/index.tsx` - Has draft color handling
  - `app/(tabs)/business/campaigns/[id].tsx` - Missing draft handling

## Tasks

### 1. Update TypeScript Types
**File**: `types/campaign.ts`

Update the Campaign interface to match database constraint:
```typescript
status: 'pending' | 'draft' | 'active' | 'review' | 'completed' | 'cancelled';
```

**Decision needed**: Should we keep `'paused'` as an alias for something, or remove it?

### 2. Audit UI Components
Review all campaign status handling in UI to ensure:
- All status values from database are handled
- Status colors are consistent
- Status filters work correctly
- Status transitions are valid

**Files to review**:
- [ ] `app/(tabs)/business/campaigns/index.tsx`
- [ ] `app/(tabs)/business/campaigns/[id].tsx`
- [ ] `app/(tabs)/business/campaigns/create.tsx`
- [ ] `app/admin/campaigns/index.tsx`
- [ ] `app/admin/campaigns/[id].tsx`
- [ ] `app/admin/campaigns/create.tsx`
- [ ] `app/creator/campaigns.tsx`

### 3. Status Transition Logic
Document and implement valid status transitions:
- `pending` → `draft` → `active` → `review` → `completed`
- `pending` → `active` (direct)
- Any status → `cancelled` (can cancel at any time)

### 4. Status Display Consistency
Ensure all components use consistent:
- Status labels (e.g., "Draft" vs "Drafts")
- Status colors
- Status icons/badges

## Acceptance Criteria

- [ ] TypeScript types match database constraint exactly
- [ ] All UI components handle all valid status values
- [ ] Status transitions are validated in business logic
- [ ] Status display is consistent across all screens
- [ ] No TypeScript errors related to campaign status
- [ ] Test data generation uses valid status values

## Related Files

- Database: `supabase/migrations/20250122_add_draft_status_to_campaigns.sql`
- Types: `types/campaign.ts`
- Test Data: `data/test-data/dev/09-create-campaigns.sql`

## Notes

- The `'paused'` status in TypeScript types may be legacy or intended for future use
- Consider creating a shared status constant/enum to prevent drift
- Review campaign creation flow to ensure default status is appropriate

