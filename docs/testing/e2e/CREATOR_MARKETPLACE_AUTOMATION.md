# Creator Marketplace E2E Automation Guide

**Goal:** Reduce testing time from 60 minutes → 10 minutes  
**Solution:** Hybrid SQL + Maestro automation

---

## 🎯 The Problem: What Was Taking 60 Minutes?

| Manual Step | Time | Bottleneck |
|-------------|------|------------|
| Login/logout between 4 accounts | ~15 min | UI navigation |
| Stripe Business onboarding | ~15 min | **External OAuth flow** |
| Stripe Creator onboarding | ~10 min | **External OAuth flow** |
| Campaign/application navigation | ~10 min | UI navigation |
| Waiting for webhooks | ~5 min | Network latency |
| Verification queries | ~5 min | Manual SQL |

**Key insight:** Stripe onboarding cannot be automated through UI - it's an external OAuth redirect.

---

## 🚀 The Solution: Hybrid Automation

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTOMATED TEST PIPELINE                       │
├─────────────────────────────────────────────────────────────────┤
│  Phase 1: SQL Setup (1-2 min)                                   │
│  ├── Reset all test data                                        │
│  ├── Pre-create Stripe accounts in DB (skip onboarding!)        │
│  ├── Set campaigns to paid state                                │
│  └── Create payment records                                     │
├─────────────────────────────────────────────────────────────────┤
│  Phase 2: Maestro UI Tests (5-7 min)                            │
│  ├── Creator applies to campaign                                │
│  ├── Business accepts application                               │
│  ├── Creator submits deliverable                                │
│  ├── Business approves deliverable                              │
│  └── Creator verifies payout                                    │
├─────────────────────────────────────────────────────────────────┤
│  Phase 3: Verification (1-2 min)                                │
│  ├── SQL verification queries                                   │
│  ├── Screenshot evidence                                        │
│  └── Generate test report                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Quick Start

### Option 1: Full Automated Suite (~10 min)

```bash
# 1. Run SQL setup in Supabase SQL Editor
#    File: e2e/scripts/setup-e2e-test-data.sql

# 2. Run the full test suite
npm run test:e2e:marketplace
```

### Option 2: Orchestrated Run (interactive)

```bash
npm run test:e2e:marketplace:full
```

### Option 3: Individual Flows (debugging)

```bash
# Step 1: Creator applies
npm run test:e2e:marketplace:apply

# Step 2: Business accepts
npm run test:e2e:marketplace:accept

# Step 3: Creator submits deliverable
npm run test:e2e:marketplace:deliverable

# Step 4: Business approves (triggers payout)
npm run test:e2e:marketplace:approve

# Step 5: Creator verifies payout
npm run test:e2e:marketplace:payout
```

---

## 🔧 Files Created

### Maestro Flows

| File | Purpose |
|------|---------|
| `e2e/flows/creator-marketplace/apply-to-campaign.yaml` | Creator applies to paid campaign |
| `e2e/flows/creator-marketplace/business-accepts-application.yaml` | Business accepts creator |
| `e2e/flows/creator-marketplace/creator-submits-deliverable.yaml` | Creator submits content |
| `e2e/flows/creator-marketplace/business-approves-deliverable.yaml` | Business approves (→ payout) |
| `e2e/flows/creator-marketplace/creator-verifies-payout.yaml` | Creator checks earnings |

### Test Suite

| File | Purpose |
|------|---------|
| `e2e/suites/creator-marketplace.yaml` | Master suite running all flows |

### Setup Scripts

| File | Purpose |
|------|---------|
| `e2e/scripts/setup-e2e-test-data.sql` | Pre-seed data (skip Stripe onboarding!) |
| `e2e/scripts/run-marketplace-e2e.sh` | Shell orchestrator |
| `e2e/scripts/run-e2e-with-setup.js` | Node.js orchestrator |

### Helpers

| File | Purpose |
|------|---------|
| `e2e/helpers/login-bypass.yaml` | Reusable login with OTP bypass |
| `e2e/fixtures/prod-test-users.json` | Test account credentials |

---

## 🔑 How the Magic Works

### The Stripe Onboarding Trick

Instead of actually going through Stripe's OAuth flow (which takes 10-15 min each for business AND creator), we **pre-seed the database** with fake Stripe account records:

