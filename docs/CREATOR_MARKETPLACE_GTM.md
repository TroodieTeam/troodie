# Creator Marketplace Go-To-Market (GTM) Guide

**Date:** December 17, 2025  
**Purpose:** Complete guide for deploying Creator Marketplace to production  
**Status:** Ready for Production Deployment

---

## 🚀 Quick Start (30 minutes)

### Step 1: Setup Business Profile (5 min)
```sql
-- Run: scripts/gtm-setup-team-business-profile.sql
-- REQUIRED: Team admin needs business profile to create campaigns
```

### Step 2: Archive Existing Campaigns (5 min)
```sql
-- Run: scripts/gtm-archive-non-troodie-campaigns.sql
```

### Step 3: Create Troodie Campaigns (5 min)
```sql
-- Run: scripts/gtm-create-troodie-campaigns.sql
```

### Step 4: Verify Deployment (5 min)
```sql
-- Check only Troodie campaigns are visible
SELECT c.title, u.email as owner
FROM campaigns c
JOIN users u ON c.owner_id = u.id
WHERE c.status = 'active';
-- Should only show team@troodieapp.com campaigns
```

### Step 5: Test Creator Flow (15 min)
1. Login as creator account
2. Navigate to Marketplace
3. Verify only Troodie campaigns visible
4. Apply to a campaign
5. Verify application submitted

**Total Time:** ~30 minutes

---

## 🎯 GTM Objectives

1. ✅ Deploy Creator Marketplace feature to production
2. ✅ Clear all existing non-Troodie campaigns from creator view
3. ✅ Create Troodie-branded paid opportunities
4. ✅ Ensure only Troodie campaigns are visible to creators
5. ✅ Verify payment flows work correctly
6. ✅ Monitor and support initial creator applications

---

## 📋 Pre-Deployment Checklist

### Code & Infrastructure
- [ ] All migrations applied to production database
- [ ] Stripe Connect configured (live mode)
- [ ] Webhook endpoints deployed to production
- [ ] Edge Functions deployed (`stripe-webhook`, `stripe-redirect`)
- [ ] Environment variables set in production
- [ ] Admin account `team@troodieapp.com` created and configured
- [ ] Admin UUID added to `adminReviewService.ts`

### Testing
- [ ] All E2E tests passed in staging/dev
- [ ] Payment flows tested end-to-end
- [ ] Creator onboarding tested
- [ ] Business onboarding tested
- [ ] Stripe webhooks verified

### Data Preparation
- [ ] Backup production database
- [ ] Identify all existing campaigns
- [ ] Plan campaign archival strategy
- [ ] Prepare Troodie campaign content

---

## 🚀 Deployment Steps

### Phase 1: Data Cleanup (15 minutes)

**Objective:** Archive/disable all non-Troodie campaigns so only Troodie opportunities are visible.

#### Step 1.1: Identify Existing Campaigns

```sql
-- See all active campaigns that creators can apply to
SELECT 
  c.id,
  c.title,
  c.status,
  c.payment_status,
  r.name as restaurant_name,
  u.email as owner_email,
  c.created_at,
  COUNT(ca.id) as application_count
FROM campaigns c
JOIN restaurants r ON c.restaurant_id = r.id
LEFT JOIN users u ON c.owner_id = u.id
LEFT JOIN campaign_applications ca ON ca.campaign_id = c.id
WHERE c.status = 'active'
  AND c.payment_status = 'paid'
GROUP BY c.id, c.title, c.status, c.payment_status, r.name, u.email, c.created_at
ORDER BY c.created_at DESC;
```

#### Step 1.2: Archive Non-Troodie Campaigns

**⚠️ IMPORTANT:** This will hide all non-Troodie campaigns from creator view. Run this in production:

