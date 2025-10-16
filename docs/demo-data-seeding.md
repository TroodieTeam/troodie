# Demo Data Seeding for Real User Accounts

This guide explains how to use the demo data seeding system to populate your real Troodie account with realistic test data for development, demos, and testing.

## Overview

The demo data seeding system allows you to:

- **Seed realistic data** for your real user account (not bypass test accounts)
- **Generate at scale** with configurable scenarios (light, medium, heavy)
- **Tag all data** with a unique session ID for easy cleanup
- **Preserve your profile** while removing all demo data
- **Use real restaurants** from your actual restaurant dataset

## Prerequisites

### 1. Database Setup

Run the SQL query in your Supabase SQL Editor to add demo session tracking:

**Option A: Copy from file**
```bash
# File: data/setup-demo-tracking.sql
# Copy contents and run in Supabase SQL Editor
```

**Option B: Copy query directly**
```sql
-- Add demo_session_id column to relevant tables
ALTER TABLE boards ADD COLUMN IF NOT EXISTS demo_session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_boards_demo_session ON boards(demo_session_id) WHERE demo_session_id IS NOT NULL;

ALTER TABLE restaurant_saves ADD COLUMN IF NOT EXISTS demo_session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_restaurant_saves_demo_session ON restaurant_saves(demo_session_id) WHERE demo_session_id IS NOT NULL;

ALTER TABLE posts ADD COLUMN IF NOT EXISTS demo_session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_posts_demo_session ON posts(demo_session_id) WHERE demo_session_id IS NOT NULL;

ALTER TABLE board_restaurants ADD COLUMN IF NOT EXISTS demo_session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_board_restaurants_demo_session ON board_restaurants(demo_session_id) WHERE demo_session_id IS NOT NULL;

ALTER TABLE user_relationships ADD COLUMN IF NOT EXISTS demo_session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_user_relationships_demo_session ON user_relationships(demo_session_id) WHERE demo_session_id IS NOT NULL;
```

### 2. Restaurant Data

Place your restaurant JSON file at:

```
/Users/kndri/projects/troodie/data/restaurants_rows.json
```

See `data/README.md` for file format details.

### 3. Environment Variables

Your `.env.development` must have:

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# OR
SUPABASE_SERVICE_ROLE_KEY=your_service_key  # Recommended for full access
```

## Usage

### Quick Start

```bash
# Seed demo data for your account
npm run demo:seed -- --email=your@email.com

# Clean up when done
npm run demo:cleanup -- --email=your@email.com
```

### Full Command Syntax

```bash
# Seeding
node scripts/seed-user-demo-data.js --email=your@email.com [--scenario=consumer-light]

# Cleanup
node scripts/cleanup-user-demo-data.js --email=your@email.com [--session=demo_session_id]
```

## Scenarios

### Consumer Light (Default)

**Use Case:** Quick demos, basic testing

**Data Generated:**
- 15 restaurant saves
- 3 themed boards
- 10 posts/reviews
- 5 friend connections

**Command:**
```bash
npm run demo:seed -- --email=your@email.com --scenario=consumer-light
```

### Future Scenarios (Coming Soon)

- **consumer-power**: Heavy user (50+ saves, 10+ boards, 30+ posts)
- **creator-active**: Creator with portfolio, campaigns, earnings
- **business-complete**: Business owner with campaigns, applications, analytics

## What Gets Created

### 1. Boards

Random selection from themed templates:
- Date Night Spots
- Weekend Brunch
- Quick Lunch
- Hidden Gems
- Budget Eats
- Fine Dining
- Vegetarian Friendly
- Late Night Eats

**Properties:**
- 30% chance of being private
- Created 0-90 days ago (realistic timestamps)
- Tagged with `demo_session_id`

### 2. Restaurant Saves

Randomly selected from your restaurant dataset:

**Properties:**
- Random rating (red, yellow, green)
- 50% chance of personal notes
- Created 0-120 days ago
- 50% chance of being added to a board
- Tagged with `demo_session_id`

### 3. Posts

Posts about restaurants with realistic captions:

**Captions:**
- "Absolutely loved this place! The {dish} was incredible."
- "Hidden gem alert! 🌟 Everything here is delicious."
- "Can't stop thinking about the {dish}. Must try!"
- And more...

**Properties:**
- Random rating (red, yellow, green)
- Created 0-90 days ago
- Public visibility
- Tagged with `demo_session_id`

### 4. Friend Connections

Connections with existing users in the database:

**Properties:**
- Accepted relationship status
- Created 0-180 days ago
- Only creates connections if other users exist
- Tagged with `demo_session_id`

## Data Cleanup

### Remove All Demo Data

```bash
npm run demo:cleanup -- --email=your@email.com
```

This removes:
- All boards with `demo_session_id`
- All restaurant saves with `demo_session_id`
- All posts with `demo_session_id`
- All board-restaurant links with `demo_session_id`
- All friend connections with `demo_session_id`

**What's preserved:**
- Your user profile
- Real (non-demo) data
- Account settings
- Any data created without `demo_session_id`

### Remove Specific Session

If you want to clean up only a specific demo session:

```bash
npm run demo:cleanup -- --email=your@email.com --session=demo_1234567890_abc123
```

## Example Workflow

### Development Session

```bash
# Start of day: Seed demo data
npm run demo:seed -- --email=ken@troodie.com

