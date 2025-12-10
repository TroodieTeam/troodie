# Test Data Post-Setup Guide

**Status:** ✅ All seed files (01-12) completed  
**Date:** January 22, 2025

---

## ✅ What You've Completed

You've successfully run all 12 seed files:

1. ✅ Extensions setup
2. ✅ Users (5 consumers, 3 creators, 2 businesses)
3. ✅ Default boards
4. ✅ Creator profiles (3 creators)
5. ✅ Restaurants claimed (2 businesses)
6. ✅ Posts (5 consumers + 3 creators)
7. ✅ Restaurant saves
8. ✅ User follows
9. ✅ Campaigns (business2: 3 campaigns)
10. ✅ Campaign applications (~5-8 applications)
11. ✅ Deliverables (~3-5 deliverables)
12. ✅ Verification

---

## 🎯 Immediate Next Steps

### 1. Verify Data Creation

Run the verification script to confirm everything was created:

```sql
-- Run: data/test-data/dev/12-verify-setup.sql
```

**Expected Results:**
- 10 users (5 consumers, 3 creators, 2 businesses)
- 3 campaigns (all for business2)
- ~5-8 campaign applications
- ~3-5 deliverables
- Posts, saves, follows, etc.

### 2. Test Login with Seeded Accounts

Try logging into the app with your test accounts:

**Test Accounts:**
- **Consumer:** `test-consumer1@bypass.com` (password: `BypassPassword123`, OTP: `000000`)
- **Creator:** `test-creator1@bypass.com` (password: `BypassPassword123`, OTP: `000000`)
- **Business:** `test-business1@bypass.com` (password: `BypassPassword123`, OTP: `000000`)

**Quick Test:**
1. Open the app
2. Enter email (e.g., `test-consumer1@bypass.com`)
3. Enter OTP: `000000` (triggers password auth)
4. Verify login successful
5. Check that user data loads (posts, saves, boards, etc.)

### 3. Test Core App Functionality

**Consumer Features:**
- ✅ View feed (should see posts from 5 consumers + 3 creators)
- ✅ View saved restaurants (should see saves from seed data)
- ✅ View boards (should see default boards)
- ✅ View profile (should show user stats)

**Creator Features:**
- ✅ View creator profile (should show portfolio, stats)
- ✅ Browse campaigns (should see business2's 3 campaigns)
- ✅ View applications (should see submitted applications)
- ✅ View deliverables (should see deliverables for accepted applications)

**Business Features:**
- ✅ View campaigns (business2 should see 3 campaigns)
- ✅ View applications (should see ~5-8 applications)
- ✅ View deliverables (should see ~3-5 deliverables)
- ✅ View restaurant analytics (if implemented)

---

## 📚 Testing Guides

### Primary Testing Guide
**`docs/CREATOR_MARKETPLACE_E2E_TESTING_GUIDE.md`**
- Comprehensive E2E testing guide
- Covers all creator marketplace features
- Includes test scenarios and expected behaviors

### Quick Testing Guides
- **Creator Onboarding:** `docs/creator-marketplace-testing-guide.md`
- **Creator Screens:** `docs/creator-screens-testing-guide.md`
- **Deliverables:** `docs/features/campaigns/testing/DELIVERABLES_MVP_TESTING_GUIDE.md`
- **Beta Access:** `docs/testing/beta-testing.md`

---

## 🔄 Optional: Create Remaining Test Users

You currently have **10 out of 20** test users. The remaining 10 are optional but useful for comprehensive testing:

**Remaining Users:**
- 5 Consumers (test-consumer6 through test-consumer10)
- 4 Creators (test-creator4 through test-creator7)
- 1 Business (test-business3)

**To Create:**
1. Follow `docs/TEST_USERS_SETUP.md`
2. Create users in Supabase Admin Dashboard
3. Update `data/test-data/dev/02-create-users.sql` with new UUIDs
4. Re-run seed files 02-12 (or just the ones you need)

**Note:** The seed files are already configured to handle missing users gracefully, so you can test with just the 10 existing users.

---

## 🐛 Troubleshooting

### Issue: Can't log in with test account
**Solution:**
- Verify user exists in Supabase Auth Dashboard
- Check that `providers: ["email"]` is set in `raw_app_meta_data`
- Verify password is set correctly
- Check `docs/TEST_USERS_SETUP.md` for setup instructions

### Issue: No data showing in app
**Solution:**
- Run verification script (`12-verify-setup.sql`) to check data exists
- Verify RLS policies allow access
- Check app logs for errors
- Verify user ID matches between `auth.users` and `public.users`

### Issue: Missing campaigns/applications
**Solution:**
- Verify business2 user exists and has campaigns
- Check that creator profiles exist
- Re-run steps 09-11 if needed (they're idempotent)

---

## 📊 Data Summary

### Current Test Data

**Users:**
- 5 Consumers (test-consumer1 through test-consumer5)
- 3 Creators (test-creator1 through test-creator3)
- 2 Businesses (test-business1, test-business2)

**Content:**
- Posts from 8 users (5 consumers + 3 creators)
- Restaurant saves
- User follows
- 3 campaigns (business2)
- ~5-8 applications
- ~3-5 deliverables

**Restaurants:**
- 2 claimed restaurants (business1, business2)
- Multiple unclaimed restaurants for testing

---

## 🎯 Recommended Testing Flow

1. **Basic Functionality** (15 min)
   - Login with each account type
   - Verify data loads correctly
   - Check navigation works

2. **Consumer Features** (30 min)
   - Browse feed
   - View saves and boards
   - Create a post (optional)

3. **Creator Features** (45 min)
   - View creator profile
   - Browse campaigns
   - Submit application (if not already done)
   - View deliverables

4. **Business Features** (45 min)
   - View campaigns
   - Review applications
   - Review deliverables
   - Create new campaign (optional)

5. **E2E Flows** (1-2 hours)
   - Follow `docs/CREATOR_MARKETPLACE_E2E_TESTING_GUIDE.md`
   - Test complete user journeys
   - Test edge cases

---

## ✅ Completion Checklist

- [ ] Run verification script and review output
- [ ] Test login with all 3 account types
- [ ] Verify data loads in app
- [ ] Test consumer features
- [ ] Test creator features
- [ ] Test business features
- [ ] Review testing guides
- [ ] Document any issues found
- [ ] (Optional) Create remaining 10 test users

---

## 📝 Notes

- **All test accounts use:** `@bypass.com` domain, password: `BypassPassword123`, OTP: `000000`
- **Seed files are idempotent:** Safe to re-run if needed
- **Data is realistic:** Posts, saves, and follows simulate real usage patterns
- **Business3 is optional:** Can be added later when needed

---

**Ready to test?** Start with login verification, then follow the testing guides!

