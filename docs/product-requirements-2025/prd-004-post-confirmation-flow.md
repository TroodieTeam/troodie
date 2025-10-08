# PRD-004: Post Confirmation Flow Enhancement

## Problem Statement
After posting content, users receive a full-screen confirmation that removes them from the community screen, disrupting engagement and preventing them from seeing their post appear.

## Priority
**Critical** - MVP Pre-pitch (By 9/3)

## Current Behavior
- Full-screen "Post Published" confirmation appears
- User is prompted to go back to home screen
- Loses context of where they were
- Can't immediately see their new post
- Disrupts community engagement flow

## Assumptions
1. Current flow uses navigation.navigate() to confirmation screen
2. Users want to see their post immediately
3. Full-screen confirmation is unnecessarily disruptive
4. Toast notifications would be less intrusive

## Questions for Founder
1. Should we keep users on the same screen after posting?
2. What key information needs to be in the confirmation?
3. Should the confirmation auto-dismiss?
4. Do we need to track confirmation views?
5. Any legal/compliance reasons for current flow?

## Proposed Solution
1. Replace full-screen confirmation with toast notification
2. Keep user on current screen (community/feed)
3. Scroll to show new post at top
4. Auto-dismiss toast after 3 seconds
5. Add subtle animation to highlight new post

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Seamless Post Confirmation
  As a user posting content
  I want minimal disruption after posting
  So that I can continue engaging with the community

  Background:
    Given I am on a community or feed screen
    And I have created a post

  Scenario: Successful post submission
    Given I submit a post on the community screen
    When the post is successfully created
    Then I see a toast notification saying "Post published!"
    And I remain on the community screen
    And my new post appears at the top of the feed
    And the new post has a subtle highlight animation
    And the toast auto-dismisses after 3 seconds

  Scenario: Post with media upload
    Given I submit a post with images
    When upload is in progress
    Then I see a progress indicator in a toast
    And I can continue browsing while uploading
    And the toast updates to "Post published!" when complete
    And my post appears with all media loaded

  Scenario: Failed post submission
    Given I submit a post
    When the submission fails
    Then I see an error toast with the reason
    And I remain on the current screen
    And my draft content is preserved
    And I see a "Retry" option in the toast

  Scenario: Discussion post confirmation
    Given I post in a community discussion
    When the post is successful
    Then I see a subtle toast confirmation
    And the discussion thread updates immediately
    And my post is highlighted briefly
    And other users' new posts also appear dynamically

  Scenario: Restaurant review confirmation
    Given I submit a restaurant review
    When the review is posted
    Then I see a toast with "Review posted!"
    And I remain on the restaurant page
    And my review appears in the reviews section
    And the restaurant rating updates if affected

  Scenario: Background posting
    Given I have a slow network connection
    When I submit a post
    Then I see "Posting..." toast
    And I can navigate to other screens
    And the post publishes in the background
    And I get notified when complete
```

## Technical Implementation

### Toast Configuration
```typescript
interface PostToastConfig {
  type: 'success' | 'error' | 'progress';
  message: string;
  duration: number; // milliseconds
  action?: {
    label: string;
    onPress: () => void;
  };
  progress?: number; // 0-100 for upload progress
}

// Success toast
{
  type: 'success',
  message: 'Post published!',
  duration: 3000,
  action: {
    label: 'View',
    onPress: () => scrollToPost(postId)
  }
}
```

### Implementation Steps
1. Remove navigation to confirmation screen
2. Implement toast notification system
3. Add real-time feed updates
4. Implement post highlighting animation
5. Handle background uploads
6. Add retry mechanism for failures

### Animation Specifications
- New post slides in from top
- Subtle glow effect for 2 seconds
- Smooth scroll to show new post
- Other posts push down gracefully

## Success Metrics
- Increased post engagement rate by 15%
- Reduced time between posts by same user
- Higher community screen retention
- Positive user feedback on flow
- Decreased bounce rate after posting

## Testing Requirements
1. Test on various network speeds
2. Test with different post types (text, images, links)
3. Test multiple rapid posts
4. Test navigation during background upload
5. Test error scenarios and retries
6. Verify accessibility of toast notifications

## Edge Cases
- Multiple posts in quick succession
- Posting while offline
- App backgrounding during upload
- Simultaneous posts from multiple users
- Post validation failures
- Rate limiting responses

## Dependencies
- Toast notification system
- Real-time feed updates
- Background task manager
- Animation library
- Network state manager

## Alternative Approaches
1. Slide-up panel instead of toast
2. Inline success message in form
3. Bottom sheet confirmation
4. Status bar notification

## Rollback Plan
1. Feature flag for toast vs full-screen
2. A/B test with user segments
3. Quick revert via config change
4. Maintain both flows temporarily

## Accessibility Considerations
- Screen reader announcement for toast
- Sufficient color contrast
- Option to disable animations
- Keyboard navigation support

## Future Enhancements
- Undo option in toast
- Share button in success toast
- Engagement metrics in toast
- Customizable toast position
- Rich media previews in toast

## Notes
- Critical for community engagement
- Reduces friction in content creation
- Aligns with modern app patterns
- Should feel native to platform
- Consider haptic feedback on success

---
*PRD Version: 1.0*
*Created: 2025-01-13*
*Target Completion: 9/3 (Pre-pitch)*