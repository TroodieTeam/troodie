import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';

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
    console.log('[ImageUploadV2] Starting upload process', { imageUri, bucket, path });
    
    // Try different upload methods in order of reliability
    const methods = [
      { name: 'base64FileSystem', fn: () => this.uploadViaBase64FileSystem(imageUri, bucket, path) },
      { name: 'directBlob', fn: () => this.uploadViaDirectBlob(imageUri, bucket, path) },
      { name: 'formData', fn: () => this.uploadViaFormData(imageUri, bucket, path) },
    ];
    
    let lastError: any;
    
    for (const method of methods) {
      try {
        console.log(`[ImageUploadV2] Trying ${method.name} method...`);
        const result = await method.fn();
        console.log(`[ImageUploadV2] ${method.name} method succeeded!`, result);
        return result;
      } catch (error) {
        console.error(`[ImageUploadV2] ${method.name} method failed:`, error);
        lastError = error;
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
    
    // Generate filename
    const fileName = this.generateFileName(path);
    
    // Read as base64
    const base64 = await FileSystem.readAsStringAsync(processedImage.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    console.log('[Base64FileSystem] Base64 length:', base64.length);
    
    // Convert to ArrayBuffer
    const arrayBuffer = decode(base64);
    console.log('[Base64FileSystem] ArrayBuffer size:', arrayBuffer.byteLength);
    
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
   * Method 2: Direct blob upload
   */
  private static async uploadViaDirectBlob(
    imageUri: string,
    bucket: string,
    path: string
  ): Promise<UploadResult> {
    // Process image
    const processedImage = await manipulateAsync(
      imageUri,
      [{ resize: { width: 800 } }],
      { compress: 0.7, format: SaveFormat.JPEG }
    );
    
    // Generate filename
    const fileName = this.generateFileName(path);
    
    // Fetch as blob
    const response = await fetch(processedImage.uri);
    const blob = await response.blob();
    
    console.log('[DirectBlob] Blob size:', blob.size, 'type:', blob.type);
    
    // Create a new blob with explicit type
    const imageBlob = new Blob([blob], { type: 'image/jpeg' });
    
    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, imageBlob, {
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
   * Method 3: FormData upload
   */
  private static async uploadViaFormData(
    imageUri: string,
    bucket: string,
    path: string
  ): Promise<UploadResult> {
    // Process image
    const processedImage = await manipulateAsync(
      imageUri,
      [{ resize: { width: 800 } }],
      { compress: 0.7, format: SaveFormat.JPEG }
    );
    
    // Generate filename
    const fileName = this.generateFileName(path);
    
    // Create FormData
    const formData = new FormData();
    const file = {
      uri: processedImage.uri,
      type: 'image/jpeg',
      name: fileName.split('/').pop() || 'image.jpg',
    } as any;
    
    formData.append('file', file);
    
    // Get Supabase config
    const supabaseUrl = (supabase as any).supabaseUrl;
    const supabaseKey = (supabase as any).supabaseKey;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration not found');
    }
    
    // Direct upload
    const uploadResponse = await fetch(
      `${supabaseUrl}/storage/v1/object/${bucket}/${fileName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
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
      console.log('[Verify] Checking upload at:', publicUrl);
      const response = await fetch(publicUrl, { method: 'HEAD' });
      
      if (!response.ok) {
        console.warn('[Verify] Upload verification failed:', response.status);
        // Don't throw - sometimes verification fails but upload succeeds
      } else {
        console.log('[Verify] Upload verified successfully');
      }
    } catch (error) {
      console.warn('[Verify] Could not verify upload:', error);
      // Don't throw - verification is optional
    }
  }
  
  /**
   * Upload a profile image
   */
  static async uploadProfileImage(userId: string, imageUri: string): Promise<string> {
    if (!imageUri) {
      throw new Error('No image URI provided');
    }
    
    console.log('[ProfileImage] Starting upload for user:', userId);
    
    const { publicUrl } = await this.uploadImage(
      imageUri,
      'avatars',
      userId
    );
    
    console.log('[ProfileImage] Upload complete:', publicUrl);
    
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