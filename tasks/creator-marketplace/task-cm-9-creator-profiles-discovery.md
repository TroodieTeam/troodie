# TRO-16: Creator Profiles & Discovery

- Epic: CM (Creator Marketplace)
- Priority: High
- Estimate: 7-10 days (across 3 sprints)
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: Creator onboarding complete (task-cm-1, task-cm-2)
- Reference: TRO-16 Product Requirement

## Overview

Create comprehensive creator profiles with bio, location, social metrics, sample posts, and availability status. Enable restaurants to browse and filter creators by city, audience size, and engagement rate. This is the core discovery mechanism for the creator marketplace.

**Location in App**:
- Explore > Creators tab
- Restaurant Campaign > "Browse Creators"
- Individual Creator Profile pages

## Business Value

- **Marketplace Efficiency**: Restaurants can find ideal creators quickly
- **Creator Visibility**: Creators showcase their work to potential clients
- **Quality Matching**: Engagement metrics help match the right creators
- **Platform Value**: Unique creator discovery not available elsewhere

## Sprint Breakdown

### Sprint 1: Profile Creation & Basic Display (3-4 days)
- Creator profile fields (bio, location, specialties)
- Sample posts display
- Basic profile page
- "Open to Collabs" toggle

### Sprint 2: Metrics Calculation (2-3 days)
- Engagement rate calculation
- Follower count aggregation
- Performance metrics display
- Auto-updating metrics

### Sprint 3: Restaurant Filtering UI (2-3 days)
- Creators tab in Explore
- Filter by city, followers, engagement
- Sort options
- Save favorite creators

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Creator Profiles
  As a creator
  I want a comprehensive profile
  So that restaurants can discover and evaluate my work

  Scenario: View creator profile
    Given I am viewing a creator's profile
    Then I see their photo and bio
    And I see 3 sample posts
    And I see their metrics (followers, engagement rate)
    And I see their "Open to Collabs" status

  Scenario: Edit my creator profile
    Given I am a creator viewing my own profile
    When I tap "Edit Profile"
    Then I can update bio, location, and specialties
    And I can toggle "Open to Collabs"
    And changes are saved immediately

  Scenario: Toggle collab availability
    Given I am a creator
    When I toggle "Open to Collabs" on
    Then my profile shows an "Open to Collabs" badge
    And I appear in restaurant search results

Feature: Creator Discovery
  As a restaurant owner
  I want to browse and filter creators
  So that I can find the right creator for my campaign

  Scenario: Browse creators
    Given I am a restaurant owner
    When I navigate to Explore > Creators
    Then I see a list of creator profiles
    And each shows photo, name, metrics, and sample post

  Scenario: Filter by location
    Given I am browsing creators
    When I filter by "Charlotte"
    Then I only see creators in Charlotte
    And the count updates to show filtered results

  Scenario: Filter by followers
    Given I am browsing creators
    When I filter by ">1k followers"
    Then I only see creators with 1000+ followers

  Scenario: Filter by engagement
    Given I am browsing creators
    When I filter by ">5% engagement"
    Then I only see creators with engagement rate above 5%

  Scenario: View creator from campaign
    Given I am creating a campaign
    When I tap "Browse Creators"
    Then I see the creator discovery interface
    And I can invite creators to apply
```

## Technical Implementation

### Database Schema

```sql
-- Migration: supabase/migrations/YYYYMMDD_creator_profiles_discovery.sql

-- Enhance creator_profiles table
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS persona VARCHAR(100),
ADD COLUMN IF NOT EXISTS availability_status VARCHAR(20) DEFAULT 'available'
  CHECK (availability_status IN ('available', 'busy', 'not_accepting')),
ADD COLUMN IF NOT EXISTS open_to_collabs BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS collab_types TEXT[],  -- ['sponsored_posts', 'reviews', 'events', 'long_term']
ADD COLUMN IF NOT EXISTS preferred_compensation TEXT[],  -- ['cash', 'free_meal', 'product']
ADD COLUMN IF NOT EXISTS instagram_followers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tiktok_followers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS youtube_followers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS twitter_followers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_followers INTEGER GENERATED ALWAYS AS (
  COALESCE(instagram_followers, 0) +
  COALESCE(tiktok_followers, 0) +
  COALESCE(youtube_followers, 0) +
  COALESCE(twitter_followers, 0)
) STORED,
ADD COLUMN IF NOT EXISTS troodie_posts_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS troodie_likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS troodie_comments_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS troodie_engagement_rate DECIMAL(5,2) GENERATED ALWAYS AS (
  CASE
    WHEN troodie_posts_count > 0 THEN
      ((COALESCE(troodie_likes_count, 0) + COALESCE(troodie_comments_count, 0))::DECIMAL /
       troodie_posts_count::DECIMAL) * 100
    ELSE 0
  END
) STORED,
ADD COLUMN IF NOT EXISTS featured_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS profile_views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS search_rank INTEGER DEFAULT 0;

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_creator_profiles_location
ON creator_profiles(location) WHERE open_to_collabs = true;

