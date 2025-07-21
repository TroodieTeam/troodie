# Task 3.9: Simplify Add Content Screen - Show Only Create a Board

## Overview
Simplify the Add Content screen to show only the "Create a Board" option, hiding "Join Communities", "Creator Dashboard", and "Save a Restaurant" options. This focuses the user experience on the core board creation functionality.

## Business Value
- Reduces user choice overload and decision fatigue
- Focuses user attention on the primary content creation path
- Simplifies the onboarding and feature discovery process
- Aligns with current MVP priorities

## Dependencies
- None

## Acceptance Criteria

### Gherkin Scenarios

**Scenario: Add Content screen shows only Create a Board**
```
Given I am on the Add Content screen
When I view the primary actions section
Then I should see only the "Create a Board" option
And I should NOT see "Join Communities", "Creator Dashboard", or "Save a Restaurant" options
```

**Scenario: Create a Board option functions correctly**
```
Given I am on the Add Content screen
When I tap the "Create a Board" option
Then I should navigate to the board creation flow
And the navigation should work without errors
```

**Scenario: UI layout remains balanced**
```
Given I am on the Add Content screen
When I view the simplified layout
Then the single option should be centered and visually appealing
And the screen should not appear empty or unbalanced
```

## Technical Implementation

### Files to Modify
- `app/(tabs)/add.tsx`

### Changes Required
1. **Filter addOptions array to show only Create a Board**
   - Keep only the object with `id: 'board'`
   - Remove objects with `id: 'restaurant'`, `id: 'community'`, `id: 'creator'`

2. **Update component rendering**
   - Ensure the single option renders properly
   - Maintain existing styling and functionality

3. **Update screen title/subtitle if needed**
   - Consider updating the subtitle to reflect the simplified purpose

### Code Changes
```typescript
// In app/(tabs)/add.tsx, update addOptions array:
const addOptions: AddOption[] = [
  {
    id: 'board',
    title: 'Create a Board',
    description: 'Curate a themed collection',
    icon: FolderPlus,
    color: '#3B82F6',
    navigateTo: '/add/create-board'
  },
  // Remove all other options (restaurant, community, creator)
];
```

### Optional UI Improvements
```typescript
// Consider updating the subtitle for clarity:
const renderHeader = () => (
  <View style={styles.header}>
    <Text style={styles.title}>Add Content</Text>
    <Text style={styles.subtitle}>Create your first board</Text>
  </View>
);
```

## Definition of Done
- [ ] Add Content screen shows only "Create a Board" option
- [ ] "Join Communities", "Creator Dashboard", and "Save a Restaurant" options are hidden
- [ ] Create a Board navigation works correctly
- [ ] UI layout remains visually balanced
- [ ] No console errors or TypeScript errors
- [ ] Screen subtitle updated to reflect simplified purpose (optional)

## Notes
- This is a UI simplification task for the current MVP
- The hidden options can be re-enabled in future iterations
- Consider adding a note in the code about future feature completion
- The routes for hidden features should remain available for future use

## Future Task Note
**Complete remaining flows in future iterations:**
- Join Communities flow
- Creator Dashboard implementation
- Enhanced Save a Restaurant flow
- Additional board creation features

## Related Files
- `app/(tabs)/add.tsx` - Main file to modify
- `app/add/create-board.tsx` - Board creation flow (remains active)
- `app/add/communities.tsx` - Communities flow (hidden but available)
- `app/add/save-restaurant.tsx` - Restaurant save flow (hidden but available) 