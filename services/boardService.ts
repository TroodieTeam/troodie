import { supabase } from '@/lib/supabase'
import {
    Board,
    BoardCreationForm,
    BoardMember,
    BoardRestaurant,
    BoardWithRestaurants
} from '@/types/board'

export const boardService = {
  /**
   * Create a new board
   */
  async createBoard(userId: string, boardData: BoardCreationForm): Promise<Board | null> {
    try {
      // Try to use the RPC function first
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('create_simple_board', {
          p_user_id: userId,
          p_title: boardData.title,
          p_description: boardData.description || null,
          p_type: boardData.type,
          p_category: boardData.category || null,
          p_location: boardData.location || null,
          p_cover_image_url: boardData.cover_image_url || null,
          p_is_private: boardData.is_private,
          p_allow_comments: boardData.allow_comments,
          p_allow_saves: boardData.allow_saves,
          p_price: boardData.price || null
        })

      // If RPC fails, try direct insert
      if (rpcError) {
        // RPC failed, trying direct insert
        
        const { data: insertData, error: insertError } = await supabase
          .from('boards')
          .insert({
            user_id: userId,
            title: boardData.title,
            description: boardData.description || null,
            type: boardData.type,
            category: boardData.category || null,
            location: boardData.location || null,
            cover_image_url: boardData.cover_image_url || null,
            is_private: boardData.is_private,
            allow_comments: boardData.allow_comments,
            allow_saves: boardData.allow_saves,
            price: boardData.price || null,
            restaurant_count: 0,
            member_count: 0
          })
          .select()
          .single()

        if (insertError) throw insertError
        return insertData
      }

      // Fetch the created board from RPC
      const { data: board, error: fetchError } = await supabase
        .from('boards')
        .select('*')
        .eq('id', rpcData)
        .single()

      if (fetchError) throw fetchError

      return board
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
      // Use the user_boards view which handles all the complex permissions
      const { data, error } = await supabase
        .from('user_boards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error: any) {
      console.error('Error fetching user boards:', error)
      // Fallback to direct query if view doesn't exist yet
      try {
        // Get boards owned by user
        const { data: ownedBoards, error: ownedError } = await supabase
          .from('boards')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
        
        if (ownedError) throw ownedError

        // Get boards where user is a member
        const { data: membershipData, error: memberError } = await supabase
          .from('board_members')
          .select('board_id')
          .eq('user_id', userId)
        
        if (memberError) throw memberError

        const memberBoardIds = membershipData?.map(m => m.board_id) || []

        // Get member boards details
        let memberBoards: Board[] = []
        if (memberBoardIds.length > 0) {
          const { data, error } = await supabase
            .from('boards')
            .select('*')
            .in('id', memberBoardIds)
          
          if (!error && data) {
            memberBoards = data
          }
        }

        // Combine and deduplicate
        const allBoards = [...(ownedBoards || []), ...memberBoards]
        const uniqueBoards = allBoards.filter((board, index, self) =>
          index === self.findIndex((b) => b.id === board.id)
        )
        
        return uniqueBoards.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError)
        return []
      }
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
      // First get boards that contain this restaurant
      const { data: boardsWithRestaurant, error: restaurantError } = await supabase
        .from('board_restaurants')
        .select('board_id')
        .eq('restaurant_id', restaurantId)

      if (restaurantError) throw restaurantError

      const boardIds = boardsWithRestaurant?.map(br => br.board_id) || []

      if (boardIds.length === 0) {
        return []
      }

      // Now get the boards that the user has access to
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .in('id', boardIds)
        .or(`user_id.eq.${userId},is_private.eq.false`)

      if (error) throw error
      
      // Additionally check for boards where user is a member
      const { data: memberBoards } = await supabase
        .from('board_members')
        .select('board_id')
        .eq('user_id', userId)
        .in('board_id', boardIds)

      const memberBoardIds = memberBoards?.map(mb => mb.board_id) || []
      
      // Filter to include private boards where user is a member
      const accessibleBoards = data?.filter(board => 
        !board.is_private || 
        board.user_id === userId || 
        memberBoardIds.includes(board.id)
      ) || []

      return accessibleBoards
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
  },

  /**
   * Get user's Your Saves board
   */
  async getUserQuickSavesBoard(userId: string): Promise<Board | null> {
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', userId)
        .eq('title', 'Your Saves')
        .eq('type', 'free')
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching Your Saves board:', error)
        return null
      }
      return data
    } catch (error: any) {
      console.error('Error fetching Your Saves board:', error)
      return null
    }
  },

  /**
   * Get or create user's Your Saves board
   */
  async ensureQuickSavesBoard(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .rpc('ensure_quick_saves_board', { p_user_id: userId })

      if (error) {
        console.error('Error ensuring Your Saves board:', error)
        return null
      }
      return data
    } catch (error: any) {
      console.error('Error ensuring Your Saves board:', error)
      return null
    }
  },

  /**
   * Save restaurant to Your Saves board
   */
  async saveRestaurantToQuickSaves(
    userId: string, 
    restaurantId: string,
    notes?: string,
    rating?: number
  ): Promise<void> {
    try {
      // Get or create Your Saves board
      const boardId = await this.ensureQuickSavesBoard(userId)
      
      if (!boardId) {
        throw new Error('Failed to get Your Saves board')
      }

      // Add restaurant to Your Saves board
      await this.addRestaurantToBoard(boardId, restaurantId, userId, notes, rating)
    } catch (error: any) {
      console.error('Error saving to Your Saves:', error)
      throw error
    }
  },

  /**
   * Get Your Saves restaurants for a user
   */
  async getQuickSavesRestaurants(userId: string, limit?: number): Promise<BoardRestaurant[]> {
    try {
      // First get the Your Saves board
      const board = await this.getUserQuickSavesBoard(userId)
      
      if (!board) {
        return []
      }

      let request = supabase
        .from('board_restaurants')
        .select('*')
        .eq('board_id', board.id)
        .order('added_at', { ascending: false })

      if (limit) {
        request = request.limit(limit)
      }

      const { data, error } = await request

      if (error) throw error
      return data || []
    } catch (error: any) {
      console.error('Error fetching Your Saves restaurants:', error)
      return []
    }
  }
}