import { supabase } from '../lib/supabase'
import { authService } from './authService'
import { NotificationService } from './notificationService'

export class FollowService {
  static async followUser(userId: string): Promise<void> {
    try {
      const currentUserId = await authService.getCurrentUserId()
      
      if (!currentUserId) {
        throw new Error('User not authenticated')
      }

      if (currentUserId === userId) {
        throw new Error('Cannot follow yourself')
      }

      // Insert relationship
      const { error } = await supabase
        .from('user_relationships')
        .insert({
          follower_id: currentUserId,
          following_id: userId
        })

      if (error) {
        // Check if it's a duplicate key error
        if (error.code === '23505') {
          return
        }
        throw error
      }

      // Notification is handled by database trigger (notify_on_follow)
      // No need to create notification here as it would be duplicate

      // Update cached counts
      await this.updateFollowerCounts(userId, 1)
      await this.updateFollowingCounts(currentUserId, 1)
    } catch (error) {
      console.error('Error following user:', error)
      throw error
    }
  }

  static async unfollowUser(userId: string): Promise<void> {
    try {
      const currentUserId = await authService.getCurrentUserId()
      
      if (!currentUserId) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase
        .from('user_relationships')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', userId)

      if (error) throw error

      // Update cached counts
      await this.updateFollowerCounts(userId, -1)
      await this.updateFollowingCounts(currentUserId, -1)
    } catch (error) {
      console.error('Error unfollowing user:', error)
      throw error
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

  private static async updateFollowerCounts(userId: string, increment: number): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment', {
        table_name: 'users',
        column_name: 'followers_count',
        row_id: userId,
        increment_value: increment
      })

      if (error) {
        // If the RPC doesn't exist, try a direct update
        const { data: user } = await supabase
          .from('users')
          .select('followers_count')
          .eq('id', userId)
          .single()

        if (user) {
          await supabase
            .from('users')
            .update({ 
              followers_count: Math.max(0, (user.followers_count || 0) + increment) 
            })
            .eq('id', userId)
        }
      }
    } catch (error) {
      console.error('Error updating follower count:', error)
    }
  }

  private static async updateFollowingCounts(userId: string, increment: number): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment', {
        table_name: 'users',
        column_name: 'following_count',
        row_id: userId,
        increment_value: increment
      })

      if (error) {
        // If the RPC doesn't exist, try a direct update
        const { data: user } = await supabase
          .from('users')
          .select('following_count')
          .eq('id', userId)
          .single()

        if (user) {
          await supabase
            .from('users')
            .update({ 
              following_count: Math.max(0, (user.following_count || 0) + increment) 
            })
            .eq('id', userId)
        }
      }
    } catch (error) {
      console.error('Error updating following count:', error)
    }
  }
}

// Export an instance for convenience
export const followService = FollowService