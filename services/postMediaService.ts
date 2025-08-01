import { ImageUploadServiceV2 } from './imageUploadServiceV2';
import * as ImagePicker from 'expo-image-picker';

class PostMediaService {
  /**
   * Upload photos for a post
   */
  async uploadPostPhotos(photos: string[], userId: string, postId?: string): Promise<string[]> {
    // Generate a temporary post ID if not provided
    const postIdForUpload = postId || `temp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const result = await ImageUploadServiceV2.uploadImage(
          photo,
          'post-photos',
          `posts/${postIdForUpload}`
        );
        uploadedUrls.push(result.publicUrl);
      }
      return uploadedUrls;
    } catch (error) {
      console.error('Error uploading photos:', error);
      throw new Error(`Failed to upload photos: ${error}`);
    }
  }

  /**
   * Upload a single photo
   */
  async uploadPhoto(photoUri: string, userId: string, postId: string): Promise<string> {
    try {
      const result = await ImageUploadServiceV2.uploadImage(
        photoUri,
        'post-photos',
        `posts/${postId}`
      );
      return result.publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
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

      // Launch image picker with base64 option for better compatibility
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: maxPhotos,
        quality: 0.8,
        base64: true, // Request base64 data
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