# Enhanced Deliverables System - Deployment Guide

**Date:** October 16, 2025
**Feature:** Enhanced Deliverables System with Auto-Approval
**Migration:** `20251016_enhanced_deliverables_system.sql`
**Status:** Ready for Staging Deployment

---

## 📋 Pre-Deployment Checklist

### Requirements
- [ ] Supabase project access (project ref: `tcultsriqunnxujqiwea`)
- [ ] Database admin credentials
- [ ] Backup of production database (if deploying to prod)
- [ ] Review migration SQL file
- [ ] Staging environment ready for testing

### Files to Deploy
- ✅ `supabase/migrations/20251016_enhanced_deliverables_system.sql` (1,090 lines)
- ✅ `types/deliverableRequirements.ts`
- ✅ `services/deliverableSubmissionService.ts`
- ✅ `services/deliverableReviewService.ts`
- ✅ `constants/campaignPresets.ts`
- ✅ `components/admin/DeliverableRequirementsForm.tsx`
- ✅ `app/creator/campaigns/[id]/submit-deliverable.tsx`
- ✅ `app/business/campaigns/[id]/review-deliverables.tsx`

---

## 🚀 Step 1: Deploy Database Migration to Staging

### Option A: Supabase Dashboard (Recommended)

1. **Open Supabase SQL Editor**
   ```
   https://supabase.com/dashboard/project/tcultsriqunnxujqiwea/sql/new
   ```

2. **Copy Migration SQL**
   ```bash
   cat supabase/migrations/20251016_enhanced_deliverables_system.sql
   ```

3. **Paste and Execute**
   - Paste the entire migration into the SQL editor
   - Click "Run" or press Cmd/Ctrl + Enter
   - Wait for execution (should take 5-10 seconds)

4. **Verify Success**
   Look for the success message:
   ```
   ✅ ENHANCED DELIVERABLES SYSTEM MIGRATION COMPLETE
   ```

### Option B: Supabase CLI

```bash
# Make sure you're in the project root
cd /Users/kndri/projects/troodie

# Link to your project (if not already linked)
supabase link --project-ref tcultsriqunnxujqiwea

# Push the migration
supabase db push

# Or apply specific migration
supabase db push --include-schema public
```

### Option C: Direct psql Connection

```bash
# Set your database password
export PGPASSWORD="your-database-password"

# Apply migration
psql "postgresql://postgres:$PGPASSWORD@db.tcultsriqunnxujqiwea.supabase.co:5432/postgres" \
  -f supabase/migrations/20251016_enhanced_deliverables_system.sql
```

---

## ✅ Step 2: Verify Migration Success

### Check 1: Verify Tables

Run this query in Supabase SQL editor:

```sql
-- Check if campaign_deliverables table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'campaign_deliverables'
) as table_exists;

-- Check columns on campaigns table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'campaigns'
AND column_name = 'deliverable_requirements';

-- Check columns on creator_campaigns table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'creator_campaigns'
AND column_name IN ('deliverables_submitted', 'restaurant_review_deadline', 'auto_approved');
```

**Expected Results:**
- `table_exists` = true
- `deliverable_requirements` exists with type `jsonb`
- All 3 columns exist on `creator_campaigns`

### Check 2: Verify Functions

```sql
-- List all deliverable-related functions
SELECT proname, pronargs
FROM pg_proc
WHERE proname LIKE '%deliverable%' OR proname LIKE '%auto_approve%';
```

**Expected Functions:**
- `get_auto_approval_deadline`
- `should_auto_approve`
- `time_until_auto_approval`
- `auto_approve_overdue_deliverables`
- `validate_deliverable_requirements`
- `update_creator_campaign_deliverable_status`

### Check 3: Verify Views

```sql
-- Check views
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
AND (table_name LIKE '%deliverable%');
```

**Expected Views:**
- `pending_deliverables_summary`
- `deliverable_statistics`

### Check 4: Verify RLS Policies

```sql
-- Check RLS policies on campaign_deliverables
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'campaign_deliverables';
```

**Expected Policies (7 total):**
- Creators can view own deliverables (SELECT)
- Creators can create own deliverables (INSERT)
- Creators can update own pending deliverables (UPDATE)
- Restaurants can view campaign deliverables (SELECT)
- Restaurants can update campaign deliverables (UPDATE)
- Admins can view all deliverables (SELECT)
- Admins can update all deliverables (UPDATE)

