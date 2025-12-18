import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
};

interface RestaurantToProcess {
  restaurant_id: string;
  restaurant_name: string;
  google_place_id: string;
  status: string;
  cover_photo_url: string | null;
  photos_count: number;
}

interface BackfillResponse {
  success: boolean;
  processed: number;
  updated: number;
  failed: number;
  message: string;
  restaurants?: RestaurantToProcess[];
}

async function fetchGooglePlacePhotos(placeId: string, apiKey: string): Promise<{ coverPhoto: string | null; photos: string[] }> {
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.append('place_id', placeId);
    url.searchParams.append('fields', 'photos');
    url.searchParams.append('key', apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK' || !data.result?.photos || data.result.photos.length === 0) {
      return { coverPhoto: null, photos: [] };
    }

    const photos = data.result.photos.map((photo: any) => {
      return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${apiKey}`;
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY') || Deno.env.get('GOOGLE_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!googleApiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing GOOGLE_MAPS_API_KEY' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for parameters
    const body = req.method === 'POST' ? await req.json() : {};
    const batchSize = body.batch_size || 50;
    const maxRestaurants = body.max_restaurants || null;
    const offset = body.offset || 0;
    const dryRun = body.dry_run || false;

    console.log(`🚀 Starting restaurant image backfill`);
    console.log(`   Batch size: ${batchSize}`);
    console.log(`   Max restaurants: ${maxRestaurants || 'unlimited'}`);
    console.log(`   Offset: ${offset}`);
    console.log(`   Dry run: ${dryRun}`);

    // Get total count
    const { count } = await supabase
      .from('restaurants')
      .select('*', { count: 'exact', head: true })
      .not('google_place_id', 'is', null)
      .neq('google_place_id', '');

    console.log(`   Total restaurants with google_place_id: ${count || 0}`);

    // Get batch of restaurants
    const { data: restaurants, error: fetchError } = await supabase.rpc('backfill_restaurant_images', {
      p_batch_size: batchSize,
      p_max_restaurants: maxRestaurants,
      p_offset: offset,
    });

    if (fetchError) {
      console.error('Error fetching restaurants:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch restaurants', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!restaurants || restaurants.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          updated: 0,
          failed: 0,
          message: 'No restaurants found to process',
        } as BackfillResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📦 Processing batch of ${restaurants.length} restaurants...`);

    let processed = 0;
    let updated = 0;
    let failed = 0;
    const results: RestaurantToProcess[] = [];

    for (const restaurant of restaurants as RestaurantToProcess[]) {
      processed++;
      
      console.log(`\n[${processed}] Processing: ${restaurant.restaurant_name}`);
      console.log(`   Place ID: ${restaurant.google_place_id}`);

      if (dryRun) {
        console.log(`   [DRY RUN] Would fetch and update photos`);
        results.push({
          ...restaurant,
          status: 'dry_run',
        });
        continue;
      }

      // Fetch photos from Google Places API
      const { coverPhoto, photos } = await fetchGooglePlacePhotos(restaurant.google_place_id, googleApiKey);

      if (!coverPhoto || photos.length === 0) {
        console.log(`   ⚠️ No photos found`);
        failed++;
        results.push({
          ...restaurant,
          status: 'no_photos',
        });
        continue;
      }

      // Update restaurant with photos
      const { error: updateError } = await supabase.rpc('update_restaurant_images', {
        p_restaurant_id: restaurant.restaurant_id,
        p_cover_photo_url: coverPhoto,
        p_photos: photos,
      });

      if (updateError) {
        console.error(`   ❌ Failed to update:`, updateError);
        failed++;
        results.push({
          ...restaurant,
          status: 'update_failed',
        });
      } else {
        console.log(`   ✅ Updated with ${photos.length} photos`);
        updated++;
        results.push({
          ...restaurant,
          status: 'updated',
          cover_photo_url: coverPhoto,
          photos_count: photos.length,
        });
      }

      // Rate limiting: wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const response: BackfillResponse = {
      success: true,
      processed,
      updated,
      failed,
      message: `Processed ${processed} restaurants: ${updated} updated, ${failed} failed`,
      restaurants: results,
    };

    console.log(`\n📊 Summary:`);
    console.log(`   Total processed: ${processed}`);
    console.log(`   Successfully updated: ${updated}`);
    console.log(`   Failed/no photos: ${failed}`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
