# Task 6.12: Update 'Build Your Network' Section

## Epic
Epic 6: Missing Core Screens and Functionality

## Priority
Medium

## Estimate
2 days

## Status
🔴 Not Started

## Overview
Update the 'Build Your Network' section on the homepage to include new CTAs for Create Board, Create Post, and Join Community, replacing the current single "Invite Friends" suggestion with a more comprehensive set of network-building actions.

## Business Value
- Provides users with multiple ways to engage with the platform
- Encourages content creation and community participation
- Improves user onboarding by showcasing key features
- Increases user retention through diverse engagement options
- Aligns with the platform's social and community focus

## Dependencies
- Task 4.1: Implement Create a Board Flow & Board-Based Save System (for board creation)
- Task 6.2: Post Creation & Management (for post creation)
- Task 4.3: Community Features (for community joining)

## Blocks
- Enhanced user engagement through multiple entry points
- Better user onboarding experience
- Improved feature discovery

## Acceptance Criteria

### Gherkin Scenarios

```gherkin
Feature: Build Your Network Section
  As a user
  I want to see multiple ways to build my network
  So that I can engage with the platform in different ways

Scenario: View Updated Network Building Section
  Given a user is on the homepage
  When they scroll to the "Build Your Network" section
  Then they see three network building options
  And the options are "Create Board", "Create Post", and "Join Community"
  And each option has a clear description and benefit

Scenario: Create Board CTA
  Given a user sees the "Create Board" option
  When they tap on the "Create Board" card
  Then they are navigated to the board creation flow
  And they can create a new board to organize their saves

Scenario: Create Post CTA
  Given a user sees the "Create Post" option
  When they tap on the "Create Post" card
  Then they are navigated to the post creation flow
  And they can share their restaurant experience with others

Scenario: Join Community CTA
  Given a user sees the "Join Community" option
  When they tap on the "Join Community" card
  Then they are navigated to the community discovery screen
  And they can browse and join communities of interest

Scenario: Conditional Display Logic
  Given a user has already created boards
  When they view the network building section
  Then the "Create Board" option shows different messaging
  And the messaging reflects their current activity level

Scenario: Network Building Progress
  Given a user has completed network building actions
  When they view the network building section
  Then the section shows their progress
  And they see encouragement to try other actions
```

## Technical Implementation

### Frontend Changes

#### Update Network Suggestions Array
```typescript
// app/(tabs)/index.tsx
import { 
  Bookmark, 
  MessageSquare, 
  Users,
  UserPlus 
} from 'lucide-react-native';

// Update the networkSuggestions array
const networkSuggestions: NetworkSuggestion[] = [
  {
    action: 'Create Board',
    description: 'Organize your favorite restaurants into collections',
    icon: Bookmark,
    cta: 'Create Board',
    benefit: 'Keep your saves organized',
    onClick: () => router.push('/add/create-board'),
    condition: () => userBoards.length === 0 // Show for new users
  },
  {
    action: 'Create Post',
    description: 'Share your restaurant experiences with the community',
    icon: MessageSquare,
    cta: 'Share Experience',
    benefit: 'Connect with other food lovers',
    onClick: () => router.push('/add/create-post'),
    condition: () => true // Always show
  },
  {
    action: 'Join Community',
    description: 'Connect with people who share your dining interests',
    icon: Users,
    cta: 'Find Communities',
    benefit: 'Discover new restaurants together',
    onClick: () => router.push('/communities'),
    condition: () => true // Always show
  }
];

// Filter suggestions based on conditions
const filteredNetworkSuggestions = networkSuggestions.filter(suggestion => 
  suggestion.condition ? suggestion.condition() : true
);
```

