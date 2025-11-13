import config from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

interface UploadResult {
  publicUrl: string;
  fileName: string;
}

export class VideoUploadService {
  /**
   * Upload a video file to Supabase storage
   */
  static async uploadVideo(
    videoUri: string,
    bucket: string,
    path: string
  ): Promise<UploadResult> {
    // Try different upload methods in order of reliability
    const methods = [
      { name: 'base64FileSystem', fn: () => this.uploadViaBase64FileSystem(videoUri, bucket, path) },
      { name: 'formData', fn: () => this.uploadViaFormData(videoUri, bucket, path) },
    ];
    
    let lastError: Error | null = null;
    
    for (const method of methods) {
      try {
        return await method.fn();
      } catch (error) {
        console.error(`[VideoUpload] ${method.name} method failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    
    throw new Error(`All upload methods failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }
  
  /**
   * Method 1: Base64 encoding via FileSystem (most reliable for React Native)
   */
  private static async uploadViaBase64FileSystem(
    videoUri: string,
    bucket: string,
    path: string
  ): Promise<UploadResult> {
    const fileName = this.generateFileName(path, videoUri);
    
    // Read video as base64 and convert to ArrayBuffer
    const base64 = await FileSystem.readAsStringAsync(videoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const arrayBuffer = decode(base64);
    
    // Detect video MIME type from file extension
    const mimeType = this.getVideoMimeType(videoUri);
    
    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, arrayBuffer, {
        contentType: mimeType,
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
    videoUri: string,
    bucket: string,
    path: string
  ): Promise<UploadResult> {
    const fileName = this.generateFileName(path, videoUri);
    const mimeType = this.getVideoMimeType(videoUri);
    
    const formData = new FormData();
    formData.append('file', {
      uri: videoUri,
      type: mimeType,
      name: fileName.split('/').pop() || 'video.mp4',
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
   * Generate a unique filename for video
   * Attempts to preserve original extension, defaults to .mp4
   */
  private static generateFileName(path: string, videoUri?: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    
    // Try to detect extension from URI
    let extension = 'mp4'; // Default
    if (videoUri) {
      const uriWithoutQuery = videoUri.split('?')[0];
      const detectedExt = uriWithoutQuery.split('.').pop()?.toLowerCase();
      if (detectedExt && ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(detectedExt)) {
        extension = detectedExt;
      }
    }
    
    return `${path}/${timestamp}-${randomId}.${extension}`;
  }
  
  /**
   * Get video MIME type from URI
   * Returns a MIME type that matches the allowed_mime_types in the bucket
   */
  private static getVideoMimeType(uri: string): string {
    const extension = uri.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'mp4':
        return 'video/mp4';
      case 'mov':
        return 'video/quicktime';
      case 'avi':
        return 'video/x-msvideo';
      case 'mkv':
        return 'video/x-matroska';
      case 'webm':
        return 'video/webm';
      default:
        // Default to mp4 as it's the most common format
        return 'video/mp4';
    }
  }
  
  /**
   * Verify that the uploaded video is accessible
   */
  private static async verifyUpload(publicUrl: string): Promise<void> {
    try {
      const response = await fetch(publicUrl, { method: 'HEAD' });
      if (!response.ok) {
        console.warn('[Verify] Video upload verification failed:', response.status);
      }
    } catch (error) {
      console.warn('[Verify] Could not verify video upload:', error);
      // Verification is optional - don't throw
    }
  }
  
  /**
   * Delete a video from storage
   */
  static async deleteVideo(bucket: string, fileName: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([fileName]);
      
      if (error) {
        console.error('Delete video error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Video deletion error:', error);
      throw error;
    }
  }
}

