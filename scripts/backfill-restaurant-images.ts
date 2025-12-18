/**
 * Script to backfill restaurant images from Google Places API
 * 
 * This script:
 * 1. Finds restaurants with google_place_id but missing cover_photo_url
 * 2. Fetches photos from Google Places API
 * 3. Updates the restaurant records with the photos
 * 
 * Usage:
 *   npx tsx scripts/backfill-restaurant-images.ts
 *   npx tsx scripts/backfill-restaurant-images.ts --batch-size=100 --max=500
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

if (!GOOGLE_MAPS_API_KEY) {
  console.error('❌ Missing GOOGLE_MAPS_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface RestaurantToProcess {
  restaurant_id: string;
  restaurant_name: string;
  google_place_id: string;
  status: string;
  cover_photo_url: string | null;
  photos_count: number;
}

async function fetchGooglePlacePhotos(placeId: string): Promise<{ coverPhoto: string | null; photos: string[] }> {
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.append('place_id', placeId);
    url.searchParams.append('fields', 'photos');
    url.searchParams.append('key', GOOGLE_MAPS_API_KEY!);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK' || !data.result?.photos || data.result.photos.length === 0) {
      return { coverPhoto: null, photos: [] };
    }

    const photos = data.result.photos.map((photo: any) => {
      return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`;
    });

    return {
      coverPhoto: photos[0] || null,
      photos: photos.slice(0, 10), // Limit to 10 photos
    };
  } catch (error) {
    console.error(`Error fetching photos for place ${placeId}:`, error);
    return { coverPhoto: null, photos: [] };
  }
}

async function updateRestaurantImages(restaurantId: string, coverPhoto: string | null, photos: string[]): Promise<boolean> {
  const { error } = await supabase.rpc('update_restaurant_images', {
    p_restaurant_id: restaurantId,
    p_cover_photo_url: coverPhoto,
    p_photos: photos,
  });

  if (error) {
    console.error(`Error updating restaurant ${restaurantId}:`, error);
    return false;
  }

  return true;
}

async function backfillRestaurantImages(batchSize: number = 50, maxRestaurants: number | null = null) {
  console.log(`🚀 Starting restaurant image backfill...`);
  console.log(`   Batch size: ${batchSize}`);
  console.log(`   Max restaurants: ${maxRestaurants || 'unlimited'}`);

  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalFailed = 0;
  let offset = 0;

  while (true) {
    // Get batch of restaurants needing backfill
    const { data: restaurants, error } = await supabase.rpc('backfill_restaurant_images', {
      p_batch_size: batchSize,
      p_max_restaurants: maxRestaurants,
    });

    if (error) {
      console.error('❌ Error fetching restaurants:', error);
      break;
    }

    if (!restaurants || restaurants.length === 0) {
      console.log('✅ No more restaurants to process');
      break;
    }

    console.log(`\n📦 Processing batch of ${restaurants.length} restaurants...`);

    for (const restaurant of restaurants as RestaurantToProcess[]) {
      totalProcessed++;
      
      console.log(`\n[${totalProcessed}] Processing: ${restaurant.restaurant_name}`);
      console.log(`   Place ID: ${restaurant.google_place_id}`);

      // Fetch photos from Google Places API
      const { coverPhoto, photos } = await fetchGooglePlacePhotos(restaurant.google_place_id);

      if (!coverPhoto || photos.length === 0) {
        console.log(`   ⚠️ No photos found`);
        totalFailed++;
        continue;
      }

      // Update restaurant with photos
      const success = await updateRestaurantImages(restaurant.restaurant_id, coverPhoto, photos);

      if (success) {
        console.log(`   ✅ Updated with ${photos.length} photos`);
        console.log(`   Cover photo: ${coverPhoto.substring(0, 80)}...`);
        totalUpdated++;
      } else {
        console.log(`   ❌ Failed to update`);
        totalFailed++;
      }

      // Rate limiting: wait 100ms between requests to avoid hitting API limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // If we got fewer restaurants than batch size, we're done
    if (restaurants.length < batchSize) {
      break;
    }

    // Check if we've hit the max
    if (maxRestaurants && totalProcessed >= maxRestaurants) {
      break;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total processed: ${totalProcessed}`);
  console.log(`   Successfully updated: ${totalUpdated}`);
  console.log(`   Failed/no photos: ${totalFailed}`);
}

// Parse command line arguments
const args = process.argv.slice(2);
let batchSize = 50;
let maxRestaurants: number | null = null;

for (const arg of args) {
  if (arg.startsWith('--batch-size=')) {
    batchSize = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--max=')) {
    maxRestaurants = parseInt(arg.split('=')[1], 10);
  }
}

// Run the backfill
backfillRestaurantImages(batchSize, maxRestaurants)
  .then(() => {
    console.log('\n✅ Backfill complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  });
