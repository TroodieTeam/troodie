# Production Testing Ultimate Guide

**Date:** December 17, 2025  
**Purpose:** Complete guide for testing Creator Marketplace & Payment System in Production  
**Estimated Time:** 45-60 minutes for full E2E testing

---

## Quick Reference

### Test Accounts

| Email | OTP | Role | Purpose |
|-------|-----|------|---------|
| `prod-consumer1@bypass.com` | `000000` | Consumer | General app testing |
| `prod-consumer2@bypass.com` | `000000` | Consumer | Account upgrade testing |
| `prod-creator1@bypass.com` | `000000` | Creator | Apply to campaigns, submit deliverables |
| `prod-creator2@bypass.com` | `000000` | Creator | Apply to campaigns, test payout |
| `prod-creator3@bypass.com` | `000000` | Creator | Multiple applications testing |
| `prod-business1@bypass.com` | `000000` | Business | Create campaigns, review deliverables, process payments |
| `prod-business2@bypass.com` | `000000` | Business | Secondary business for multi-campaign testing |

### Test Credit Cards (Stripe Test Mode)

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | ✅ Success |
| `4000 0000 0000 0002` | ❌ Declined |
| `4000 0000 0000 9995` | ❌ Insufficient Funds |
| `4000 0025 0000 3155` | ⚠️ Requires 3D Secure |

**All test cards:** Expiry: Any future date (e.g., `12/28`) | CVC: Any 3 digits | ZIP: Any 5 digits

### Beta Passcode

**Passcode:** `TROODIE2025` (all uppercase)  
**Required for:**
- Creator onboarding ("Become a Creator")
- Restaurant claiming ("Claim Your Restaurant")

### Admin Accounts

**Quick Query to Find Admin Accounts:**
```sql
-- Find admin accounts (emails starting with 'admin')
SELECT id, email, name, account_type, role
FROM users
WHERE email LIKE 'admin@%'
   OR email LIKE 'admin-%@%'
   OR email LIKE '%admin%@%'
ORDER BY email;

-- OR: Use known admin UUIDs
SELECT id, email, name, account_type, role
FROM users
WHERE id IN (
  'b08d9600-358d-4be9-9552-4607d9f50227',  -- Admin 1 (taydav37@gmail.com)
  '31744191-f7c0-44a4-8673-10b34ccbb87f',  -- Admin 2 (kouamendri@outlook.com)
  -- Add team@troodieapp.com UUID here after setup
);

-- OR: Find team admin account
SELECT id, email, name, account_type, role
FROM users
WHERE email = 'team@troodieapp.com';
```

**Current Admin Accounts:**
- `taydav37@gmail.com` (UUID: `b08d9600-358d-4be9-9552-4607d9f50227`) - Admin 1
- `kouamendri@outlook.com` (UUID: `31744191-f7c0-44a4-8673-10b34ccbb87f`) - Admin 2
- `team@troodieapp.com` (UUID: TBD) - Admin 3 (Team) - **See `docs/ADMIN_ACCOUNT_SETUP_GUIDE.md`**

**Common Admin Emails:**
- `admin@troodie.test`
- `admin@troodieapp.com`
- `troodie-admin@troodieapp.com`
- `team@troodieapp.com` (bypass OTP: `000000`) - **Recommended for testing**

**📚 Setup New Admin:** See `docs/ADMIN_ACCOUNT_SETUP_GUIDE.md` for complete setup instructions.

---

## Quick Workflow Reference

| Workflow | Account | Time | Section |
|----------|---------|------|---------|
| **Consumer → Creator** | `prod-consumer2@bypass.com` | 10 min | Phase 1.5 |
| **Consumer → Business** | `prod-consumer2@bypass.com` | 10 min | Phase 1.5 |
| **Portfolio Upload** | `prod-creator1@bypass.com` | 5 min | Phase 3.5 |
| **Campaign Application** | `prod-creator1@bypass.com` | 5 min | Phase 3.5 |
| **Business Stripe Setup** | `prod-business1@bypass.com` | 10 min | Phase 2 |
| **Campaign Payment** | `prod-business1@bypass.com` | 10 min | Phase 3 |
| **Creator Stripe Setup** | `prod-creator1@bypass.com` | 10 min | Phase 6 |
| **Deliverable Submission** | `prod-creator1@bypass.com` | 5 min | Phase 7 |
| **Deliverable Approval** | `prod-business1@bypass.com` | 5 min | Phase 7 |
| **Payout Verification** | `prod-creator1@bypass.com` | 5 min | Phase 8 |

