/**
 * Video Optimization Service
 * 
 * Production-ready video optimization that works with Expo Go.
 * Uses client-side optimization (expo-image-picker quality) and optional backend processing.
 */

import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import config from '@/lib/config';

export interface VideoOptimizationOptions {
  /**
   * Video quality when recording/picking (0.0 - 1.0)
   * Lower = smaller file, higher = better quality
   * Recommended: 0.5-0.7 for good balance
   */
  quality?: number;
  
  /**
   * Maximum duration in seconds
   */
  maxDuration?: number;
  
  /**
   * Enable backend compression (requires Edge Function)
   */
  enableBackendCompression?: boolean;
}

export class VideoOptimizationService {
  /**
   * Default optimization settings for mobile uploads
   */
  private static readonly DEFAULT_OPTIONS: Required<VideoOptimizationOptions> = {
    quality: 0.6, // 60% quality - good balance
    maxDuration: 60, // 60 seconds max
    enableBackendCompression: false, // Disabled by default, enable when Edge Function is ready
  };

  /**
   * Pick videos from gallery with optimization settings
   * This is the primary method - videos are optimized at pick time
   */
  static async pickVideos(
    maxVideos: number = 5,
    options: VideoOptimizationOptions = {}
  ): Promise<string[]> {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Permission to access camera roll is required!');
      }

      const opts = { ...this.DEFAULT_OPTIONS, ...options };

