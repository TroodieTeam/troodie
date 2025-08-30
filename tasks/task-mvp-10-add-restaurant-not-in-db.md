# Streamline Add Restaurant Flow (Not in Database)

- Epic: MVP
- Priority: Critical
- Estimate: 1.5 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
The current flow for adding a restaurant not in the database requires users to type the restaurant name twice and navigate through multiple screens. This should be streamlined to a single, efficient flow.

## Business Value
Reducing friction in adding restaurants increases user-generated content and improves user satisfaction. The current 7-step process causes frustration and abandonment.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Efficient restaurant addition for new venues
  As a user wanting to save a new restaurant
  I want a simple one-time entry process
  So that I can quickly add it to my profile

  Scenario: Adding restaurant not in database
    Given I search for a restaurant not in our database
    When I select "Add to database"
    Then the restaurant should be:
      - Added to the main database
      - Automatically saved to my profile
      - Confirmed with a toast message
    And I should return to the explore screen
    And I should NOT need to search again

  Scenario: Proposed flow
    Given I'm on the Add screen
    When I type a restaurant name and it's not found
    Then I should see:
      1. Search results with "Not found? Add it"
      2. Add form with pre-filled name
      3. Fill additional details
      4. Single "Save" button
      5. Toast confirmation
      6. Return to previous screen
```

## Technical Implementation
Current problematic flow:
1. Type restaurant name
2. Select from list
3. Add to database
4. See confirmation
5. Open explore screen
6. Type restaurant name AGAIN
7. Click on restaurant
8. Save to profile

New streamlined flow:
1. Type restaurant name
2. "Not found? Add it" option
3. Fill details (name pre-populated)
4. Single action: adds to DB + saves to profile
5. Toast confirmation
6. Back to explore/previous screen

Implementation steps:
- Modify add restaurant UI to combine actions
- Create single API endpoint for add + save
- Pre-populate restaurant name in form
- Add to user's saved list automatically
- Implement proper loading states
- Add rollback on failure

## Definition of Done
- [ ] Single flow for adding new restaurants
- [ ] No need to type restaurant name twice
- [ ] Restaurant saves to profile automatically
- [ ] Clear confirmation via toast
- [ ] Proper error handling
- [ ] Loading states during save
- [ ] Works from all entry points
- [ ] User testing confirms improvement

## Notes
- This is a critical UX improvement
- Consider adding "Save and Review" option
- Track completion rates before/after change

## Implementation Status
✅ **Implemented on 8/30/2025**
- Modified `components/AddRestaurantModal.tsx` to handle both new and existing restaurants
- New restaurants automatically save to user profile after creation
- Existing restaurants (duplicates) save to profile instead of showing error
- Added `handleExistingRestaurant()` function for duplicate handling
- Toast notifications provide clear feedback
- Single streamlined flow eliminates double entry

## Manual Test Cases

### Test Case 1: Add New Restaurant Not in Database
```gherkin
Feature: Add new restaurant efficiently
  As a user discovering a new restaurant
  I want to add it once and have it saved
  So that I don't need to search twice

  Scenario: Successfully add new restaurant
    Given I tap "Add Restaurant" from the Add tab
    When I search for "Mom's Kitchen" (not in database)
    And I select it from Google Places results
    And I tap "Add Restaurant"
    Then I should see "Restaurant added and saved to your profile!" toast
    And the modal should close after 1.5 seconds
    And the restaurant should be in the database
    And it should be saved to my profile automatically
    And I should NOT need to search for it again

  Scenario: Verify restaurant is saved
    Given I just added a new restaurant
    When I go to my profile
    Then I should see the restaurant in "Your Saves"
    And it should have complete information
    And I can view its detail page
```

### Test Case 2: Add Restaurant That Already Exists
```gherkin
Feature: Handle existing restaurants gracefully
  As a user trying to add an existing restaurant
  I want it to save to my profile automatically
  So that I achieve my goal without errors

  Scenario: Restaurant already in database
    Given I tap "Add Restaurant"
    When I search for "Chipotle" (already exists)
    And I select it from Google Places
    And I tap "Add Restaurant"
    Then I should see "Restaurant saved to your profile!" toast
    And I should NOT see "already exists" error
    And the modal should close
    And the restaurant should be in my saves

  Scenario: Duplicate handling with details
    Given a restaurant exists with Google Place ID
    When I try to add it again via Google Places
    Then the system should:
      - Detect it's a duplicate by place_id
      - Find the existing restaurant
      - Save it to my profile
      - Show success toast
      - NOT create a duplicate entry
