# Task 8.6: User Search and Connect/Follow

## Header Information
- **Epic**: Epic 8 - UI/UX Improvements and Polish
- **Priority**: High
- **Estimate**: 4 days
- **Status**: ✅ Completed
- **Dependencies**: Task 3.4 (User Profile Implementation)
- **Blocks**: Social network growth
- **Assignee**: -
- **Completed**: 2025-07-31

## Overview
Implement user search functionality with the ability to discover and follow other users, building the social graph that powers personalized recommendations and social features.

## Business Value
- **Network growth**: Users can find and connect with friends
- **Engagement**: Following creates recurring app usage
- **Discovery**: Find food enthusiasts with similar tastes
- **Retention**: Social connections increase stickiness

## Dependencies
- ✅ Task 3.4: User Profile Implementation (Completed)
- User relationships table
- Search infrastructure

## Blocks
- Social feed personalization
- Friend-based recommendations
- Social proof features
- Invite flow improvements

## Acceptance Criteria

```gherkin
Feature: User Search and Connect/Follow
  As a user
  I want to find and follow other users
  So that I can build my food community

  Scenario: Search for users
    Given I am on the user search screen
    When I type "john" in the search bar
    Then I see a list of users matching "john"
    And results show username, name, and bio
    And verified users appear with checkmarks
    And results are ordered by relevance

  Scenario: Follow a user from search
    Given I found a user I want to follow
    When I tap the follow button next to their name
    Then the button changes to "Following"
    And they appear in my following list
    And I start seeing their activity
    And they receive a follow notification

  Scenario: View user profile from search
    Given I see search results
    When I tap on a user's profile
    Then I navigate to their full profile
    And I can see their saves and reviews
    And I can follow/unfollow from their profile

  Scenario: Search with filters
    Given I am searching for users
    When I apply filters (location, verified only)
    Then results are filtered accordingly
    And filter badges show active filters
    And I can clear filters to see all results

  Scenario: Empty and error states
    Given I search for something with no results
    Then I see a helpful empty state message
    And suggestions for broadening my search
    When the search fails
    Then I see an error message with retry option
```

## Technical Implementation

### Search Service

```typescript
// services/userSearchService.ts
interface SearchFilters {
  location?: string;
  verifiedOnly?: boolean;
  followersMin?: number;
}

export class UserSearchService {
  static async searchUsers(
    query: string,
    filters?: SearchFilters,
    limit = 20,
    offset = 0
  ): Promise<SearchResult[]> {
    // Build search query
    let searchQuery = supabase
      .rpc('search_users', {
        search_query: query,
        limit_count: limit,
        offset_count: offset
      });
    
    // Apply filters
    if (filters?.verifiedOnly) {
      searchQuery = searchQuery.eq('is_verified', true);
    }
    
    if (filters?.location) {
      searchQuery = searchQuery.ilike('location', `%${filters.location}%`);
    }
    
    const { data, error } = await searchQuery;
    
    if (error) throw error;
    
    // Enrich with follow status
    return this.enrichWithFollowStatus(data);
  }
  
  private static async enrichWithFollowStatus(
    users: User[]
  ): Promise<SearchResult[]> {
    const currentUserId = await getCurrentUserId();
    
    const { data: relationships } = await supabase
      .from('user_relationships')
      .select('following_id')
      .eq('follower_id', currentUserId)
      .in('following_id', users.map(u => u.id));
    
    const followingIds = new Set(relationships?.map(r => r.following_id) || []);
    
    return users.map(user => ({
      ...user,
      isFollowing: followingIds.has(user.id),
      isCurrentUser: user.id === currentUserId
    }));
  }
}
```

### Search Screen Implementation

```typescript
// screens/UserSearchScreen.tsx
export const UserSearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  
  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce(performSearch, 300),
    [filters]
  );
  
  useEffect(() => {
    if (searchQuery.length >= 2) {
      debouncedSearch(searchQuery);
    } else {
      setResults([]);
    }
  }, [searchQuery, debouncedSearch]);
  
  const performSearch = async (query: string) => {
    setLoading(true);
    try {
      const results = await UserSearchService.searchUsers(query, filters);
      setResults(results);
    } catch (error) {
      Toast.show({ text: 'Search failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Screen>
      <SearchHeader
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search users by name or username"
        showFilters
        onFiltersPress={() => openFiltersModal()}
      />
      
      {filters.verifiedOnly && (
        <FilterBadge
          label="Verified Only"
          onRemove={() => setFilters({ ...filters, verifiedOnly: false })}
        />
      )}
      
      <FlatList
        data={results}
        renderItem={({ item }) => (
          <UserSearchResult
            user={item}
            onPress={() => navigateToProfile(item.id)}
            onFollowToggle={() => handleFollowToggle(item)}
          />
        )}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          searchQuery.length >= 2 && !loading ? (
            <EmptyState
              icon="search"
              title="No users found"
              description="Try adjusting your search or filters"
            />
          ) : null
        }
        ListFooterComponent={loading ? <ActivityIndicator /> : null}
      />
    </Screen>
  );
};
```

