# Implement Restaurant Data Import

- Epic: Restaurant Management
- Priority: Medium
- Estimate: 3 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
Allow users to upload existing restaurant lists and travel history from CSV, Google Maps, Apple Maps, or other sources.

## Business Value
Onboarding friction is a major barrier. Users already have restaurant lists in other apps. Import functionality provides instant value and reduces cold-start problem.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Import restaurant data
  As a new user
  I want to import my existing restaurant lists
  So that I don't have to start from scratch

  Scenario: Import from CSV
    Given I have a CSV file with restaurant data
    When I select "Import from CSV"
    And I upload the file
    Then the app parses the data
    And shows a preview of restaurants to import
    And I can confirm or adjust before importing

  Scenario: Import from Google Maps
    Given I have saved places in Google Maps
    When I select "Import from Google Maps"
    And I authenticate with Google
    Then my saved places are imported as "Want to Try"
    And my visited places are imported as "Been There"

  Scenario: Import validation
    Given I'm importing a file with 100 restaurants
    When the app processes the file
    Then it matches restaurants to our database
    And creates new entries for unknowns
    And shows import success summary

  Scenario: Duplicate handling
    Given I import a restaurant I already saved
    When the import runs
    Then the app detects the duplicate
    And skips or merges the data intelligently
```

## Technical Implementation

### CSV Import
- Create import screen/modal
- File picker for CSV upload
- CSV parser (use papaparse or csv-parse)
- Expected columns: name, address, city, state, notes, category, visited (bool)
- Validation and error handling
- Preview table before confirm

### Google Maps Integration
- OAuth with Google
- Use Google Maps Places API saved places endpoint
- Map saved places → want_to_try
- Map visited places → been_there
- Import reviews as notes

### Apple Maps Integration
- Research Apple Maps export options
- May need manual CSV export from user

### Import Service
```typescript
interface ImportRow {
  name: string;
  address: string;
  city?: string;
  state?: string;
  notes?: string;
  category?: string;
  visited?: boolean;
  rating?: number;
}

async function importRestaurants(rows: ImportRow[], userId: string) {
  for (const row of rows) {
    // 1. Try to match existing restaurant by name + address
    const existing = await findRestaurant(row.name, row.address);

    // 2. If not found, create new restaurant
    const restaurantId = existing?.id || await createRestaurant(row);

    // 3. Check if user already saved this restaurant
    const alreadySaved = await checkIfSaved(userId, restaurantId);
    if (alreadySaved) continue;

    // 4. Create save with context
    await createSave({
      userId,
      restaurantId,
      saveType: row.visited ? 'been_there' : 'want_to_try',
      notes: row.notes,
      rating: row.rating,
    });
  }

  return { imported: rows.length, skipped: skippedCount };
}
```

### UI Components
- Import wizard (3 steps):
  1. Select source (CSV, Google, Apple)
  2. Review/preview data
  3. Confirm and import
- Progress indicator during import
- Success summary screen
- Error handling for failed matches

## Definition of Done
- [ ] CSV import working
- [ ] Google Maps import working
- [ ] Apple Maps strategy documented (even if manual)
- [ ] Duplicate detection prevents double-saves
- [ ] Restaurant matching algorithm accurate
- [ ] Progress indicator during import
- [ ] Success/error messaging clear
- [ ] Import analytics tracked
- [ ] Tested with large files (1000+ rows)
- [ ] Performance optimized (batch inserts)

## Notes
From feedback: "Data import functionality to allow users to upload existing restaurant lists and travel history"

This is a power feature that significantly improves onboarding for engaged users. Consider making it part of initial onboarding flow.
