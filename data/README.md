# Data Directory

This directory contains data files and setup scripts for demo data seeding and test data references.

## Directory Structure

- **`test-data/`** - Test data reference files (see `test-data/README.md`)
  - `dev/` - Development environment test data IDs and queries
  - `prod/` - Production environment reference data (read-only)
- **Other files** - Demo data seeding scripts and mock data

## Setup

### 1. Run Database Setup (One Time)

Run `setup-demo-tracking.sql` in your Supabase SQL Editor:

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `data/setup-demo-tracking.sql`
3. Run the query

This adds `demo_session_id` columns to relevant tables for tracking demo data.

## Required Files

### `restaurants_rows.json`

**Purpose:** Restaurant data for demo seeding

**Location:** Place your restaurant JSON file here:
```
/Users/kndri/projects/troodie/data/restaurants_rows.json
```

**Format:** JSON array of restaurant objects with structure:
```json
[
  {
    "id": "uuid",
    "name": "Restaurant Name",
    "city": "City",
    "state": "State",
    "cuisine_types": ["Type1", "Type2"],
    "price_range": "$$",
    ...
  }
]
```

**Source:** Export from your Supabase `restaurants` table or use the provided dataset.

## Git Ignore

The `restaurants_rows.json` file is gitignored to avoid committing large datasets to the repository.

If you need to commit a sample dataset, create a separate `restaurants_sample.json` with a few entries.
