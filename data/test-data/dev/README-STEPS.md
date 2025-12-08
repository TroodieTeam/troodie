# Step-by-Step Test Data Setup

This directory contains the test data setup broken down into numbered steps for easier debugging and execution.

## Quick Start

Run the steps in order (01 through 12) in the Supabase SQL Editor:

1. `01-setup-extensions.sql` - Setup required PostgreSQL extensions
2. `02-create-users.sql` - Create 20 test users (10 consumers, 7 creators, 3 businesses)
3. `03-create-boards.sql` - Create default boards for all users
4. `04-create-creator-profiles.sql` - Create creator profiles with portfolios
5. `05-create-restaurants.sql` - Create restaurants (3 claimed + 5 unclaimed)
6. `06-create-posts.sql` - Create posts with engagement (likes, comments)
7. `07-create-restaurant-saves.sql` - Create restaurant saves via board_restaurants (matches actual app behavior)
8. `08-create-user-follows.sql` - Create user follow relationships
9. `09-create-campaigns.sql` - Create campaigns for business accounts
10. `10-create-campaign-applications.sql` - Create campaign applications
11. `11-create-deliverables.sql` - Create deliverables for accepted applications
12. `12-verify-setup.sql` - Verify all data was created successfully

## Running the Steps

### Option 1: Run All Steps at Once
Use the original `setup-robust-test-scenario.sql` file if you want to run everything in one go.

### Option 2: Run Step by Step (Recommended for Debugging)
1. Open Supabase SQL Editor
2. Run each numbered file in sequence
3. Check the output messages after each step
4. If a step fails, you can fix it and re-run just that step

## Test Accounts

All test accounts use **OTP: `000000`** for authentication.

### Consumers
- `test-consumer1@troodieapp.com` through `test-consumer10@troodieapp.com`

### Creators
- `test-creator1@troodieapp.com` through `test-creator7@troodieapp.com`

### Businesses
- `test-business1@troodieapp.com` (NEW - no campaigns)
- `test-business2@troodieapp.com` (MEDIUM - 3 campaigns, ~8 applications)
- `test-business3@troodieapp.com` (HIGH - 10 campaigns, ~25 applications)

## Troubleshooting

If a step fails:
1. Check the error message
2. Verify previous steps completed successfully
3. Check if data already exists (scripts are idempotent)
4. Re-run the failed step after fixing the issue

## Verification

After running all steps, run `12-verify-setup.sql` to see a summary of all created data.

