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
   */
  static async saveRestaurant({ 
    restaurantId, 
    userId, 
    boardId = null 
  }: SaveRestaurantParams): Promise<SaveResult> {
    try {
      const { data, error } = await supabase
        .rpc('save_restaurant_instant', {
          p_user_id: userId,
          p_restaurant_id: restaurantId,
          p_board_id: boardId
        });

      if (error) {
        console.error('Error saving restaurant:', error);
        throw new Error(error.message || 'Failed to save restaurant');
      }

      return data as SaveResult;
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
      const { data, error } = await supabase
        .rpc('unsave_restaurant', {
          p_user_id: userId,
          p_restaurant_id: restaurantId
        });

      if (error) {
        console.error('Error unsaving restaurant:', error);
        throw new Error(error.message || 'Failed to remove save');
      }

      return data as boolean;
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