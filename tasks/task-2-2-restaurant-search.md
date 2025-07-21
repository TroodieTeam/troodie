# Task 2.2: Restaurant Search & Discovery

## Epic: Restaurant Data Management System
- **Priority**: High
- **Estimate**: 5 days
- **Status**: 🟡 In Progress
- **Depends on**: Task 2.1 (Charlotte Restaurant Seeding)

## Overview
Integrate live restaurant data from Supabase throughout the app, replacing all mock data. Ensure all search, add, and selection flows use the live database. Some app logic is already implemented, but full integration, error handling, and polish are required.

## Business Value
- Real data powers all user-facing features
- Enables accurate search, saves, and recommendations
- Reduces confusion from mock/test data
- Foundation for future restaurant management

## Dependencies
- Task 2.1: Charlotte Restaurant Seeding (completed)
- Supabase database and API

## Blocks
- Task 3.1: Restaurant Save Functionality
- Task 6.1: Restaurant Detail Screen
- Any feature requiring restaurant selection/search

## Acceptance Criteria

```gherkin
Feature: Live Restaurant Data Integration
  As a user
  I want to search and select real restaurants
  So that my experience is based on actual data

  Scenario: Searching Restaurants
    Given I am on any restaurant search screen
    When I enter a search term
    Then I should only see results from Supabase
    And each result should display accurate info

  Scenario: Adding a Restaurant
    Given I am on the add restaurant screen
    When I try to add a restaurant
    Then I should only be able to select from existing restaurants in the database
    And I should see a friendly message about beta limitations

  Scenario: Restaurant Data Consistency
    Given I am using any feature that involves restaurants
    When I select or reference a restaurant
    Then I should only see options from the curated database
    And the data should be consistent across all screens

  Scenario: Restaurant Data Display
    Given I am viewing a restaurant anywhere in the app
    When I look at the restaurant details
    Then I should see live data from Supabase
    And the information should be consistent everywhere this restaurant appears

  Scenario: Error Handling
    Given there is a network or data error
    When I search or select a restaurant
    Then I should see a clear, user-friendly error message
```

## Technical Implementation

- Use Supabase queries for all restaurant search, add, and detail flows
- Remove all mock/static restaurant data from the app
- Implement error handling and loading states for all data fetches
- Add beta limitation messaging where users cannot add new restaurants
- Ensure all restaurant cards/components use live data
- Test all flows for consistency and edge cases
- Document any remaining gaps or future improvements

## Definition of Done
- [ ] All mock restaurant data replaced with Supabase integration
- [ ] Restaurant search implemented using Supabase full-text search
- [ ] Beta limitation notices added to relevant screens
- [ ] Restaurant data consistent across all app features
- [ ] Error handling for network issues
- [ ] Loading states for data fetching
- [ ] Unit tests for restaurant service
- [ ] Integration tests for restaurant features
- [ ] Documentation updated
- [ ] Code reviewed and approved

## Notes
- Some app logic is already implemented, but review and polish are needed
- Consider adding fuzzy search for better UX
- Monitor API usage and performance
- Plan for future restaurant data expansion 