#### Update Network Building Render Function
```typescript
// app/(tabs)/index.tsx
const renderNetworkBuilding = () => {
  // Don't show if user has completed all network building actions
  if (userState.hasCreatedBoard && userState.hasCreatedPost && userState.hasJoinedCommunity) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.networkHeader}>
        <View style={styles.networkTitleContainer}>
          <UserPlus size={16} color={designTokens.colors.primaryOrange} />
          <Text style={styles.sectionTitle}>Build Your Network</Text>
        </View>
        <View style={styles.networkProgress}>
          <Text style={styles.progressText}>
            {getNetworkProgress()} of 3 completed
          </Text>
        </View>
      </View>
      <View style={styles.networkCards}>
        {filteredNetworkSuggestions.map((suggestion, index) => (
          <TouchableOpacity 
            key={index} 
            style={[
              styles.networkCard,
              suggestion.completed && styles.networkCardCompleted
            ]}
            onPress={suggestion.onClick}
          >
            <View style={styles.networkCardIcon}>
              <suggestion.icon size={20} color={designTokens.colors.primaryOrange} />
              {suggestion.completed && (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedText}>✓</Text>
                </View>
              )}
            </View>
            <View style={styles.networkCardContent}>
              <Text style={styles.networkCardTitle}>{suggestion.action}</Text>
              <Text style={styles.networkCardDescription}>{suggestion.description}</Text>
              <Text style={styles.networkCardBenefit}>{suggestion.benefit}</Text>
            </View>
            <TouchableOpacity 
              style={[
                styles.networkCardCTA,
                suggestion.completed && styles.networkCardCTACompleted
              ]} 
              onPress={suggestion.onClick}
            >
              <Text style={styles.networkCardCTAText}>
                {suggestion.completed ? 'Completed' : suggestion.cta}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// Helper function to calculate network progress
const getNetworkProgress = (): number => {
  let progress = 0;
  if (userState.hasCreatedBoard) progress++;
  if (userState.hasCreatedPost) progress++;
  if (userState.hasJoinedCommunity) progress++;
  return progress;
};
```

#### Update App Context for Network State
```typescript
// contexts/AppContext.tsx
interface AppState {
  // ... existing state
  hasCreatedBoard: boolean;
  hasCreatedPost: boolean;
  hasJoinedCommunity: boolean;
  networkProgress: number;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({
    // ... existing state
    hasCreatedBoard: false,
    hasCreatedPost: false,
    hasJoinedCommunity: false,
    networkProgress: 0
  });

  // Update network progress when user completes actions
  const updateNetworkProgress = useCallback((action: 'board' | 'post' | 'community') => {
    setState(prev => {
      const updates: Partial<AppState> = {};
      
      switch (action) {
        case 'board':
          updates.hasCreatedBoard = true;
          break;
        case 'post':
          updates.hasCreatedPost = true;
          break;
        case 'community':
          updates.hasJoinedCommunity = true;
          break;
      }
      
      const newProgress = [
        updates.hasCreatedBoard ?? prev.hasCreatedBoard,
        updates.hasCreatedPost ?? prev.hasCreatedPost,
        updates.hasJoinedCommunity ?? prev.hasJoinedCommunity
      ].filter(Boolean).length;
      
      return {
        ...prev,
        ...updates,
        networkProgress: newProgress
      };
    });
  }, []);

  // Check network progress on app load
  useEffect(() => {
    const checkNetworkProgress = async () => {
      if (!user?.id) return;
      
      try {
        const [boards, posts, communities] = await Promise.all([
          boardService.getUserBoards(user.id),
          postService.getUserPosts(user.id),
          communityService.getUserCommunities(user.id)
        ]);
        
        setState(prev => ({
          ...prev,
          hasCreatedBoard: boards.length > 0,
          hasCreatedPost: posts.length > 0,
          hasJoinedCommunity: communities.length > 0,
          networkProgress: [
            boards.length > 0,
            posts.length > 0,
            communities.length > 0
          ].filter(Boolean).length
        }));
      } catch (error) {
        console.error('Error checking network progress:', error);
      }
    };
    
    checkNetworkProgress();
  }, [user?.id]);

  return (
    <AppContext.Provider value={{ 
      userState: state, 
      updateNetworkProgress,
      // ... other context values
    }}>
      {children}
    </AppContext.Provider>
  );
};
```

