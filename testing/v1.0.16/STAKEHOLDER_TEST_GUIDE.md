# v1.0.16 Stakeholder Test Guide

> Build: v1.0.16.b1 (TestFlight)
> Date: 2026-02-25 (updated)
> Features: Content Submission Flow, Payment Duplication Fix, Rate Creator Timing Fix

---

## Test Accounts

| Account | Email | OTP | Type | Campaigns | Use For |
|---------|-------|-----|------|-----------|---------|
| Business 2 | `prod-business2@bypass.com` | `000000` | Business | Spring Menu Launch, Weekend Brunch, Summer Patio (3 total) | Review deliverables, approve/reject content, rate creators |
| Business 3 | `prod-business3@bypass.com` | `000000` | Business | Sushi Special, Date Night, Happy Hour, + 7 more (10 total) | Payment duplication testing (3-deliverable approval flow) |
| Creator 1 | `prod-creator1@bypass.com` | `000000` | Creator | Spring Menu (Business 2), Sushi Special + Happy Hour (Business 3) | Upload content, submit proof links |
| Creator 2 | `prod-creator2@bypass.com` | `000000` | Creator | Chef Special (Business 3, completed) | View completed deliverables |
| Creator 5 | `prod-creator5@bypass.com` | `000000` | Creator | Weekend Brunch (Business 2, 1/2 approved) | Partial approval view |

> **Note**: `prod-business1@bypass.com` exists but has **0 campaigns** (intentionally a "new" business). Do not use it for campaign testing.

**Login steps**: Open app > "Already have an account?" > Enter email > Enter OTP `000000`

---

## Feature 1: Content Submission Flow Fix

**What changed**: Creators now upload content for restaurant review BEFORE posting to social platforms. Previously the flow was backwards — creators posted first, then submitted links. Now it's a two-step process: (1) Upload content for approval, (2) Submit proof links after approval.

### Scenario 1.1: Creator uploads content for review

```gherkin
Feature: Content Upload (Step 1)
  As a creator with an accepted campaign application
  I want to upload my content for the restaurant to review
  So that the restaurant can approve my work before I post publicly

  Background:
    Given I am logged in as "prod-creator1@bypass.com"
    And I have an accepted application on the "Spring Menu Launch" campaign (owned by Business 2)

  Scenario: Upload content for review
    When I navigate to the accepted campaign detail
    And I tap "Submit Deliverable"
    Then I should see a step indicator with "1. Upload Content" as active
    When I tap the file picker area
    And I select a video or photo from my device
    Then I should see a preview of the selected content
    When I add an optional caption
    And I tap "Submit for Review"
    Then I should see a success message "Content Uploaded"
    And the screen should show "Content Submitted - Awaiting Review"
```

### Scenario 1.2: Restaurant reviews and approves content

```gherkin
Feature: Content Review
  As a restaurant owner
  I want to review uploaded content before it goes live
  So that I can ensure quality and brand alignment

  Background:
    Given I am logged in as "prod-business2@bypass.com"
    And Creator 1 (Foodie Lens) has submitted content for the "Spring Menu Launch" campaign

  Scenario: Review and approve uploaded content
    When I navigate to "Spring Menu Launch" campaign
    And I go to "Review Deliverables"
    Then I should see the uploaded content inline (image visible or video placeholder)
    When I tap on the deliverable to open the review modal
    Then I should see the content in the modal
    When I tap "Approve"
    Then I should see a confirmation message
    And NO payment should be triggered yet
```

### Scenario 1.3: Creator submits proof links (Step 2)

```gherkin
Feature: Proof Link Submission (Step 2)
  As a creator whose content was approved
  I want to submit my social media post links
  So that the restaurant can verify I posted the content

  Background:
    Given I am logged in as "prod-creator1@bypass.com"
    And my content was approved by Business 2 on the "Spring Menu Launch" campaign

  Scenario: Submit proof links after approval
    When I navigate to the campaign
    And I tap "Submit Deliverable"
    Then I should see a step indicator with Step 2 as active
    And I should see a green "Content approved!" banner
    When I enter a valid Instagram, TikTok, or YouTube URL
    Then I should see a platform detection badge appear
    When I tap "Submit Proof Links"
    Then I should see a success message
```

### Scenario 1.4: Creator cannot submit proof before approval

```gherkin
Feature: Proof Blocked Before Approval
  As a creator with pending content review
  I should not be able to skip ahead to proof submission
  So that the restaurant reviews my work first

  Background:
    Given I am logged in as "prod-creator1@bypass.com"
    And my content is still "Awaiting Review" on the "Spring Menu Launch" campaign

  Scenario: Proof submission is blocked
    When I navigate to the campaign deliverable
    Then I should see "Content Submitted - Awaiting Review"
    And I should NOT see a proof link submission form
```

### Scenario 1.5: Restaurant rejects content with feedback

