import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';

class PostMediaService {
  /**
   * Upload photos for a post
   */
  async uploadPostPhotos(photos: string[], userId: string): Promise<string[]> {
    const uploadedUrls: string[] = [];

    for (const photoUri of photos) {
      try {
        const url = await this.uploadPhoto(photoUri, userId);
        uploadedUrls.push(url);
      } catch (error) {
        console.error('Error uploading photo:', error);
        throw new Error(`Failed to upload photo: ${error}`);
      }
    }

    return uploadedUrls;
  }

  /**
   * Upload a single photo
   */
  async uploadPhoto(photoUri: string, userId: string): Promise<string> {
    // Compress the photo first
    const compressedUri = await this.compressPhoto(photoUri);
    
    // Generate a unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const filename = `posts/${userId}/${timestamp}_${randomId}.jpg`;

    // Convert URI to blob
    const response = await fetch(compressedUri);
    const blob = await response.blob();

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('post-photos')
      .upload(filename, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading to storage:', error);
      throw new Error(`Failed to upload to storage: ${error.message}`);
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('post-photos')
      .getPublicUrl(filename);

    return urlData.publicUrl;
  }

  /**
   * Compress a photo
   */
  async compressPhoto(photoUri: string): Promise<string> {
    // For now, return the original URI
    // In a real implementation, you would use a library like react-native-image-crop-picker
    // or expo-image-manipulator to compress the image
    return photoUri;
  }

  /**
   * Generate a thumbnail for a photo
   */
  async generatePhotoThumbnail(photoUri: string): Promise<string> {
    // For now, return the original URI
    // In a real implementation, you would generate a smaller version
    return photoUri;
  }

  /**
   * Delete a photo from storage
   */
  async deletePostPhoto(photoUrl: string): Promise<void> {
    try {
      // Extract the filename from the URL
      const urlParts = photoUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      const fullPath = `posts/${filename}`;

      const { error } = await supabase.storage
        .from('post-photos')
        .remove([fullPath]);

      if (error) {
        console.error('Error deleting photo from storage:', error);
        throw new Error(`Failed to delete photo: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      throw new Error(`Failed to delete photo: ${error}`);
    }
  }

  /**
   * Pick photos from device gallery
   */
  async pickPhotos(maxPhotos: number = 10): Promise<string[]> {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Permission to access camera roll is required!');
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: maxPhotos,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (result.canceled) {
        return [];
      }

      return result.assets.map(asset => asset.uri);
    } catch (error) {
      console.error('Error picking photos:', error);
      throw new Error(`Failed to pick photos: ${error}`);
    }
  }

  /**
   * Take a photo with camera
   */
  async takePhoto(): Promise<string | null> {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Permission to access camera is required!');
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) {
        return null;
      }

      return result.assets[0].uri;
    } catch (error) {
      console.error('Error taking photo:', error);
      throw new Error(`Failed to take photo: ${error}`);
    }
  }

  /**
   * Validate photo file size and dimensions
   */
  async validatePhoto(photoUri: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Get image info
      const response = await fetch(photoUri);
      const blob = await response.blob();
      
      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (blob.size > maxSize) {
        return {
          isValid: false,
          error: 'Photo size must be less than 10MB',
        };
      }

      // For now, we'll assume the photo is valid
      // In a real implementation, you would check dimensions and other properties
      return { isValid: true };
    } catch (error) {
      console.error('Error validating photo:', error);
      return {
        isValid: false,
        error: 'Failed to validate photo',
      };
    }
  }

  /**
   * Get photo dimensions
   */
  async getPhotoDimensions(photoUri: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
        });
      };
      img.onerror = () => {
        reject(new Error('Failed to get photo dimensions'));
      };
      img.src = photoUri;
    });
  }

  /**
   * Create a photo collage from multiple photos
   */
  async createPhotoCollage(photos: string[]): Promise<string> {
    // This would require a canvas library like react-native-canvas
    // For now, we'll return the first photo
    return photos[0];
  }

  /**
   * Add watermark to photo
   */
  async addWatermark(photoUri: string, watermarkText: string): Promise<string> {
    // This would require image manipulation
    // For now, return the original photo
    return photoUri;
  }

  /**
   * Apply filters to photo
   */
  async applyFilter(photoUri: string, filter: string): Promise<string> {
    // This would require image manipulation
    // For now, return the original photo
    return photoUri;
  }
}

export const postMediaService = new PostMediaService(); 