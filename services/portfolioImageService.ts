/**
 * Portfolio Image Service
 * Task: CM-2 - Fix Portfolio Image Upload to Cloud Storage
 *
 * This service handles uploading creator portfolio images to
 * Supabase Storage with compression and progress tracking.
 */

import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { CloudinaryVideoService } from './cloudinaryVideoService';
import { ImageUploadServiceV2 } from './imageUploadServiceV2';
import { VideoUploadService } from './videoUploadService';

const PORTFOLIO_BUCKET = 'creator-portfolios';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface UploadProgress {
  imageId: string;
  progress: number; // 0-100
  status: 'pending' | 'processing' | 'uploading' | 'complete' | 'error';
  error?: string;
  mediaType?: 'image' | 'video'; // Added to distinguish between images and videos
}

export interface PortfolioImage {
  id: string;
  uri: string;
  caption: string;
  mediaType?: 'image' | 'video';
  duration?: number; // For videos, in seconds
}

export interface UploadedImage {
  id: string;
  url: string;
  caption: string;
  mediaType?: 'image' | 'video';
  thumbnailUrl?: string; // For videos
}

/**
 * Upload a single portfolio video to Cloud Storage (Cloudinary or Supabase).
 * Uses the same approach as post creation for consistency and optimization.
 *
 * @param userId - The user's ID (used as folder name)
 * @param videoUri - Local URI of the video
 * @param videoId - Unique identifier for this video
 * @param onProgress - Optional callback for progress updates (0-100)
 * @returns Upload result with cloud URL or error
 */
export async function uploadPortfolioVideo(
  userId: string,
  videoUri: string,
  videoId: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult & { thumbnailUrl?: string }> {
  try {
    onProgress?.(0);

    // Check if video is already a Cloudinary URL (from previous optimization)
    const isCloudinaryUrl = videoUri.startsWith('https://res.cloudinary.com') || videoUri.startsWith('https://cloudinary.com');
    
    // Check if video should use Cloudinary (only for local files)
    const useCloudinary = !isCloudinaryUrl && await CloudinaryVideoService.shouldUseCloudinary(videoUri);

    let publicUrl: string;
    let thumbnailUrl: string | undefined;

    if (useCloudinary) {
      // Use Cloudinary for optimization (better for larger videos)
      onProgress?.(5);
      
      const result = await CloudinaryVideoService.uploadAndOptimize(
        videoUri,
        (progress) => {
          // Convert Cloudinary progress (0-100) to our progress scale
          // Map 0-100% to 5-95% to account for thumbnail generation
          const mappedProgress = 5 + (progress.progress * 0.9);
          onProgress?.(mappedProgress);
        }
      );

      publicUrl = result.url;
      // Cloudinary can generate thumbnails - use their thumbnail URL if available
      if (result.thumbnailUrl) {
        thumbnailUrl = result.thumbnailUrl;
      } else {
        // Generate thumbnail URL from Cloudinary URL
        // Cloudinary format: https://res.cloudinary.com/.../video/upload/.../video.mp4
        // Thumbnail: Replace video/upload with video/upload/w_400,h_300,c_fill,q_auto,f_auto
        thumbnailUrl = publicUrl.replace('/video/upload/', '/video/upload/w_400,h_300,c_fill,q_auto,f_auto/');
        // Change extension to .jpg for thumbnail
        thumbnailUrl = thumbnailUrl.replace(/\.(mp4|mov|avi)$/, '.jpg');
      }
      
      onProgress?.(100);
    } else if (isCloudinaryUrl) {
      // Video is already a Cloudinary URL - use it directly
      publicUrl = videoUri;
      
      // Generate thumbnail URL from Cloudinary URL
      thumbnailUrl = publicUrl.replace('/video/upload/', '/video/upload/w_400,h_300,c_fill,q_auto,f_auto/');
      thumbnailUrl = thumbnailUrl.replace(/\.(mp4|mov|avi)$/, '.jpg');
      
      onProgress?.(100);
    } else {
      // Use regular Supabase upload for small videos
      onProgress?.(10);
      
      // Upload to creator-portfolios bucket
      const uploadPath = `${userId}/${Date.now()}-${videoId}`;
      const result = await VideoUploadService.uploadVideo(
        videoUri,
        PORTFOLIO_BUCKET,
        uploadPath
      );
      
      publicUrl = result.publicUrl;
      
      // For Supabase videos, we can't auto-generate thumbnails easily
      // The VideoThumbnail component will handle displaying the video thumbnail client-side
      // For now, we don't set thumbnailUrl - it will be generated on the client
      
      onProgress?.(100);
    }

    return { success: true, url: publicUrl, thumbnailUrl };
  } catch (error: any) {
    console.error('[PortfolioUpload] Video error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload video',
    };
  }
}

/**
 * Upload a single portfolio image to Supabase Storage.
 * Uses ImageUploadServiceV2 for consistency with post creation and better reliability.
 *
 * @param userId - The user's ID (used as folder name)
 * @param imageUri - Local URI of the image
 * @param imageId - Unique identifier for this image
 * @param onProgress - Optional callback for progress updates
 * @returns Upload result with cloud URL or error
 */
export async function uploadPortfolioImage(
  userId: string,
  imageUri: string,
  imageId: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    onProgress?.(10);

    // Generate upload path
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const uploadPath = `${userId}/${timestamp}-${imageId}-${randomSuffix}`;

    // Use ImageUploadServiceV2 for consistent upload handling with fallbacks
    const result = await ImageUploadServiceV2.uploadImage(
      imageUri,
      PORTFOLIO_BUCKET,
      uploadPath
    );

    onProgress?.(100);

    return { success: true, url: result.publicUrl };
  } catch (error: any) {
    console.error('[PortfolioUpload] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload image',
    };
  }
}

