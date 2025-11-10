import { supabase } from '../lib/supabase'
import { authService } from './authService'
import { NotificationService } from './notificationService'

export class FollowService {
  private static activeRequests = new Map<string, Promise<{ success: boolean; error?: string }>>();

  static async followUser(userId: string): Promise<{ success: boolean; error?: string }> {
    const currentUserId = await authService.getCurrentUserId();

    if (!currentUserId) {
      return { success: false, error: 'User not authenticated' };
    }

    if (currentUserId === userId) {
      return { success: false, error: 'Cannot follow yourself' };
    }

    // Prevent duplicate requests - return existing promise if in progress
    const requestKey = `follow-${currentUserId}-${userId}`;
    if (this.activeRequests.has(requestKey)) {
      return this.activeRequests.get(requestKey)!;
    }

    const requestPromise = this._executeFollow(currentUserId, userId);
    this.activeRequests.set(requestKey, requestPromise);

    requestPromise.finally(() => {
      this.activeRequests.delete(requestKey);
    });

    return requestPromise;
  }

  private static async _executeFollow(followerId: string, followingId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Insert relationship - trigger will update counts atomically
      const { error } = await supabase
        .from('user_relationships')
        .insert({
          follower_id: followerId,
          following_id: followingId,
          created_at: new Date().toISOString()
        });

      if (error) {
        // Check if it's a duplicate key error (23505 = unique_violation)
        if (error.code === '23505') {
          return { success: true }; // Already following - idempotent
        }
        return { success: false, error: error.message || 'Failed to follow user' };
      }

      // Notification is handled by database trigger (notify_on_follow)
      return { success: true };
    } catch (error: any) {
      console.error('Error following user:', error);
      return { success: false, error: error.message || 'Network error. Please check your connection.' };
    }
  }

  static async unfollowUser(userId: string): Promise<{ success: boolean; error?: string }> {
    const currentUserId = await authService.getCurrentUserId();

    if (!currentUserId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Prevent duplicate requests - return existing promise if in progress
    const requestKey = `unfollow-${currentUserId}-${userId}`;
    if (this.activeRequests.has(requestKey)) {
      return this.activeRequests.get(requestKey)!;
    }

    const requestPromise = this._executeUnfollow(currentUserId, userId);
    this.activeRequests.set(requestKey, requestPromise);

    requestPromise.finally(() => {
      this.activeRequests.delete(requestKey);
    });

    return requestPromise;
  }

  private static async _executeUnfollow(followerId: string, followingId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete relationship - trigger will update counts atomically
      const { error } = await supabase
        .from('user_relationships')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);

      if (error) {
        return { success: false, error: error.message || 'Failed to unfollow user' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error unfollowing user:', error);
      return { success: false, error: error.message || 'Network error. Please check your connection.' };
    }
  }

  static async isFollowing(userId: string): Promise<boolean> {
    try {
      const currentUserId = await authService.getCurrentUserId()
      
      if (!currentUserId) return false

      const { data, error } = await supabase
        .from('user_relationships')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error
      }

      return !!data
    } catch (error) {
      console.error('Error checking follow status:', error)
      return false
    }
  }

  static async getFollowers(userId: string, offset = 0, limit = 20): Promise<{ data: any[], error: any }> {
    try {
      const currentUserId = await authService.getCurrentUserId()
      
      const { data, error } = await supabase
        .from('user_relationships')
        .select(`
          follower:follower_id(
            id,
            username,
            name,
            bio,
            avatar_url,
            is_verified,
            followers_count,
            saves_count
          )
        `)
        .eq('following_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      // Check if current user follows each follower
      const followers = await Promise.all((data || []).map(async (item) => {
        const follower = item.follower
        if (currentUserId && follower?.id !== currentUserId) {
          follower.isFollowing = await this.isFollowing(follower.id)
        }
        follower.isCurrentUser = follower?.id === currentUserId
        return follower
      }))

      return { data: followers.filter(Boolean), error: null }
    } catch (error) {
      console.error('Error fetching followers:', error)
      return { data: [], error }
    }
  }

  static async getFollowing(userId: string, offset = 0, limit = 20): Promise<{ data: any[], error: any }> {
    try {
      const currentUserId = await authService.getCurrentUserId()
      
      const { data, error } = await supabase
        .from('user_relationships')
        .select(`
          following:following_id(
            id,
            username,
            name,
            bio,
            avatar_url,
            is_verified,
            followers_count,
            saves_count
          )
        `)
        .eq('follower_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      // Check if current user follows each following user
      const following = await Promise.all((data || []).map(async (item) => {
        const followingUser = item.following
        if (currentUserId && followingUser?.id !== currentUserId) {
          followingUser.isFollowing = await this.isFollowing(followingUser.id)
        }
        followingUser.isCurrentUser = followingUser?.id === currentUserId
        return followingUser
      }))

      return { data: following.filter(Boolean), error: null }
    } catch (error) {
      console.error('Error fetching following:', error)
      return { data: [], error }
    }
  }

}

// Export an instance for convenience
export const followService = FollowService