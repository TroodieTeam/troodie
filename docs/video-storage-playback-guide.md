# Video Storage & Playback Best Practices Guide

## Current Setup Analysis

**Current State:**
- ✅ Videos stored in Supabase Storage (50MB limit)
- ✅ Direct MP4 playback with expo-video
- ❌ No video compression/optimization
- ❌ No adaptive bitrate streaming
- ❌ Buffering issues on slower networks

## Recommended Solutions (Ranked by Impact)

### 🚀 **Option 1: Optimize Current Setup (Quick Wins)**

**Best for:** Immediate improvements with minimal changes

#### 1.1 Add Video Compression Before Upload

**Why:** Reduces file size by 60-80%, faster uploads, less buffering

```typescript
// services/videoCompressionService.ts
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export class VideoCompressionService {
  /**
   * Compress video before upload
   * Note: expo-image-manipulator doesn't support video compression
   * You'll need a native module or backend processing
   */
  
  static async compressVideo(
    videoUri: string,
    maxBitrate: number = 2000000, // 2 Mbps
    maxResolution: { width: number; height: number } = { width: 1080, height: 1920 }
  ): Promise<string> {
    // Option A: Use react-native-compressor (recommended)
    // npm install react-native-compressor
    // import { Video } from 'react-native-compressor';
    // return await Video.compress(videoUri, {
    //   compressionMethod: 'auto',
    //   bitrate: maxBitrate,
    //   maxSize: maxResolution,
    // });
    
    // Option B: Backend processing (better quality, more control)
    // Upload raw video → Backend processes → Store optimized version
    // See Option 2 below
    
    // For now, return original (implement compression)
    return videoUri;
  }
}
```

**Implementation Steps:**
1. Install `react-native-compressor` or use backend processing
2. Compress videos before upload
3. Target: 2-5 Mbps bitrate, max 1080p resolution

#### 1.2 Improve Supabase Storage Configuration

```sql
-- Add better cache headers and CORS for video streaming
UPDATE storage.buckets
SET 
  file_size_limit = 52428800, -- 50MB
  -- Add public access with proper headers
  public = true
WHERE id = 'post-photos';

-- Add CORS headers for video streaming (via Supabase Dashboard or Edge Function)
```

#### 1.3 Add Video Preloading

Already implemented in VideoViewer.tsx ✅

---

### 🎯 **Option 2: Backend Video Processing (Recommended)**

**Best for:** Production apps, better quality control

#### Architecture:
```
User Upload → Supabase Storage (raw) → Backend Processing → 
  → Transcode to multiple qualities → Store optimized versions → 
  → Return URLs to client
```

#### Implementation Options:

**A. Supabase Edge Functions + FFmpeg**
```typescript
// supabase/functions/process-video/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { videoUrl, userId, postId } = await req.json();
  
  // Download video from Supabase Storage
  // Process with FFmpeg (via Deno FFmpeg or external service)
  // Upload optimized versions back to Storage
  // Return URLs
  
  return new Response(JSON.stringify({ 
    videoUrl: optimizedUrl,
    thumbnailUrl: thumbnailUrl 
  }));
});
```

**B. Cloudflare Workers + R2**
- Better for high volume
- Built-in video processing
- Global CDN

**C. AWS Lambda + S3 + MediaConvert**
- Enterprise-grade
- More complex setup
- Best quality/performance

---

### 🌟 **Option 3: Dedicated Video Streaming Service (Best Long-term)**

**Best for:** Apps with heavy video usage, need adaptive streaming

#### Top Options:

**1. Mux (Recommended)**
- ✅ HLS adaptive streaming
- ✅ Automatic transcoding
- ✅ Built-in CDN
- ✅ React Native SDK
- ✅ Free tier: 100GB/month

**Setup:**
```bash
npm install @mux/mux-player-react-native
```

```typescript
// services/muxVideoService.ts
import Mux from '@mux/mux-node';

const mux = new Mux(process.env.MUX_TOKEN_ID, process.env.MUX_TOKEN_SECRET);

export class MuxVideoService {
  static async uploadVideo(videoUrl: string) {
    // Create asset from URL
    const asset = await mux.video.assets.create({
      input: videoUrl,
      playback_policy: ['public'],
      encoding_tier: 'smart', // Adaptive bitrate
    });
    
    return {
      playbackId: asset.playback_ids[0].id,
      hlsUrl: `https://stream.mux.com/${asset.playback_ids[0].id}.m3u8`,
    };
  }
}
```

**Player:**
```typescript
// Use Mux Player instead of expo-video
import { MuxPlayer } from '@mux/mux-player-react-native';

