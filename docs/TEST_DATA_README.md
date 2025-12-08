# Test Data Setup - Quick Reference

**Status:** ✅ All seed files (01-12) completed and tested

---

## 📚 Documentation

### Main Guides

1. **`TEST_DATA_GUIDE.md`** - **Start here!**
   - Complete post-setup guide
   - Testing instructions
   - Troubleshooting tips
   - Links to all testing guides

2. **`TEST_USERS_SETUP.md`**
   - Manual user creation instructions
   - UUID mapping reference
   - Current status of created users

### Testing Guides

- **`CREATOR_MARKETPLACE_E2E_TESTING_GUIDE.md`** - Comprehensive E2E testing
- **`creator-marketplace-testing-guide.md`** - Quick creator onboarding tests
- **`creator-screens-testing-guide.md`** - Creator dashboard testing

---

## 🚀 Quick Start

### 1. Verify Setup
Run: `data/test-data/dev/12-verify-setup.sql`

### 2. Test Login
- Consumer: `test-consumer1@bypass.com` (OTP: `000000`)
- Creator: `test-creator1@bypass.com` (OTP: `000000`)
- Business: `test-business1@bypass.com` (OTP: `000000`)

### 3. Test Features
Follow `TEST_DATA_GUIDE.md` for detailed testing instructions

---

## 📊 Current Test Data

**Users:** 10 total (5 consumers, 3 creators, 2 businesses)  
**Campaigns:** 3 (business2)  
**Applications:** ~5-8  
**Deliverables:** ~3-5  
**Posts, saves, follows:** Seeded with realistic data

---

## 🔧 Useful Scripts

- **`scripts/get-test-user-uuids.sql`** - Get all test user UUIDs quickly
- **`data/test-data/dev/12-verify-setup.sql`** - Verify all data was created

---

## 📝 Seed Files

All seed files are in `data/test-data/dev/`:
- `01-setup-extensions.sql` through `12-verify-setup.sql`
- Files are idempotent (safe to re-run)
- Updated to use `@bypass.com` email domain

---

For detailed instructions, see **`TEST_DATA_GUIDE.md`**





