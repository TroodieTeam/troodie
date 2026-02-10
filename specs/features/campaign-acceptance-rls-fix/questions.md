# Stakeholder Questions: Campaign Acceptance RLS Fix

> Feature: campaign-acceptance-rls-fix
> Spec: `specs/features/campaign-acceptance-rls-fix/spec.md`
> Created: 2026-02-09

## Priority Questions (Blocking)

These MUST be answered before implementation can begin.

### Q1: Is the admin account UUID `a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599` (kouame@troodieapp.com) still the correct/active admin account?
- **Context**: The production RLS policies hardcode this UUID. If this UUID is stale or the admin is using a different account, that alone explains both bugs. The `users` table has a `role` column (added in `20251013_troodie_managed_campaigns_schema.sql`) — we need to confirm this admin user has `role = 'admin'` set.
- **Options**:
  - A) Yes, that's the correct admin UUID and it should have `role = 'admin'` — just fix the RLS policies and ensure the role is set
  - B) The admin account has changed — provide the new UUID/email so we can update
  - C) There are multiple admin accounts that need the `admin` role
- **AI Recommendation**: Option A — the migration will include a safety UPDATE to set `role = 'admin'` for this UUID regardless, and the new policy pattern supports any user with `role = 'admin'`
- **Answer**: The dev UUID (`a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599` / kouame@troodieapp.com) is still active for the dev environment. Production uses a different admin account: UUID `5373475d-b6b5-4abd-bd47-8ec515c44a47`, email `team@troodieapp.com`, name "Troodie Team Admin". This production account already has `role = 'admin'` set. The migration should ensure both accounts have the admin role, and the RLS policy should use the `users.role = 'admin'` pattern so any admin account works.

### Q2: Should the `campaign_deliverables` code use `reviewer_id` or `reviewed_by` for the reviewer column?
- **Context**: The production schema (`production_schema.sql:223`) shows the `campaign_deliverables` table created with `reviewed_by UUID`, but an ALTER migration also added `reviewer_id UUID` (line 164). The code in `deliverableReviewService.ts:116` sets `reviewer_id`. Both columns may exist in production. We need to standardize on one.
- **Options**:
  - A) Use `reviewer_id` (matches current code, matches `campaign_applications.reviewer_id`) — just verify it exists in production
  - B) Use `reviewed_by` (matches the table creation SQL) — update the service code
  - C) Set both columns for backward compatibility
- **AI Recommendation**: Option A — `reviewer_id` is what the code already uses and it's consistent with `campaign_applications.reviewer_id`. The column exists via ALTER migration. We just need to verify it's present in production.
- **Answer**: Use `reviewer_id`. This matches the current code and is consistent with `campaign_applications.reviewer_id`. No code changes needed — just verify the column exists in production.

## Design Tradeoffs (Affects Scope)

These have sensible defaults but stakeholder input is valuable.

### Q3: Should we also fix the business owner UPDATE policy for `campaign_applications` to remove the legacy `OR creator_id = auth.uid()` clause?
- **Context**: The policy `"Business owners can update applications to their campaigns"` checks `WHERE owner_id = auth.uid() OR creator_id = auth.uid()`. The `creator_id` column on `campaigns` is from the original schema (`001_initial_schema.sql:222`) and represents the creator assigned to the campaign, NOT the business owner. Including it could theoretically let an assigned creator modify applications, though this is unlikely to cause real issues since creators don't have the UI to do so.
- **Options**:
  - A) Fix it — remove `OR creator_id = auth.uid()` to tighten security
  - B) Leave it — low risk, avoid scope creep
- **AI Recommendation**: Option A — it's a one-line change in the same migration and prevents a potential privilege escalation
- **Default if unanswered**: A (fix it)
- **Answer**: Using default — A (fix it). Remove `OR creator_id = auth.uid()` to tighten security.

### Q4: Should the migration also clean up the `campaign_deliverables_new` table and its orphaned policies?
- **Context**: Migration `20251016_enhanced_deliverables_system.sql` created `campaign_deliverables_new` with RLS policies, but no code uses this table — all app code uses `campaign_deliverables`. The `_new` table and its policies are dead weight.
- **Options**:
  - A) Drop `campaign_deliverables_new` table in this migration — clean up tech debt
  - B) Leave it — out of scope for this bug fix, address separately
- **AI Recommendation**: Option B — dropping a table in a bug fix migration adds risk; address in a separate cleanup ticket
- **Default if unanswered**: B (leave it)
- **Answer**: Using default — B (leave it). Out of scope for this bug fix.

## Nice-to-Know (Non-blocking)

These provide helpful context but won't block implementation.

### Q5: Are there other admin-only operations that might have the same hardcoded UUID problem?
- **Context**: The production schema shows the hardcoded UUID pattern for campaign-related policies. Other tables (like `platform_managed_campaigns`) use the `users.role = 'admin'` pattern correctly. There may be additional policies on other tables that need the same fix.
- **Answer**: Not answered — will audit separately if needed.

---

## How to Approve

Once Priority Questions are answered, approve the spec:

```
/groom --approve campaign-acceptance-rls-fix Q1: [answer] Q2: [answer] Q3: [answer or "use default"] Q4: [answer or "use default"]
```

Design Tradeoffs default to AI recommendations if not explicitly answered.
Nice-to-Know questions are optional.
