# Fix Portfolio Image Upload to Cloud Storage

- Epic: CM (Creator Marketplace)
- Priority: Critical
- Estimate: 2 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -
- Reference: CREATOR_MARKETPLACE_REVIEW.md Section 3.3

## Overview

Portfolio images in creator onboarding are currently saved with local device URIs instead of being uploaded to Supabase Storage. This means portfolio images only display on the device where they were selected and won't work on other devices or for other users viewing the creator's profile.

## Business Value

- **User Experience**: Creator portfolios must be visible to restaurants and other users
- **Cross-Device**: Users expect their portfolio to persist across devices
- **Marketplace Trust**: Restaurants need to see creator work samples before accepting applications

## Current Problem

```typescript
// Location: components/creator/CreatorOnboardingV1.tsx:189-198

// Current: Saves local URI (file:///var/mobile/...)
await supabase.from('creator_portfolio_items').insert({
  image_url: image.uri, // THIS IS A LOCAL URI, NOT A CLOUD URL
  caption: image.caption || '',
});
```

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Portfolio Image Upload
  As a creator completing onboarding
  I want my portfolio images uploaded to cloud storage
  So that restaurants and other users can view my work

  Scenario: Successful image upload
    Given I have selected 3 portfolio images
    When I complete creator onboarding
    Then all images are uploaded to Supabase Storage
    And portfolio_items records contain cloud URLs
    And images load on any device

  Scenario: Image upload with progress
    Given I am uploading portfolio images
    When upload is in progress
    Then I see upload progress for each image
    And I cannot submit until all uploads complete

  Scenario: Image upload failure
    Given I am uploading portfolio images
    When one image fails to upload
    Then I see an error for that specific image
    And I can retry the failed upload
    And successful uploads are preserved

  Scenario: Large image compression
    Given I select an image larger than 2MB
    When the image is processed
    Then it is compressed to under 1MB
    And quality remains acceptable
    And upload completes successfully
```

## Technical Implementation

### 1. Create Portfolio Storage Bucket

```sql
-- Ensure bucket exists (run in Supabase Dashboard or migration)
INSERT INTO storage.buckets (id, name, public)
VALUES ('creator-portfolios', 'creator-portfolios', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Creators can upload their own images
CREATE POLICY "Creators can upload portfolio images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'creator-portfolios'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Anyone can view portfolio images
CREATE POLICY "Portfolio images are public"
ON storage.objects FOR SELECT
USING (bucket_id = 'creator-portfolios');
```

### 2. Image Upload Service

```typescript
// services/portfolioImageService.ts

import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

interface UploadProgress {
  imageId: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

export async function uploadPortfolioImage(
  userId: string,
  imageUri: string,
  imageId: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    // Step 1: Compress image
    const manipulated = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 1200 } }], // Max width 1200px
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );

    onProgress?.(20);

    // Step 2: Convert to base64
    const response = await fetch(manipulated.uri);
    const blob = await response.blob();

    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
    reader.readAsDataURL(blob);

    const base64 = await base64Promise;
    onProgress?.(40);

    // Step 3: Generate unique filename
    const timestamp = Date.now();
    const filename = `${userId}/${timestamp}-${imageId}.jpg`;

    // Step 4: Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('creator-portfolios')
      .upload(filename, decode(base64), {
        contentType: 'image/jpeg',
        upsert: false,
      });

    onProgress?.(80);

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }

    // Step 5: Get public URL
    const { data: urlData } = supabase.storage
      .from('creator-portfolios')
      .getPublicUrl(data.path);

    onProgress?.(100);

    return { success: true, url: urlData.publicUrl };
  } catch (error: any) {
    console.error('Portfolio upload error:', error);
    return { success: false, error: error.message || 'Upload failed' };
  }
}