/**
 * Upload multiple portfolio images with progress tracking.
 *
 * @param userId - The user's ID
 * @param images - Array of images to upload
 * @param onProgressUpdate - Callback for progress updates
 * @returns Array of uploaded images with cloud URLs (null for failures)
 */
export async function uploadAllPortfolioImages(
  userId: string,
  images: PortfolioImage[],
  onProgressUpdate?: (progress: UploadProgress[]) => void
): Promise<(UploadedImage | null)[]> {
  const results: (UploadedImage | null)[] = [];

  // Initialize progress state
  const progressState: UploadProgress[] = images.map((img) => ({
    imageId: img.id,
    progress: 0,
    status: 'pending' as const,
    mediaType: img.mediaType,
  }));

  onProgressUpdate?.(progressState);

  // Upload media sequentially to avoid overwhelming the network
  for (let i = 0; i < images.length; i++) {
    const media = images[i];
    const isVideo = media.mediaType === 'video';

    // Update status to processing
    progressState[i].status = 'processing';
    onProgressUpdate?.([...progressState]);

    // Update status to uploading
    progressState[i].status = 'uploading';
    onProgressUpdate?.([...progressState]);

    let result: UploadResult & { thumbnailUrl?: string };
    
    if (isVideo) {
      result = await uploadPortfolioVideo(
        userId,
        media.uri,
        media.id,
        (progress) => {
          progressState[i].progress = progress;
          onProgressUpdate?.([...progressState]);
        }
      );
    } else {
      result = await uploadPortfolioImage(
        userId,
        media.uri,
        media.id,
        (progress) => {
          progressState[i].progress = progress;
          onProgressUpdate?.([...progressState]);
        }
      );
    }

    if (result.success && result.url) {
      progressState[i].status = 'complete';
      progressState[i].progress = 100;
      results.push({
        id: media.id,
        url: result.url,
        caption: media.caption,
        mediaType: isVideo ? 'video' : 'image',
        thumbnailUrl: result.thumbnailUrl,
      });
    } else {
      progressState[i].status = 'error';
      progressState[i].error = result.error;
      results.push(null);
    }

    onProgressUpdate?.([...progressState]);
  }

  return results;
}

/**
 * Upload portfolio images in parallel for faster uploads.
 * Use with caution - can overwhelm slow networks.
 *
 * @param userId - The user's ID
 * @param images - Array of images to upload
 * @param onProgressUpdate - Callback for progress updates
 * @returns Array of uploaded images with cloud URLs (null for failures)
 */
export async function uploadPortfolioImagesParallel(
  userId: string,
  images: PortfolioImage[],
  onProgressUpdate?: (progress: UploadProgress[]) => void
): Promise<(UploadedImage | null)[]> {
  // Initialize progress state
  const progressState: UploadProgress[] = images.map((img) => ({
    imageId: img.id,
    progress: 0,
    status: 'pending' as const,
    mediaType: img.mediaType,
  }));

  onProgressUpdate?.(progressState);

  // Upload all images in parallel
  const promises = images.map(async (image, i) => {
    progressState[i].status = 'uploading';
    onProgressUpdate?.([...progressState]);

    const result = await uploadPortfolioImage(
      userId,
      image.uri,
      image.id,
      (progress) => {
        progressState[i].progress = progress;
        onProgressUpdate?.([...progressState]);
      }
    );

    if (result.success && result.url) {
      progressState[i].status = 'complete';
      progressState[i].progress = 100;
      onProgressUpdate?.([...progressState]);
      return {
        id: image.id,
        url: result.url,
        caption: image.caption,
      };
    } else {
      progressState[i].status = 'error';
      progressState[i].error = result.error;
      onProgressUpdate?.([...progressState]);
      return null;
    }
  });

  return Promise.all(promises);
}

/**
 * Delete a portfolio image from storage.
 *
 * @param imageUrl - The public URL of the image
 * @returns Success status
 */
export async function deletePortfolioImage(
  imageUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Extract the path from the URL
    const urlParts = imageUrl.split(`${PORTFOLIO_BUCKET}/`);
    if (urlParts.length < 2) {
      return { success: false, error: 'Invalid image URL' };
    }

    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from(PORTFOLIO_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('[PortfolioUpload] Delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[PortfolioUpload] Delete exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete image',
    };
  }
}

/**
 * Calculate overall upload progress from individual progresses.
 *
 * @param progresses - Array of individual upload progresses
 * @returns Overall progress percentage (0-100)
 */
export function calculateOverallProgress(progresses: UploadProgress[]): number {
  if (progresses.length === 0) return 0;

  const total = progresses.reduce((sum, p) => sum + p.progress, 0);
  return Math.round(total / progresses.length);
}

/**
 * Check if all uploads completed successfully.
 *
 * @param progresses - Array of upload progresses
 * @returns True if all uploads completed without errors
 */
export function allUploadsComplete(progresses: UploadProgress[]): boolean {
  return progresses.every((p) => p.status === 'complete');
}

/**
 * Get failed uploads from progress array.
 *
 * @param progresses - Array of upload progresses
 * @returns Array of failed upload progresses
 */
export function getFailedUploads(progresses: UploadProgress[]): UploadProgress[] {
  return progresses.filter((p) => p.status === 'error');
}

// Export as singleton-style object
export const portfolioImageService = {
  uploadPortfolioImage,
  uploadPortfolioVideo,
  uploadAllPortfolioImages,
  uploadPortfolioImagesParallel,
  deletePortfolioImage,
  calculateOverallProgress,
  allUploadsComplete,
  getFailedUploads,
};
