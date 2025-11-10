# PRD-003: Review Flow Clarification

## Problem Statement
Users are confused about the difference between "Share" and "Restaurant Review" options in the content creation flow, leading to incorrect content type selection.

## Priority
**Critical** - MVP Pre-pitch (By 9/3)

## Current Behavior
- "What would you like to share?" prompt is ambiguous
- Users don't understand difference between sharing and reviewing
- May select wrong option for their intent
- Inconsistent terminology throughout app

## Assumptions
1. UI copy is unclear about content type differences
2. Users don't understand the distinction between content types
3. Both options may lead to similar-looking forms
4. The difference affects how content is displayed

## Questions for Founder
1. What is the exact difference between a "Share" and a "Review"?
2. Should "Share" be renamed to something clearer (e.g., "Quick Recommendation")?
3. Do we need both options, or can we consolidate?
4. How does each content type appear in feeds?
5. Are there different fields/requirements for each?

## Proposed Solution
1. Clear labeling and descriptions for each option
2. Visual differentiation between content types
3. Simplified flow with smart type detection
4. Contextual help text explaining differences

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Clear Review vs Share Distinction
  As a user creating content
  I want to understand what type of content I'm creating
  So that I can choose the appropriate option

  Background:
    Given I am on a restaurant page
    And I want to create content

  Scenario: Clear content type selection
    When I tap the create content button
    Then I see clearly labeled options:
      | Option | Description | Icon |
      | Write Review | Detailed experience with rating | ⭐ |
      | Quick Share | Brief recommendation to friends | 💬 |
    And each option has a subtitle explaining its purpose

  Scenario: Restaurant Review Creation
    Given I want to write a detailed restaurant review
    When I tap "Write Review"
    Then I see "Restaurant Review" as the header
    And the form includes:
      | Field | Required |
      | Rating | Yes |
      | Visit Date | Yes |
      | Review Text | Yes |
      | Photos | Optional |
      | Price Range | Optional |
    And minimum 50 characters required for review text

  Scenario: Quick Share Creation
    Given I want to quickly recommend a restaurant
    When I tap "Quick Share"
    Then I see "Share Restaurant" as the header
    And the form includes:
      | Field | Required |
      | Caption | Optional |
      | Photos | Optional |
      | Board Selection | Yes |
    And no minimum character requirement
    And it's optimized for speed

  Scenario: Smart type detection
    Given I start typing content
    When I add a rating
    Then the system automatically treats it as a review
    When I don't add a rating
    Then the system treats it as a share

  Scenario: Content type help
    Given I'm unsure which option to choose
    When I tap the help icon
    Then I see an explanation:
      """
      Write Review: Share your dining experience with ratings and details
      Quick Share: Save and recommend restaurants to your network
      """

  Scenario: Consistent terminology
    Given I've created content
    When it appears in feeds
    Then reviews show with rating stars
    And shares show as recommendations
    And the type is clearly indicated
```

## Technical Implementation

### UI/UX Changes

1. **Content Type Selector**
   ```
   ┌─────────────────────────────────┐
   │ What would you like to do?      │
   ├─────────────────────────────────┤
   │ ┌─────────────────────────────┐ │
   │ │ ⭐ Write Review             │ │
   │ │ Share your experience       │ │
   │ └─────────────────────────────┘ │
   │ ┌─────────────────────────────┐ │
   │ │ 💬 Quick Share              │ │
   │ │ Recommend to friends        │ │
   │ └─────────────────────────────┘ │
   └─────────────────────────────────┘
   ```

2. **Form Headers**
   - Review: "Review [Restaurant Name]"
   - Share: "Share [Restaurant Name]"

3. **Visual Differentiation**
   - Reviews: Star rating prominent
   - Shares: Social/network icons

### Copy Updates
- Replace "What would you like to share?" with "What would you like to do?"
- Add descriptive subtitles to each option
- Use consistent terminology throughout app

### Analytics Tracking
- Track which option users select
- Monitor form abandonment rates
- Measure time to complete each type

## Success Metrics
- Reduced form abandonment rate by 20%
- Decreased support tickets about content types
- Increased review completion rate
- Clear user preference patterns emerge

## Testing Requirements
1. A/B test different copy variations
2. User testing with prototype
3. Monitor selection patterns
4. Test with new vs returning users
5. Validate form completion rates

## Edge Cases
- User changes mind mid-creation
- Converting share to review
- Handling drafted content
- Deep linking to specific type

## Dependencies
- Content creation forms
- Feed display components
- Analytics system
- Help/onboarding system

## Alternative Solutions
1. Single form with optional rating
2. Wizard-style progressive disclosure
3. Post-type selection after content entry

## Rollback Plan
1. Revert to original flow if confusion increases
2. Add temporary help banner
3. Implement quick fix with better copy only

## Future Enhancements
- AI-suggested content type based on input
- Template system for common reviews
- Voice-to-text for quick shares
- Social proof showing what others choose

## Notes
- Critical for user understanding and engagement
- Affects content quality and appropriateness
- Should align with overall content strategy
- Consider cultural differences in sharing behavior

---
*PRD Version: 1.0*
*Created: 2025-01-13*
*Target Completion: 9/3 (Pre-pitch)*