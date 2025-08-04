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

      // Get current user info for notification
      const { data: currentUser } = await supabase
        .from('users')
        .select('name, username')
        .eq('id', currentUserId)
        .single()

      // Send notification
      try {
        await NotificationService.send({
          userId,
          type: 'follow',
          title: 'New Follower',
          message: `${currentUser?.name || currentUser?.username || 'Someone'} started following you`,
          relatedId: currentUserId,
          relatedType: 'user'
        })
      } catch (notificationError) {
        // Don't fail the follow operation if notification fails
        console.error('Failed to send follow notification:', notificationError)
      }

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

  static async getFollowers(userId: string): Promise<any[]> {
    try {
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
            followers_count
          )
        `)
        .eq('following_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data?.map(item => item.follower) || []
    } catch (error) {
      console.error('Error fetching followers:', error)
      return []
    }
  }

  static async getFollowing(userId: string): Promise<any[]> {
    try {
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
            followers_count
          )
        `)
        .eq('follower_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data?.map(item => item.following) || []
    } catch (error) {
      console.error('Error fetching following:', error)
      return []
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