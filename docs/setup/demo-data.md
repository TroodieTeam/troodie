# Demo Data Setup - Quick Start

## Step 1: Run SQL Query in Supabase

Copy and run this query in your **Supabase SQL Editor** (one time setup):

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

## Step 2: Place Restaurant Data File

Move your restaurant JSON file to the data folder:

```bash
mv ~/Downloads/restaurants_rows.json data/
```

## Step 3: Seed Demo Data

```bash
npm run demo:seed -- --email=kouamendri1@gmail.com
```

## Step 4: Clean Up When Done

```bash
npm run demo:cleanup -- --email=kouamendri1@gmail.com
```

---

## What This Creates

- **15 restaurant saves** (random from your dataset)
- **3 themed boards** (Date Night, Brunch, etc.)
- **10 posts** with realistic captions
- **5 friend connections** (if other users exist)

All data is tagged with `demo_session_id` for easy cleanup.

---

## Full Documentation

See `docs/demo-data-seeding.md` for complete guide.
