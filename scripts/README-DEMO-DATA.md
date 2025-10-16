# Demo Data Scripts

Quick reference for seeding and cleaning up demo data.

## Quick Start

```bash
# 1. Run SQL query in Supabase (one time setup)
# Copy SQL from docs/demo-data-seeding.md and run in Supabase SQL Editor

# 2. Place restaurant data file
# mv ~/Downloads/restaurants_rows.json data/

# 3. Seed demo data for your account
npm run demo:seed -- --email=your@email.com

# 4. Clean up when done
npm run demo:cleanup -- --email=your@email.com
```

## Scripts

### `seed-user-demo-data.js`

Creates realistic demo data for a real user account.

**Usage:**
```bash
node scripts/seed-user-demo-data.js --email=your@email.com [--scenario=consumer-light]
```

**Scenarios:**
- `consumer-light` (default): 15 saves, 3 boards, 10 posts, 5 friends

**What it creates:**
- Themed boards
- Restaurant saves from real data
- Posts with realistic captions
- Friend connections

**All data is tagged** with a `demo_session_id` for cleanup.

### `cleanup-user-demo-data.js`

Removes all demo-tagged data for a user.

**Usage:**
```bash
node scripts/cleanup-user-demo-data.js --email=your@email.com [--session=demo_session_id]
```

**What it removes:**
- All boards with `demo_session_id`
- All restaurant saves with `demo_session_id`
- All posts with `demo_session_id`
- All board-restaurant links with `demo_session_id`
- All friend connections with `demo_session_id`

**What it preserves:**
- User profile
- Real (non-demo) data
- Account settings

## Examples

### Basic Usage

```bash
# Seed
npm run demo:seed -- --email=ken@troodie.com

# Cleanup
npm run demo:cleanup -- --email=ken@troodie.com
```

### Clean Specific Session

```bash
# Cleanup only a specific demo session
npm run demo:cleanup -- --email=ken@troodie.com --session=demo_1697123456_a1b2c3
```

## Requirements

1. **Restaurant data file** at `data/restaurants_rows.json` (in project root)
2. **Database columns** added via SQL query (see docs)
3. **Supabase credentials** in `.env.development`

## Full Documentation

See `docs/demo-data-seeding.md` for complete documentation.