```sql
-- ============================================================================
-- Archive All Non-Troodie Campaigns
-- ============================================================================
-- Purpose: Hide all existing campaigns so only Troodie campaigns are visible
-- Run this BEFORE creating Troodie campaigns
-- ============================================================================

DO $$
DECLARE
  v_team_admin_id UUID;
  v_archived_count INTEGER;
BEGIN
  -- Get team@troodieapp.com user ID
  SELECT id INTO v_team_admin_id
  FROM users
  WHERE email = 'team@troodieapp.com';
  
  IF v_team_admin_id IS NULL THEN
    RAISE EXCEPTION 'team@troodieapp.com admin account not found. Please create it first (see ADMIN_ACCOUNT_SETUP_GUIDE.md)';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ARCHIVING NON-TROODIE CAMPAIGNS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Team Admin ID: %', v_team_admin_id;
  RAISE NOTICE '';
  
  -- Archive all campaigns NOT owned by team@troodieapp.com
  UPDATE campaigns
  SET 
    status = 'completed',  -- Change status to completed (hides from active view)
    updated_at = NOW()
  WHERE owner_id != v_team_admin_id
    AND status IN ('active', 'draft', 'review');
  
  GET DIAGNOSTICS v_archived_count = ROW_COUNT;
  
  RAISE NOTICE '✅ Archived % campaigns', v_archived_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Campaigns owned by team@troodieapp.com remain active';
  RAISE NOTICE 'All other campaigns are now archived';
  RAISE NOTICE '';

END $$;

-- Verification: Should show 0 active campaigns (except Troodie ones)
SELECT 
  'Active Campaigns After Archive' as check_name,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All archived'
    WHEN COUNT(*) > 0 THEN '⚠️ Some campaigns still active'
    ELSE '❌ Error'
  END as status
FROM campaigns
WHERE status = 'active'
  AND owner_id != (SELECT id FROM users WHERE email = 'team@troodieapp.com');
```

**Alternative: Soft Archive (Keep for Reference)**

If you want to keep campaigns but hide them, use a different status:

```sql
-- Option: Mark as 'paused' instead of 'completed'
UPDATE campaigns
SET status = 'paused', updated_at = NOW()
WHERE owner_id != (SELECT id FROM users WHERE email = 'team@troodieapp.com')
  AND status IN ('active', 'draft');
```

---

### Phase 2: Setup Troodie Restaurant & Admin Account (10 minutes)

#### Step 2.1: Verify Team Admin Account

```sql
-- Verify team@troodieapp.com exists and is admin
SELECT 
  u.id,
  u.email,
  u.account_type,
  u.is_verified,
  CASE 
    WHEN u.id IN (
      'b08d9600-358d-4be9-9552-4607d9f50227',
      '31744191-f7c0-44a4-8673-10b34ccbb87f',
      '5373475d-b6b5-4abd-bd47-8ec515c44a47'  -- team@troodieapp.com
    ) THEN '✅ Admin'
    ELSE '❌ Not Admin'
  END as admin_status
FROM users u
WHERE u.email = 'team@troodieapp.com';
```

#### Step 2.2: Setup Business Profile for Team Admin

**⚠️ CRITICAL:** This step is REQUIRED before creating campaigns via UI. The team admin account needs a business profile with a verified restaurant claim.

```sql
-- Run: scripts/gtm-setup-team-business-profile.sql
```

This script will:
- ✅ Find or create Troodie Restaurant
- ✅ Create business profile for `team@troodieapp.com`
- ✅ Create verified restaurant claim
- ✅ Update user account type to `business`

**Verification:**
```sql
-- Check business profile exists
SELECT bp.*, r.name as restaurant_name
FROM business_profiles bp
JOIN users u ON bp.user_id = u.id
LEFT JOIN restaurants r ON bp.restaurant_id = r.id
WHERE u.email = 'team@troodieapp.com';

-- Should show:
-- - business_profile with restaurant_id
-- - verification_status = 'verified'
```

#### Step 2.3: Setup Troodie Restaurant

Run the Troodie Restaurant setup script:

```sql
-- File: data/test-data/prod/04-setup-troodie-restaurant-paid-campaigns.sql
-- BUT: Update to use team@troodieapp.com instead of prod-business1
```

**Updated Script for Production:**

