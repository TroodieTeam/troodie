/**
 * Portfolio Image Service
 * Task: CM-2 - Fix Portfolio Image Upload to Cloud Storage
 *
 * This service handles uploading creator portfolio images to
 * Supabase Storage with compression and progress tracking.
 */

import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const PORTFOLIO_BUCKET = 'creator-portfolios';
const MAX_WIDTH = 1200;
const COMPRESSION_QUALITY = 0.8;

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
}

export interface PortfolioImage {
  id: string;
  uri: string;
  caption: string;
}

export interface UploadedImage {
  id: string;
  url: string;
  caption: string;
}

/**
 * Upload a single portfolio image to Supabase Storage.
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
    // Step 1: Compress and resize image
    onProgress?.(10);

    const processedImage = await manipulateAsync(
      imageUri,
      [{ resize: { width: MAX_WIDTH } }],
      { compress: COMPRESSION_QUALITY, format: SaveFormat.JPEG }
    );

    onProgress?.(30);

    // Step 2: Convert to base64
    const base64 = await FileSystem.readAsStringAsync(processedImage.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    onProgress?.(50);

    // Step 3: Generate unique filename
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const filename = `${userId}/${timestamp}-${imageId}-${randomSuffix}.jpg`;

    // Step 4: Upload to Supabase Storage
    const arrayBuffer = decode(base64);

    const { data, error } = await supabase.storage
      .from(PORTFOLIO_BUCKET)
      .upload(filename, arrayBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    onProgress?.(80);

    if (error) {
      console.error('[PortfolioUpload] Storage error:', error);
      return { success: false, error: error.message };
    }

    // Step 5: Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(PORTFOLIO_BUCKET).getPublicUrl(data.path);

    onProgress?.(100);

    return { success: true, url: publicUrl };
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
  }));

  onProgressUpdate?.(progressState);

  // Upload images sequentially to avoid overwhelming the network
  for (let i = 0; i < images.length; i++) {
    const image = images[i];

    // Update status to processing
    progressState[i].status = 'processing';
    onProgressUpdate?.([...progressState]);

    // Update status to uploading
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
      results.push({
        id: image.id,
        url: result.url,
        caption: image.caption,
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
  uploadAllPortfolioImages,
  uploadPortfolioImagesParallel,
  deletePortfolioImage,
  calculateOverallProgress,
  allUploadsComplete,
  getFailedUploads,
};
