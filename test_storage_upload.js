// Test script to debug storage upload issues
// Run this in your browser console or as a separate test

const testStorageUpload = async () => {
  try {
    console.log('Testing storage upload...');
    
    // Test 1: Check if storage is accessible
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    console.log('Available buckets:', buckets);
    
    if (bucketError) {
      console.error('Bucket access error:', bucketError);
      return;
    }
    
    // Test 2: Check avatars bucket specifically
    const { data: avatarsList, error: avatarsError } = await supabase.storage
      .from('avatars')
      .list('', { limit: 5 });
    
    console.log('Avatars bucket contents:', avatarsList);
    
    if (avatarsError) {
      console.error('Avatars bucket error:', avatarsError);
      return;
    }
    
    // Test 3: Try to upload a simple test file
    const testBlob = new Blob(['test content'], { type: 'text/plain' });
    const testFileName = `test-${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(testFileName, testBlob, {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (uploadError) {
      console.error('Upload test failed:', uploadError);
    } else {
      console.log('Upload test successful:', uploadData);
      
      // Test 4: Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(testFileName);
      
      console.log('Test file public URL:', publicUrl);
      
      // Test 5: Try to fetch the URL
      try {
        const response = await fetch(publicUrl);
        console.log('URL accessibility test:', response.status, response.ok);
      } catch (urlError) {
        console.warn('URL accessibility test failed:', urlError);
      }
    }
    
  } catch (error) {
    console.error('Storage test failed:', error);
  }
};

// Run the test
testStorageUpload(); 