```sql
-- ============================================================================
-- TROODIE RESTAURANT - PRODUCTION SETUP
-- ============================================================================
-- Purpose: Create/find Troodie Restaurant owned by team@troodieapp.com
-- ============================================================================

DO $$
DECLARE
  v_team_admin_id UUID;
  v_troodie_restaurant_id UUID;
BEGIN
  -- Get team admin ID
  SELECT id INTO v_team_admin_id
  FROM users
  WHERE email = 'team@troodieapp.com';
  
  IF v_team_admin_id IS NULL THEN
    RAISE EXCEPTION 'team@troodieapp.com not found. Create admin account first.';
  END IF;
  
  -- Find or create Troodie Restaurant
  SELECT id INTO v_troodie_restaurant_id
  FROM restaurants
  WHERE name ILIKE '%troodie%'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_troodie_restaurant_id IS NULL THEN
    -- Create Troodie Restaurant
    INSERT INTO restaurants (
      name, address, city, state, zip_code, phone,
      cuisine_type, description, price_range, rating,
      latitude, longitude
    )
    VALUES (
      'Troodie Restaurant',
      '123 Main Street',
      'Charlotte',
      'NC',
      '28202',
      '(704) 555-0123',
      'American',
      'The official Troodie Restaurant - where creators and food lovers connect.',
      '$$',
      4.8,
      35.2271,
      -80.8431
    )
    RETURNING id INTO v_troodie_restaurant_id;
  END IF;
  
  -- Ensure business profile exists and is linked
  INSERT INTO business_profiles (
    user_id, restaurant_id, business_name,
    verified, verification_status
  )
  VALUES (
    v_team_admin_id,
    v_troodie_restaurant_id,
    'Troodie Restaurant',
    true,
    'verified'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    restaurant_id = v_troodie_restaurant_id,
    verified = true,
    verification_status = 'verified';
  
  RAISE NOTICE '✅ Troodie Restaurant ready: %', v_troodie_restaurant_id;
  
END $$;
```

---

### Phase 3: Create Troodie Paid Opportunities (10 minutes)

#### Step 3.1: Create Troodie Campaigns

**Run this script to create Troodie-branded campaigns:**

```sql
-- ============================================================================
-- CREATE TROODIE PAID OPPORTUNITIES
-- ============================================================================
-- Purpose: Create paid campaigns for creators to apply to
-- Owner: team@troodieapp.com
-- ============================================================================

DO $$
DECLARE
  v_team_admin_id UUID;
  v_troodie_restaurant_id UUID;
BEGIN
  -- Get IDs
  SELECT id INTO v_team_admin_id FROM users WHERE email = 'team@troodieapp.com';
  SELECT id INTO v_troodie_restaurant_id FROM restaurants WHERE name ILIKE '%troodie%' LIMIT 1;
  
  IF v_team_admin_id IS NULL OR v_troodie_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Team admin or Troodie Restaurant not found';
  END IF;
  
  RAISE NOTICE 'Creating Troodie Paid Opportunities...';
  
  -- Campaign 1: Featured Creator Partnership
  INSERT INTO campaigns (
    restaurant_id, owner_id, name, title, description,
    status, payment_status, budget_cents, max_creators,
    start_date, end_date, requirements, target_audience, content_types
  )
  VALUES (
    v_troodie_restaurant_id,
    v_team_admin_id,
    'Featured Creator Partnership',
    'Featured Creator Partnership 🎬',
    E'Looking for talented food creators to become featured partners at Troodie!\n\n💰 PAID OPPORTUNITY\n\nWhat we need:\n• 1 Instagram Reel (30-60 seconds)\n• 1 TikTok video\n• Stories coverage\n\nRequirements:\n• 5,000+ followers on Instagram or TikTok\n• Food content focus\n• Authentic voice\n\nPerks:\n• Paid partnership\n• Featured on Troodie socials\n• Potential for ongoing collaboration',
    'active',
    'paid',
    50000, -- $500
    2,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    ARRAY['Tag @troodieapp in all content', 'Post within 7 days', 'Include location tag'],
    'Food enthusiasts, content creators, local foodies',
    ARRAY['Reels', 'TikTok', 'Stories']
  )
  ON CONFLICT DO NOTHING;
  
  -- Campaign 2: Menu Launch Content Creator
  INSERT INTO campaigns (
    restaurant_id, owner_id, name, title, description,
    status, payment_status, budget_cents, max_creators,
    start_date, end_date, requirements, target_audience, content_types
  )
  VALUES (
    v_troodie_restaurant_id,
    v_team_admin_id,
    'New Menu Launch',
    'New Menu Launch - Content Creators Wanted 🍽️',
    E'We''re launching our NEW seasonal menu and need creators to help spread the word!\n\n💵 PAID OPPORTUNITY\n\nDeliverables:\n• 1 high-quality Instagram post (carousel preferred)\n• 1 Reel featuring at least 3 new menu items\n• Behind-the-scenes Stories\n\nIdeal Creator:\n• Food photography skills\n• Engaging storytelling\n• Authentic voice\n\nThis is a great opportunity to build your portfolio while getting paid!',
    'active',
    'paid',
    30000, -- $300
    1,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '21 days',
    ARRAY['Must try at least 3 new menu items', 'Include pricing info', 'Tag @troodieapp'],
    'Local food lovers, Instagram food community',
    ARRAY['Post', 'Reel', 'Stories']
  )
  ON CONFLICT DO NOTHING;
  
  -- Campaign 3: UGC Video Creator
  INSERT INTO campaigns (
    restaurant_id, owner_id, name, title, description,
    status, payment_status, budget_cents, max_creators,
    start_date, end_date, requirements, target_audience, content_types
  )
  VALUES (
    v_troodie_restaurant_id,
    v_team_admin_id,
    'UGC Video Creator',
    'UGC Video Creator - Paid Partnership 🎥',
    E'Seeking skilled UGC creators for professional-quality video content!\n\n💰 PAID OPPORTUNITY\n\nWhat we''re looking for:\n• 2-3 short-form videos (15-30 seconds each)\n• Can be used for ads and socials\n• Professional quality with good lighting and audio\n\nRequirements:\n• Experience creating UGC content\n• Portfolio showing previous work\n• Own filming equipment\n\nBonus: If content performs well, potential for retainer agreement!',
    'active',
    'paid',
    40000, -- $400
    1,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '14 days',
    ARRAY['Professional filming equipment required', 'Raw footage must be provided', 'Rights transfer included'],
    'UGC creators, videographers, content professionals',
    ARRAY['UGC Video']
  )
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE '✅ Created 3 Troodie paid opportunities';
  RAISE NOTICE 'Total budget: $1,200';
  
END $$;

-- Verification
SELECT 
  'Troodie Campaigns' as info,
  c.title,
  c.status,
  c.payment_status,
  c.budget_cents / 100.0 as budget_dollars,
  c.max_creators,
  u.email as owner_email
FROM campaigns c
JOIN users u ON c.owner_id = u.id
WHERE u.email = 'team@troodieapp.com'
  AND c.status = 'active'
ORDER BY c.budget_cents DESC;
```

