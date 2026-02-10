# Campaign Acceptance RLS Fix Technical Specification

> Status: APPROVED
> Created: 2026-02-09
> Source: TRO-148 (Application approval error) + TRO-149 (Content approval error)
> Feature: campaign-acceptance-rls-fix

## Overview

Two critical bugs prevent admins and business owners from accepting creator campaign applications (TRO-148) and approving creator-submitted content/deliverables (TRO-149). Both errors surface as "Failed to update application" and are caused by misconfigured Row Level Security (RLS) policies on the `campaign_applications` and `campaign_deliverables` tables.

## Problem Statement

Admins managing the Creator Marketplace cannot:
1. **Accept** a creator's application to a campaign (TRO-148) — pressing "Accept" shows error dialog "Failed to update application"
2. **Approve** a creator's submitted content deliverable (TRO-149) — pressing "Approve" shows same error

This blocks the entire campaign workflow. Creators cannot progress through campaigns, restaurants cannot receive content, and Troodie-managed campaigns are stuck. The root cause is that admin RLS policies use a hardcoded UUID (dev: `a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599`, prod: `5373475d-b6b5-4abd-bd47-8ec515c44a47`) instead of the `users.role = 'admin'` pattern used elsewhere in the codebase. In production, the admin account is `team@troodieapp.com` (UUID `5373475d-b6b5-4abd-bd47-8ec515c44a47`) which already has `role = 'admin'` set but the RLS policies don't check this column.

## Root Cause Analysis

### TRO-148: Application Accept Failure

**Code path**: `hooks/useCampaignActions.ts:277-301` → `handleApplicationAction()` → Supabase `.update()` on `campaign_applications`

**Current RLS policies** (from `production_schema.sql:337-377`):

| Policy | Condition | Issue |
|--------|-----------|-------|
| "Business owners can update applications" | `campaign_id IN (SELECT id FROM campaigns WHERE owner_id = auth.uid() OR creator_id = auth.uid())` | Works for campaign owners; `creator_id` is a legacy column that may be NULL for newer campaigns |
| "Admins can update any application" | `auth.uid() IN ('a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599')` | Hardcoded UUID — fails if admin uses different account or UUID is stale |

**Why it fails**: The admin's `auth.uid()` doesn't match the hardcoded UUID. For Troodie-managed campaigns, the admin may also not be the `owner_id`.

### TRO-149: Deliverable Approve Failure

**Code path**: `hooks/useCampaignActions.ts:37-44` → `services/deliverableReviewService.ts:51-169` → `approveDeliverable()` → Supabase `.update()` on `campaign_deliverables`

**Current RLS policies** (from `production_schema.sql:342-385`):

| Policy | Condition | Issue |
|--------|-----------|-------|
| "Restaurants can update campaign deliverables" | JOIN through `business_profiles` to match `user_id = auth.uid()` | Only works for business owners with matching `business_profiles` entry |
| "Admins can update all deliverables" | `auth.uid() IN ('a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599')` | Same hardcoded UUID issue |

**Column name**: The code in `deliverableReviewService.ts:116` sets `reviewer_id` — this is confirmed as the correct column name. The production table has both `reviewed_by` (from table creation) and `reviewer_id` (from ALTER migration). The code should continue using `reviewer_id` for consistency with `campaign_applications.reviewer_id`.

## Technical Design

### Database Schema

#### No New Tables Required

#### RLS Policy Changes

**Migration: `supabase/migrations/20260209_fix_campaign_acceptance_rls.sql`**

```sql
-- ============================================================================
-- FIX: Campaign Application & Deliverable Admin RLS Policies
-- Tickets: TRO-148, TRO-149
--
-- Root cause: Admin policies use hardcoded UUID instead of users.role = 'admin'
-- Fix: Standardize admin policies to use users.role pattern (consistent with
-- 20251013_troodie_managed_campaigns_schema.sql and
-- 20251016_enhanced_deliverables_system.sql)
-- ============================================================================

-- ============================================================================
-- 1. FIX campaign_applications ADMIN POLICY (TRO-148)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can update any application" ON campaign_applications;
CREATE POLICY "Admins can update any application" ON campaign_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Also add admin SELECT policy (needed for admin to view all applications)
DROP POLICY IF EXISTS "Admins can view any application" ON campaign_applications;
CREATE POLICY "Admins can view any application" ON campaign_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- 2. FIX business owner UPDATE policy — remove legacy OR creator_id clause
-- ============================================================================

DROP POLICY IF EXISTS "Business owners can update applications to their campaigns" ON campaign_applications;
CREATE POLICY "Business owners can update applications to their campaigns" ON campaign_applications
  FOR UPDATE USING (campaign_id IN (
    SELECT id FROM campaigns WHERE owner_id = auth.uid()
  ));

-- ============================================================================
-- 3. FIX campaign_deliverables ADMIN POLICY (TRO-149)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can update all deliverables" ON campaign_deliverables;
CREATE POLICY "Admins can update all deliverables" ON campaign_deliverables
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view all deliverables" ON campaign_deliverables;
CREATE POLICY "Admins can view all deliverables" ON campaign_deliverables
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- 4. ENSURE admin users have correct role in both environments
-- ============================================================================

-- Dev admin (kouame@troodieapp.com)
UPDATE users SET role = 'admin' WHERE id = 'a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599';
-- Production admin (team@troodieapp.com)
UPDATE users SET role = 'admin' WHERE id = '5373475d-b6b5-4abd-bd47-8ec515c44a47';
```

