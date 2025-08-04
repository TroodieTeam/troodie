# Task 9.6: Improve Find Friends Workflow

**Epic**: 9 - UI/UX Improvements and Content Integration  
**Priority**: Medium  
**Estimate**: 2 days  
**Status**: 🔴 Not Started

## Overview
Enhance the 'find friends' workflow in the Add Content screen to make it easier and more intuitive for users to discover and connect with others through improved UX patterns.

## Business Value
- Increases user engagement and social connections
- Improves user onboarding and network building
- Reduces friction in friend discovery process
- Enhances social features adoption

## Dependencies
- User search functionality must exist
- Profile system must be implemented
- Friend/follow system must be working

## Blocks
- N/A

## Acceptance Criteria

```gherkin
Feature: Enhanced Find Friends Workflow
  As a user
  I want an easy way to discover and connect with other users
  So that I can build my food network quickly

Scenario: Intuitive friend search interface
  Given I tap "Find Friends" in the Add Content screen
  Then I should see a clean search interface
  And it should have clear search suggestions or prompts

Scenario: Search functionality works smoothly
  Given I am in the find friends interface
  When I type a username or name
  Then I should see relevant user results immediately
  And each result should show useful profile information

Scenario: Easy connection process
  Given I find a user I want to connect with
  When I tap to follow or add them
  Then the process should be immediate and clear
  And I should get feedback confirming the connection

Scenario: Friend suggestions are helpful
  Given I open the find friends interface
  Then I should see suggested users based on my interests
  And suggestions should be relevant to my location or activity
```

## Technical Implementation

### Enhanced Find Friends Screen
```typescript
// app/find-friends.tsx - New dedicated screen
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { userSearchService } from '../services/userSearchService';
import { UserSearchResult } from '../components/UserSearchResult';

const FindFriendsScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSuggestedUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 0) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadSuggestedUsers = async () => {
    try {
      const suggestions = await userSearchService.getSuggestedUsers();
      setSuggestedUsers(suggestions);
    } catch (error) {
      console.error('Failed to load suggested users:', error);
    }
  };

  const searchUsers = async () => {
    setIsLoading(true);
    try {
      const results = await userSearchService.searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('User search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Find Friends</Text>
        <Text style={styles.subtitle}>
          Connect with other food lovers in your area
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username or name..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
      </View>

      <ScrollView style={styles.content}>
        {searchQuery.length === 0 ? (
          <SuggestedUsersSection users={suggestedUsers} />
        ) : (
          <SearchResultsSection users={searchResults} isLoading={isLoading} />
        )}
      </ScrollView>
    </View>
  );
};
```

### Suggested Users Section
```typescript
// components/SuggestedUsersSection.tsx
interface SuggestedUsersSectionProps {
  users: User[];
}

const SuggestedUsersSection: React.FC<SuggestedUsersSectionProps> = ({ users }) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Suggested for You</Text>
      <Text style={styles.sectionSubtitle}>
        Based on your location and food interests
      </Text>
      
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
      
      {users.length === 0 && (
        <View style={styles.emptyState}>
          <Icon name="users" size={48} color={Colors.light.textSecondary} />
          <Text style={styles.emptyText}>
            No suggestions available yet
          </Text>
          <Text style={styles.emptySubtext}>
            Complete your profile to get better recommendations
          </Text>
        </View>
      )}
    </View>
  );
};
```

### Enhanced User Card
```typescript
// components/UserCard.tsx
interface UserCardProps {
  user: User;
  showFollowButton?: boolean;
}

const UserCard: React.FC<UserCardProps> = ({ user, showFollowButton = true }) => {
  const [isFollowing, setIsFollowing] = useState(user.isFollowing || false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollow = async () => {
    setIsLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(user.id);
        setIsFollowing(false);
      } else {
        await followUser(user.id);
        setIsFollowing(true);
      }
    } catch (error) {
      showErrorToast('Failed to update follow status');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.userCard}
      onPress={() => router.push(`/user/${user.id}`)}
    >
      <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
      
      <View style={styles.userInfo}>
        <Text style={styles.username}>@{user.username}</Text>
        <Text style={styles.displayName}>{user.displayName}</Text>
        
        {user.bio && (
          <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text>
        )}
        
        <View style={styles.stats}>
          <Text style={styles.statText}>
            {user.postsCount} posts • {user.followersCount} followers
          </Text>
        </View>
        
        {user.commonInterests && user.commonInterests.length > 0 && (
          <View style={styles.commonInterests}>
            <Text style={styles.commonInterestsText}>
              Likes {user.commonInterests.slice(0, 2).join(', ')}
            </Text>
          </View>
        )}
      </View>

      {showFollowButton && (
        <TouchableOpacity 
          style={[styles.followButton, isFollowing && styles.followingButton]}
          onPress={handleFollow}
          disabled={isLoading}
        >
          <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};
```

### Enhanced User Search Service
```typescript
// services/userSearchService.ts
export class UserSearchService {
  async searchUsers(query: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        id,
        username,
        display_name,
        bio,
        avatar_url,
        posts_count,
        followers_count,
        following_count
      `)
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(20);

    if (error) throw error;
    return data || [];
  }

  async getSuggestedUsers(): Promise<User[]> {
    const { data, error } = await supabase.rpc('get_suggested_users', {
      limit_count: 10
    });

    if (error) throw error;
    return data || [];
  }
}

export const userSearchService = new UserSearchService();
```

### Database Function for Suggestions
```sql
-- Function to get suggested users based on common interests and location
CREATE OR REPLACE FUNCTION get_suggested_users(limit_count INT DEFAULT 10)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  posts_count INT,
  followers_count INT,
  common_interests TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (up.id)
    up.id,
    up.username,
    up.display_name,
    up.bio,
    up.avatar_url,
    up.posts_count,
    up.followers_count,
    ARRAY[]::TEXT[] as common_interests
  FROM user_profiles up
  WHERE up.id != auth.uid()
    AND up.id NOT IN (
      SELECT following_id FROM user_follows WHERE follower_id = auth.uid()
    )
  ORDER BY up.id, up.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Definition of Done
- [ ] Find friends interface is intuitive and easy to use
- [ ] Search functionality works smoothly with real-time results
- [ ] Suggested users are relevant and helpful
- [ ] User cards show appropriate information for decision making
- [ ] Follow/unfollow actions work reliably
- [ ] Empty states provide helpful guidance
- [ ] Interface follows app design patterns
- [ ] Performance is good with large user bases
- [ ] Error handling provides clear feedback

## Resources
- User search and discovery patterns
- Social features documentation
- Profile system implementation
- Follow/friend functionality

## Notes
- Consider adding filters for location-based suggestions
- May want to implement mutual friend suggestions
- Should respect privacy settings for user discovery
- Consider adding onboarding hints for new users
- May need rate limiting for search to prevent abuse