---

## Phase 1: Reset Test Data (5 minutes)

Before testing, reset all test data to a clean state.

### Step 1.1: Run Complete Reset Script

In Supabase SQL Editor, run:

```sql
-- Full reset of all prod test data
-- File: data/test-data/prod/03-complete-reset-all-test-data.sql
```

### Step 1.2: Verify Reset

After running, verify these counts:

| Check | Expected Count |
|-------|----------------|
| Stripe Accounts | 0 |
| Campaign Payments | 0 |
| Payment Transactions | 0 |
| Deliverables | 0 |
| Applications | 0 |
| Active Campaigns | 4+ |

---

## Phase 1.5: Account Upgrade Workflows (15 minutes)

### Test Case: Consumer → Creator Upgrade

**Account:** `prod-consumer2@bypass.com` (OTP: `000000`)

**⚠️ Prerequisites:** Ensure account is in consumer state:
```sql
-- Reset to consumer if needed
UPDATE users 
SET account_type = 'consumer', is_creator = false, updated_at = NOW()
WHERE email = 'prod-consumer2@bypass.com';

DELETE FROM creator_profiles 
WHERE user_id = (SELECT id FROM users WHERE email = 'prod-consumer2@bypass.com');
```

**Steps:**
1. **Login** as `prod-consumer2@bypass.com`
2. **Navigate** to More tab → "Become a Creator"
3. **Enter Beta Passcode:** `TROODIE2025` (all uppercase)
4. **Complete Creator Onboarding:**
   - **Bio:** "Food content creator passionate about showcasing local restaurants"
   - **Location:** Select your city (e.g., "Charlotte, NC")
   - **Specialties:** Select relevant tags (e.g., "Food Photography", "Restaurant Reviews")
   - **Portfolio:** Upload 3-5 images/videos from device
     - Can mix images and videos
     - Images will be compressed automatically
     - Videos will generate thumbnails
5. **Submit** onboarding form
6. **Verify Upgrade:**
   - Account type changes to "creator"
   - Creator profile created
   - Portfolio items saved
   - User navigated to More tab
   - "Content Creator" badge appears
   - "Creator Tools" section visible

**Verification SQL:**
```sql
SELECT 
  u.id, 
  u.email,
  u.account_type, 
  u.is_creator, 
  u.account_upgraded_at,
  cp.id as profile_id,
  cp.display_name,
  COUNT(cpi.id) as portfolio_items_count
FROM users u
LEFT JOIN creator_profiles cp ON cp.user_id = u.id
LEFT JOIN creator_portfolio_items cpi ON cpi.creator_profile_id = cp.id
WHERE u.email = 'prod-consumer2@bypass.com'
GROUP BY u.id, u.email, u.account_type, u.is_creator, u.account_upgraded_at, cp.id, cp.display_name;
-- Should show: account_type='creator', is_creator=true, profile_id NOT NULL, portfolio_items_count > 0
```

**Post-Test Cleanup:**
```sql
-- Reset back to consumer for next test
DELETE FROM creator_portfolio_items 
WHERE creator_profile_id = (
  SELECT id FROM creator_profiles WHERE user_id = (
    SELECT id FROM users WHERE email = 'prod-consumer2@bypass.com'
  )
);

DELETE FROM creator_profiles 
WHERE user_id = (SELECT id FROM users WHERE email = 'prod-consumer2@bypass.com');

UPDATE users 
SET account_type = 'consumer', is_creator = false, account_upgraded_at = NULL, updated_at = NOW()
WHERE email = 'prod-consumer2@bypass.com';
```

---

### Test Case: Consumer → Business Upgrade (Restaurant Claim)

**Account:** `prod-consumer2@bypass.com` (OTP: `000000`)

**⚠️ IMPORTANT:** If you get `duplicate key value violates unique constraint "unique_verified_claim"` error, run this cleanup first:

```sql
-- Quick fix: Delete all existing claims for test restaurant
DELETE FROM restaurant_claims
WHERE restaurant_id = (SELECT id FROM restaurants WHERE name = 'Prod Test Claiming' AND is_test_restaurant = true)
   OR user_id = (SELECT id FROM users WHERE email = 'prod-consumer2@bypass.com');
```

