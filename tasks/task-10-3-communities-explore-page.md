# Task 10.3: Add Communities to Explore Page Creatively

**Epic**: 10 - Enhanced Navigation and User Experience  
**Priority**: Medium  
**Estimate**: 2 days  
**Status**: 🔴 Not Started

## Overview
Enhance the explore page by creatively integrating communities, including featured communities, trending communities, or personalized recommendations based on user interests and location.

## Business Value
- Increases community discovery and engagement
- Drives community growth through prominent placement
- Provides users with relevant community suggestions
- Enhances overall explore page value proposition

## Dependencies
- Explore page must be implemented
- Community system must be functional
- User interest/location data should be available

## Blocks
- N/A

## Acceptance Criteria

```gherkin
Feature: Communities on Explore Page
  As a user
  I want to discover communities on the explore page
  So that I can find and join relevant communities

Scenario: Featured communities section appears
  Given I am on the explore page
  Then I should see a "Communities" section
  And it should display featured or trending communities

Scenario: Community recommendations are relevant
  Given I have location and interest data
  When I view the communities section
  Then I should see communities relevant to my interests or location
  And recommendations should be personalized

Scenario: Community cards are informative
  Given I see community cards on explore page
  Then each card should show community name, member count, and preview content
  And have a clear call-to-action to join or view

Scenario: Easy navigation to community details
  Given I see a community on the explore page
  When I tap on the community card
  Then I should navigate to the community detail page
  And see full community information

Scenario: Communities integrate well with other explore content
  Given I am browsing the explore page
  Then communities should feel naturally integrated
  And not disrupt the existing explore page flow
```

## Technical Implementation

### Enhanced Explore Page with Communities
```typescript
// app/(tabs)/explore.tsx
const ExploreScreen = () => {
  const [trendingCommunities, setTrendingCommunities] = useState<Community[]>([]);
  const [recommendedCommunities, setRecommendedCommunities] = useState<Community[]>([]);
  const [featuredCommunities, setFeaturedCommunities] = useState<Community[]>([]);

  useEffect(() => {
    loadExploreData();
  }, []);

  const loadExploreData = async () => {
    try {
      const [trending, recommended, featured] = await Promise.all([
        communityService.getTrendingCommunities(),
        communityService.getRecommendedCommunities(),
        communityService.getFeaturedCommunities()
      ]);
      
      setTrendingCommunities(trending);
      setRecommendedCommunities(recommended);
      setFeaturedCommunities(featured);
    } catch (error) {
      console.error('Failed to load explore communities:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Existing explore content */}
      <SearchHeader />
      
      {/* Featured Communities Carousel */}
      {featuredCommunities.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Communities</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {featuredCommunities.map(community => (
              <FeaturedCommunityCard key={community.id} community={community} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Trending/Popular Communities */}
      {trendingCommunities.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>What's Hot in Communities</Text>
            <TouchableOpacity onPress={() => router.push('/communities')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.communityGrid}>
            {trendingCommunities.slice(0, 4).map(community => (
              <CompactCommunityCard key={community.id} community={community} />
            ))}
          </View>
        </View>
      )}

      {/* Personalized Recommendations */}
      {recommendedCommunities.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Communities for You</Text>
          <Text style={styles.sectionSubtitle}>
            Based on your interests and location
          </Text>
          
          {recommendedCommunities.map(community => (
            <RecommendedCommunityCard key={community.id} community={community} />
          ))}
        </View>
      )}

      {/* Existing explore content continues */}
      <TrendingRestaurants />
      <PopularPosts />
    </ScrollView>
  );
};
```

### Featured Community Card Component
```typescript
// components/explore/FeaturedCommunityCard.tsx
interface FeaturedCommunityCardProps {
  community: Community;
}

const FeaturedCommunityCard: React.FC<FeaturedCommunityCardProps> = ({ community }) => {
  const handlePress = () => {
    router.push(`/community/${community.id}`);
  };

  return (
    <TouchableOpacity style={styles.featuredCard} onPress={handlePress}>
      <ImageBackground 
        source={{ uri: community.coverImageUrl }}
        style={styles.featuredBackground}
        imageStyle={styles.featuredImage}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.featuredGradient}
        >
          <View style={styles.featuredContent}>
            <Text style={styles.featuredTitle}>{community.name}</Text>
            <Text style={styles.featuredSubtitle}>
              {community.memberCount} members
            </Text>
            <View style={styles.featuredActions}>
              <View style={styles.joinButton}>
                <Text style={styles.joinButtonText}>Join</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
};
```

