import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ActivityFeedItem {
  activity_type: 'post' | 'save' | 'follow' | 'community_join' | 'like' | 'comment';
  activity_id: string;
  actor_id: string;
  actor_name: string;
  actor_username: string;
  actor_avatar: string | null;
  actor_is_verified: boolean;
  action: string;
  target_name: string | null;
  target_id: string | null;
  target_type: 'restaurant' | 'user' | 'community' | 'post' | null;
  rating: number | null;
  content: string | null;
  photos: string[] | null;
  related_user_id: string | null;
  related_user_name: string | null;
  related_user_username: string | null;
  related_user_avatar: string | null;
  privacy: 'public' | 'friends' | 'private';
  created_at: string;
  restaurant_id: string | null; // This is varchar in the database
  cuisine_types: string[] | null;
  restaurant_location: string | null;
  community_id: string | null;
  community_name: string | null;
  board_id: string | null;
  board_name: string | null;
}

export interface ActivityFeedOptions {
  filter: 'all' | 'friends';
  limit?: number;
  offset?: number;
  afterTimestamp?: string | null;
}

class ActivityFeedService {
  private cache: Map<string, { data: ActivityFeedItem[]; expires: number }> = new Map();
  private CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
  private subscriptions: Map<string, RealtimeChannel> = new Map();

