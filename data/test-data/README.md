# Test Data Reference

This directory contains reference data IDs for creating realistic testing scenarios.

## Structure

```
data/test-data/
├── dev/          # Development environment data IDs
│   ├── users.json
│   ├── restaurants.json
│   ├── campaigns.json
│   ├── creator_profiles.json
│   └── posts.json
└── prod/         # Production environment data IDs (for reference only)
    ├── users.json
    ├── restaurants.json
    └── ...
```

## Usage

These files are used to:
1. **Generate SQL queries** for test setup scenarios
2. **Reference actual IDs** when writing test cases
3. **Maintain consistency** across test runs
4. **Document relationships** between test entities

## Example Usage

```sql
-- Load test user IDs from JSON
-- Use in test setup scripts to create realistic scenarios

-- Example: Get test creator profile ID
SELECT id FROM creator_profiles 
WHERE user_id = (SELECT id FROM users WHERE email = 'creator1@troodieapp.com');
```

## File Format

Each JSON file contains an array of objects with:
- `id`: The primary key
- `name/email/title`: Human-readable identifier
- `metadata`: Additional context (status, relationships, etc.)

## Updating Data

When test data changes:
1. Update the appropriate JSON file
2. Update the testing guide references
3. Commit changes with clear message about what changed