<MuxPlayer
  playbackId={playbackId}
  streamType="on-demand"
  autoPlay
/>
```

**2. Cloudflare Stream**
- ✅ HLS/DASH support
- ✅ Good pricing
- ✅ Global CDN
- ⚠️ Less React Native support

**3. AWS IVS (Interactive Video Service)**
- ✅ Low latency
- ✅ Good for live streaming
- ⚠️ More complex setup

**4. Cloudinary**
- ✅ Good for transformations
- ✅ React Native support
- ⚠️ More expensive at scale

---

### 📊 Comparison Table

| Solution | Setup Time | Cost | Quality | Buffering | Scalability |
|----------|-----------|------|---------|-----------|--------------|
| **Current (Supabase)** | ✅ Done | $ | ⭐⭐ | ❌ High | ⭐⭐ |
| **Compressed Supabase** | 2-4 hours | $ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **Backend Processing** | 1-2 days | $$ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Mux** | 2-4 hours | $$ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Cloudflare Stream** | 4-8 hours | $$ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## Recommended Migration Path

### Phase 1: Immediate (This Week)
1. ✅ Add video compression before upload
2. ✅ Improve preloading logic (already done)
3. ✅ Add better error handling

### Phase 2: Short-term (Next Month)
1. Implement backend video processing
2. Add multiple quality levels (360p, 720p, 1080p)
3. Generate thumbnails automatically

### Phase 3: Long-term (Next Quarter)
1. Migrate to Mux or Cloudflare Stream
2. Implement adaptive bitrate streaming (HLS)
3. Add analytics and playback metrics

---

## Code Examples

### Example 1: Compress Before Upload

```typescript
// services/postMediaService.ts (update)
import { VideoCompressionService } from './videoCompressionService';

async uploadPostVideos(videos: string[], userId: string, postId?: string): Promise<string[]> {
  const compressedVideos = await Promise.all(
    videos.map(video => VideoCompressionService.compressVideo(video))
  );
  
  // Then upload compressed versions
  return await Promise.all(
    compressedVideos.map(video => 
      VideoUploadService.uploadVideo(video, 'post-photos', `${userId}/${postId || 'temp'}`)
    )
  );
}
```

### Example 2: Mux Integration

```typescript
// services/muxVideoService.ts
import Mux from '@mux/mux-node';

export class MuxVideoService {
  private static mux = new Mux(
    process.env.MUX_TOKEN_ID!,
    process.env.MUX_TOKEN_SECRET!
  );

  static async createAssetFromUrl(videoUrl: string) {
    const asset = await this.mux.video.assets.create({
      input: videoUrl,
      playback_policy: ['public'],
      encoding_tier: 'smart', // Adaptive bitrate
      normalize_audio: true,
    });

    return {
      assetId: asset.id,
      playbackId: asset.playback_ids[0].id,
      hlsUrl: `https://stream.mux.com/${asset.playback_ids[0].id}.m3u8`,
      status: asset.status,
    };
  }

  static async createAssetFromUpload(uploadUrl: string) {
    // Create direct upload URL for client-side upload
    const upload = await this.mux.video.directUploads.create({
      new_asset_settings: {
        playback_policy: ['public'],
        encoding_tier: 'smart',
      },
    });

    return {
      uploadId: upload.id,
      uploadUrl: upload.url,
      assetId: upload.asset_id,
    };
  }
}
```

---

## Cost Estimates

### Current Setup (Supabase Storage)
- Storage: ~$0.021/GB/month
- Bandwidth: Included (generous limits)
- **Estimate:** $5-20/month for small app

### Mux
- Free tier: 100GB storage + 1TB delivery/month
- After free: $0.015/GB storage + $0.01/GB delivery
- **Estimate:** $0-50/month for small-medium app

### Cloudflare Stream
- $1 per 1000 minutes stored
- $1 per 1000 minutes delivered
- **Estimate:** $10-100/month depending on usage

---

## Next Steps

1. **Immediate:** Implement video compression (react-native-compressor)
2. **This Week:** Test compression impact on buffering
3. **This Month:** Evaluate Mux vs Cloudflare Stream
4. **Next Quarter:** Migrate to chosen streaming service

---

## References

- [Mux React Native Guide](https://docs.mux.com/guides/video/play-your-videos)
- [Expo Video Documentation](https://docs.expo.dev/versions/latest/sdk/video/)
- [React Native Compressor](https://github.com/Shobbak/react-native-compressor)
- [Video Compression Best Practices](https://www.coconut.co/articles/fix-video-buffering-and-playback-issues-solutions-that-work)

