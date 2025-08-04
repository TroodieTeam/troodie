# Task 4.3: Community Features

## Epic
Epic 4: Board and Community Features

## Priority
Medium

## Estimate
5 days

## Status
🔴 Not Started

## Overview
Implement community features that allow users to create, join, and participate in social groups around shared restaurant interests, locations, and dining preferences.

## Business Value
- Creates social engagement and community building
- Increases user retention through group participation
- Enables discovery through community recommendations
- Provides platform for restaurant enthusiasts to connect
- Differentiates Troodie from competitors with social features

## Dependencies
- Task 4.1: Implement Create a Board Flow & Board-Based Save System (for board foundation)
- Task 4.2: Board Creation & Management (for board management)
- Task 3.4: User Profile Implementation (for user profiles)
- Task 6.2: Post Creation & Management (for community content)

## Blocks
- Enhanced social engagement features
- Community-driven restaurant discovery
- User retention through group participation

## Acceptance Criteria

### Gherkin Scenarios

```gherkin
Feature: Community Features
  As a user
  I want to join and participate in restaurant communities
  So that I can connect with others who share my dining interests

Scenario: Create a Community
  Given a user wants to start a community
  When they tap "Create Community"
  Then they can set a community name and description
  And they can choose community privacy settings
  And they can select community categories and interests
  And the community is created with them as the admin

Scenario: Join a Community
  Given a user is browsing available communities
  When they find a community they're interested in
  Then they can view the community details and member count
  And they can join the community with one tap
  And they become a member with access to community content

Scenario: Community Feed
  Given a user is a member of a community
  When they visit the community page
  Then they see posts and recommendations from other members
  And they can like, comment, and share community content
  And they can filter content by type and date

Scenario: Community Discovery
  Given a user wants to find new communities
  When they browse the community discovery page
  Then they see recommended communities based on their interests
  And they can search communities by name, location, or category
  And they can see community stats and member counts

Scenario: Community Recommendations
  Given a user is in a community
  When they view community recommendations
  Then they see restaurants recommended by community members
  And the recommendations are based on community preferences
  And they can save community recommendations to their boards

Scenario: Community Events
  Given a community wants to organize a meetup
  When a community admin creates an event
  Then members can see event details and RSVP
  And the event is shared with all community members
  And members can discuss the event in the community feed

Scenario: Community Moderation
  Given a community has inappropriate content
  When a community admin or moderator flags the content
  Then the content is reviewed and can be removed
  And the user who posted inappropriate content can be warned
  And community guidelines are enforced
```

## Technical Implementation

### Backend Changes

#### Database Schema Updates
```sql
-- Create communities table
CREATE TABLE public.communities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description text,
  cover_photo_url text,
  category character varying,
  location text,
  is_private boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  member_count integer DEFAULT 0,
  post_count integer DEFAULT 0,
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT communities_pkey PRIMARY KEY (id),
  CONSTRAINT communities_name_unique UNIQUE (name)
);

-- Create community members table
CREATE TABLE public.community_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role character varying DEFAULT 'member' CHECK (
    role::text = ANY (
      ARRAY['member'::character varying, 'moderator'::character varying, 'admin'::character varying]
    )
  ),
  joined_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  CONSTRAINT community_members_pkey PRIMARY KEY (id),
  CONSTRAINT community_members_unique UNIQUE (community_id, user_id)
);

-- Create community posts table
CREATE TABLE public.community_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text,
  restaurant_id uuid REFERENCES public.restaurants(id),
  photos text[],
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  is_pinned boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT community_posts_pkey PRIMARY KEY (id)
);

-- Create community events table
CREATE TABLE public.community_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  title character varying NOT NULL,
  description text,
  event_date timestamp with time zone NOT NULL,
  location text,
  restaurant_id uuid REFERENCES public.restaurants(id),
  max_participants integer,
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT community_events_pkey PRIMARY KEY (id)
);

-- Create community event participants table
CREATE TABLE public.community_event_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.community_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status character varying DEFAULT 'going' CHECK (
    status::text = ANY (
      ARRAY['going'::character varying, 'maybe'::character varying, 'not_going'::character varying]
    )
  ),
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT community_event_participants_pkey PRIMARY KEY (id),
  CONSTRAINT community_event_participants_unique UNIQUE (event_id, user_id)
);

-- Add indexes for performance
CREATE INDEX idx_community_members_user_id ON community_members(user_id);
CREATE INDEX idx_community_members_community_id ON community_members(community_id);
CREATE INDEX idx_community_posts_community_id ON community_posts(community_id);
CREATE INDEX idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX idx_community_events_community_id ON community_events(community_id);
CREATE INDEX idx_community_events_event_date ON community_events(event_date);
```

