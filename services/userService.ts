import { Database, supabase } from '@/lib/supabase'

type User = Database['public']['Tables']['users']['Row']
type UserInsert = Database['public']['Tables']['users']['Insert']
type UserUpdate = Database['public']['Tables']['users']['Update']

export const userService = {
  async getProfile(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
    return data
  },

  async createProfile(profile: UserInsert): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .insert(profile)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating user profile:', error)
      return null
    }

    // Ensure Quick Saves board is created for new user
    if (data) {
      try {
        const { data: boardId } = await supabase
          .rpc('ensure_quick_saves_board', { p_user_id: data.id })
        
        if (boardId) {
          console.log('Quick Saves board created:', boardId)
        }
      } catch (error) {
        console.error('Error creating Quick Saves board:', error)
      }
    }

    return data
  },

  async updateProfile(userId: string, updates: UserUpdate): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating user profile:', error)
      return null
    }
    return data
  },

  async updateOnboarding(userId: string, quizAnswers: any, persona: string) {
    const { error } = await supabase
      .from('user_onboarding')
      .upsert({
        user_id: userId,
        quiz_answers: quizAnswers,
        persona: persona,
        completed_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('Error updating onboarding:', error)
      throw error
    }

    // Update user persona
    await this.updateProfile(userId, { persona })
  },

  async saveFavoriteSpots(userId: string, favoriteSpots: Array<{ category: string; icon: string }>) {
    // First, delete existing favorite spots
    await supabase
      .from('favorite_spots')
      .delete()
      .eq('user_id', userId)

    // Then insert new ones
    const spotsToInsert = favoriteSpots.map(spot => ({
      user_id: userId,
      category: spot.category,
      icon: spot.icon
    }))

    const { error } = await supabase
      .from('favorite_spots')
      .insert(spotsToInsert)
    
    if (error) {
      console.error('Error saving favorite spots:', error)
      throw error
    }
  },

  async getUserStats(userId: string) {
    const { data, error } = await supabase
      .rpc('get_user_stats', { p_user_id: userId })
    
    if (error) {
      console.error('Error fetching user stats:', error)
      return null
    }
    return data
  },

  async followUser(followerId: string, followingId: string) {
    const { error } = await supabase
      .from('user_relationships')
      .insert({
        follower_id: followerId,
        following_id: followingId
      })
    
    if (error && error.code !== '23505') { // Ignore duplicate key errors
      console.error('Error following user:', error)
      throw error
    }
  },

  async unfollowUser(followerId: string, followingId: string) {
    const { error } = await supabase
      .from('user_relationships')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
    
    if (error) {
      console.error('Error unfollowing user:', error)
      throw error
    }
  },

  async getFollowers(userId: string) {
    const { data, error } = await supabase
      .from('user_relationships')
      .select(`
        follower:users!user_relationships_follower_id_fkey(*)
      `)
      .eq('following_id', userId)
    
    if (error) {
      console.error('Error fetching followers:', error)
      return []
    }
    return data.map(item => item.follower)
  },

  async getFollowing(userId: string) {
    const { data, error } = await supabase
      .from('user_relationships')
      .select(`
        following:users!user_relationships_following_id_fkey(*)
      `)
      .eq('follower_id', userId)
    
    if (error) {
      console.error('Error fetching following:', error)
      return []
    }
    return data.map(item => item.following)
  },

  async searchUsers(query: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`username.ilike.%${query}%,name.ilike.%${query}%`)
      .limit(20)
    
    if (error) {
      console.error('Error searching users:', error)
      return []
    }
    return data
  },

  async getQuickSavesBoard(userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .rpc('get_quick_saves_board', { p_user_id: userId })
    
    if (error) {
      console.error('Error getting Quick Saves board:', error)
      return null
    }
    return data
  },

  async updateNetworkProgress(userId: string, action: 'board' | 'post' | 'community') {
    const { data, error } = await supabase
      .rpc('update_network_progress', {
        user_id: userId,
        action_type: action
      })
    
    if (error) {
      console.error('Error updating network progress:', error)
      throw error
    }
    return data
  },

  async getUserNetworkProgress(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select(`
        has_created_board,
        has_created_post,
        has_joined_community,
        network_progress
      `)
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Error fetching network progress:', error)
      throw error
    }
    return data
  }
}