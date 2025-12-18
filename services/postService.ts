import { supabase } from '@/lib/supabase';
import { RestaurantInfo, UserInfo } from '@/types/core';
import {
    ExploreFilters,
    Post,
    PostCreationData,
    PostSearchFilters,
    PostStats,
    PostUpdate,
    PostWithUser,
    TrendingPost
} from '@/types/post';
import { eventBus, EVENTS } from '@/utils/eventBus';
import { IntelligentCoverPhotoService } from './intelligentCoverPhotoService';
import { moderationService } from './moderationService';
import { restaurantImageSyncService } from './restaurantImageSyncService';
import { restaurantVisitService } from './restaurantVisitService';

class PostService {
  /**
   * @deprecated Use engagementService.batchGetEngagementStats() instead
   * This method is kept temporarily for backward compatibility during migration
   */
  private async calculateEngagementCounts(postIds: string[]): Promise<{
    commentCounts: Map<string, number>;
    likeCounts: Map<string, number>;
    saveCounts: Map<string, number>;
  }> {
    // Use unified engagement service for accurate counts
    const { engagementService } = await import('@/services/engagement');
    const statsMap = await engagementService.batchGetEngagementStats(postIds);
    
    const commentCounts = new Map<string, number>();
    const likeCounts = new Map<string, number>();
    const saveCounts = new Map<string, number>();
    
    statsMap.forEach((stats, postId) => {
      commentCounts.set(postId, stats.comments_count || 0);
      likeCounts.set(postId, stats.likes_count || 0);
      saveCounts.set(postId, stats.saves_count || 0);
    });
    
    return { commentCounts, likeCounts, saveCounts };
  }

  /**
   * Get a single post by ID
   */
  async getPostById(postId: string): Promise<PostWithUser | null> {
    try {
      // Use the same approach as getPost method to avoid foreign key issues
      return await this.getPost(postId);
    } catch (error) {
      throw error;
    }
  }
  /**
   * Helper to transform user data from DB to UserInfo type
   */
  private transformUser(post: any): UserInfo {
    if (post.user) {
      return {
        id: post.user.id, // Keep as string UUID
        name: post.user.name || post.user.username || 'Unknown User',
        username: post.user.username || 'unknown',
        avatar: post.user.avatar_url || 'https://i.pravatar.cc/150?img=1',
        persona: post.user.persona || 'Food Explorer',
        verified: post.user.is_verified || false,
      };
    } else {
      return {
        id: post.user_id,
        name: 'Unknown User',
        username: 'unknown',
        avatar: 'https://i.pravatar.cc/150?img=1',
        persona: 'Food Explorer',
        verified: false,
      };
    }
  }

  /**
   * Helper to transform restaurant data
   */
  private transformRestaurant(post: any): RestaurantInfo | null {
    // Return null if there's no restaurant_id
    if (!post.restaurant_id) {
      return null;
    }
    
    return {
      id: post.restaurant_id,
      name: 'Restaurant', // This should be fetched from restaurants table
      image: post.photos?.[0] || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800',
      cuisine: 'Restaurant',
      rating: post.rating || 0,
      location: 'Location',
      priceRange: post.price_range || '$$',
    };
  }

  /**
   * Create a new post
   */
  async createPost(postData: PostCreationData): Promise<Post> {
    console.log('[PostService] createPost called with data:', JSON.stringify(postData, null, 2));

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    console.log('[PostService] Current user:', user?.id);

    if (!user) {
      console.error('[PostService] User not authenticated');
      throw new Error('User not authenticated');
    }

    // Only require restaurant_id for restaurant posts (simple posts can have null)
    const insertData: any = {
      user_id: user.id,
      restaurant_id: postData.restaurantId || null, // Optional for simple posts
      post_type: postData.postType || 'simple', // Add post_type field
      caption: postData.caption,
      photos: postData.photos,
      videos: postData.videos,
      rating: postData.rating,
      visit_date: postData.visitDate?.toISOString().split('T')[0],
      price_range: postData.priceRange,
      visit_type: postData.visitType,
      tags: postData.tags,
      privacy: postData.privacy || 'public',
      location_lat: postData.locationLat,
      location_lng: postData.locationLng,
      content_type: postData.contentType || 'original',
    };

    console.log('[PostService] Insert data:', JSON.stringify(insertData, null, 2));

    // Add external content fields if applicable
    if (postData.contentType === 'external' && postData.externalContent) {
      insertData.external_source = postData.externalContent.source;
      insertData.external_url = postData.externalContent.url;
      insertData.external_title = postData.externalContent.title;
      insertData.external_description = postData.externalContent.description;
      insertData.external_thumbnail = postData.externalContent.thumbnail;
      insertData.external_author = postData.externalContent.author;
    }

    // Create the post
    console.log('[PostService] Inserting post into database...');
    const { data, error } = await supabase
      .from('posts')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[PostService] Failed to create post:', error);
      throw new Error(`Failed to create post: ${error.message}`);
    }

