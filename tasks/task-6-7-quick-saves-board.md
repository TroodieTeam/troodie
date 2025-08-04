# Task 6.7: Implement Quick Saves Board System

## Epic
Epic 6: Missing Core Screens and Functionality

## Priority
High

## Estimate
3 days

## Status
🔴 Not Started

## Overview
Implement a private default "Quick Saves" board that automatically receives all restaurant saves, accessible via profile tab and homepage display.

## Business Value
- Provides users with a frictionless way to save restaurants without immediate organization
- Creates a default destination for all saves, reducing user confusion
- Enables quick access to saved restaurants from multiple entry points
- Improves user retention by making saved content easily discoverable

## Dependencies
- Task 2.2: Restaurant Search & Discovery (for save functionality)
- Task 4.1: Board Creation & Management (for board system foundation)

## Blocks
- Task 6.11: Implement Perfect for You Section (can use quick saves data)
- Enhanced user experience for restaurant discovery and saving

## Acceptance Criteria

### Gherkin Scenarios

```gherkin
Feature: Quick Saves Board System
  As a user
  I want a private default board for all my saves
  So that I can quickly save restaurants without organizing them immediately

Scenario: Automatic Quick Saves Board Creation
  Given a new user signs up for Troodie
  When they complete onboarding
  Then a private "Quick Saves" board is automatically created
  And the board is set as their default save destination

Scenario: Save Restaurant to Quick Saves
  Given a user is viewing a restaurant
  When they tap the save button
  Then the restaurant is automatically added to their Quick Saves board
  And no additional board selection is required

Scenario: Access Quick Saves from Profile
  Given a user is on their profile screen
  When they tap the "Quick Saves" tab
  Then they see all their saved restaurants
  And the restaurants are displayed in chronological order

Scenario: Access Quick Saves from Homepage
  Given a user is on the homepage
  When they scroll to the Quick Saves section
  Then they see their most recent saves
  And they can tap to view all saves

Scenario: Quick Saves Board Privacy
  Given a user has saved restaurants to their Quick Saves board
  When another user views their profile
  Then the Quick Saves board is not visible
  And the saved restaurants remain private

Scenario: Convert Quick Save to Custom Board
  Given a user has restaurants in their Quick Saves board
  When they create a new custom board
  Then they can move restaurants from Quick Saves to the custom board
  And the restaurants are removed from Quick Saves
```

## Technical Implementation

### Backend Changes

#### Database Schema Updates
```sql
-- Add default_board_id to users table
ALTER TABLE public.users 
ADD COLUMN default_board_id uuid REFERENCES public.boards(id);

-- Create function to ensure Quick Saves board exists
CREATE OR REPLACE FUNCTION ensure_quick_saves_board(user_id uuid)
RETURNS uuid AS $$
DECLARE
  board_id uuid;
BEGIN
  -- Check if Quick Saves board exists
  SELECT id INTO board_id 
  FROM public.boards 
  WHERE user_id = $1 AND title = 'Quick Saves';
  
  -- Create if doesn't exist
  IF board_id IS NULL THEN
    INSERT INTO public.boards (user_id, title, description, is_private, type)
    VALUES ($1, 'Quick Saves', 'Your default collection of saved restaurants', true, 'free')
    RETURNING id INTO board_id;
  END IF;
  
  -- Update user's default board
  UPDATE public.users SET default_board_id = board_id WHERE id = $1;
  
  RETURN board_id;
END;
$$ LANGUAGE plpgsql;
```

#### Save Service Updates
```typescript
// services/restaurantService.ts
export const saveRestaurantToQuickSaves = async (
  userId: string, 
  restaurantId: string
) => {
  // Ensure Quick Saves board exists
  const { data: board } = await supabase
    .rpc('ensure_quick_saves_board', { user_id: userId });
  
  // Add restaurant to Quick Saves board
  const { data, error } = await supabase
    .from('board_restaurants')
    .insert({
      board_id: board,
      restaurant_id: restaurantId,
      added_by: userId,
      added_at: new Date().toISOString()
    });
  
  return { data, error };
};
```

