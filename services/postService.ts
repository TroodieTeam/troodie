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
import { IntelligentCoverPhotoService } from './intelligentCoverPhotoService';
import { restaurantImageSyncService } from './restaurantImageSyncService';

class PostService {
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
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Only require restaurant_id for restaurant posts (simple posts can have null)
    const insertData: any = {
      user_id: user.id,
      restaurant_id: postData.restaurantId || null, // Optional for simple posts
      post_type: postData.postType || 'simple', // Add post_type field
      caption: postData.caption,
      photos: postData.photos,
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
    const { data, error } = await supabase
      .from('posts')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create post: ${error.message}`);
    }

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

    return data;
  }

  /**
   * Get a single post by ID
   */
  async getPost(postId: string): Promise<PostWithUser | null> {
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
      } : null, // Return null for simple posts without restaurant data
    };
  }

  /**
   * Get posts for a specific user
   */
  async getUserPosts(userId: string, limit: number = 20, offset: number = 0): Promise<PostWithUser[]> {
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
        } : null, // Return null instead of fake restaurant data
      };
    });
  }

  /**
   * Get posts for explore feed with filters
   */
  async getExplorePosts(filters: ExploreFilters = {}): Promise<PostWithUser[]> {
    let query = supabase
      .from('posts')
      .select('*')
      .eq('privacy', 'public');

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
    
    // Fetch user data
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .in('id', userIds);

    if (usersError) {
      // Handle error silently
      throw usersError;
    }

    // Fetch restaurant data
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

    // Create a map of users for quick lookup
    const usersMap = new Map(usersData?.map(user => [user.id, user]) || []);

    // Combine posts with user and restaurant data
    return postsData.map(post => {
      const userData = usersMap.get(post.user_id);
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
        } : null, // Return null instead of fake restaurant data
      };
    });
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
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) {
      throw new Error(`Failed to delete post: ${error.message}`);
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
   */
  async isPostLikedByUser(postId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // Handle error silently
    }

    return !!data;
  }

  /**
   * Check if user has saved a post
   */
  async isPostSavedByUser(postId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('post_saves')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // Handle error silently
    }

    return !!data;
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