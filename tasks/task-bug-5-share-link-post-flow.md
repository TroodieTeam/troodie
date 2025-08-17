# Fix: "Share a link" Causes Bug in Create Post Flow

- Epic: bug
- Priority: High
- Estimate: 0.75 days
- Status: ✅ Completed
- Assignee: -
- Dependencies: -

## Overview
In the Create Post screen, using the "Share a link" option leads to a buggy state (screenshot shows community share sheet overlay and disabled interactions). The link attach flow should be independent and stable, with proper preview and persistence.

## Business Value
Users often share TikTok/Instagram/Articles; a broken link flow blocks content creation and reduces engagement.

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Attach external link to post
  As a creator
  I want to attach a link when creating a post
  So that I can reference external content

  Scenario: Open link input
    Given I am on Create Post
    When I tap "Share a link"
    Then a link input modal appears without overlapping the community sheet

  Scenario: Preview and validation
    Given a valid URL (e.g., https://www.tiktok.com/...)
    When I paste it
    Then I see a preview (title/thumbnail if available) or a simple validated URL

  Scenario: Save and persist
    Given I added a link
    When I publish the post
    Then the post contains the link and it renders in the feed detail view

  Scenario: Cancel gracefully
    When I cancel the link flow
    Then I return to Create Post without any stuck overlays
```

## Technical Implementation
- Screen: `app/add/create-post.tsx`
  - Isolate link attach UI from community selection sheet; ensure only one bottom sheet/modal active.
  - Debounce/validate URL; fetch OpenGraph where available.
- Component: `components/posts/ExternalContentPreview.tsx`
  - Reuse for preview rendering; ensure supports TikTok/IG/YouTube basic meta.
- Data: `postService.ts` / schema
  - Confirm a `external_url` (or similar) field exists; if not, add nullable text column and include in create payload.
- QA: Ensure link attach works with both "Share" and "Restaurant Review" modes.

## Definition of Done
- [x] No overlay conflicts with community selection
- [x] Valid URLs show preview, invalid ones show inline error
- [x] Links persist and render on post detail
- [x] Works on iOS + Android
- [x] Type/lint clean

## Notes
See attached screenshot: link flow appears with community sheet visible. Consider a single modal manager or z-index guard to prevent overlap.

