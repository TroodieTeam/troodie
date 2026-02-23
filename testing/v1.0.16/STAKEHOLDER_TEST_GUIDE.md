# v1.0.16 Stakeholder Test Guide

> Build: v1.0.16.b1 (TestFlight)
> Date: 2026-02-23
> Features: Content Submission Flow, Payment Duplication Fix, Rate Creator Timing Fix

---

## Test Accounts

| Account | Email | OTP | Type | Use For |
|---------|-------|-----|------|---------|
| Business 1 | `prod-business1@bypass.com` | `000000` | Business | Campaign management, review deliverables, approve content |
| Business 2 | `prod-business2@bypass.com` | `000000` | Business | Secondary business (3 campaigns) |
| Creator 1 | `prod-creator1@bypass.com` | `000000` | Creator | Apply to campaigns, submit deliverables |
| Creator 2 | `prod-creator2@bypass.com` | `000000` | Creator | Multi-application testing |
| Creator 3 | `prod-creator3@bypass.com` | `000000` | Creator | Payout verification |

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
    And I have an accepted campaign application

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
    Given I am logged in as "prod-business1@bypass.com"
    And a creator has submitted content for my campaign

  Scenario: Review and approve uploaded content
    When I navigate to my campaign
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
    And my content was approved by the restaurant

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
    And my content is still "Awaiting Review"

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
    Given I am logged in as "prod-business1@bypass.com"
    And a creator has submitted content for review

  Scenario: Reject and request changes
    When I open the deliverable review modal
    And I tap "Reject" with feedback "Please reshoot with better lighting"
    Then the deliverable should show as rejected

  Scenario: Creator sees feedback and resubmits
    Given I am logged in as "prod-creator1@bypass.com"
    When I navigate to the rejected deliverable
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
    Given I am logged in as "prod-business1@bypass.com"
    And I have a campaign with an accepted creator who has 3 deliverables

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
    Given I am logged in as "prod-business1@bypass.com"

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
    Given I am logged in as "prod-business1@bypass.com"
    And I have a campaign with 3 deliverables

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
    Given I am logged in as "prod-business1@bypass.com"
    And I have accepted a creator's application

  Scenario: Rate Creator is hidden on fresh acceptance
    When I navigate to the campaign Applications tab
    Then I should see the application with status "Awaiting Content"
    And I should NOT see a "Rate Creator" button
```

### Scenario 3.2: Partial approval shows progress, no rating

```gherkin
Feature: Partial Approval Progress
  Background:
    Given I am logged in as "prod-business1@bypass.com"
    And a creator has submitted 3 deliverables
    And I have approved 1 of 3

  Scenario: Progress shown but rating hidden
    When I navigate to the campaign Applications tab
    Then I should see "1/3 Deliverables Approved"
    And I should NOT see a "Rate Creator" button
```

### Scenario 3.3: All approved — rating button appears

```gherkin
Feature: Rating Available After Full Approval
  Background:
    Given I am logged in as "prod-business1@bypass.com"
    And all 3 deliverables for a creator are approved

  Scenario: Rate Creator button becomes visible
    When I navigate to the campaign Applications tab
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
    Given I am logged in as "prod-business1@bypass.com"

  Scenario: Deliverables tab has no rating buttons
    When I navigate to the campaign Deliverables tab
    And I scroll through all deliverable cards
    Then I should NOT see any "Rate Creator" buttons
    And I should only see Approve/Reject actions for pending deliverables
```

---

## Quick Smoke Test Checklist

For a fast pass through all three features:

| # | Action | Account | Expected | Pass? |
|---|--------|---------|----------|-------|
| 1 | Log in as creator, open accepted campaign, tap Submit Deliverable | `prod-creator1@bypass.com` | See Step 1: Upload Content | |
| 2 | Upload a photo/video, submit for review | `prod-creator1@bypass.com` | "Content Uploaded" success, status shows "Awaiting Review" | |
| 3 | Log in as business, go to campaign > Review Deliverables | `prod-business1@bypass.com` | See uploaded content inline | |
| 4 | Approve the content | `prod-business1@bypass.com` | Approved, NO payment triggered | |
| 5 | Log in as creator, go to deliverable | `prod-creator1@bypass.com` | See Step 2 with "Content approved!" banner | |
| 6 | Submit proof link (Instagram/TikTok URL) | `prod-creator1@bypass.com` | Proof submitted successfully | |
| 7 | Check Applications tab — partial deliverables approved | `prod-business1@bypass.com` | No "Rate Creator" button visible | |
| 8 | Approve ALL remaining deliverables | `prod-business1@bypass.com` | Exactly 1 payout triggered, "Rate Creator" button appears | |
| 9 | Tap "Rate Creator", submit 4/5 rating | `prod-business1@bypass.com` | Button changes to "Rated 4/5" | |

---

## Known Limitations

- **Auto-approval (72h)**: If no action is taken on a deliverable within 72 hours, it auto-approves. This is working as designed but may trigger payout unexpectedly during testing if you leave deliverables pending.
- **Stripe test mode**: Payout processing uses Stripe test mode. Actual fund transfers won't occur, but the payout status in the app should update correctly.
- **Content storage**: Uploaded content goes to the `campaign-content` Supabase storage bucket. Large videos (>100MB) will be rejected.

## Reporting Issues

When reporting a bug, please include:
1. Which account you were using (email)
2. Which screen you were on
3. What you tapped / what happened
4. Screenshot if possible
