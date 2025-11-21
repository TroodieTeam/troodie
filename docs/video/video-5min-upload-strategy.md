# 5-Minute Video Upload Strategy: Snappy User Experience

## Overview

This document outlines the strategy for enabling smooth, fast video uploads up to **5 minutes (300 seconds)** in length while maintaining a snappy user experience.

## Current State Analysis

### ✅ What's Working
- Recorded videos optimized at 60% quality (40-60% size reduction)
- File size detection for picked videos
- Basic upload infrastructure via `VideoUploadService`
- Video playback improvements (buffering handling, preloading)

### ❌ Current Limitations
- **Max duration:** 60 seconds (need 300 seconds)
- **Picked videos:** Not optimized (can be 100-200MB+)
- **Upload progress:** Not visible to users
- **Background uploads:** Not supported
- **Large file handling:** No chunked uploads
- **Quality settings:** Fixed at 60% (may need adjustment for longer videos)

## Target Metrics for "Snappy" Experience

### User Experience Goals
- **Upload start:** < 2 seconds after user selects video
- **Progress feedback:** Real-time progress indicator
- **Background upload:** User can navigate away during upload
- **File size:** 5-minute videos should be < 30MB (after optimization)
- **Upload time:** < 30 seconds on 4G, < 10 seconds on WiFi
- **Error handling:** Graceful failures with retry options

### Technical Targets
- **Compression ratio:** 70-80% reduction for 5-minute videos
- **Bitrate:** 1-2 Mbps (adaptive based on video content)
- **Resolution:** Max 1080p (downscale if needed)
- **Format:** MP4 (H.264 codec for compatibility)

## Implementation Strategy

### Phase 1: Foundation (Week 1)

#### 1.1 Update Duration Limits

**File:** `services/videoOptimizationService.ts`

```typescript
private static readonly DEFAULT_OPTIONS: Required<VideoOptimizationOptions> = {
  quality: 0.6,
  maxDuration: 300, // ✅ Change from 60 to 300 (5 minutes)
  enableBackendCompression: false,
};
```

**File:** `services/postMediaService.ts`

```typescript
async pickVideos(maxVideos: number = 5): Promise<string[]> {
  const { VideoOptimizationService } = await import('./videoOptimizationService');
  return await VideoOptimizationService.pickVideos(maxVideos, {
    quality: 0.6,
    maxDuration: 300, // ✅ 5 minutes
    enableBackendCompression: false,
  });
}

async recordVideo(): Promise<string | null> {
  const { VideoOptimizationService } = await import('./videoOptimizationService');
  return await VideoOptimizationService.recordVideo({
    quality: 0.6,
    maxDuration: 300, // ✅ 5 minutes
    enableBackendCompression: false,
  });
}
```

#### 1.2 Implement Adaptive Quality Based on Duration

**File:** `services/videoOptimizationService.ts`

```typescript
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
 * Get recommended bitrate for target file size
 */
static getRecommendedBitrate(
  durationSeconds: number,
  targetSizeMB: number = 30 // Target 30MB for 5-minute video
): number {
  // Calculate bitrate: (targetSizeMB * 8 * 1024 * 1024) / durationSeconds
  const targetBitrate = (targetSizeMB * 8 * 1024 * 1024) / durationSeconds;
  
  // Clamp between 500kbps and 3Mbps
  return Math.max(500000, Math.min(3000000, targetBitrate));
}
```

#### 1.3 Add Video Metadata Extraction

**File:** `services/videoOptimizationService.ts`

```typescript
import * as FileSystem from 'expo-file-system';
import { Video } from 'expo-av';

/**
 * Get video metadata (duration, resolution, file size)
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
    
    // For local files, try to get metadata using expo-av
    if (videoUri.startsWith('file://')) {
      const { Video } = await import('expo-av');
      const video = new Video({ uri: videoUri });
      
      // Load video to get metadata
      await video.loadAsync();
      const status = await video.getStatusAsync();
      
      return {
        duration: status.durationMillis / 1000,
        width: status.naturalSize?.width || 0,
        height: status.naturalSize?.height || 0,
        fileSize,
        bitrate: fileSize * 8 / (status.durationMillis / 1000), // bits per second
      };
    }
    
    // For remote URLs, return basic info
    return {
      duration: 0,
      width: 0,
      height: 0,
      fileSize,
    };
  } catch (error) {
    console.error('[VideoOptimization] Error getting metadata:', error);
    return {
      duration: 0,
      width: 0,
      height: 0,
      fileSize: 0,
    };
  }
}
```