```gherkin
Feature: Content Rejection and Resubmission
  As a restaurant owner
  I want to reject content with feedback
  So that the creator can improve and resubmit

  Background:
    Given I am logged in as "prod-business2@bypass.com"
    And Creator 1 (Foodie Lens) has submitted content for review on "Spring Menu Launch"

  Scenario: Reject and request changes
    When I open the deliverable review modal
    And I tap "Reject" with feedback "Please reshoot with better lighting"
    Then the deliverable should show as rejected

  Scenario: Creator sees feedback and resubmits
    Given I am logged in as "prod-creator1@bypass.com"
    When I navigate to the rejected deliverable on "Spring Menu Launch"
    Then I should see the rejection feedback banner
    And I should be able to upload new content
```

---

## Feature 2: Payment Duplication Fix

**What changed**: Previously, approving deliverables could trigger multiple payouts for a single campaign application. Now, payout only triggers once — when ALL deliverables for an application are approved.

### Scenario 2.1: Payout triggers only when all deliverables are approved

```gherkin
Feature: Single Payout on Full Approval
  As a restaurant owner approving deliverables
  I want the payout to trigger only once when all deliverables are approved
  So that creators are paid correctly without overpayment

  Background:
    Given I am logged in as "prod-business3@bypass.com"
    And Creator 1 (Foodie Lens) has 3 pending deliverables on the "Sushi Special Feature" campaign

  Scenario: Approving deliverables one by one
    When I approve deliverable 1 of 3
    Then NO payout should be triggered
    And the log should indicate "Not all deliverables approved"
    When I approve deliverable 2 of 3
    Then NO payout should still be triggered
    When I approve deliverable 3 of 3
    Then exactly 1 payout should be triggered
```

### Scenario 2.2: Bulk approval triggers single payout

```gherkin
Feature: Bulk Approval Payout
  As a restaurant owner
  I want to bulk-approve deliverables and trigger only one payout

  Background:
    Given I am logged in as "prod-business3@bypass.com"
    And Creator 1 (Foodie Lens) has 3 pending deliverables on the "Sushi Special Feature" campaign

  Scenario: Bulk approve all deliverables
    When I bulk approve all 3 deliverables at once
    Then exactly 1 payout should be triggered
    And the payout amount should match the campaign payment
```

### Scenario 2.3: Partial rejection delays payout

```gherkin
Feature: Partial Rejection Handling
  As a restaurant owner
  I want to reject some deliverables without triggering payout
  So that payout only happens when everything is approved

  Background:
    Given I am logged in as "prod-business3@bypass.com"
    And Creator 1 (Foodie Lens) has 3 pending deliverables on the "Sushi Special Feature" campaign

  Scenario: Reject one, approve rest, payout after resubmission
    When I approve deliverable 1
    And I reject deliverable 2
    And I approve deliverable 3
    Then NO payout should be triggered
    When the creator resubmits deliverable 2
    And I approve the resubmitted deliverable 2
    Then exactly 1 payout should be triggered
```

---

## Feature 3: Rate Creator Timing Fix

**What changed**: The "Rate Creator" button used to appear immediately after accepting an application — before the creator had done any work. Now it only appears after ALL deliverables are reviewed and approved.

### Scenario 3.1: No rating button on fresh acceptance

```gherkin
Feature: Rate Creator Hidden Until Work Complete
  As a restaurant owner
  I should not see the Rate Creator button until all deliverables are approved
  So that I only rate creators based on completed work

  Background:
    Given I am logged in as "prod-business3@bypass.com"
    And Creator 1 (Foodie Lens) has an accepted application on "Sushi Special Feature"
    And all 3 deliverables are still pending review

  Scenario: Rate Creator is hidden on fresh acceptance
    When I navigate to the "Sushi Special Feature" campaign Applications tab
    Then I should see the application with status "Awaiting Content"
    And I should NOT see a "Rate Creator" button
```

### Scenario 3.2: Partial approval shows progress, no rating

```gherkin
Feature: Partial Approval Progress
  Background:
    Given I am logged in as "prod-business2@bypass.com"
    And Creator 5 (Food Reels Pro) has 2 deliverables on "Weekend Brunch Promotion"
    And 1 of 2 is approved

  Scenario: Progress shown but rating hidden
    When I navigate to the "Weekend Brunch Promotion" campaign Applications tab
    Then I should see "1/2 Deliverables Approved"
    And I should NOT see a "Rate Creator" button
```

### Scenario 3.3: All approved — rating button appears

```gherkin
Feature: Rating Available After Full Approval
  Background:
    Given I am logged in as "prod-business2@bypass.com"
    And Creator 6 (Local Foodie) has 2 deliverables on "Summer Patio Feature" (completed campaign)
    And both deliverables are approved

  Scenario: Rate Creator button becomes visible
    When I navigate to the "Summer Patio Feature" campaign Applications tab
    Then I should see a "Rate Creator" button with orange styling and star icon
    When I tap "Rate Creator"
    And I submit a rating of 4/5 with a comment
    Then the button should change to "Rated 4/5"
```

