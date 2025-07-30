import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

interface UploadResult {
  url: string | null;
  error: string | null;
}

export const imageUploadService = {
  /**
   * Request permissions for image picker
   */
  async requestPermissions(): Promise<boolean> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  },

  /**
   * Pick image from library
   */
  async pickImage(): Promise<ImagePicker.ImagePickerResult> {
    const hasPermission = await this.requestPermissions();
    
    if (!hasPermission) {
      throw new Error('Permission to access media library was denied');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1200, 630], // Recommended board cover ratio
      quality: 0.8,
    });

    return result;
  },

  /**
   * Compress and resize image for optimal upload
   */
  async compressImage(uri: string, maxWidth: number = 1200): Promise<string> {
    const manipulatedImage = await manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress: 0.8, format: SaveFormat.JPEG }
    );
    
    return manipulatedImage.uri;
  },

  /**
   * Upload image to Supabase Storage
   */
  async uploadImage(
    uri: string,
    bucket: string,
    path: string,
    userId: string
  ): Promise<UploadResult> {
    try {
      // Compress image before upload
      const compressedUri = await this.compressImage(uri);
      
      // Fetch the image as blob
      const response = await fetch(compressedUri);
      const blob = await response.blob();
      
      // Generate unique filename
      const fileExt = 'jpg';
      const fileName = `${userId}/${path}/${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        return { url: null, error: error.message };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return { url: publicUrl, error: null };
    } catch (error: any) {
      console.error('Image upload error:', error);
      return { url: null, error: error.message || 'Failed to upload image' };
    }
  },

  /**
   * Upload board cover image
   */
  async uploadBoardCover(uri: string, userId: string): Promise<UploadResult> {
    return this.uploadImage(uri, 'board-covers', 'boards', userId);
  },

  /**
   * Upload post images
   */
  async uploadPostImages(
    uris: string[],
    userId: string
  ): Promise<{ urls: string[]; errors: string[] }> {
    const urls: string[] = [];
    const errors: string[] = [];

    for (const uri of uris) {
      const result = await this.uploadImage(uri, 'post-images', 'posts', userId);
      if (result.url) {
        urls.push(result.url);
      } else {
        errors.push(result.error || 'Unknown error');
      }
    }

    return { urls, errors };
  },

  /**
   * Upload user avatar
   */
  async uploadUserAvatar(uri: string, userId: string): Promise<UploadResult> {
    return this.uploadImage(uri, 'avatars', 'profiles', userId);
  },

  /**
   * Delete image from Supabase Storage
   */
  async deleteImage(url: string, bucket: string): Promise<boolean> {
    try {
      // Extract file path from URL
      const urlParts = url.split('/');
      const bucketIndex = urlParts.indexOf(bucket);
      if (bucketIndex === -1) return false;
      
      const filePath = urlParts.slice(bucketIndex + 1).join('/');
      
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        console.error('Delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete image error:', error);
      return false;
    }
  },

  /**
   * Validate image before upload
   */
  validateImage(result: ImagePicker.ImagePickerResult): boolean {
    if (result.canceled) {
      return false;
    }

    const asset = result.assets[0];
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (asset.fileSize && asset.fileSize > maxSize) {
      throw new Error('Image size must be less than 10MB');
    }

    return true;
  },
};