**⚠️ Prerequisites:** Setup unclaimed restaurant for testing:

**Step 1: Clean up any existing claims (IMPORTANT - prevents duplicate key error):**
```sql
-- Delete all existing claims for prod-consumer2 and the test restaurant
DELETE FROM restaurant_claims
WHERE user_id = (SELECT id FROM users WHERE email = 'prod-consumer2@bypass.com')
   OR restaurant_id = (SELECT id FROM restaurants WHERE name = 'Prod Test Claiming' AND is_test_restaurant = true);

-- Also delete any verified/approved claims for the test restaurant
DELETE FROM restaurant_claims
WHERE restaurant_id = (SELECT id FROM restaurants WHERE name = 'Prod Test Claiming' AND is_test_restaurant = true)
  AND status IN ('verified', 'approved');
```

**Step 2: Run setup script:**
```sql
-- File: data/test-data/prod/02i-setup-restaurant-claim-upgrade-test.sql
```

**Step 3: Verify clean state:**
```sql
-- Should return 0 rows
SELECT * FROM restaurant_claims
WHERE user_id = (SELECT id FROM users WHERE email = 'prod-consumer2@bypass.com')
   OR restaurant_id = (SELECT id FROM restaurants WHERE name = 'Prod Test Claiming' AND is_test_restaurant = true);
```

**Steps:**
1. **Login** as `prod-consumer2@bypass.com`
2. **Navigate** to More tab → "Claim Your Restaurant"
3. **Enter Beta Passcode:** `TROODIE2025` (all uppercase)
4. **Search for Restaurant:**
   - Search for "Prod Test Claiming" or any unclaimed restaurant
   - Select restaurant from results
5. **Complete Claim Form:**
   - **Contact Name:** "Test Owner"
   - **Contact Title:** "General Manager"
   - **Contact Phone:** "7045551234"
   - **Contact Email:** "owner@test.com"
   - **Verification Method:** Choose email or phone verification
6. **Submit Claim**
7. **Verify Claim Submitted:**
   - Claim status shows as "pending" or "submitted"
   - Confirmation message displayed
8. **Approve Claim (Admin or SQL):**

   **Step 1: Find Admin Account:**
   ```sql
   -- Quick query: Find admin accounts (emails starting with 'admin')
   SELECT 
     id,
     email,
     name,
     account_type,
     role,
     is_verified,
     created_at
   FROM users
   WHERE email LIKE 'admin@%'
      OR email LIKE 'admin-%@%'
      OR email LIKE '%admin%@%'
   ORDER BY email
   LIMIT 5;
   
   -- OR: Use specific admin UUIDs (from adminReviewService.ts)
   SELECT 
     id,
     email,
     name,
     account_type,
     role,
     CASE 
       WHEN id = 'b08d9600-358d-4be9-9552-4607d9f50227' THEN 'Admin 1'
       WHEN id = '31744191-f7c0-44a4-8673-10b34ccbb87f' THEN 'Admin 2'
       ELSE 'Not Admin'
     END as admin_label
   FROM users
   WHERE id IN (
     'b08d9600-358d-4be9-9552-4607d9f50227',
     '31744191-f7c0-44a4-8673-10b34ccbb87f'
   );
   ```

   **Step 2: Get Claim ID:**
   ```sql
   SELECT id, user_id, restaurant_id, status 
   FROM restaurant_claims 
   WHERE user_id = (SELECT id FROM users WHERE email = 'prod-consumer2@bypass.com')
   ORDER BY submitted_at DESC LIMIT 1;
   ```

   **Step 3: Approve Claim (replace <claim_id> and <admin_id> with actual IDs):**
   ```sql
   -- Option A: Update claim status
   UPDATE restaurant_claims 
   SET status = 'approved', 
       reviewed_at = NOW(),
       reviewed_by = '<admin_id>'  -- Use admin ID from Step 1 (or team@troodieapp.com UUID)
   WHERE id = '<claim_id>';
   
   -- Option B: Use upgrade function (recommended)
   SELECT upgrade_user_to_business(
     (SELECT id FROM users WHERE email = 'prod-consumer2@bypass.com'),
     (SELECT restaurant_id FROM restaurant_claims WHERE id = '<claim_id>')
   );
   
   -- Quick option: Use team@troodieapp.com admin (if set up)
   UPDATE restaurant_claims 
   SET status = 'approved', 
       reviewed_at = NOW(),
       reviewed_by = (SELECT id FROM users WHERE email = 'team@troodieapp.com')
   WHERE id = '<claim_id>';
   ```
