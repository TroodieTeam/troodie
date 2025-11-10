# Investigate Google Places API Parameters for Missing Venues

- Epic: Database
- Priority: Medium
- Estimate: 1 day
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
User tried to add "The Stand" (a comedy venue + restaurant in NY) but it didn't show up. Need to investigate Google Places API parameters and types to ensure we're capturing all relevant venues.

## Business Value
Incomplete venue coverage creates frustration. Users lose trust when they can't find places they know exist. Expanding venue types increases app utility.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Comprehensive venue search
  As a user
  I want to find all types of dining/entertainment venues
  So that I can save any place I visit

  Scenario: Search for hybrid venue
    Given "The Stand" is both a comedy club and restaurant
    When I search for "The Stand"
    Then it appears in my search results
    And I can save it

  Scenario: Multi-category venues
    Given a venue has multiple categories (bar, restaurant, live music)
    When I search by name or location
    Then it appears in results
    And shows all relevant categories
```

## Technical Implementation

### Current Google Places API Setup Audit
Document current implementation:
- What place types are we querying?
- What fields are we requesting?
- Are we excluding any categories?
- Query parameters being used

### Google Places API Types Review
Potentially relevant place types to include:
```typescript
const relevantPlaceTypes = [
  // Current (likely)
  'restaurant',
  'cafe',
  'bar',

  // Should add
  'night_club',
  'bakery',
  'meal_takeaway',
  'meal_delivery',
  'food',

  // Hybrid venues (user's issue)
  'bar', // Often has food
  'night_club', // Many serve food

  // Special venues
  'tourist_attraction', // Some are restaurants
  'point_of_interest', // Catch-all
];
```

### Search Query Enhancement
```typescript
// Before
const searchVenues = async (query: string) => {
  const response = await googlePlaces.textSearch({
    query,
    type: 'restaurant', // Too restrictive!
  });
  return response.results;
};

// After
const searchVenues = async (query: string) => {
  const response = await googlePlaces.textSearch({
    query,
    type: 'restaurant|cafe|bar|night_club|bakery|food',
    // Or use no type filter and filter results ourselves
  });

  // Filter results to only include places that serve food
  return response.results.filter(place => {
    const hasFood = place.types.some(type =>
      foodRelatedTypes.includes(type)
    );
    const hasName = place.name.toLowerCase().includes(query.toLowerCase());
    return hasFood || hasName;
  });
};
```

### Specific Test Case: The Stand
```typescript
// Test search for "The Stand"
const testTheStand = async () => {
  const query = "The Stand comedy club New York";

  // Try different approaches
  const results1 = await searchByText(query, 'restaurant');
  const results2 = await searchByText(query, 'night_club');
  const results3 = await searchByText(query, null); // No type filter

  console.log('Restaurant type:', results1.length);
  console.log('Night club type:', results2.length);
  console.log('No filter:', results3.length);

  // Determine best approach
};
```

### Database Schema Enhancement
```sql
-- Add support for multiple venue types
ALTER TABLE restaurants ADD COLUMN venue_types TEXT[]; -- ['restaurant', 'bar', 'comedy_club']
ALTER TABLE restaurants ADD COLUMN primary_venue_type VARCHAR; -- Main category
ALTER TABLE restaurants ADD COLUMN serves_food BOOLEAN DEFAULT true;
```

### UI Updates
- Show venue type badges (Restaurant • Bar • Live Music)
- Filter by venue type in search
- Categories in venue detail page

### Fallback Search Strategy
If Google Places doesn't have it:
1. Allow manual venue creation with moderation
2. Integrate Yelp API as fallback
3. Integrate Foursquare/OpenStreetMap

## Definition of Done
- [ ] Current API parameters documented
- [ ] Place types expanded to include hybrid venues
- [ ] "The Stand" and similar venues findable
- [ ] Database schema updated for multiple types
- [ ] Search algorithm handles multi-category venues
- [ ] UI shows venue type badges
- [ ] Manual venue creation flow (if needed)
- [ ] Tested with various venue types:
  - [ ] Traditional restaurants
  - [ ] Bars with food
  - [ ] Comedy clubs with dining
  - [ ] Food halls
  - [ ] Bakeries
  - [ ] Cafes
- [ ] Performance impact assessed

## Notes
From feedback: "I tried to add a comedy place in NY that's both a comedy place and a restaurant, but it didn't show up called 'The Stand' - what are the parameters we're using within Google Places API?"

Test venues:
- The Stand (Comedy Club + Restaurant, NYC)
- City Winery (Music venue + Restaurant)
- Blue Note Jazz Club (Music + Dining)
- House of Blues locations (Music + Restaurant)
