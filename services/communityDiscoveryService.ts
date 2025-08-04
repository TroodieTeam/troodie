import { supabase, FeaturedCommunity, TrendingCommunity, RecommendedCommunity } from '@/lib/supabase';

interface CommunityDiscoveryCache {
  featured: { data: FeaturedCommunity[]; expires: number } | null;
  trending: Map<string, { data: TrendingCommunity[]; expires: number }>;
  recommended: Map<string, { data: RecommendedCommunity[]; expires: number }>;
}

class CommunityDiscoveryService {
  private cache: CommunityDiscoveryCache = {
    featured: null,
    trending: new Map(),
    recommended: new Map()
  };
  
  private readonly CACHE_DURATION = {
    featured: 30 * 60 * 1000, // 30 minutes for featured
    trending: 10 * 60 * 1000, // 10 minutes for trending
    recommended: 5 * 60 * 1000  // 5 minutes for personalized
  };

  /**
   * Get featured communities
   */
  async getFeaturedCommunities(limit: number = 5): Promise<FeaturedCommunity[]> {
    // Check cache
    if (this.cache.featured && Date.now() < this.cache.featured.expires) {
      return this.cache.featured.data;
    }

    try {
      // First, check if RPC function exists by trying a direct query
      const { data: directData, error: directError } = await supabase
        .from('communities')
        .select('*')
        .eq('is_featured', true)
        .eq('is_active', true)
        .limit(limit);
      
      if (!directError && directData) {
        // If direct query works, try RPC
      }

      const { data, error } = await supabase.rpc('get_featured_communities', {
        p_limit: limit
      });

      if (error) {
        console.error('RPC error for get_featured_communities:', error);
        // Fall back to direct query if RPC fails
        if (!directError && directData) {
          const communities = directData.map(c => ({
            ...c,
            tags: c.tags || [],
            cuisines: c.cuisines || []
          }));
          
          this.cache.featured = {
            data: communities,
            expires: Date.now() + this.CACHE_DURATION.featured
          };
          return communities as FeaturedCommunity[];
        }
        throw error;
      }

      const communities = data || [];
      
      // Cache the results
      this.cache.featured = {
        data: communities,
        expires: Date.now() + this.CACHE_DURATION.featured
      };

      return communities;
    } catch (error) {
      console.error('Error fetching featured communities:', error);
      return [];
    }
  }

  /**
   * Get trending communities for a location
   */
  async getTrendingCommunities(
    location?: string | null,
    limit: number = 10
  ): Promise<TrendingCommunity[]> {
    const cacheKey = location || 'global';
    
    // Check cache
    const cached = this.cache.trending.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }

    try {
      // First try direct query as fallback
      const { data: directData, error: directError } = await supabase
        .from('communities')
        .select('*')
        .eq('is_active', true)
        .order('trending_score', { ascending: false })
        .limit(limit);
      
      if (!directError && directData) {
      }

      const { data, error } = await supabase.rpc('get_trending_communities', {
        p_location: location,
        p_limit: limit
      });

      if (error) {
        console.error('RPC error for get_trending_communities:', error);
        // Fall back to direct query
        if (!directError && directData) {
          const communities = directData.map(c => ({
            ...c,
            tags: c.tags || [],
            cuisines: c.cuisines || [],
            trending_score: c.trending_score || 0
          }));
          
          this.cache.trending.set(cacheKey, {
            data: communities,
            expires: Date.now() + this.CACHE_DURATION.trending
          });
          return communities as TrendingCommunity[];
        }
        throw error;
      }

      const communities = data || [];
      
      // Cache the results
      this.cache.trending.set(cacheKey, {
        data: communities,
        expires: Date.now() + this.CACHE_DURATION.trending
      });

      return communities;
    } catch (error) {
      console.error('Error fetching trending communities:', error);
      return [];
    }
  }

  /**
   * Get personalized community recommendations for a user
   */
  async getRecommendedCommunities(
    userId: string,
    limit: number = 10
  ): Promise<RecommendedCommunity[]> {
    // Check cache
    const cached = this.cache.recommended.get(userId);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }

    try {
      const { data, error } = await supabase.rpc('get_recommended_communities', {
        p_user_id: userId,
        p_limit: limit
      });

      if (error) {
        console.error('RPC error for get_recommended_communities:', error);
        // For now, return empty array for recommendations if RPC fails
        return [];
      }

      const communities = data || [];
      
      // Cache the results
      this.cache.recommended.set(userId, {
        data: communities,
        expires: Date.now() + this.CACHE_DURATION.recommended
      });

      return communities;
    } catch (error) {
      console.error('Error fetching recommended communities:', error);
      return [];
    }
  }

  /**
   * Track community visit for recommendations
   */
  async trackCommunityVisit(userId: string, communityId: string): Promise<void> {
    try {
      await supabase.rpc('track_community_activity', {
        p_community_id: communityId,
        p_user_id: userId,
        p_activity_type: 'visit'
      });

      // Update user interests
      await supabase.rpc('update_user_community_interests', {
        p_user_id: userId,
        p_community_id: communityId,
        p_action: 'visit'
      });

      // Clear user's recommendation cache
      this.cache.recommended.delete(userId);
    } catch (error) {
      console.error('Error tracking community visit:', error);
    }
  }

  /**
   * Get a mix of communities for explore page
   */
  async getExploreCommunities(userId?: string, userLocation?: string): Promise<{
    featured: FeaturedCommunity[];
    trending: TrendingCommunity[];
    recommended: RecommendedCommunity[];
  }> {
    try {
      const [featured, trending, recommended] = await Promise.all([
        this.getFeaturedCommunities(3),
        this.getTrendingCommunities(userLocation, 6),
        userId ? this.getRecommendedCommunities(userId, 6) : Promise.resolve([])
      ]);

      return {
        featured,
        trending,
        recommended
      };
    } catch (error) {
      console.error('Error fetching explore communities:', error);
      return {
        featured: [],
        trending: [],
        recommended: []
      };
    }
  }

  /**
   * Search communities
   */
  async searchCommunities(
    query: string,
    filters?: {
      location?: string;
      category?: string;
      tags?: string[];
      cuisines?: string[];
    }
  ): Promise<TrendingCommunity[]> {
    try {
      let queryBuilder = supabase
        .from('communities')
        .select(`
          id,
          name,
          description,
          location,
          category,
          cover_image_url,
          member_count,
          post_count,
          trending_score,
          tags,
          cuisines
        `)
        .eq('is_active', true)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`);

      // Apply filters
      if (filters?.location) {
        queryBuilder = queryBuilder.ilike('location', `%${filters.location}%`);
      }

      if (filters?.category) {
        queryBuilder = queryBuilder.eq('category', filters.category);
      }

      if (filters?.tags && filters.tags.length > 0) {
        queryBuilder = queryBuilder.contains('tags', filters.tags);
      }

      if (filters?.cuisines && filters.cuisines.length > 0) {
        queryBuilder = queryBuilder.contains('cuisines', filters.cuisines);
      }

      const { data, error } = await queryBuilder
        .order('trending_score', { ascending: false })
        .limit(20);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error searching communities:', error);
      return [];
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.featured = null;
    this.cache.trending.clear();
    this.cache.recommended.clear();
  }

  /**
   * Clear cache for a specific user
   */
  clearUserCache(userId: string): void {
    this.cache.recommended.delete(userId);
  }
}

export const communityDiscoveryService = new CommunityDiscoveryService();