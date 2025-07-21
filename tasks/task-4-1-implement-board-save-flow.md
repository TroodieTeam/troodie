# Task 4.1: Implement Create a Board Flow & Board-Based Save System

## Overview
Implement the complete Create a Board flow and update all "save" functionality throughout the app to add restaurants to boards instead of a generic "saves" system. This includes completing the board creation flow and updating restaurant cards, profile screens, and activity feeds to use board-based organization.

## Business Value
- Provides users with organized collections of restaurants
- Enables social sharing of curated restaurant lists
- Creates foundation for monetization through paid boards
- Improves user engagement through structured content organization
- Differentiates from competitors with board-based curation

## Dependencies
- Task 2.2 (Restaurant Search & Discovery) - for restaurant data
- Task 3.1 (Restaurant Save Functionality) - for save interactions
- Task 3.4 (User Profile Implementation) - for user context

## Acceptance Criteria

### Gherkin Scenarios

**Scenario: Complete board creation flow**
```
Given I am on the Add Content screen
When I tap "Create a Board"
Then I should see board type selection (Free, Private, Paid)
And I should be able to select a board type
And I should navigate to board details form
And I should be able to set board name, description, and settings
And I should be able to create the board successfully
```

**Scenario: Restaurant cards show "Add to Board" instead of "Save"**
```
Given I am viewing a restaurant card
When I tap the save/add button
Then I should see a board selection modal
And I should be able to select an existing board or create a new one
And the restaurant should be added to the selected board
And I should see confirmation of the action
```

**Scenario: Profile screen shows boards instead of generic saves**
```
Given I am on the profile screen
When I view the "Your Saves" section
Then I should see "Your Boards" instead
And I should see my created boards with restaurant counts
And I should be able to tap to view board details
```

**Scenario: Activity feed shows board-based actions**
```
Given I am on the activity screen
When I view activity items
Then I should see "added [restaurant] to [board]" instead of generic saves
And I should see board creation activities
And I should see board sharing activities
```

**Scenario: Board management functionality**
```
Given I have created boards
When I view my boards
Then I should be able to edit board details
And I should be able to add/remove restaurants from boards
And I should be able to change board privacy settings
And I should be able to delete boards
```

## Technical Implementation

### Files to Create/Modify

#### 1. Board Creation Flow
- **`app/add/board-details.tsx`** - Board details form (exists, needs completion)
- **`app/add/board-assignment.tsx`** - Restaurant assignment to boards (exists, needs updates)
- **`app/boards/[id].tsx`** - Board detail view (new)
- **`app/boards/index.tsx`** - User's boards list (new)

#### 2. Board Service
- **`services/boardService.ts`** - Board CRUD operations (new)
- **`services/boardRestaurantService.ts`** - Board-restaurant relationship management (new)

#### 3. UI Components
- **`components/BoardCard.tsx`** - Board display component (new)
- **`components/BoardSelectionModal.tsx`** - Board selection modal (new)
- **`components/AddToBoardModal.tsx`** - Add restaurant to board modal (new)

#### 4. Updated Components
- **`components/cards/RestaurantCard.tsx`** - Add board save functionality
- **`app/(tabs)/index.tsx`** - Update "Your Saves" to "Your Boards"
- **`app/(tabs)/profile.tsx`** - Update profile to show boards
- **`app/(tabs)/activity.tsx`** - Update activity feed for board actions

### Database Schema Updates

