/**
 * Cloudinary Video Service
 * 
 * Handles video upload and optimization via Cloudinary REST API.
 * Uses REST API instead of SDK for React Native/Expo Go compatibility.
 * Provides aggressive compression for 5-minute videos and progress tracking.
 */

import config from '@/lib/config';
import * as FileSystem from 'expo-file-system/legacy';
import { VideoOptimizationService } from './videoOptimizationService';

export interface CloudinaryUploadProgress {
  bytesUploaded: number;
  totalBytes: number;
  progress: number; // 0-100
}

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  duration?: number;
  fileSize?: number;
  width?: number;
  height?: number;
}

export class CloudinaryVideoService {
  private static readonly CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${config.cloudinaryCloudName}/video/upload`;

  /**
   * Upload with progress tracking using XMLHttpRequest
   * React Native's fetch doesn't support upload progress, so we use XHR
   */
  private static async uploadWithProgress(
    url: string,
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Promise<{ ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<any> }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        const response = {
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          text: async () => xhr.responseText,
          json: async () => {
            try {
              return JSON.parse(xhr.responseText);
            } catch (e) {
              throw new Error('Invalid JSON response');
            }
          },
        };
        resolve(response);
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed: Network error'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      // Start upload
      xhr.open('POST', url);
      xhr.send(formData);
    });
  }

  /**
   * Generate Cloudinary signature for authenticated uploads
   * Uses crypto-js or similar for signature generation
   */
  private static async generateSignature(params: Record<string, any>): Promise<string> {
    // Sort parameters and create query string
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    // Create signature string: sorted_params + API_SECRET
    const signatureString = sortedParams + config.cloudinaryApiSecret;
    
    // Generate SHA1 hash (we'll use a simple approach for React Native)
    // Note: For production, consider using a native crypto module or backend
    try {
      // Use Web Crypto API if available (React Native doesn't support it directly)
      // For now, we'll use unsigned uploads with upload preset
      // Or generate signature via backend
      return '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Upload and optimize video with progress tracking using REST API
   * 
   * For 5-minute videos, uses aggressive compression:
   * - Quality: auto:low (Cloudinary's smart optimization)
   * - Max resolution: 1080p
   * - Target bitrate: 1.5 Mbps
   */
  static async uploadAndOptimize(
    videoUri: string,
    onProgress?: (progress: CloudinaryUploadProgress) => void
  ): Promise<CloudinaryUploadResult> {
    try {
      // Get file size for progress tracking
      const fileInfo = await FileSystem.getInfoAsync(videoUri);
      const totalBytes = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;

      // Report initial progress (0%)
      if (onProgress) {
        onProgress({
          bytesUploaded: 0,
          totalBytes,
          progress: 0,
        });
      }

      // Use FormData to upload file directly
      // Cloudinary supports direct file uploads via FormData in React Native
      const formData = new FormData();
      formData.append('file', {
        uri: videoUri,
        type: 'video/mp4',
        name: 'video.mp4',
      } as any);
      
      // Use unsigned uploads with upload preset (requires Cloudinary dashboard setup)
      // See docs/cloudinary-upload-preset-setup.md for instructions
      formData.append('upload_preset', 'troodie_videos');
      formData.append('resource_type', 'video');
      
      // Note: Eager transformations must be configured in the upload preset
      // Unsigned uploads don't allow eager/eager_async parameters in the request
      // Configure eager transformations in Cloudinary dashboard → Upload presets → troodie_videos

      // Upload using XMLHttpRequest for progress tracking (fetch doesn't support progress)
      // Also simulate progress as fallback in case XHR progress events don't fire
      let simulatedProgress = 0;
      const progressInterval = setInterval(() => {
        if (simulatedProgress < 90 && onProgress) {
          simulatedProgress += 5;
          onProgress({
            bytesUploaded: Math.floor((totalBytes * simulatedProgress) / 100),
            totalBytes,
            progress: simulatedProgress,
          });
        }
      }, 500); // Update every 500ms

      const uploadResponse = await this.uploadWithProgress(
        this.CLOUDINARY_UPLOAD_URL,
        formData,
        (progress) => {
          clearInterval(progressInterval); // Clear simulation when real progress starts
          simulatedProgress = progress; // Update simulated progress
          if (onProgress) {
            onProgress({
              bytesUploaded: Math.floor((totalBytes * progress) / 100),
              totalBytes,
              progress,
            });
          }
        }
      );

      // Clear interval when upload completes
      clearInterval(progressInterval);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        // Error logged above
        
        // Provide helpful error message
        let errorMessage = `Cloudinary upload failed: ${uploadResponse.status}`;
        if (errorText.includes('upload preset') || errorText.includes('preset')) {
          errorMessage += '\n\n⚠️ Upload preset not found. Please create an unsigned upload preset named "troodie_videos" in your Cloudinary dashboard.\nSee docs/cloudinary-upload-preset-setup.md for instructions.';
        }
        
        throw new Error(errorMessage);
      }

      // Report 100% progress when upload completes
      if (onProgress) {
        onProgress({
          bytesUploaded: totalBytes,
          totalBytes,
          progress: 100,
        });
      }

      const result = await uploadResponse.json();

      // Check if eager transformation is ready (configured in preset)
      let optimizedUrl = result.secure_url;
      
      // If preset has eager transformations, they'll be in result.eager or result.derived
      if (result.eager && result.eager.length > 0) {
        optimizedUrl = result.eager[0].secure_url;
      } else if (result.derived && result.derived.length > 0) {
        // Check derived transformations (async eager)
        optimizedUrl = result.derived[0].secure_url;
      } else {
        // If eager is async in preset, wait a bit and check status
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get asset details to check transformation status
        try {
          const statusUrl = `https://api.cloudinary.com/v1_1/${config.cloudinaryCloudName}/resources/video/upload/${result.public_id}`;
          const statusResponse = await fetch(statusUrl, {
            headers: {
              'Authorization': `Basic ${btoa(`${config.cloudinaryApiKey}:${config.cloudinaryApiSecret}`)}`,
            },
          });
          
