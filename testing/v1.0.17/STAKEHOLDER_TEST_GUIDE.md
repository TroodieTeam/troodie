# v1.0.17 Stakeholder Test Guide

> Build: v1.0.17.b1 (TestFlight)
> Date: 2026-02-23
> Features: Restaurant Onboarding UX Fixes, Claim Approval Refresh, Hide Communities for Business, Multi-Restaurant Claims

---

## Test Accounts

| Account | Email | OTP | Type | Use For |
|---------|-------|-----|------|---------|
| Consumer 1 | `prod-consumer1@bypass.com` | `000000` | Consumer | Claim flow, creator onboarding, community visibility |
| Consumer 2 | `prod-consumer2@bypass.com` | `000000` | Consumer | Account upgrade testing |
| Business 1 | `prod-business1@bypass.com` | `000000` | Business | Business Tools, hidden communities, dashboard |
| Business 2 | `prod-business2@bypass.com` | `000000` | Business | Dashboard, multi-restaurant claims |

**Login steps**: Open app > "Already have an account?" > Enter email > Enter OTP `000000`

---

## Feature 1: Restaurant Onboarding UX Fixes (TRO-160, 161, 163, 169)

**What changed**: The beta passcode gate (`TROODIE2025`) has been removed from both the "Claim Your Restaurant" and "Become a Creator" flows. Business users no longer see growth/claim items on the More tab — they see "Business Tools" instead. Consumers with a pending claim see "Claim Status" instead of being prompted to restart the claim flow.

### Scenario 1.1: Claim flow starts directly — no beta gate

```gherkin
Feature: Beta Gate Removed from Claim Flow
  As a consumer
  I want to claim a restaurant without entering a passcode
  So that onboarding is frictionless

  Background:
    Given I am logged in as "prod-consumer1@bypass.com"

  Scenario: Claim flow skips beta access screen
    When I navigate to the More tab
    And I tap "Claim Your Restaurant"
    Then I should see the "Find Your Restaurant" search screen
    And I should NOT see a "Beta Access" screen
    And I should NOT see an "Enter Beta Passcode" prompt
    And I should NOT see "TROODIE2025" anywhere
```

### Scenario 1.2: Creator onboarding starts directly — no beta gate

```gherkin
Feature: Beta Gate Removed from Creator Onboarding
  As a consumer who wants to become a creator
  I want to start the application without entering a passcode

  Background:
    Given I am logged in as "prod-consumer1@bypass.com"

  Scenario: Creator onboarding skips beta access screen
    When I navigate to the More tab
    And I scroll down to "Become a Creator"
    And I tap "Become a Creator"
    Then I should see the creator application form
    And I should NOT see a "Beta Access" screen
    And I should NOT see an invite code prompt
```

### Scenario 1.3: Business user sees Business Tools, not growth items

```gherkin
Feature: Business More Tab Shows Business Tools
  As a business account owner
  I should see my business management tools on the More tab
  And I should not be prompted to claim a restaurant again

  Background:
    Given I am logged in as "prod-business1@bypass.com"

  Scenario: More tab shows Business Tools section
    When I navigate to the More tab
    Then I should see a "Business Tools" section header
    And I should see "Business Dashboard" with my restaurant name
    And I should see "Manage Campaigns"
    And I should see "Discover Creators"
    And I should see "Campaign Analytics"
    And I should see "Restaurant Analytics"
    And I should see "Restaurant Settings"
    And I should NOT see "Claim Your Restaurant"
    And I should NOT see "Grow with Troodie"
    And I should NOT see "Become a Creator"
```

### Scenario 1.4: Consumer with pending claim sees "Claim Status"

```gherkin
Feature: Pending Claim Shows Status Instead of Restart
  As a consumer who already submitted a restaurant claim
  I should see my claim status instead of being prompted to claim again

  Background:
    Given I am logged in as a consumer with a pending restaurant claim

  Scenario: More tab shows claim status
    When I navigate to the More tab
    Then I should see "Claim Status" in the Grow with Troodie section
    And the subtitle should show my restaurant name with "under review"
    And I should NOT see "Claim Your Restaurant"
    And I should NOT see "Become a Creator"
    When I tap "Claim Status"
    Then I should see the claim submitted confirmation screen
```

---

## Feature 2: Claim Approval Refresh (TRO-162)

**What changed**: When a restaurant claim is approved on the admin side, the app now reflects the updated account type in real time via Supabase realtime subscription — or on the next app foreground event. Previously, owners had to log out and log back in to see their approval reflected.

### Scenario 2.1: Real-time approval reflects without logout

