# Complete Cloudinary Preset Setup

## ✅ Step 1: General Settings (Done)
- ✅ Preset name: `troodie_videos`
- ✅ Signing mode: `Unsigned`
- ✅ Asset folder: `troodie/videos`

## ⏳ Step 2: Add Eager Transformations (Required)

To enable automatic video optimization, you need to add eager transformations:

1. **Click on "Transform" tab** in the left sidebar (or "Optimize and Deliver")

2. **Scroll to "Eager transformations" section**

3. **Click "Add transformation"** or "Add eager transformation"

4. **Configure the transformation:**
   - **Quality:** `auto:low` (or select from dropdown)
   - **Format:** `mp4`
   - **Video codec:** `h264`
   - **Audio codec:** `aac`
   - **Width:** `1080`
   - **Height:** `1920`
   - **Crop mode:** `limit` (maintains aspect ratio, limits size)
   - **Bitrate:** `1500000` (1.5 Mbps)

5. **Enable "Eager async":** Set to `true` (allows async processing)

6. **Click "Save"** at the top right

## Alternative: Use Transformation String

If the UI doesn't have all options, you can add a transformation string directly:

```
q_auto:low,f_mp4,vc_h264,ac_aac,w_1080,h_1920,c_limit,br_1500000
```

## Step 3: Test the Preset

After saving, test by uploading a video:

1. Go to **Media Library** in Cloudinary
2. Click **Upload**
3. Select a video file
4. Choose **Upload preset:** `troodie_videos`
5. Upload and verify the optimized version is created

## What This Does

The eager transformation will automatically:
- ✅ Compress videos to ~1.5 Mbps bitrate
- ✅ Limit resolution to 1080p max
- ✅ Convert to MP4 with H.264 codec
- ✅ Reduce file size by 70-85% for 5-minute videos
- ✅ Process asynchronously (doesn't block upload)

## Verification

After setup, when you upload videos through the app:
- Large videos (>20MB or >60s) will automatically use Cloudinary
- Optimized versions will be created automatically
- File sizes should be significantly reduced

## Troubleshooting

**If videos aren't optimizing:**
- Check eager transformations are saved in preset
- Verify `eager_async: true` is enabled
- Check transformation status in Media Library (may take a few seconds)

**If upload fails:**
- Verify preset name matches exactly: `troodie_videos`
- Check preset is set to "Unsigned"
- Ensure preset is enabled/active

