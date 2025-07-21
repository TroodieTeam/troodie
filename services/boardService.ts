import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'

type Board = Database['public']['Tables']['boards']['Row']
type BoardInsert = Database['public']['Tables']['boards']['Insert']
type BoardUpdate = Database['public']['Tables']['boards']['Update']

export const boardService = {
  async createBoard(boardData: BoardInsert): Promise<Board | null> {
    const { data, error } = await supabase
      .from('boards')
      .insert(boardData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating board:', error)
      return null
    }
    return data
  },

  async updateBoard(boardId: string, updates: BoardUpdate): Promise<Board | null> {
    const { data, error } = await supabase
      .from('boards')
      .update(updates)
      .eq('id', boardId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating board:', error)
      return null
    }
    return data
  },

  async deleteBoard(boardId: string) {
    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', boardId)
    
    if (error) {
      console.error('Error deleting board:', error)
      throw error
    }
  },

  async getBoardById(boardId: string): Promise<Board | null> {
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('id', boardId)
      .single()
    
    if (error) {
      console.error('Error fetching board:', error)
      return null
    }
    return data
  },

  async getUserBoards(userId: string) {
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching user boards:', error)
      return []
    }
    return data
  },

  async getPublicBoards(filters?: {
    category?: string
    location?: string
    searchQuery?: string
  }) {
    let request = supabase
      .from('boards')
      .select('*')
      .eq('type', 'free')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50)

    if (filters?.category) {
      request = request.eq('category', filters.category)
    }

    if (filters?.location) {
      request = request.eq('location', filters.location)
    }

    if (filters?.searchQuery) {
      request = request.or(`title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`)
    }

    const { data, error } = await request

    if (error) {
      console.error('Error fetching public boards:', error)
      return []
    }
    return data
  },

  async addRestaurantToBoard(boardId: string, restaurantId: string, notes?: string) {
    // Get the current max position
    const { data: existingRestaurants } = await supabase
      .from('board_restaurants')
      .select('order_position')
      .eq('board_id', boardId)
      .order('order_position', { ascending: false })
      .limit(1)

    const nextPosition = existingRestaurants && existingRestaurants[0]
      ? existingRestaurants[0].order_position + 1
      : 0

    const { error } = await supabase
      .from('board_restaurants')
      .insert({
        board_id: boardId,
        restaurant_id: restaurantId,
        added_by: (await supabase.auth.getUser()).data.user?.id,
        order_position: nextPosition,
        notes
      })
    
    if (error && error.code !== '23505') { // Ignore duplicate key errors
      console.error('Error adding restaurant to board:', error)
      throw error
    }
  },

  async removeRestaurantFromBoard(boardId: string, restaurantId: string) {
    const { error } = await supabase
      .from('board_restaurants')
      .delete()
      .eq('board_id', boardId)
      .eq('restaurant_id', restaurantId)
    
    if (error) {
      console.error('Error removing restaurant from board:', error)
      throw error
    }
  },

  async getBoardRestaurants(boardId: string) {
    const { data, error } = await supabase
      .from('board_restaurants')
      .select(`
        *,
        restaurant:restaurants(*)
      `)
      .eq('board_id', boardId)
      .order('order_position', { ascending: true })
    
    if (error) {
      console.error('Error fetching board restaurants:', error)
      return []
    }
    return data
  },

  async reorderBoardRestaurants(boardId: string, restaurantOrders: Array<{ restaurant_id: string; order_position: number }>) {
    const updates = restaurantOrders.map(({ restaurant_id, order_position }) => 
      supabase
        .from('board_restaurants')
        .update({ order_position })
        .eq('board_id', boardId)
        .eq('restaurant_id', restaurant_id)
    )

    const results = await Promise.all(updates)
    const hasError = results.some(result => result.error)
    
    if (hasError) {
      console.error('Error reordering board restaurants')
      throw new Error('Failed to reorder restaurants')
    }
  },

  async addCollaborator(boardId: string, userId: string, role: string = 'member') {
    const { error } = await supabase
      .from('board_collaborators')
      .insert({
        board_id: boardId,
        user_id: userId,
        role
      })
    
    if (error && error.code !== '23505') { // Ignore duplicate key errors
      console.error('Error adding collaborator:', error)
      throw error
    }
  },

  async removeCollaborator(boardId: string, userId: string) {
    const { error } = await supabase
      .from('board_collaborators')
      .delete()
      .eq('board_id', boardId)
      .eq('user_id', userId)
    
    if (error) {
      console.error('Error removing collaborator:', error)
      throw error
    }
  },

  async getBoardCollaborators(boardId: string) {
    const { data, error } = await supabase
      .from('board_collaborators')
      .select(`
        *,
        user:users(*)
      `)
      .eq('board_id', boardId)
    
    if (error) {
      console.error('Error fetching board collaborators:', error)
      return []
    }
    return data
  },

  async subscribeToBoard(boardId: string, userId: string, stripeSubscriptionId: string) {
    const { error } = await supabase
      .from('board_subscriptions')
      .insert({
        board_id: boardId,
        user_id: userId,
        stripe_subscription_id: stripeSubscriptionId,
        status: 'active',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      })
    
    if (error) {
      console.error('Error subscribing to board:', error)
      throw error
    }
  },

  async getUserSubscribedBoards(userId: string) {
    const { data, error } = await supabase
      .from('board_subscriptions')
      .select(`
        *,
        board:boards(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
    
    if (error) {
      console.error('Error fetching subscribed boards:', error)
      return []
    }
    return data.map(sub => sub.board)
  }
}