#### Step 3.2: Pre-Pay Troodie Campaigns

**⚠️ IMPORTANT:** Troodie campaigns need to be pre-paid so they're immediately visible to creators.

```sql
-- ============================================================================
-- PRE-PAY TROODIE CAMPAIGNS
-- ============================================================================
-- Purpose: Mark Troodie campaigns as paid so creators can apply immediately
-- ============================================================================

DO $$
DECLARE
  v_team_admin_id UUID;
BEGIN
  SELECT id INTO v_team_admin_id FROM users WHERE email = 'team@troodieapp.com';
  
  -- Create payment records for all Troodie campaigns
  INSERT INTO campaign_payments (
    campaign_id,
    business_id,
    amount_cents,
    creator_payout_cents,
    platform_fee_cents,
    stripe_payment_intent_id,
    status,
    created_at,
    updated_at
  )
  SELECT 
    c.id,
    v_team_admin_id,
    c.budget_cents,
    c.budget_cents,  -- Creators get full amount (no platform fee)
    0,  -- Platform fee = 0
    'pi_troodie_' || c.id::text,  -- Mock payment intent ID
    'succeeded',
    NOW(),
    NOW()
  FROM campaigns c
  WHERE c.owner_id = v_team_admin_id
    AND c.status = 'active'
    AND c.payment_status = 'paid'
    AND NOT EXISTS (
      SELECT 1 FROM campaign_payments cp WHERE cp.campaign_id = c.id
    );
  
  RAISE NOTICE '✅ Pre-paid all Troodie campaigns';
  
END $$;
```

---

### Phase 4: Verify Deployment (10 minutes)

#### Step 4.1: Verify Campaign Visibility

```sql
-- Check: Only Troodie campaigns should be active
SELECT 
  'Campaign Visibility Check' as check_name,
  COUNT(*) as active_campaigns,
  COUNT(CASE WHEN u.email = 'team@troodieapp.com' THEN 1 END) as troodie_campaigns,
  COUNT(CASE WHEN u.email != 'team@troodieapp.com' THEN 1 END) as other_campaigns,
  CASE 
    WHEN COUNT(CASE WHEN u.email != 'team@troodieapp.com' THEN 1 END) = 0 
    THEN '✅ Only Troodie campaigns active'
    ELSE '❌ Other campaigns still active'
  END as status
FROM campaigns c
JOIN users u ON c.owner_id = u.id
WHERE c.status = 'active'
  AND c.payment_status = 'paid';
```