#### Add New Styles
```typescript
// app/(tabs)/index.tsx - Add to existing styles
const styles = StyleSheet.create({
  // ... existing styles
  
  networkProgress: {
    backgroundColor: designTokens.colors.backgroundGray,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.md,
  },
  progressText: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textMedium,
  },
  networkCardCompleted: {
    backgroundColor: designTokens.colors.backgroundLight,
    borderColor: designTokens.colors.primaryOrange,
  },
  networkCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: designTokens.colors.primaryOrange + '1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designTokens.spacing.md,
    position: 'relative', // For completed badge
  },
  completedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: designTokens.colors.primaryOrange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
  networkCardCTACompleted: {
    backgroundColor: designTokens.colors.backgroundGray,
    borderColor: designTokens.colors.borderLight,
  },
});
```

#### Update NetworkSuggestion Type
```typescript
// types/core.ts
export interface NetworkSuggestion {
  action: string;
  description: string;
  icon: React.ComponentType<any>;
  cta: string;
  benefit: string;
  onClick: () => void;
  condition?: () => boolean;
  completed?: boolean;
}
```

### Backend Integration

#### Update Network Progress Tracking
```typescript
// services/userService.ts
export const updateUserNetworkProgress = async (
  userId: string,
  action: 'board' | 'post' | 'community'
) => {
  const { data, error } = await supabase
    .from('users')
    .update({
      [`has_created_${action}`]: true,
      network_progress: supabase.sql`network_progress + 1`
    })
    .eq('id', userId)
    .select('network_progress')
    .single();

  if (error) throw error;
  return data;
};

export const getUserNetworkProgress = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select(`
      has_created_board,
      has_created_post,
      has_joined_community,
      network_progress
    `)
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};
```

#### Database Schema Updates
```sql
-- Add network progress fields to users table
ALTER TABLE public.users 
ADD COLUMN has_created_board boolean DEFAULT false,
ADD COLUMN has_created_post boolean DEFAULT false,
ADD COLUMN has_joined_community boolean DEFAULT false,
ADD COLUMN network_progress integer DEFAULT 0;

-- Create index for network progress queries
CREATE INDEX idx_users_network_progress ON users (network_progress);
```

## Definition of Done

- [ ] Network suggestions array is updated with three new CTAs
- [ ] Create Board CTA navigates to board creation flow
- [ ] Create Post CTA navigates to post creation flow
- [ ] Join Community CTA navigates to community discovery
- [ ] Network progress tracking is implemented
- [ ] Completed actions show visual indicators
- [ ] Progress counter displays completion status
- [ ] Section hides when all actions are completed
- [ ] Network progress is persisted in database
- [ ] User experience is smooth and intuitive

## Resources

### Design References
- Reference `/docs/frontend-design-language.md` for consistent styling
- Use established card patterns for network suggestions
- Follow existing icon and color guidelines

### Technical References
- `/docs/backend-design.md` for database schema updates
- Existing board creation flow for integration
- Post creation functionality for navigation
- Community features for joining flow

### Related Documentation
- Board creation and management
- Post creation and sharing
- Community discovery and joining
- User onboarding and engagement

## Notes

### User Experience Considerations
- Make network building feel achievable and rewarding
- Provide clear visual feedback for completed actions
- Ensure smooth navigation to target flows
- Consider progressive disclosure for complex actions

### Technical Considerations
- Handle edge cases where user has already completed actions
- Implement proper error handling for navigation
- Consider performance impact of progress tracking
- Ensure network progress updates are atomic

### Future Enhancements
- Add network building achievements/badges
- Implement personalized network suggestions
- Add social proof for network building actions
- Consider gamification elements for engagement 