9. **Verify Business Upgrade:**
   - Account type changes to "business"
   - Business profile created
   - Restaurant linked to account
   - "Business Owner" badge appears
   - "Business Tools" section visible
   - Can access Business Dashboard

**Verification SQL:**
```sql
SELECT 
  u.email,
  u.account_type,
  u.is_restaurant,
  u.account_upgraded_at,
  bp.id as business_profile_id,
  bp.restaurant_id,
  bp.verification_status,
  r.name as restaurant_name,
  r.is_claimed,
  rc.status as claim_status
FROM users u
LEFT JOIN business_profiles bp ON bp.user_id = u.id
LEFT JOIN restaurants r ON bp.restaurant_id = r.id
LEFT JOIN restaurant_claims rc ON rc.user_id = u.id AND rc.restaurant_id = r.id
WHERE u.email = 'prod-consumer2@bypass.com';
-- Should show: account_type='business', is_restaurant=true, business_profile_id NOT NULL, restaurant_name NOT NULL
```

**Post-Test Cleanup:**
```sql
-- Run reset query from 02i-setup-restaurant-claim-upgrade-test.sql
-- Or manually (IMPORTANT: Delete claims FIRST to avoid constraint violations):

-- Step 1: Delete all claims for user and restaurant
DELETE FROM restaurant_claims
WHERE user_id = (SELECT id FROM users WHERE email = 'prod-consumer2@bypass.com')
   OR restaurant_id = (SELECT id FROM restaurants WHERE name = 'Prod Test Claiming' AND is_test_restaurant = true);

-- Step 2: Reset restaurant
UPDATE restaurants
SET is_claimed = false, owner_id = NULL, is_verified = false, updated_at = NOW()
WHERE name = 'Prod Test Claiming';

-- Step 3: Delete business profile
DELETE FROM business_profiles
WHERE user_id = (SELECT id FROM users WHERE email = 'prod-consumer2@bypass.com');

-- Step 4: Reset user account
UPDATE users
SET account_type = 'consumer', is_restaurant = false, account_upgraded_at = NULL, updated_at = NOW()
WHERE email = 'prod-consumer2@bypass.com';
```

**⚠️ Troubleshooting: "duplicate key value violates unique constraint unique_verified_claim"**

If you get this error when submitting a claim, it means there's already a verified/approved claim for this restaurant. Fix it by:

```sql
-- Find existing claims
SELECT rc.*, u.email, r.name as restaurant_name
FROM restaurant_claims rc
JOIN users u ON rc.user_id = u.id
JOIN restaurants r ON rc.restaurant_id = r.id
WHERE u.email = 'prod-consumer2@bypass.com'
   OR r.name = 'Prod Test Claiming';

-- Delete ALL claims for the test restaurant (including verified ones)
DELETE FROM restaurant_claims
WHERE restaurant_id = (SELECT id FROM restaurants WHERE name = 'Prod Test Claiming' AND is_test_restaurant = true);

-- Then try submitting the claim again
```

---

### Test Case: Creator → Business (Dual Account Type)

**Note:** Users can be both creator AND business. This tests maintaining creator profile while claiming restaurant.

**Account:** `prod-creator1@bypass.com` (already a creator)

**Steps:**
1. **Login** as `prod-creator1@bypass.com` (should already be creator)
2. **Verify Creator Status:**
   - "Content Creator" badge visible
   - Creator Tools section present
3. **Claim Restaurant:**
   - Navigate to More tab → "Claim Your Restaurant"
   - Enter beta passcode: `TROODIE2025`
   - Complete restaurant claim process (see above)
4. **Verify Dual Status:**
   - Account type = 'business' (business takes precedence)
   - Creator profile still exists
   - Business profile created
   - Can access both creator and business features

