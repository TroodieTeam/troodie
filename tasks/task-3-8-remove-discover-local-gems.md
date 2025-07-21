# Task 3.8: Remove Discover Local Gems CTA from Build Your Network Section

## Overview
Remove the "Discover Local Gems" CTA from the Build Your Network section on the home screen (index.tsx) to simplify the network building options.

## Business Value
- Simplifies the user experience by reducing choice overload
- Focuses user attention on core network building activities
- Aligns with current feature priorities

## Dependencies
- None

## Acceptance Criteria

### Gherkin Scenarios

**Scenario: Build Your Network section shows simplified options**
```
Given I am on the home screen
When I view the "Build Your Network" section
Then I should see only "Invite Friends" and "Share Your First Save" options
And I should NOT see the "Discover Local Gems" option
```

**Scenario: Network suggestions array is updated**
```
Given I am viewing the network suggestions
When the component loads
Then the networkSuggestions array should contain only 2 items
And the "Discover Local Gems" item should be removed
```

## Technical Implementation

### Files to Modify
- `app/(tabs)/index.tsx`

### Changes Required
1. **Remove Discover Local Gems from networkSuggestions array**
   - Remove the object with `action: 'Discover Local Gems'`
   - Keep only "Invite Friends" and "Share Your First Save" options

2. **Update array structure**
   - Ensure the remaining items maintain proper styling and functionality
   - Verify onClick handlers work correctly

### Code Changes
```typescript
// In app/(tabs)/index.tsx, update networkSuggestions array:
const networkSuggestions: NetworkSuggestion[] = [
  {
    action: 'Invite Friends',
    description: 'Connect with friends to see their favorite spots',
    icon: UserPlus,
    cta: 'Send Invites',
    benefit: 'Get personalized recommendations',
    onClick: handleInviteFriends
  },
  {
    action: 'Share Your First Save',
    description: 'Save a restaurant and share your experience',
    icon: Camera,
    cta: 'Add Restaurant',
    benefit: 'Build your food profile',
    onClick: () => router.push('/add/save-restaurant')
  },
  // Remove the "Discover Local Gems" object
];
```

## Definition of Done
- [ ] Discover Local Gems CTA removed from Build Your Network section
- [ ] Only 2 network building options remain (Invite Friends, Share Your First Save)
- [ ] All remaining CTAs function correctly
- [ ] UI layout remains balanced and visually appealing
- [ ] No console errors or TypeScript errors

## Notes
- This is a UI simplification task
- The discover-gems route and functionality can remain for future use
- Consider this change as part of the broader UI simplification effort

## Related Files
- `app/(tabs)/index.tsx` - Main file to modify
- `app/discover-gems.tsx` - Route remains available for future use 