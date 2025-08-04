import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';

// Type definitions based on backend schema
export interface Community {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  category: string | null;
  location: string | null;
  admin_id: string | null;
  type: 'public' | 'private' | 'paid';
  price: number | null;
  currency: string;
  billing_cycle: string | null;
  member_count: number;
  activity_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  status: 'pending' | 'active' | 'declined';
  joined_at: string;
}

export interface CommunityWithMembership extends Community {
  user_role?: 'owner' | 'admin' | 'moderator' | 'member';
  joined_at?: string;
  membership_status?: 'pending' | 'active' | 'declined';
}

export interface UserCommunityStats {
  joined_count: number;
  created_count: number;
  admin_count: number;
  moderator_count: number;
}

class CommunityService {
  private cache: Map<string, { data: any; expires: number }> = new Map();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all public communities and user's private communities
   */
  async getCommunities(userId?: string): Promise<Community[]> {
    const cacheKey = `all_communities_${userId || 'public'}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      let query = supabase
        .from('communities')
        .select('*')
        .eq('is_active', true)
        .order('member_count', { ascending: false });

      // If user is logged in, include their private communities
      if (userId) {
        // Get communities where user is a member
        const { data: userMemberships } = await supabase
          .from('community_members')
          .select('community_id')
          .eq('user_id', userId)
          .eq('status', 'active');

        const userCommunityIds = userMemberships?.map(m => m.community_id) || [];
        
        // Include public communities and user's private communities
        if (userCommunityIds.length > 0) {
          query = query.or(`type.eq.public,id.in.(${userCommunityIds.join(',')})`);
        } else {
          // If user has no private communities, just show public ones
          query = query.eq('type', 'public');
        }
      } else {
        // Only show public communities for non-logged in users
        query = query.eq('type', 'public');
      }

      const { data, error } = await query;

      if (error) throw error;

      const communities = data || [];
      this.setCache(cacheKey, communities);
      return communities;
    } catch (error) {
      console.error('Error fetching communities:', error);
      return [];
    }
  }

  /**
   * Get communities for a user (joined and created)
   */
  async getUserCommunities(userId: string): Promise<{
    joined: CommunityWithMembership[];
    created: CommunityWithMembership[];
  }> {
    const cacheKey = `user_communities_${userId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Get all community memberships for the user
      const { data: memberships, error: membershipError } = await supabase
        .from('community_members')
        .select(`
          *,
          community:communities(*)
        `)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (membershipError) throw membershipError;

      // Transform data to include membership info
      const communitiesWithMembership: CommunityWithMembership[] = (memberships || []).map(m => ({
        ...m.community,
        user_role: m.role,
        joined_at: m.joined_at,
        membership_status: m.status,
      }));

      // Separate joined vs created communities
      const joined = communitiesWithMembership.filter(c => c.user_role !== 'owner');
      const created = communitiesWithMembership.filter(c => c.user_role === 'owner');

      const result = { joined, created };
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching user communities:', error);
      return { joined: [], created: [] };
    }
  }

  /**
   * Get community statistics for a user
   */
  async getUserCommunityStats(userId: string): Promise<UserCommunityStats> {
    const cacheKey = `user_community_stats_${userId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const { data: memberships, error } = await supabase
        .from('community_members')
        .select('role')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) throw error;

      const stats: UserCommunityStats = {
        joined_count: 0,
        created_count: 0,
        admin_count: 0,
        moderator_count: 0,
      };

      (memberships || []).forEach(m => {
        stats.joined_count++;
        switch (m.role) {
          case 'owner':
            stats.created_count++;
            break;
          case 'admin':
            stats.admin_count++;
            break;
          case 'moderator':
            stats.moderator_count++;
            break;
        }
      });

      this.setCache(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error('Error fetching community stats:', error);
      return {
        joined_count: 0,
        created_count: 0,
        admin_count: 0,
        moderator_count: 0,
      };
    }
  }

  /**
   * Get a single community by ID
   */
  async getCommunity(communityId: string): Promise<Community | null> {
    const cacheKey = `community_${communityId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('id', communityId)
        .single();

      if (error) throw error;

      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching community:', error);
      return null;
    }
  }