    console.log('[PostService] Post created successfully:', data.id);

    // Handle cross-posting to communities
    if (data && postData.communityIds && postData.communityIds.length > 0) {
      try {
        const { data: crossPostResults, error: crossPostError } = await supabase
          .rpc('cross_post_to_communities', {
            p_post_id: data.id,
            p_community_ids: postData.communityIds,
            p_user_id: user.id
          });

        if (crossPostError) {
          // Check if it's just a missing function error
          if (crossPostError.code === 'PGRST202' || crossPostError.message?.includes('Could not find the function')) {
            // Try fallback to direct insert
            let successCount = 0;
            for (const communityId of postData.communityIds) {
              try {
                const { data: insertResult, error: insertError } = await supabase
                  .from('post_communities')
                  .insert({
                    post_id: data.id,
                    community_id: communityId,
                    added_by: user.id
                  })
                  .select();
                
                if (insertError) {
                  // Handle error silently
                } else {
                  successCount++;
                }
              } catch (err) {
                // Handle error silently
              }
            }
          } else {
            // Handle other errors silently
          }
          // Don't fail the whole post creation, just log the error
        } else {
          // Log successful cross-posts (handle both old and new column names)
          const successful = crossPostResults?.filter((r: any) => r.success || r.result_success) || [];
          const failed = crossPostResults?.filter((r: any) => !(r.success || r.result_success)) || [];
          
          // Handle success and failed cross-posts silently
        }
      } catch (crossPostError) {
        // Continue anyway - the main post was created successfully
      }
    }

    // Legacy single community support (for backward compatibility)
    if (data && postData.communityId && !postData.communityIds) {
      try {
        const { error: legacyCrossPostError } = await supabase
          .from('post_communities')
          .insert({
            post_id: data.id,
            community_id: postData.communityId,
            added_by: user.id
          });

        if (legacyCrossPostError) {
          // Handle error silently
        }
      } catch (err) {
        // Handle error silently
      }
    }

    // If post has photos and a restaurant, sync images and trigger cover photo update
    if (data && postData.photos && postData.photos.length > 0 && postData.restaurantId) {
      // Sync images to restaurant gallery
      try {
        const synced = await restaurantImageSyncService.syncPostImages(data.id);
        if (!synced) {
          // Handle sync failure silently
        }
        
        // Trigger intelligent cover photo update
        const coverPhotoService = IntelligentCoverPhotoService.getInstance();
        coverPhotoService.handleNewPostImages(data.id, postData.restaurantId);
      } catch (error) {
        // Don't fail the post creation, just handle the error silently
      }
    }

    // Mark restaurant as visited when a restaurant review is posted
    if (data && postData.restaurantId && postData.postType === 'restaurant') {
      try {
        await restaurantVisitService.markRestaurantAsVisited(
          user.id,
          postData.restaurantId,
          data.id,
          'review'
        );
        console.log('[PostService] Restaurant marked as visited:', postData.restaurantId);
      } catch (error) {
        // Don't fail the post creation if visit tracking fails
        console.error('[PostService] Error marking restaurant as visited:', error);
      }
    }

