# Task 10.2: Add Community Tab to User Profile Page

**Epic**: 10 - Enhanced Navigation and User Experience  
**Priority**: High  
**Estimate**: 1.5 days  
**Status**: 🔴 Not Started

## Overview
Add a community tab to user profile pages showing communities they're part of, communities they've created, and providing easy navigation to community features with proper organization and permissions.

## Business Value
- Enhances social discovery and community engagement
- Provides clear visibility into user's community involvement
- Facilitates community growth through profile visibility
- Improves overall social features adoption

## Dependencies
- User profile pages must be implemented
- Community system must be functional
- User-community relationships must be established

## Blocks
- N/A

## Acceptance Criteria

```gherkin
Feature: Community Tab on User Profiles
  As a user
  I want to see communities on user profiles
  So that I can discover and join relevant communities

Scenario: Community tab appears on profile
  Given I am viewing a user profile
  Then I should see a "Communities" tab alongside other profile tabs
  And it should be clearly labeled and accessible

Scenario: Shows joined communities
  Given I am on a user's community tab
  Then I should see communities the user is a member of
  And each community should show basic info like name and member count

Scenario: Shows created communities
  Given I am viewing a user's community tab
  And the user has created communities
  Then those communities should be clearly marked as "Created by [username]"
  And be visually distinguished from joined communities

Scenario: Community navigation works
  Given I see a community on someone's profile
  When I tap on the community
  Then I should navigate to that community's detail page

Scenario: Privacy settings respected
  Given a user has private community settings
  When I view their profile
  Then I should only see public communities they've chosen to display
```

## Technical Implementation

### Enhanced Profile Screen with Tabs
```typescript
// app/user/[id].tsx
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

const ProfileTabs = createMaterialTopTabNavigator();

const UserProfileScreen = () => {
  const { id } = useLocalSearchParams();
  const [user, setUser] = useState<User | null>(null);

  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <ProfileHeader user={user} />
      
      {/* Tab Navigator */}
      <ProfileTabs.Navigator
        screenOptions={{
          tabBarActiveTintColor: Colors.light.primary,
          tabBarInactiveTintColor: Colors.light.textSecondary,
          tabBarIndicatorStyle: { backgroundColor: Colors.light.primary },
          tabBarLabelStyle: { fontSize: 14, fontWeight: '600' },
        }}
      >
        <ProfileTabs.Screen 
          name="Posts" 
          component={UserPostsTab}
          initialParams={{ userId: id }}
        />
        <ProfileTabs.Screen 
          name="Saves" 
          component={UserSavesTab}
          initialParams={{ userId: id }}
        />
        <ProfileTabs.Screen 
          name="Communities" 
          component={UserCommunitiesTab}
          initialParams={{ userId: id }}
        />
      </ProfileTabs.Navigator>
    </View>
  );
};
```

### Communities Tab Component
```typescript
// components/profile/UserCommunitiesTab.tsx
interface UserCommunitiesTabProps {
  route: { params: { userId: string } };
}

const UserCommunitiesTab: React.FC<UserCommunitiesTabProps> = ({ route }) => {
  const { userId } = route.params;
  const [createdCommunities, setCreatedCommunities] = useState<Community[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserCommunities();
  }, [userId]);

  const loadUserCommunities = async () => {
    try {
      setLoading(true);
      const [created, joined] = await Promise.all([
        communityService.getUserCreatedCommunities(userId),
        communityService.getUserJoinedCommunities(userId)
      ]);
      
      setCreatedCommunities(created);
      setJoinedCommunities(joined);
    } catch (error) {
      console.error('Failed to load user communities:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  const totalCommunities = createdCommunities.length + joinedCommunities.length;

  if (totalCommunities === 0) {
    return (
      <View style={styles.emptyState}>
        <Icon name="users" size={48} color={Colors.light.textSecondary} />
        <Text style={styles.emptyTitle}>No Communities Yet</Text>
        <Text style={styles.emptySubtitle}>
          This user hasn't joined or created any communities
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Created Communities Section */}
      {createdCommunities.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Created ({createdCommunities.length})
          </Text>
          {createdCommunities.map(community => (
            <CommunityCard 
              key={community.id} 
              community={community} 
              isCreator={true}
            />
          ))}
        </View>
      )}

      {/* Joined Communities Section */}
      {joinedCommunities.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Member of ({joinedCommunities.length})
          </Text>
          {joinedCommunities.map(community => (
            <CommunityCard 
              key={community.id} 
              community={community} 
              isCreator={false}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
};
```