**Verification SQL:**
```sql
SELECT 
  u.email,
  u.account_type,
  u.is_creator,
  u.is_restaurant,
  cp.id as creator_profile_id,
  bp.id as business_profile_id,
  r.name as restaurant_name
FROM users u
LEFT JOIN creator_profiles cp ON cp.user_id = u.id
LEFT JOIN business_profiles bp ON bp.user_id = u.id
LEFT JOIN restaurants r ON bp.restaurant_id = r.id
WHERE u.email = 'prod-creator1@bypass.com';
-- Should show: account_type='business', creator_profile_id NOT NULL, business_profile_id NOT NULL
```

---

## Phase 2: Business Stripe Onboarding (10 minutes)

### Test Case: First-Time Business Payment Setup

**Account:** `prod-business1@bypass.com` (OTP: `000000`)

1. **Login** → Navigate to Business Tab → Campaigns
2. **Select** any active campaign (e.g., "Grand Opening Campaign" - $1000)
3. **Payment Setup:**
   - Click "Connect Payment Account" or "Pay Now"
   - Should redirect to Stripe Connect onboarding
4. **Complete Stripe Onboarding:**
   - Business type: Select "Individual" or "Company"
   - Personal info: Use test data
   - Bank account: Use test routing `110000000` and account `000123456789`
   - Phone: Use your real phone for SMS verification
5. **Return to App** → Verify account connected

**Verification SQL:**
```sql
SELECT sa.*, u.email
FROM stripe_accounts sa
JOIN users u ON sa.user_id = u.id
WHERE u.email = 'prod-business1@bypass.com'
  AND sa.account_type = 'business';
-- Should show: onboarding_completed = true
```

---

## Phase 3: Campaign Payment (10 minutes)

### Test Case: Pay for Campaign

**Account:** `prod-business1@bypass.com` (same session or re-login)

1. **Navigate** to Campaigns → Select unpaid campaign
2. **Click** "Pay Now" or "Complete Payment"
3. **Enter test card:** `4242 4242 4242 4242`
4. **Complete payment**
5. **Verify:**
   - Campaign status changes to "active"
   - Campaign `payment_status` = 'paid'
   - Visible to creators

**Verification SQL:**
```sql
SELECT c.title, c.status, c.payment_status, c.budget_cents
FROM campaigns c
WHERE c.owner_id = (SELECT id FROM users WHERE email = 'prod-business1@bypass.com')
ORDER BY c.updated_at DESC LIMIT 1;
-- Should show: status = 'active', payment_status = 'paid'
```

---

## Phase 3.5: Creator Marketplace Features (10 minutes)

### Test Case: Portfolio Upload (Images & Videos)

**Account:** `prod-creator1@bypass.com` (OTP: `000000`)

**Steps:**
1. **Login** as creator account
2. **Navigate** to Creator Profile → Edit Portfolio
3. **Upload Images:**
   - Select 3-5 images from device
   - Verify upload progress indicators
   - Images should compress automatically (< 1MB each)
   - Cloud URLs generated (not local URIs)
4. **Upload Videos:**
   - Select 1-2 videos (can mix with images)
   - Thumbnails generated automatically
   - Video URLs and thumbnail URLs saved
5. **Verify Portfolio:**
   - All items display correctly
   - Images viewable on any device
   - Videos playable
   - Thumbnails show for videos

**Verification SQL:**
```sql
SELECT 
  cpi.id,
  cpi.media_type,
  cpi.image_url,
  cpi.video_url,
  cpi.thumbnail_url,
  CASE 
    WHEN cpi.image_url LIKE 'https://%' THEN 'Cloud URL ✅'
    ELSE 'Local URI ❌'
  END as url_type
FROM creator_portfolio_items cpi
JOIN creator_profiles cp ON cpi.creator_profile_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'prod-creator1@bypass.com'
ORDER BY cpi.created_at DESC;
-- Should show: media_type in ('image', 'video'), URLs are cloud URLs
```

---

### Test Case: Campaign Application Form Validation

**Account:** `prod-creator1@bypass.com` (OTP: `000000`)

**Steps:**
1. **Navigate** to Discover → Campaigns
2. **Select** a paid campaign
3. **Click** "Apply Now"
4. **Test Form Validation:**
   - Try submitting empty form → Should show required field errors
   - Fill **Proposed Rate:** $150
   - Fill **Cover Letter:** "I'm excited to create content..."
   - Fill **Proposed Deliverables:** "1 Instagram Reel + Stories"
5. **Submit** → Should succeed
6. **Verify Application:**
   - Success message displayed
   - Application appears in "My Campaigns" → "Pending" tab
   - Campaign shows "Applied" badge

