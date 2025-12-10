# TRO-14: Restaurant Analytics Dashboard

- Epic: CM (Creator Marketplace)
- Priority: High
- Estimate: 5-7 days (across 3 sprints)
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: Restaurant claiming flow complete
- Reference: CREATOR_MARKETPLACE_REVIEW.md Section 3.8

## Overview

Create an analytics dashboard for claimed restaurants to view their performance metrics including total saves, mentions, creator posts, redemptions, and trending status. This replaces the current mock data in the dashboard with real, actionable metrics.

**Location in App**: Restaurant Profile > Analytics tab (claimed restaurants only)

## Business Value

- **Restaurant Retention**: Valuable insights keep restaurants engaged with platform
- **Upsell Opportunity**: Analytics can drive campaign purchases
- **Competitive Advantage**: Unique data restaurants can't get elsewhere
- **Creator Marketplace**: Shows ROI of creator campaigns to restaurants

## Sprint Breakdown

### Sprint 1: Basic Metrics (Saves, Mentions)
- Display total saves count
- Show mentions in posts
- Weekly/monthly trends
- Basic chart visualization

### Sprint 2: Creator Posts + Redemptions
- Track creator content for restaurant
- Redemption tracking from campaigns
- Campaign ROI metrics

### Sprint 3: Trending Alerts + Export
- Real-time trending badge (>10 saves in 24h)
- Data export (CSV/PDF)
- Push notifications for milestones

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Restaurant Analytics Dashboard
  As a restaurant owner
  I want to view analytics about my restaurant
  So that I can understand my performance on Troodie

  Scenario: View analytics tab
    Given I am logged in as a restaurant owner
    And my restaurant is claimed
    When I view my restaurant profile
    Then I see an "Analytics" tab
    And I can view my metrics

  Scenario: Only claimed restaurants see analytics
    Given I am viewing a restaurant
    And the restaurant is not claimed by me
    When I view the restaurant profile
    Then I do not see an Analytics tab

  Scenario: View real-time saves count
    Given I am viewing my restaurant analytics
    When a user saves my restaurant
    Then the saves count updates in real-time
    And I see the updated total

  Scenario: Trending badge appears
    Given my restaurant received 11 saves in the last 24 hours
    When I view my analytics dashboard
    Then I see a "Trending" badge
    And the badge shows "Hot right now"

  Scenario: View creator posts
    Given creators have posted about my restaurant
    When I view the Creator Posts section
    Then I see a list of posts with engagement metrics
    And I can tap to view full posts

  Scenario: Export data
    Given I am viewing analytics
    When I tap "Export Data"
    Then I can download a CSV with all metrics
    And the data includes date ranges
```

## Technical Implementation

### Database Schema

```sql
-- Migration: supabase/migrations/YYYYMMDD_restaurant_analytics.sql

-- Materialized view for aggregated analytics (refreshed periodically)
CREATE MATERIALIZED VIEW restaurant_analytics_daily AS
SELECT
  r.id as restaurant_id,
  DATE_TRUNC('day', rs.created_at) as date,
  COUNT(DISTINCT rs.id) as saves_count,
  COUNT(DISTINCT rs.user_id) as unique_savers
FROM restaurants r
LEFT JOIN restaurant_saves rs ON rs.restaurant_id = r.id
GROUP BY r.id, DATE_TRUNC('day', rs.created_at);

-- Index for fast lookups
CREATE INDEX idx_restaurant_analytics_daily_restaurant
ON restaurant_analytics_daily(restaurant_id, date DESC);

