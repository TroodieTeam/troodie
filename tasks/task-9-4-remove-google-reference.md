# Task 9.4: Remove Google Reference from Add Restaurant Modal

**Epic**: 9 - UI/UX Improvements and Content Integration  
**Priority**: Low  
**Estimate**: 0.25 days  
**Status**: 🔴 Not Started

## Overview
Update the Add New Restaurant modal to remove Google-specific references and make the search functionality more generic and platform-agnostic.

## Business Value
- Improves brand consistency by removing third-party references
- Makes the interface more generic and professional
- Reduces dependency messaging on external services
- Creates cleaner, more focused user experience

## Dependencies
- Add New Restaurant modal must be implemented

## Blocks
- N/A

## Acceptance Criteria

```gherkin
Feature: Generic Restaurant Search Interface
  As a user
  I want to see generic search terminology
  So that the interface feels native to the Troodie app

Scenario: Search placeholder is generic
  Given I open the Add New Restaurant modal
  Then the search input should show "Search for restaurant..."
  And it should not mention Google or any specific service

Scenario: Help text is platform-agnostic
  Given I am in the Add New Restaurant modal
  Then any help text should be generic
  And should not reference specific search providers

Scenario: Search functionality remains intact
  Given I search for a restaurant name
  When I type in the search input
  Then the search should work exactly as before
  And return relevant restaurant results
```

## Technical Implementation

### Modal Component Updates
```typescript
// components/AddRestaurantModal.tsx
const AddRestaurantModal: React.FC<AddRestaurantModalProps> = ({
  visible,
  onClose,
  onAddRestaurant
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>Add New Restaurant</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} />
          </TouchableOpacity>
        </View>

        <Text style={styles.description}>
          Can't find a restaurant? Add it to our database and help the community discover new places!
        </Text>

        <View style={styles.searchContainer}>
          <Icon name="search" size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for restaurant..."  {/* Updated from "Search for restaurant on Google..." */}
            placeholderTextColor={Colors.light.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        </View>

        {searchResults.length > 0 && (
          <ScrollView style={styles.results}>
            {searchResults.map(restaurant => (
              <RestaurantSearchResult 
                key={restaurant.id}
                restaurant={restaurant}
                onSelect={onAddRestaurant}
              />
            ))}
          </ScrollView>
        )}

        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => handleManualAdd()}
          >
            <Text style={styles.addButtonText}>Add Restaurant</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
```

### String Constants Update
```typescript
// constants/strings.ts
export const Strings = {
  addRestaurant: {
    title: 'Add New Restaurant',
    description: "Can't find a restaurant? Add it to our database and help the community discover new places!",
    searchPlaceholder: 'Search for restaurant...', // Updated
    helpText: 'Enter the restaurant name to search our database', // Updated
    manualAddButton: 'Add Restaurant',
    cancelButton: 'Cancel'
  }
};
```

### Search Service (No Changes Needed)
```typescript
// services/restaurantSearchService.ts
// The actual search implementation doesn't need changes
// Only the UI messaging is being updated
export const searchRestaurants = async (query: string): Promise<Restaurant[]> => {
  // Existing implementation remains the same
  // This likely calls Google Places API or other service internally
  // But the user-facing text no longer mentions the provider
};
```

## Definition of Done
- [ ] Search placeholder text is updated to "Search for restaurant..."
- [ ] No Google references remain in the modal
- [ ] Help text is platform-agnostic
- [ ] Search functionality continues to work as before
- [ ] All related string constants are updated
- [ ] Modal description is generic and helpful
- [ ] Visual design remains consistent with app

## Resources
- Add New Restaurant modal component
- String constants documentation
- UI/UX design guidelines
- Restaurant search service

## Notes
- This is a quick copy change with no functional impact
- Ensure all instances of Google references are found and updated
- Consider updating any related documentation or help text
- Verify the change doesn't break any existing functionality
- May want to update other similar references throughout the app