```

### Test Case 3: Search Flow Experience
```gherkin
Feature: Smooth search experience
  As a user searching for restaurants
  I want intelligent search behavior
  So that I find what I need quickly

  Scenario: Initial search
    Given I open Add Restaurant modal
    When I type "Star" in search
    Then I should see Google Places autocomplete results
    And results should update as I type
    And each result shows name and address

  Scenario: Pre-populated search
    Given I searched for a restaurant in explore
    When it's not found and I tap "Add Restaurant"
    Then the search field should be pre-filled
    And search should execute automatically
    And I can modify the search if needed
```

### Test Case 4: Error Handling
```gherkin
Feature: Graceful error handling
  As a user experiencing issues
  I want helpful feedback
  So that I can resolve problems

  Scenario: Network error
    Given I have no internet connection
    When I try to add a restaurant
    Then I should see "Network error. Please check your connection."
    And the modal should remain open
    And I can retry when connected

  Scenario: Authentication required
    Given I am not logged in
    When I try to add a restaurant
    Then I should see "Please log in to add restaurants."
    And I should be prompted to log in
    And after login, I can continue

  Scenario: Server error
    Given the server is having issues
    When I try to add a restaurant
    Then I should see "Unable to add restaurant at this time. Please try again later."
    And the modal remains open
    And I can close or retry
```

### Test Case 5: One-Step Flow Validation
```gherkin
Feature: Single-step addition process
  As a user adding restaurants
  I want one simple process
  So that it's quick and easy

  Scenario: Complete flow for new restaurant
    Given I want to add "Local Bistro" (new)
    When I complete the flow
    Then the steps should be:
      1. Open Add Restaurant modal
      2. Search "Local Bistro"
      3. Select from results
      4. Tap "Add Restaurant"
      5. See success toast
      6. Modal closes
    And total steps: 6 (not 7+ like before)

  Scenario: Complete flow for existing restaurant
    Given I want to add "McDonald's" (exists)
    When I complete the flow
    Then the steps should be:
      1. Open Add Restaurant modal
      2. Search "McDonald's"
      3. Select from results
      4. Tap "Add Restaurant"
      5. See saved toast
      6. Modal closes
    And total steps: 6 (consistent with new)
```

### Test Case 6: Data Integrity
```gherkin
Feature: Maintain data quality
  As a system maintaining restaurant data
  I want to prevent duplicates and ensure quality
  So that the database remains clean

  Scenario: Prevent duplicate entries
    Given "Pizza Place" exists with place_id "ABC123"
    When another user tries to add place_id "ABC123"
    Then no new restaurant record is created
    And the existing record is used
    And it's saved to the new user's profile

  Scenario: Complete restaurant data
    Given I add a new restaurant from Google Places
    When it's saved to the database
    Then it should include:
      | Field           | Source         |
      | name            | Google Places  |
      | address         | Google Places  |
      | phone           | Google Places  |
      | hours           | Google Places  |
      | price_level     | Google Places  |
      | cuisine_types   | Google Places  |
      | coordinates     | Google Places  |
      | google_place_id | Google Places  |
```

### Test Case 7: User Saves Verification
```gherkin
Feature: Automatic profile saves
  As a user adding restaurants
  I want them saved to my profile
  So that I can access them later

  Scenario: New restaurant in saves
    Given I successfully added a new restaurant
    When I check my saves immediately
    Then the restaurant appears in "Your Saves"
    And it shows in my profile
    And save count increases by 1

  Scenario: Existing restaurant in saves
    Given I added an existing restaurant
    When I check my saves
    Then it appears just like any saved restaurant
    And I can unsave if desired
    And it's indistinguishable from manually saved
```

### Test Verification Steps
1. **Add a completely new restaurant** and verify it saves
2. **Add an existing restaurant** and verify no error
3. **Check "Your Saves"** immediately after adding
4. **Test with poor network** connection
5. **Verify no duplicate** database entries
6. **Count the steps** in the flow (should be ≤6)
7. **Test the back button** behavior in modal
8. **Check toast messages** for clarity

### Expected Results
- ✅ New restaurants add and save in one action
- ✅ Existing restaurants save without error
- ✅ No "already exists" error messages
- ✅ Single flow for both scenarios
- ✅ Maximum 6 steps to complete
- ✅ Clear success feedback via toasts
- ✅ Restaurants appear in user's saves
- ✅ No duplicate database entries
- ✅ Complete restaurant data from Google Places