### Services

| Service | File | Changes | Description |
|---------|------|---------|-------------|
| Deliverable Review | `services/deliverableReviewService.ts` | Improve error logging | Add Supabase error details to console.error |
| Campaign Actions Hook | `hooks/useCampaignActions.ts` | Improve error logging | Surface actual error message instead of generic "Failed to update" |

### Code Changes

#### `hooks/useCampaignActions.ts` — Better Error Logging

**Lines 277-301** (`handleApplicationAction`):
- Change the catch block to log the actual Supabase error object
- Show more descriptive error message to the user (include error code if available)

**Lines 107-110** (`handleDeliverableStatusChange`):
- Same improvement — surface actual error details

#### `services/deliverableReviewService.ts` — Column Name Confirmed

**Lines 113-118** (`approveDeliverable` update):
- `reviewer_id` is confirmed as the correct column name (matches code, matches `campaign_applications.reviewer_id`)
- `restaurant_feedback` column confirmed in production schema (`production_schema.sql:225`)
- No code changes needed here — column names are correct

## Security

### Access Control

| Action | Consumer | Creator | Business | Admin |
|--------|----------|---------|----------|-------|
| View campaign applications | -- | Own only | Own campaigns | All |
| Accept/Reject applications | -- | -- | Own campaigns | All |
| View deliverables | -- | Own only | Own campaigns | All |
| Approve/Reject deliverables | -- | -- | Own campaigns | All |

### Data Protection

- Admin access is gated by `users.role = 'admin'` column (set via direct DB, not user-facing)
- Business owner access is scoped to their own campaigns via `owner_id` or `business_profiles.restaurant_id`
- No new sensitive data introduced

## Edge Cases

| Scenario | Expected Behavior | Implementation Note |
|----------|-------------------|---------------------|
| Admin user without `role = 'admin'` set | Policy fails, update blocked | Migration includes UPDATE to set role for known admin UUID |
| Campaign with NULL `owner_id` | Business owner policy fails, but admin policy succeeds | Admin policy is independent of campaign ownership |
| Deliverable with status other than `pending_review` | Restaurant owner policy may block, admin policy succeeds | Admin has no status restriction |
| Multiple admin accounts | All users with `role = 'admin'` can manage | Scalable approach vs hardcoded UUID |

## Error Handling

| Error Condition | Current Behavior | Fixed Behavior |
|-----------------|-----------------|----------------|
| RLS blocks application update | "Failed to update application" (generic) | Log actual Supabase error; show "Permission denied: contact support" if RLS error |
| RLS blocks deliverable update | "Failed to update deliverable status" (generic) | Log actual Supabase error; show descriptive message |
| Column name mismatch | Silent failure or cryptic error | Verified column names match production schema |

## Implementation Phases

### Phase 1: Fix RLS Policies (Critical)
**Goal**: Unblock admin acceptance workflow for both applications and deliverables

#### Tasks
- [ ] **Task 1.1**: Create migration `20260209_fix_campaign_acceptance_rls.sql`
  - Files: NEW `supabase/migrations/20260209_fix_campaign_acceptance_rls.sql`
  - Acceptance: Admin can accept applications and approve deliverables
- [ ] **Task 1.2**: Deploy migration to production
  - Run `npm run db:migrate`
  - Acceptance: Policies visible in Supabase dashboard

### Phase 2: Improve Error Handling
**Goal**: Better debugging and user-facing error messages

#### Tasks
- [ ] **Task 2.1**: Update `handleApplicationAction` error handling
  - Files: `hooks/useCampaignActions.ts:277-301`
  - Acceptance: Console shows actual Supabase error; user sees descriptive message
- [ ] **Task 2.2**: Update `handleDeliverableStatusChange` error handling
  - Files: `hooks/useCampaignActions.ts:107-110`
  - Acceptance: Console shows actual Supabase error; user sees descriptive message
- [ ] **Task 2.3**: Column name alignment verified — `reviewer_id` is correct (no changes needed)
  - Files: `services/deliverableReviewService.ts:113-118`
  - Acceptance: Confirmed — `reviewer_id` matches production schema

## Testing Requirements

### Manual Testing
- [ ] Log in as admin → navigate to campaign → Applications tab → press "Accept" → should succeed
- [ ] Log in as admin → navigate to campaign → view submitted deliverable → press "Approve" → should succeed
- [ ] Log in as business owner → same flows → should succeed for own campaigns
- [ ] Log in as creator → verify cannot accept/approve others' applications/deliverables

### SQL Verification
```sql
-- Verify admin policies exist with correct pattern
SELECT policyname, cmd, qual FROM pg_policies
WHERE tablename IN ('campaign_applications', 'campaign_deliverables')
AND policyname LIKE '%Admin%';

-- Verify admin user has role set
SELECT id, email, role FROM users WHERE role = 'admin';
```

## Acceptance Criteria

- [ ] Admin can accept creator campaign applications without error
- [ ] Admin can approve creator-submitted deliverables without error
- [ ] Business owners can still accept/approve for their own campaigns
- [ ] Creators cannot accept/approve applications or deliverables they don't own
- [ ] Error messages in catch blocks log the actual Supabase error for debugging
- [ ] RLS policies use `users.role = 'admin'` pattern (no hardcoded UUIDs or emails)
