# Task 9.2: Implement Save to Board Toast with Homescreen Pattern

**Epic**: 9 - UI/UX Improvements and Content Integration  
**Priority**: High  
**Estimate**: 1.5 days  
**Status**: 🔴 Not Started

## Overview
When a user saves a restaurant from the detail page, show a toast notification with the option to add to a different board, using the same pattern as the homescreen save functionality.

## Business Value
- Improves user experience by providing immediate feedback on save actions
- Allows users to organize saves into specific boards without leaving the current screen
- Maintains consistency with existing homescreen patterns
- Reduces friction in the save-to-board workflow

## Dependencies
- Board system must be implemented
- Toast notification component must exist
- Homescreen save pattern must be documented

## Blocks
- N/A

## Acceptance Criteria

```gherkin
Feature: Save to Board Toast Notification
  As a user
  I want to see a toast when I save a restaurant with options to change the board
  So that I can organize my saves efficiently

Scenario: Save restaurant shows toast
  Given I am on a restaurant detail page
  When I tap the Save button
  Then a toast notification should appear
  And it should show "Saved to Quick Saves" with an action button
  And the action button should say "Add to Board"

Scenario: Change board from toast
  Given I have saved a restaurant and see the toast
  When I tap "Add to Board" in the toast
  Then a board selection modal should appear
  And it should follow the same pattern as the homescreen
  And I should be able to select a different board

Scenario: Toast dismisses automatically
  Given a save toast is showing
  When I wait for 4 seconds without interaction
  Then the toast should automatically dismiss

Scenario: Multiple saves show updated toast
  Given I save a restaurant to "Quick Saves"
  And I change it to "Favorites" board via toast
  When I save another restaurant
  Then the toast should remember my last board selection
```

## Technical Implementation

### Toast Component
```typescript
// components/CustomToast.tsx - enhance existing component
interface SaveToastProps {
  visible: boolean;
  boardName: string;
  onAddToBoard: () => void;
  onDismiss: () => void;
}

export const SaveToast: React.FC<SaveToastProps> = ({
  visible,
  boardName,
  onAddToBoard,
  onDismiss
}) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onDismiss, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible, onDismiss]);

  return (
    <Animated.View style={[styles.toast, { opacity: visible ? 1 : 0 }]}>
      <View style={styles.toastContent}>
        <Icon name="bookmark" size={20} color="#4CAF50" />
        <Text style={styles.toastText}>Saved to {boardName}</Text>
        <TouchableOpacity onPress={onAddToBoard} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Add to Board</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};
```

### Restaurant Detail Save Logic
```typescript
// app/restaurant/[id].tsx
const RestaurantDetail = () => {
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [savedToBoard, setSavedToBoard] = useState('Quick Saves');
  const [showBoardModal, setShowBoardModal] = useState(false);

  const handleSave = async () => {
    try {
      // Save to default board (Quick Saves or last selected)
      await saveRestaurantToBoard(restaurant.id, defaultBoardId);
      
      setSavedToBoard(defaultBoardName);
      setShowSaveToast(true);
      
      // Update save state
      setIsSaved(true);
    } catch (error) {
      showErrorToast('Failed to save restaurant');
    }
  };

  const handleAddToBoard = () => {
    setShowSaveToast(false);
    setShowBoardModal(true);
  };

  const handleBoardSelection = async (board: Board) => {
    try {
      // Move restaurant to selected board
      await moveRestaurantToBoard(restaurant.id, board.id);
      
      setSavedToBoard(board.name);
      setShowBoardModal(false);
      
      // Show confirmation
      showSuccessToast(`Moved to ${board.name}`);
    } catch (error) {
      showErrorToast('Failed to move to board');
    }
  };

  return (
    <View style={styles.container}>
      {/* Restaurant content */}
      
      <SaveToast
        visible={showSaveToast}
        boardName={savedToBoard}
        onAddToBoard={handleAddToBoard}
        onDismiss={() => setShowSaveToast(false)}
      />
      
      <BoardSelectionModal
        visible={showBoardModal}
        onSelectBoard={handleBoardSelection}
        onClose={() => setShowBoardModal(false)}
        currentRestaurant={restaurant}
      />
    </View>
  );
};
```

### Board Selection Modal (Reuse Homescreen Pattern)
```typescript
// components/BoardSelectionModal.tsx
export const BoardSelectionModal: React.FC<BoardSelectionModalProps> = ({
  visible,
  onSelectBoard,
  onClose,
  currentRestaurant
}) => {
  const { boards } = useBoards();
  
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>Add to Board</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.boardList}>
          {boards.map(board => (
            <TouchableOpacity
              key={board.id}
              style={styles.boardOption}
              onPress={() => onSelectBoard(board)}
            >
              <View style={styles.boardInfo}>
                <Text style={styles.boardName}>{board.name}</Text>
                <Text style={styles.boardCount}>{board.restaurantCount} places</Text>
              </View>
              <Icon name="chevron-right" size={20} />
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity style={styles.createBoard}>
            <Icon name="plus" size={20} />
            <Text>Create New Board</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};
```

## Definition of Done
- [ ] Toast notification appears when saving restaurant
- [ ] Toast shows current board name and "Add to Board" action
- [ ] Board selection modal follows homescreen pattern exactly
- [ ] Toast auto-dismisses after 4 seconds
- [ ] User can change board selection from toast
- [ ] Visual design matches existing toast patterns
- [ ] Proper error handling for save failures
- [ ] Accessibility support for screen readers
- [ ] Smooth animations for toast appearance/dismissal

## Resources
- Existing CustomToast component
- Homescreen save pattern documentation
- Board selection UI patterns
- Toast notification design guidelines

## Notes
- Should remember user's last board selection as default
- Consider haptic feedback on successful save
- May need to handle edge cases like deleted boards
- Ensure toast doesn't interfere with other UI elements