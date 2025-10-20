# Quick Test Guide - Troodie Originals (15 minutes)

**Get started testing the Troodie Originals and Enhanced Deliverables system in 15 minutes**

---

## ⚡ Prerequisites (2 minutes)

1. **Supabase Access:** https://supabase.com/dashboard/project/tcultsriqunnxujqiwea
2. **Test Accounts:**
   - Admin: kouame@troodieapp.com
   - Creator: [Your test creator account]
   - Restaurant: [Your test restaurant account]
3. **App Access:** Troodie app on device or simulator

---

## Step 1: Deploy Database (3 minutes)

### Option A: Supabase Dashboard (Recommended)

1. Open: https://supabase.com/dashboard/project/tcultsriqunnxujqiwea/sql/new

2. Copy this file: `supabase/migrations/20251016_enhanced_deliverables_system.sql`

3. Paste into SQL editor and click "Run"

4. Wait for success message: ✅ **"ENHANCED DELIVERABLES SYSTEM MIGRATION COMPLETE"**

### Option B: Command Line

```bash
cd /Users/kndri/projects/troodie
npm run db:migrate
```

### Verify Success

Run this query in SQL editor:
```sql
SELECT COUNT(*) as tables_created FROM information_schema.tables
WHERE table_name = 'campaign_deliverables';
```

**Expected Result:** `tables_created = 1`

---

## Step 2: Create Test Campaign (2 minutes)

### Run Campaign Script

1. Open: https://supabase.com/dashboard/project/tcultsriqunnxujqiwea/sql/new

2. Copy this file: `scripts/create-troodie-originals-campaign.sql`

3. Paste into SQL editor and click "Run"

4. Wait for success message showing campaign details

### Verify Campaign

```sql
SELECT id, title, budget, max_creators, status
FROM campaigns
WHERE title = 'Troodie Creators: Local Gems';
```

**Expected Result:** One row with:
- budget = 250
- max_creators = 5
- status = 'active'

---

## Step 3: Test Creator Flow (4 minutes)

### 3.1 Login as Creator
Open Troodie app → Login with creator account

Dev note:
- OTP-first flow remains. For seeded test emails like `creator1@troodieapp.com`, you can use code `000000` during verification (dev only) – it will create a real session via password fallback.
- Optional dev toggle: set `EXPO_PUBLIC_AUTH_LOGIN_MODE=password` to show a password field and sign in directly.

### 3.2 Find Campaign
- Navigate to **"Campaigns"** or **"Marketplace"** tab
- Look for: **"Troodie Creators: Local Gems"**
- Should see **"Troodie Original"** badge

### 3.3 View Details
- Tap on campaign
- Verify you see:
  - ✓ Description
  - ✓ $50 compensation
  - ✓ Requirements list
  - ✓ "Apply" button

### 3.4 Apply
- Tap **"Apply"**
- Fill out application (if form exists)
- Submit

### 3.5 Verify Application
Run in SQL editor:
```sql
SELECT ca.id, ca.status, ca.applied_at, cp.display_name, u.email
FROM campaign_applications ca
JOIN creator_profiles cp ON cp.id = ca.creator_id
JOIN users u ON u.id = cp.user_id
WHERE ca.campaign_id = (
  SELECT id FROM campaigns WHERE title = 'Troodie Creators: Local Gems'
)
ORDER BY ca.applied_at DESC
LIMIT 1;
```

**Expected Result:** Application with status = 'pending' and creator email = 'creator1@troodieapp.com'

---

## Step 4: Accept Application (2 minutes)

### 4.1 Accept via SQL (Quick Method)
```sql
UPDATE creator_campaigns
SET status = 'accepted', accepted_at = NOW()
WHERE campaign_id = (
  SELECT id FROM campaigns WHERE title = 'Troodie Creators: Local Gems'
)
AND status = 'pending'
RETURNING id, status;
```

**OR**

### 4.2 Accept via Admin UI
- Login as admin (kouame@troodieapp.com)
- Go to Admin Dashboard → Campaigns
- Open "Troodie Creators: Local Gems"
- View Applications
- Click "Accept" on application