    return data;
  }

  /**
   * Get a single post by ID
   */
  async getPost(postId: string): Promise<PostWithUser | null> {
    // Get current user ID for checking likes/saves
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;
    
    const { data: postData, error: postError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (postError) {
      return null;
    }

    if (!postData) {
      return null;
    }

    // Fetch user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', postData.user_id)
      .single();

    if (userError) {
      // Handle error silently
    }

    // Fetch restaurant data
    let restaurantData = null;
    if (postData.restaurant_id) {
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id, name, address, cuisine_types, price_range, cover_photo_url')
        .eq('id', postData.restaurant_id)
        .single();
      
      if (!restaurantError && restaurant) {
        restaurantData = restaurant;
      }
    }

    // Get engagement stats using unified service (single source of truth)
    const { engagementService } = await import('@/services/engagement');
    const engagementStats = await engagementService.getEngagementStats(postId, currentUserId || undefined);

    // Override stale column values with actual counts
    postData.comments_count = engagementStats.comments_count || 0;
    postData.likes_count = engagementStats.likes_count || 0;
    postData.saves_count = engagementStats.saves_count || 0;
    postData.share_count = engagementStats.share_count || 0;

    // Use engagement service for user-specific status
    const isLiked = engagementStats.is_liked_by_user || false;
    const isSaved = engagementStats.is_saved_by_user || false;

    // Transform to PostWithUser format
    return {
      ...postData,
      user: userData ? this.transformUser({ user: userData }) : this.transformUser(postData),
      restaurant: restaurantData ? {
        id: restaurantData.id,
        name: restaurantData.name,
        image: restaurantData.cover_photo_url || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800',
        cuisine: restaurantData.cuisine_types?.[0] || 'Restaurant',
        rating: postData.rating || 0,
        location: restaurantData.address || 'Location',
        priceRange: restaurantData.price_range || postData.price_range || '$$',
      } : null,
      is_liked_by_user: isLiked,
      is_saved_by_user: isSaved,
    };
  }

  /**
   * Get posts for a specific user
   */
  async getUserPosts(userId: string, limit: number = 20, offset: number = 0, excludeBlocked: boolean = false): Promise<PostWithUser[]> {
    // Check if the user is blocked if excludeBlocked is true
    if (excludeBlocked) {
      const isBlocked = await moderationService.isUserBlocked(userId);
      if (isBlocked) {
        return [];
      }
    }

    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (postsError) {
      return [];
    }

    if (!postsData || postsData.length === 0) {
      return [];
    }

    // Fetch user data (should be just one user)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      // Handle error silently
    }

    // Get unique restaurant IDs
    const restaurantIds = [...new Set(postsData.map(post => post.restaurant_id).filter(id => id))];
    
    // Fetch restaurant data if we have IDs
    let restaurantsMap = new Map();
    if (restaurantIds.length > 0) {
      const { data: restaurantsData } = await supabase
        .from('restaurants')
        .select('id, name, address, cuisine_types, price_range, cover_photo_url')
        .in('id', restaurantIds);
      
      if (restaurantsData) {
        restaurantsMap = new Map(restaurantsData.map(r => [r.id, r]));
      }
    }

    // Get current user ID for checking likes/saves
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    // Fetch like and save status for current user if logged in
    let likedPostIds = new Set<string>();
    let savedPostIds = new Set<string>();
    
    if (currentUserId) {
      const postIds = postsData.map(post => post.id);
      
      // Check like status
      const { data: likesData } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', currentUserId)
        .in('post_id', postIds);
      
      if (likesData) {
        likedPostIds = new Set(likesData.map(like => like.post_id));
      }
      
      // Check save status
      const { data: savesData } = await supabase
        .from('post_saves')
        .select('post_id')
        .eq('user_id', currentUserId)
        .in('post_id', postIds);
      
      if (savesData) {
        savedPostIds = new Set(savesData.map(save => save.post_id));
      }
    }

    // Get engagement stats using unified service (single source of truth)
    const postIds = postsData.map(post => post.id);
    const { engagementService } = await import('@/services/engagement');
    const engagementStatsMap = await engagementService.batchGetEngagementStats(postIds, currentUserId || undefined);

    // Override all counts with calculated values
    postsData.forEach((post: any) => {
      const stats = engagementStatsMap.get(post.id);
      if (stats) {
        post.comments_count = stats.comments_count || 0;
        post.likes_count = stats.likes_count || 0;
        post.saves_count = stats.saves_count || 0;
        post.share_count = stats.share_count || 0;
        post.is_liked_by_user = stats.is_liked_by_user;
        post.is_saved_by_user = stats.is_saved_by_user;
      }
    });

    return postsData.map(post => {
      const restaurantData = restaurantsMap.get(post.restaurant_id);
      return {
        ...post,
        user: userData ? this.transformUser({ user: userData }) : this.transformUser(post),
        restaurant: restaurantData ? {
          id: restaurantData.id,
          name: restaurantData.name,
          image: restaurantData.cover_photo_url || post.photos?.[0] || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800',
          cuisine: restaurantData.cuisine_types?.[0] || 'Restaurant',
          rating: post.rating || 0,
          location: restaurantData.address || 'Location',
          priceRange: restaurantData.price_range || post.price_range || '$$',
        } : null,
        is_liked_by_user: likedPostIds.has(post.id),
        is_saved_by_user: savedPostIds.has(post.id),
      };
    });
  }

  /**
   * Get posts for explore feed with filters
   */
  async getExplorePosts(filters: ExploreFilters = {}): Promise<PostWithUser[]> {
    // Get blocked users list first
    const blockedUserIds = await moderationService.getBlockedUsers();
    
    // Get current user ID for checking likes/saves
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;
    const currentUserEmail = user?.email;
    
    let query = supabase
      .from('posts')
      .select('*')
      .eq('privacy', 'public');

    // Exclude posts from blocked users
    if (blockedUserIds.length > 0) {
      query = query.not('user_id', 'in', `(${blockedUserIds.join(',')})`);
    }

    // ALWAYS exclude posts from test users (test accounts should never be visible in explore)
    // Get test user IDs
    const { data: testUsers, error: testUsersError } = await supabase
      .from('users')
      .select('id, email, is_test_account')
      .eq('is_test_account', true);
    
    if (testUsersError) {
      // Silently continue - test user filtering is best-effort
    }
    
    if (testUsers && testUsers.length > 0) {
      const testUserIds = testUsers.map(u => u.id);
      
      // Use .not() with 'in' operator - correct Supabase syntax
      query = query.not('user_id', 'in', `(${testUserIds.join(',')})`);
    }

    // Apply filters
    if (filters.filter === 'Trending') {
      query = query.eq('is_trending', true);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
    }

    const { data: postsData, error: postsError } = await query.order('created_at', { ascending: false });

    if (postsError) {
      throw postsError;
    }
    
    if (!postsData || postsData.length === 0) {
      return [];
    }

    // Get unique user IDs and restaurant IDs
    const userIds = [...new Set(postsData.map(post => post.user_id))];
    const restaurantIds = [...new Set(postsData.map(post => post.restaurant_id).filter(id => id))];
    const postIds = postsData.map(post => post.id);

    // Get engagement stats using unified service (single source of truth)
    const { engagementService } = await import('@/services/engagement');
    const engagementStatsMap = await engagementService.batchGetEngagementStats(postIds, currentUserId || undefined);

    // Override all counts with calculated values (always accurate, no stale data)
    postsData.forEach((post: any) => {
      const stats = engagementStatsMap.get(post.id);
      if (stats) {
        const calculatedComments = stats.comments_count || 0;
        const calculatedLikes = stats.likes_count || 0;
        const calculatedSaves = stats.saves_count || 0;
        
        if (__DEV__) {
          const postIdShort = post.id.substring(0, 8) + '...';
          console.log(`[postService.getExplorePosts] Post ${postIdShort}: comments=${calculatedComments} (was ${post.comments_count}), likes=${calculatedLikes}, saves=${calculatedSaves}`);
        }
        
        post.comments_count = calculatedComments;
        post.likes_count = calculatedLikes;
        post.saves_count = calculatedSaves;
        post.share_count = stats.share_count || 0;
        post.is_liked_by_user = stats.is_liked_by_user;
        post.is_saved_by_user = stats.is_saved_by_user;
      }
    });
    
    if (__DEV__) {
      console.log(`[postService.getExplorePosts] ✅ Returning ${postsData.length} posts with calculated counts`);
    }
    
    // Fetch user data (always filter test users as a safety check)
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .in('id', userIds)
      .eq('is_test_account', false); // Always exclude test users
    
    if (usersError) {
      throw usersError;
    }
    
    // Create a map of raw user data for logging
    const rawUsersMap = new Map(usersData?.map(user => [user.id, user]) || []);

    if (usersError) {
      throw usersError;
    }

    // Fetch restaurant data (exclude test restaurants if current user is not a test user)
    let restaurantsMap = new Map();
    if (restaurantIds.length > 0) {
      let restaurantQuery = supabase
        .from('restaurants')
        .select('id, name, address, cuisine_types, price_range, cover_photo_url')
        .in('id', restaurantIds);
      
      // Always exclude test restaurants
      restaurantQuery = restaurantQuery.eq('is_test_restaurant', false);
      
      const { data: restaurantsData } = await restaurantQuery;
      
      if (restaurantsData) {
        restaurantsMap = new Map(restaurantsData.map(r => [r.id, r]));
      }
    }

    // Fetch like and save status for current user
    let likedPostIds = new Set<string>();
    let savedPostIds = new Set<string>();
    
    if (currentUserId && postIds.length > 0) {
      // Get liked posts
      const { data: likedPosts } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', currentUserId)
        .in('post_id', postIds);
      
      if (likedPosts) {
        likedPostIds = new Set(likedPosts.map(l => l.post_id));
      }
      
      // Get saved posts
      const { data: savedPosts } = await supabase
        .from('post_saves')
        .select('post_id')
        .eq('user_id', currentUserId)
        .in('post_id', postIds);
      
      if (savedPosts) {
        savedPostIds = new Set(savedPosts.map(s => s.post_id));
      }
    }

    // Create a map of users for quick lookup
    const usersMap = new Map(usersData?.map(user => [user.id, user]) || []);

    // Combine posts with user and restaurant data, including like/save status
    const result = postsData
      .map(post => {
        const userData = usersMap.get(post.user_id);
        const rawUserData = rawUsersMap.get(post.user_id);
        
        // Skip posts from test users (final safety check - always filter)
        if (rawUserData && rawUserData.is_test_account === true) {
          return null;
        }
        
        const restaurantData = restaurantsMap.get(post.restaurant_id);
        return {
          ...post,
          user: userData ? this.transformUser({ user: userData }) : this.transformUser(post),
          restaurant: restaurantData ? {
            id: restaurantData.id,
            name: restaurantData.name,
            image: restaurantData.cover_photo_url || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800',
            cuisine: restaurantData.cuisine_types?.[0] || 'Restaurant',
            rating: post.rating || 0,
            location: restaurantData.address || 'Location',
            priceRange: restaurantData.price_range || post.price_range || '$$',
          } : null,
          is_liked_by_user: currentUserId ? likedPostIds.has(post.id) : false,
          is_saved_by_user: currentUserId ? savedPostIds.has(post.id) : false,
        };
      })
      .filter((post): post is PostWithUser => post !== null);
    
    return result;
  }

  /**
   * Update a post
   */
  async updatePost(postId: string, updates: Partial<PostUpdate>): Promise<Post> {
    const { data, error } = await supabase
      .from('posts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update post: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a post
   */
  async deletePost(postId: string): Promise<void> {
    // First get the post's community_ids from post_communities junction table before deletion
    const { data: postCommunities, error: fetchError } = await supabase
      .from('post_communities')
      .select('community_id')
      .eq('post_id', postId);

    if (fetchError) {
      // Don't throw - continue with deletion even if we can't fetch communities
      // The post might not be in any communities
    }

    const communityIds = postCommunities?.map(pc => pc.community_id) || [];

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) {
      throw new Error(`Failed to delete post: ${error.message}`);
    }

    // Emit deletion event for each community the post was in
    if (communityIds.length > 0) {
      communityIds.forEach((communityId: string) => {
        eventBus.emit(EVENTS.COMMUNITY_POST_DELETED, {
          postId,
          communityId
        });
      });
    }
  }

  /**
   * Get trending posts
   */
  async getTrendingPosts(limit: number = 10): Promise<TrendingPost[]> {
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('is_trending', true)
      .eq('privacy', 'public')
      .order('likes_count', { ascending: false })
      .limit(limit);

    if (postsError) {
      return [];
    }

    if (!postsData || postsData.length === 0) {
      return [];
    }

    // Get unique user IDs
    const userIds = [...new Set(postsData.map(post => post.user_id))];
    
    // Fetch user data
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .in('id', userIds);

    if (usersError) {
      // Handle error silently
    }

    // Create a map of users for quick lookup
    const usersMap = new Map(usersData?.map(user => [user.id, user]) || []);

    // Get engagement stats using unified service (single source of truth)
    const postIds = postsData.map(post => post.id);
    const { engagementService } = await import('@/services/engagement');
    const engagementStatsMap = await engagementService.batchGetEngagementStats(postIds, currentUserId || undefined);

    // Override all counts with calculated values
    postsData.forEach((post: any) => {
      const stats = engagementStatsMap.get(post.id);
      if (stats) {
        post.comments_count = stats.comments_count || 0;
        post.likes_count = stats.likes_count || 0;
        post.saves_count = stats.saves_count || 0;
        post.share_count = stats.share_count || 0;
        post.is_liked_by_user = stats.is_liked_by_user;
        post.is_saved_by_user = stats.is_saved_by_user;
      }
    });

    return postsData.map(post => {
      const userData = usersMap.get(post.user_id);
      return {
        ...post,
        user: userData ? this.transformUser({ user: userData }) : this.transformUser(post),
        restaurant: null, // Return null for simple posts without restaurant data
        trending_score: post.likes_count + post.comments_count + post.saves_count,
        engagement_rate: ((post.likes_count + post.comments_count + post.saves_count) / 100) * 100,
      };
    });
  }

  /**
   * Search posts
   */
  async searchPosts(filters: PostSearchFilters): Promise<PostWithUser[]> {
    let query = supabase
      .from('posts')
      .select('*')
      .eq('privacy', 'public');

    // Apply filters
    if (filters.query) {
      query = query.or(`caption.ilike.%${filters.query}%,tags.cs.{${filters.query}}`);
    }

    if (filters.restaurantId) {
      query = query.eq('restaurant_id', filters.restaurantId);
    }

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters.rating) {
      query = query.eq('rating', filters.rating);
    }

    if (filters.visitType) {
      query = query.eq('visit_type', filters.visitType);
    }

    if (filters.priceRange) {
      query = query.eq('price_range', filters.priceRange);
    }

    if (filters.privacy) {
      query = query.eq('privacy', filters.privacy);
    }

    if (filters.trending) {
      query = query.eq('is_trending', true);
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom.toISOString());
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo.toISOString());
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
    }

    const { data: postsData, error: postsError } = await query.order('created_at', { ascending: false });

    if (postsError) {
      return [];
    }

    if (!postsData || postsData.length === 0) {
      return [];
    }

    // Get unique user IDs
    const userIds = [...new Set(postsData.map(post => post.user_id))];
    
    // Fetch user data
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .in('id', userIds);

    if (usersError) {
      // Handle error silently
    }

    // Create a map of users for quick lookup
    const usersMap = new Map(usersData?.map(user => [user.id, user]) || []);

    // Get engagement stats using unified service (single source of truth)
    const postIds = postsData.map(post => post.id);
    const { engagementService } = await import('@/services/engagement');
    const engagementStatsMap = await engagementService.batchGetEngagementStats(postIds, currentUserId || undefined);

    // Override all counts with calculated values
    postsData.forEach((post: any) => {
      const stats = engagementStatsMap.get(post.id);
      if (stats) {
        post.comments_count = stats.comments_count || 0;
        post.likes_count = stats.likes_count || 0;
        post.saves_count = stats.saves_count || 0;
        post.share_count = stats.share_count || 0;
        post.is_liked_by_user = stats.is_liked_by_user;
        post.is_saved_by_user = stats.is_saved_by_user;
      }
    });

    return postsData.map(post => {
      const userData = usersMap.get(post.user_id);
      return {
        ...post,
        user: userData ? this.transformUser({ user: userData }) : this.transformUser(post),
        restaurant: null, // Return null for simple posts without restaurant data
      };
    });
  }

  /**
   * Get post statistics for a user
   */
  async getUserPostStats(userId: string): Promise<PostStats> {
    const { data, error } = await supabase
      .from('posts')
      .select('likes_count, comments_count, saves_count, rating')
      .eq('user_id', userId);

    if (error) {
      return {
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        totalSaves: 0,
        averageRating: 0,
      };
    }

    const stats = data.reduce(
      (acc, post) => ({
        totalPosts: acc.totalPosts + 1,
        totalLikes: acc.totalLikes + (post.likes_count || 0),
        totalComments: acc.totalComments + (post.comments_count || 0),
        totalSaves: acc.totalSaves + (post.saves_count || 0),
        averageRating: acc.averageRating + (post.rating || 0),
      }),
      {
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        totalSaves: 0,
        averageRating: 0,
      }
    );

    return {
      ...stats,
      averageRating: stats.totalPosts > 0 ? stats.averageRating / stats.totalPosts : 0,
    };
  }

  /**
   * Check if user has liked a post
   * @deprecated Use engagementService.likes.isLiked() instead
   */
  async isPostLikedByUser(postId: string, userId: string): Promise<boolean> {
    const { engagementService } = await import('@/services/engagement');
    return engagementService.likes.isLiked(postId, userId);
  }

  /**
   * Check if user has saved a post
   * @deprecated Use engagementService.saves.isSaved() instead
   */
  async isPostSavedByUser(postId: string, userId: string): Promise<boolean> {
    const { engagementService } = await import('@/services/engagement');
    return engagementService.saves.isSaved(postId, userId);
  }

  /**
   * Get external content sources
   */
  async getExternalContentSources() {
    const { data, error } = await supabase
      .from('external_content_sources')
      .select('*')
      .eq('is_supported', true)
      .order('name');

    if (error) {
      return [];
    }

    return data || [];
  }

  /**
   * Get posts filtered by content type
   */
  async getPostsByContentType(
    contentType: 'original' | 'external',
    filters: ExploreFilters = {}
  ): Promise<PostWithUser[]> {
    let query = supabase
      .from('posts')
      .select('*')
      .eq('privacy', 'public')
      .eq('content_type', contentType);

    // Apply additional filters
    if (filters.filter === 'Trending') {
      query = query.eq('is_trending', true);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
    }

    const { data: postsData, error: postsError } = await query.order('created_at', { ascending: false });

    if (postsError) {
      return [];
    }

    if (!postsData || postsData.length === 0) {
      return [];
    }

    // Get unique user IDs
    const userIds = [...new Set(postsData.map(post => post.user_id))];
    
    // Fetch user data
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .in('id', userIds);

    if (usersError) {
      // Handle error silently
    }

    // Create a map of users for quick lookup
    const usersMap = new Map(usersData?.map(user => [user.id, user]) || []);

    // Get engagement stats using unified service (single source of truth)
    const postIds = postsData.map(post => post.id);
    const { engagementService } = await import('@/services/engagement');
    const engagementStatsMap = await engagementService.batchGetEngagementStats(postIds, currentUserId || undefined);

    // Override all counts with calculated values
    postsData.forEach((post: any) => {
      const stats = engagementStatsMap.get(post.id);
      if (stats) {
        post.comments_count = stats.comments_count || 0;
        post.likes_count = stats.likes_count || 0;
        post.saves_count = stats.saves_count || 0;
        post.share_count = stats.share_count || 0;
        post.is_liked_by_user = stats.is_liked_by_user;
        post.is_saved_by_user = stats.is_saved_by_user;
      }
    });

    // Combine posts with user data
    return postsData.map(post => {
      const userData = usersMap.get(post.user_id);
      return {
        ...post,
        user: userData ? this.transformUser({ user: userData }) : this.transformUser(post),
        restaurant: null, // Return null for simple posts without restaurant data
      };
    });
  }

  /**
   * Get posts by external source
   */
  async getPostsByExternalSource(source: string, limit: number = 20): Promise<PostWithUser[]> {
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('privacy', 'public')
      .eq('content_type', 'external')
      .eq('external_source', source)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (postsError) {
      return [];
    }

    if (!postsData || postsData.length === 0) {
      return [];
    }

    // Get unique user IDs
    const userIds = [...new Set(postsData.map(post => post.user_id))];
    
    // Fetch user data
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .in('id', userIds);

    if (usersError) {
      // Handle error silently
    }

    // Create a map of users for quick lookup
    const usersMap = new Map(usersData?.map(user => [user.id, user]) || []);

    // Get engagement stats using unified service (single source of truth)
    const postIds = postsData.map(post => post.id);
    const { engagementService } = await import('@/services/engagement');
    const engagementStatsMap = await engagementService.batchGetEngagementStats(postIds, currentUserId || undefined);

    // Override all counts with calculated values
    postsData.forEach((post: any) => {
      const stats = engagementStatsMap.get(post.id);
      if (stats) {
        post.comments_count = stats.comments_count || 0;
        post.likes_count = stats.likes_count || 0;
        post.saves_count = stats.saves_count || 0;
        post.share_count = stats.share_count || 0;
        post.is_liked_by_user = stats.is_liked_by_user;
        post.is_saved_by_user = stats.is_saved_by_user;
      }
    });

    // Combine posts with user data
    return postsData.map(post => {
      const userData = usersMap.get(post.user_id);
      return {
        ...post,
        user: userData ? this.transformUser({ user: userData }) : this.transformUser(post),
        restaurant: null, // Return null for simple posts without restaurant data
      };
    });
  }
}

export const postService = new PostService(); 