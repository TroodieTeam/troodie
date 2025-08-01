import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

/**
 * Helper function to convert image URI to base64
 */
async function uriToBase64(uri: string): Promise<string> {
  try {
    // Try using FileSystem first (most reliable for React Native)
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (fsError) {
      console.log('FileSystem method failed, trying fetch:', fsError);
    }
    
    // Fallback to fetch method
    const response = await fetch(uri);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        // Remove the data:image/jpeg;base64, prefix
        const base64 = base64data.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting URI to base64:', error);
    throw error;
  }
}

/**
 * Upload image using base64 method (most reliable for React Native)
 */
export async function uploadImageBase64(
  imageUri: string,
  bucket: string,
  fileName: string
): Promise<string> {
  try {
    console.log('Converting image to base64...', { imageUri, bucket, fileName });
    const base64 = await uriToBase64(imageUri);
    
    console.log('Base64 conversion complete, length:', base64.length);
    
    // Decode base64 to ArrayBuffer
    const arrayBuffer = decode(base64);
    console.log('ArrayBuffer size:', arrayBuffer.byteLength);
    
    // Upload using base64-arraybuffer
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, arrayBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      throw error;
    }

    console.log('Upload successful:', data);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    console.log('Public URL:', publicUrl);

    return publicUrl;
  } catch (error) {
    console.error('Base64 upload error:', error);
    throw error;
  }
}

/**
 * Upload image using blob method
 */
export async function uploadImageBlob(
  imageUri: string,
  bucket: string,
  fileName: string
): Promise<string> {
  try {
    console.log('Fetching image as blob...');
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    console.log('Blob fetched, size:', blob.size, 'type:', blob.type);
    
    // Create a new blob with explicit type if needed
    const imageBlob = new Blob([blob], { type: 'image/jpeg' });
    
    console.log('Uploading blob to Supabase...');
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, imageBlob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    console.log('Upload successful:', data);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Blob upload error:', error);
    throw error;
  }
}