### 4.3 Verify
Creator should receive notification and see campaign in "My Campaigns"

---

## Step 5: Test Deliverable Submission (4 minutes)

### 5.1 Submit Deliverable (Creator)
- Open "My Campaigns" as creator
- Open "Troodie Creators: Local Gems"
- Tap **"Submit Deliverable"**
- Fill out form:
  - Platform: **Instagram**
  - Post URL: `https://instagram.com/p/test_abc123`
  - Notes: "Test submission for QA"
- Tap **"Submit"**

### 5.2 Verify Success
Should see:
- ✓ Success message
- ✓ Confirmation screen
- ✓ "Under Review" status
- ✓ Countdown timer (72 hours)

### 5.3 Check Database
```sql
SELECT
  cd.id,
  cd.deliverable_id,
  cd.platform,
  cd.post_url,
  cd.status,
  cd.submitted_at,
  get_auto_approval_deadline(cd.id) as auto_approval_deadline,
  time_until_auto_approval(cd.id) as time_remaining
FROM campaign_deliverables cd
WHERE cd.post_url = 'https://instagram.com/p/test_abc123';
```

**Expected Result:**
- status = 'pending'
- submitted_at is recent
- auto_approval_deadline ≈ 72 hours from now
- time_remaining ≈ '3 days'

---

## Step 6: Test Restaurant Review (3 minutes)

### 6.1 View Pending Deliverables
**Option A: SQL Query**
```sql
SELECT * FROM pending_deliverables_summary
WHERE campaign_id = (
  SELECT id FROM campaigns WHERE title = 'Troodie Creators: Local Gems'
);
```

**Option B: Restaurant Dashboard (if UI exists)**
- Login as restaurant/admin
- Open campaign
- Click "Review Deliverables"
- See pending submission with countdown

### 6.2 Approve Deliverable
**Option A: SQL**
```sql
UPDATE campaign_deliverables
SET
  status = 'approved',
  reviewed_at = NOW(),
  reviewed_by = (SELECT id FROM users WHERE email = 'kouame@troodieapp.com'),
  restaurant_feedback = 'Great content! Approved.',
  auto_approved = FALSE
WHERE post_url = 'https://instagram.com/p/test_abc123'
RETURNING id, status, reviewed_at;
```

**Option B: UI**
- Click on deliverable
- Click "Approve"
- Optionally add feedback
- Confirm

### 6.3 Verify Approval
```sql
SELECT
  cd.status,
  cd.reviewed_at,
  cd.auto_approved,
  cc.status as campaign_status
FROM campaign_deliverables cd
JOIN creator_campaigns cc ON cc.id = cd.creator_campaign_id
WHERE cd.post_url = 'https://instagram.com/p/test_abc123';
```

**Expected Result:**
- cd.status = 'approved'
- cd.reviewed_at is set
- cd.auto_approved = FALSE
- cc.status should update (possibly to 'completed')

---

## ✅ Success Criteria

If all steps complete successfully, you should have:

- [x] Database migration deployed
- [x] Troodie Originals campaign created
- [x] Campaign visible in app
- [x] Creator can apply to campaign
- [x] Application recorded in database
- [x] Application can be accepted
- [x] Creator can submit deliverable
- [x] Deliverable recorded with 72-hour countdown
- [x] Restaurant can view pending deliverable
- [x] Restaurant can approve deliverable
- [x] Creator notified of approval

---

## 🧪 Bonus: Test Auto-Approval (2 minutes)

### Simulate Auto-Approval

1. **Create test deliverable that's overdue:**
```sql
-- Insert a deliverable submitted 73 hours ago
INSERT INTO campaign_deliverables (
  creator_campaign_id,
  campaign_id,
  creator_id,
  deliverable_index,
  platform,
  post_url,
  status,
  submitted_at
)
SELECT
  cc.id,
  cc.campaign_id,
  cc.creator_id,
  1,
  'instagram',
  'https://instagram.com/p/auto_approval_test',
  'pending',
  NOW() - INTERVAL '73 hours'
FROM creator_campaigns cc
WHERE cc.campaign_id = (SELECT id FROM campaigns WHERE title = 'Troodie Creators: Local Gems')
AND cc.status = 'accepted'
LIMIT 1
RETURNING id, should_auto_approve(id) as should_approve;
```

