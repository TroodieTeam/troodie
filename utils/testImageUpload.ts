import { ImageUploadService } from '@/services/imageUploadService';
import { supabase } from '@/lib/supabase';

/**
 * Test function to verify image upload functionality
 */
export async function testImageUpload() {
  
  try {
    // 1. Check if we're authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return false;
    }
    
    // 2. Check if avatars bucket is accessible
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      console.error('Bucket listing error:', bucketError);
    } else {
      const avatarsBucket = buckets?.find(b => b.id === 'avatars');
      if (avatarsBucket) {
      } else {
        console.error('✗ Avatars bucket not found');
      }
    }
    
    // 3. List current files in user's avatars folder
    const { data: files, error: listError } = await supabase.storage
      .from('avatars')
      .list(user.id, {
        limit: 10,
        offset: 0
      });
      
    if (listError) {
      console.error('List error:', listError);
    } else {
    }
    
    // 4. Try to create a test file
    const testFileName = `${user.id}/test-${Date.now()}.txt`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(testFileName, 'Hello, this is a test file', {
        contentType: 'text/plain',
        upsert: true
      });
      
    if (uploadError) {
      console.error('✗ Test file upload error:', uploadError);
      return false;
    }
    
    
    // 5. Get public URL of test file
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(testFileName);
      
    
    // 6. Delete test file
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove([testFileName]);
      
    if (deleteError) {
      console.error('Delete error:', deleteError);
    } else {
    }
    
    return true;
    
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

/**
 * Debug function to check current user profile
 */
export async function debugUserProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user');
      return;
    }
    
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
      
    if (error) {
      console.error('Profile fetch error:', error);
    } else {
    }
  } catch (error) {
    console.error('Debug error:', error);
  }
}