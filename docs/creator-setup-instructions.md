# Creator Features Setup Instructions

## Quick Setup

To test the creator features, follow these steps:

### 1. Run Database Migrations (if not already done)
```bash
# These should already be applied but verify:
supabase migration list

# Key migrations for creator features:
- 20250911000001_add_account_type_system.sql
- 20250911000002_add_creator_onboarding_tables.sql  
- 20250913_creator_marketplace_business.sql
- 20250913_creator_marketplace_business_fixed.sql
```

### 2. Load Test Data
```sql
-- Run this SQL in Supabase SQL editor to add creator test data:
-- (File: /supabase/seed/creator_test_data.sql)
```

### 3. Test Accounts Ready to Use

#### Full Creator Experience
**Account:** `creator1@bypass.com`
- **OTP:** `000000`
- **Status:** Already a creator with:
  - Active campaign (accepted)
  - Pending campaign application
  - Portfolio items with metrics
  - Mock earnings data

**Account:** `creator2@bypass.com`
- **OTP:** `000000`
- **Status:** Already a creator with:
  - Active campaign (accepted)
  - Pending campaign application
  - Portfolio items with high engagement
  - Mock earnings data

#### Consumer to Creator Journey
**Account:** `consumer2@bypass.com`
- **OTP:** `000000`
- **Status:** Qualified consumer ready to become creator
- **Stats:** 52 saves, 7 boards, 15 friends (meets all requirements)
- **Test Flow:**
  1. Login
  2. Go to More tab
  3. Click "Become a Creator"
  4. Complete onboarding (will pass qualification)
  5. Access Creator Tools

**Account:** `consumer1@bypass.com`
- **OTP:** `000000`
- **Status:** NOT qualified for creator
- **Stats:** 22 saves, 2 boards, 3 friends (doesn't meet requirements)
- **Test:** Will be blocked at qualification screen

## Features to Test

### 1. Creator Onboarding
- Login as `consumer2@bypass.com`
- Navigate to More → "Become a Creator"
- Should see all green checkmarks
- Complete onboarding flow
- Creator Tools appear in More tab

### 2. Creator Dashboard
- Login as `creator1@bypass.com` or `creator2@bypass.com`
- Navigate to More → Creator Tools → Creator Dashboard
- See mock metrics and recent activity
- Quick actions navigate to other screens

### 3. My Campaigns
- View different tabs:
  - **Active:** Shows accepted campaigns
  - **Available:** Browse new opportunities
  - **Pending:** Applications under review
  - **Completed:** Past campaigns
- Apply to available campaigns
- Track deliverables (mock)

### 4. Earnings
- View earnings summary
- Mock data shows:
  - Available balance
  - Pending earnings
  - Transaction history
- Payout request (mock - Stripe not connected)
- Filter by date range

### 5. Creator Analytics
- Performance metrics with trends
- Content performance rankings
- Audience insights (demographics)
- Campaign ROI tracking

## Known Limitations

1. **Mock Data:** Earnings and analytics use mock data
2. **Stripe Integration:** Payment setup is mocked
3. **Real-time Updates:** Require manual refresh
4. **Charts:** Show placeholders instead of actual visualizations

## Troubleshooting

### Error: "Could not find creator_campaigns"
- The app uses `campaign_applications` table (existing schema)
- This has been fixed in the latest code

### Error: "Too many screens defined"
- Fixed by adding `_layout.tsx` in creator folder
- Navigation structure now properly defined

### Error: "RLS policy violation"
- Run the RLS fix scripts if needed:
  - `/scripts/fix-rls-for-test-accounts.sql`
  - Or temporarily disable RLS for testing

### No Creator Profile After Onboarding
- The `upgrade_user_account` function should create it automatically
- Check if the function exists in your database
- Manually create if needed via SQL

## Success Criteria

✅ Creator onboarding blocks unqualified users
✅ Qualified users can complete onboarding
✅ Creator Tools appear in More tab after onboarding
✅ All 4 creator screens load without errors
✅ Campaign applications work
✅ Mock data appears realistic
✅ Navigation between screens works
✅ Pull-to-refresh works on all screens

## Next Steps

For production:
1. Implement real analytics data collection
2. Integrate Stripe Connect for payments
3. Add chart visualizations
4. Implement push notifications
5. Add real-time updates via subscriptions