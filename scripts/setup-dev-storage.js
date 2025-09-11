#!/usr/bin/env node

/**
 * Setup Development Storage Buckets
 * 
 * This script creates the necessary storage buckets in your development Supabase project.
 * Run this after setting up your .env.development file.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.development' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env.development');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const buckets = [
  {
    id: 'avatars',
    name: 'avatars',
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  },
  {
    id: 'post-photos',
    name: 'post-photos',
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  },
  {
    id: 'board-covers',
    name: 'board-covers',
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  },
  {
    id: 'restaurant-photos',
    name: 'restaurant-photos',
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  },
  {
    id: 'community-images',
    name: 'community-images',
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  }
];

async function createBuckets() {
  console.log('🚀 Setting up storage buckets...');
  
  // First, list existing buckets
  const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('❌ Failed to list existing buckets:', listError.message);
    return;
  }
  
  const existingBucketIds = existingBuckets.map(bucket => bucket.id);
  console.log('📦 Existing buckets:', existingBucketIds);
  
  for (const bucket of buckets) {
    if (existingBucketIds.includes(bucket.id)) {
      console.log(`✅ Bucket '${bucket.id}' already exists`);
      continue;
    }
    
    console.log(`📂 Creating bucket '${bucket.id}'...`);
    
    const { data, error } = await supabase.storage.createBucket(bucket.id, {
      public: bucket.public,
      fileSizeLimit: bucket.fileSizeLimit,
      allowedMimeTypes: bucket.allowedMimeTypes
    });
    
    if (error) {
      console.error(`❌ Failed to create bucket '${bucket.id}':`, error.message);
    } else {
      console.log(`✅ Created bucket '${bucket.id}' successfully`);
    }
  }
  
  console.log('🎉 Storage setup complete!');
}

async function verifySetup() {
  console.log('🔍 Verifying storage setup...');
  
  // Test uploading a small image to avatars bucket
  const testFile = Buffer.from('test-image-data');
  const testFileName = `test-${Date.now()}.txt`;
  
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(testFileName, testFile, {
      contentType: 'text/plain'
    });
  
  if (error) {
    console.error('❌ Storage verification failed:', error.message);
    return false;
  }
  
  // Clean up test file
  await supabase.storage.from('avatars').remove([testFileName]);
  
  console.log('✅ Storage verification successful!');
  return true;
}

async function main() {
  try {
    await createBuckets();
    await verifySetup();
    
    console.log('\n🎯 Next steps:');
    console.log('1. Make sure your .env.development file has the correct Supabase credentials');
    console.log('2. Try uploading an image in your app again');
    console.log('3. If using local Supabase, make sure it\'s running: npx supabase start');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();
