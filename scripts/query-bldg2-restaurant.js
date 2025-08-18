// Script to query the restaurant with city = 'Bldg 2'
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryBldg2Restaurant() {
  console.log('🔍 Querying restaurant with city = "Bldg 2"...\n');

  try {
    // Query for restaurant(s) with city = 'Bldg 2'
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('city', 'Bldg 2');

    if (error) {
      console.error('❌ Error querying restaurant:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('❌ No restaurants found with city = "Bldg 2"');
      return;
    }

    console.log(`✅ Found ${data.length} restaurant(s) with city = "Bldg 2":\n`);

    data.forEach((restaurant, index) => {
      console.log(`Restaurant ${index + 1}:`);
      console.log('='.repeat(50));
      console.log(`ID: ${restaurant.id}`);
      console.log(`Name: ${restaurant.name}`);
      console.log(`Address: ${restaurant.address || 'N/A'}`);
      console.log(`City: ${restaurant.city}`);
      console.log(`State: ${restaurant.state || 'N/A'}`);
      console.log(`ZIP Code: ${restaurant.zip_code || 'N/A'}`);
      console.log(`Phone: ${restaurant.phone || 'N/A'}`);
      console.log(`Website: ${restaurant.website || 'N/A'}`);
      console.log(`Cuisine Types: ${restaurant.cuisine_types ? JSON.stringify(restaurant.cuisine_types) : 'N/A'}`);
      console.log(`Price Range: ${restaurant.price_range || 'N/A'}`);
      console.log(`Google Place ID: ${restaurant.google_place_id || 'N/A'}`);
      console.log(`Google Rating: ${restaurant.google_rating || 'N/A'}`);
      console.log(`Google Reviews Count: ${restaurant.google_reviews_count || 'N/A'}`);
      console.log(`Troodie Rating: ${restaurant.troodie_rating || 'N/A'}`);
      console.log(`Troodie Reviews Count: ${restaurant.troodie_reviews_count || 0}`);
      console.log(`Features: ${restaurant.features ? JSON.stringify(restaurant.features) : 'N/A'}`);
      console.log(`Dietary Options: ${restaurant.dietary_options ? JSON.stringify(restaurant.dietary_options) : 'N/A'}`);
      console.log(`Is Verified: ${restaurant.is_verified}`);
      console.log(`Is Claimed: ${restaurant.is_claimed}`);
      console.log(`Is Approved: ${restaurant.is_approved}`);
      console.log(`Data Source: ${restaurant.data_source || 'N/A'}`);
      console.log(`Submitted By: ${restaurant.submitted_by || 'N/A'}`);
      console.log(`Owner ID: ${restaurant.owner_id || 'N/A'}`);
      console.log(`Photos: ${restaurant.photos ? JSON.stringify(restaurant.photos) : 'N/A'}`);
      console.log(`Cover Photo URL: ${restaurant.cover_photo_url || 'N/A'}`);
      console.log(`Hours: ${restaurant.hours ? JSON.stringify(restaurant.hours) : 'N/A'}`);
      console.log(`Location (PostGIS): ${restaurant.location ? 'Present' : 'N/A'}`);
      console.log(`Created At: ${restaurant.created_at}`);
      console.log(`Updated At: ${restaurant.updated_at}`);
      console.log(`Last Google Sync: ${restaurant.last_google_sync || 'N/A'}`);
      console.log(`Approved At: ${restaurant.approved_at || 'N/A'}`);
      console.log(`Approved By: ${restaurant.approved_by || 'N/A'}`);
      
      if (index < data.length - 1) {
        console.log('\n');
      }
    });

    // Also search for similar patterns to understand the issue
    console.log('\n🔍 Searching for restaurants with "Bldg" in city name...\n');
    
    const { data: bldgData, error: bldgError } = await supabase
      .from('restaurants')
      .select('id, name, city, address, state')
      .ilike('city', '%Bldg%');

    if (bldgError) {
      console.error('❌ Error searching for Bldg restaurants:', bldgError);
    } else if (bldgData && bldgData.length > 0) {
      console.log(`Found ${bldgData.length} restaurant(s) with "Bldg" in city name:`);
      bldgData.forEach((restaurant, index) => {
        console.log(`${index + 1}. ${restaurant.name} | City: "${restaurant.city}" | Address: ${restaurant.address || 'N/A'}`);
      });
    } else {
      console.log('No restaurants found with "Bldg" in city name');
    }

    // Search for restaurants with "Building" in city name
    console.log('\n🔍 Searching for restaurants with "Building" in city name...\n');
    
    const { data: buildingData, error: buildingError } = await supabase
      .from('restaurants')
      .select('id, name, city, address, state')
      .ilike('city', '%Building%');

    if (buildingError) {
      console.error('❌ Error searching for Building restaurants:', buildingError);
    } else if (buildingData && buildingData.length > 0) {
      console.log(`Found ${buildingData.length} restaurant(s) with "Building" in city name:`);
      buildingData.forEach((restaurant, index) => {
        console.log(`${index + 1}. ${restaurant.name} | City: "${restaurant.city}" | Address: ${restaurant.address || 'N/A'}`);
      });
    } else {
      console.log('No restaurants found with "Building" in city name');
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Run the script
queryBldg2Restaurant().then(() => {
  console.log('\n✅ Query complete');
}).catch(error => {
  console.error('❌ Script failed:', error);
});