export async function uploadAllPortfolioImages(
  userId: string,
  images: Array<{ id: string; uri: string; caption: string }>,
  onProgressUpdate?: (progress: UploadProgress[]) => void
): Promise<Array<{ id: string; url: string; caption: string } | null>> {
  const results: Array<{ id: string; url: string; caption: string } | null> = [];
  const progressState: UploadProgress[] = images.map((img) => ({
    imageId: img.id,
    progress: 0,
    status: 'pending',
  }));

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    progressState[i].status = 'uploading';
    onProgressUpdate?.(progressState);

    const result = await uploadPortfolioImage(
      userId,
      image.uri,
      image.id,
      (progress) => {
        progressState[i].progress = progress;
        onProgressUpdate?.(progressState);
      }
    );

    if (result.success && result.url) {
      progressState[i].status = 'complete';
      progressState[i].progress = 100;
      results.push({ id: image.id, url: result.url, caption: image.caption });
    } else {
      progressState[i].status = 'error';
      progressState[i].error = result.error;
      results.push(null);
    }
    onProgressUpdate?.(progressState);
  }

  return results;
}
```

### 3. Update CreatorOnboardingV1

```typescript
// components/creator/CreatorOnboardingV1.tsx

import { uploadAllPortfolioImages, UploadProgress } from '@/services/portfolioImageService';

// Add state for upload progress
const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
const [isUploading, setIsUploading] = useState(false);

const completeOnboarding = async () => {
  // ... existing validation ...

  setIsUploading(true);

  try {
    // Upload images first
    const selectedImages = portfolioImages.filter(img => img.selected);
    const uploadedImages = await uploadAllPortfolioImages(
      user.id,
      selectedImages,
      setUploadProgress
    );

    // Check for failures
    const failedUploads = uploadedImages.filter(img => img === null);
    if (failedUploads.length > 0) {
      Alert.alert(
        'Upload Error',
        `${failedUploads.length} image(s) failed to upload. Please try again.`
      );
      setIsUploading(false);
      return;
    }

    // Continue with account upgrade using cloud URLs
    // ... rest of onboarding ...

    // Save portfolio items with cloud URLs
    for (let i = 0; i < uploadedImages.length; i++) {
      const image = uploadedImages[i];
      if (image) {
        await supabase.from('creator_portfolio_items').insert({
          creator_profile_id: creatorProfile.id,
          image_url: image.url, // NOW A CLOUD URL
          caption: image.caption,
          display_order: i,
          is_featured: i === 0,
        });
      }
    }

  } finally {
    setIsUploading(false);
  }
};
```

### 4. Upload Progress UI Component

```typescript
// components/creator/UploadProgressIndicator.tsx

interface Props {
  progress: UploadProgress[];
}

export function UploadProgressIndicator({ progress }: Props) {
  const totalProgress = progress.reduce((sum, p) => sum + p.progress, 0) / progress.length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Uploading Images...</Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${totalProgress}%` }]} />
      </View>
      <Text style={styles.progressText}>
        {Math.round(totalProgress)}% complete
      </Text>
      {progress.map((p, i) => (
        <View key={p.imageId} style={styles.imageRow}>
          <Text>Image {i + 1}: </Text>
          {p.status === 'complete' && <Check color="green" size={16} />}
          {p.status === 'error' && <X color="red" size={16} />}
          {p.status === 'uploading' && <ActivityIndicator size="small" />}
        </View>
      ))}
    </View>
  );
}
```

### Files to Create/Modify

1. **New Service**: `services/portfolioImageService.ts`
2. **New Component**: `components/creator/UploadProgressIndicator.tsx`
3. **Update**: `components/creator/CreatorOnboardingV1.tsx`
4. **Migration**: `supabase/migrations/YYYYMMDD_portfolio_storage_bucket.sql`

## Definition of Done

- [ ] Storage bucket created with correct RLS policies
- [ ] Images compressed before upload (max 1200px width, 80% quality)
- [ ] Upload progress shown to user
- [ ] Failed uploads show error with retry option
- [ ] Portfolio items saved with cloud URLs
- [ ] Images viewable from any device
- [ ] Unit tests for upload service
- [ ] Manual test: complete onboarding and verify images load on web

## Performance Considerations

- Compress images client-side before upload
- Upload images in parallel (Promise.all) for faster completion
- Show progress to maintain user engagement during upload
- Consider chunked upload for very large files

## Notes

- Reference: CREATOR_MARKETPLACE_REVIEW.md Section 3.3
- Storage bucket: `creator-portfolios`
- Max file size: 5MB (after compression)
- Supported formats: JPEG, PNG, WebP
- Consider implementing image cropping UI in future iteration
