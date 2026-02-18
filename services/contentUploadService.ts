/**
 * Content Upload Service
 *
 * Handles Stage 1 of the content submission workflow:
 * Creator uploads video/photo content for restaurant review.
 *
 * The uploaded content goes to Supabase Storage (campaign-content bucket)
 * and the deliverable record is created/updated with the content URL.
 */

import { supabase } from '@/lib/supabase';
import type { DeliverablePlatform, DeliverableSubmission, WorkflowStage } from '@/types/deliverableRequirements';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

// ============================================================================
// TYPES
// ============================================================================

export interface UploadContentParams {
  campaign_application_id: string;
  campaign_id: string;
  creator_id: string;
  file_uri: string;       // Local file URI from ImagePicker
  file_type: 'video' | 'photo';
  platform?: DeliverablePlatform;
  caption?: string;
  notes_to_restaurant?: string;
}

export interface UploadContentResult {
  data: DeliverableSubmission | null;
  error: Error | null;
}

// Allowed MIME types per the spec (Q2: Option A)
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mov', 'video/quicktime'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;  // 10MB

// ============================================================================
// HELPERS
// ============================================================================

function getMimeType(uri: string, fileType: 'video' | 'photo'): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (fileType === 'video') {
    switch (ext) {
      case 'mp4': return 'video/mp4';
      case 'mov': return 'video/quicktime';
      default: return 'video/mp4';
    }
  }
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg':
    default: return 'image/jpeg';
  }
}

function getFileExtension(mimeType: string): string {
  switch (mimeType) {
    case 'video/mp4': return 'mp4';
    case 'video/mov':
    case 'video/quicktime': return 'mov';
    case 'image/png': return 'png';
    case 'image/jpeg':
    default: return 'jpg';
  }
}

// ============================================================================
// UPLOAD METHODS
// ============================================================================

/**
 * Upload content (video/photo) for restaurant review.
 * This is Stage 1 of the submission workflow.
 *
 * 1. Validates file type and size
 * 2. Uploads to Supabase Storage (campaign-content bucket)
 * 3. Creates deliverable record with status 'pending_review' and workflow_stage 'review'
 */
export async function uploadContentForReview(
  params: UploadContentParams
): Promise<UploadContentResult> {
  try {
    const mimeType = getMimeType(params.file_uri, params.file_type);

    // Validate MIME type
    const allowedTypes = params.file_type === 'video' ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
    if (!allowedTypes.includes(mimeType)) {
      return {
        data: null,
        error: new Error(
          params.file_type === 'video'
            ? 'Please upload MP4 or MOV video files.'
            : 'Please upload JPEG or PNG image files.'
        ),
      };
    }

    // Check file size
    const fileInfo = await FileSystem.getInfoAsync(params.file_uri);
    if (!fileInfo.exists) {
      return { data: null, error: new Error('File not found') };
    }
    const fileSize = (fileInfo as { size?: number }).size || 0;
    const maxSize = params.file_type === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

    if (fileSize > maxSize) {
      const maxMB = maxSize / (1024 * 1024);
      return {
        data: null,
        error: new Error(`File exceeds ${maxMB}MB limit. Please compress your ${params.file_type}.`),
      };
    }

    // Generate storage path
    const ext = getFileExtension(mimeType);
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    const storagePath = `${params.campaign_id}/${params.campaign_application_id}/${timestamp}-${randomSuffix}.${ext}`;

    // Read file as base64 and upload to Supabase Storage
    const base64 = await FileSystem.readAsStringAsync(params.file_uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const arrayBuffer = decode(base64);

    const { error: uploadError } = await supabase.storage
      .from('campaign-content')
      .upload(storagePath, arrayBuffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[ContentUpload] Storage upload failed:', uploadError);
      return { data: null, error: uploadError };
    }

    // Get the URL for the uploaded content (signed URL since bucket is private)
    const { data: urlData } = await supabase.storage
      .from('campaign-content')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7-day signed URL

    const contentFileUrl = urlData?.signedUrl || storagePath;

    // Get restaurant_id from campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('restaurant_id')
      .eq('id', params.campaign_id)
      .single();

    // Create deliverable record
    const contentType = params.file_type === 'video' ? 'video' : 'photo';
    const insertData: Record<string, unknown> = {
      campaign_application_id: params.campaign_application_id,
      campaign_id: params.campaign_id,
      creator_id: params.creator_id,
      restaurant_id: campaign?.restaurant_id || null,
      content_type: contentType,
      content_url: storagePath, // Store the storage path (not the signed URL)
      content_file_url: contentFileUrl,
      content_file_type: mimeType,
      social_platform: params.platform || 'other',
      platform_post_url: '', // Empty - will be filled in Stage 2 (proof links)
      caption: params.caption || null,
      review_notes: params.notes_to_restaurant || null,
      status: 'pending_review',
      workflow_stage: 'review' as WorkflowStage,
      submitted_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('campaign_deliverables')
      .insert(insertData)
      .select('*')
      .single();

    if (error) {
      console.error('[ContentUpload] Insert deliverable failed:', error);
      // Clean up uploaded file on failure
      await supabase.storage.from('campaign-content').remove([storagePath]);
      return { data: null, error };
    }

    // Set the 72-hour review deadline on the application
    await supabase
      .from('campaign_applications')
      .update({
        restaurant_review_deadline: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', params.campaign_application_id);

    return { data: data as DeliverableSubmission, error: null };
  } catch (error) {
    console.error('[ContentUpload] Error in uploadContentForReview:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get the signed URL for uploaded content.
 * Used by the review screen to display content.
 */
export async function getUploadedContentUrl(
  storagePath: string
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from('campaign-content')
      .createSignedUrl(storagePath, 60 * 60); // 1-hour signed URL

    if (error) {
      return { url: null, error };
    }

    return { url: data.signedUrl, error: null };
  } catch (error) {
    return { url: null, error: error as Error };
  }
}

/**
 * Delete uploaded content (for re-upload before review).
 * Only allowed when deliverable is in 'pending_review' status.
 */
export async function deleteUploadedContent(
  deliverableId: string
): Promise<{ error: Error | null }> {
  try {
    // Get the deliverable to find the storage path
    const { data: deliverable, error: fetchError } = await supabase
      .from('campaign_deliverables')
      .select('content_url, status')
      .eq('id', deliverableId)
      .single();

    if (fetchError || !deliverable) {
      return { error: fetchError || new Error('Deliverable not found') };
    }

    if (deliverable.status !== 'pending_review' && deliverable.status !== 'draft') {
      return { error: new Error('Cannot delete content that has already been reviewed') };
    }

    // Delete from storage
    if (deliverable.content_url) {
      await supabase.storage.from('campaign-content').remove([deliverable.content_url]);
    }

    // Delete the deliverable record
    const { error: deleteError } = await supabase
      .from('campaign_deliverables')
      .delete()
      .eq('id', deliverableId);

    return { error: deleteError || null };
  } catch (error) {
    return { error: error as Error };
  }
}