**Expected Result:** should_approve = TRUE

2. **Run auto-approval function:**
```sql
SELECT * FROM auto_approve_overdue_deliverables();
```

**Expected Result:** Returns rows of auto-approved deliverables

3. **Verify it worked:**
```sql
SELECT status, auto_approved, reviewed_at
FROM campaign_deliverables
WHERE post_url = 'https://instagram.com/p/auto_approval_test';
```

**Expected Result:**
- status = 'approved'
- auto_approved = TRUE
- reviewed_at is set

4. **Cleanup:**
```sql
DELETE FROM campaign_deliverables
WHERE post_url = 'https://instagram.com/p/auto_approval_test';
```

---

## 🐛 Troubleshooting

### Migration Fails
**Error:** "column already exists"
- **Solution:** Migration is idempotent, re-run it

### Campaign Not Visible in App
- Check campaign status: `SELECT status FROM campaigns WHERE title = 'Troodie Creators: Local Gems';`
- Should be 'active'
- If not: `UPDATE campaigns SET status = 'active' WHERE title = 'Troodie Creators: Local Gems';`

### Can't Submit Deliverable
- Verify creator is accepted: `SELECT status FROM creator_campaigns WHERE id = '<id>';`
- Should be 'accepted'

### Function Not Found
- Re-run migration
- Check functions exist: `SELECT proname FROM pg_proc WHERE proname LIKE '%auto_approve%';`

### RLS Policy Blocks Query
- Make sure you're authenticated as correct user
- Check policy: `SELECT * FROM pg_policies WHERE tablename = 'campaign_deliverables';`

---

## 📚 Next Steps

After completing this quick test:

1. **Full Testing:** See [TROODIE_ORIGINALS_TESTING_GUIDE.md](./TROODIE_ORIGINALS_TESTING_GUIDE.md) for comprehensive tests

2. **Detailed Checklist:** See [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) for complete checklist

3. **Launch Campaign:** See [TROODIE_ORIGINALS_LAUNCH_GUIDE.md](./TROODIE_ORIGINALS_LAUNCH_GUIDE.md) for launching to real creators

4. **Deployment:** See [DELIVERABLES_DEPLOYMENT_GUIDE.md](./DELIVERABLES_DEPLOYMENT_GUIDE.md) for production deployment

---

## 🎯 Quick Status Check

Run this to get a complete status overview:

```sql
-- Campaign Status
SELECT
  'Campaign' as entity,
  title as name,
  status,
  max_creators,
  (SELECT COUNT(*) FROM creator_campaigns WHERE campaign_id = c.id AND status = 'accepted') as accepted_creators,
  (SELECT COUNT(*) FROM campaign_deliverables WHERE campaign_id = c.id AND status = 'pending') as pending_deliverables,
  (SELECT COUNT(*) FROM campaign_deliverables WHERE campaign_id = c.id AND status = 'approved') as approved_deliverables
FROM campaigns c
WHERE title = 'Troodie Creators: Local Gems'

UNION ALL

-- Deliverable Summary
SELECT
  'Deliverables' as entity,
  'Summary' as name,
  NULL as status,
  COUNT(*) FILTER (WHERE status = 'pending') as max_creators,
  COUNT(*) FILTER (WHERE status = 'approved') as accepted_creators,
  COUNT(*) FILTER (WHERE status = 'rejected') as pending_deliverables,
  COUNT(*) FILTER (WHERE auto_approved = TRUE) as approved_deliverables
FROM campaign_deliverables
WHERE campaign_id = (SELECT id FROM campaigns WHERE title = 'Troodie Creators: Local Gems');
```

---

**Testing Time:** ~15 minutes
**Last Updated:** October 20, 2025

🚀 **You're ready to test!**
