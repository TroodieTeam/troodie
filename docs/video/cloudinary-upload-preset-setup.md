# Cloudinary Upload Preset Setup

## Issue

The Cloudinary integration uses **unsigned uploads** which require an **upload preset** to be configured in your Cloudinary dashboard. Without this preset, uploads will fail.

## Solution: Create Upload Preset

### Step 1: Login to Cloudinary Dashboard

1. Go to https://cloudinary.com/console
2. Login with your account credentials

### Step 2: Create Upload Preset

1. Navigate to **Settings** → **Upload** → **Upload presets**
2. Click **Add upload preset**
3. Configure the preset:
   - **Preset name:** `troodie_videos` (or update the code to match your preset name)
   - **Signing mode:** `Unsigned` (important!)
   - **Folder:** `troodie/videos` (optional, for organization)
   - **Resource type:** `Video`
   - **Eager transformations:** Add the following:
     ```json
     {
       "quality": "auto:low",
       "format": "mp4",
       "video_codec": "h264",
       "audio_codec": "aac",
       "width": 1080,
       "height": 1920,
       "crop": "limit",
       "bit_rate": 1500000
     }
     ```
   - **Eager async:** `true`
4. Click **Save**

### Step 3: Update Code (if using different preset name)

If you used a different preset name, update `services/cloudinaryVideoService.ts`:

```typescript
formData.append('upload_preset', 'your_preset_name');
```

## Alternative: Use Supabase Edge Function (More Secure)

Instead of unsigned uploads, you can use a Supabase Edge Function to handle Cloudinary uploads server-side. This is more secure as it keeps your API secret on the server.

### Benefits:
- ✅ API secret never exposed to client
- ✅ Can generate proper signatures
- ✅ More control over upload process

### Implementation:

Create `supabase/functions/upload-to-cloudinary/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { videoUrl, videoBase64 } = await req.json();
  
  // Upload to Cloudinary from Supabase Storage URL or base64
  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${Deno.env.get('CLOUDINARY_CLOUD_NAME')}/video/upload`;
  
  // ... upload logic ...
  
  return new Response(JSON.stringify({ url: optimizedUrl }));
});
```

Then update `cloudinaryVideoService.ts` to call this Edge Function instead of direct upload.

## Current Status

**⚠️ Action Required:** Create the upload preset in Cloudinary dashboard before testing video uploads.

**Preset Name:** `troodie_videos` (or update code to match your preset)

## Testing

After creating the preset:

1. Try uploading a video > 20MB or > 60 seconds
2. Check Cloudinary dashboard → Media Library for uploaded videos
3. Verify optimized URLs are returned

## Troubleshooting

### Error: "Upload preset not found"
- Make sure preset name matches exactly (case-sensitive)
- Verify preset is set to "Unsigned"
- Check preset is enabled

### Error: "Invalid signature"
- If using signed uploads, verify API secret is correct
- Consider switching to unsigned uploads with preset

### Videos not optimizing
- Check eager transformations are configured in preset
- Verify `eager_async: true` is set
- Check transformation status in Cloudinary dashboard

