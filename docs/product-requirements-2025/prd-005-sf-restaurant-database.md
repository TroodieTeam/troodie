# PRD-005: San Francisco Restaurant Database Population

## Problem Statement
Need to populate database with San Francisco restaurants for demo/pitch purposes to showcase app functionality with real, relevant data.

## Priority
**Critical** - MVP Pre-pitch (By 9/3)

## Current State
- Limited restaurant data in database
- Need comprehensive SF coverage for demo
- Missing diverse cuisine types and price ranges
- No neighborhood representation

## Assumptions
1. Will use Google Places API for data collection
2. Need minimum 500 restaurants for good demo
3. Should cover popular neighborhoods
4. Include mix of restaurant types
5. Photos and details are important

## Questions for Founder
1. How many restaurants needed (minimum/ideal)?
2. Which SF neighborhoods to prioritize?
3. Any specific restaurant categories to focus on?
4. Should we include chain restaurants?
5. Do we need verified/claimed restaurants for demo?
6. Any specific restaurants that must be included?

## Proposed Solution
1. Automated import via Google Places API
2. Curated list of top restaurants per neighborhood
3. Diverse mix of cuisines and price points
4. Include photos and complete information
5. Add some pre-populated reviews/saves for demo

## Data Requirements

```yaml
Restaurant Data Structure:
  - name: Required
  - address: Required
  - coordinates: Required (lat/lng)
  - cuisine_types: Required (array)
  - price_range: Required ($, $$, $$$, $$$$)
  - phone: Optional
  - website: Optional
  - hours: Required
  - photos: Required (min 3)
  - google_rating: Optional
  - google_reviews_count: Optional

Neighborhoods to Cover:
  - Mission District (100+ restaurants)
  - SOMA (80+ restaurants)
  - Marina (60+ restaurants)
  - Castro (50+ restaurants)
  - Financial District (70+ restaurants)
  - North Beach (60+ restaurants)
  - Chinatown (40+ restaurants)
  - Hayes Valley (40+ restaurants)

Cuisine Distribution:
  - American: 15%
  - Italian: 10%
  - Asian Fusion: 10%
  - Mexican: 10%
  - Chinese: 8%
  - Japanese: 8%
  - Thai: 5%
  - Indian: 5%
  - Mediterranean: 5%
  - Brunch/Breakfast: 10%
  - Coffee/Cafe: 8%
  - Other: 6%
```

## Acceptance Criteria (Gherkin)

```gherkin
Feature: SF Restaurant Data Population
  As a product team
  I want SF restaurants in the database
  So that we can demo the app effectively

  Scenario: Restaurant data import
    Given I have configured the Google Places API
    When I run the SF restaurant import script
    Then at least 500 SF restaurants are added to the database
    And each restaurant has complete required fields
    And no duplicate restaurants are created
    And import completes within 5 minutes

  Scenario: Neighborhood coverage
    Given the import is complete
    When I query restaurants by neighborhood
    Then each target neighborhood has at least 40 restaurants
    And restaurants are accurately geocoded
    And neighborhood boundaries are respected

  Scenario: Data quality validation
    Given restaurants have been imported
    When I review the data
    Then every restaurant has:
      | Field | Validation |
      | Name | Not empty, properly capitalized |
      | Address | Valid SF address format |
      | Photos | At least 3 high-quality images |
      | Hours | Properly formatted operating hours |
      | Cuisine | At least one cuisine type |
      | Price | Valid price range indicator |

  Scenario: Cuisine diversity
    Given the import is complete
    When I analyze cuisine distribution
    Then I see at least 15 different cuisine types
    And no single cuisine exceeds 20% of total
    And popular cuisines are well represented

  Scenario: Demo data enhancement
    Given restaurants are imported
    When I run the demo data script
    Then 20% of restaurants have sample reviews
    And 30% have been "saved" by demo users
    And 10% have creator content
    And popular restaurants have more activity

  Scenario: Search functionality
    Given restaurants are in the database
    When I search for restaurants
    Then search returns relevant results quickly
    And filters work correctly (cuisine, price, rating)
    And location-based search is accurate
```

## Technical Implementation

### Import Script Structure
```javascript
class SFRestaurantImporter {
  async importRestaurants() {
    // 1. Define neighborhood boundaries
    const neighborhoods = this.defineNeighborhoods();

    // 2. For each neighborhood
    for (const neighborhood of neighborhoods) {
      // 3. Search via Google Places
      const restaurants = await this.searchGooglePlaces(neighborhood);

      // 4. Get detailed information
      for (const restaurant of restaurants) {
        const details = await this.getPlaceDetails(restaurant.place_id);

        // 5. Download and store photos
        const photos = await this.downloadPhotos(details.photos);

        // 6. Save to database
        await this.saveToDatabase(details, photos);
      }
    }

    // 7. Add demo engagement data
    await this.addDemoData();
  }
}
```

### Data Validation Rules
- No duplicate Google Place IDs
- Valid US phone number format
- Price range between $ and $$$$
- At least one cuisine type
- Coordinates within SF boundaries
- Photos minimum 400x300 pixels

## Success Metrics
- 500+ restaurants successfully imported
- All major SF neighborhoods represented
- 95% data completeness rate
- Import process takes < 5 minutes
- Zero duplicate entries
- Demo feedback positive on data quality

## Testing Requirements
1. Validate data completeness
2. Check for duplicates
3. Verify photo quality and loading
4. Test search and filter functionality
5. Confirm neighborhood accuracy
6. Load test with full dataset

## Import Priorities
1. **Must Have**: Mission, SOMA, Marina, Financial District
2. **Should Have**: Castro, North Beach, Hayes Valley
3. **Nice to Have**: Sunset, Richmond, Nob Hill
4. **Future**: Outer neighborhoods

## Demo Scenarios to Support
- User searching for "brunch near me"
- Filtering by cuisine type
- Price range filtering
- Saving restaurants to boards
- Viewing restaurant details
- Reading reviews and ratings

## Risk Mitigation
- API rate limiting: Implement throttling
- Incomplete data: Have fallback defaults
- Photo quality: Set minimum standards
- Duplicates: Check before insert
- Cost overrun: Set API call limits

## Future Enhancements
- Add more cities for expansion
- Include restaurant events/specials
- Import user-generated content
- Add wait time estimates
- Include delivery/pickup options
- Add dietary restriction tags

## Notes
- Prioritize quality over quantity
- Focus on restaurants likely to partner
- Include Instagram-worthy spots
- Add some hidden gems for discovery
- Ensure diverse price points for all users

---
*PRD Version: 1.0*
*Created: 2025-01-13*
*Target Completion: 9/3 (Pre-pitch)*