### Check 5: Verify Indexes

```sql
-- Check indexes
SELECT indexname
FROM pg_indexes
WHERE tablename = 'campaign_deliverables';
```

**Expected Indexes (6 total):**
- `idx_deliverables_creator_campaign`
- `idx_deliverables_campaign`
- `idx_deliverables_creator`
- `idx_deliverables_status`
- `idx_deliverables_submitted`
- `idx_deliverables_auto_approval_check`

---

## 🧪 Step 3: Integration Testing

### Test 1: Insert Test Campaign with Deliverable Requirements

```sql
-- Insert a test campaign with deliverable requirements
INSERT INTO campaigns (
  restaurant_id,
  title,
  description,
  budget,
  deliverable_requirements
) VALUES (
  (SELECT id FROM restaurants LIMIT 1), -- Use any restaurant
  'Test Campaign - Deliverable Requirements',
  'Testing the enhanced deliverables system',
  5000, -- $50
  '{
    "title": "Test Deliverable",
    "goal": "awareness",
    "type": "reel",
    "due_date": "2025-11-01",
    "compensation_type": "cash",
    "compensation_value": 5000,
    "visit_type": "dine_in",
    "payment_timing": "after_post",
    "revisions_allowed": 2,
    "creative": {
      "tone": ["fun", "trendy"],
      "themes": ["food_closeups"]
    },
    "approval": {
      "pre_approval_required": false,
      "handles": ["@TroodieApp"],
      "hashtags": ["#TroodieTest"],
      "repost_rights": true
    }
  }'::jsonb
)
RETURNING id, title, deliverable_requirements;
```

### Test 2: Insert Test Deliverable Submission

```sql
-- Insert a test deliverable
INSERT INTO campaign_deliverables (
  creator_campaign_id,
  campaign_id,
  creator_id,
  deliverable_index,
  platform,
  post_url,
  caption,
  notes_to_restaurant,
  status
) VALUES (
  (SELECT id FROM creator_campaigns LIMIT 1), -- Use any creator campaign
  (SELECT id FROM campaigns WHERE title LIKE 'Test Campaign%' LIMIT 1),
  (SELECT id FROM users WHERE account_type = 'creator' LIMIT 1),
  1,
  'instagram',
  'https://instagram.com/p/test123',
  'Test post caption',
  'This is a test submission',
  'pending'
)
RETURNING id, deliverable_id, platform, status, submitted_at,
  get_auto_approval_deadline(id) as auto_approval_deadline,
  time_until_auto_approval(id) as time_remaining;
```

### Test 3: Query Pending Deliverables View

```sql
-- Test the pending deliverables view
SELECT
  deliverable_id,
  creator_name,
  platform,
  hours_remaining,
  auto_approval_deadline
FROM pending_deliverables_summary
LIMIT 5;
```

### Test 4: Test Auto-Approval Function (Dry Run)

```sql
-- Check which deliverables would be auto-approved
SELECT
  id,
  post_url,
  submitted_at,
  should_auto_approve(id) as should_approve,
  time_until_auto_approval(id) as time_remaining
FROM campaign_deliverables
WHERE status = 'pending';
```

### Test 5: Test Validation Function

```sql
-- Test deliverable requirements validation
SELECT validate_deliverable_requirements('{
  "title": "Test",
  "goal": "awareness",
  "type": "reel",
  "due_date": "2025-11-01",
  "compensation_type": "cash",
  "compensation_value": 5000,
  "visit_type": "dine_in",
  "payment_timing": "after_post",
  "revisions_allowed": 2
}'::jsonb) as is_valid;

-- Should return TRUE
```

---

## 🧹 Step 4: Cleanup Test Data

After testing, clean up:

```sql
-- Delete test deliverables
DELETE FROM campaign_deliverables
WHERE campaign_id IN (
  SELECT id FROM campaigns WHERE title LIKE 'Test Campaign%'
);

-- Delete test campaigns
DELETE FROM campaigns
WHERE title LIKE 'Test Campaign%';
```

---

## 📊 Step 5: Monitor Performance

### Check Query Performance

