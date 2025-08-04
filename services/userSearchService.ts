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
          isCurrentUser: false
        }))
      }

      // Get relationships for current user
      const { data: relationships } = await supabase
        .from('user_relationships')
        .select('following_id')
        .eq('follower_id', currentUserId)
        .in('following_id', users.map(u => u.id))

      const followingIds = new Set(relationships?.map(r => r.following_id) || [])

      return users.map(user => ({
        ...user,
        isFollowing: followingIds.has(user.id),
        isCurrentUser: user.id === currentUserId
      }))
    } catch (error) {
      console.error('Error enriching follow status:', error)
      // Return users without enrichment on error
      return users.map(user => ({
        ...user,
        isFollowing: false,
        isCurrentUser: false
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