### Compact Community Card Component
```typescript
// components/explore/CompactCommunityCard.tsx
const CompactCommunityCard: React.FC<CompactCommunityCardProps> = ({ community }) => {
  const [isJoined, setIsJoined] = useState(community.isJoined || false);
  
  const handleJoin = async (e: any) => {
    e.stopPropagation(); // Prevent navigation when joining
    
    try {
      if (isJoined) {
        await communityService.leaveCommunity(community.id);
        setIsJoined(false);
      } else {
        await communityService.joinCommunity(community.id);
        setIsJoined(true);
      }
    } catch (error) {
      showErrorToast('Failed to update community membership');
    }
  };

  const handlePress = () => {
    router.push(`/community/${community.id}`);
  };

  return (
    <TouchableOpacity style={styles.compactCard} onPress={handlePress}>
      <Image 
        source={{ uri: community.coverImageUrl }}
        style={styles.compactImage}
      />
      
      <View style={styles.compactContent}>
        <Text style={styles.compactTitle} numberOfLines={2}>
          {community.name}
        </Text>
        
        <View style={styles.compactStats}>
          <Icon name="users" size={12} color={Colors.light.textSecondary} />
          <Text style={styles.compactStatsText}>
            {formatNumber(community.memberCount)}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.compactJoinButton, isJoined && styles.compactJoinedButton]}
          onPress={handleJoin}
        >
          <Text style={[styles.compactJoinText, isJoined && styles.compactJoinedText]}>
            {isJoined ? 'Joined' : 'Join'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};
```

### Recommended Community Card Component
```typescript
// components/explore/RecommendedCommunityCard.tsx
const RecommendedCommunityCard: React.FC<RecommendedCommunityCardProps> = ({ 
  community 
}) => {
  return (
    <TouchableOpacity 
      style={styles.recommendedCard}
      onPress={() => router.push(`/community/${community.id}`)}
    >
      <Image 
        source={{ uri: community.coverImageUrl }}
        style={styles.recommendedImage}
      />
      
      <View style={styles.recommendedContent}>
        <View style={styles.recommendedHeader}>
          <Text style={styles.recommendedTitle}>{community.name}</Text>
          {community.isPrivate && (
            <Icon name="lock" size={16} color={Colors.light.textSecondary} />
          )}
        </View>
        
        <Text style={styles.recommendedDescription} numberOfLines={2}>
          {community.description}
        </Text>
        
        <View style={styles.recommendedStats}>
          <View style={styles.recommendedStat}>
            <Icon name="users" size={14} color={Colors.light.textSecondary} />
            <Text style={styles.recommendedStatText}>
              {formatNumber(community.memberCount)} members
            </Text>
          </View>
          
          <View style={styles.recommendedStat}>
            <Icon name="message-square" size={14} color={Colors.light.textSecondary} />
            <Text style={styles.recommendedStatText}>
              {formatNumber(community.recentActivity)} recent posts
            </Text>
          </View>
        </View>
        
        {community.recommendationReason && (
          <View style={styles.recommendationReason}>
            <Icon name="star" size={12} color={Colors.light.primary} />
            <Text style={styles.recommendationText}>
              {community.recommendationReason}
            </Text>
          </View>
        )}
      </View>
      
      <Icon name="chevron-right" size={20} color={Colors.light.textSecondary} />
    </TouchableOpacity>
  );
};
```

### Community Service Extensions
```typescript
// services/communityService.ts - Additional methods for explore page
export class CommunityService {
  async getTrendingCommunities(limit: number = 10): Promise<Community[]> {
    const { data, error } = await supabase.rpc('get_trending_communities', {
      limit_count: limit
    });
    
    if (error) throw error;
    return data || [];
  }

  async getFeaturedCommunities(limit: number = 5): Promise<Community[]> {
    const { data, error } = await supabase
      .from('communities')
      .select(`
        id, name, description, cover_image_url, member_count, is_private,
        recent_activity_count
      `)
      .eq('is_featured', true)
      .eq('is_active', true)
      .order('featured_priority', { ascending: true })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  }

  async getRecommendedCommunities(limit: number = 6): Promise<Community[]> {
    const { data, error } = await supabase.rpc('get_recommended_communities', {
      user_id: auth.user?.id,
      limit_count: limit
    });
    
    if (error) throw error;
    return data || [];
  }
}
```

