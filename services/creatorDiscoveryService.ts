/**
 * Creator Discovery Service
 *
 * Provides creator discovery and profile management including:
 * - Browsing and filtering creators
 * - Viewing creator profiles
 * - Updating creator profiles
 * - Toggling availability status
 */

import { supabase } from '@/lib/supabase';

export interface CreatorProfile {
  id: string;
  userId: string;
  displayName: string;
  username?: string; // CM-14
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  totalFollowers: number;
  engagementRate: number;
  openToCollabs: boolean;
  availabilityStatus?: 'available' | 'busy' | 'not_accepting'; // CM-11
  specialties: string[];
  samplePosts: SamplePost[];
  completedCampaigns?: number; // CM-14
  avgRating?: number; // CM-14
  portfolioItems?: PortfolioItem[]; // CM-14
}

export interface PortfolioItem {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
}

export interface SamplePost {
  postId: string;
  caption: string | null;
  imageUrl: string;
  likesCount: number;
  restaurantName?: string | null;
}

export interface CreatorFilters {
  city?: string;
  minFollowers?: number;
  minEngagement?: number;
  collabTypes?: string[];
}

/**
 * Get filtered list of creators
 */
export async function getCreators(
  filters: CreatorFilters = {},
  limit: number = 20,
  offset: number = 0
): Promise<{ data: CreatorProfile[]; error?: string; hasMore: boolean }> {
  try {
    console.log('[getCreators] Fetching creators with filters:', {
      city: filters.city,
      minFollowers: filters.minFollowers,
      minEngagement: filters.minEngagement,
      limit,
      offset,
    });

    const { data, error } = await supabase.rpc('get_creators', {
      p_city: filters.city || null,
      p_min_followers: filters.minFollowers || null,
      p_min_engagement: filters.minEngagement || null,
      // Removed: p_collab_types (column removed in CM-10)
      p_limit: limit + 1, // Fetch one extra to check hasMore
      p_offset: offset,
    });

    if (error) throw error;

    console.log('[getCreators] Raw data from database:', {
      count: data?.length || 0,
      firstFew: (data || []).slice(0, 3).map((c: any) => ({
        id: c.id,
        user_id: c.user_id,
        display_name: c.display_name,
      })),
    });

    // Verify account_type for each creator returned
    if (data && data.length > 0) {
      const userIds = data.map((c: any) => c.user_id);
      const { data: userAccounts, error: userError } = await supabase
        .from('users')
        .select('id, email, account_type')
        .in('id', userIds);

      if (!userError && userAccounts) {
        const accountTypeMap = new Map(userAccounts.map((u: any) => [u.id, u]));
        const accountTypeLog = data.map((c: any) => {
          const user = accountTypeMap.get(c.user_id);
          return {
            creator_id: c.id,
            user_id: c.user_id,
            email: user?.email || 'unknown',
            account_type: user?.account_type || 'MISSING',
            display_name: c.display_name,
          };
        });

        console.log('[getCreators] Account type verification:', {
          total: accountTypeLog.length,
          creators: accountTypeLog.filter((a: any) => a.account_type === 'creator').length,
          businesses: accountTypeLog.filter((a: any) => a.account_type === 'business').length,
          other: accountTypeLog.filter((a: any) => a.account_type !== 'creator' && a.account_type !== 'business').length,
          details: accountTypeLog,
        });

        // Log warning if any non-creator accounts are found
        const nonCreators = accountTypeLog.filter((a: any) => a.account_type !== 'creator');
        if (nonCreators.length > 0) {
          console.warn('[getCreators] ⚠️ WARNING: Non-creator accounts found in results:', nonCreators);
        }
      }
    }

    const hasMore = (data?.length || 0) > limit;
    const creators = ((data || []).slice(0, limit) as any[]).map(transformCreator);

    console.log('[getCreators] Returning creators:', {
      count: creators.length,
      hasMore,
      displayNames: creators.map((c) => c.displayName),
    });

    return { data: creators, hasMore };
  } catch (error: any) {
    console.error('[getCreators] Error:', error);
    return { data: [], error: error.message, hasMore: false };
  }
}

