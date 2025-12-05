import { supabase } from '@/lib/supabase';

/**
 * Service for managing restaurant favorites
 * Tracks which restaurants users have marked as favorites
 */
class RestaurantFavoriteService {
    /**
     * Toggle favorite status for a restaurant
     * If favorited, removes it. If not favorited, adds it.
     */
    async toggleFavorite(userId: string, restaurantId: string): Promise<boolean> {
        try {
            // Check if already favorited
            const { data: existing } = await supabase
                .from('restaurant_favorites')
                .select('id')
                .eq('user_id', userId)
                .eq('restaurant_id', restaurantId)
                .single();

            if (existing) {
                // Remove favorite
                const { error } = await supabase
                    .from('restaurant_favorites')
                    .delete()
                    .eq('user_id', userId)
                    .eq('restaurant_id', restaurantId);

                if (error) {
                    console.error('[RestaurantFavoriteService] Error removing favorite:', error);
                    return false;
                }
            } else {
                // Add favorite
                const { error } = await supabase
                    .from('restaurant_favorites')
                    .insert({
                        user_id: userId,
                        restaurant_id: restaurantId,
                    });

                if (error) {
                    console.error('[RestaurantFavoriteService] Error adding favorite:', error);
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('[RestaurantFavoriteService] Unexpected error toggling favorite:', error);
            return false;
        }
    }

    /**
     * Check if a user has favorited a restaurant
     */
    async isFavorited(userId: string, restaurantId: string): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('restaurant_favorites')
                .select('id')
                .eq('user_id', userId)
                .eq('restaurant_id', restaurantId)
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') {
                // PGRST116 is "no rows returned" which is fine
                console.error('[RestaurantFavoriteService] Error checking favorite:', error);
                return false;
            }

            return !!data;
        } catch (error) {
            console.error('[RestaurantFavoriteService] Unexpected error checking favorite:', error);
            return false;
        }
    }

    /**
     * Get all restaurants favorited by a user
     */
    async getUserFavorites(userId: string): Promise<string[]> {
        try {
            const { data, error } = await supabase
                .from('restaurant_favorites')
                .select('restaurant_id')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[RestaurantFavoriteService] Error getting user favorites:', error);
                return [];
            }

            return data.map(f => f.restaurant_id);
        } catch (error) {
            console.error('[RestaurantFavoriteService] Unexpected error getting user favorites:', error);
            return [];
        }
    }

    /**
     * Get favorite count for a restaurant
     */
    async getRestaurantFavoriteCount(restaurantId: string): Promise<number> {
        try {
            const { count, error } = await supabase
                .from('restaurant_favorites')
                .select('*', { count: 'exact', head: true })
                .eq('restaurant_id', restaurantId);

            if (error) {
                console.error('[RestaurantFavoriteService] Error getting favorite count:', error);
                return 0;
            }

            return count || 0;
        } catch (error) {
            console.error('[RestaurantFavoriteService] Unexpected error getting favorite count:', error);
            return 0;
        }
    }

    /**
     * Get all users who have favorited a restaurant
     */
    async getRestaurantFavorites(restaurantId: string): Promise<string[]> {
        try {
            const { data, error } = await supabase
                .from('restaurant_favorites')
                .select('user_id')
                .eq('restaurant_id', restaurantId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[RestaurantFavoriteService] Error getting restaurant favorites:', error);
                return [];
            }

            return data.map(f => f.user_id);
        } catch (error) {
            console.error('[RestaurantFavoriteService] Unexpected error getting restaurant favorites:', error);
            return [];
        }
    }
}

export const restaurantFavoriteService = new RestaurantFavoriteService();
