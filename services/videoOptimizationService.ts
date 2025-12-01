/**
 * Video Optimization Service
 * 
 * Production-ready video optimization that works with Expo Go.
 * Uses client-side optimization (expo-image-picker quality) and optional backend processing.
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { CloudinaryVideoService } from './cloudinaryVideoService';

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
    maxDuration: 300, // 300 seconds (5 minutes) max
    enableBackendCompression: true, // Enabled - Cloudinary is now integrated
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
   * Process videos with backend compression (Cloudinary)
   * Uses Cloudinary for automatic video optimization
   */
  private static async processVideosWithBackend(videoUris: string[]): Promise<string[]> {
    try {
      // Upload and optimize all videos
      const results = await CloudinaryVideoService.uploadAndOptimizeMultiple(videoUris);
      
      // Return optimized URLs
      return results.map(result => result.url);
    } catch (error) {
      // Cloudinary error - falling back to original videos
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

  /**
   * Calculate optimal quality based on video duration
   * Longer videos need more aggressive compression
   */
  static calculateOptimalQuality(durationSeconds: number): number {
    if (durationSeconds <= 30) {
      return 0.7; // 70% quality for short videos
    } else if (durationSeconds <= 60) {
      return 0.6; // 60% quality for 1-minute videos
    } else if (durationSeconds <= 120) {
      return 0.5; // 50% quality for 2-minute videos
    } else if (durationSeconds <= 300) {
      return 0.4; // 40% quality for 5-minute videos (aggressive compression)
    }
    return 0.3; // 30% quality for very long videos
  }

  /**
   * Get video metadata (duration, resolution, file size)
   * 
   * Note: Duration and resolution extraction requires native video processing.
   * For now, we return file size and estimate duration based on typical bitrates.
   * Full metadata extraction can be added later using a native module or backend processing.
   */
  static async getVideoMetadata(videoUri: string): Promise<{
    duration: number;
    width: number;
    height: number;
    fileSize: number;
    bitrate?: number;
  }> {
    try {
      // Get file size
      const fileSize = await this.getVideoFileSize(videoUri);
      
      // Estimate duration based on typical mobile video bitrates
      // Average mobile video: ~2-3 Mbps
      // This is a rough estimate - actual duration should be extracted client-side
      // or via backend processing
      const estimatedBitrate = 2500000; // 2.5 Mbps average
      const estimatedDuration = fileSize > 0 ? (fileSize * 8) / estimatedBitrate : 0;
      
      // For now, return estimated values
      // TODO: Implement proper metadata extraction using:
      // - Client-side: expo-video player (in component context)
      // - Backend: Cloudinary API can provide metadata after upload
      return {
        duration: estimatedDuration,
        width: 1080, // Assume standard mobile resolution
        height: 1920,
        fileSize,
        bitrate: estimatedBitrate,
      };
    } catch (error) {
      return {
        duration: 0,
        width: 0,
        height: 0,
        fileSize: 0,
      };
    }
  }
}

