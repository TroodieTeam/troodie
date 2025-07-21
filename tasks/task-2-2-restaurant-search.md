# Task 2.2: Restaurant Search & Discovery Integration

## Epic: Restaurant Data Management System
- **Priority**: High
- **Estimate**: 5 days
- **Status**: 🔴 Not Started
- **Depends on**: Task 2.1 (Charlotte Restaurant Seeding)

## Overview
Replace all mock restaurant data throughout the app with live data from Supabase, ensuring consistent restaurant search, display, and selection across all features during the beta period.

## Business Value
- Ensures data consistency across the app
- Enables real restaurant discovery for beta users
- Prevents confusion with mock data
- Sets foundation for future restaurant data management

## Dependencies
- Task 2.1: Charlotte Restaurant Seeding must be completed
- Supabase database with populated restaurant data
- Restaurant search function in Supabase

## Blocks
- Task 3.1: Restaurant Save Functionality
- Task 6.1: Restaurant Detail Screen
- Any feature requiring restaurant selection

## Acceptance Criteria

```gherkin
Feature: Live Restaurant Data Integration
  As a beta user
  I want to see and interact with real Charlotte restaurants
  So that I can use the app with actual local data

  Scenario: Searching Restaurants
    Given I am on any restaurant search screen
    When I enter a search term
    Then I should only see results from our Supabase database
    And each result should display accurate restaurant information

  Scenario: Adding a Restaurant Not in Database
    Given I am on the add restaurant screen
    When I try to add a restaurant
    Then I should only be able to select from existing restaurants in the database
    And I should see a friendly message about beta limitations

  Scenario: Restaurant Selection in Features
    Given I am using any feature that involves restaurants
    When I need to select or reference a restaurant
    Then I should only see options from our curated database
    And the data should be consistent across all screens

  Scenario: Restaurant Data Display
    Given I am viewing a restaurant anywhere in the app
    When I look at the restaurant details
    Then I should see live data from Supabase
    And the information should be consistent everywhere this restaurant appears
```

## Technical Implementation

### 1. Create Restaurant Service Layer
```typescript
// services/restaurantService.ts
export class RestaurantService {
  async searchRestaurants(query: string): Promise<Restaurant[]> {
    return supabase
      .from('restaurants')
      .select('*')
      .textSearch('name', query)
      .limit(20);
  }

  async getRestaurantById(id: string): Promise<Restaurant> {
    return supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();
  }

  async getRestaurantsByLocation(lat: number, lng: number): Promise<Restaurant[]> {
    // Implement location-based search using Supabase's PostGIS
  }
}
```

### 2. Replace Mock Data Points
- Update ExploreScreen restaurant data source
- Update SaveRestaurantScreen selection source
- Update RestaurantDetailScreen data fetching
- Update search functionality in all relevant screens

### 3. Beta Limitation Handling
```typescript
// components/BetaRestaurantNotice.tsx
export const BetaRestaurantNotice = () => (
  <View style={styles.notice}>
    <Text style={styles.title}>🚀 Beta Testing Period</Text>
    <Text style={styles.description}>
      During beta, you can save restaurants from our curated database of Charlotte's best spots.
      New restaurant submissions will be available soon!
    </Text>
  </View>
);
```

### 4. Data Consistency
- Implement caching layer for frequently accessed restaurants
- Set up real-time subscriptions for restaurant updates
- Create shared restaurant card component using live data

## Definition of Done
- [ ] All mock restaurant data replaced with Supabase integration
- [ ] Restaurant search implemented using Supabase full-text search
- [ ] Beta limitation notices added to relevant screens
- [ ] Restaurant data consistent across all app features
- [ ] Caching implemented for performance
- [ ] Error handling for network issues
- [ ] Loading states for data fetching
- [ ] Unit tests for restaurant service
- [ ] Integration tests for restaurant features
- [ ] Documentation updated
- [ ] Performance tested with real data
- [ ] Code reviewed and approved

## Resources
- [Supabase Full Text Search Documentation](https://supabase.com/docs/guides/database/full-text-search)
- [PostGIS with Supabase Guide](https://supabase.com/docs/guides/database/extensions/postgis)
- [Restaurant Schema](../supabase/migrations/001_initial_schema.sql)
- [Restaurant Seeding Data](../scripts/charlotte-restaurants.json)

## Notes
- Consider implementing fuzzy search for better user experience
- Monitor API usage and implement rate limiting if needed
- Consider adding restaurant data versioning for future updates
- Document any restaurant data discrepancies found during implementation 