#### 1. Boards Table
```sql
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(20) DEFAULT 'free' CHECK (type IN ('free', 'private', 'paid')),
  cover_image_url TEXT,
  category VARCHAR(50),
  location VARCHAR(100),
  is_private BOOLEAN DEFAULT false,
  allow_comments BOOLEAN DEFAULT true,
  allow_saves BOOLEAN DEFAULT true,
  price DECIMAL(10,2),
  restaurant_count INTEGER DEFAULT 0,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. Board Restaurants Table
```sql
CREATE TABLE board_restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  restaurant_id VARCHAR(255) NOT NULL,
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  visit_date DATE,
  UNIQUE(board_id, restaurant_id)
);
```

#### 3. Board Members Table (for private boards)
```sql
CREATE TABLE board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);
```

### Service Implementation

#### 1. BoardService
```typescript
class BoardService {
  async createBoard(userId: string, boardData: BoardCreationForm): Promise<Board>
  async getUserBoards(userId: string): Promise<Board[]>
  async getBoardDetails(boardId: string): Promise<Board>
  async updateBoard(boardId: string, updates: Partial<Board>): Promise<Board>
  async deleteBoard(boardId: string): Promise<void>
  async addRestaurantToBoard(boardId: string, restaurantId: string, userId: string): Promise<void>
  async removeRestaurantFromBoard(boardId: string, restaurantId: string): Promise<void>
  async getBoardRestaurants(boardId: string): Promise<RestaurantInfo[]>
}
```

#### 2. BoardRestaurantService
```typescript
class BoardRestaurantService {
  async addToBoard(boardId: string, restaurant: RestaurantInfo, userId: string): Promise<void>
  async removeFromBoard(boardId: string, restaurantId: string): Promise<void>
  async getBoardsForRestaurant(restaurantId: string, userId: string): Promise<Board[]>
  async getBoardRestaurantCount(boardId: string): Promise<number>
}
```

### UI Flow Updates

#### 1. Restaurant Card Save Flow
```typescript
// Update RestaurantCard to show board selection
const handleSave = async () => {
  const boards = await boardService.getUserBoards(userId);
  setShowBoardSelection(true);
  setAvailableBoards(boards);
};

// Board selection modal
const handleBoardSelection = async (boardId: string) => {
  await boardRestaurantService.addToBoard(boardId, restaurant, userId);
  setShowBoardSelection(false);
  showSuccessMessage(`Added to ${selectedBoard.title}`);
};
```

#### 2. Profile Screen Updates
```typescript
// Replace "Your Saves" with "Your Boards"
const renderYourBoards = () => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Your Boards</Text>
    {userBoards.map(board => (
      <BoardCard 
        key={board.id} 
        board={board} 
        onPress={() => router.push(`/boards/${board.id}`)}
      />
    ))}
  </View>
);
```

#### 3. Activity Feed Updates
```typescript
// Update activity items to show board actions
const activityItems: ActivityItem[] = [
  {
    id: 1,
    type: 'board_add',
    user: { id: 1, name: 'Sarah Chen', username: 'sarahchen', avatar: '...' },
    action: 'added to board',
    target: 'The Italian Place',
    board: 'Italian Favorites',
    time: '2 hours ago'
  }
];
```

## Definition of Done
- [ ] Complete board creation flow (type selection → details → confirmation)
- [ ] Board service with full CRUD operations
- [ ] Database schema for boards, board_restaurants, board_members
- [ ] Restaurant cards updated to use board selection modal
- [ ] Profile screen shows "Your Boards" instead of "Your Saves"
- [ ] Activity feed shows board-based activities
- [ ] Board detail view with restaurant list
- [ ] Board management (edit, delete, privacy settings)
- [ ] Add to board functionality from restaurant detail screens
- [ ] Board sharing and social features
- [ ] All existing "save" references updated to board-based system
- [ ] Comprehensive error handling and loading states
- [ ] Unit tests for board services
- [ ] Integration tests for board flows

## Notes
- This is a major feature that affects multiple parts of the app
- Consider implementing in phases: Phase 1 (basic board creation), Phase 2 (board-restaurant relationships), Phase 3 (social features)
- The board system should be extensible for future monetization features
- Consider board templates for common use cases (date night, family dinner, etc.)

## Related Files
- `app/add/create-board.tsx` - Board type selection (exists)
- `app/add/board-details.tsx` - Board details form (exists)
- `app/add/board-assignment.tsx` - Restaurant assignment (exists)
- `components/cards/RestaurantCard.tsx` - Needs board save functionality
- `app/(tabs)/index.tsx` - Update "Your Saves" section
- `app/(tabs)/profile.tsx` - Update profile to show boards
- `services/boardService.ts` - New board service
- `services/boardRestaurantService.ts` - New board-restaurant service 