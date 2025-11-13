# Picked Video Optimization Guide

## The Problem

**Videos picked from camera roll are NOT automatically optimized** because:
- `expo-image-picker`'s `videoQuality` option only works for **recording**, not **picking**
- Picked videos come as-is from the device's storage
- No client-side compression is possible with Expo Go

## Current Behavior

### ✅ Recorded Videos (Optimized)
- Quality: 60% (configurable)
- File size: 40-60% reduction
- Works immediately

### ❌ Picked Videos (Not Optimized)
- Original file size
- No compression applied
- May be very large (50MB+)

## Solutions

### Option 1: Enable Backend Compression (Recommended)

**Update `postMediaService.ts`:**

```typescript
async pickVideos(maxVideos: number = 5): Promise<string[]> {
  const { VideoOptimizationService } = await import('./videoOptimizationService');
  return await VideoOptimizationService.pickVideos(maxVideos, {
    quality: 0.6,
    maxDuration: 60,
    enableBackendCompression: true, // ✅ Enable this
  });
}
```

**Then deploy Edge Function:**
```bash
supabase functions deploy compress-video
```

**Note:** The Edge Function currently returns original URLs (placeholder). For production, integrate:
- Cloudinary (recommended - easiest)
- Mux (best quality)
- FFmpeg in Edge Function (complex)

### Option 2: Use Cloudinary (Easiest)

**Install:**
```bash
npm install cloudinary
```

**Update upload flow:**
```typescript
import { v2 as cloudinary } from 'cloudinary';

// After picking video
const result = await cloudinary.uploader.upload(videoUri, {
  resource_type: 'video',
  eager: [
    { quality: 'auto', format: 'mp4' }, // Auto-optimized version
  ],
  eager_async: true,
});

// Use result.eager[0].secure_url for optimized video
```

**Benefits:**
- ✅ Automatic optimization
- ✅ Multiple quality levels
- ✅ Works with Expo Go
- ✅ Free tier: 25GB storage, 25GB bandwidth/month

### Option 3: Use Mux (Best Quality)

**Install:**
```bash
npm install @mux/mux-node
```

**Update upload flow:**
```typescript
import Mux from '@mux/mux-node';

const mux = new Mux(process.env.MUX_TOKEN_ID, process.env.MUX_TOKEN_SECRET);

// After picking video
const asset = await mux.video.assets.create({
  input: videoUrl, // Upload to temp location first
  playback_policy: ['public'],
  encoding_tier: 'smart', // Adaptive bitrate
});

// Use asset.playback_ids[0].id for playback
```

**Benefits:**
- ✅ Best quality/compression
- ✅ Adaptive streaming (HLS)
- ✅ Automatic transcoding
- ✅ Free tier: 100GB/month

### Option 4: Warn Users (Temporary)

**Add file size check and warning:**

```typescript
// In VideoOptimizationService.pickVideos()
for (const videoUri of videoUris) {
  const size = await this.getVideoFileSize(videoUri);
  const sizeMB = size / 1024 / 1024;
  
  if (sizeMB > 10) {
    // Warn user or reject
    Alert.alert(
      'Large Video',
      `This video is ${sizeMB.toFixed(1)}MB. Large videos may take longer to upload.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => proceed },
      ]
    );
  }
}
```

## Recommended Implementation

### Phase 1: Current (Quick Fix)
- ✅ Keep backend compression disabled
- ✅ Add file size warning for large videos
- ✅ Accept that picked videos may be larger

### Phase 2: Cloudinary Integration (Recommended)
1. Sign up for Cloudinary (free tier)
2. Install `cloudinary` package
3. Upload picked videos to Cloudinary
4. Use Cloudinary's optimized URLs

### Phase 3: Mux Integration (Best Quality)
1. Sign up for Mux (free tier)
2. Install `@mux/mux-node`
3. Upload to Mux for processing
4. Use Mux playback URLs

## Code Example: Cloudinary Integration

```typescript
// services/cloudinaryVideoService.ts
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class CloudinaryVideoService {
  static async uploadAndOptimize(videoUri: string): Promise<string> {
    const result = await cloudinary.uploader.upload(videoUri, {
      resource_type: 'video',
      eager: [
        { quality: 'auto', format: 'mp4' },
        { quality: 'auto:low', format: 'mp4' }, // Lower quality option
      ],
      eager_async: true,
    });
    
    // Return optimized URL
    return result.eager?.[0]?.secure_url || result.secure_url;
  }
}
```

**Update `postMediaService.ts`:**
```typescript
async uploadPostVideos(videos: string[], userId: string, postId?: string): Promise<string[]> {
  const optimizedVideos = await Promise.all(
    videos.map(video => {
      // Check if it's a picked video (large file)
      const size = await VideoOptimizationService.getVideoFileSize(video);
      if (size > 10 * 1024 * 1024) {
        // Use Cloudinary for large picked videos
        return CloudinaryVideoService.uploadAndOptimize(video);
      }
      // Use regular upload for recorded videos (already optimized)
      return video;
    })
  );
  
  // Then upload optimized videos...
}
```

## Summary

| Solution | Setup Time | Cost | Quality | Expo Go Compatible |
|----------|-----------|------|---------|-------------------|
| **Current** | ✅ Done | Free | ⭐⭐ | ✅ Yes (but no optimization) |
| **Backend Compression** | 2-4 hours | Free | ⭐⭐⭐ | ✅ Yes (requires Edge Function) |
| **Cloudinary** | 1-2 hours | Free tier | ⭐⭐⭐⭐ | ✅ Yes |
| **Mux** | 2-4 hours | Free tier | ⭐⭐⭐⭐⭐ | ✅ Yes |

## Next Steps

1. **Immediate:** Keep current implementation, add file size warnings
2. **Short-term:** Integrate Cloudinary for picked videos
3. **Long-term:** Consider Mux for best quality and adaptive streaming

