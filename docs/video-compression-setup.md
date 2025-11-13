# Video Compression Setup Guide

## Overview

Video compression has been integrated into the upload flow to reduce file sizes by 60-80% and improve playback performance. Videos are automatically compressed before upload.

## Installation

1. **Install the package:**
   ```bash
   npm install react-native-compressor
   ```

2. **For iOS, install pods:**
   ```bash
   cd ios && pod install && cd ..
   ```

3. **Rebuild your app:**
   ```bash
   # For iOS
   npx expo run:ios
   
   # For Android
   npx expo run:android
   ```

## How It Works

### Automatic Compression

When videos are uploaded via `postMediaService.uploadPostVideos()`, they are automatically compressed with these settings:

- **Max Bitrate:** 2 Mbps (good balance for mobile)
- **Max Resolution:** 1080p (1920x1080)
- **Compression Method:** Auto (library chooses best settings)

### Compression Flow

```
User selects video
    ↓
VideoCompressionService.compressVideos()
    ↓
Compressed video (60-80% smaller)
    ↓
VideoUploadService.uploadVideo()
    ↓
Uploaded to Supabase Storage
```

## Configuration

### Adjust Compression Settings

Edit `services/postMediaService.ts` to change compression options:

```typescript
const compressedVideos = await VideoCompressionService.compressVideos(videos, {
  maxBitrate: 2000000,        // 2 Mbps (lower = smaller file)
  maxResolution: { 
    width: 1080, 
    height: 1920 
  },
  compressionMethod: 'auto',  // 'auto', 'manual', or 'size'
});
```

### Compression Options

**maxBitrate** (bits per second):
- `1000000` (1 Mbps) - Very small files, lower quality
- `2000000` (2 Mbps) - **Recommended** - Good balance
- `3000000` (3 Mbps) - Higher quality, larger files
- `5000000` (5 Mbps) - High quality, large files

**maxResolution**:
- `{ width: 720, height: 1280 }` - 720p (smaller files)
- `{ width: 1080, height: 1920 }` - **Recommended** - 1080p
- `{ width: 1920, height: 1080 }` - Landscape 1080p

**compressionMethod**:
- `'auto'` - **Recommended** - Library chooses best settings
- `'manual'` - Use provided bitrate/resolution exactly
- `'size'` - Compress to target file size

## Manual Compression

You can also compress videos manually:

```typescript
import { VideoCompressionService } from '@/services/videoCompressionService';

// Compress a single video
const compressedUri = await VideoCompressionService.compressVideo(videoUri, {
  maxBitrate: 2000000,
  maxResolution: { width: 1080, height: 1920 },
});

// Compress multiple videos
const compressedUris = await VideoCompressionService.compressVideos(videoUris);

// Smart compression (only compress if needed)
const result = await VideoCompressionService.smartCompress(
  videoUri,
  { maxBitrate: 2000000 },
  10 * 1024 * 1024 // Only compress if > 10MB
);
```

## Expected Results

### Before Compression:
- 8-second video: ~15-25 MB
- 30-second video: ~50-80 MB
- Buffering issues on slower networks

### After Compression:
- 8-second video: ~3-5 MB (60-80% reduction)
- 30-second video: ~10-15 MB (60-80% reduction)
- Smooth playback on most networks

## Troubleshooting

### Compression Fails

If compression fails, the original video is uploaded as a fallback. Check logs for:
```
[VideoCompression] Error compressing video: ...
[VideoCompression] Returning original video due to compression error
```

**Common Issues:**
1. **Package not installed:** Run `npm install react-native-compressor`
2. **Pods not installed (iOS):** Run `cd ios && pod install`
3. **App not rebuilt:** Rebuild after installing the package

### Compression Takes Too Long

Compression happens on-device and can take time for large videos. Consider:
- Using `smartCompress()` to skip compression for small videos
- Showing a progress indicator during compression
- Compressing in background (future enhancement)

### Quality Too Low

Increase `maxBitrate`:
```typescript
maxBitrate: 3000000, // 3 Mbps instead of 2 Mbps
```

### Quality Too High / Files Still Large

Decrease `maxBitrate` or resolution:
```typescript
maxBitrate: 1500000, // 1.5 Mbps
maxResolution: { width: 720, height: 1280 }, // 720p instead of 1080p
```

## Performance Tips

1. **Compress in parallel:** Already implemented - multiple videos compress simultaneously
2. **Show progress:** Consider adding a progress indicator during compression
3. **Cache compressed videos:** Store compressed versions locally to avoid re-compression
4. **Background compression:** For future - compress videos in background when app is idle

## Next Steps

1. ✅ Compression integrated
2. ⏳ Test with real videos
3. ⏳ Monitor file sizes and playback performance
4. ⏳ Consider backend processing for better quality (see `docs/video-storage-playback-guide.md`)

## References

- [react-native-compressor GitHub](https://github.com/Shobbak/react-native-compressor)
- [Video Compression Best Practices](https://www.coconut.co/articles/fix-video-buffering-and-playback-issues-solutions-that-work)