```sql
-- Pre-create Stripe account (skip onboarding!)
INSERT INTO stripe_accounts (
  user_id,
  stripe_account_id,
  account_type,
  onboarding_completed,  -- ← Set to TRUE
  charges_enabled,       -- ← Set to TRUE
  payouts_enabled        -- ← Set to TRUE
)
VALUES (...);
```

This makes the app think Stripe onboarding is complete, so:
- Business can "pay" for campaigns
- Creator can "receive" payouts
- All payment flows work in the app UI

### The Pre-Paid Campaign Trick

Instead of going through the payment UI:

```sql
-- Pre-create paid campaign
UPDATE campaigns
SET 
  status = 'active',
  payment_status = 'paid'  -- ← Already paid!
WHERE ...;

-- Pre-create payment record
INSERT INTO campaign_payments (
  status,  -- ← 'succeeded'
  ...
)
VALUES (...);
```

Now creators can immediately apply to campaigns without waiting for payment.

---

## 📊 Time Breakdown

| Phase | Manual | Automated |
|-------|--------|-----------|
| Data setup | 30 min | **1 min** (SQL) |
| Creator applies | 5 min | **1 min** (Maestro) |
| Business accepts | 5 min | **1 min** (Maestro) |
| Creator submits | 5 min | **1 min** (Maestro) |
| Business approves | 5 min | **1 min** (Maestro) |
| Verify payout | 5 min | **1 min** (Maestro) |
| **TOTAL** | **60 min** | **~8 min** |

---

## 🧪 Test Accounts Used

| Email | OTP | Role | In Tests |
|-------|-----|------|----------|
| `prod-creator1@bypass.com` | `000000` | Creator | Apply, submit, verify |
| `prod-business1@bypass.com` | `000000` | Business | Accept, approve |

---

## ⚠️ Limitations

### What's NOT Tested

1. **Actual Stripe onboarding** - We skip it with SQL
2. **Real Stripe transfers** - We use test/mock IDs
3. **Webhook delivery** - We verify DB state instead
4. **Email notifications** - Bypass accounts don't receive emails

### What IS Tested

1. ✅ App UI flows work correctly
2. ✅ Campaign application flow
3. ✅ Deliverable submission flow
4. ✅ Business review/approval flow
5. ✅ Payment status updates in UI
6. ✅ Earnings display for creators

### For Full Payment Testing

If you need to test **actual Stripe integration**:

1. Use the manual guide: `docs/PRODUCTION_TESTING_ULTIMATE_GUIDE.md`
2. Set up real Stripe test mode accounts
3. Run through the full 60-min flow

---

## 🔄 CI/CD Integration (Future)

```yaml
# .eas/workflows/e2e-marketplace.yml
jobs:
  setup_data:
    type: custom
    steps:
      - run: node e2e/scripts/run-e2e-with-setup.js

  maestro_test:
    type: maestro
    needs: [build_job]
    params:
      build_id: ${{ needs.build_job.outputs.build_id }}
      flow_path: 
        - 'e2e/suites/creator-marketplace.yaml'
```

---

## 🐛 Troubleshooting

### "App not found"
```bash
# Verify app is installed
xcrun simctl listapps booted | grep troodie

# Reinstall
npx expo run:ios
```

### "Element not found"
1. Use `maestro studio` to inspect elements
2. Check if element has `testID` or `accessibilityLabel`
3. Add `waitForAnimationToEnd` before interactions

### "Login fails"
1. Verify OTP bypass works with `prod-*@bypass.com` accounts
2. Check if account exists in database
3. Try `clearState: true` in launchApp

### "Tests flaky"
1. Add more `waitForAnimationToEnd` calls
2. Increase timeouts in `assertVisible`
3. Use `optional: true` for non-critical assertions

---

## 📚 Related Docs

- `docs/PRODUCTION_TESTING_ULTIMATE_GUIDE.md` - Full manual testing guide
- `docs/PAYMENT_SYSTEM_E2E_TESTING_GUIDE.md` - Payment system details
- `docs/CREATOR_MARKETPLACE_E2E_TESTING_GUIDE.md` - Full feature reference
- `docs/testing/e2e/maestro-setup.md` - Maestro setup guide

---

**Created:** December 17, 2025  
**Target:** 60 min → 10 min ⚡