#### Step 4.2: Verify Creator Can See Campaigns

**Test as Creator:**
1. Login as any creator account
2. Navigate to Discover → Marketplace → Campaigns
3. **Expected:** Only Troodie campaigns visible
4. **Verify:** Can apply to campaigns

#### Step 4.3: Verify Payment Status

```sql
-- Check all Troodie campaigns are paid
SELECT 
  c.title,
  c.payment_status,
  cp.status as payment_record_status,
  cp.amount_cents / 100.0 as payment_amount
FROM campaigns c
LEFT JOIN campaign_payments cp ON cp.campaign_id = c.id
JOIN users u ON c.owner_id = u.id
WHERE u.email = 'team@troodieapp.com'
  AND c.status = 'active';
-- Should show: payment_status = 'paid', payment_record_status = 'succeeded'
```

---

## 📊 Post-Deployment Monitoring

### Day 1 Monitoring

**Metrics to Track:**
- [ ] Number of creator applications received
- [ ] Application quality (review applications)
- [ ] Payment processing (verify Stripe transfers)
- [ ] Error rates (check Edge Function logs)
- [ ] Creator onboarding completion rate

**Queries:**

```sql
-- Monitor applications
SELECT 
  DATE(ca.applied_at) as date,
  COUNT(*) as applications,
  COUNT(CASE WHEN ca.status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN ca.status = 'accepted' THEN 1 END) as accepted
FROM campaign_applications ca
JOIN campaigns c ON ca.campaign_id = c.id
JOIN users u ON c.owner_id = u.id
WHERE u.email = 'team@troodieapp.com'
  AND ca.applied_at >= CURRENT_DATE
GROUP BY DATE(ca.applied_at)
ORDER BY date DESC;

-- Monitor payments
SELECT 
  pt.transaction_type,
  pt.status,
  COUNT(*) as count,
  SUM(pt.creator_amount_cents) / 100.0 as total_amount
FROM payment_transactions pt
JOIN campaigns c ON pt.campaign_id = c.id
JOIN users u ON c.owner_id = u.id
WHERE u.email = 'team@troodieapp.com'
  AND pt.created_at >= CURRENT_DATE
GROUP BY pt.transaction_type, pt.status;
```

---

## 🔄 Rollback Plan

If issues occur, rollback steps:

### Option 1: Disable Creator Marketplace (Quick)

```sql
-- Hide all campaigns temporarily
UPDATE campaigns
SET status = 'paused'
WHERE status = 'active';
```

### Option 2: Restore Previous Campaigns

```sql
-- Restore archived campaigns
UPDATE campaigns
SET status = 'active'
WHERE status = 'completed'
  AND updated_at >= CURRENT_DATE - INTERVAL '1 day';
```

---

## 📝 Post-Launch Tasks

### Week 1
- [ ] Review all creator applications
- [ ] Accept/reject applications
- [ ] Process first payouts
- [ ] Gather creator feedback
- [ ] Monitor error logs

### Week 2
- [ ] Analyze application quality
- [ ] Review payout processing
- [ ] Optimize campaign descriptions
- [ ] Create additional Troodie campaigns if needed

---

## 🎯 Success Criteria

**Deployment Successful If:**
- ✅ Only Troodie campaigns visible to creators
- ✅ Creators can apply to campaigns
- ✅ Applications submitted successfully
- ✅ Team admin can review applications
- ✅ Payouts process correctly
- ✅ No critical errors in logs

---

## 📞 Support & Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Creators see old campaigns | Run archive script again |
| Applications not submitting | Check RLS policies |
| Payments failing | Verify Stripe configuration |
| Admin can't review | Check admin UUID in code |

### Emergency Contacts

- **Stripe Issues:** Check Stripe Dashboard → Logs
- **Database Issues:** Check Supabase → Logs
- **App Errors:** Check Edge Function logs

---

## 📚 Related Documentation

- `docs/PRODUCTION_TESTING_ULTIMATE_GUIDE.md` - Full testing guide
- `docs/ADMIN_ACCOUNT_SETUP_GUIDE.md` - Admin account setup
- `docs/PAYMENT_SYSTEM_E2E_TESTING_GUIDE.md` - Payment flow details
- `data/test-data/prod/04-setup-troodie-restaurant-paid-campaigns.sql` - Campaign setup script

---

**Last Updated:** December 17, 2025  
**Status:** Ready for Production Deployment