### Database Functions for Community Discovery
```sql
-- Function to get trending communities based on recent activity
CREATE OR REPLACE FUNCTION get_trending_communities(limit_count INT DEFAULT 10)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  cover_image_url TEXT,
  member_count INT,
  is_private BOOLEAN,
  recent_activity_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.description,
    c.cover_image_url,
    c.member_count,
    c.is_private,
    (
      -- Calculate activity score based on recent posts, joins, and interactions
      COALESCE(recent_posts.count, 0) * 2 +
      COALESCE(recent_joins.count, 0) * 1.5 +
      COALESCE(recent_interactions.count, 0) * 1
    ) as recent_activity_score
  FROM communities c
  LEFT JOIN (
    SELECT community_id, COUNT(*) as count
    FROM community_posts 
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY community_id
  ) recent_posts ON c.id = recent_posts.community_id
  LEFT JOIN (
    SELECT community_id, COUNT(*) as count
    FROM community_members 
    WHERE joined_at > NOW() - INTERVAL '7 days' AND status = 'active'
    GROUP BY community_id
  ) recent_joins ON c.id = recent_joins.community_id
  LEFT JOIN (
    SELECT cp.community_id, COUNT(*) as count
    FROM community_posts cp
    JOIN post_interactions pi ON cp.post_id = pi.post_id
    WHERE pi.created_at > NOW() - INTERVAL '7 days'
    GROUP BY cp.community_id
  ) recent_interactions ON c.id = recent_interactions.community_id
  WHERE c.is_active = true 
    AND c.is_private = false
  ORDER BY recent_activity_score DESC, c.member_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get personalized community recommendations
CREATE OR REPLACE FUNCTION get_recommended_communities(
  user_id UUID, 
  limit_count INT DEFAULT 6
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  cover_image_url TEXT,
  member_count INT,
  is_private BOOLEAN,
  recommendation_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    c.id,
    c.name,
    c.description,
    c.cover_image_url,
    c.member_count,
    c.is_private,
    CASE 
      WHEN location_match.count > 0 THEN 'Popular in your area'
      WHEN interest_match.count > 0 THEN 'Matches your interests'
      ELSE 'Growing community'
    END as recommendation_reason
  FROM communities c
  LEFT JOIN (
    -- Location-based recommendations
    SELECT cm.community_id, COUNT(*) as count
    FROM community_members cm
    JOIN user_profiles up ON cm.user_id = up.id
    JOIN user_profiles current_user ON current_user.id = user_id
    WHERE ST_DWithin(up.location, current_user.location, 50000) -- 50km radius
    GROUP BY cm.community_id
  ) location_match ON c.id = location_match.community_id
  LEFT JOIN (
    -- Interest-based recommendations (simplified)
    SELECT c2.id as community_id, COUNT(*) as count
    FROM communities c2
    WHERE c2.description ILIKE ANY(
      SELECT '%' || interest || '%' 
      FROM user_interests ui 
      WHERE ui.user_id = user_id
    )
    GROUP BY c2.id
  ) interest_match ON c.id = interest_match.community_id
  WHERE c.is_active = true
    AND c.id NOT IN (
      SELECT community_id FROM community_members WHERE user_id = user_id
    )
  ORDER BY 
    COALESCE(location_match.count, 0) + COALESCE(interest_match.count, 0) DESC,
    c.member_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Definition of Done
- [ ] Communities section appears prominently on explore page
- [ ] Featured communities are displayed in an engaging carousel format
- [ ] Trending communities show with relevant activity indicators
- [ ] Personalized recommendations are relevant and helpful
- [ ] Community cards provide useful information for decision making
- [ ] Join/leave functionality works directly from explore page
- [ ] Navigation to community details is smooth
- [ ] Integration feels natural with existing explore content
- [ ] Performance is good with multiple community sections

## Resources
- Explore page implementation
- Community system documentation
- Recommendation algorithm design
- Visual design guidelines for explore page

## Notes
- Consider A/B testing different community placement strategies
- May want to implement community preview functionality
- Should track engagement metrics for community discovery
- Consider adding community search functionality to explore page
- May want to personalize section ordering based on user behavior