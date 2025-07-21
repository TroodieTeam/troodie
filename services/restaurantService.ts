import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'

type Restaurant = Database['public']['Tables']['restaurants']['Row']
type RestaurantInsert = Database['public']['Tables']['restaurants']['Insert']
type RestaurantSave = Database['public']['Tables']['restaurant_saves']['Row']
type RestaurantSaveInsert = Database['public']['Tables']['restaurant_saves']['Insert']

export const restaurantService = {
  async searchRestaurants(query: string, filters?: {
    city?: string
    cuisineTypes?: string[]
    priceRange?: string
  }) {
    let request = supabase
      .from('restaurants')
      .select('*')
      .or(`name.ilike.%${query}%,address.ilike.%${query}%`)
      .limit(20)

    if (filters?.city) {
      request = request.eq('city', filters.city)
    }

    if (filters?.cuisineTypes && filters.cuisineTypes.length > 0) {
      request = request.contains('cuisine_types', filters.cuisineTypes)
    }

    if (filters?.priceRange) {
      request = request.eq('price_range', filters.priceRange)
    }

    const { data, error } = await request

    if (error) {
      console.error('Error searching restaurants:', error)
      return []
    }
    return data
  },

  async getRestaurantById(id: string): Promise<Restaurant | null> {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching restaurant:', error)
      return null
    }
    return data
  },

  async getNearbyRestaurants(lat: number, lng: number, radiusInMeters: number = 5000) {
    const { data, error } = await supabase
      .rpc('nearby_restaurants', {
        lat,
        lng,
        radius_meters: radiusInMeters
      })

    if (error) {
      console.error('Error fetching nearby restaurants:', error)
      return []
    }
    return data
  },

  async saveRestaurant(saveData: RestaurantSaveInsert): Promise<RestaurantSave | null> {
    const { data, error } = await supabase
      .from('restaurant_saves')
      .insert(saveData)
      .select()
      .single()
    
    if (error) {
      console.error('Error saving restaurant:', error)
      return null
    }
    return data
  },

  async updateSave(saveId: string, updates: Partial<RestaurantSaveInsert>): Promise<RestaurantSave | null> {
    const { data, error } = await supabase
      .from('restaurant_saves')
      .update(updates)
      .eq('id', saveId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating save:', error)
      return null
    }
    return data
  },

  async deleteSave(saveId: string) {
    const { error } = await supabase
      .from('restaurant_saves')
      .delete()
      .eq('id', saveId)
    
    if (error) {
      console.error('Error deleting save:', error)
      throw error
    }
  },

  async getUserSaves(userId: string, privacy?: 'public' | 'friends' | 'private') {
    let request = supabase
      .from('restaurant_saves')
      .select(`
        *,
        restaurant:restaurants(*),
        boards:save_boards(board:boards(*))
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (privacy) {
      request = request.eq('privacy', privacy)
    }

    const { data, error } = await request

    if (error) {
      console.error('Error fetching user saves:', error)
      return []
    }
    return data
  },

  async getRestaurantSaves(restaurantId: string) {
    const { data, error } = await supabase
      .from('restaurant_saves')
      .select(`
        *,
        user:users(*)
      `)
      .eq('restaurant_id', restaurantId)
      .eq('privacy', 'public')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching restaurant saves:', error)
      return []
    }
    return data
  },

  async addSaveToBoard(saveId: string, boardId: string) {
    const { error } = await supabase
      .from('save_boards')
      .insert({
        save_id: saveId,
        board_id: boardId
      })
    
    if (error && error.code !== '23505') { // Ignore duplicate key errors
      console.error('Error adding save to board:', error)
      throw error
    }
  },

  async removeSaveFromBoard(saveId: string, boardId: string) {
    const { error } = await supabase
      .from('save_boards')
      .delete()
      .eq('save_id', saveId)
      .eq('board_id', boardId)
    
    if (error) {
      console.error('Error removing save from board:', error)
      throw error
    }
  },

  async likeRestaurantSave(saveId: string, userId: string) {
    const { error } = await supabase
      .from('save_interactions')
      .insert({
        save_id: saveId,
        user_id: userId,
        interaction_type: 'like'
      })
    
    if (error && error.code !== '23505') { // Ignore duplicate key errors
      console.error('Error liking save:', error)
      throw error
    }
  },

  async unlikeRestaurantSave(saveId: string, userId: string) {
    const { error } = await supabase
      .from('save_interactions')
      .delete()
      .eq('save_id', saveId)
      .eq('user_id', userId)
      .eq('interaction_type', 'like')
    
    if (error) {
      console.error('Error unliking save:', error)
      throw error
    }
  },

  async getTrendingRestaurants(city?: string) {
    const { data, error } = await supabase
      .rpc('get_trending_restaurants', {
        p_city: city,
        p_limit: 10
      })
    
    if (error) {
      console.error('Error fetching trending restaurants:', error)
      return []
    }
    return data
  },

  async getPersonaRecommendations(userId: string) {
    const { data, error } = await supabase
      .rpc('get_persona_recommendations', {
        p_user_id: userId,
        p_limit: 20
      })
    
    if (error) {
      console.error('Error fetching recommendations:', error)
      return []
    }
    return data
  },

  async createRestaurant(restaurant: RestaurantInsert): Promise<Restaurant | null> {
    const { data, error } = await supabase
      .from('restaurants')
      .insert(restaurant)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating restaurant:', error)
      return null
    }
    return data
  }
}