### Phase 2: Cloudinary Integration (Week 1-2)

#### 2.1 Setup Cloudinary Account

1. **Sign up:** https://cloudinary.com
2. **Get credentials:**
   - Cloud Name
   - API Key
   - API Secret
3. **Add to environment:**
   ```bash
   # .env
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

#### 2.2 Install Cloudinary SDK

```bash
npm install cloudinary
```

#### 2.3 Create Cloudinary Video Service

**File:** `services/cloudinaryVideoService.ts`

```typescript
import { v2 as cloudinary } from 'cloudinary';
import config from '@/lib/config';
import * as FileSystem from 'expo-file-system';

cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret,
});

export interface CloudinaryUploadProgress {
  bytesUploaded: number;
  totalBytes: number;
  progress: number; // 0-100
}

export class CloudinaryVideoService {
  /**
   * Upload and optimize video with progress tracking
   * 
   * For 5-minute videos, uses aggressive compression:
   * - Quality: auto (Cloudinary's smart optimization)
   * - Max resolution: 1080p
   * - Target bitrate: 1-2 Mbps
   */
  static async uploadAndOptimize(
    videoUri: string,
    onProgress?: (progress: CloudinaryUploadProgress) => void
  ): Promise<string> {
    try {
      console.log('[Cloudinary] Starting upload and optimization...');
      
      // Get file size for progress tracking
      const fileInfo = await FileSystem.getInfoAsync(videoUri);
      const totalBytes = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;
      
      // Upload with aggressive optimization for long videos
      const result = await cloudinary.uploader.upload(videoUri, {
        resource_type: 'video',
        // Aggressive optimization for 5-minute videos
        eager: [
          {
            quality: 'auto:low', // Lower quality for smaller files
            format: 'mp4',
            video_codec: 'h264',
            audio_codec: 'aac',
            width: 1080,
            height: 1920,
            crop: 'limit', // Don't crop, just limit size
            bit_rate: 1500000, // 1.5 Mbps target bitrate
          },
        ],
        eager_async: true,
        // Progress callback (if supported)
        onProgress: (progress) => {
          if (onProgress) {
            onProgress({
              bytesUploaded: progress.bytes || 0,
              totalBytes: progress.total_bytes || totalBytes,
              progress: progress.percent || 0,
            });
          }
        },
      });

      // Return optimized URL (eager transformation)
      const optimizedUrl = result.eager?.[0]?.secure_url || result.secure_url;
      
      console.log('[Cloudinary] Video optimized:', {
        originalSize: totalBytes,
        optimizedUrl,
        duration: result.duration,
      });
      
      return optimizedUrl;
    } catch (error) {
      console.error('[Cloudinary] Upload error:', error);
      throw error;
    }
  }