#### Community Service
```typescript
// services/communityService.ts
interface CreateCommunityData {
  name: string;
  description?: string;
  category?: string;
  location?: string;
  isPrivate?: boolean;
  coverPhotoUrl?: string;
}

interface CommunityMember {
  id: string;
  user: {
    id: string;
    username: string;
    name: string;
    avatar_url: string;
  };
  role: 'member' | 'moderator' | 'admin';
  joinedAt: string;
}

export const createCommunity = async (
  userId: string,
  data: CreateCommunityData
): Promise<Community> => {
  const { data: community, error } = await supabase
    .from('communities')
    .insert({
      name: data.name,
      description: data.description,
      category: data.category,
      location: data.location,
      is_private: data.isPrivate || false,
      cover_photo_url: data.coverPhotoUrl,
      created_by: userId
    })
    .select()
    .single();

  if (error) throw error;

  // Add creator as admin member
  await supabase
    .from('community_members')
    .insert({
      community_id: community.id,
      user_id: userId,
      role: 'admin'
    });

  return community;
};

export const joinCommunity = async (
  userId: string,
  communityId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      return { success: false, error: 'Already a member' };
    }

    // Add user as member
    const { error } = await supabase
      .from('community_members')
      .insert({
        community_id: communityId,
        user_id: userId,
        role: 'member'
      });

    if (error) throw error;

    // Update member count
    await updateCommunityMemberCount(communityId);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getCommunityFeed = async (
  communityId: string,
  userId?: string,
  limit: number = 20
): Promise<CommunityPost[]> => {
  const { data: posts, error } = await supabase
    .from('community_posts')
    .select(`
      *,
      user:users(id, username, name, avatar_url),
      restaurant:restaurants(id, name, cover_photo_url)
    `)
    .eq('community_id', communityId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return posts || [];
};

export const createCommunityPost = async (
  userId: string,
  communityId: string,
  data: {
    content?: string;
    restaurantId?: string;
    photos?: string[];
  }
): Promise<CommunityPost> => {
  const { data: post, error } = await supabase
    .from('community_posts')
    .insert({
      community_id: communityId,
      user_id: userId,
      content: data.content,
      restaurant_id: data.restaurantId,
      photos: data.photos
    })
    .select(`
      *,
      user:users(id, username, name, avatar_url),
      restaurant:restaurants(id, name, cover_photo_url)
    `)
    .single();

  if (error) throw error;

  // Update post count
  await updateCommunityPostCount(communityId);

  return post;
};

export const getRecommendedCommunities = async (
  userId: string,
  limit: number = 10
): Promise<Community[]> => {
  // Get user's interests and location
  const userPrefs = await getUserPreferences(userId);
  
  // Find communities matching user preferences
  const { data: communities, error } = await supabase
    .from('communities')
    .select('*')
    .or(`category.in.(${userPrefs.cuisineTypes.join(',')}),location.ilike.%${userPrefs.locations[0]}%`)
    .order('member_count', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return communities || [];
};
```

### Frontend Changes

#### Community Discovery Screen
```typescript
// app/communities/index.tsx
const CommunityDiscoveryScreen = () => {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [recommendedCommunities, setRecommendedCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    try {
      setLoading(true);
      
      // Load recommended communities
      if (user) {
        const recommended = await getRecommendedCommunities(user.id);
        setRecommendedCommunities(recommended);
      }
      
      // Load all communities
      const allCommunities = await getAllCommunities();
      setCommunities(allCommunities);
    } catch (error) {
      console.error('Error loading communities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    if (!user) return;
    
    try {
      const result = await joinCommunity(user.id, communityId);
      if (result.success) {
        // Update UI to show joined state
        setCommunities(prev => 
          prev.map(community => 
            community.id === communityId 
              ? { ...community, isMember: true }
              : community
          )
        );
      }
    } catch (error) {
      console.error('Error joining community:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Communities</Text>
        <TouchableOpacity onPress={() => router.push('/communities/create')}>
          <Ionicons name="add" size={24} color="#FFAD27" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search communities..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <ScrollView style={styles.content}>
          {/* Recommended Communities */}
          {recommendedCommunities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recommended for You</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {recommendedCommunities.map(community => (
                  <CommunityCard
                    key={community.id}
                    community={community}
                    onJoin={() => handleJoinCommunity(community.id)}
                    onPress={() => router.push(`/communities/${community.id}`)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* All Communities */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All Communities</Text>
            {communities.map(community => (
              <CommunityListItem
                key={community.id}
                community={community}
                onJoin={() => handleJoinCommunity(community.id)}
                onPress={() => router.push(`/communities/${community.id}`)}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};
```