function transformCreator(row: any): CreatorProfile {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name || 'Creator',
    bio: row.bio,
    location: row.location,
    avatarUrl: row.avatar_url,
    totalFollowers: row.total_followers || 0,
    engagementRate: parseFloat(row.troodie_engagement_rate || 0),
    openToCollabs: row.open_to_collabs || false,
    availabilityStatus: row.availability_status || 'available', // CM-11
    specialties: row.specialties || [],
    samplePosts: (row.sample_posts || [])
      .map((p: any) => ({
        postId: p.post_id,
        caption: p.caption,
        imageUrl: p.image_url, // This comes from the view which extracts from photos array
        likesCount: p.likes_count || 0,
        restaurantName: p.restaurant_name,
      }))
      .filter((p: any) => p.imageUrl), // Filter out posts without images
  };
}

/**
 * Get detailed creator profile by creator_profile id or user_id
 */
export async function getCreatorProfile(
  creatorIdOrUserId: string,
  isUserId: boolean = false
): Promise<{ data: CreatorProfile | null; error?: string }> {
  console.log('[getCreatorProfile] Starting lookup:', {
    creatorIdOrUserId,
    isUserId,
  });
  
  try {
    let cp: any = null;
    
    // Try to find creator profile by id first
    console.log('[getCreatorProfile] Attempting lookup by creator_profile id:', creatorIdOrUserId);
    const { data: cpById, error: idError } = await supabase
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
      .eq('id', creatorIdOrUserId)
      .single();

    console.log('[getCreatorProfile] Lookup by id result:', {
      found: !!cpById,
      error: idError?.message || idError?.code || null,
      data: cpById ? { id: cpById.id, user_id: cpById.user_id, display_name: cpById.display_name } : null,
    });

    if (!idError && cpById) {
      cp = cpById;
      console.log('[getCreatorProfile] Found profile by id:', cp.id);
    } else {
      // If not found by id, try by user_id as fallback
      console.log('[getCreatorProfile] Attempting lookup by user_id:', creatorIdOrUserId);
      const { data: cpByUserId, error: userIdError } = await supabase
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
        .eq('user_id', creatorIdOrUserId)
        .single();
      
      console.log('[getCreatorProfile] Lookup by user_id result:', {
        found: !!cpByUserId,
        error: userIdError?.message || userIdError?.code || null,
        data: cpByUserId ? { id: cpByUserId.id, user_id: cpByUserId.user_id, display_name: cpByUserId.display_name } : null,
      });
      
      if (!userIdError && cpByUserId) {
        cp = cpByUserId;
        console.log('[getCreatorProfile] Found profile by user_id:', cp.id);
      } else {
        console.error('[getCreatorProfile] Profile not found by id or user_id:', {
          idError: idError?.message || idError?.code,
          userIdError: userIdError?.message || userIdError?.code,
        });
        return { data: null, error: 'Creator profile not found' };
      }
    }
    
    if (!cp) {
      console.error('[getCreatorProfile] cp is null after lookup attempts');
      return { data: null, error: 'Creator profile not found' };
    }

    const creatorProfileId = cp.id;
    console.log('[getCreatorProfile] Fetching additional data for profile:', creatorProfileId);

    // CM-14: Fetch completed campaigns count and rating (CM-16: use actual ratings)
    const { data: campaignStats, error: campaignStatsError } = await supabase
      .from('campaign_applications')
      .select('id, status, rating')
      .eq('creator_id', creatorProfileId)
      .eq('status', 'accepted'); // Completed campaigns have 'accepted' status

    console.log('[getCreatorProfile] Campaign stats:', {
      count: campaignStats?.length || 0,
      error: campaignStatsError?.message || null,
    });

    const completedCampaigns = campaignStats?.length || 0;
    const ratings = campaignStats?.filter(c => c.rating).map(c => c.rating) || [];
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10
      : undefined;

    // CM-14: Fetch portfolio items
    const { data: portfolioItems, error: portfolioError } = await supabase
      .from('creator_portfolio_items')
      .select('id, image_url, video_url, media_type, thumbnail_url')
      .eq('creator_profile_id', creatorProfileId)
      .order('display_order')
      .limit(6);

    console.log('[getCreatorProfile] Portfolio items:', {
      count: portfolioItems?.length || 0,
      error: portfolioError?.message || null,
    });

    // Get sample posts
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        id,
        caption,
        photos,
        likes_count,
        restaurants (name)
      `)
      .eq('user_id', cp.user_id)
      .not('photos', 'is', null)
      .order('likes_count', { ascending: false })
      .limit(3);

    console.log('[getCreatorProfile] Sample posts:', {
      count: posts?.length || 0,
      error: postsError?.message || null,
    });

    const profile: CreatorProfile = {
      id: cp.id,
      userId: cp.user_id,
      displayName: cp.display_name || cp.users.name || cp.users.username || 'Creator',
      username: cp.users.username, // CM-14
      bio: cp.bio,
      location: cp.location,
      avatarUrl: cp.users.avatar_url,
      totalFollowers: cp.total_followers || 0,
      engagementRate: parseFloat(cp.troodie_engagement_rate || 0),
      openToCollabs: cp.open_to_collabs || false,
      availabilityStatus: cp.availability_status || 'available', // CM-11
      specialties: cp.specialties || [],
      completedCampaigns, // CM-14
      avgRating, // CM-14
      portfolioItems: portfolioItems?.map((item: any) => ({
        id: item.id,
        mediaUrl: item.video_url || item.image_url || '',
        mediaType: item.media_type || 'image',
      })) || [], // CM-14
      samplePosts: (posts || []).map((p: any) => ({
        postId: p.id,
        caption: p.caption,
        imageUrl: Array.isArray(p.photos) && p.photos.length > 0 ? p.photos[0] : null,
        likesCount: p.likes_count || 0,
        restaurantName: p.restaurants?.name,
      })).filter((p: any) => p.imageUrl), // Filter out posts without images
    };

    console.log('[getCreatorProfile] Profile constructed successfully:', {
      id: profile.id,
      userId: profile.userId,
      displayName: profile.displayName,
      portfolioCount: profile.portfolioItems?.length || 0,
      samplePostsCount: profile.samplePosts?.length || 0,
    });

    // Increment view count (if increment function exists)
    try {
      await supabase.rpc('increment', {
        table_name: 'creator_profiles',
        row_id: creatorProfileId,
        column_name: 'profile_views',
      });
    } catch (err) {
      // Increment function might not exist, ignore
      console.log('[getCreatorProfile] Could not increment view count (function may not exist)');
    }

    return { data: profile };
  } catch (error: any) {
    console.error('[getCreatorProfile] Unexpected error:', {
      message: error.message,
      stack: error.stack,
      error,
    });
    return { data: null, error: error.message };
  }
}

/**
 * Update creator profile
 */
export async function updateCreatorProfile(
  creatorId: string,
  updates: Partial<CreatorProfile>
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {
      display_name: updates.displayName,
      bio: updates.bio || null,
      location: updates.location || null,
      specialties: updates.specialties,
      open_to_collabs: updates.openToCollabs,
    };

    // Add availability_status if provided (CM-11)
    if (updates.availabilityStatus !== undefined) {
      updateData.availability_status = updates.availabilityStatus;
    }

    const { error } = await supabase
      .from('creator_profiles')
      .update(updateData)
      .eq('id', creatorId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Toggle open to collabs status
 */
export async function toggleOpenToCollabs(
  creatorId: string,
  isOpen: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('creator_profiles')
      .update({ open_to_collabs: isOpen })
      .eq('id', creatorId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Format follower count for display
 */
export function formatFollowers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

