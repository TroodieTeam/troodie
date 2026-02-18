/**
 * Content Upload Service
 *
 * Handles Stage 1 of the content submission flow:
 * Creator uploads raw video/photo content for restaurant review
 * BEFORE posting to social platforms.
 */

import { supabase } from '@/lib/supabase';
import type { DeliverableSubmission, WorkflowStage } from '@/types/deliverableRequirements';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

const BUCKET_NAME = 'campaign-content';
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/mov'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
const ALLOWED_TYPES = [...ALLOWED_VIDEO_TYPES, ...ALLOWED_IMAGE_TYPES];

const EXTENSION_TO_MIME: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

export interface UploadContentParams {
  campaign_application_id: string;
  campaign_id: string;
  creator_id: string;
  file_uri: string;
  file_type: 'video' | 'photo';
  caption?: string;
  notes_to_restaurant?: string;
}

function getMimeTypeFromUri(uri: string): string | null {
  const extension = uri.split('.').pop()?.toLowerCase();
  if (!extension) return null;
  return EXTENSION_TO_MIME[extension] || null;
}

function isVideo(mimeType: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(mimeType);
}

export async function uploadContentForReview(
  params: UploadContentParams
): Promise<{ data: DeliverableSubmission | null; error: Error | null }> {
  try {
    const mimeType = getMimeTypeFromUri(params.file_uri);
    if (!mimeType || !ALLOWED_TYPES.includes(mimeType)) {
      return {
        data: null,
        error: new Error('Unsupported file type. Please upload MP4, MOV, JPEG, or PNG files.'),
      };
    }

    const fileInfo = await FileSystem.getInfoAsync(params.file_uri);
    if (!fileInfo.exists) {
      return { data: null, error: new Error('File not found') };
    }

    const maxSize = isVideo(mimeType) ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    const fileSize = (fileInfo as any).size || 0;
    if (fileSize > maxSize) {
      const limitMB = Math.round(maxSize / (1024 * 1024));
      return {
        data: null,
        error: new Error(`File exceeds ${limitMB}MB limit. Please compress your ${isVideo(mimeType) ? 'video' : 'image'}.`),
      };
    }

    const base64 = await FileSystem.readAsStringAsync(params.file_uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const arrayBuffer = decode(base64);

    const extension = params.file_uri.split('.').pop()?.toLowerCase() || 'mp4';
    const storagePath = `${params.campaign_id}/${params.campaign_application_id}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, arrayBuffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[ContentUpload] Storage upload failed:', uploadError);
      return { data: null, error: uploadError as Error };
    }

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('restaurant_id')
      .eq('id', params.campaign_id)
      .single();

    const { data: existing } = await supabase
      .from('campaign_deliverables')
      .select('id, deliverable_index')
      .eq('campaign_application_id', params.campaign_application_id);

    let deliverableIndex = 1;
    if (existing && existing.length > 0) {
      const indices = existing
        .map((e: any) => e.deliverable_index)
        .filter((idx: any) => idx !== null && idx !== undefined);
      if (indices.length > 0) {
        deliverableIndex = Math.max(...indices) + 1;
      }
    }

    const insertData: any = {
      campaign_application_id: params.campaign_application_id,
      campaign_id: params.campaign_id,
      creator_id: params.creator_id,
      restaurant_id: campaign?.restaurant_id || null,
      deliverable_index: deliverableIndex,
      content_file_url: storagePath,
      content_file_type: mimeType,
      content_type: isVideo(mimeType) ? 'video' : 'image',
      status: 'pending_review',
      workflow_stage: 'review' as WorkflowStage,
      submitted_at: new Date().toISOString(),
    };

    if (params.caption) insertData.caption = params.caption;
    if (params.notes_to_restaurant) insertData.review_notes = params.notes_to_restaurant;

    const { data, error } = await supabase
      .from('campaign_deliverables')
      .insert(insertData)
      .select('*')
      .single();

    if (error) {
      console.error('[ContentUpload] Error creating deliverable:', error);
      await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
      return { data: null, error };
    }

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

export async function getUploadedContentUrl(
  storagePath: string
): Promise<{ data: string | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, 3600);

    if (error) {
      return { data: null, error };
    }

    return { data: data.signedUrl, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function deleteUploadedContent(
  deliverableId: string
): Promise<{ error: Error | null }> {
  try {
    const { data: deliverable, error: fetchError } = await supabase
      .from('campaign_deliverables')
      .select('status, content_file_url')
      .eq('id', deliverableId)
      .single();

    if (fetchError || !deliverable) {
      return { error: fetchError || new Error('Deliverable not found') };
    }

    if (deliverable.status !== 'pending_review') {
      return { error: new Error('Cannot delete content that is already being reviewed or approved') };
    }

    if (deliverable.content_file_url) {
      await supabase.storage.from(BUCKET_NAME).remove([deliverable.content_file_url]);
    }

    const { error: deleteError } = await supabase
      .from('campaign_deliverables')
      .delete()
      .eq('id', deliverableId);

    if (deleteError) return { error: deleteError };
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}