CREATE INDEX IF NOT EXISTS idx_creator_profiles_followers
ON creator_profiles(total_followers DESC) WHERE open_to_collabs = true;

CREATE INDEX IF NOT EXISTS idx_creator_profiles_engagement
ON creator_profiles(troodie_engagement_rate DESC) WHERE open_to_collabs = true;

-- Sample posts view
CREATE OR REPLACE VIEW creator_sample_posts AS
SELECT
  cp.id as creator_profile_id,
  p.id as post_id,
  p.caption,
  p.image_url,
  p.likes_count,
  p.comments_count,
  p.created_at,
  r.name as restaurant_name,
  ROW_NUMBER() OVER (PARTITION BY cp.id ORDER BY p.likes_count DESC) as rank
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
JOIN posts p ON p.user_id = u.id
LEFT JOIN restaurants r ON p.restaurant_id = r.id
WHERE p.image_url IS NOT NULL;

-- Function to get creators with filters
CREATE OR REPLACE FUNCTION get_creators(
  p_city TEXT DEFAULT NULL,
  p_min_followers INTEGER DEFAULT NULL,
  p_min_engagement DECIMAL DEFAULT NULL,
  p_collab_types TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  bio TEXT,
  location TEXT,
  avatar_url TEXT,
  total_followers INTEGER,
  troodie_engagement_rate DECIMAL,
  open_to_collabs BOOLEAN,
  specialties TEXT[],
  sample_posts JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id,
    cp.user_id,
    COALESCE(cp.display_name, u.name, u.username) as display_name,
    cp.bio,
    cp.location,
    u.avatar_url,
    cp.total_followers,
    cp.troodie_engagement_rate,
    cp.open_to_collabs,
    cp.specialties,
    (
      SELECT json_agg(sample)
      FROM (
        SELECT post_id, caption, image_url, likes_count, restaurant_name
        FROM creator_sample_posts
        WHERE creator_profile_id = cp.id AND rank <= 3
      ) sample
    ) as sample_posts
  FROM creator_profiles cp
  JOIN users u ON cp.user_id = u.id
  WHERE cp.open_to_collabs = true
    AND (p_city IS NULL OR LOWER(cp.location) LIKE LOWER('%' || p_city || '%'))
    AND (p_min_followers IS NULL OR cp.total_followers >= p_min_followers)
    AND (p_min_engagement IS NULL OR cp.troodie_engagement_rate >= p_min_engagement)
    AND (p_collab_types IS NULL OR cp.collab_types && p_collab_types)
  ORDER BY
    cp.featured_at DESC NULLS LAST,
    cp.troodie_engagement_rate DESC,
    cp.total_followers DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update creator metrics (run periodically)
CREATE OR REPLACE FUNCTION update_creator_metrics()
RETURNS void AS $$
BEGIN
  UPDATE creator_profiles cp
  SET
    troodie_posts_count = sub.posts_count,
    troodie_likes_count = sub.likes_count,
    troodie_comments_count = sub.comments_count
  FROM (
    SELECT
      u.id as user_id,
      COUNT(p.id) as posts_count,
      COALESCE(SUM(p.likes_count), 0) as likes_count,
      COALESCE(SUM(p.comments_count), 0) as comments_count
    FROM users u
    LEFT JOIN posts p ON p.user_id = u.id
    WHERE u.is_creator = true
    GROUP BY u.id
  ) sub
  WHERE cp.user_id = sub.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Creator Discovery Service

```typescript
// services/creatorDiscoveryService.ts

import { supabase } from '@/lib/supabase';

export interface CreatorProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  location: string;
  avatarUrl: string;
  totalFollowers: number;
  engagementRate: number;
  openToCollabs: boolean;
  specialties: string[];
  samplePosts: SamplePost[];
}

export interface SamplePost {
  postId: string;
  caption: string;
  imageUrl: string;
  likesCount: number;
  restaurantName?: string;
}

export interface CreatorFilters {
  city?: string;
  minFollowers?: number;
  minEngagement?: number;
  collabTypes?: string[];
}

export async function getCreators(
  filters: CreatorFilters = {},
  limit: number = 20,
  offset: number = 0
): Promise<{ data: CreatorProfile[]; error?: string; hasMore: boolean }> {
  try {
    const { data, error } = await supabase.rpc('get_creators', {
      p_city: filters.city,
      p_min_followers: filters.minFollowers,
      p_min_engagement: filters.minEngagement,
      p_collab_types: filters.collabTypes,
      p_limit: limit + 1, // Fetch one extra to check hasMore
      p_offset: offset,
    });

    if (error) throw error;

    const hasMore = data.length > limit;
    const creators = (data.slice(0, limit) as any[]).map(transformCreator);

    return { data: creators, hasMore };
  } catch (error: any) {
    console.error('Get creators error:', error);
    return { data: [], error: error.message, hasMore: false };
  }
}

function transformCreator(row: any): CreatorProfile {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    bio: row.bio,
    location: row.location,
    avatarUrl: row.avatar_url,
    totalFollowers: row.total_followers,
    engagementRate: parseFloat(row.troodie_engagement_rate || 0),
    openToCollabs: row.open_to_collabs,
    specialties: row.specialties || [],
    samplePosts: (row.sample_posts || []).map((p: any) => ({
      postId: p.post_id,
      caption: p.caption,
      imageUrl: p.image_url,
      likesCount: p.likes_count,
      restaurantName: p.restaurant_name,
    })),
  };
}

export async function getCreatorProfile(
  creatorId: string
): Promise<{ data: CreatorProfile | null; error?: string }> {
  try {
    const { data: cp, error } = await supabase
      .from('creator_profiles')
      .select(`
        *,
        users!inner (
          id,
          name,
          username,
          avatar_url
        )
      `)
      .eq('id', creatorId)
      .single();

    if (error) throw error;

    // Get sample posts
    const { data: posts } = await supabase
      .from('posts')
      .select(`
        id,
        caption,
        image_url,
        likes_count,
        restaurants (name)
      `)
      .eq('user_id', cp.user_id)
      .not('image_url', 'is', null)
      .order('likes_count', { ascending: false })
      .limit(3);

    const profile: CreatorProfile = {
      id: cp.id,
      userId: cp.user_id,
      displayName: cp.display_name || cp.users.name || cp.users.username,
      bio: cp.bio,
      location: cp.location,
      avatarUrl: cp.users.avatar_url,
      totalFollowers: cp.total_followers,
      engagementRate: parseFloat(cp.troodie_engagement_rate || 0),
      openToCollabs: cp.open_to_collabs,
      specialties: cp.specialties || [],
      samplePosts: (posts || []).map(p => ({
        postId: p.id,
        caption: p.caption,
        imageUrl: p.image_url,
        likesCount: p.likes_count,
        restaurantName: p.restaurants?.name,
      })),
    };

    // Increment view count
    await supabase.rpc('increment', {
      table_name: 'creator_profiles',
      row_id: creatorId,
      column_name: 'profile_views',
    });

    return { data: profile };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

export async function updateCreatorProfile(
  creatorId: string,
  updates: Partial<CreatorProfile>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('creator_profiles')
      .update({
        display_name: updates.displayName,
        bio: updates.bio,
        location: updates.location,
        specialties: updates.specialties,
        open_to_collabs: updates.openToCollabs,
      })
      .eq('id', creatorId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleOpenToCollabs(
  creatorId: string,
  isOpen: boolean
): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from('creator_profiles')
    .update({ open_to_collabs: isOpen })
    .eq('id', creatorId);

  return { success: !error };
}
```

### Creator Discovery Screen

```typescript
// app/(tabs)/explore/creators.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCreators, CreatorProfile, CreatorFilters } from '@/services/creatorDiscoveryService';
import { CreatorCard } from '@/components/creator/CreatorCard';
import { CreatorFiltersSheet } from '@/components/creator/CreatorFiltersSheet';
import { SearchHeader } from '@/components/SearchHeader';

const FOLLOWER_OPTIONS = [
  { label: 'Any', value: undefined },
  { label: '1K+', value: 1000 },
  { label: '5K+', value: 5000 },
  { label: '10K+', value: 10000 },
  { label: '50K+', value: 50000 },
];

const ENGAGEMENT_OPTIONS = [
  { label: 'Any', value: undefined },
  { label: '2%+', value: 2 },
  { label: '5%+', value: 5 },
  { label: '10%+', value: 10 },
];

export default function CreatorsExplore() {
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<CreatorFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadCreators();
  }, [filters]);

  const loadCreators = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const { data, hasMore: more } = await getCreators(filters, 20, 0);
    setCreators(data);
    setHasMore(more);

    setLoading(false);
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    const { data, hasMore: more } = await getCreators(filters, 20, creators.length);
    setCreators(prev => [...prev, ...data]);
    setHasMore(more);
    setLoadingMore(false);
  };

  const handleFilterChange = (newFilters: CreatorFilters) => {
    setFilters(newFilters);
    setShowFilters(false);
  };

  const renderCreator = ({ item }: { item: CreatorProfile }) => (
    <CreatorCard
      creator={item}
      onPress={() => router.push(`/creator/${item.id}`)}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <SearchHeader
        title="Discover Creators"
        onFilterPress={() => setShowFilters(true)}
        filterCount={Object.values(filters).filter(Boolean).length}
      />

      {/* Active Filters */}
      {Object.keys(filters).length > 0 && (
        <ActiveFilters filters={filters} onClear={() => setFilters({})} />
      )}

      <FlatList
        data={creators}
        renderItem={renderCreator}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadCreators(true)} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <LoadingIndicator /> : null}
        ListEmptyComponent={
          loading ? <LoadingGrid /> : <EmptyState message="No creators found" />
        }
      />

      <CreatorFiltersSheet
        visible={showFilters}
        filters={filters}
        onApply={handleFilterChange}
        onClose={() => setShowFilters(false)}
        followerOptions={FOLLOWER_OPTIONS}
        engagementOptions={ENGAGEMENT_OPTIONS}
      />
    </SafeAreaView>
  );
}
```

### Creator Profile Card Component

```typescript
// components/creator/CreatorCard.tsx

interface CreatorCardProps {
  creator: CreatorProfile;
  onPress: () => void;
}

export function CreatorCard({ creator, onPress }: CreatorCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* Profile Image */}
      <Image source={{ uri: creator.avatarUrl }} style={styles.avatar} />

      {/* Open to Collabs Badge */}
      {creator.openToCollabs && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Open to Collabs</Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{creator.displayName}</Text>
        <Text style={styles.location}>{creator.location}</Text>

        {/* Metrics */}
        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Users size={14} color="#737373" />
            <Text style={styles.metricText}>
              {formatFollowers(creator.totalFollowers)}
            </Text>
          </View>
          <View style={styles.metric}>
            <TrendingUp size={14} color="#737373" />
            <Text style={styles.metricText}>
              {creator.engagementRate.toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Sample Post Preview */}
      {creator.samplePosts[0] && (
        <Image
          source={{ uri: creator.samplePosts[0].imageUrl }}
          style={styles.samplePost}
        />
      )}
    </TouchableOpacity>
  );
}
```

### Files to Create

1. **Migration**: `supabase/migrations/YYYYMMDD_creator_profiles_discovery.sql`
2. **Service**: `services/creatorDiscoveryService.ts`
3. **Screens**:
   - `app/(tabs)/explore/creators.tsx`
   - `app/creator/[id]/index.tsx` (profile view)
   - `app/creator/profile/edit.tsx` (edit own profile)
4. **Components**:
   - `components/creator/CreatorCard.tsx`
   - `components/creator/CreatorFiltersSheet.tsx`
   - `components/creator/OpenToCollabsBadge.tsx`
   - `components/creator/SamplePostsGrid.tsx`

## Definition of Done

### Sprint 1
- [ ] Creator profile fields added to database
- [ ] Profile display shows all fields
- [ ] "Open to Collabs" toggle working
- [ ] Sample posts display (top 3)
- [ ] Profile page accessible

### Sprint 2
- [ ] Engagement rate auto-calculated
- [ ] Metrics update periodically
- [ ] Follower counts displayed
- [ ] Performance metrics accurate

### Sprint 3
- [ ] Creators tab in Explore
- [ ] Filter by city working
- [ ] Filter by followers working
- [ ] Filter by engagement working
- [ ] Pagination working
- [ ] Can save favorite creators

## Notes

- Reference: TRO-16 Product Requirement
- Schedule metrics update to run every 6 hours
- Consider featured creators section for promotion
- Future: Add creator comparison feature
- Future: Add direct messaging between restaurants and creators
