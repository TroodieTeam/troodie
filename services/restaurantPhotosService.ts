import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';

type RestaurantImage = Database['public']['Tables']['restaurant_images']['Row'];
type RestaurantImageInsert = Database['public']['Tables']['restaurant_images']['Insert'];

interface RestaurantPhotoWithUser extends RestaurantImage {
  user: {
    id: string;
    username: string | null;
    name: string | null;
    avatar_url: string | null;
  } | null;
}

export const restaurantPhotosService = {
  /**
   * Get all photos for a restaurant with user attribution
   */
  async getRestaurantPhotos(restaurantId: string, userId?: string): Promise<RestaurantPhotoWithUser[]> {
    try {
      let query = supabase
        .from('restaurant_images')
        .select(`
          *,
          user:users!user_id (
            id,
            username,
            name,
            avatar_url
          )
        `)
        .eq('restaurant_id', restaurantId)
        .order('uploaded_at', { ascending: false });

      // Filter based on privacy settings
      if (userId) {
        query = query.or(`privacy.eq.public,user_id.eq.${userId}`);
      } else {
        query = query.eq('privacy', 'public');
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching restaurant photos:', error);
      return [];
    }
  },

  /**
   * Get photos with caching for better performance
   */
  async getCachedRestaurantPhotos(restaurantId: string, userId?: string): Promise<RestaurantPhotoWithUser[]> {
    const cacheKey = `restaurant_photos_${restaurantId}_${userId || 'public'}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const photos = await this.getRestaurantPhotos(restaurantId, userId);
    this.cache.set(cacheKey, photos, 300); // Cache for 5 minutes
    return photos;
  },

  /**
   * Subscribe to real-time photo updates for a restaurant
   */
  subscribeToPhotoUpdates(
    restaurantId: string,
    onUpdate: (photo: RestaurantPhotoWithUser) => void,
    onDelete?: (photoId: string) => void
  ) {
    const subscription = supabase
      .channel(`restaurant_photos_${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'restaurant_images',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          // Fetch the full photo data with user info
          const { data } = await supabase
            .from('restaurant_images')
            .select(`
              *,
              user:users!user_id (
                id,
                username,
                name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            onUpdate(data);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'restaurant_images',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          if (onDelete) {
            onDelete(payload.old.id);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },

  /**
   * Upload a photo directly to a restaurant gallery
   */
  async uploadRestaurantPhoto(
    restaurantId: string,
    userId: string,
    imageUrl: string,
    caption?: string,
    privacy: 'public' | 'friends' | 'private' = 'public'
  ): Promise<RestaurantImage | null> {
    try {
      const photoData: RestaurantImageInsert = {
        restaurant_id: restaurantId,
        user_id: userId,
        image_url: imageUrl,
        caption,
        source: 'user_upload',
        privacy,
      };

      const { data, error } = await supabase
        .from('restaurant_images')
        .insert(photoData)
        .select()
        .single();

      if (error) throw error;

      // Trigger cover photo update
      await this.checkAndUpdateCoverPhoto(restaurantId);

      return data;
    } catch (error) {
      console.error('Error uploading restaurant photo:', error);
      return null;
    }
  },

  /**
   * Check if restaurant needs a cover photo update
   */
  async checkAndUpdateCoverPhoto(restaurantId: string): Promise<void> {
    try {
      // Get current restaurant data
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('cover_photo_url')
        .eq('id', restaurantId)
        .single();

      // If no cover photo, trigger update
      if (!restaurant?.cover_photo_url) {
        await supabase.rpc('update_restaurant_cover_photo', {
          p_restaurant_id: restaurantId,
        });
      }
    } catch (error) {
      console.error('Error updating cover photo:', error);
    }
  },

  /**
   * Get photo stats for a restaurant
   */
  async getPhotoStats(restaurantId: string) {
    try {
      const { data, error } = await supabase
        .from('restaurant_images')
        .select('id, user_id, source')
        .eq('restaurant_id', restaurantId)
        .eq('privacy', 'public');

      if (error) throw error;

      const stats = {
        totalPhotos: data?.length || 0,
        uniqueContributors: new Set(data?.map(p => p.user_id).filter(Boolean)).size,
        photosBySource: {
          user_post: data?.filter(p => p.source === 'user_post').length || 0,
          user_upload: data?.filter(p => p.source === 'user_upload').length || 0,
          restaurant_upload: data?.filter(p => p.source === 'restaurant_upload').length || 0,
          external: data?.filter(p => p.source === 'external').length || 0,
        },
      };

      return stats;
    } catch (error) {
      console.error('Error getting photo stats:', error);
      return null;
    }
  },

  /**
   * Like/unlike a photo
   */
  async togglePhotoLike(photoId: string, userId: string, isLiked: boolean): Promise<boolean> {
    try {
      if (isLiked) {
        // Increment like count
        const { error } = await supabase
          .from('restaurant_images')
          .update({ 
            like_count: supabase.raw('like_count + 1'),
            updated_at: new Date().toISOString()
          })
          .eq('id', photoId);

        if (error) throw error;
      } else {
        // Decrement like count
        const { error } = await supabase
          .from('restaurant_images')
          .update({ 
            like_count: supabase.raw('GREATEST(0, like_count - 1)'),
            updated_at: new Date().toISOString()
          })
          .eq('id', photoId);

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Error toggling photo like:', error);
      return false;
    }
  },

  // Simple in-memory cache
  cache: {
    data: new Map<string, { value: any; expires: number }>(),
    
    get(key: string) {
      const item = this.data.get(key);
      if (!item) return null;
      
      if (Date.now() > item.expires) {
        this.data.delete(key);
        return null;
      }
      
      return item.value;
    },
    
    set(key: string, value: any, ttlSeconds: number) {
      this.data.set(key, {
        value,
        expires: Date.now() + ttlSeconds * 1000,
      });
    },
    
    clear() {
      this.data.clear();
    },
  },
};