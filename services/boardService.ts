import { supabase } from '@/lib/supabase'
import { 
  Board, 
  BoardCreationForm, 
  BoardWithRestaurants,
  BoardMember,
  BoardRestaurant
} from '@/types/board'

export const boardService = {
  /**
   * Create a new board
   */
  async createBoard(userId: string, boardData: BoardCreationForm): Promise<Board | null> {
    try {
      const { data, error } = await supabase
        .from('boards')
        .insert({
          user_id: userId,
          ...boardData
        })
        .select()
        .single()

      if (error) throw error

      // If it's a private board, add the creator as owner
      if (boardData.is_private || boardData.type === 'private') {
        await this.addMemberToBoard(data.id, userId, 'owner')
      }

      return data
    } catch (error: any) {
      console.error('Error creating board:', error)
      return null
    }
  },

  /**
   * Get all boards for a user (owned or member of)
   */
  async getUserBoards(userId: string): Promise<Board[]> {
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .or(`user_id.eq.${userId},id.in.(select board_id from board_members where user_id='${userId}')`)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error: any) {
      console.error('Error fetching user boards:', error)
      return []
    }
  },

  /**
   * Get board details by ID
   */
  async getBoardById(boardId: string): Promise<Board | null> {
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .single()

      if (error) throw error
      return data
    } catch (error: any) {
      console.error('Error fetching board:', error)
      return null
    }
  },

  /**
   * Get board with restaurants
   */
  async getBoardWithRestaurants(boardId: string): Promise<BoardWithRestaurants | null> {
    try {
      const board = await this.getBoardById(boardId)
      if (!board) return null

      const restaurants = await this.getBoardRestaurants(boardId)
      
      return {
        ...board,
        restaurants
      }
    } catch (error: any) {
      console.error('Error fetching board with restaurants:', error)
      return null
    }
  },

  /**
   * Update board details
   */
  async updateBoard(boardId: string, updates: Partial<Board>): Promise<Board | null> {
    try {
      const { data, error } = await supabase
        .from('boards')
        .update(updates)
        .eq('id', boardId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error: any) {
      console.error('Error updating board:', error)
      return null
    }
  },

  /**
   * Delete a board
   */
  async deleteBoard(boardId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', boardId)

      if (error) throw error
    } catch (error: any) {
      console.error('Error deleting board:', error)
      throw error
    }
  },

  /**
   * Add a restaurant to a board
   */
  async addRestaurantToBoard(
    boardId: string, 
    restaurantId: string, 
    userId: string,
    notes?: string,
    rating?: number
  ): Promise<void> {
    try {
      // Get current max position
      const { data: existingRestaurants } = await supabase
        .from('board_restaurants')
        .select('position')
        .eq('board_id', boardId)
        .order('position', { ascending: false })
        .limit(1)

      const nextPosition = existingRestaurants && existingRestaurants[0]
        ? existingRestaurants[0].position + 1
        : 0

      const { error } = await supabase
        .from('board_restaurants')
        .insert({
          board_id: boardId,
          restaurant_id: restaurantId,
          added_by: userId,
          position: nextPosition,
          notes,
          rating
        })

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        throw error
      }
    } catch (error: any) {
      console.error('Error adding restaurant to board:', error)
      throw error
    }
  },

  /**
   * Remove a restaurant from a board
   */
  async removeRestaurantFromBoard(boardId: string, restaurantId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('board_restaurants')
        .delete()
        .eq('board_id', boardId)
        .eq('restaurant_id', restaurantId)

      if (error) throw error
    } catch (error: any) {
      console.error('Error removing restaurant from board:', error)
      throw error
    }
  },

  /**
   * Get restaurants in a board
   */
  async getBoardRestaurants(boardId: string): Promise<BoardRestaurant[]> {
    try {
      const { data, error } = await supabase
        .from('board_restaurants')
        .select('*')
        .eq('board_id', boardId)
        .order('position', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error: any) {
      console.error('Error fetching board restaurants:', error)
      return []
    }
  },

  /**
   * Get boards containing a specific restaurant
   */
  async getBoardsForRestaurant(restaurantId: string, userId: string): Promise<Board[]> {
    try {
      const { data, error } = await supabase
        .from('boards')
        .select(`
          *,
          board_restaurants!inner(restaurant_id)
        `)
        .eq('board_restaurants.restaurant_id', restaurantId)
        .or(`user_id.eq.${userId},id.in.(select board_id from board_members where user_id='${userId}')`)

      if (error) throw error
      return data || []
    } catch (error: any) {
      console.error('Error fetching boards for restaurant:', error)
      return []
    }
  },

  /**
   * Check if a restaurant is in a board
   */
  async isRestaurantInBoard(boardId: string, restaurantId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('board_restaurants')
        .select('id')
        .eq('board_id', boardId)
        .eq('restaurant_id', restaurantId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error checking restaurant in board:', error)
        return false
      }
      return !!data
    } catch (error: any) {
      console.error('Error checking restaurant in board:', error)
      return false
    }
  },

  /**
   * Get public boards
   */
  async getPublicBoards(filters?: {
    category?: string
    location?: string
    searchQuery?: string
  }): Promise<Board[]> {
    try {
      let request = supabase
        .from('boards')
        .select('*')
        .eq('is_private', false)
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

      if (error) throw error
      return data || []
    } catch (error: any) {
      console.error('Error fetching public boards:', error)
      return []
    }
  },

  /**
   * Add a member to a board
   */
  async addMemberToBoard(boardId: string, userId: string, role: 'owner' | 'admin' | 'member' = 'member'): Promise<void> {
    try {
      const { error } = await supabase
        .from('board_members')
        .insert({
          board_id: boardId,
          user_id: userId,
          role
        })

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        throw error
      }
    } catch (error: any) {
      console.error('Error adding member to board:', error)
      throw error
    }
  },

  /**
   * Remove a member from a board
   */
  async removeMemberFromBoard(boardId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('board_members')
        .delete()
        .eq('board_id', boardId)
        .eq('user_id', userId)

      if (error) throw error
    } catch (error: any) {
      console.error('Error removing member from board:', error)
      throw error
    }
  },

  /**
   * Get board members
   */
  async getBoardMembers(boardId: string): Promise<BoardMember[]> {
    try {
      const { data, error } = await supabase
        .from('board_members')
        .select('*')
        .eq('board_id', boardId)
        .order('joined_at', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error: any) {
      console.error('Error fetching board members:', error)
      return []
    }
  },

  /**
   * Reorder restaurants in a board
   */
  async reorderBoardRestaurants(boardId: string, restaurantOrders: Array<{ restaurant_id: string; position: number }>): Promise<void> {
    try {
      const updates = restaurantOrders.map(({ restaurant_id, position }) => 
        supabase
          .from('board_restaurants')
          .update({ position })
          .eq('board_id', boardId)
          .eq('restaurant_id', restaurant_id)
      )

      const results = await Promise.all(updates)
      const hasError = results.some(result => result.error)
      
      if (hasError) {
        throw new Error('Failed to reorder restaurants')
      }
    } catch (error: any) {
      console.error('Error reordering board restaurants:', error)
      throw error
    }
  },

  /**
   * Get user's default board (created on signup)
   */
  async getUserDefaultBoard(userId: string): Promise<Board | null> {
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', userId)
        .eq('title', 'My Saved Restaurants')
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching default board:', error)
        return null
      }
      return data
    } catch (error: any) {
      console.error('Error fetching default board:', error)
      return null
    }
  }
}