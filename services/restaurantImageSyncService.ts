import { supabase } from '@/lib/supabase';

export const restaurantImageSyncService = {
  /**
   * Check if post images are properly synced to restaurant_images table
   */
  async checkPostImageSync(postId: string): Promise<boolean> {
    try {
      // Get post data
      const { data: post } = await supabase
        .from('posts')
        .select('id, restaurant_id, user_id, photos, privacy')
        .eq('id', postId)
        .single();

      if (!post || !post.photos || post.photos.length === 0) {
        return false;
      }

      // Check if images exist in restaurant_images
      const { data: existingImages } = await supabase
        .from('restaurant_images')
        .select('id, image_url')
        .eq('post_id', postId);

      const existingUrls = new Set(existingImages?.map(img => img.image_url) || []);
      const missingPhotos = post.photos.filter(photo => !existingUrls.has(photo));

      if (missingPhotos.length > 0) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking post image sync:', error);
      return false;
    }
  },

  /**
   * Manually sync post images to restaurant_images table
   */
  async syncPostImages(postId: string): Promise<boolean> {
    try {
      // Use the database function that has SECURITY DEFINER
      const { error } = await supabase.rpc('sync_post_images_to_restaurant', {
        p_post_id: postId
      });

      if (error) {
        console.error('Error syncing post images:', error);
        
        // Fallback to checking if images are already synced
        const isSynced = await this.checkPostImageSync(postId);
        return isSynced;
      }

      return true;
    } catch (error) {
      console.error('Error syncing post images:', error);
      return false;
    }
  },

  /**
   * Sync all posts for a restaurant
   */
  async syncAllRestaurantPosts(restaurantId: string): Promise<number> {
    try {
      // Get all posts for this restaurant with photos
      const { data: posts } = await supabase
        .from('posts')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .not('photos', 'is', null);

      if (!posts || posts.length === 0) {
        return 0;
      }

      let syncedCount = 0;
      for (const post of posts) {
        const synced = await this.syncPostImages(post.id);
        if (synced) syncedCount++;
      }

      return syncedCount;
    } catch (error) {
      console.error('Error syncing restaurant posts:', error);
      return 0;
    }
  }
};