```sql
-- Check if indexes are being used
EXPLAIN ANALYZE
SELECT * FROM campaign_deliverables
WHERE status = 'pending'
AND submitted_at < NOW() - INTERVAL '72 hours';

-- Should use idx_deliverables_auto_approval_check
```

### Check Table Size

```sql
-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN ('campaign_deliverables', 'campaigns', 'creator_campaigns')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 🚨 Troubleshooting

### Issue: Migration Fails with "Column Already Exists"

**Solution:** Migration is idempotent. Columns use `IF NOT EXISTS`. Re-run migration.

### Issue: RLS Policies Block Access

**Check:**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'campaign_deliverables';

-- Check your user's role
SELECT current_user, current_setting('request.jwt.claims', true)::json;
```

### Issue: Views Return No Data

**Check:**
```sql
-- Check if views exist
SELECT * FROM information_schema.views
WHERE table_name = 'pending_deliverables_summary';

-- Try querying directly
SELECT * FROM campaign_deliverables WHERE status = 'pending';
```

### Issue: Functions Not Found

**Solution:**
```sql
-- Re-create functions (they're in the migration)
-- Or check if they exist:
SELECT proname FROM pg_proc WHERE proname LIKE '%auto_approve%';
```

---

## 🔄 Rollback Plan

If something goes wrong, rollback with:

```sql
-- Drop new table
DROP TABLE IF EXISTS campaign_deliverables CASCADE;

-- Drop views
DROP VIEW IF EXISTS pending_deliverables_summary;
DROP VIEW IF EXISTS deliverable_statistics;

-- Drop functions
DROP FUNCTION IF EXISTS get_auto_approval_deadline(UUID);
DROP FUNCTION IF EXISTS should_auto_approve(UUID);
DROP FUNCTION IF EXISTS time_until_auto_approval(UUID);
DROP FUNCTION IF EXISTS auto_approve_overdue_deliverables();
DROP FUNCTION IF EXISTS validate_deliverable_requirements(JSONB);
DROP FUNCTION IF EXISTS update_creator_campaign_deliverable_status();

-- Remove columns from campaigns
ALTER TABLE campaigns DROP COLUMN IF EXISTS deliverable_requirements;

-- Remove columns from creator_campaigns
ALTER TABLE creator_campaigns DROP COLUMN IF EXISTS deliverables_submitted;
ALTER TABLE creator_campaigns DROP COLUMN IF EXISTS all_deliverables_submitted;
ALTER TABLE creator_campaigns DROP COLUMN IF EXISTS restaurant_review_deadline;
ALTER TABLE creator_campaigns DROP COLUMN IF EXISTS auto_approved;
```

---

## ✅ Post-Deployment Checklist

After successful deployment:

- [ ] All verification queries pass
- [ ] Test data inserted successfully
- [ ] Views return expected data
- [ ] Functions execute without errors
- [ ] RLS policies working correctly
- [ ] Performance is acceptable
- [ ] Test data cleaned up
- [ ] Document deployment date and time
- [ ] Notify team of successful deployment
- [ ] Update staging environment status

---

## 📝 Deployment Log Template

```
Deployment Date: _______________
Deployed By: _______________
Environment: [ ] Staging [ ] Production
Migration File: 20251016_enhanced_deliverables_system.sql
Result: [ ] Success [ ] Failed
Notes:
_________________________________
_________________________________
_________________________________
```

---

## 🔗 Next Steps After Deployment

1. **Test UI Components**
   - Submit a test deliverable via app
   - Review deliverable via restaurant dashboard
   - Test approve/reject/request changes

2. **Set Up Edge Function (Phase 5)**
   - Deploy auto-approval cron job
   - Schedule hourly execution
   - Test auto-approval workflow

3. **Launch Troodie Originals Campaign**
   - Create campaign using preset
   - Recruit 5 test creators
   - Monitor first submissions

4. **Monitor Metrics**
   - Deliverable submission rate
   - Review completion time
   - Auto-approval rate
   - Creator satisfaction

---

**Deployment Status:** 🟡 **READY FOR STAGING**

**Last Updated:** October 16, 2025
**Migration Version:** 20251016
**Database Changes:** 1 new table, 4 column additions, 6 functions, 2 views, 7 RLS policies