**Verification SQL:**
```sql
SELECT 
  ca.id,
  ca.status,
  ca.proposed_rate_cents,
  ca.cover_letter,
  ca.proposed_deliverables,
  c.title as campaign_title,
  u.email as creator_email
FROM campaign_applications ca
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
JOIN campaigns c ON ca.campaign_id = c.id
WHERE u.email = 'prod-creator1@bypass.com'
ORDER BY ca.applied_at DESC LIMIT 1;
-- Should show: status='pending', all fields populated
```

---

### Test Case: Deliverable URL Validation

**Account:** `prod-creator1@bypass.com` (OTP: `000000`)

**Prerequisites:** Must have accepted campaign application

**Steps:**
1. **Navigate** to "My Campaigns" → "Active" tab
2. **Select** accepted campaign
3. **Click** "Submit Deliverable"
4. **Test URL Patterns:**

   **Valid Instagram URLs:**
   - `https://www.instagram.com/p/ABC123/` ✅
   - `https://www.instagram.com/reel/ABC123/` ✅
   - `https://www.instagram.com/reel/ABC123/?igsh=xyz` ✅

   **Valid TikTok URLs:**
   - `https://www.tiktok.com/@user/video/1234567890` ✅
   - `https://vm.tiktok.com/ABC123/` ✅

   **Valid YouTube URLs:**
   - `https://youtube.com/watch?v=ABC123` ✅
   - `https://youtube.com/shorts/ABC123` ✅
   - `https://youtu.be/ABC123` ✅

   **Invalid URLs:**
   - `not-a-url` ❌ Should show error
   - `http://instagram.com/p/ABC` ❌ Should require HTTPS

5. **Submit** valid URL → Should succeed
6. **Verify:** Deliverable status = "Pending Review"

---

## Phase 4: Creator Flow - Apply to Campaign (10 minutes)

### Test Case: Creator Applies to Paid Campaign

**Account:** `prod-creator1@bypass.com` (OTP: `000000`)

1. **Login** → Navigate to Discover/Marketplace
2. **Find** the paid campaign from prod-business1
3. **Click** "Apply Now"
4. **Fill application:**
   - **Proposed Rate:** $150 (or any amount)
   - **Cover Letter:** "I'm excited to create content for your restaurant..."
   - **Proposed Deliverables:** "1 Instagram Reel showcasing your menu items"
5. **Submit** application
6. **Verify:** Application appears in "My Campaigns" → "Pending" tab

**Verification SQL:**
```sql
SELECT 
  ca.id, 
  ca.status, 
  ca.proposed_rate_cents,
  c.title as campaign_title,
  u.email as creator_email
FROM campaign_applications ca
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
JOIN campaigns c ON ca.campaign_id = c.id
WHERE u.email = 'prod-creator1@bypass.com'
ORDER BY ca.applied_at DESC LIMIT 1;
-- Should show: status = 'pending'
```

---

## Phase 5: Business Reviews & Accepts Application (5 minutes)

### Test Case: Business Accepts Creator Application

**Account:** `prod-business1@bypass.com`

1. **Login** → Navigate to Campaigns → Select the paid campaign
2. **View Applications** → Find `prod-creator1`'s application
3. **Click** "Accept" or "Select Creator"
4. **Confirm** selection
5. **Verify:** Application status changes to "accepted"

**Verification SQL:**
```sql
SELECT ca.status, ca.accepted_at
FROM campaign_applications ca
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.email = 'prod-creator1@bypass.com'
ORDER BY ca.applied_at DESC LIMIT 1;
-- Should show: status = 'accepted', accepted_at = timestamp
```

---

## Phase 6: Creator Stripe Onboarding (10 minutes)

### Test Case: Creator Connects Payment Account

**Account:** `prod-creator1@bypass.com`

1. **Login** → Navigate to Profile or Payments/Earnings screen
2. **Click** "Connect Payment Account" or "Set Up Payouts"
3. **Complete Stripe Connect onboarding:**
   - Personal info (use test data)
   - SSN: Use `000-00-0000` (Stripe test SSN)
   - Bank account: Use test routing `110000000` and account `000123456789`
4. **Return to App** → Verify account connected