-- Function to get restaurant analytics
CREATE OR REPLACE FUNCTION get_restaurant_analytics(
  p_restaurant_id UUID,
  p_start_date DATE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date DATE DEFAULT NOW()
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_saves', (
      SELECT COUNT(*) FROM restaurant_saves
      WHERE restaurant_id = p_restaurant_id
    ),
    'saves_this_month', (
      SELECT COUNT(*) FROM restaurant_saves
      WHERE restaurant_id = p_restaurant_id
        AND created_at >= DATE_TRUNC('month', NOW())
    ),
    'saves_last_24h', (
      SELECT COUNT(*) FROM restaurant_saves
      WHERE restaurant_id = p_restaurant_id
        AND created_at >= NOW() - INTERVAL '24 hours'
    ),
    'is_trending', (
      SELECT COUNT(*) > 10 FROM restaurant_saves
      WHERE restaurant_id = p_restaurant_id
        AND created_at >= NOW() - INTERVAL '24 hours'
    ),
    'mentions_count', (
      SELECT COUNT(*) FROM posts
      WHERE restaurant_id = p_restaurant_id
        AND created_at >= p_start_date
    ),
    'creator_posts_count', (
      SELECT COUNT(*) FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.restaurant_id = p_restaurant_id
        AND u.is_creator = true
    ),
    'total_post_likes', (
      SELECT COALESCE(SUM(likes_count), 0) FROM posts
      WHERE restaurant_id = p_restaurant_id
    ),
    'daily_saves', (
      SELECT json_agg(daily_data ORDER BY date DESC)
      FROM (
        SELECT
          DATE_TRUNC('day', created_at)::DATE as date,
          COUNT(*) as count
        FROM restaurant_saves
        WHERE restaurant_id = p_restaurant_id
          AND created_at >= p_start_date
        GROUP BY DATE_TRUNC('day', created_at)
      ) daily_data
    ),
    'top_savers', (
      SELECT json_agg(saver_data)
      FROM (
        SELECT
          u.id,
          u.username,
          u.avatar_url,
          u.is_creator,
          COUNT(*) as save_count
        FROM restaurant_saves rs
        JOIN users u ON rs.user_id = u.id
        WHERE rs.restaurant_id = p_restaurant_id
        GROUP BY u.id, u.username, u.avatar_url, u.is_creator
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ) saver_data
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS: Only restaurant owners can access their analytics
CREATE POLICY "Restaurant owners can view their analytics"
ON restaurant_analytics_daily FOR SELECT
USING (
  restaurant_id IN (
    SELECT restaurant_id FROM business_profiles
    WHERE user_id = auth.uid()
  )
);
```

### Analytics Service

```typescript
// services/restaurantAnalyticsService.ts

import { supabase } from '@/lib/supabase';

export interface RestaurantAnalytics {
  totalSaves: number;
  savesThisMonth: number;
  savesLast24h: number;
  isTrending: boolean;
  mentionsCount: number;
  creatorPostsCount: number;
  totalPostLikes: number;
  dailySaves: Array<{ date: string; count: number }>;
  topSavers: Array<{
    id: string;
    username: string;
    avatarUrl: string;
    isCreator: boolean;
    saveCount: number;
  }>;
}

export async function getRestaurantAnalytics(
  restaurantId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{ data: RestaurantAnalytics | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('get_restaurant_analytics', {
      p_restaurant_id: restaurantId,
      p_start_date: startDate?.toISOString().split('T')[0],
      p_end_date: endDate?.toISOString().split('T')[0],
    });

    if (error) throw error;

    // Transform snake_case to camelCase
    const analytics: RestaurantAnalytics = {
      totalSaves: data.total_saves,
      savesThisMonth: data.saves_this_month,
      savesLast24h: data.saves_last_24h,
      isTrending: data.is_trending,
      mentionsCount: data.mentions_count,
      creatorPostsCount: data.creator_posts_count,
      totalPostLikes: data.total_post_likes,
      dailySaves: data.daily_saves || [],
      topSavers: (data.top_savers || []).map((s: any) => ({
        id: s.id,
        username: s.username,
        avatarUrl: s.avatar_url,
        isCreator: s.is_creator,
        saveCount: s.save_count,
      })),
    };

    return { data: analytics, error: null };
  } catch (error) {
    console.error('Restaurant analytics error:', error);
    return { data: null, error: error as Error };
  }
}

// Real-time subscription for live updates
export function subscribeToRestaurantSaves(
  restaurantId: string,
  onSave: (newCount: number) => void
) {
  return supabase
    .channel(`restaurant-saves-${restaurantId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'restaurant_saves',
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      async () => {
        // Fetch updated count
        const { count } = await supabase
          .from('restaurant_saves')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId);

        onSave(count || 0);
      }
    )
    .subscribe();
}
```

### Analytics Dashboard Screen

```typescript
// app/(tabs)/business/analytics.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getRestaurantAnalytics,
  subscribeToRestaurantSaves,
  RestaurantAnalytics,
} from '@/services/restaurantAnalyticsService';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { TrendingBadge } from '@/components/business/TrendingBadge';
import { MetricCard } from '@/components/business/MetricCard';
import { SavesChart } from '@/components/business/SavesChart';
import { TopSaversList } from '@/components/business/TopSaversList';

export default function BusinessAnalytics() {
  const { businessProfile } = useBusinessProfile();
  const [analytics, setAnalytics] = useState<RestaurantAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (businessProfile?.restaurant_id) {
      loadAnalytics();

      // Subscribe to real-time updates
      const subscription = subscribeToRestaurantSaves(
        businessProfile.restaurant_id,
        (newCount) => {
          setAnalytics(prev => prev ? {
            ...prev,
            totalSaves: newCount,
            savesLast24h: prev.savesLast24h + 1,
          } : null);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [businessProfile?.restaurant_id]);

  const loadAnalytics = async () => {
    if (!businessProfile?.restaurant_id) return;

    const { data, error } = await getRestaurantAnalytics(
      businessProfile.restaurant_id
    );

    if (data) setAnalytics(data);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Trending Badge */}
        {analytics?.isTrending && (
          <TrendingBadge savesCount={analytics.savesLast24h} />
        )}

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Total Saves"
            value={analytics?.totalSaves || 0}
            icon="bookmark"
            trend={calculateTrend(analytics?.savesThisMonth, analytics?.totalSaves)}
          />
          <MetricCard
            title="This Month"
            value={analytics?.savesThisMonth || 0}
            icon="calendar"
          />
          <MetricCard
            title="Creator Posts"
            value={analytics?.creatorPostsCount || 0}
            icon="camera"
          />
          <MetricCard
            title="Total Engagement"
            value={analytics?.totalPostLikes || 0}
            icon="heart"
          />
        </View>

        {/* Saves Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saves Over Time</Text>
          <SavesChart data={analytics?.dailySaves || []} />
        </View>

        {/* Top Savers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Savers</Text>
          <TopSaversList savers={analytics?.topSavers || []} />
        </View>

        {/* Export Button */}
        <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
          <Download size={20} color="#fff" />
          <Text style={styles.exportButtonText}>Export Data</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
```

### Files to Create

1. **Migration**: `supabase/migrations/YYYYMMDD_restaurant_analytics.sql`
2. **Service**: `services/restaurantAnalyticsService.ts`
3. **Screen**: `app/(tabs)/business/analytics.tsx`
4. **Components**:
   - `components/business/TrendingBadge.tsx`
   - `components/business/MetricCard.tsx`
   - `components/business/SavesChart.tsx`
   - `components/business/TopSaversList.tsx`
5. **Hook**: `hooks/useBusinessProfile.ts` (if not exists)

## Definition of Done

### Sprint 1
- [ ] Analytics database function created
- [ ] Basic service layer implemented
- [ ] Metrics cards display real data
- [ ] Only claimed restaurants see Analytics tab

### Sprint 2
- [ ] Creator posts section added
- [ ] Redemption tracking (if applicable)
- [ ] Campaign ROI metrics visible

### Sprint 3
- [ ] Trending badge with >10 saves threshold
- [ ] Real-time save count updates
- [ ] CSV export functionality
- [ ] Data matches admin view (if exists)

## Notes

- Reference: CREATOR_MARKETPLACE_REVIEW.md Section 3.8
- Consider caching aggregated metrics to reduce database load
- Refresh materialized view on schedule (hourly)
- Future: Add comparison with similar restaurants