### Frontend Changes

#### Quick Saves Board Component
```typescript
// components/QuickSavesBoard.tsx
interface QuickSavesBoardProps {
  userId: string;
  onRestaurantPress: (restaurantId: string) => void;
}

export const QuickSavesBoard: React.FC<QuickSavesBoardProps> = ({
  userId,
  onRestaurantPress
}) => {
  const [saves, setSaves] = useState<RestaurantSave[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuickSaves();
  }, [userId]);

  const loadQuickSaves = async () => {
    try {
      const { data, error } = await supabase
        .from('board_restaurants')
        .select(`
          *,
          restaurant:restaurants(*)
        `)
        .eq('board_id', defaultBoardId)
        .order('added_at', { ascending: false })
        .limit(10);
      
      if (data) setSaves(data);
    } catch (error) {
      console.error('Error loading quick saves:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quick Saves</Text>
        <TouchableOpacity onPress={() => navigation.navigate('QuickSaves')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {saves.map((save) => (
            <RestaurantCard
              key={save.id}
              restaurant={save.restaurant}
              onPress={() => onRestaurantPress(save.restaurant.id)}
              style={styles.restaurantCard}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};
```

#### Profile Tab Integration
```typescript
// app/(tabs)/profile.tsx
const ProfileScreen = () => {
  const [activeTab, setActiveTab] = useState('profile');
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={styles.tabText}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'quickSaves' && styles.activeTab]}
          onPress={() => setActiveTab('quickSaves')}
        >
          <Text style={styles.tabText}>Quick Saves</Text>
        </TouchableOpacity>
      </View>
      
      {activeTab === 'profile' ? (
        <ProfileContent />
      ) : (
        <QuickSavesList />
      )}
    </SafeAreaView>
  );
};
```

#### Homepage Integration
```typescript
// app/(tabs)/index.tsx
const HomeScreen = () => {
  return (
    <ScrollView style={styles.container}>
      {/* Other sections */}
      
      <QuickSavesBoard 
        userId={user.id}
        onRestaurantPress={(restaurantId) => 
          router.push(`/restaurant/${restaurantId}`)
        }
      />
      
      {/* More sections */}
    </ScrollView>
  );
};
```

## Definition of Done

- [ ] Quick Saves board is automatically created for new users
- [ ] All restaurant saves go to Quick Saves by default
- [ ] Quick Saves board is accessible from profile tab
- [ ] Quick Saves section appears on homepage
- [ ] Quick Saves board is private by default
- [ ] Users can view all saves in a dedicated screen
- [ ] Save functionality works without requiring board selection
- [ ] Quick Saves data is properly synced with user account
- [ ] Performance is optimized for quick loading
- [ ] Error handling is implemented for all save operations

## Resources

### Design References
- Reference `/docs/frontend-design-language.md` for consistent styling
- Follow established card patterns for restaurant display
- Use consistent spacing and typography from design system

### Technical References
- `/docs/backend-design.md` for database schema
- Existing board system implementation for patterns
- Restaurant save functionality for integration points

### Related Documentation
- Board creation flow documentation
- Restaurant save service implementation
- Profile screen layout patterns

## Notes

### User Experience Considerations
- Quick Saves should feel seamless and automatic
- Users shouldn't be forced to organize saves immediately
- The board should be discoverable but not intrusive
- Consider adding a subtle indicator when saves are added

### Technical Considerations
- Ensure Quick Saves board is created during user onboarding
- Handle edge cases where board creation fails
- Implement proper error handling for save operations
- Consider caching for performance optimization

### Future Enhancements
- Allow users to customize Quick Saves board name
- Add ability to convert Quick Saves to custom boards
- Implement Quick Saves analytics for user insights
- Consider Quick Saves as a source for recommendations 