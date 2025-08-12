import { SearchUserResult, supabase } from '../lib/supabase'
import { authService } from './authService'

export interface SearchFilters {
  location?: string
  verifiedOnly?: boolean
  followersMin?: number
}

export class UserSearchService {
  static async searchUsers(
    query: string,
    filters?: SearchFilters,
    limit = 20,
    offset = 0
  ): Promise<SearchUserResult[]> {
    try {
      // Call the existing search_users function
      const { data, error } = await supabase
        .rpc('search_users', {
          search_query: query,
          limit_count: limit,
          offset_count: offset
        })

      if (error) throw error

      // Apply client-side filters if needed
      let filteredData = data || []
      
      if (filters?.verifiedOnly) {
        filteredData = filteredData.filter(user => user.is_verified)
      }
      
      if (filters?.location) {
        filteredData = filteredData.filter(user => 
          user.location?.toLowerCase().includes(filters.location!.toLowerCase())
        )
      }
      
      if (filters?.followersMin) {
        filteredData = filteredData.filter(user => 
          user.followers_count >= filters.followersMin!
        )
      }

      // Enrich with follow status
      return this.enrichWithFollowStatus(filteredData)
    } catch (error) {
      console.error('Error searching users:', error)
      throw error
    }
  }

  static async getAllUsers(
    limit = 50,
    offset = 0,
    excludeFollowing = false
  ): Promise<SearchUserResult[]> {
    try {
      const currentUserId = await authService.getCurrentUserId()
      
      // Get all users from the platform
      const { data: allUsers, error } = await supabase
        .from('users')
        .select('id, username, name, bio, avatar_url, is_verified, followers_count, saves_count, location')
        .neq('id', currentUserId || '') // Exclude current user
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      // Enrich with follow status
      const enrichedUsers = await this.enrichWithFollowStatus(allUsers || [])
      
      // Filter out already-followed users if requested
      if (excludeFollowing) {
        return enrichedUsers.filter(user => !user.isFollowing)
      }
      
      return enrichedUsers
    } catch (error) {
      console.error('Error fetching all users:', error)
      throw error
    }
  }

  private static async enrichWithFollowStatus(
    users: any[]
  ): Promise<SearchUserResult[]> {
    try {
      const currentUserId = await authService.getCurrentUserId()
      
      if (!currentUserId) {
        // If no current user, mark all as not following
        return users.map(user => ({
          ...user,
          isFollowing: false,
          isCurrentUser: false,
          canFollow: true
        }))
      }

      // Get all following relationships for current user (not just for these users)
      const { data: relationships } = await supabase
        .from('user_relationships')
        .select('following_id')
        .eq('follower_id', currentUserId)

      const followingIds = new Set(relationships?.map(r => r.following_id) || [])

      return users.map(user => ({
        ...user,
        isFollowing: followingIds.has(user.id),
        isCurrentUser: user.id === currentUserId,
        canFollow: !followingIds.has(user.id) && user.id !== currentUserId
      }))
    } catch (error) {
      console.error('Error enriching follow status:', error)
      // Return users without enrichment on error
      return users.map(user => ({
        ...user,
        isFollowing: false,
        isCurrentUser: false,
        canFollow: user.id !== currentUserId
      }))
    }
  }

  static async getUserProfile(userId: string): Promise<SearchUserResult | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      const enriched = await this.enrichWithFollowStatus([data])
      return enriched[0] || null
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }
}