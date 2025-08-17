# Feature: Save TikTok (or External Link) With Context to a Restaurant

- Epic: content
- Priority: Medium
- Estimate: 1 day
- Status: 🟡 Needs Review
- Assignee: -
- Dependencies: task-bug-5-share-link-post-flow.md

## Overview
User wants to remember why a restaurant was saved by attaching a TikTok (or any link) and optional note. When saving a restaurant, allow adding a link and short text to capture context.

## Business Value
Improves recall and usefulness of saves; drives sharing and repeat engagement.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Attach link and note when saving a restaurant
  As a user
  I want to add a TikTok link and a note to my save
  So that I remember why I saved it later

  Scenario: Add link on save
    Given I tap Save on a restaurant
    When the save dialog opens
    Then I can paste a URL and add an optional note

  Scenario: Display context
    Given a saved restaurant with a link and note
    When I open the save drawer or restaurant page
    Then I see a small preview or the URL and the note

  Scenario: Edit later
    Given I have saved a restaurant with a link
    When I edit the save
    Then I can update/remove the link and note
```

## Technical Implementation
- UI: Save flow modal/sheet (wherever `saveService` is used); add fields `external_url`, `context_note`.
- Data: `restaurant_saves` table
  - Add nullable columns `external_url text`, `context_note text` if not present, and include in RLS.
- Rendering: show preview on restaurant detail and in Quick Saves.
- Analytics: event when link added.

## Definition of Done
- [ ] Save modal supports link + note
- [ ] Data persists and renders on detail and saves list
- [ ] Edit flow supports update/remove
- [ ] Type/lint clean

## Notes
Example user link: `https://www.tiktok.com/t/ZP8BRFytv/`. Keep preview minimal first; full embeds later.