# Work on features, test with realistic data
# ...

# End of day: Clean up
npm run demo:cleanup -- --email=ken@troodie.com
```

### Demo Presentation

```bash
# Before demo: Create fresh data
npm run demo:seed -- --email=demo@company.com

# Give demo with realistic user data
# ...

# After demo: Remove demo data
npm run demo:cleanup -- --email=demo@company.com
```

### Multiple Sessions

```bash
# Session 1: Consumer data
npm run demo:seed -- --email=you@email.com
# Note the session ID from output: demo_1234567890_abc123

# Session 2: More consumer data (different restaurants)
npm run demo:seed -- --email=you@email.com
# Note the session ID: demo_1234567899_xyz789

# Clean up just session 1
npm run demo:cleanup -- --email=you@email.com --session=demo_1234567890_abc123

# Or clean up everything
npm run demo:cleanup -- --email=you@email.com
```

## Output Example

```
🚀 Starting User Demo Data Seeding
====================================
📧 User Email: ken@troodie.com
🎯 Scenario: consumer-light
🆔 Demo Session ID: demo_1697123456_a1b2c3

🔍 Verifying user: ken@troodie.com...

✅ Found user: Ken Ndri (consumer)
   ID: 123e4567-e89b-12d3-a456-426614174000

📖 Loading restaurant data...

✅ Loaded 1234 restaurants from file

📋 Creating 3 boards...

✅ Created board: "Date Night Spots"
✅ Created board: "Weekend Brunch"
✅ Created board: "Hidden Gems"

🍽️ Creating 15 restaurant saves...

✅ Saved: Penguin Drive In (green)
   └─ Added to board: "Weekend Brunch"
✅ Saved: Fin & Fino (yellow)
✅ Saved: Lazy Bear (green)
   └─ Added to board: "Date Night Spots"
...

✍️ Creating 10 posts...

✅ Posted about: Wooden Spoon
   Caption: "Absolutely loved this place! The burger was incre..."
✅ Posted about: Meshugganah
   Caption: "Hidden gem alert! 🌟 Everything here is delicio..."
...

👥 Creating 5 friend connections...

✅ Connected with: Jane Doe
✅ Connected with: John Smith
...

====================================
✅ Demo Data Seeding Complete!
====================================

📊 Summary:
- Created 3 boards
- Created 15 restaurant saves
- Created 10 posts
- Created 5 friend connections

🔑 Demo Session ID: demo_1697123456_a1b2c3
   Use this ID to clean up the demo data later.

🧹 To cleanup this demo data, run:
   node scripts/cleanup-user-demo-data.js --email=ken@troodie.com
```

## Troubleshooting

### "User not found"

**Cause:** The email doesn't exist in the database.

**Solution:** Make sure you're using a real user email that's already registered.

```bash
# Check if user exists in Supabase Dashboard
SELECT email, name, account_type FROM users WHERE email = 'your@email.com';
```

### "Restaurant file not found"

**Cause:** The JSON file is not at the expected location.

**Solution:** Move the file to the `/data` folder in your project:

```bash
# Move file to data folder
mv ~/Downloads/restaurants_rows.json /Users/kndri/projects/troodie/data/

# Or copy if you want to keep original
cp ~/Downloads/restaurants_rows.json /Users/kndri/projects/troodie/data/
```

### "No other users found"

**Cause:** Friend connections require other users in the database.

**Solution:** This is just a warning. The script will continue and create other data types.

### "Missing Supabase credentials"

**Cause:** Environment variables not set.

**Solution:** Check your `.env.development` file has the correct variables:

```bash
# View current environment
cat .env.development | grep SUPABASE
```

## Technical Details

### Demo Session ID Format

```
demo_{timestamp}_{random_id}
```

Example: `demo_1697123456_a1b2c3`

### Database Schema

All demo-compatible tables have:

```sql
demo_session_id TEXT  -- NULL for real data, populated for demo data
```

### Cleanup Order

To respect foreign key constraints, cleanup happens in this order:

1. `board_restaurants` (junction table)
2. `posts` (dependent on restaurants)
3. `restaurant_saves` (dependent on restaurants)
4. `user_relationships` (dependent on users)
5. `boards` (has foreign keys from board_restaurants)

## Best Practices

1. **Always cleanup** after demos to avoid confusion with real data
2. **Note the session ID** if you need to clean up specific sessions later
3. **Test on dev first** before using on production data
4. **Backup before cleanup** if you're unsure about the data
5. **Use light scenarios** for quick tests, reserve heavy for stress testing

## Future Enhancements

- [ ] Creator scenario with portfolio items and campaigns
- [ ] Business scenario with campaign management
- [ ] Custom scenario configuration via JSON
- [ ] Selective cleanup (e.g., only boards, only posts)
- [ ] Dry-run mode to preview what would be created
- [ ] Import/export demo scenarios
- [ ] Analytics on demo data usage

## Support

For issues or questions:

1. Check this documentation
2. Review script output for specific errors
3. Verify database migrations are up to date
4. Check Supabase logs for RLS policy issues

---

**Created:** 2025-10-13
**Last Updated:** 2025-10-13
**Version:** 1.0.0
