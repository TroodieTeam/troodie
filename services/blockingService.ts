import { supabase } from '@/lib/supabase';

export interface BlockUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

/**
 * @deprecated Use moderationService instead. This service references the wrong table.
 * The correct table is 'blocked_users', not 'user_blocks'.
 */
class BlockingService {
  async blockUser(blockerId: string, blockedId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // First check if user is already blocked
      const { data: existing } = await supabase
        .from('blocked_users')
        .select('blocker_id')
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedId)
        .single();

      if (existing) {
        return { success: false, error: 'You have already blocked this user' };
      }

      const { data, error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: blockerId,
          blocked_id: blockedId,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error blocking user:', error);
        
        if (error.code === '23505') {
          return { success: false, error: 'You have already blocked this user' };
        } else if (error.code === '42P01') {
          return { success: false, error: 'Blocking feature is not available yet. Please contact support.' };
        } else {
          return { success: false, error: error.message || 'Failed to block user' };
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in blockUser service:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedId);

      if (error) {
        console.error('Supabase error unblocking user:', error);
        return { success: false, error: error.message || 'Failed to unblock user' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in unblockUser service:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async getBlockedUsers(userId: string): Promise<{ data: BlockUser[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select(`
          *,
          blocked_user:users!blocked_users_blocked_id_fkey(
            id,
            username,
            name,
            avatar
          )
        `)
        .eq('blocker_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error getting blocked users:', error);
        return { data: [], error: error.message };
      }

      return { data: data || [] };
    } catch (error: any) {
      console.error('Error in getBlockedUsers service:', error);
      return { data: [], error: 'An unexpected error occurred' };
    }
  }

  async isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedId)
        .single();

      return !!data;
    } catch (error) {
      // If there's an error (like table not found), assume not blocked
      return false;
    }
  }
}

export const blockingService = new BlockingService();