#### Community Detail Screen
```typescript
// app/communities/[id].tsx
const CommunityDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    loadCommunityData();
  }, [id]);

  const loadCommunityData = async () => {
    try {
      setLoading(true);
      
      // Load community details
      const communityData = await getCommunityById(id as string);
      setCommunity(communityData);
      
      // Load community posts
      const postsData = await getCommunityFeed(id as string);
      setPosts(postsData);
      
      // Load community members
      const membersData = await getCommunityMembers(id as string);
      setMembers(membersData);
      
      // Check if user is member
      if (user) {
        const membership = await checkCommunityMembership(user.id, id as string);
        setIsMember(membership);
      }
    } catch (error) {
      console.error('Error loading community:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCommunity = async () => {
    if (!user) return;
    
    try {
      const result = await joinCommunity(user.id, id as string);
      if (result.success) {
        setIsMember(true);
        // Refresh community data
        await loadCommunityData();
      }
    } catch (error) {
      console.error('Error joining community:', error);
    }
  };

  const handleCreatePost = () => {
    router.push(`/communities/${id}/create-post`);
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!community) {
    return <ErrorState message="Community not found" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Community Header */}
      <View style={styles.header}>
        <Image source={{ uri: community.cover_photo_url }} style={styles.coverImage} />
        <View style={styles.headerContent}>
          <Text style={styles.communityName}>{community.name}</Text>
          <Text style={styles.communityDescription}>{community.description}</Text>
          <View style={styles.stats}>
            <Text style={styles.statText}>{community.member_count} members</Text>
            <Text style={styles.statText}>{community.post_count} posts</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {!isMember ? (
          <TouchableOpacity style={styles.joinButton} onPress={handleJoinCommunity}>
            <Text style={styles.joinButtonText}>Join Community</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.createPostButton} onPress={handleCreatePost}>
            <Text style={styles.createPostButtonText}>Create Post</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Community Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, styles.activeTab]}>
          <Text style={styles.tabText}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>Members</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>Events</Text>
        </TouchableOpacity>
      </View>

      {/* Community Posts */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CommunityPostCard
            post={item}
            onPress={() => router.push(`/communities/${id}/posts/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.postsList}
      />
    </SafeAreaView>
  );
};
```

#### Community Components
```typescript
// components/CommunityCard.tsx
interface CommunityCardProps {
  community: Community;
  onJoin: () => void;
  onPress: () => void;
}

export const CommunityCard: React.FC<CommunityCardProps> = ({
  community,
  onJoin,
  onPress
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Image source={{ uri: community.cover_photo_url }} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.name}>{community.name}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {community.description}
        </Text>
        <View style={styles.stats}>
          <Text style={styles.memberCount}>{community.member_count} members</Text>
          <Text style={styles.category}>{community.category}</Text>
        </View>
        {!community.isMember && (
          <TouchableOpacity style={styles.joinButton} onPress={onJoin}>
            <Text style={styles.joinButtonText}>Join</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

// components/CommunityPostCard.tsx
interface CommunityPostCardProps {
  post: CommunityPost;
  onPress: () => void;
}

export const CommunityPostCard: React.FC<CommunityPostCardProps> = ({
  post,
  onPress
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Image source={{ uri: post.user.avatar_url }} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={styles.username}>{post.user.username}</Text>
          <Text style={styles.timestamp}>
            {formatRelativeTime(post.created_at)}
          </Text>
        </View>
      </View>
      
      <View style={styles.content}>
        {post.content && (
          <Text style={styles.postText}>{post.content}</Text>
        )}
        
        {post.restaurant && (
          <RestaurantCard
            restaurant={post.restaurant}
            onPress={() => router.push(`/restaurant/${post.restaurant.id}`)}
            style={styles.restaurantCard}
          />
        )}
        
        {post.photos && post.photos.length > 0 && (
          <Image source={{ uri: post.photos[0] }} style={styles.photo} />
        )}
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="heart-outline" size={20} color="#666" />
          <Text style={styles.actionText}>{post.likes_count}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={20} color="#666" />
          <Text style={styles.actionText}>{post.comments_count}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={20} color="#666" />
          <Text style={styles.actionText}>{post.shares_count}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};
```

## Definition of Done

- [ ] Database schema supports communities, members, posts, and events
- [ ] Users can create and join communities
- [ ] Community discovery and search functionality works
- [ ] Community feeds display posts and content
- [ ] Community members can create posts and interact
- [ ] Community events can be created and managed
- [ ] Community moderation features are implemented
- [ ] Performance is optimized for community features
- [ ] Error handling is implemented for all operations
- [ ] User experience is engaging and intuitive

## Resources

### Design References
- Reference `/docs/frontend-design-language.md` for consistent styling
- Use engaging visuals for community cards and posts
- Follow established patterns for social interactions

### Technical References
- `/docs/backend-design.md` for database schema
- Board system implementation for similar patterns
- Post creation functionality for community posts

### Related Documentation
- User profile and social features
- Board creation and management
- Post creation and interaction patterns

## Notes

### User Experience Considerations
- Make community discovery engaging and intuitive
- Provide clear value proposition for joining communities
- Ensure community content is relevant and high-quality
- Consider community moderation and safety features

### Technical Considerations
- Implement proper privacy controls for private communities
- Handle community member limits and moderation
- Consider performance for large communities
- Implement proper notification systems for community activity

### Future Enhancements
- Community analytics and insights
- Advanced moderation tools
- Community leaderboards and achievements
- Integration with external social platforms 