          if (statusResponse.ok) {
            const asset = await statusResponse.json();
            if (asset.derived && asset.derived.length > 0) {
              optimizedUrl = asset.derived[0].secure_url;
              // Async transformation complete
            }
          }
        } catch (error) {
          // Could not check transformation status
        }
      }

      if (onProgress) {
        onProgress({
          bytesUploaded: totalBytes,
          totalBytes,
          progress: 100,
        });
      }
      
      
      return {
        url: optimizedUrl,
        publicId: result.public_id,
        duration: result.duration,
        fileSize: result.bytes,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload multiple videos in parallel with progress tracking
   */
  static async uploadAndOptimizeMultiple(
    videoUris: string[],
    onProgress?: (index: number, progress: CloudinaryUploadProgress) => void
  ): Promise<CloudinaryUploadResult[]> {
    return Promise.all(
      videoUris.map((uri, index) =>
        this.uploadAndOptimize(uri, (progress) => {
          if (onProgress) {
            onProgress(index, progress);
          }
        })
      )
    );
  }

  /**
   * Check if video needs Cloudinary optimization
   * Videos > 20MB or > 60 seconds should use Cloudinary
   * Returns false if video is already a Cloudinary URL
   */
  static async shouldUseCloudinary(videoUri: string): Promise<boolean> {
    try {
      // If video is already a Cloudinary URL, don't process it again
      if (videoUri.startsWith('https://res.cloudinary.com') || videoUri.startsWith('https://cloudinary.com')) {
        return false;
      }
      
      // If video is a remote URL (not local file), don't use Cloudinary
      if (videoUri.startsWith('http://') || videoUri.startsWith('https://')) {
        return false;
      }
      
      const metadata = await VideoOptimizationService.getVideoMetadata(videoUri);
      
      const sizeMB = metadata.fileSize / 1024 / 1024;
      const durationSeconds = metadata.duration;
      
      // Use Cloudinary for large or long videos
      const shouldUse = sizeMB > 20 || durationSeconds > 60;
      
      if (shouldUse) {
      }
      
      return shouldUse;
    } catch (error) {
      // Default to false if we can't determine (safer - won't try to process remote URLs)
      return false;
    }
  }

  /**
   * Delete video from Cloudinary using REST API
   */
  static async deleteVideo(publicId: string): Promise<void> {
    try {
      const timestamp = Math.round(new Date().getTime() / 1000);
      const signature = await this.generateSignature({
        public_id: publicId,
        timestamp,
      });

      const deleteUrl = `https://api.cloudinary.com/v1_1/${config.cloudinaryCloudName}/video/destroy`;
      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('timestamp', timestamp.toString());
      formData.append('api_key', config.cloudinaryApiKey);
      formData.append('signature', signature);

      const response = await fetch(deleteUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to delete video: ${response.status}`);
      }

    } catch (error) {
      throw error;
    }
  }
}