```gherkin
Feature: Realtime Claim Approval
  As a restaurant owner whose claim was just approved
  I want to see my Business Dashboard without logging out
  So that the approval experience is seamless

  Background:
    Given I am logged in as a consumer with a pending claim on Device A
    And an admin is ready to approve the claim on Device B or the admin panel

  Scenario: Approval updates app in real time
    When the admin approves my restaurant claim
    Then within a few seconds my app should update
    And the More tab should now show "Business Tools" instead of "Claim Status"
    And I should NOT need to log out and log back in
```

### Scenario 2.2: App foreground triggers refresh

```gherkin
Feature: AppState Foreground Refresh
  As a restaurant owner
  I want the app to check for approval status when I reopen it
  So that I don't miss updates even if realtime is delayed

  Background:
    Given I am logged in as a consumer with a pending claim

  Scenario: Background and foreground triggers account refresh
    When I send the app to the background (press Home)
    And the admin approves my claim while the app is backgrounded
    And I bring the app back to the foreground
    Then my account info should refresh within 30 seconds
    And the More tab should reflect my business account status
```

### Scenario 2.3: Refresh throttle prevents excessive calls

```gherkin
Feature: Refresh Throttle
  As a user
  The app should not refresh my account on every foreground event
  To avoid unnecessary API calls

  Background:
    Given I am logged in as any account

  Scenario: Quick background/foreground does not trigger refresh
    When I send the app to background and return within 30 seconds
    Then no account refresh should be triggered

  Scenario: Refresh triggers after 30-second window
    When I send the app to background
    And I wait more than 30 seconds
    And I bring the app back to foreground
    Then an account refresh should be triggered
```

---

## Feature 3: Hide Communities for Business (TRO-168)

**What changed**: Business accounts no longer see community-related features. "Join Community" is hidden on the Home screen, "Create a Community" is hidden on the Add screen, and the "communities" tab is hidden on the Explore screen. Consumer accounts still see everything as before.

### Scenario 3.1: Business user — no communities on Home

```gherkin
Feature: Communities Hidden on Home for Business
  As a business account owner
  I should not see community features on the Home screen
  Because communities are for consumer/creator engagement

  Background:
    Given I am logged in as "prod-business1@bypass.com"

  Scenario: Home screen hides community actions
    When I navigate to the Home tab
    Then I should NOT see "Join Community" in the Build Your Network section
    And the network building steps should show only 2 items (Create Board, Create Post)
    And the network building steps should NOT show 3 items
```

### Scenario 3.2: Business user — no communities on Add screen

```gherkin
Feature: Communities Hidden on Add for Business
  Background:
    Given I am logged in as "prod-business1@bypass.com"

  Scenario: Add screen hides Create a Community
    When I navigate to the Add tab (+ button)
    Then I should see "Create Post"
    And I should see "Add Restaurant"
    And I should see "Create Board"
    And I should NOT see "Create a Community"
```

### Scenario 3.3: Business user — no communities tab on Explore

```gherkin
Feature: Communities Hidden on Explore for Business
  Background:
    Given I am logged in as "prod-business1@bypass.com"

  Scenario: Explore screen hides communities tab
    When I navigate to the Explore tab
    Then I should see a "restaurants" tab
    And I should see a "posts" tab
    And I should NOT see a "communities" tab
```

### Scenario 3.4: Consumer still sees all community features

```gherkin
Feature: Communities Visible for Consumer (Counter-Test)
  As a consumer
  I should still see all community features
  Because communities are designed for consumer engagement

  Background:
    Given I am logged in as "prod-consumer1@bypass.com"

  Scenario: Consumer sees communities everywhere
    When I navigate to the Explore tab
    Then I should see a "communities" tab
    When I navigate to the Add tab
    Then I should see "Create a Community"
```

---

## Feature 4: Multi-Restaurant Claims (TRO-170)

**What changed**: Business owners can now claim and manage multiple restaurant locations from a single account. The Business Dashboard includes a "Claim Location" quick action, and a restaurant switcher appears when multiple locations are claimed. Previously, owners needed separate accounts for each location.

### Scenario 4.1: "Claim Location" appears in Dashboard Quick Actions

```gherkin
Feature: Claim Location Quick Action
  As a business owner with a verified restaurant
  I want to claim additional locations from my dashboard
  So that I can manage multiple restaurants from one account

  Background:
    Given I am logged in as "prod-business1@bypass.com"

  Scenario: Dashboard shows Claim Location action
    When I navigate to the More tab
    And I tap "Business Dashboard"
    Then I should see a "Quick Actions" section
    And I should see a "Claim Location" card with subtitle "Add restaurant"
    And the card should have a map pin icon
```

### Scenario 4.2: Claiming a second restaurant