**Verification SQL:**
```sql
SELECT 
  sa.stripe_account_id,
  sa.onboarding_completed,
  cp.stripe_onboarding_completed
FROM stripe_accounts sa
JOIN creator_profiles cp ON cp.user_id = sa.user_id
JOIN users u ON sa.user_id = u.id
WHERE u.email = 'prod-creator1@bypass.com'
  AND sa.account_type = 'creator';
-- Should show: onboarding_completed = true
```

---

## Phase 7: Deliverable Submission & Approval (10 minutes)

### Test Case: Creator Submits Deliverable

**Account:** `prod-creator1@bypass.com`

1. **Navigate** to "My Campaigns" → "Active" tab
2. **Select** the accepted campaign
3. **Click** "Submit Deliverable"
4. **Fill in:**
   - **URL:** `https://www.instagram.com/reel/ABC123TEST/`
   - **Notes:** "Here's my content for review"
5. **Submit**
6. **Verify:** Deliverable appears as "Pending Review"

### Test Case: Business Approves Deliverable (Triggers Payout)

**Account:** `prod-business1@bypass.com`

1. **Login** → Navigate to Campaigns → Select campaign with deliverable
2. **View Deliverables** → Find the submitted content
3. **Click** "Approve"
4. **Confirm** approval
5. **Verify:**
   - Deliverable status = 'approved'
   - Payout automatically triggered
   - Creator receives notification

**Verification SQL:**
```sql
SELECT 
  cd.status,
  cd.payment_status,
  cd.payment_amount_cents,
  cd.paid_at,
  pt.stripe_transfer_id
FROM campaign_deliverables cd
LEFT JOIN payment_transactions pt ON cd.payment_transaction_id = pt.id
WHERE cd.creator_id = (
  SELECT cp.id FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE u.email = 'prod-creator1@bypass.com'
)
ORDER BY cd.updated_at DESC LIMIT 1;
-- Should show: status = 'approved', payment_status = 'completed' or 'processing'
```

---

## Phase 8: Verify Creator Payout (5 minutes)

**Account:** `prod-creator1@bypass.com`

1. **Login** → Navigate to Payments/Earnings screen
2. **Verify:**
   - Payout appears in earnings history
   - Amount matches campaign budget
   - Status shows "Completed" or "Processing"

---

## 🍽️ Special Case: Troodie Restaurant Paid Opportunities

### For Creators Applying to Troodie Restaurant Campaigns

If you have paid campaigns at a **Troodie Restaurant** that creators should apply for:

1. **Ensure Restaurant is Claimed:**
   ```sql
   -- Check if "Troodie Restaurant" exists and is claimed
   SELECT r.id, r.name, bp.verified, u.email as owner_email
   FROM restaurants r
   LEFT JOIN business_profiles bp ON bp.restaurant_id = r.id
   LEFT JOIN users u ON bp.user_id = u.id
   WHERE r.name ILIKE '%troodie%';
   ```

2. **Create Paid Campaign for Troodie Restaurant:**
   ```sql
   -- If you need to create a campaign for Troodie Restaurant
   INSERT INTO campaigns (
     restaurant_id,
     owner_id,
     name,
     title,
     description,
     status,
     payment_status,
     budget_cents,
     max_creators,
     start_date,
     end_date
   )
   SELECT 
     r.id,
     bp.user_id,
     'Troodie Feature Campaign',
     'Troodie Feature Campaign',
     'Looking for creators to showcase Troodie. Paid opportunity - apply now!',
     'active',
     'paid', -- Already paid
     50000, -- $500
     3,
     CURRENT_DATE,
     CURRENT_DATE + INTERVAL '30 days'
   FROM restaurants r
   JOIN business_profiles bp ON bp.restaurant_id = r.id
   WHERE r.name ILIKE '%troodie%'
   LIMIT 1;
   ```

3. **Creators Apply:**
   - Login as any `prod-creator` account
   - Navigate to Discover Campaigns
   - Search for "Troodie" or browse active campaigns
   - Click "Apply Now" on the Troodie campaign
   - Fill in application details
   - Submit

4. **Business Reviews:**
   - Login as the Troodie restaurant owner
   - Navigate to Campaigns → View Applications
   - Accept/reject creator applications

---

