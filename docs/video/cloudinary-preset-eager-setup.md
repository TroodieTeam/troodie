# Add Eager Transformations to Cloudinary Preset

## Issue

Unsigned uploads don't allow `eager` or `eager_async` parameters in the upload request. These must be configured in the upload preset itself.

## Solution: Configure Eager Transformations in Preset

### Step 1: Edit Your Preset

1. Go to Cloudinary Dashboard → **Settings** → **Upload** → **Upload presets**
2. Click on **`troodie_videos`** preset (or click the `...` menu → Edit)

### Step 2: Navigate to Transform Tab

1. Click **"Transform"** tab in the left sidebar
2. Scroll down to find **"Eager transformations"** section

### Step 3: Add Eager Transformation

1. Click **"Add transformation"** or **"Add eager transformation"**
2. Configure the transformation:

   **Option A: Using UI (if available)**
   - Quality: `auto:low`
   - Format: `mp4`
   - Video codec: `h264`
   - Audio codec: `aac`
   - Width: `1080`
   - Height: `1920`
   - Crop: `limit`
   - Bitrate: `1500000`

   **Option B: Using Transformation String**
   - In the transformation field, enter:
     ```
     q_auto:low,f_mp4,vc_h264,ac_aac,w_1080,h_1920,c_limit,br_1500000
     ```

### Step 4: Enable Eager Async (Optional)

- If you want async processing (doesn't block upload):
  - Enable **"Eager async"** toggle
  - This allows upload to complete while transformation processes in background

### Step 5: Save

1. Click **"Save"** at the top right
2. Wait for confirmation

## What This Does

After configuring eager transformations in the preset:
- ✅ Videos will automatically be optimized during upload
- ✅ Optimized versions will be created automatically
- ✅ File sizes will be reduced by 70-85%
- ✅ No need to send eager parameters in upload request

## Testing

After saving the preset:

1. Upload a video through your app
2. Check Cloudinary Media Library
3. You should see:
   - Original video
   - Optimized version (if eager async is enabled, may take a few seconds)

## Transformation String Breakdown

```
q_auto:low      → Quality: auto with low setting
f_mp4           → Format: MP4
vc_h264         → Video codec: H.264
ac_aac          → Audio codec: AAC
w_1080          → Width: 1080px
h_1920          → Height: 1920px
c_limit         → Crop: limit (maintains aspect ratio)
br_1500000      → Bitrate: 1.5 Mbps
```

## Alternative: Use Signed Uploads

If you need more control, you can switch to signed uploads:
- Requires API secret (more secure)
- Allows eager parameters in request
- More complex setup

For now, unsigned uploads with preset eager transformations are the simplest approach.

