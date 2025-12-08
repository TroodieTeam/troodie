# Production Test Data

This folder contains SQL scripts for setting up **isolated test accounts in production**.

## Key Principle: Test User Isolation

All accounts created here use `@bypass.com` email domain, which means:
- They are automatically flagged as `is_test_account = true`
- **Production users CANNOT see these accounts** in any listing, search, or feed
- Test users CAN see each other for end-to-end testing
- All data created by test users is tagged and isolated

⚠️ **IMPORTANT:** Test accounts are fully functional but completely invisible to real production users.

---

## Prerequisites

Before running these scripts, ensure the isolation migration has been deployed:

```sql
-- Verify in Supabase SQL Editor
SELECT proname FROM pg_proc WHERE proname = 'is_test_email';
-- Should return: is_test_email
```

If it doesn't exist, first run:
- `supabase/migrations/20250205_production_test_user_isolation.sql`

---

## Scripts

### 01-production-test-users-setup.sql

Creates the core production test accounts:

| Email | Type | Purpose |
|-------|------|---------|
| `prod-consumer1@bypass.com` | Consumer | Testing consumer flows |
| `prod-consumer2@bypass.com` | Consumer | Secondary consumer |
| `prod-creator1@bypass.com` | Creator | Creator testing (Available) |
| `prod-creator2@bypass.com` | Creator | Creator testing (Available) |
| `prod-creator3@bypass.com` | Creator | Creator testing (Busy status) |
| `prod-business1@bypass.com` | Business | Business testing |
| `prod-business2@bypass.com` | Business | Secondary business |

**How to Login:**
- Email: `prod-xxx@bypass.com`
- OTP Code: `000000` (six zeros)

---

## Usage

### Initial Setup

1. Open Supabase Dashboard (Production)
2. Go to SQL Editor
3. Copy contents of `01-production-test-users-setup.sql`
4. Run the query
5. Verify output shows accounts created

### Verification

```sql
-- Verify accounts exist and are flagged
SELECT email, account_type, is_test_account
FROM users
WHERE email LIKE 'prod-%@bypass.com';

-- Should show 7 rows, all with is_test_account = true
```

---

## Important Notes

1. **Never share these accounts publicly** - they're for internal testing only
2. **Password cannot be changed** - it's hardcoded to `BypassPassword123`
3. **Test data stays isolated** - production users cannot see it
4. **Cleanup not needed** - test data doesn't affect production
5. **Can test full flows** - campaigns, applications, deliverables all work

---

## Adding More Test Users

To add additional test users, follow the pattern in `01-production-test-users-setup.sql`:

```sql
-- In auth.users
INSERT INTO auth.users (id, email, encrypted_password, ...)
VALUES (
  'new-uuid-here'::uuid,
  'new-test-user@bypass.com',  -- Must use @bypass.com
  crypt('BypassPassword123', gen_salt('bf')),
  ...
);

-- In public.users
INSERT INTO public.users (id, email, name, account_type, ...)
VALUES (
  'new-uuid-here'::uuid,
  'new-test-user@bypass.com',
  'New Test User',
  'consumer',  -- or 'creator' or 'business'
  ...
);
```

---

## How Isolation Works

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION DATABASE                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐        ┌──────────────────┐           │
│  │ PRODUCTION USERS │        │   TEST USERS      │          │
│  │ (real@email.com) │   ✕    │ (*@bypass.com)    │          │
│  │                  │←───────│                   │          │
│  │ • See real data  │  Can't │ • See test data   │          │
│  │ • Can't see test │  see   │ • CAN see real    │          │
│  │   accounts       │  each  │   data (for QA)   │          │
│  └──────────────────┘ other  └──────────────────┘          │
│                                                              │
│  ┌─────────────────────────────────────────────────┐        │
│  │              ISOLATION LAYER                     │        │
│  │  • get_creators() filters by is_test_account    │        │
│  │  • production_* views exclude test data         │        │
│  │  • Campaigns auto-flagged by creator            │        │
│  └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## Related Documentation

- [Production Deployment Guide](../../../docs/CREATOR_MARKETPLACE_PRODUCTION_DEPLOYMENT.md)
- [Production Testing Checklist](../../../docs/CREATOR_MARKETPLACE_PRODUCTION_TESTING_CHECKLIST.md)
- [E2E Testing Guide](../../../docs/CREATOR_MARKETPLACE_E2E_TESTING_GUIDE.md)
- [Dev Test Data](../dev/README.md) - Development environment test data