  /**
   * Get activity feed with optional filtering
   */
  async getActivityFeed(
    userId: string | null,
    options: ActivityFeedOptions
  ): Promise<{ data: ActivityFeedItem[]; error: string | null }> {
    const cacheKey = `feed_${userId || 'anon'}_${options.filter}_${options.offset || 0}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { data: cached, error: null };
    }

    try {
      const { data, error } = await supabase.rpc('get_activity_feed', {
        p_user_id: userId,
        p_filter: options.filter,
        p_limit: options.limit || 50,
        p_offset: options.offset || 0,
        p_after_timestamp: options.afterTimestamp || null,
      });

      if (error) {
        console.error('Error fetching activity feed:', error);
        return { data: [], error: error.message };
      }

      const activities = (data || []) as ActivityFeedItem[];
      this.setCache(cacheKey, activities);
      return { data: activities, error: null };
    } catch (error: any) {
      console.error('Error in getActivityFeed:', error);
      return { data: [], error: error.message || 'Failed to fetch activity feed' };
    }
  }

  /**
   * Get new activities since a timestamp (for real-time updates)
   */
  async getNewActivities(
    userId: string | null,
    afterTimestamp: string,
    filter: 'all' | 'friends' = 'all'
  ): Promise<ActivityFeedItem[]> {
    try {
      const { data, error } = await supabase.rpc('get_activity_feed', {
        p_user_id: userId,
        p_filter: filter,
        p_limit: 20,
        p_offset: 0,
        p_after_timestamp: afterTimestamp,
      });

      if (error) {
        console.error('Error fetching new activities:', error);
        return [];
      }

      return (data || []) as ActivityFeedItem[];
    } catch (error) {
      console.error('Error in getNewActivities:', error);
      return [];
    }
  }

  /**
   * Subscribe to real-time activity updates
   */
  subscribeToActivityFeed(
    userId: string | null,
    onNewActivity: (activity: ActivityFeedItem) => void
  ): () => void {
    const channelName = `activity-feed-${userId || 'global'}`;
    
    // Unsubscribe from existing channel if any
    this.unsubscribeFromActivityFeed(channelName);

    const channel = supabase
      .channel(channelName)
      // Subscribe to new posts
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        async (payload) => {
          const activity = await this.transformPostToActivity(payload.new);
          if (activity) onNewActivity(activity);
        }
      )
      // Subscribe to new follows
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_relationships',
        },
        async (payload) => {
          const activity = await this.transformFollowToActivity(payload.new);
          if (activity) onNewActivity(activity);
        }
      )
      // Subscribe to new saves
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'restaurant_saves',
        },
        async (payload) => {
          const activity = await this.transformSaveToActivity(payload.new);
          if (activity) onNewActivity(activity);
        }
      )
      // Subscribe to new community joins
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_members',
        },
        async (payload) => {
          if (payload.new.status === 'active') {
            const activity = await this.transformCommunityJoinToActivity(payload.new);
            if (activity) onNewActivity(activity);
          }
        }
      )
      // Subscribe to new likes
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_likes',
        },
        async (payload) => {
          const activity = await this.transformLikeToActivity(payload.new);
          if (activity) onNewActivity(activity);
        }
      )
      // Subscribe to new comments
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_comments',
        },
        async (payload) => {
          const activity = await this.transformCommentToActivity(payload.new);
          if (activity) onNewActivity(activity);
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, channel);

    // Return unsubscribe function
    return () => this.unsubscribeFromActivityFeed(channelName);
  }

  /**
   * Unsubscribe from activity feed updates
   */
  private unsubscribeFromActivityFeed(channelName: string): void {
    const channel = this.subscriptions.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.subscriptions.delete(channelName);
    }
  }

  /**
   * Transform a new post into an activity item
   */
  private async transformPostToActivity(post: any): Promise<ActivityFeedItem | null> {
    try {
      // Fetch user and restaurant details
      const [userResult, restaurantResult] = await Promise.all([
        supabase.from('users').select('name, username, avatar_url, is_verified').eq('id', post.user_id).single(),
        supabase.from('restaurants').select('name, cuisine_types, location').eq('id', post.restaurant_id).single(),
      ]);

      if (userResult.error || restaurantResult.error) return null;

      return {
        activity_type: 'post',
        activity_id: post.id,
        actor_id: post.user_id,
        actor_name: userResult.data.name,
        actor_username: userResult.data.username,
        actor_avatar: userResult.data.avatar_url,
        actor_is_verified: userResult.data.is_verified,
        action: 'created a review',
        target_name: restaurantResult.data.name,
        target_id: post.restaurant_id,
        target_type: 'restaurant',
        rating: post.rating,
        content: post.caption,
        photos: post.photos,
        related_user_id: null,
        related_user_name: null,
        related_user_username: null,
        related_user_avatar: null,
        privacy: post.privacy,
        created_at: post.created_at,
        restaurant_id: post.restaurant_id,
        cuisine_types: restaurantResult.data.cuisine_types,
        restaurant_location: restaurantResult.data.location,
        community_id: null,
        community_name: null,
        board_id: null,
        board_name: null,
      };
    } catch (error) {
      console.error('Error transforming post to activity:', error);
      return null;
    }
  }

  /**
   * Transform a new follow into an activity item
   */
  private async transformFollowToActivity(follow: any): Promise<ActivityFeedItem | null> {
    try {
      const [followerResult, followingResult] = await Promise.all([
        supabase.from('users').select('name, username, avatar_url, is_verified').eq('id', follow.follower_id).single(),
        supabase.from('users').select('name, username, avatar_url').eq('id', follow.following_id).single(),
      ]);

      if (followerResult.error || followingResult.error) return null;

      return {
        activity_type: 'follow',
        activity_id: follow.id,
        actor_id: follow.follower_id,
        actor_name: followerResult.data.name,
        actor_username: followerResult.data.username,
        actor_avatar: followerResult.data.avatar_url,
        actor_is_verified: followerResult.data.is_verified,
        action: 'started following',
        target_name: followingResult.data.name,
        target_id: follow.following_id,
        target_type: 'user',
        rating: null,
        content: null,
        photos: null,
        related_user_id: follow.following_id,
        related_user_name: followingResult.data.name,
        related_user_username: followingResult.data.username,
        related_user_avatar: followingResult.data.avatar_url,
        privacy: 'public',
        created_at: follow.created_at,
        restaurant_id: null,
        cuisine_types: null,
        restaurant_location: null,
        community_id: null,
        community_name: null,
        board_id: null,
        board_name: null,
      };
    } catch (error) {
      console.error('Error transforming follow to activity:', error);
      return null;
    }
  }

  /**
   * Transform a new save into an activity item
   */
  private async transformSaveToActivity(save: any): Promise<ActivityFeedItem | null> {
    try {
      if (save.privacy !== 'public') return null;

      const [userResult, restaurantResult] = await Promise.all([
        supabase.from('users').select('name, username, avatar_url, is_verified').eq('id', save.user_id).single(),
        supabase.from('restaurants').select('name, cuisine_types, location').eq('id', save.restaurant_id).single(),
      ]);

      if (userResult.error || restaurantResult.error) return null;

      return {
        activity_type: 'save',
        activity_id: save.id,
        actor_id: save.user_id,
        actor_name: userResult.data.name,
        actor_username: userResult.data.username,
        actor_avatar: userResult.data.avatar_url,
        actor_is_verified: userResult.data.is_verified,
        action: 'saved',
        target_name: restaurantResult.data.name,
        target_id: save.restaurant_id,
        target_type: 'restaurant',
        rating: save.personal_rating,
        content: save.notes,
        photos: save.photos,
        related_user_id: null,
        related_user_name: null,
        related_user_username: null,
        related_user_avatar: null,
        privacy: save.privacy,
        created_at: save.created_at,
        restaurant_id: save.restaurant_id,
        cuisine_types: restaurantResult.data.cuisine_types,
        restaurant_location: restaurantResult.data.location,
        community_id: null,
        community_name: null,
        board_id: null,
        board_name: null,
      };
    } catch (error) {
      console.error('Error transforming save to activity:', error);
      return null;
    }
  }

  /**
   * Transform a new community join into an activity item
   */
  private async transformCommunityJoinToActivity(member: any): Promise<ActivityFeedItem | null> {
    try {
      const [userResult, communityResult] = await Promise.all([
        supabase.from('users').select('name, username, avatar_url, is_verified').eq('id', member.user_id).single(),
        supabase.from('communities').select('name, description, cover_image_url, location, type').eq('id', member.community_id).single(),
      ]);

      if (userResult.error || communityResult.error || communityResult.data.type !== 'public') return null;

      return {
        activity_type: 'community_join',
        activity_id: member.id,
        actor_id: member.user_id,
        actor_name: userResult.data.name,
        actor_username: userResult.data.username,
        actor_avatar: userResult.data.avatar_url,
        actor_is_verified: userResult.data.is_verified,
        action: 'joined community',
        target_name: communityResult.data.name,
        target_id: member.community_id,
        target_type: 'community',
        rating: null,
        content: communityResult.data.description,
        photos: communityResult.data.cover_image_url ? [communityResult.data.cover_image_url] : null,
        related_user_id: null,
        related_user_name: null,
        related_user_username: null,
        related_user_avatar: null,
        privacy: 'public',
        created_at: member.joined_at,
        restaurant_id: null,
        cuisine_types: null,
        restaurant_location: communityResult.data.location,
        community_id: member.community_id,
        community_name: communityResult.data.name,
        board_id: null,
        board_name: null,
      };
    } catch (error) {
      console.error('Error transforming community join to activity:', error);
      return null;
    }
  }

  /**
   * Transform a new like into an activity item
   */
  private async transformLikeToActivity(like: any): Promise<ActivityFeedItem | null> {
    try {
      // Get post details first
      const postResult = await supabase
        .from('posts')
        .select('user_id, restaurant_id, caption, photos, rating, privacy')
        .eq('id', like.post_id)
        .single();

      if (postResult.error || postResult.data.privacy !== 'public') return null;

      const [userResult, postUserResult, restaurantResult] = await Promise.all([
        supabase.from('users').select('name, username, avatar_url, is_verified').eq('id', like.user_id).single(),
        supabase.from('users').select('name, username, avatar_url').eq('id', postResult.data.user_id).single(),
        supabase.from('restaurants').select('name, cuisine_types, location').eq('id', postResult.data.restaurant_id).single(),
      ]);

      if (userResult.error || postUserResult.error || restaurantResult.error) return null;

      return {
        activity_type: 'like',
        activity_id: like.id,
        actor_id: like.user_id,
        actor_name: userResult.data.name,
        actor_username: userResult.data.username,
        actor_avatar: userResult.data.avatar_url,
        actor_is_verified: userResult.data.is_verified,
        action: 'liked a review',
        target_name: restaurantResult.data.name,
        target_id: like.post_id,
        target_type: 'post',
        rating: postResult.data.rating,
        content: postResult.data.caption,
        photos: postResult.data.photos,
        related_user_id: postResult.data.user_id,
        related_user_name: postUserResult.data.name,
        related_user_username: postUserResult.data.username,
        related_user_avatar: postUserResult.data.avatar_url,
        privacy: postResult.data.privacy,
        created_at: like.created_at,
        restaurant_id: postResult.data.restaurant_id,
        cuisine_types: restaurantResult.data.cuisine_types,
        restaurant_location: restaurantResult.data.location,
        community_id: null,
        community_name: null,
        board_id: null,
        board_name: null,
      };
    } catch (error) {
      console.error('Error transforming like to activity:', error);
      return null;
    }
  }

  /**
   * Transform a new comment into an activity item
   */
  private async transformCommentToActivity(comment: any): Promise<ActivityFeedItem | null> {
    try {
      // Get post details first
      const postResult = await supabase
        .from('posts')
        .select('user_id, restaurant_id, photos, rating, privacy')
        .eq('id', comment.post_id)
        .single();

      if (postResult.error || postResult.data.privacy !== 'public') return null;

      const [userResult, postUserResult, restaurantResult] = await Promise.all([
        supabase.from('users').select('name, username, avatar_url, is_verified').eq('id', comment.user_id).single(),
        supabase.from('users').select('name, username, avatar_url').eq('id', postResult.data.user_id).single(),
        supabase.from('restaurants').select('name, cuisine_types, location').eq('id', postResult.data.restaurant_id).single(),
      ]);

      if (userResult.error || postUserResult.error || restaurantResult.error) return null;

      return {
        activity_type: 'comment',
        activity_id: comment.id,
        actor_id: comment.user_id,
        actor_name: userResult.data.name,
        actor_username: userResult.data.username,
        actor_avatar: userResult.data.avatar_url,
        actor_is_verified: userResult.data.is_verified,
        action: 'commented on',
        target_name: restaurantResult.data.name,
        target_id: comment.post_id,
        target_type: 'post',
        rating: postResult.data.rating,
        content: comment.content,
        photos: postResult.data.photos,
        related_user_id: postResult.data.user_id,
        related_user_name: postUserResult.data.name,
        related_user_username: postUserResult.data.username,
        related_user_avatar: postUserResult.data.avatar_url,
        privacy: postResult.data.privacy,
        created_at: comment.created_at,
        restaurant_id: postResult.data.restaurant_id,
        cuisine_types: restaurantResult.data.cuisine_types,
        restaurant_location: restaurantResult.data.location,
        community_id: null,
        community_name: null,
        board_id: null,
        board_name: null,
      };
    } catch (error) {
      console.error('Error transforming comment to activity:', error);
      return null;
    }
  }

  /**
   * Format time ago helper
   */
  formatTimeAgo(date: string): string {
    const now = new Date();
    const past = new Date(date);
    const diffInMs = now.getTime() - past.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);

    if (diffInMinutes < 1) {
      return 'just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d`;
    } else if (diffInWeeks < 4) {
      return `${diffInWeeks}w`;
    } else {
      return `${diffInMonths}mo`;
    }
  }

  // Cache management methods
  private getFromCache(key: string): ActivityFeedItem[] | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: ActivityFeedItem[]): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + this.CACHE_DURATION,
    });
  }

  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clean up all subscriptions
   */
  cleanup(): void {
    this.subscriptions.forEach((channel, name) => {
      supabase.removeChannel(channel);
    });
    this.subscriptions.clear();
    this.clearCache();
  }
}

export const activityFeedService = new ActivityFeedService();