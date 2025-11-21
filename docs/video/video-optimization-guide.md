# Video Optimization Guide (Expo Go Compatible)

## Overview

This guide covers the production-ready video optimization solution that works with **Expo Go** (no native modules required).

## Architecture

### Current Implementation

1. **Client-Side Optimization** (Primary)
   - Uses `expo-image-picker` quality settings during recording
   - Quality: 0.6 (60%) - good balance for mobile
   - Max duration: 60 seconds
   - Works immediately with Expo Go ✅

2. **Backend Compression** (Optional, Future)
   - Supabase Edge Function for server-side compression
   - Requires FFmpeg setup (complex in Edge Functions)
   - Better quality control but more setup required

## How It Works

### Video Recording

When users record videos, they're automatically optimized:

```typescript
// In postMediaService.recordVideo()
const video = await VideoOptimizationService.recordVideo({
  quality: 0.6,        // 60% quality
  maxDuration: 60,      // 60 seconds max
});
```

**Result:**
- Videos are compressed during recording
- File sizes reduced by 40-60%
- Works with Expo Go ✅

### Video Picking

When users pick videos from gallery:

```typescript
// In postMediaService.pickVideos()
const videos = await VideoOptimizationService.pickVideos(5, {
  quality: 0.6,
  maxDuration: 60,
});
```

**Note:** Quality settings don't apply to picked videos (expo-image-picker limitation).
For picked videos, consider:
1. Backend compression (when Edge Function is ready)
2. Using a service like Cloudinary/Mux
3. Accepting larger files for picked videos

## Configuration

### Adjust Quality Settings

Edit `services/videoOptimizationService.ts`:

```typescript
// Lower quality = smaller files
quality: 0.5,  // 50% - smaller files, lower quality
quality: 0.6,  // 60% - recommended - good balance
quality: 0.7,  // 70% - higher quality, larger files
```

### Enable Backend Compression

When ready to use backend compression:

```typescript
// In postMediaService.ts
enableBackendCompression: true, // Enable Edge Function processing
```

Then deploy the Edge Function:
```bash
supabase functions deploy compress-video
```

## Expected Results

### With Current Settings (quality: 0.6)

**Before Optimization:**
- 8-second video: ~15-25 MB
- 30-second video: ~50-80 MB

**After Optimization:**
- 8-second video: ~6-10 MB (40-60% reduction)
- 30-second video: ~20-30 MB (40-60% reduction)

### Quality Comparison

| Quality | File Size | Visual Quality | Use Case |
|---------|-----------|----------------|----------|
| 0.3-0.4 | Very Small | Lower | Quick uploads, slow networks |
| 0.5-0.6 | Small | Good | **Recommended** - Best balance |
| 0.7-0.8 | Medium | High | When quality is critical |
| 0.9-1.0 | Large | Very High | Not recommended for mobile |

## Production Recommendations

### Phase 1: Current (Expo Go Compatible) ✅

- ✅ Use `expo-image-picker` quality settings
- ✅ Quality: 0.6 for good balance
- ✅ Max duration: 60 seconds
- ✅ Works immediately, no setup needed

### Phase 2: Enhanced (Optional)

**Option A: Cloudinary Integration**
```typescript
// Upload to Cloudinary with automatic compression
const result = await cloudinary.uploader.upload(videoUri, {
  resource_type: 'video',
  eager: [
    { quality: 'auto', format: 'mp4' },
    { quality: 'auto:low', format: 'mp4' }, // Lower quality version
  ],
});
```

**Option B: Mux Integration**
```typescript
// Upload to Mux for automatic transcoding
const asset = await mux.video.assets.create({
  input: videoUrl,
  playback_policy: ['public'],
  encoding_tier: 'smart', // Adaptive bitrate
});
```

**Option C: Supabase Edge Function with FFmpeg**
- More complex setup
- Requires FFmpeg in Edge Function (consider using external service)
- Better control but more maintenance

### Phase 3: Advanced (Future)

- Implement adaptive bitrate streaming (HLS)
- Multiple quality levels (360p, 720p, 1080p)
- Automatic thumbnail generation
- Video analytics

## Troubleshooting

### Videos Still Too Large

1. **Lower quality setting:**
   ```typescript
   quality: 0.5, // Instead of 0.6
   ```

2. **Reduce max duration:**
   ```typescript
   maxDuration: 30, // Instead of 60
   ```

3. **Enable backend compression** (when ready)

### Quality Too Low

1. **Increase quality setting:**
   ```typescript
   quality: 0.7, // Instead of 0.6
   ```

2. **Consider backend compression** for better quality control

### Picked Videos Are Large

Picked videos can't be optimized client-side (expo-image-picker limitation).

**Solutions:**
1. Accept larger files for picked videos
2. Implement backend compression
3. Use Cloudinary/Mux for automatic optimization
4. Warn users about file size limits

## Best Practices

1. **Always use quality settings** when recording
2. **Set reasonable max duration** (60 seconds is good)
3. **Monitor file sizes** and adjust quality as needed
4. **Consider backend processing** for production scale
5. **Test on different devices** to ensure consistent quality

## Migration Path

### Current → Enhanced

1. ✅ Current implementation (Expo Go compatible)
2. ⏳ Add Cloudinary/Mux integration (optional)
3. ⏳ Deploy Edge Function for backend compression (optional)
4. ⏳ Implement adaptive streaming (future)

## References

- [Expo Image Picker Documentation](https://docs.expo.dev/versions/latest/sdk/image-picker/)
- [Video Compression Best Practices](https://www.coconut.co/articles/fix-video-buffering-and-playback-issues-solutions-that-work)
- [Cloudinary Video API](https://cloudinary.com/documentation/video_manipulation_and_delivery)
- [Mux Video API](https://docs.mux.com/guides/video/play-your-videos)