### Scenario 3.4: No rating buttons on individual deliverables

```gherkin
Feature: No Rating on Deliverable Cards
  As a restaurant owner viewing the Deliverables tab
  I should not see Rate Creator on individual deliverable cards
  Because rating happens at the application level

  Background:
    Given I am logged in as "prod-business2@bypass.com"

  Scenario: Deliverables tab has no rating buttons
    When I navigate to the "Spring Menu Launch" campaign Deliverables tab
    And I scroll through all deliverable cards
    Then I should NOT see any "Rate Creator" buttons
    And I should only see Approve/Reject actions for pending deliverables
```

---

## Quick Smoke Test Checklist

For a fast pass through all three features:

| # | Action | Account | Campaign | Expected | Pass? |
|---|--------|---------|----------|----------|-------|
| 1 | Log in as creator, go to More > My Deliverables, open "Spring Menu Launch" deliverable | `prod-creator1@bypass.com` | Spring Menu Launch | See deliverable detail with workflow steps | |
| 2 | Upload a photo/video, submit for review | `prod-creator1@bypass.com` | Spring Menu Launch | "Content Uploaded" success, status shows "Awaiting Review" | |
| 3 | Log in as business, go to More > Manage Campaigns > Spring Menu Launch > Deliverables | `prod-business2@bypass.com` | Spring Menu Launch | See uploaded content inline | |
| 4 | Approve the content | `prod-business2@bypass.com` | Spring Menu Launch | Approved, NO payment triggered | |
| 5 | Log in as creator, go to deliverable | `prod-creator1@bypass.com` | Spring Menu Launch | See Step 2 with "Content approved!" banner | |
| 6 | Submit proof link (Instagram/TikTok URL) | `prod-creator1@bypass.com` | Spring Menu Launch | Proof submitted successfully | |
| 7 | Log in as business, go to Sushi Special Feature > Applications tab | `prod-business3@bypass.com` | Sushi Special Feature | No "Rate Creator" button (0/3 approved) | |
| 8 | Go to Deliverables tab, approve ALL 3 deliverables one by one | `prod-business3@bypass.com` | Sushi Special Feature | Exactly 1 payout triggered on 3rd approval, "Rate Creator" button appears | |
| 9 | Go to Applications tab, tap "Rate Creator", submit 4/5 rating | `prod-business3@bypass.com` | Sushi Special Feature | Button changes to "Rated 4/5" | |

---

## Test Data Summary

### Business 2 Campaigns (`prod-business2@bypass.com`)

| Campaign | Status | Creators | Test Purpose |
|----------|--------|----------|-------------|
| Spring Menu Launch | Active | Creator 1 (Foodie Lens): 3 deliverables — 1 approved+proof, 1 approved, 1 pending_review | CSF two-step workflow |
| Weekend Brunch Promotion | Active | Creator 4 (The Critic): 1 pending_review; Creator 5 (Food Reels Pro): 1 approved + 1 pending_review | RCT partial approval |
| Summer Patio Feature | Completed | Creator 6 (Local Foodie): 2 approved+paid | RCT all-approved + rating |

### Business 3 Campaigns (`prod-business3@bypass.com`)

| Campaign | Status | Creators | Test Purpose |
|----------|--------|----------|-------------|
| Sushi Special Feature | Active | Creator 1 (Foodie Lens): 3 pending_review | PDF approve-one-by-one, RCT hidden button |
| Date Night Promotion | Active | Creator 5 (Food Reels Pro): 2 draft | CSF upload stage |
| Happy Hour Highlight | Active | Creator 1 (Foodie Lens): 1 auto_approved | Auto-approval example |
| Chef Special Showcase | Completed | Creator 2 (Wanderlust Eats): 3 approved+paid | Completed campaign reference |
| + 6 more | Various | — | Background data |

---

## Resetting Test Data

If test data gets into a bad state (e.g., auto-approval kicked in, deliverables drifted), run the reset script:

```bash
node scripts/run-sql.js --prod testing/v1.0.16/reset-v1016-test-cases.sql
```

This resets deliverable statuses, payment data, ratings, and auth passwords without deleting accounts.

---

## Known Limitations

- **Auto-approval (72h)**: If no action is taken on a deliverable within 72 hours, it auto-approves. This is working as designed but may trigger payout unexpectedly during testing if you leave deliverables pending. Run the reset script if this happens.
- **Stripe test mode**: Payout processing uses Stripe test mode. Actual fund transfers won't occur, but the payout status in the app should update correctly.
- **Content storage**: Uploaded content goes to the `campaign-content` Supabase storage bucket. Large videos (>100MB) will be rejected.

## Reporting Issues

When reporting a bug, please include:
1. Which account you were using (email)
2. Which campaign and screen you were on
3. What you tapped / what happened
4. Screenshot if possible