```gherkin
Feature: Claim Additional Restaurant
  As a business owner
  I want to claim a second restaurant location

  Background:
    Given I am logged in as "prod-business1@bypass.com"
    And I am on the Business Dashboard

  Scenario: Claim Location opens the claim flow without beta gate
    When I tap "Claim Location"
    Then I should see the "Find Your Restaurant" search screen
    And I should NOT see a "Beta Access" screen
    And I should NOT see a passcode prompt
    When I search for a restaurant
    And I select a result
    Then I should see the claim submission form
```

### Scenario 4.3: Restaurant Switcher with multiple locations

```gherkin
Feature: Restaurant Switcher
  As a business owner with 2+ verified restaurants
  I want to switch between my locations in the dashboard
  So that I can manage each restaurant independently

  Background:
    Given I am logged in as a business owner with 2+ verified restaurants

  Scenario: Switcher appears and works
    When I open the Business Dashboard
    Then I should see a RestaurantSwitcher at the top
    And it should show my current restaurant name
    When I tap the switcher
    And I select my second restaurant
    Then the dashboard data should update to show the second restaurant's name
    And the campaigns list should show only the second restaurant's campaigns
```

### Scenario 4.4: Duplicate claim is rejected

```gherkin
Feature: Duplicate Claim Prevention
  As a business owner
  I should not be able to claim the same restaurant twice

  Background:
    Given I am logged in as a business owner
    And I have already claimed "Restaurant A"

  Scenario: Attempting to claim the same restaurant again
    When I try to submit a claim for "Restaurant A" again
    Then I should see an error indicating the restaurant is already claimed
    And no duplicate business profile should be created
```

### Scenario 4.5: Maximum 10 claims enforced

```gherkin
Feature: Claim Limit
  As a business owner
  I should not be able to claim more than 10 restaurants
  To prevent abuse of the system

  Scenario: 11th claim is rejected
    Given I am a business owner with 10 existing claims
    When I try to submit an 11th claim
    Then I should see an error "Maximum of 10 restaurant claims per user reached"
```

### Scenario 4.6: Dashboard accessible without beta gate

```gherkin
Feature: Dashboard No Beta Gate
  As a business owner
  I should be able to access my dashboard directly

  Background:
    Given I am logged in as "prod-business2@bypass.com"

  Scenario: Dashboard loads without beta gate
    When I navigate to the More tab
    And I tap "Business Dashboard"
    Then the dashboard should load
    And I should NOT see "Beta Access"
    And I should NOT see "Enter Beta Passcode"
```

---

## Quick Smoke Test Checklist

For a fast pass through all four features:

| # | Action | Account | Expected | Pass? |
|---|--------|---------|----------|-------|
| 1 | More tab > "Claim Your Restaurant" | `prod-consumer1@bypass.com` | Goes straight to restaurant search — no passcode | |
| 2 | Go back > "Become a Creator" | `prod-consumer1@bypass.com` | Goes straight to creator application — no passcode | |
| 3 | More tab | `prod-business1@bypass.com` | Shows "Business Tools" section, no "Claim Your Restaurant" | |
| 4 | Home tab | `prod-business1@bypass.com` | No "Join Community" in Build Your Network | |
| 5 | Explore tab | `prod-business1@bypass.com` | No "communities" tab — only "restaurants" and "posts" | |
| 6 | Add tab (+) | `prod-business1@bypass.com` | No "Create a Community" option | |
| 7 | Explore tab | `prod-consumer1@bypass.com` | "communities" tab IS visible | |
| 8 | Add tab (+) | `prod-consumer1@bypass.com` | "Create a Community" IS visible | |
| 9 | More tab > "Business Dashboard" | `prod-business2@bypass.com` | Dashboard loads, no beta gate blocking | |

---

## Known Limitations

- **TRO-162 (Realtime refresh)**: Cannot be tested via automated E2E — requires two devices or sessions (one for the user, one for admin approval). Test manually with the Supabase dashboard.
- **TRO-170 (Dashboard Quick Actions)**: "Claim Location" and "Quick Actions" only appear when the business account has restaurant data loaded. Test accounts `prod-business1` and `prod-business2` may show an empty dashboard state ("Welcome to Dashboard") if they don't have linked restaurant data.
- **Restaurant Switcher**: Only visible when a business owner has 2+ verified restaurants. Most test accounts have 0-1, so this requires manual setup or admin-side claim approval.
- **Max 10 claims**: Hard to test end-to-end without creating 10 claims first. Verified via database trigger — the constraint is enforced at the database level.

## Reporting Issues

When reporting a bug, please include:
1. Which account you were using (email)
2. Which screen you were on
3. What you tapped / what happened
4. Screenshot if possible
