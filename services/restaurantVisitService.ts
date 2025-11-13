import { supabase } from '@/lib/supabase';

/**
 * Service for managing restaurant visits
 * Tracks when users visit restaurants (via reviews, check-ins, etc.)
 */
class RestaurantVisitService {
  /**
   * Mark a restaurant as visited by a user
   * Called when a user submits a review for a restaurant
   */
  async markRestaurantAsVisited(
    userId: string,
    restaurantId: string,
    postId?: string,
    visitType: 'check_in' | 'review' | 'save' = 'review'
  ): Promise<boolean> {
    try {
      // Check if visit already exists for this user-restaurant-post combination
      if (postId) {
        const { data: existingVisit } = await supabase
          .from('restaurant_visits')
          .select('id')
          .eq('user_id', userId)
          .eq('restaurant_id', restaurantId)
          .eq('post_id', postId)
          .single();

        if (existingVisit) {
          // Visit already exists, return success
          return true;
        }
      }

      // Insert new visit record
      const { error } = await supabase
        .from('restaurant_visits')
        .insert({
          user_id: userId,
          restaurant_id: restaurantId,
          visit_type: visitType,
          post_id: postId || null,
        });

      if (error) {
        console.error('[RestaurantVisitService] Error marking restaurant as visited:', error);
        // Don't throw - visit tracking is not critical for post creation
        return false;
      }

      return true;
    } catch (error) {
      console.error('[RestaurantVisitService] Unexpected error marking visit:', error);
      return false;
    }
  }

  /**
   * Check if a user has visited a restaurant
   */
  async hasUserVisitedRestaurant(userId: string, restaurantId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('restaurant_visits')
        .select('id')
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" which is fine
        console.error('[RestaurantVisitService] Error checking visit:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('[RestaurantVisitService] Unexpected error checking visit:', error);
      return false;
    }
  }

  /**
   * Get all restaurants visited by a user
   */
  async getUserVisitedRestaurants(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('restaurant_visits')
        .select('restaurant_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[RestaurantVisitService] Error getting visited restaurants:', error);
        return [];
      }

      // Return unique restaurant IDs
      return [...new Set(data.map(v => v.restaurant_id))];
    } catch (error) {
      console.error('[RestaurantVisitService] Unexpected error getting visited restaurants:', error);
      return [];
    }
  }

  /**
   * Get all users who have visited a restaurant
   */
  async getRestaurantVisitors(restaurantId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('restaurant_visits')
        .select('user_id')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[RestaurantVisitService] Error getting restaurant visitors:', error);
        return [];
      }

      // Return unique user IDs
      return [...new Set(data.map(v => v.user_id))];
    } catch (error) {
      console.error('[RestaurantVisitService] Unexpected error getting restaurant visitors:', error);
      return [];
    }
  }

  /**
   * Get visit count for a restaurant
   */
  async getRestaurantVisitCount(restaurantId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('restaurant_visits')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId);

      if (error) {
        console.error('[RestaurantVisitService] Error getting visit count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('[RestaurantVisitService] Unexpected error getting visit count:', error);
      return 0;
    }
  }
}

export const restaurantVisitService = new RestaurantVisitService();



