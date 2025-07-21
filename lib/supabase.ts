import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Type definitions for database tables
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          phone: string | null
          username: string | null
          name: string | null
          bio: string | null
          avatar_url: string | null
          persona: string | null
          is_verified: boolean
          is_restaurant: boolean
          is_creator: boolean
          profile_completion: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          phone?: string | null
          username?: string | null
          name?: string | null
          bio?: string | null
          avatar_url?: string | null
          persona?: string | null
          is_verified?: boolean
          is_restaurant?: boolean
          is_creator?: boolean
          profile_completion?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          phone?: string | null
          username?: string | null
          name?: string | null
          bio?: string | null
          avatar_url?: string | null
          persona?: string | null
          is_verified?: boolean
          is_restaurant?: boolean
          is_creator?: boolean
          profile_completion?: number
          created_at?: string
          updated_at?: string
        }
      }
      restaurants: {
        Row: {
          id: string
          google_place_id: string | null
          name: string
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          location: unknown | null
          cuisine_types: string[] | null
          price_range: string | null
          phone: string | null
          website: string | null
          hours: unknown | null
          photos: string[] | null
          cover_photo_url: string | null
          google_rating: number | null
          google_reviews_count: number | null
          troodie_rating: number | null
          troodie_reviews_count: number
          features: string[] | null
          dietary_options: string[] | null
          is_verified: boolean
          is_claimed: boolean
          owner_id: string | null
          data_source: 'seed' | 'google' | 'user' | null
          created_at: string
          updated_at: string
          last_google_sync: string | null
        }
        Insert: {
          id?: string
          google_place_id?: string | null
          name: string
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          location?: unknown | null
          cuisine_types?: string[] | null
          price_range?: string | null
          phone?: string | null
          website?: string | null
          hours?: unknown | null
          photos?: string[] | null
          cover_photo_url?: string | null
          google_rating?: number | null
          google_reviews_count?: number | null
          troodie_rating?: number | null
          troodie_reviews_count?: number
          features?: string[] | null
          dietary_options?: string[] | null
          is_verified?: boolean
          is_claimed?: boolean
          owner_id?: string | null
          data_source?: 'seed' | 'google' | 'user' | null
          created_at?: string
          updated_at?: string
          last_google_sync?: string | null
        }
        Update: {
          id?: string
          google_place_id?: string | null
          name?: string
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          location?: unknown | null
          cuisine_types?: string[] | null
          price_range?: string | null
          phone?: string | null
          website?: string | null
          hours?: unknown | null
          photos?: string[] | null
          cover_photo_url?: string | null
          google_rating?: number | null
          google_reviews_count?: number | null
          troodie_rating?: number | null
          troodie_reviews_count?: number
          features?: string[] | null
          dietary_options?: string[] | null
          is_verified?: boolean
          is_claimed?: boolean
          owner_id?: string | null
          data_source?: 'seed' | 'google' | 'user' | null
          created_at?: string
          updated_at?: string
          last_google_sync?: string | null
        }
      }
      restaurant_saves: {
        Row: {
          id: string
          user_id: string
          restaurant_id: string
          personal_rating: number | null
          visit_date: string | null
          photos: string[] | null
          notes: string | null
          tags: string[] | null
          would_recommend: boolean | null
          price_range: string | null
          visit_type: 'dine_in' | 'takeout' | 'delivery' | null
          privacy: 'public' | 'friends' | 'private'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          restaurant_id: string
          personal_rating?: number | null
          visit_date?: string | null
          photos?: string[] | null
          notes?: string | null
          tags?: string[] | null
          would_recommend?: boolean | null
          price_range?: string | null
          visit_type?: 'dine_in' | 'takeout' | 'delivery' | null
          privacy?: 'public' | 'friends' | 'private'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          restaurant_id?: string
          personal_rating?: number | null
          visit_date?: string | null
          photos?: string[] | null
          notes?: string | null
          tags?: string[] | null
          would_recommend?: boolean | null
          price_range?: string | null
          visit_type?: 'dine_in' | 'takeout' | 'delivery' | null
          privacy?: 'public' | 'friends' | 'private'
          created_at?: string
          updated_at?: string
        }
      }
      boards: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          cover_image_url: string | null
          type: 'free' | 'private' | 'paid'
          category: string | null
          location: string | null
          tags: string[] | null
          price: number | null
          currency: string
          billing_type: string | null
          allow_comments: boolean
          allow_saves: boolean
          member_count: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          cover_image_url?: string | null
          type?: 'free' | 'private' | 'paid'
          category?: string | null
          location?: string | null
          tags?: string[] | null
          price?: number | null
          currency?: string
          billing_type?: string | null
          allow_comments?: boolean
          allow_saves?: boolean
          member_count?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          cover_image_url?: string | null
          type?: 'free' | 'private' | 'paid'
          category?: string | null
          location?: string | null
          tags?: string[] | null
          price?: number | null
          currency?: string
          billing_type?: string | null
          allow_comments?: boolean
          allow_saves?: boolean
          member_count?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}