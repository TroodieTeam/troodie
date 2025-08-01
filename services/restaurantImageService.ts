import { supabase } from '@/lib/supabase';

export const restaurantImageService = {
  /**
   * Upload a restaurant image to Supabase storage
   * @param restaurantId - The restaurant ID
   * @param imageUri - The local image URI or base64 data
   * @param imageType - Type of image ('cover' or 'photo')
   * @returns The public URL of the uploaded image
   */
  async uploadRestaurantImage(
    restaurantId: string,
    imageUri: string,
    imageType: 'cover' | 'photo' = 'photo'
  ): Promise<string> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${restaurantId}/${imageType}_${timestamp}.jpg`;

      // Convert to blob if needed
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('restaurant-photos')
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        console.error('Error uploading restaurant image:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('restaurant-photos')
        .getPublicUrl(filename);

      return publicUrl;
    } catch (error) {
      console.error('Failed to upload restaurant image:', error);
      throw error;
    }
  },

  /**
   * Update restaurant with uploaded image URLs
   * @param restaurantId - The restaurant ID
   * @param imageUrl - The image URL to save
   * @param imageType - Type of image to update
   */
  async updateRestaurantImage(
    restaurantId: string,
    imageUrl: string,
    imageType: 'cover' | 'photos' = 'photos'
  ): Promise<void> {
    try {
      if (imageType === 'cover') {
        const { error } = await supabase
          .from('restaurants')
          .update({ cover_photo_url: imageUrl })
          .eq('id', restaurantId);

        if (error) throw error;
      } else {
        // For photos array, append to existing photos
        const { data: restaurant, error: fetchError } = await supabase
          .from('restaurants')
          .select('photos')
          .eq('id', restaurantId)
          .single();

        if (fetchError) throw fetchError;

        const currentPhotos = restaurant?.photos || [];
        const updatedPhotos = [...currentPhotos, imageUrl];

        const { error: updateError } = await supabase
          .from('restaurants')
          .update({ photos: updatedPhotos })
          .eq('id', restaurantId);

        if (updateError) throw updateError;
      }
    } catch (error) {
      console.error('Failed to update restaurant image:', error);
      throw error;
    }
  },

  /**
   * Delete a restaurant image from storage
   * @param imagePath - The path of the image in storage
   */
  async deleteRestaurantImage(imagePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from('restaurant-photos')
        .remove([imagePath]);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete restaurant image:', error);
      throw error;
    }
  },
};