  /**
   * Get community with user membership info
   */
  async getCommunityWithMembership(
    communityId: string,
    userId: string
  ): Promise<CommunityWithMembership | null> {
    try {
      // Get community data
      const { data: community, error: communityError } = await supabase
        .from('communities')
        .select('*')
        .eq('id', communityId)
        .single();

      if (communityError) throw communityError;

      // Get user's membership
      const { data: membership, error: membershipError } = await supabase
        .from('community_members')
        .select('*')
        .eq('community_id', communityId)
        .eq('user_id', userId)
        .single();

      if (membershipError && membershipError.code !== 'PGRST116') {
        throw membershipError;
      }

      return {
        ...community,
        user_role: membership?.role,
        joined_at: membership?.joined_at,
        membership_status: membership?.status,
      };
    } catch (error) {
      console.error('Error fetching community with membership:', error);
      return null;
    }
  }

  /**
   * Join a community
   */
  async joinCommunity(userId: string, communityId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('community_members').insert({
        user_id: userId,
        community_id: communityId,
        role: 'member',
        status: 'active',
      });

      if (error) throw error;

      // Clear cache
      this.clearUserCache(userId);
      this.clearCommunityCache(communityId);

      // Update member count
      await this.updateMemberCount(communityId);

      return true;
    } catch (error) {
      console.error('Error joining community:', error);
      return false;
    }
  }

  /**
   * Leave a community
   */
  async leaveCommunity(userId: string, communityId: string): Promise<boolean> {
    try {
      // Check if user is owner - owners can't leave
      const { data: membership } = await supabase
        .from('community_members')
        .select('role')
        .eq('user_id', userId)
        .eq('community_id', communityId)
        .single();

      if (membership?.role === 'owner') {
        console.error('Owners cannot leave their own community');
        return false;
      }

      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('user_id', userId)
        .eq('community_id', communityId);

      if (error) throw error;

      // Clear cache
      this.clearUserCache(userId);
      this.clearCommunityCache(communityId);

      // Update member count
      await this.updateMemberCount(communityId);

      return true;
    } catch (error) {
      console.error('Error leaving community:', error);
      return false;
    }
  }

  /**
   * Update member count for a community
   */
  private async updateMemberCount(communityId: string): Promise<void> {
    try {
      const { count } = await supabase
        .from('community_members')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', communityId)
        .eq('status', 'active');

      await supabase
        .from('communities')
        .update({ member_count: count || 0 })
        .eq('id', communityId);
    } catch (error) {
      console.error('Error updating member count:', error);
    }
  }

  /**
   * Get all members of a community
   */
  async getCommunityMembers(communityId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('community_members')
        .select(`
          *,
          user:users!community_members_user_id_fkey(
            id,
            name,
            username,
            avatar_url,
            email
          )
        `)
        .eq('community_id', communityId)
        .eq('status', 'active')
        .order('joined_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching community members:', error);
      return [];
    }
  }

  /**
   * Check if user has admin permissions in a community
   */
  async hasAdminPermission(
    userId: string,
    communityId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('community_members')
        .select('role')
        .eq('user_id', userId)
        .eq('community_id', communityId)
        .eq('status', 'active')
        .single();

      if (error) return false;
      return data?.role === 'owner' || data?.role === 'admin';
    } catch (error) {
      console.error('Error checking admin permission:', error);
      return false;
    }
  }

  /**
   * Subscribe to real-time community updates
   */
  subscribeToCommunityUpdates(
    communityId: string,
    onUpdate: (community: Community) => void
  ) {
    const subscription = supabase
      .channel(`community_${communityId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'communities',
          filter: `id=eq.${communityId}`,
        },
        (payload) => {
          onUpdate(payload.new as Community);
          // Update cache
          this.setCache(`community_${communityId}`, payload.new);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  // Cache management methods
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + this.CACHE_DURATION,
    });
  }

  private clearUserCache(userId: string): void {
    this.cache.delete(`user_communities_${userId}`);
    this.cache.delete(`user_community_stats_${userId}`);
  }

  private clearCommunityCache(communityId: string): void {
    this.cache.delete(`community_${communityId}`);
  }

  clearAllCache(): void {
    this.cache.clear();
  }
}

export const communityService = new CommunityService();