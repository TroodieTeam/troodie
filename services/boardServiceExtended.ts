/**
 * Extended board service functions for getting all saves
 */

import { supabase } from '@/lib/supabase';
import { BoardRestaurant } from '@/types/board';

export const boardServiceExtended = {
  /**
   * Get ALL saves for a user across all boards
   */
  async getAllUserSaves(userId: string, limit?: number): Promise<BoardRestaurant[]> {
    try {
      console.log(`[boardServiceExtended] Getting all saves for user: ${userId}, limit: ${limit}`);
      
      let query = supabase
        .from('board_restaurants')
        .select('*')
        .eq('added_by', userId)
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching all user saves:', error);
        return [];
      }

      console.log(`[boardServiceExtended] Found ${data?.length || 0} saves for user ${userId}`);
      return data || [];
    } catch (error) {
      console.error('Error in getAllUserSaves:', error);
      return [];
    }
  },

  /**
   * Get saves grouped by board for a user
   */
  async getUserSavesByBoard(userId: string): Promise<Record<string, BoardRestaurant[]>> {
    try {
      // Get all saves
      const { data: saves, error: savesError } = await supabase
        .from('board_restaurants')
        .select(`
          *,
          boards!inner(
            id,
            title,
            type
          )
        `)
        .eq('added_by', userId)
        .order('created_at', { ascending: false });

      if (savesError) {
        console.error('Error fetching saves by board:', savesError);
        return {};
      }

      // Group by board
      const grouped: Record<string, BoardRestaurant[]> = {};
      saves?.forEach(save => {
        const boardId = save.board_id;
        if (!grouped[boardId]) {
          grouped[boardId] = [];
        }
        grouped[boardId].push(save);
      });

      return grouped;
    } catch (error) {
      console.error('Error in getUserSavesByBoard:', error);
      return {};
    }
  }
};