  /**
   * Upload multiple videos in parallel with progress tracking
   */
  static async uploadAndOptimizeMultiple(
    videoUris: string[],
    onProgress?: (index: number, progress: CloudinaryUploadProgress) => void
  ): Promise<string[]> {
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
   */
  static async shouldUseCloudinary(videoUri: string): Promise<boolean> {
    const { VideoOptimizationService } = await import('./videoOptimizationService');
    const metadata = await VideoOptimizationService.getVideoMetadata(videoUri);
    
    const sizeMB = metadata.fileSize / 1024 / 1024;
    const durationSeconds = metadata.duration;
    
    // Use Cloudinary for large or long videos
    return sizeMB > 20 || durationSeconds > 60;
  }
}
```

#### 2.4 Update Config

**File:** `lib/config.ts`

```typescript
export default {
  // ... existing config
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
};
```

#### 2.5 Integrate Cloudinary into Upload Flow

**File:** `services/postMediaService.ts`

```typescript
async uploadPostVideos(
  videos: string[],
  userId: string,
  postId?: string,
  onProgress?: (videoIndex: number, progress: number) => void
): Promise<string[]> {
  const postIdForUpload = postId || `temp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  const uploadedUrls: string[] = [];

  try {
    console.log(`[PostMediaService] Starting upload of ${videos.length} video(s)`);

    const { CloudinaryVideoService } = await import('./cloudinaryVideoService');
    const { VideoOptimizationService } = await import('./videoOptimizationService');

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      console.log(`[PostMediaService] Processing video ${i + 1}/${videos.length}`);

      // Check if video should use Cloudinary
      const useCloudinary = await CloudinaryVideoService.shouldUseCloudinary(video);

      if (useCloudinary) {
        // Use Cloudinary for optimization
        const optimizedUrl = await CloudinaryVideoService.uploadAndOptimize(
          video,
          (progress) => {
            if (onProgress) {
              onProgress(i, progress.progress);
            }
          }
        );
        uploadedUrls.push(optimizedUrl);
      } else {
        // Use regular Supabase upload for small videos
        const result = await VideoUploadService.uploadVideo(
          video,
          'post-photos',
          `posts/${postIdForUpload}`,
          (progress) => {
            if (onProgress) {
              onProgress(i, progress);
            }
          }
        );
        uploadedUrls.push(result.publicUrl);
      }

      console.log(`[PostMediaService] Video ${i + 1} uploaded successfully`);
    }

    console.log(`[PostMediaService] All ${uploadedUrls.length} videos uploaded successfully`);
    return uploadedUrls;
  } catch (error) {
    console.error('Error uploading videos:', error);
    throw new Error(`Failed to upload videos: ${error}`);
  }
}
```

### Phase 3: Upload Progress UI (Week 2)

#### 3.1 Create Upload Progress Component

**File:** `components/VideoUploadProgress.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { ProgressBar } from 'react-native-paper'; // or custom progress bar

interface VideoUploadProgressProps {
  videoIndex: number;
  totalVideos: number;
  progress: number; // 0-100
  fileName?: string;
}

export function VideoUploadProgress({
  videoIndex,
  totalVideos,
  progress,
  fileName,
}: VideoUploadProgressProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.text}>
          Uploading video {videoIndex + 1} of {totalVideos}
        </Text>
      </View>
      {fileName && (
        <Text style={styles.fileName} numberOfLines={1}>
          {fileName}
        </Text>
      )}
      <ProgressBar progress={progress / 100} color="#007AFF" style={styles.progressBar} />
      <Text style={styles.percentage}>{Math.round(progress)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  text: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  fileName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  percentage: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
});
```

#### 3.2 Update Post Form to Show Progress

**File:** `hooks/usePostForm.ts` or `app/add/create-post.tsx`

```typescript
// Add state for upload progress
const [uploadProgress, setUploadProgress] = useState<{
  videoIndex: number;
  progress: number;
} | null>(null);

// Update upload call
const uploadedVideos = await postMediaService.uploadPostVideos(
  videos,
  userId,
  postId,
  (videoIndex, progress) => {
    setUploadProgress({ videoIndex, progress });
  }
);

// Clear progress when done
setUploadProgress(null);
```

### Phase 4: Background Uploads (Week 2-3)

#### 4.1 Use Expo Background Upload

**File:** `services/backgroundUploadService.ts`

```typescript
import * as FileSystem from 'expo-file-system';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

const BACKGROUND_UPLOAD_TASK = 'background-video-upload';

/**
 * Register background upload task
 */
TaskManager.defineTask(BACKGROUND_UPLOAD_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[BackgroundUpload] Task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }

  const { videoUri, userId, postId } = data as any;
  
  try {
    // Upload video in background
    await uploadVideoInBackground(videoUri, userId, postId);
    return BackgroundFetch.BackgroundFetchResult.Success;
  } catch (error) {
    console.error('[BackgroundUpload] Upload failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Start background upload
 */
export async function startBackgroundUpload(
  videoUri: string,
  userId: string,
  postId: string
): Promise<void> {
  // Check if background fetch is available
  const status = await BackgroundFetch.getStatusAsync();
  
  if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_UPLOAD_TASK, {
      minimumInterval: 1000, // 1 second
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }
}

async function uploadVideoInBackground(
  videoUri: string,
  userId: string,
  postId: string
): Promise<void> {
  // Use Cloudinary or Supabase upload
  const { CloudinaryVideoService } = await import('./cloudinaryVideoService');
  await CloudinaryVideoService.uploadAndOptimize(videoUri);
}
```

### Phase 5: Chunked Uploads for Large Files (Week 3)

#### 5.1 Implement Chunked Upload

**File:** `services/chunkedUploadService.ts`

```typescript
import * as FileSystem from 'expo-file-system';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

export class ChunkedUploadService {
  /**
   * Upload large video in chunks
   * Useful for videos > 50MB
   */
  static async uploadInChunks(
    videoUri: string,
    uploadUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    if (!fileInfo.exists || !('size' in fileInfo)) {
      throw new Error('File not found');
    }

    const totalSize = fileInfo.size;
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
    let uploadedBytes = 0;

    // Read and upload chunks
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalSize);
      
      // Read chunk
      const chunkData = await FileSystem.readAsStringAsync(videoUri, {
        encoding: FileSystem.EncodingType.Base64,
        position: start,
        length: end - start,
      });

      // Upload chunk
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Range': `bytes ${start}-${end - 1}/${totalSize}`,
        },
        body: chunkData,
      });

      uploadedBytes += end - start;
      
      if (onProgress) {
        onProgress((uploadedBytes / totalSize) * 100);
      }
    }
  }
}
```

## Quality Settings by Duration

| Duration | Quality | Bitrate | Target Size | Use Case |
|----------|---------|---------|-------------|----------|
| 0-30s | 70% | 2-3 Mbps | 5-10 MB | Short clips |
| 30-60s | 60% | 1.5-2 Mbps | 10-15 MB | Standard posts |
| 1-2 min | 50% | 1-1.5 Mbps | 15-20 MB | Longer content |
| 2-5 min | 40% | 0.8-1.2 Mbps | 20-30 MB | Extended videos |

## Expected Results

### File Size Reduction

| Original Duration | Original Size | Optimized Size | Reduction |
|-------------------|--------------|----------------|-----------|
| 30 seconds | 15-25 MB | 5-8 MB | 60-70% |
| 1 minute | 30-50 MB | 10-15 MB | 65-75% |
| 2 minutes | 60-100 MB | 15-20 MB | 70-80% |
| 5 minutes | 150-250 MB | 25-35 MB | 75-85% |

### Upload Times (Estimated)

| Network | 30s Video | 1 min Video | 5 min Video |
|---------|-----------|-------------|-------------|
| WiFi (50 Mbps) | 1-2s | 2-3s | 5-8s |
| 4G (10 Mbps) | 5-8s | 10-15s | 25-30s |
| 3G (2 Mbps) | 20-30s | 40-60s | 2-3 min |

## Testing Checklist

### Phase 1: Foundation
- [ ] Update maxDuration to 300 seconds
- [ ] Test recording 5-minute video
- [ ] Test picking 5-minute video
- [ ] Verify adaptive quality calculation
- [ ] Test metadata extraction

### Phase 2: Cloudinary
- [ ] Setup Cloudinary account
- [ ] Install Cloudinary SDK
- [ ] Test upload with progress
- [ ] Verify file size reduction
- [ ] Test playback of optimized videos
- [ ] Monitor Cloudinary dashboard

### Phase 3: Progress UI
- [ ] Create progress component
- [ ] Integrate into post form
- [ ] Test progress updates
- [ ] Test multiple video uploads
- [ ] Test error handling

### Phase 4: Background Uploads
- [ ] Test background upload
- [ ] Verify upload continues when app backgrounded
- [ ] Test notification on completion
- [ ] Test error handling

### Phase 5: Chunked Uploads
- [ ] Test chunked upload for large files
- [ ] Verify progress tracking
- [ ] Test resume on failure
- [ ] Test network interruption handling

## Rollback Plan

If issues arise:

1. **Disable Cloudinary temporarily:**
   ```typescript
   enableBackendCompression: false
   ```

2. **Reduce max duration:**
   ```typescript
   maxDuration: 120 // Back to 2 minutes
   ```

3. **Increase quality threshold:**
   ```typescript
   quality: 0.7 // Less aggressive compression
   ```

## Cost Estimates

### Cloudinary
- **Free tier:** 25GB storage, 25GB bandwidth/month
- **5-minute videos:** ~30MB each
- **Free tier capacity:** ~800 videos/month
- **Estimated cost:** $0-20/month for small-medium apps

### Supabase Storage
- **Storage:** $0.021/GB/month
- **Bandwidth:** Included (generous limits)
- **Estimated cost:** $5-15/month

## Next Steps Summary

1. **Week 1:**
   - Update duration limits
   - Implement adaptive quality
   - Setup Cloudinary account

2. **Week 2:**
   - Integrate Cloudinary
   - Add progress UI
   - Test with 5-minute videos

3. **Week 3:**
   - Implement background uploads
   - Add chunked uploads (if needed)
   - Performance testing

4. **Week 4:**
   - User testing
   - Performance optimization
   - Documentation updates

## Success Metrics

- ✅ Users can upload 5-minute videos
- ✅ Upload progress visible
- ✅ File sizes < 30MB for 5-minute videos
- ✅ Upload completes in < 30 seconds on 4G
- ✅ No upload failures due to size limits
- ✅ Smooth playback after upload