### Community Card Component
```typescript
// components/CommunityCard.tsx
interface CommunityCardProps {
  community: Community;
  isCreator: boolean;
}

const CommunityCard: React.FC<CommunityCardProps> = ({ community, isCreator }) => {
  const handlePress = () => {
    router.push(`/community/${community.id}`);
  };

  return (
    <TouchableOpacity style={styles.communityCard} onPress={handlePress}>
      <Image 
        source={{ uri: community.coverImageUrl || '/default-community-cover.jpg' }}
        style={styles.communityImage}
      />
      
      <View style={styles.communityInfo}>
        <View style={styles.communityHeader}>
          <Text style={styles.communityName}>{community.name}</Text>
          {isCreator && (
            <View style={styles.creatorBadge}>
              <Text style={styles.creatorText}>Creator</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.communityDescription} numberOfLines={2}>
          {community.description}
        </Text>
        
        <View style={styles.communityStats}>
          <View style={styles.stat}>
            <Icon name="users" size={14} color={Colors.light.textSecondary} />
            <Text style={styles.statText}>
              {community.memberCount} members
            </Text>
          </View>
          
          <View style={styles.stat}>
            <Icon name="message-square" size={14} color={Colors.light.textSecondary} />
            <Text style={styles.statText}>
              {community.postCount} posts
            </Text>
          </View>
          
          {community.isPrivate && (
            <View style={styles.privateBadge}>
              <Icon name="lock" size={12} color={Colors.light.textSecondary} />
              <Text style={styles.privateText}>Private</Text>
            </View>
          )}
        </View>
      </View>
      
      <Icon name="chevron-right" size={20} color={Colors.light.textSecondary} />
    </TouchableOpacity>
  );
};
```

### Community Service Extensions
```typescript
// services/communityService.ts - Additional methods
export class CommunityService {
  async getUserCreatedCommunities(userId: string): Promise<Community[]> {
    const { data, error } = await supabase
      .from('communities')
      .select(`
        id,
        name,
        description,
        cover_image_url,
        is_private,
        member_count,
        post_count,
        created_at
      `)
      .eq('creator_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getUserJoinedCommunities(userId: string): Promise<Community[]> {
    const { data, error } = await supabase
      .from('community_members')
      .select(`
        communities!inner(
          id,
          name,
          description,
          cover_image_url,
          is_private,
          member_count,
          post_count,
          created_at
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('joined_at', { ascending: false });

    if (error) throw error;
    return data?.map(item => item.communities).filter(Boolean) || [];
  }
}
```

### Privacy Settings Integration
```typescript
// Consider privacy settings for community visibility
const loadUserCommunities = async () => {
  try {
    // Check if user allows community visibility
    const privacySettings = await getUserPrivacySettings(userId);
    
    if (!privacySettings.showCommunities && userId !== currentUser.id) {
      setCreatedCommunities([]);
      setJoinedCommunities([]);
      return;
    }

    // Load communities based on privacy settings
    const [created, joined] = await Promise.all([
      communityService.getUserCreatedCommunities(userId),
      privacySettings.showPrivateCommunities || userId === currentUser.id
        ? communityService.getUserJoinedCommunities(userId)
        : communityService.getUserPublicCommunities(userId)
    ]);
    
    setCreatedCommunities(created);
    setJoinedCommunities(joined);
  } catch (error) {
    console.error('Failed to load user communities:', error);
  }
};
```

### Styling
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  
  section: {
    padding: 16,
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  
  communityCard: {
    flexDirection: 'row',
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  
  communityImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.light.imagePlaceholder,
  },
  
  communityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  
  communityName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  
  creatorBadge: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  
  creatorText: {
    fontSize: 10,
    color: Colors.light.background,
    fontWeight: '600',
  },
  
  communityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  
  statText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginLeft: 4,
  },
});
```

## Definition of Done
- [ ] Community tab appears on all user profile pages
- [ ] Shows both created and joined communities properly
- [ ] Creator badge is displayed for communities the user created
- [ ] Community cards show appropriate information and stats
- [ ] Navigation to community detail pages works smoothly
- [ ] Privacy settings are respected for community visibility
- [ ] Empty states are handled gracefully
- [ ] Loading states provide good user feedback
- [ ] Error handling works for failed community loads

## Resources
- Community system documentation
- User profile implementation
- Tab navigation patterns
- Privacy settings configuration

## Notes
- Consider adding search/filter functionality for users with many communities
- May want to add community activity indicators
- Should handle edge cases like deleted communities
- Consider adding quick actions like "Leave Community" for own profile
- May want to implement community recommendations in empty state