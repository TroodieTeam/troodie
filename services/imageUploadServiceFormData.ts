import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';

interface UploadResult {
  publicUrl: string;
  fileName: string;
}

export class ImageUploadServiceFormData {
  /**
   * Uploads an image using FormData approach (alternative method)
   * This method may work better with certain React Native configurations
   */
  static async uploadImage(
    imageUri: string,
    bucket: string,
    path: string
  ): Promise<UploadResult> {
    try {
      console.log('Starting FormData image upload:', { imageUri, bucket, path });

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 9);
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${path}-${timestamp}-${randomId}.${fileExt}`;

      // Create FormData
      const formData = new FormData();
      
      // For React Native, we need to format the file object properly
      const file = {
        uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
        type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        name: fileName.split('/').pop() || 'image.jpg',
      } as any;

      formData.append('file', file);

      // Get the Supabase URL and anon key
      const supabaseUrl = (supabase as any).supabaseUrl;
      const supabaseAnonKey = (supabase as any).supabaseKey;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration not found');
      }

      // Upload using fetch with FormData
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${fileName}`;
      
      console.log('Uploading to:', uploadUrl);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload response error:', errorText);
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Upload response:', result);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      console.log('Public URL generated:', publicUrl);

      return {
        publicUrl,
        fileName
      };
    } catch (error) {
      console.error('FormData image upload error:', error);
      throw error;
    }
  }

  /**
   * Direct blob upload method (another alternative)
   */
  static async uploadImageDirect(
    imageUri: string,
    bucket: string,
    path: string
  ): Promise<UploadResult> {
    try {
      console.log('Starting direct blob upload:', { imageUri, bucket, path });

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 9);
      const fileName = `${path}-${timestamp}-${randomId}.jpg`;

      // Fetch the image as blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      console.log('Blob created, size:', blob.size, 'type:', blob.type);

      // Create a File from the blob
      const file = new File([blob], fileName.split('/').pop() || 'image.jpg', {
        type: blob.type || 'image/jpeg',
      });

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      console.log('Upload successful:', data);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      console.log('Public URL generated:', publicUrl);

      return {
        publicUrl,
        fileName
      };
    } catch (error) {
      console.error('Direct blob upload error:', error);
      throw error;
    }
  }
}