## Troubleshooting

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| "No campaigns visible" | Campaigns not paid or not active | Pay for campaign first |
| "Apply button disabled" | Already applied or not a creator | Check account type |
| "Stripe redirect fails" | Missing environment variables | Check Stripe keys in Supabase |
| "Payout not processing" | Creator not onboarded to Stripe | Complete creator Stripe setup |
| "Business Dashboard error" | Missing business_profiles | Run `02h-fix-business-profiles.sql` |
| "duplicate key value violates unique constraint unique_verified_claim" | Existing verified claim exists | Delete all claims for user/restaurant before testing (see Prerequisites) |

### Useful Diagnostic Queries

```sql
-- Check all test users and their types
SELECT id, email, account_type, is_creator, is_restaurant
FROM users
WHERE email LIKE 'prod-%@bypass.com'
ORDER BY email;

-- Check campaign state
SELECT c.title, c.status, c.payment_status, c.budget_cents
FROM campaigns c
WHERE c.owner_id IN (
  SELECT id FROM users WHERE email LIKE 'prod-business%@bypass.com'
);

-- Check application state
SELECT 
  u.email as creator,
  ca.status as application_status,
  c.title as campaign
FROM campaign_applications ca
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
JOIN campaigns c ON ca.campaign_id = c.id
WHERE u.email LIKE 'prod-creator%@bypass.com';
```

---

## Testing Checklist

### Pre-Test
- [ ] Reset all test data with `03-complete-reset-all-test-data.sql`
- [ ] Verify reset counts (all should be 0 except campaigns)
- [ ] Confirm Stripe is in Test Mode
- [ ] Setup unclaimed restaurant for claim testing (`02i-setup-restaurant-claim-upgrade-test.sql`)

### Account Upgrade Workflows
- [ ] Consumer → Creator upgrade successful
  - [ ] Beta passcode accepted (`TROODIE2025`)
  - [ ] Creator profile created
  - [ ] Portfolio items uploaded (images/videos)
  - [ ] Account type = 'creator'
  - [ ] Creator Tools section visible
- [ ] Consumer → Business upgrade successful
  - [ ] Beta passcode accepted
  - [ ] Restaurant claim submitted
  - [ ] Claim approved (admin or SQL)
  - [ ] Account type = 'business'
  - [ ] Business profile created
  - [ ] Restaurant linked to account
  - [ ] Business Tools section visible
- [ ] Creator → Business (dual account) works
  - [ ] Creator profile preserved
  - [ ] Business profile created
  - [ ] Can access both creator and business features

### Creator Marketplace Features
- [ ] Portfolio upload works (images)
  - [ ] Images compress automatically
  - [ ] Cloud URLs generated
  - [ ] Upload progress shown
- [ ] Portfolio upload works (videos)
  - [ ] Videos upload successfully
  - [ ] Thumbnails generated
  - [ ] Video URLs saved
- [ ] Campaign application form validation
  - [ ] Required fields enforced
  - [ ] Application submits successfully
  - [ ] Appears in "Pending" tab
- [ ] Deliverable URL validation
  - [ ] Instagram URLs accepted
  - [ ] TikTok URLs accepted
  - [ ] YouTube URLs accepted
  - [ ] Invalid URLs rejected

### Business Flow
- [ ] Business Stripe onboarding successful
- [ ] Campaign payment successful
- [ ] Campaign status = 'active', payment_status = 'paid'

### Creator Flow
- [ ] Creator can see paid campaigns in Marketplace
- [ ] Application submitted successfully
- [ ] Application accepted by business
- [ ] Creator Stripe onboarding successful
- [ ] Deliverable submitted successfully

### Payment Flow
- [ ] Deliverable approved by business
- [ ] Payout automatically triggered
- [ ] Payment transaction created
- [ ] Creator receives payout (or 'processing' status)

### End-to-End
- [ ] Full flow from account upgrade → campaign creation → payout verified
- [ ] All notifications sent correctly
- [ ] No errors in Supabase Edge Function logs

---

## Reset Between Test Runs

To reset and test again:

```sql
-- Run the complete reset
-- data/test-data/prod/03-complete-reset-all-test-data.sql
```

Then start from Phase 2 again.

---

---

## 🚀 Production Deployment

**Ready to deploy to production?** See `docs/CREATOR_MARKETPLACE_GTM.md` for:
- Complete GTM deployment guide
- Campaign archival scripts
- Troodie campaign creation
- Production verification steps
- Monitoring and rollback procedures

---

**Last Updated:** December 17, 2025
