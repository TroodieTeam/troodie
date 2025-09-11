# Test Accounts Setup Guide

## Overview

This guide explains how to set up and use test accounts for the Troodie app. All test accounts use a special authentication bypass pattern for easier testing.

## Test Account Pattern

All test accounts use emails ending with `@bypass.com` and authenticate using OTP code `000000`.

## Setup Instructions

### 1. Run the JavaScript Seeding Script (Recommended)

```bash
# From the project root
node scripts/seed-test-accounts.js
```

This script will:
- Create 8 test users (3 consumers, 2 creators, 2 business owners, 1 multi-role)
- Create 30 test restaurants
- Set up creator profiles with specialties and rate cards
- Set up business profiles and claim restaurants
- Create sample boards for users

### 2. Alternative: Run SQL Script Directly

If you prefer to use SQL directly in Supabase:

```bash
# Copy the contents of scripts/seed-test-data.sql
# Paste and run in Supabase SQL Editor
```

## Test Accounts

### Consumer Accounts (Default Type)
- **consumer1@bypass.com** - Test Consumer One
- **consumer2@bypass.com** - Test Consumer Two  
- **consumer3@bypass.com** - Test Consumer Three

### Creator Accounts
- **creator1@bypass.com** - Test Creator One (Food blogger)
- **creator2@bypass.com** - Test Creator Two (Travel/food influencer)

### Business Owner Accounts
- **business1@bypass.com** - Owns "The Rustic Table"
- **business2@bypass.com** - Owns "Sakura Sushi"

### Multi-Role Account (Creator + Business)
- **multi_role@bypass.com** - Creator who also owns "Bella Vista Italian Kitchen"

## Authentication

All test accounts use:
- **OTP Code:** `000000`
- **No actual email verification required**

## Testing Scenarios

The test data supports all scenarios outlined in `docs/account-type-system-testing-guide.md`:

### 1. Consumer Experience
- Sign in as `consumer1@bypass.com`
- Verify "Food Explorer" badge
- Test restaurant exploration, saving, and reviews

### 2. Creator Upgrade
- Sign in as `consumer2@bypass.com` 
- Navigate to More tab → "Become a Creator"
- Complete creator onboarding
- Verify "Content Creator" badge and Creator Tools section

### 3. Business Claiming
- Sign in as `consumer3@bypass.com`
- Navigate to More tab → "Claim Your Restaurant"
- Search for an unclaimed restaurant
- Complete claiming process
- Verify "Business Owner" badge and Business Tools section

### 4. Multi-Role Testing
- Sign in as `multi_role@bypass.com`
- Verify both Creator Tools and Business Tools sections
- Test switching between creator and business features

## Test Restaurants

The script creates 30 diverse restaurants including:
- **The Rustic Table** - Farm-to-table American (claimed by business1)
- **Sakura Sushi** - Japanese sushi bar (claimed by business2)
- **Bella Vista Italian Kitchen** - Italian trattoria (claimed by multi_role)
- **Taco Libre** - Mexican street tacos
- **The Green Garden** - Vegan/vegetarian
- **Bombay Spice House** - Indian cuisine
- **Le Petit Bistro** - French fine dining
- And 23 more diverse restaurants...

All test restaurants:
- Have `.test` domain websites
- Include complete data (hours, photos, amenities, tags)
- Are distributed across major US cities
- Have varying price ranges and ratings

## Cleanup

To remove all test data:

```sql
-- Delete test data
DELETE FROM business_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@bypass.com');
DELETE FROM creator_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@bypass.com');
DELETE FROM boards WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@bypass.com');
DELETE FROM users WHERE email LIKE '%@bypass.com';
DELETE FROM restaurants WHERE website LIKE '%.test';
```

## Verification Queries

Check test data status:

```sql
-- List all test users
SELECT email, account_type, is_creator, is_restaurant 
FROM users 
WHERE email LIKE '%@bypass.com'
ORDER BY account_type;

-- Show claimed restaurants
SELECT r.name, u.email as owner_email
FROM restaurants r
JOIN users u ON r.claimed_by = u.id
WHERE r.is_claimed = true AND r.website LIKE '%.test';

-- Count test restaurants
SELECT COUNT(*) as total FROM restaurants WHERE website LIKE '%.test';
```

## Troubleshooting

### Script fails with "Missing Supabase credentials"
- Ensure `.env.development` exists with:
  - `SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_URL`
  - `SUPABASE_ANON_KEY` or `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Authentication fails with test accounts
- Verify the authService.ts includes bypass logic for `@bypass.com` emails
- Ensure you're using OTP code `000000`

### Users created but no profiles
- Check that the account type migrations have been run
- Verify creator_profiles and business_profiles tables exist

### Restaurants not appearing
- Ensure restaurants table has all required columns
- Check that latitude/longitude are valid coordinates

## Integration with App

The app's `authService.ts` has been updated to recognize `@bypass.com` emails:

```typescript
// Special handling for test accounts
if (email.toLowerCase().endsWith('@bypass.com') && token === '000000') {
  // Bypass normal OTP flow
  // Create mock session for testing
}
```

This allows seamless testing without actual email verification.

## Best Practices

1. **Use unique usernames** - Each test account has a distinct username
2. **Test progressively** - Start with consumer, upgrade to creator, then business
3. **Verify data consistency** - Check that account types match profile records
4. **Test error cases** - Try claiming already-claimed restaurants
5. **Check permissions** - Verify users can only access appropriate features

## Support

For issues or questions about test accounts:
1. Check the main testing guide: `docs/account-type-system-testing-guide.md`
2. Review the seeding scripts for implementation details
3. Verify database migrations are up to date