import { supabase } from '@/lib/supabase';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

export type ImageUploadType = 'profile' | 'post';

interface UploadOptions {
  maxWidth?: number;
  quality?: number;
  bucket?: string;
}

class ImageUploadService {
  private readonly defaultOptions: Required<UploadOptions> = {
    maxWidth: 1080,
    quality: 0.8,
    bucket: 'post-photos',
  };

  /**
   * Upload an image to Supabase Storage
   * @param imageUri - The local URI of the image to upload
   * @param type - The type of image (profile or post)
   * @param userId - The user's ID
   * @param additionalPath - Additional path info (e.g., postId)
   * @param options - Upload options
   * @returns The public URL of the uploaded image
   */
  async uploadImage(
    imageUri: string,
    type: ImageUploadType,
    userId: string,
    additionalPath?: string,
    options?: UploadOptions
  ): Promise<string> {
    const config = { ...this.defaultOptions, ...options };
    
    try {
      console.log(`Starting ${type} image upload:`, { imageUri, userId, additionalPath });
      
      // Determine bucket and path based on type
      const { bucket, path } = this.getStorageConfig(type, userId, additionalPath);
      config.bucket = bucket;
      
      // Process the image
      const processedUri = await this.processImage(imageUri, config.maxWidth, config.quality);
      
      // Generate filename
      const filename = this.generateFilename(path);
      
      // Upload to Supabase
      const publicUrl = await this.uploadToStorage(processedUri, filename, config.bucket);
      
      console.log(`${type} image uploaded successfully:`, publicUrl);
      return publicUrl;
    } catch (error) {
      console.error(`Error uploading ${type} image:`, error);
      throw new Error(`Failed to upload ${type} image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload multiple images (for posts)
   */
  async uploadMultipleImages(
    imageUris: string[],
    userId: string,
    postId: string,
    options?: UploadOptions
  ): Promise<string[]> {
    const uploadPromises = imageUris.map((uri, index) =>
      this.uploadImage(uri, 'post', userId, `${postId}/${index}`, options)
    );
    
    return Promise.all(uploadPromises);
  }

  /**
   * Process image (resize and compress)
   */
  private async processImage(uri: string, maxWidth: number, quality: number): Promise<string> {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: maxWidth } }],
        { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
      );
      return result.uri;
    } catch (error) {
      console.error('Error processing image:', error);
      throw new Error('Failed to process image');
    }
  }

  /**
   * Upload to Supabase Storage using base64 method
   */
  private async uploadToStorage(uri: string, filename: string, bucket: string): Promise<string> {
    try {
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log(`Uploading to ${bucket}/${filename}, size: ${base64.length}`);

      // Convert base64 to ArrayBuffer using base64-arraybuffer library
      const arrayBuffer = decode(base64);

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filename, arrayBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Supabase storage error:', error);
        
        // If file exists error, try with a different filename
        if (error.message?.includes('duplicate') || error.message?.includes('already exists')) {
          const newFilename = this.generateFilename(filename.split('/').slice(0, -1).join('/'));
          return this.uploadToStorage(uri, newFilename, bucket);
        }
        
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filename);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Storage upload error:', error);
      throw new Error(`Failed to upload to storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get storage configuration based on image type
   */
  private getStorageConfig(type: ImageUploadType, userId: string, additionalPath?: string): { bucket: string; path: string } {
    switch (type) {
      case 'profile':
        return {
          bucket: 'avatars',
          path: userId,
        };
      case 'post':
        return {
          bucket: 'post-photos',
          path: additionalPath ? `posts/${additionalPath}` : `posts/${userId}`,
        };
      default:
        throw new Error(`Unknown image type: ${type}`);
    }
  }

  /**
   * Generate a unique filename
   */
  private generateFilename(path: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${path}/${timestamp}-${random}.jpg`;
  }

  /**
   * Delete an image from storage
   */
  async deleteImage(imageUrl: string, bucket: string): Promise<void> {
    try {
      // Extract path from URL
      const urlParts = imageUrl.split(`/storage/v1/object/public/${bucket}/`);
      if (urlParts.length < 2) {
        throw new Error('Invalid image URL');
      }
      
      const filePath = urlParts[1];
      
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        console.error('Error deleting image:', error);
        throw error;
      }
    } catch (error) {
      console.error('Delete image error:', error);
      throw new Error(`Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update profile image
   */
  async updateProfileImage(userId: string, imageUri: string): Promise<string> {
    try {
      // Upload new image
      const imageUrl = await this.uploadImage(imageUri, 'profile', userId);
      
      // Update user profile with new image URL
      const { error } = await supabase
        .from('users')
        .update({ avatar_url: imageUrl })
        .eq('id', userId);

      if (error) {
        // If update fails, try to delete the uploaded image
        await this.deleteImage(imageUrl, 'avatars').catch(console.error);
        throw error;
      }

      return imageUrl;
    } catch (error) {
      console.error('Error updating profile image:', error);
      throw new Error(`Failed to update profile image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const imageUploadService = new ImageUploadService();

// Export convenience functions
export const uploadPostImages = (imageUris: string[], userId: string, postId: string) =>
  imageUploadService.uploadMultipleImages(imageUris, userId, postId);

export const uploadProfileImage = (imageUri: string, userId: string) =>
  imageUploadService.updateProfileImage(userId, imageUri);

export const uploadToSupabase = imageUploadService.uploadImage.bind(imageUploadService);