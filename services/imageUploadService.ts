import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { uploadImageBase64 } from '@/utils/imageUploadHelper';

interface UploadResult {
  publicUrl: string;
  fileName: string;
}

export class ImageUploadService {
  /**
   * Main upload method using base64 encoding (most reliable for React Native)
   */
  static async uploadImageSimple(
    imageUri: string,
    bucket: string,
    path: string
  ): Promise<UploadResult> {
    try {
      console.log('Starting base64 image upload:', { imageUri, bucket, path });

      // Process image first to ensure proper format and size
      const processedImage = await manipulateAsync(
        imageUri,
        [{ resize: { width: 1000 } }], // Resize to max 1000px width
        { compress: 0.8, format: SaveFormat.JPEG }
      );

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 9);
      const fileName = `${path}/${timestamp}-${randomId}.jpg`;

      // Use base64 upload method
      const publicUrl = await uploadImageBase64(
        processedImage.uri,
        bucket,
        fileName
      );

      console.log('Base64 upload successful, URL:', publicUrl);

      return {
        publicUrl,
        fileName
      };
    } catch (error) {
      console.error('Base64 upload failed, trying fallback method:', error);
      // Fall back to the alternative method
      return this.uploadImage(imageUri, bucket, path);
    }
  }

  /**
   * Uploads an image to Supabase storage with proper handling
   * @param imageUri The local URI of the image to upload
   * @param bucket The storage bucket name
   * @param path The path within the bucket (e.g., 'userId/profile')
   * @returns The public URL of the uploaded image
   */
  static async uploadImage(
    imageUri: string,
    bucket: string,
    path: string
  ): Promise<UploadResult> {
    try {
      console.log('Starting image upload:', { imageUri, bucket, path });

      // Validate inputs
      if (!imageUri || !bucket || !path) {
        throw new Error('Missing required parameters for image upload');
      }

      // Process the image (resize if needed, ensure it's in a compatible format)
      const processedImage = await manipulateAsync(
        imageUri,
        [{ resize: { width: 1000 } }], // Resize to max 1000px width while maintaining aspect ratio
        { compress: 0.8, format: SaveFormat.JPEG }
      );

      console.log('Image processed:', processedImage.uri);

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 9);
      const fileName = `${path}/${timestamp}-${randomId}.jpg`;

      // Create form data for fallback method
      const response = await fetch(processedImage.uri);
      const blob = await response.blob();
      
      console.log('Blob created, size:', blob.size, 'type:', blob.type);

      // Create proper FormData
      const formData = new FormData();
      const file = {
        uri: processedImage.uri,
        type: 'image/jpeg',
        name: fileName.split('/').pop() || 'image.jpg',
      } as any;
      
      formData.append('file', file);

      // Get Supabase configuration
      const supabaseUrl = (supabase as any).supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = (supabase as any).supabaseKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing');
      }

      // Direct upload using fetch
      const uploadResponse = await fetch(
        `${supabaseUrl}/storage/v1/object/${bucket}/${fileName}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload response error:', errorText);
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }

      console.log('FormData upload successful');

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      console.log('Public URL generated:', publicUrl);

      // Verify the upload by checking if the file exists
      const { data: fileList, error: listError } = await supabase.storage
        .from(bucket)
        .list(path.split('/')[0], {
          limit: 100,
          offset: 0,
          search: fileName.split('/').pop()
        });

      if (listError) {
        console.warn('Could not verify upload:', listError);
      } else {
        const uploadedFile = fileList?.find(f => f.name === fileName.split('/').pop());
        if (uploadedFile) {
          console.log('Upload verified, file details:', uploadedFile);
        } else {
          console.warn('Upload completed but file not found in listing');
        }
      }

      return {
        publicUrl,
        fileName
      };
    } catch (error) {
      console.error('Image upload service error:', error);
      throw error;
    }
  }

  /**
   * Uploads a profile image for a user
   * @param userId The user's ID
   * @param imageUri The local URI of the image
   * @returns The public URL of the uploaded avatar
   */
  static async uploadProfileImage(userId: string, imageUri: string): Promise<string> {
    try {
      console.log('Uploading profile image for user:', userId);
      
      // Validate inputs
      if (!imageUri) {
        throw new Error('No image URI provided');
      }
      
      // Use the user ID as the path prefix
      const { publicUrl } = await this.uploadImageSimple(
        imageUri,
        'avatars',
        userId
      );

      // Verify the upload by trying to access the URL
      try {
        const verifyResponse = await fetch(publicUrl, { method: 'HEAD' });
        if (!verifyResponse.ok) {
          console.warn('Upload verification failed, but continuing:', verifyResponse.status);
        } else {
          console.log('Upload verified successfully');
        }
      } catch (verifyError) {
        console.warn('Could not verify upload:', verifyError);
      }

      return publicUrl;
    } catch (error) {
      console.error('Profile image upload error:', error);
      throw error;
    }
  }

  /**
   * Deletes an image from storage
   * @param bucket The storage bucket name
   * @param fileName The file name to delete
   */
  static async deleteImage(bucket: string, fileName: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([fileName]);

      if (error) {
        console.error('Delete image error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Image deletion error:', error);
      throw error;
    }
  }
}