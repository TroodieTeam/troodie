import { supabase } from '@/lib/supabase';

export type CommunityType = 'public' | 'private';

export interface Community {
  id: string;
  name: string;
  description?: string;
  location?: string;
  type: CommunityType;
  is_event_based: boolean;
  event_name?: string;
  event_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count: number;
  post_count: number;
  is_active: boolean;
  settings?: any;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  joined_at: string;
  invitation_status: 'pending' | 'active' | 'declined';
}

export interface CreateCommunityInput {
  name: string;
  description?: string;
  location?: string;
  type: CommunityType;
  is_event_based: boolean;
  event_name?: string;
  event_date?: string;
}

export const communityService = {
  /**
   * Create a new community
   */
  async createCommunity(
    userId: string,
    input: CreateCommunityInput
  ): Promise<{ community: Community | null; error: string | null }> {
    try {
      // First try the RPC function
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_community', {
        p_name: input.name,
        p_description: input.description || null,
        p_location: input.location || null,
        p_type: input.type,
        p_is_event_based: input.is_event_based,
        p_event_name: input.event_name || null,
        p_event_date: input.event_date || null,
        p_created_by: userId
      });

      if (!rpcError) {
        // RPC succeeded, fetch the created community
        const { data: community, error: fetchError } = await supabase
          .from('communities')
          .select('*')
          .eq('id', rpcData)
          .single();

        if (fetchError) throw fetchError;
        return { community, error: null };
      }

      // If RPC fails (likely because migration hasn't been run), fall back to direct insert
      if (rpcError.message.includes('Could not find the function')) {
        console.warn('create_community function not found. Please run the migration. Using fallback method...');
        
        // Direct insert into communities table
        const { data: community, error: insertError } = await supabase
          .from('communities')
          .insert({
            name: input.name,
            description: input.description || null,
            location: input.location || null,
            type: input.type,
            is_event_based: input.is_event_based,
            event_name: input.event_name || null,
            event_date: input.event_date || null,
            created_by: userId
          })
          .select()
          .single();

        if (insertError) {
          // If direct insert also fails, the tables probably don't exist
          if (insertError.code === '42P01') {
            return { 
              community: null, 
              error: 'Community tables not found. Please run the database migration first.' 
            };
          }
          throw insertError;
        }

        // Add creator as owner
        if (community) {
          await supabase
            .from('community_members')
            .insert({
              community_id: community.id,
              user_id: userId,
              role: 'owner',
              invitation_status: 'active'
            });

          // Update member count
          await supabase
            .from('communities')
            .update({ member_count: 1 })
            .eq('id', community.id);
        }

        return { community, error: null };
      }

      throw rpcError;
    } catch (error: any) {
      console.error('Error creating community:', error);
      return { 
        community: null, 
        error: error.message || 'Failed to create community' 
      };
    }
  },

  /**
   * Get all communities (public and user's private communities)
   */
  async getCommunities(
    userId?: string,
    filters?: {
      type?: CommunityType;
      location?: string;
      search?: string;
    }
  ): Promise<Community[]> {
    try {
      let query = supabase
        .from('community_details_view')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      if (filters?.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }

      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      // If user is provided, also get their private communities
      if (userId && (!filters?.type || filters.type === 'private')) {
        const { data: userCommunities, error: userError } = await supabase
          .from('community_details_view')
          .select('*')
          .eq('type', 'private')
          .eq('is_active', true)
          .in('id', 
            supabase
              .from('community_members')
              .select('community_id')
              .eq('user_id', userId)
              .eq('invitation_status', 'active')
          );

        if (!userError && userCommunities) {
          // Merge and deduplicate
          const allCommunities = [...(data || []), ...userCommunities];
          const uniqueCommunities = Array.from(
            new Map(allCommunities.map(item => [item.id, item])).values()
          );
          return uniqueCommunities;
        }
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching communities:', error);
      return [];
    }
  },

  /**
   * Get a single community by ID
   */
  async getCommunityById(communityId: string): Promise<Community | null> {
    try {
      const { data, error } = await supabase
        .from('community_details_view')
        .select('*')
        .eq('id', communityId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching community:', error);
      return null;
    }
  },

  /**
   * Join a public community
   */
  async joinCommunity(
    userId: string,
    communityId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('join_community', {
        p_community_id: communityId,
        p_user_id: userId
      });

      if (error) throw error;

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error joining community:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to join community' 
      };
    }
  },

  /**
   * Leave a community
   */
  async leaveCommunity(
    userId: string,
    communityId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // Check if user is the owner
      const { data: membership, error: checkError } = await supabase
        .from('community_members')
        .select('role')
        .eq('community_id', communityId)
        .eq('user_id', userId)
        .single();

      if (checkError) throw checkError;

      if (membership?.role === 'owner') {
        return { 
          success: false, 
          error: 'Community owner cannot leave. Transfer ownership first.' 
        };
      }

      // Delete membership
      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update member count
      await supabase.rpc('decrement', {
        table_name: 'communities',
        column_name: 'member_count',
        row_id: communityId
      });

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error leaving community:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to leave community' 
      };
    }
  },

  /**
   * Get user's communities
   */
  async getUserCommunities(
    userId: string,
    role?: 'owner' | 'admin' | 'moderator' | 'member'
  ): Promise<Community[]> {
    try {
      let query = supabase
        .from('community_members')
        .select(`
          community_id,
          role,
          communities!inner(*)
        `)
        .eq('user_id', userId)
        .eq('invitation_status', 'active')
        .eq('communities.is_active', true);

      if (role) {
        query = query.eq('role', role);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map(item => item.communities) || [];
    } catch (error) {
      console.error('Error fetching user communities:', error);
      return [];
    }
  },

  /**
   * Check if user is a member of a community
   */
  async isUserMember(
    userId: string,
    communityId: string
  ): Promise<{ isMember: boolean; role?: string }> {
    try {
      const { data, error } = await supabase
        .from('community_members')
        .select('role')
        .eq('community_id', communityId)
        .eq('user_id', userId)
        .eq('invitation_status', 'active')
        .single();

      if (error || !data) {
        return { isMember: false };
      }

      return { isMember: true, role: data.role };
    } catch (error) {
      console.error('Error checking membership:', error);
      return { isMember: false };
    }
  },

  /**
   * Update community details
   */
  async updateCommunity(
    communityId: string,
    updates: Partial<CreateCommunityInput>
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('communities')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', communityId);

      if (error) throw error;

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error updating community:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to update community' 
      };
    }
  },

  /**
   * Search communities by name or location
   */
  async searchCommunities(
    searchTerm: string,
    userId?: string
  ): Promise<Community[]> {
    try {
      const { data, error } = await supabase
        .from('community_details_view')
        .select('*')
        .eq('is_active', true)
        .or(`name.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`)
        .order('member_count', { ascending: false })
        .limit(20);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error searching communities:', error);
      return [];
    }
  },

  /**
   * Get community members
   */
  async getCommunityMembers(
    communityId: string,
    options?: {
      limit?: number;
      offset?: number;
      role?: string;
    }
  ): Promise<{ members: any[]; total: number }> {
    try {
      // Get total count
      const { count } = await supabase
        .from('community_members')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', communityId)
        .eq('invitation_status', 'active');

      // Get members with user details
      let query = supabase
        .from('community_members')
        .select(`
          *,
          users!inner(
            id,
            username,
            avatar_url
          )
        `)
        .eq('community_id', communityId)
        .eq('invitation_status', 'active')
        .order('joined_at', { ascending: false });

      if (options?.role) {
        query = query.eq('role', options.role);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(
          options.offset, 
          options.offset + (options.limit || 10) - 1
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      return { 
        members: data || [], 
        total: count || 0 
      };
    } catch (error) {
      console.error('Error fetching community members:', error);
      return { members: [], total: 0 };
    }
  }
};