import config from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

interface UploadResult {
  publicUrl: string;
  fileName: string;
}

export class ImageUploadServiceV2 {
  /**
   * Main upload method with multiple fallback strategies
   */
  static async uploadImage(
    imageUri: string,
    bucket: string,
    path: string
  ): Promise<UploadResult> {
    // Try different upload methods in order of reliability
    const methods = [
      { name: 'base64FileSystem', fn: () => this.uploadViaBase64FileSystem(imageUri, bucket, path) },
      { name: 'formData', fn: () => this.uploadViaFormData(imageUri, bucket, path) },
    ];
    
    let lastError: Error | null = null;
    
    for (const method of methods) {
      try {
        return await method.fn();
      } catch (error) {
        console.error(`[ImageUploadV2] ${method.name} method failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    
    throw new Error(`All upload methods failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }
  
  /**
   * Method 1: Base64 encoding via FileSystem (most reliable for React Native)
   */
  private static async uploadViaBase64FileSystem(
    imageUri: string,
    bucket: string,
    path: string
  ): Promise<UploadResult> {
    // Process image first
    const processedImage = await manipulateAsync(
      imageUri,
      [{ resize: { width: 800 } }], // Smaller size for faster upload
      { compress: 0.7, format: SaveFormat.JPEG }
    );
    
    const fileName = this.generateFileName(path);
    
    // Read as base64 and convert to ArrayBuffer
    const base64 = await FileSystem.readAsStringAsync(processedImage.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const arrayBuffer = decode(base64);
    
    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, arrayBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      throw error;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    // Verify the upload
    await this.verifyUpload(publicUrl);
    
    return { publicUrl, fileName };
  }
  
  /**
   * Method 2: FormData upload (fallback method)
   */
  private static async uploadViaFormData(
    imageUri: string,
    bucket: string,
    path: string
  ): Promise<UploadResult> {
    const processedImage = await manipulateAsync(
      imageUri,
      [{ resize: { width: 800 } }],
      { compress: 0.7, format: SaveFormat.JPEG }
    );
    
    const fileName = this.generateFileName(path);
    
    const formData = new FormData();
    formData.append('file', {
      uri: processedImage.uri,
      type: 'image/jpeg',
      name: fileName.split('/').pop() || 'image.jpg',
    } as any);
    
    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token || config.supabaseAnonKey;
    
    const uploadResponse = await fetch(
      `${config.supabaseUrl}/storage/v1/object/${bucket}/${fileName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'apikey': config.supabaseAnonKey,
        },
        body: formData,
      }
    );
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    // Verify the upload
    await this.verifyUpload(publicUrl);
    
    return { publicUrl, fileName };
  }
  
  /**
   * Generate a unique filename
   */
  private static generateFileName(path: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    return `${path}/${timestamp}-${randomId}.jpg`;
  }
  
  /**
   * Verify that the uploaded image is accessible
   */
  private static async verifyUpload(publicUrl: string): Promise<void> {
    try {
      const response = await fetch(publicUrl, { method: 'HEAD' });
      if (!response.ok) {
        console.warn('[Verify] Upload verification failed:', response.status);
      }
    } catch (error) {
      console.warn('[Verify] Could not verify upload:', error);
      // Verification is optional - don't throw
    }
  }
  
  /**
   * Upload a profile image
   */
  static async uploadProfileImage(userId: string, imageUri: string): Promise<string> {
    if (!imageUri) {
      throw new Error('No image URI provided');
    }
    
    const { publicUrl } = await this.uploadImage(imageUri, 'avatars', userId);
    return publicUrl;
  }
  
  /**
   * Delete an image from storage
   */
  static async deleteImage(bucket: string, fileName: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([fileName]);
      
      if (error) {
        console.error('Delete image error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Image deletion error:', error);
      throw error;
    }
  }
}