      // Launch video picker with quality settings
      // Note: videoQuality is only available for camera recording, not library picking
      // But we can still optimize by limiting selection
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: true,
        selectionLimit: maxVideos,
        videoMaxDuration: opts.maxDuration,
        // Quality is handled during recording, not picking
        // For picked videos, we rely on backend compression
      });

      if (result.canceled) {
        return [];
      }

      const videoUris = result.assets.map(asset => asset.uri);
      
      // Check if videos need optimization (picked videos can't be optimized client-side)
      const videosToOptimize: string[] = [];
      const optimizedUris: string[] = [];
      
      for (const videoUri of videoUris) {
        const needsOptimization = await this.shouldOptimize(videoUri, 10 * 1024 * 1024); // 10MB threshold
        
        if (needsOptimization) {
          console.log(`[VideoOptimization] Video exceeds size limit, will use backend compression: ${videoUri}`);
          videosToOptimize.push(videoUri);
        } else {
          optimizedUris.push(videoUri);
        }
      }
      
      // If backend compression is enabled and videos need it, process them
      if (opts.enableBackendCompression && videosToOptimize.length > 0) {
        const backendOptimized = await this.processVideosWithBackend(videosToOptimize);
        return [...optimizedUris, ...backendOptimized];
      }
      
      // If videos need optimization but backend is disabled, warn user
      if (videosToOptimize.length > 0 && !opts.enableBackendCompression) {
        console.warn(
          `[VideoOptimization] ${videosToOptimize.length} video(s) exceed size limit but backend compression is disabled. ` +
          `Consider enabling backend compression or using a service like Cloudinary/Mux.`
        );
      }

      return videoUris;
    } catch (error) {
      console.error('[VideoOptimization] Error picking videos:', error);
      throw new Error(`Failed to pick videos: ${error}`);
    }
  }

  /**
   * Record video with camera with optimization settings
   * This is where we can control quality directly
   */
  static async recordVideo(
    options: VideoOptimizationOptions = {}
  ): Promise<string | null> {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Permission to access camera is required!');
      }

      const opts = { ...this.DEFAULT_OPTIONS, ...options };

      // Launch camera for video recording with quality settings
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        videoQuality: opts.quality, // This controls compression during recording
        videoMaxDuration: opts.maxDuration,
        allowsEditing: true,
      });

      if (result.canceled) {
        return null;
      }

      const videoUri = result.assets[0].uri;

      // If backend compression is enabled, process video
      if (opts.enableBackendCompression) {
        const processed = await this.processVideosWithBackend([videoUri]);
        return processed[0] || videoUri;
      }

      return videoUri;
    } catch (error) {
      console.error('[VideoOptimization] Error recording video:', error);
      throw new Error(`Failed to record video: ${error}`);
    }
  }

  /**
   * Process videos with backend compression (Supabase Edge Function)
   * This provides better compression than client-side but requires Edge Function setup
   * 
   * For production, consider using:
   * - Cloudinary (automatic video optimization)
   * - Mux (video processing and streaming)
   * - Supabase Edge Function with FFmpeg (complex setup)
   */
  private static async processVideosWithBackend(videoUris: string[]): Promise<string[]> {
    try {
      console.log('[VideoOptimization] Processing videos with backend compression...');
      
      // First, upload videos to Supabase Storage (temp or final location)
      const uploadedUrls: string[] = [];
      const { supabase } = await import('@/lib/supabase');
      
      for (const videoUri of videoUris) {
        try {
          // Upload to a temp location for processing
          const fileName = `temp/${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`;
          
          // Read file as base64
          const { FileSystem } = await import('expo-file-system');
          const base64 = await FileSystem.readAsStringAsync(videoUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          // Convert to ArrayBuffer
          const { decode } = await import('base64-arraybuffer');
          const arrayBuffer = decode(base64);
          
          // Upload to Supabase Storage
          const { data, error } = await supabase.storage
            .from('post-photos')
            .upload(fileName, arrayBuffer, {
              contentType: 'video/mp4',
              cacheControl: '3600',
            });
          
          if (error) {
            console.error('[VideoOptimization] Upload error:', error);
            uploadedUrls.push(videoUri); // Fallback to original
            continue;
          }
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('post-photos')
            .getPublicUrl(fileName);
          
          uploadedUrls.push(publicUrl);
        } catch (error) {
          console.error('[VideoOptimization] Error uploading for compression:', error);
          uploadedUrls.push(videoUri); // Fallback to original
        }
      }

      // Call Edge Function to compress videos
      const { data, error } = await supabase.functions.invoke('compress-video', {
        body: { 
          videoUrls: uploadedUrls,
          options: {
            maxBitrate: 2000000, // 2 Mbps
            maxResolution: { width: 1080, height: 1920 },
          },
        },
      });

      if (error) {
        console.error('[VideoOptimization] Backend compression error:', error);
        console.warn('[VideoOptimization] Falling back to original videos. Consider enabling Cloudinary/Mux.');
        // Fallback to original videos
        return videoUris;
      }

      return data?.compressedUrls || uploadedUrls || videoUris;
    } catch (error) {
      console.error('[VideoOptimization] Error in backend processing:', error);
      console.warn('[VideoOptimization] Falling back to original videos');
      // Fallback to original videos
      return videoUris;
    }
  }

  /**
   * Get video file size (works with Expo Go)
   * For local files, uses FileSystem to get size
   */
  static async getVideoFileSize(videoUri: string): Promise<number> {
    try {
      // Check if it's a local file (file://) or remote URL (http://)
      if (videoUri.startsWith('file://')) {
        // Use FileSystem for local files
        const { FileSystem } = await import('expo-file-system');
        const fileInfo = await FileSystem.getInfoAsync(videoUri);
        if (fileInfo.exists && 'size' in fileInfo) {
          return fileInfo.size;
        }
      } else {
        // For remote URLs, fetch and check Content-Length header
        const response = await fetch(videoUri, { method: 'HEAD' });
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
          return parseInt(contentLength, 10);
        }
        // Fallback: fetch blob
        const blob = await response.blob();
        return blob.size;
      }
      return 0;
    } catch (error) {
      console.error('[VideoOptimization] Error getting video size:', error);
      return 0;
    }
  }

  /**
   * Check if video needs optimization based on file size
   */
  static async shouldOptimize(
    videoUri: string,
    maxSizeBytes: number = 10 * 1024 * 1024 // 10MB default
  ): Promise<boolean> {
    const size = await this.getVideoFileSize(videoUri);
    return size > maxSizeBytes;
  }

  /**
   * Get recommended quality setting based on video duration and target size
   */
  static getRecommendedQuality(
    durationSeconds: number,
    targetSizeMB: number = 5
  ): number {
    // Calculate bitrate needed for target size
    const targetBitrate = (targetSizeMB * 8 * 1024 * 1024) / durationSeconds; // bits per second
    
    // Map bitrate to quality (rough approximation)
    if (targetBitrate < 1000000) return 0.3; // Very low quality
    if (targetBitrate < 2000000) return 0.5; // Low quality
    if (targetBitrate < 3000000) return 0.6; // Medium quality (recommended)
    if (targetBitrate < 5000000) return 0.7; // High quality
    return 0.8; // Very high quality
  }
}

