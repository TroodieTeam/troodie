import { supabase } from '@/lib/supabase'

export type TrafficLightRating = 'red' | 'yellow' | 'green'

export interface RatingSummary {
  redCount: number
  yellowCount: number
  greenCount: number
  totalCount: number
  overallRating: TrafficLightRating | 'neutral'
  greenPercentage: number
  yellowPercentage: number
  redPercentage: number
  userRating?: TrafficLightRating
}

export const ratingService = {
  /**
   * Rate a restaurant with traffic light rating
   */
  async rateRestaurant(
    userId: string,
    restaurantId: string,
    rating: TrafficLightRating
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .rpc('rate_restaurant', {
          p_user_id: userId,
          p_restaurant_id: restaurantId,
          p_rating: rating
        })

      if (error) throw error

      return data || { success: false, error: 'Unknown error' }
    } catch (error: any) {
      console.error('Error rating restaurant:', error)
      return { success: false, error: error.message || 'Failed to rate restaurant' }
    }
  },

  /**
   * Get restaurant rating summary including user's rating
   */
  async getRestaurantRatingSummary(
    restaurantId: string,
    userId?: string
  ): Promise<RatingSummary | null> {
    try {
      // Get restaurant rating summary
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurant_ratings_view')
        .select('*')
        .eq('id', restaurantId)
        .single()

      if (restaurantError) throw restaurantError

      // Get user's rating if userId provided
      let userRating: TrafficLightRating | undefined
      if (userId) {
        const { data: ratingData, error: ratingError } = await supabase
          .rpc('get_user_restaurant_rating', {
            p_user_id: userId,
            p_restaurant_id: restaurantId
          })

        if (!ratingError && ratingData) {
          userRating = ratingData as TrafficLightRating
        }
      }

      return {
        redCount: restaurant.red_ratings_count || 0,
        yellowCount: restaurant.yellow_ratings_count || 0,
        greenCount: restaurant.green_ratings_count || 0,
        totalCount: restaurant.total_ratings_count || 0,
        overallRating: restaurant.overall_rating || 'neutral',
        greenPercentage: restaurant.green_percentage || 0,
        yellowPercentage: restaurant.yellow_percentage || 0,
        redPercentage: restaurant.red_percentage || 0,
        userRating
      }
    } catch (error) {
      console.error('Error fetching rating summary:', error)
      return null
    }
  },

  /**
   * Get user's rating for a restaurant
   */
  async getUserRestaurantRating(
    userId: string,
    restaurantId: string
  ): Promise<TrafficLightRating | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_restaurant_rating', {
          p_user_id: userId,
          p_restaurant_id: restaurantId
        })

      if (error) throw error

      return data as TrafficLightRating | null
    } catch (error) {
      console.error('Error fetching user rating:', error)
      return null
    }
  },

  /**
   * Get restaurants with specific rating by a user
   */
  async getUserRatedRestaurants(
    userId: string,
    rating?: TrafficLightRating
  ): Promise<Array<{ restaurantId: string; rating: TrafficLightRating; addedAt: string }>> {
    try {
      let query = supabase
        .from('board_restaurants')
        .select(`
          restaurant_id,
          traffic_light_rating,
          added_at,
          boards!inner(user_id)
        `)
        .eq('boards.user_id', userId)
        .not('traffic_light_rating', 'is', null)
        .order('added_at', { ascending: false })

      if (rating) {
        query = query.eq('traffic_light_rating', rating)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(item => ({
        restaurantId: item.restaurant_id,
        rating: item.traffic_light_rating as TrafficLightRating,
        addedAt: item.added_at
      }))
    } catch (error) {
      console.error('Error fetching user rated restaurants:', error)
      return []
    }
  },

  /**
   * Get trending restaurants based on ratings
   */
  async getTrendingByRating(
    limit: number = 10,
    ratingFilter?: 'green' | 'mixed'
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('restaurant_ratings_view')
        .select(`
          *,
          restaurants!inner(*)
        `)
        .gt('total_ratings_count', 0)
        .order('total_ratings_count', { ascending: false })
        .limit(limit)

      if (ratingFilter === 'green') {
        query = query.eq('overall_rating', 'green')
      } else if (ratingFilter === 'mixed') {
        query = query.in('overall_rating', ['yellow', 'green'])
      }

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching trending restaurants:', error)
      return []
    }
  }
}