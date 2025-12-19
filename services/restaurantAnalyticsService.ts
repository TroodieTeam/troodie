/**
 * Restaurant Analytics Service
 *
 * Provides analytics data for restaurant owners including:
 * - Total saves and trending status
 * - Mentions and creator posts
 * - Engagement metrics
 * - Daily trends
 * - Top savers
 */

import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface RestaurantAnalytics {
  totalSaves: number;
  savesThisMonth: number;
  savesLast24h: number;
  isTrending: boolean;
  mentionsCount: number;
  mentionsBreakdown?: {
    commentMentions: number;
    postCaptionMentions: number;
    postsAboutRestaurant: number;
  };
  creatorPostsCount: number;
  totalPostLikes: number;
  dailySaves: Array<{ date: string; count: number }>;
  topSavers: Array<{
    id: string;
    username: string;
    avatarUrl: string | null;
    isCreator: boolean;
    saveCount: number;
  }>;
}

export interface AnalyticsDateRange {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Get comprehensive analytics for a restaurant
 */
export async function getRestaurantAnalytics(
  restaurantId: string,
  dateRange?: AnalyticsDateRange
): Promise<{ data: RestaurantAnalytics | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('get_restaurant_analytics', {
      p_restaurant_id: restaurantId,
      p_start_date: dateRange?.startDate?.toISOString().split('T')[0] || undefined,
      p_end_date: dateRange?.endDate?.toISOString().split('T')[0] || undefined,
    });

    if (error) throw error;

    // Transform snake_case to camelCase
    const analytics: RestaurantAnalytics = {
      totalSaves: data.total_saves || 0,
      savesThisMonth: data.saves_this_month || 0,
      savesLast24h: data.saves_last_24h || 0,
      isTrending: data.is_trending || false,
      mentionsCount: data.mentions_count || 0,
      mentionsBreakdown: data.mentions_breakdown ? {
        commentMentions: data.mentions_breakdown.comment_mentions || 0,
        postCaptionMentions: data.mentions_breakdown.post_caption_mentions || 0,
        postsAboutRestaurant: data.mentions_breakdown.posts_about_restaurant || 0,
      } : undefined,
      creatorPostsCount: data.creator_posts_count || 0,
      totalPostLikes: data.total_post_likes || 0,
      dailySaves: (data.daily_saves || []).map((item: any) => ({
        date: item.date,
        count: item.count,
      })),
      topSavers: (data.top_savers || []).map((s: any) => ({
        id: s.id,
        username: s.username || 'Unknown',
        avatarUrl: s.avatar_url,
        isCreator: s.is_creator || false,
        saveCount: s.save_count || 0,
      })),
    };

    return { data: analytics, error: null };
  } catch (error) {
    console.error('Restaurant analytics error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Subscribe to real-time updates for restaurant saves
 * Updated to use board_restaurants (the actual save mechanism) instead of restaurant_saves
 */
export function subscribeToRestaurantSaves(
  restaurantId: string,
  onSave: (newCount: number) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`restaurant-saves-${restaurantId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'board_restaurants',
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      async () => {
        // Fetch updated count from board_restaurants
        const { count } = await supabase
          .from('board_restaurants')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId);

        onSave(count || 0);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Export analytics data to CSV format
 */
export function exportAnalyticsToCSV(analytics: RestaurantAnalytics): string {
  const rows: string[] = [];
  
  // Header
  rows.push('Metric,Value');
  
  // Basic metrics
  rows.push(`Total Saves,${analytics.totalSaves}`);
  rows.push(`Saves This Month,${analytics.savesThisMonth}`);
  rows.push(`Saves Last 24h,${analytics.savesLast24h}`);
  rows.push(`Is Trending,${analytics.isTrending ? 'Yes' : 'No'}`);
  rows.push(`Mentions Count,${analytics.mentionsCount}`);
  if (analytics.mentionsBreakdown) {
    rows.push(`  Comment Mentions,${analytics.mentionsBreakdown.commentMentions}`);
    rows.push(`  Post Caption Mentions,${analytics.mentionsBreakdown.postCaptionMentions}`);
    rows.push(`  Posts About Restaurant,${analytics.mentionsBreakdown.postsAboutRestaurant}`);
  }
  rows.push(`Creator Posts,${analytics.creatorPostsCount}`);
  rows.push(`Total Post Likes,${analytics.totalPostLikes}`);
  
  // Daily saves
  rows.push('');
  rows.push('Date,Saves Count');
  analytics.dailySaves.forEach((day) => {
    rows.push(`${day.date},${day.count}`);
  });
  
  // Top savers
  rows.push('');
  rows.push('Username,Save Count,Is Creator');
  analytics.topSavers.forEach((saver) => {
    rows.push(`${saver.username},${saver.saveCount},${saver.isCreator ? 'Yes' : 'No'}`);
  });
  
  return rows.join('\n');
}

