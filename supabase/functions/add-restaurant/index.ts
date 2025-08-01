import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import ApifyClient from 'https://esm.sh/apify-client@2.9.0';

// ===== CONSTANTS =====
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const APIFY_TOKEN = Deno.env.get('APIFY_API_TOKEN');
const ACTOR_ID = "BxxFJax5cSD2VeXkV";

// ===== VALIDATION =====
function validateRestaurantInput(input: any) {
  const errors = [];
  
  if (!input.restaurantName || input.restaurantName.trim().length < 2) {
    errors.push("Restaurant name is required and must be at least 2 characters");
  }
  
  if (!input.address || input.address.trim().length < 5) {
    errors.push("Address is required and must be at least 5 characters");
  }
  
  // Removed location restrictions - now accepting restaurants from anywhere
  
  if (input.placeId && !input.placeId.startsWith('ChIJ')) {
    errors.push("Invalid Google Place ID format");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// ===== APIFY INTEGRATION =====
async function runApifyActor(restaurantName: string, location: string) {
  const client = new ApifyClient({
    token: APIFY_TOKEN
  });
  
  const input = {
    keywords: [restaurantName],
    locations: [location],
    languages: "English (United States)",
    sort: "Recommended",
    price: [],
    maxCrawlPages: 1,
    unique_only: true,
    urls: []
  };
  
  try {
    console.log(`🚀 Running Apify actor for: ${restaurantName} in ${location}`);
    const run = await client.actor(ACTOR_ID).call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    console.log(`📊 Apify returned ${items.length} results`);
    
    const filteredResults = items.filter((item: any) => {
      const nameMatch = item.restaurant_name?.toLowerCase().includes(restaurantName.toLowerCase());
      const addressMatch = item.full_address?.toLowerCase().includes(location.toLowerCase());
      return nameMatch || addressMatch;
    });
    
    return filteredResults.length > 0 ? filteredResults : items.slice(0, 1);
  } catch (error: any) {
    console.error('Apify actor error:', error);
    throw new Error(`Failed to scrape restaurant data: ${error.message}`);
  }
}

// ===== DATA PROCESSING =====
function extractCity(address: string) {
  const parts = address.split(',');
  if (parts.length >= 2) {
    // Get the second to last part which is typically the city
    return parts[parts.length - 2].trim();
  }
  return '';
}

function extractState(address: string) {
  const parts = address.split(',');
  if (parts.length >= 2) {
    // Get the last part which typically contains state and zip
    const lastPart = parts[parts.length - 1].trim();
    // Extract state abbreviation (2 uppercase letters)
    const stateMatch = lastPart.match(/\b[A-Z]{2}\b/);
    return stateMatch ? stateMatch[0] : '';
  }
  return '';
}

function extractZipCode(address: string) {
  const zipMatch = address.match(/\b\d{5}(-\d{4})?\b/);
  return zipMatch ? zipMatch[0] : null;
}

function formatLocation(locationData: any) {
  if (!locationData) return null;
  
  if (typeof locationData === 'string') {
    const coords = locationData.split(',');
    if (coords.length === 2) {
      const lat = parseFloat(coords[0]);
      const lng = parseFloat(coords[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return `POINT(${lng} ${lat})`;
      }
    }
  }
  
  if (locationData.lat && locationData.lng) {
    return `POINT(${locationData.lng} ${locationData.lat})`;
  }
  
  return null;
}

function normalizeCuisineTypes(cuisines: any) {
  if (!cuisines) return ['Restaurant'];
  
  if (typeof cuisines === 'string') {
    return [cuisines];
  }
  
  if (Array.isArray(cuisines)) {
    return cuisines.map((c: any) => typeof c === 'string' ? c : c.title || c.name).filter(Boolean);
  }
  
  return ['Restaurant'];
}

function normalizePriceRange(price: any) {
  if (!price) return '$$';
  
  if (typeof price === 'string') {
    return price;
  }
  
  if (typeof price === 'number') {
    if (price <= 1) return '$';
    if (price <= 2) return '$$';
    if (price <= 3) return '$$$';
    return '$$$$';
  }
  
  return '$$';
}

function normalizePhone(phone: any) {
  if (!phone) return null;
  return phone.toString().replace(/[^\d+\-\(\)\s]/g, '');
}

function normalizePhotos(photos: any) {
  if (!photos) return [];
  
  if (Array.isArray(photos)) {
    return photos.map((p: any) => typeof p === 'string' ? p : p.url || p.src)
      .filter(Boolean)
      .slice(0, 10);
  }
  
  return [];
}

function getCoverPhoto(photos: any) {
  const photoArray = normalizePhotos(photos);
  return photoArray.length > 0 ? photoArray[0] : null;
}

function normalizeFeatures(features: any) {
  if (!features) return [];
  
  if (Array.isArray(features)) {
    return features.filter(Boolean).slice(0, 20);
  }
  
  return [];
}

function processApifyData(apifyData: any, userInput: any) {
  const fullAddress = apifyData.full_address || userInput.address;
  return {
    google_place_id: userInput.placeId || null,
    name: apifyData.restaurant_name || userInput.restaurantName,
    address: fullAddress,
    city: extractCity(fullAddress),
    state: extractState(fullAddress),
    zip_code: extractZipCode(fullAddress),
    location: formatLocation(apifyData.location),
    cuisine_types: normalizeCuisineTypes(apifyData.cuisine_type || apifyData.categories),
    price_range: normalizePriceRange(apifyData.price_level || apifyData.price),
    phone: normalizePhone(apifyData.phone_number || apifyData.phone),
    website: apifyData.website_url || apifyData.website || null,
    hours: apifyData.hours || {},
    photos: normalizePhotos(apifyData.images || apifyData.photos),
    cover_photo_url: getCoverPhoto(apifyData.images || apifyData.photos),
    google_rating: parseFloat(apifyData.rating) || null,
    google_reviews_count: parseInt(apifyData.review_count) || 0,
    troodie_rating: null,
    troodie_reviews_count: 0,
    features: normalizeFeatures(apifyData.amenities || apifyData.features),
    dietary_options: [],
    is_verified: false,
    is_claimed: false,
    owner_id: null,
    data_source: 'user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_google_sync: null,
    red_ratings_count: 0,
    yellow_ratings_count: 0,
    green_ratings_count: 0,
    total_ratings_count: 0,
    overall_rating: 'neutral'
  };
}

// ===== MAIN EDGE FUNCTION =====
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  
  try {
    const { restaurantName, address, placeId, placeDetails } = await req.json();
    
    // Validate input
    const validation = validateRestaurantInput({
      restaurantName,
      address,
      placeId
    });
    
    if (!validation.isValid) {
      return new Response(JSON.stringify({
        error: 'Invalid input',
        details: validation.errors
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Check if restaurant already exists
    const { data: existingRestaurant } = await supabase
      .from('restaurants')
      .select('id, name')
      .or(`google_place_id.eq.${placeId},and(name.ilike.%${restaurantName}%,address.ilike.%${address}%)`)
      .single();
    
    if (existingRestaurant) {
      return new Response(JSON.stringify({
        error: 'Restaurant already exists',
        restaurant: existingRestaurant
      }), {
        status: 409,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // If we have placeDetails from Google, use them directly
    if (placeDetails && placeDetails.geometry) {
      // Process Google Places data
      const processedRestaurant = {
        google_place_id: placeId || null,
        name: restaurantName,
        address: address,
        city: extractCity(address),
        state: extractState(address),
        zip_code: extractZipCode(address),
        location: placeDetails.geometry?.location ? 
          `POINT(${placeDetails.geometry.location.lng} ${placeDetails.geometry.location.lat})` : null,
        cuisine_types: placeDetails.types ? 
          placeDetails.types
            .filter((type: string) => type.includes('restaurant') || type === 'cafe' || type === 'bar')
            .map((type: string) => type.replace(/_/g, ' ').replace(/restaurant/g, '').trim())
            .filter(Boolean).length > 0 ? 
              placeDetails.types
                .filter((type: string) => type.includes('restaurant') || type === 'cafe' || type === 'bar')
                .map((type: string) => type.replace(/_/g, ' ').replace(/restaurant/g, '').trim())
                .filter(Boolean) : ['Restaurant'] 
            : ['Restaurant'],
        price_range: placeDetails.price_level ? 
          ['$', '$$', '$$$', '$$$$', '$$$$$'][placeDetails.price_level] || '$$' : '$$',
        phone: placeDetails.formatted_phone_number || null,
        website: placeDetails.website || null,
        hours: placeDetails.opening_hours?.weekday_text ? 
          { weekday_text: placeDetails.opening_hours.weekday_text } : {},
        photos: placeDetails.photos ? 
          placeDetails.photos.map((photo: any) => photo.photo_reference).slice(0, 10) : [],
        cover_photo_url: placeDetails.photos?.[0]?.photo_reference || null,
        google_rating: placeDetails.rating || null,
        google_reviews_count: placeDetails.user_ratings_total || 0,
        troodie_rating: null,
        troodie_reviews_count: 0,
        features: [],
        dietary_options: [],
        is_verified: false,
        is_claimed: false,
        owner_id: null,
        data_source: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_google_sync: null,
        red_ratings_count: 0,
        yellow_ratings_count: 0,
        green_ratings_count: 0,
        total_ratings_count: 0,
        overall_rating: 'neutral'
      };

      // Insert into restaurants table
      const { data: insertedRestaurant, error: insertError } = await supabase
        .from('restaurants')
        .insert(processedRestaurant)
        .select()
        .single();
      
      if (insertError) {
        console.error('Database insertion error:', insertError);
        return new Response(JSON.stringify({
          error: 'Failed to save restaurant',
          details: insertError.message
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      console.log(`✅ Restaurant added successfully: ${insertedRestaurant.name}`);
      
      return new Response(JSON.stringify({
        success: true,
        restaurant: insertedRestaurant,
        message: 'Restaurant added successfully!'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // If Apify is available, use it
    if (APIFY_TOKEN) {
      // Run Apify actor to scrape restaurant data
      console.log(`🔍 Scraping data for: ${restaurantName} at ${address}`);
      const apifyResults = await runApifyActor(restaurantName, address);
      
      if (!apifyResults || apifyResults.length === 0) {
        return new Response(JSON.stringify({
          error: 'No restaurant data found from scraping'
        }), {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      // Process and clean the scraped data
      console.log(`🧹 Processing scraped data...`);
      const processedRestaurant = processApifyData(apifyResults[0], {
        restaurantName,
        address,
        placeId
      });
      
      // Insert into restaurants table
      const { data: insertedRestaurant, error: insertError } = await supabase
        .from('restaurants')
        .insert(processedRestaurant)
        .select()
        .single();
      
      if (insertError) {
        console.error('Database insertion error:', insertError);
        return new Response(JSON.stringify({
          error: 'Failed to save restaurant',
          details: insertError.message
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      console.log(`✅ Restaurant added successfully: ${insertedRestaurant.name}`);
      
      return new Response(JSON.stringify({
        success: true,
        restaurant: insertedRestaurant,
        message: 'Restaurant added successfully!'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Fallback if no Apify token - just use basic data
    const basicRestaurant = {
      google_place_id: placeId || null,
      name: restaurantName,
      address: address,
      city: extractCity(address),
      state: extractState(address),
      zip_code: extractZipCode(address),
      location: null,
      cuisine_types: ['Restaurant'],
      price_range: '$$',
      phone: null,
      website: null,
      hours: {},
      photos: [],
      cover_photo_url: null,
      google_rating: null,
      google_reviews_count: 0,
      troodie_rating: null,
      troodie_reviews_count: 0,
      features: [],
      dietary_options: [],
      is_verified: false,
      is_claimed: false,
      owner_id: null,
      data_source: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_google_sync: null,
      red_ratings_count: 0,
      yellow_ratings_count: 0,
      green_ratings_count: 0,
      total_ratings_count: 0,
      overall_rating: 'neutral'
    };
    
    const { data: insertedRestaurant, error: insertError } = await supabase
      .from('restaurants')
      .insert(basicRestaurant)
      .select()
      .single();
    
    if (insertError) {
      console.error('Database insertion error:', insertError);
      return new Response(JSON.stringify({
        error: 'Failed to save restaurant',
        details: insertError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      restaurant: insertedRestaurant,
      message: 'Restaurant added successfully!'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error: any) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});