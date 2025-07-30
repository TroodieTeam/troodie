import { supabase } from '@/lib/supabase';

export interface SaveResult {
  save_id: string;
  board_id: string;
  board_title: string;
  is_default_board: boolean;
}

export interface SaveRestaurantParams {
  restaurantId: string;
  userId: string;
  boardId?: string | null;
}

export class SaveService {
  /**
   * Instantly save a restaurant to the user's default board or specified board
   * Using direct queries instead of RPC to avoid ambiguity issues
   */
  static async saveRestaurant({ 
    restaurantId, 
    userId, 
    boardId = null 
  }: SaveRestaurantParams): Promise<SaveResult> {
    try {
      let finalBoardId = boardId;
      
      // If no board specified, get or create default board
      if (!finalBoardId) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('default_board_id')
          .eq('id', userId)
          .single();
        
        if (userError) throw userError;
        
        if (userData?.default_board_id) {
          finalBoardId = userData.default_board_id;
        } else {
          // Create default board
          const { data: boardData, error: boardError } = await supabase
            .from('boards')
            .insert({
              user_id: userId,
              title: 'Quick Saves',
              description: 'Your quick saves collection',
              type: 'free',
              is_private: false,
              is_active: true,
              allow_comments: true,
              allow_saves: true
            })
            .select()
            .single();
          
          if (boardError) throw boardError;
          
          finalBoardId = boardData.id;
          
          // Update user's default board
          await supabase
            .from('users')
            .update({ default_board_id: finalBoardId })
            .eq('id', userId);
          
          // Add user as board owner
          await supabase
            .from('board_members')
            .insert({
              board_id: finalBoardId,
              user_id: userId,
              role: 'owner',
              joined_at: new Date().toISOString()
            });
        }
      }
      
      // Check if already saved
      const { data: existingSave } = await supabase
        .from('restaurant_saves')
        .select('id')
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId)
        .eq('board_id', finalBoardId)
        .single();
      
      let saveId: string;
      
      if (!existingSave) {
        // Create new save
        const { data: newSave, error: saveError } = await supabase
          .from('restaurant_saves')
          .insert({
            user_id: userId,
            restaurant_id: restaurantId,
            board_id: finalBoardId,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (saveError) throw saveError;
        
        saveId = newSave.id;
        
        // Update board restaurant count
        await supabase.rpc('increment', {
          table_name: 'boards',
          column_name: 'restaurant_count',
          row_id: finalBoardId
        }).catch(() => {
          // If increment RPC doesn't exist, do it manually
          supabase
            .from('boards')
            .update({ restaurant_count: supabase.raw('restaurant_count + 1') })
            .eq('id', finalBoardId);
        });
      } else {
        saveId = existingSave.id;
      }
      
      // Get board info
      const { data: boardData, error: boardError } = await supabase
        .from('boards')
        .select('title')
        .eq('id', finalBoardId)
        .single();
      
      if (boardError) throw boardError;
      
      // Check if it's the default board
      const { data: userData } = await supabase
        .from('users')
        .select('default_board_id')
        .eq('id', userId)
        .single();
      
      return {
        save_id: saveId,
        board_id: finalBoardId,
        board_title: boardData.title,
        is_default_board: userData?.default_board_id === finalBoardId
      };
    } catch (error) {
      console.error('Save restaurant error:', error);
      throw error;
    }
  }

  /**
   * Remove all saves of a restaurant by the user
   */
  static async unsaveRestaurant(userId: string, restaurantId: string): Promise<boolean> {
    try {
      // Get all boards where this restaurant is saved
      const { data: saves, error: fetchError } = await supabase
        .from('restaurant_saves')
        .select('id, board_id')
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId);
      
      if (fetchError) throw fetchError;
      
      if (!saves || saves.length === 0) return false;
      
      // Delete all saves
      const { error: deleteError } = await supabase
        .from('restaurant_saves')
        .delete()
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId);
      
      if (deleteError) throw deleteError;
      
      // Update board counts
      const boardCounts = saves.reduce((acc, save) => {
        acc[save.board_id] = (acc[save.board_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      for (const [boardId, count] of Object.entries(boardCounts)) {
        await supabase.rpc('decrement', {
          table_name: 'boards',
          column_name: 'restaurant_count',
          row_id: boardId,
          amount: count
        }).catch(() => {
          // If decrement RPC doesn't exist, do it manually
          supabase
            .from('boards')
            .update({ restaurant_count: supabase.raw(`GREATEST(0, restaurant_count - ${count})`) })
            .eq('id', boardId);
        });
      }
      
      return true;
    } catch (error) {
      console.error('Unsave restaurant error:', error);
      throw error;
    }
  }

  /**
   * Check if a restaurant is saved by the user (in any board)
   */
  static async isRestaurantSaved(userId: string, restaurantId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('restaurant_saves')
        .select('id')
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId)
        .limit(1);

      if (error) {
        console.error('Error checking save status:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Check save status error:', error);
      return false;
    }
  }

  /**
   * Get all boards where a restaurant is saved
   */
  static async getRestaurantBoards(userId: string, restaurantId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('restaurant_saves')
        .select('board_id')
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId);

      if (error) {
        console.error('Error getting restaurant boards:', error);
        return [];
      }

      return data?.map(item => item.board_id) || [];
    } catch (error) {
      console.error('Get restaurant boards error:', error);
      return [];
    }
  }

  /**
   * Get or create the user's default board
   */
  static async getOrCreateDefaultBoard(userId: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .rpc('get_or_create_default_board', {
          p_user_id: userId
        });

      if (error) {
        console.error('Error getting default board:', error);
        throw new Error(error.message || 'Failed to get default board');
      }

      return data as string;
    } catch (error) {
      console.error('Get default board error:', error);
      throw error;
    }
  }
}