### User Search Result Component

```typescript
// components/UserSearchResult.tsx
interface UserSearchResultProps {
  user: SearchResult;
  onPress: () => void;
  onFollowToggle: () => void;
}

export const UserSearchResult: React.FC<UserSearchResultProps> = ({
  user,
  onPress,
  onFollowToggle
}) => {
  const [isFollowing, setIsFollowing] = useState(user.isFollowing);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleFollowPress = async () => {
    setIsLoading(true);
    const optimisticState = !isFollowing;
    setIsFollowing(optimisticState);
    
    try {
      if (optimisticState) {
        await FollowService.followUser(user.id);
      } else {
        await FollowService.unfollowUser(user.id);
      }
      onFollowToggle();
    } catch (error) {
      // Revert optimistic update
      setIsFollowing(!optimisticState);
      Toast.show({ text: 'Action failed', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <Avatar url={user.avatar_url} name={user.name} size="medium" />
      
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{user.name}</Text>
          {user.is_verified && (
            <Icon name="verified" size={16} color={colors.primary} />
          )}
        </View>
        <Text style={styles.username}>@{user.username}</Text>
        {user.bio && (
          <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text>
        )}
        <Text style={styles.stats}>
          {user.followers_count} followers · {user.saves_count} saves
        </Text>
      </View>
      
      {!user.isCurrentUser && (
        <FollowButton
          isFollowing={isFollowing}
          isLoading={isLoading}
          onPress={handleFollowPress}
        />
      )}
    </TouchableOpacity>
  );
};
```

### Follow Service

```typescript
// services/followService.ts
export class FollowService {
  static async followUser(userId: string): Promise<void> {
    const currentUserId = await getCurrentUserId();
    
    const { error } = await supabase
      .from('user_relationships')
      .insert({
        follower_id: currentUserId,
        following_id: userId
      });
    
    if (error) throw error;
    
    // Send notification
    await NotificationService.send({
      userId,
      type: 'follow',
      title: 'New Follower',
      message: `${currentUser.name} started following you`,
      relatedId: currentUserId,
      relatedType: 'user'
    });
    
    // Update cached counts
    await this.updateFollowerCounts(userId, 1);
    await this.updateFollowingCounts(currentUserId, 1);
  }
  
  static async unfollowUser(userId: string): Promise<void> {
    const currentUserId = await getCurrentUserId();
    
    const { error } = await supabase
      .from('user_relationships')
      .delete()
      .eq('follower_id', currentUserId)
      .eq('following_id', userId);
    
    if (error) throw error;
    
    // Update cached counts
    await this.updateFollowerCounts(userId, -1);
    await this.updateFollowingCounts(currentUserId, -1);
  }
}
```

### Database Functions

```sql
-- Full-text search function
CREATE OR REPLACE FUNCTION search_users(
  search_query TEXT,
  limit_count INT DEFAULT 20,
  offset_count INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  username VARCHAR,
  name VARCHAR,
  bio TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN,
  followers_count INT,
  saves_count INT,
  location TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.name,
    u.bio,
    u.avatar_url,
    u.is_verified,
    u.followers_count,
    u.saves_count,
    u.location
  FROM users u
  WHERE 
    to_tsvector('english', 
      COALESCE(u.username, '') || ' ' || 
      COALESCE(u.name, '') || ' ' || 
      COALESCE(u.bio, '')
    ) @@ plainto_tsquery('english', search_query)
  ORDER BY 
    u.is_verified DESC,
    u.followers_count DESC,
    ts_rank(
      to_tsvector('english', 
        COALESCE(u.username, '') || ' ' || 
        COALESCE(u.name, '') || ' ' || 
        COALESCE(u.bio, '')
      ),
      plainto_tsquery('english', search_query)
    ) DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Add search index
CREATE INDEX IF NOT EXISTS idx_users_search 
ON users 
USING gin(
  to_tsvector('english', 
    COALESCE(username, '') || ' ' || 
    COALESCE(name, '') || ' ' || 
    COALESCE(bio, '')
  )
);
```

## Definition of Done

- [x] Search screen with real-time results
- [x] Debounced search to prevent excessive queries
- [x] User results show profile info and stats
- [x] Follow/unfollow buttons with optimistic updates
- [x] Verified badge for verified users
- [x] Search filters (location, verified only)
- [x] Empty state for no results
- [x] Error handling with retry
- [x] Navigation to full user profiles
- [x] Follow notifications sent
- [x] Follower/following counts updated
- [ ] Search analytics tracked
- [ ] Accessibility labels for all interactive elements
- [ ] Performance: Search results load < 500ms

## Resources
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [Debouncing in React Native](https://www.developerway.com/posts/debouncing-in-react)
- [Optimistic UI Updates](https://www.apollographql.com/docs/react/performance/optimistic-ui/)

## Notes
- Consider adding search suggestions/autocomplete
- Implement recent searches history
- Add "People you may know" suggestions
- Track search-to-follow conversion rate
- Consider adding user categories (critics, locals, etc.)