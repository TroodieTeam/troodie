# Task 8.1: Streamline Save/Bookmark Process

## Header Information
- **Epic**: Epic 8 - UI/UX Improvements and Polish
- **Priority**: High
- **Estimate**: 3 days
- **Status**: 🔴 Not Started
- **Dependencies**: Task 1.1 (Supabase Setup), Task 3.1 (Restaurant Save)
- **Blocks**: Improved user engagement
- **Assignee**: -

## Overview
Update the save/bookmark interaction so that tapping the bookmark icon instantly saves a restaurant, with clear visual feedback, and allows optional organization into boards afterward.

## Business Value
- **Reduces friction**: One-tap save instead of multi-step process
- **Improves engagement**: Users more likely to save when it's instant
- **Better UX**: Clear visual feedback and optional organization
- **Increased retention**: Easier collection building leads to more app usage

## Dependencies
- ✅ Task 1.1: Supabase Backend Setup (Completed)
- ❌ Task 3.1: Restaurant Save Functionality
- ❌ Task 4.1: Board Creation & Management

## Blocks
- Improved save rates and user engagement
- Better onboarding experience
- Increased collection building

## Acceptance Criteria

```gherkin
Feature: Instant Save/Bookmark for Restaurants
  As a user
  I want to instantly save restaurants with one tap
  So that I can quickly build my collection without friction

  Scenario: User taps the bookmark icon on a restaurant
    Given I am viewing a restaurant in the app
    When I tap the bookmark icon
    Then the restaurant is instantly saved to "Quick Saves"
    And the bookmark icon changes color to indicate it is saved
    And I see a toast or message confirming the save
    And I have the option to add the restaurant to a specific board

  Scenario: User taps bookmark on already saved restaurant
    Given I am viewing a restaurant that I have already saved
    When I tap the bookmark icon
    Then the restaurant is removed from my saves
    And the bookmark icon returns to its unsaved state
    And I see a toast confirming the removal

  Scenario: User organizes save into board from toast
    Given I just saved a restaurant and see the confirmation toast
    When I tap "Add to Board" in the toast
    Then a board selector modal appears
    And I can choose an existing board or create a new one
    And the restaurant is added to the selected board
```

## Technical Implementation

### Frontend Changes

```typescript
// components/RestaurantCard.tsx
const handleBookmarkTap = async () => {
  // Optimistic UI update
  setIsSaved(!isSaved);
  
  try {
    if (!isSaved) {
      // Get or create default board
      const defaultBoardId = await getOrCreateDefaultBoard(userId);
      
      // Save to default board
      await saveRestaurant({
        restaurantId,
        boardId: defaultBoardId,
        userId
      });
      
      // Show toast with board option
      showToast({
        message: "Saved to Quick Saves",
        action: {
          label: "Add to Board",
          onPress: () => openBoardSelector(restaurantId)
        }
      });
    } else {
      // Remove save
      await unsaveRestaurant({ restaurantId, userId });
      showToast({ message: "Removed from saves" });
    }
  } catch (error) {
    // Revert optimistic update
    setIsSaved(isSaved);
    showErrorToast();
  }
};
```

### Backend Changes

```sql
-- Function to get or create default board
CREATE OR REPLACE FUNCTION get_or_create_default_board(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_board_id UUID;
BEGIN
  -- Check if user has default board
  SELECT default_board_id INTO v_board_id FROM users WHERE id = p_user_id;
  
  IF v_board_id IS NULL THEN
    -- Create default board
    INSERT INTO boards (user_id, title, description, type, is_private)
    VALUES (p_user_id, 'Quick Saves', 'Your quick saves collection', 'free', false)
    RETURNING id INTO v_board_id;
    
    -- Update user's default board
    UPDATE users SET default_board_id = v_board_id WHERE id = p_user_id;
  END IF;
  
  RETURN v_board_id;
END;
$$ LANGUAGE plpgsql;

-- Add default board column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_board_id UUID REFERENCES boards(id);
```

### Component Updates

```typescript
// components/BoardSelector.tsx
export const BoardSelectorModal = ({ restaurantId, onClose }) => {
  const { boards, createBoard } = useBoards();
  
  return (
    <Modal>
      <Text>Add to Board</Text>
      <FlatList
        data={boards}
        renderItem={({ item }) => (
          <BoardOption 
            board={item}
            onPress={() => addToBoard(restaurantId, item.id)}
          />
        )}
      />
      <Button title="Create New Board" onPress={createBoard} />
    </Modal>
  );
};
```

## Definition of Done

- [ ] Bookmark icon instantly saves to Quick Saves board
- [ ] Optimistic UI updates provide immediate feedback
- [ ] Toast notifications confirm save/unsave actions
- [ ] "Add to Board" option appears in save confirmation toast
- [ ] Board selector modal allows organizing into specific boards
- [ ] Default "Quick Saves" board is auto-created for new users
- [ ] Existing saves can be removed with single tap
- [ ] Error states handled gracefully with UI rollback
- [ ] Performance testing shows <100ms response time
- [ ] Accessibility: VoiceOver/TalkBack announces save state changes
- [ ] Unit tests cover save/unsave logic
- [ ] Integration tests verify board creation and assignment

## Resources
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [React Native Toast Messages](https://github.com/calintamas/react-native-toast-message)
- [Optimistic UI Updates](https://www.apollographql.com/docs/react/performance/optimistic-ui/)

## Notes
- Consider adding haptic feedback on save/unsave
- Quick Saves board should be marked as non-deletable
- Future enhancement: bulk organization of saves
- Analytics: Track save rates before/after implementation
- Consider adding undo functionality to removal toast