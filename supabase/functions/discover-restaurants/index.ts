import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
    convertGoogleRatingToTrafficLight,
    convertOpeningHours,
    extractCity,
    extractState,
    extractZipCode,
    formatLocation,
    getCoverPhoto,
    normalizeFeatures,
    normalizePhone,
    normalizePhotos,
    standardizeCuisine,
    standardizePriceRange
} from '../_shared/restaurant-utils.ts';

// ===== CONSTANTS =====
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GOOGLE_MAPS_API_KEY');

// Restaurant discovery categories with search parameters
const DISCOVERY_CATEGORIES = {
  // Cuisine-based categories
  'general-restaurants': {
    keywords: ['restaurant', 'dining'],
    priceFilters: ['$', '$$', '$$$', '$$$$'],
    sortBy: 'rating',
    minReviews: 10
  },
  'american-restaurants': {
    keywords: ['american restaurant', 'southern food', 'comfort food'],
    priceFilters: ['$$', '$$$'],
    cuisineTypes: ['American', 'Southern']
  },
  'fine-dining': {
    keywords: ['fine dining', 'upscale restaurant', 'michelin'],
    priceFilters: ['$$$', '$$$$'],
    features: ['reservations required', 'dress code'],
    cuisineTypes: ['Fine Dining', 'Contemporary']
  },
  'italian-restaurants': {
    keywords: ['italian restaurant', 'pasta', 'pizza'],
    priceFilters: ['$$', '$$$'],
    features: ['outdoor seating'],
    cuisineTypes: ['Italian']
  },
  'japanese-sushi': {
    keywords: ['japanese restaurant', 'sushi', 'ramen'],
    priceFilters: ['$$', '$$$'],
    cuisineTypes: ['Japanese', 'Sushi']
  },
  'mexican-texmex': {
    keywords: ['mexican restaurant', 'tex-mex', 'tacos'],
    priceFilters: ['$$'],
    features: ['takeout'],
    cuisineTypes: ['Mexican', 'Tex-Mex']
  },
  'bbq-restaurants': {
    keywords: ['bbq', 'barbecue', 'smokehouse'],
    priceFilters: ['$$'],
    features: ['group dining', 'family friendly'],
    cuisineTypes: ['BBQ']
  },
  'seafood-restaurants': {
    keywords: ['seafood restaurant', 'fish', 'oyster bar'],
    priceFilters: ['$$', '$$$'],
    cuisineTypes: ['Seafood']
  },
  'indian-thai': {
    keywords: ['indian restaurant', 'thai restaurant', 'curry'],
    priceFilters: ['$$'],
    cuisineTypes: ['Indian', 'Thai']
  },
  'mediterranean-greek': {
    keywords: ['mediterranean restaurant', 'greek restaurant'],
    priceFilters: ['$$'],
    cuisineTypes: ['Mediterranean', 'Greek']
  },
  'new-american-contemporary': {
    keywords: ['new american', 'contemporary', 'modern cuisine'],
    priceFilters: ['$$$', '$$$$'],
    cuisineTypes: ['Contemporary', 'New American']
  },
  'french-restaurants': {
    keywords: ['french restaurant', 'bistro', 'brasserie'],
    priceFilters: ['$$', '$$$', '$$$$'],
    cuisineTypes: ['French']
  },
  'casual-american': {
    keywords: ['casual dining', 'american casual', 'family restaurant'],
    priceFilters: ['$', '$$'],
    cuisineTypes: ['American', 'Casual']
  },
  'pizza': {
    keywords: ['pizza', 'pizzeria'],
    priceFilters: ['$', '$$'],
    cuisineTypes: ['Italian', 'Pizza']
  },
  'gluten-free': {
    keywords: ['gluten free restaurant', 'celiac friendly'],
    priceFilters: ['$$', '$$$'],
    features: ['gluten-free options']
  },
  'vegetarian': {
    keywords: ['vegetarian restaurant', 'plant based'],
    priceFilters: ['$$'],
    cuisineTypes: ['Vegetarian']
  },
  'vegan-vegetarian': {
    keywords: ['vegan restaurant', 'vegetarian restaurant', 'plant based'],
    priceFilters: ['$$'],
    cuisineTypes: ['Vegan', 'Vegetarian']
  },

  // Meal types & occasions
  'brunch-family': {
    keywords: ['brunch', 'weekend brunch'],
    priceFilters: ['$$'],
    features: ['kid friendly', 'family friendly'],
    mealType: 'brunch'
  },
  'brunch-outdoor': {
    keywords: ['brunch', 'outdoor brunch'],
    priceFilters: ['$$'],
    features: ['outdoor seating', 'patio'],
    mealType: 'brunch'
  },
  'lunch-spots': {
    keywords: ['lunch', 'lunch spot'],
    priceFilters: ['$$'],
    mealType: 'lunch',
    sortBy: 'reviews'
  },
  'dinner-restaurants': {
    keywords: ['dinner', 'evening dining'],
    priceFilters: ['$$', '$$$'],
    mealType: 'dinner'
  },
  'late-night-food': {
    keywords: ['late night food', '24 hour', 'open late'],
    priceFilters: ['$', '$$'],
    features: ['late night', 'open 24 hours']
  },
  'romantic-restaurants': {
    keywords: ['romantic restaurant', 'date night', 'intimate dining'],
    priceFilters: ['$$$', '$$$$'],
    features: ['reservations required', 'romantic atmosphere']
  },
  'family-friendly': {
    keywords: ['family restaurant', 'kid friendly'],
    priceFilters: ['$', '$$'],
    features: ['kid friendly', 'family dining']
  },

  // Food & beverage establishments
  'cafes-coffee-food': {
    keywords: ['cafe with food', 'coffee shop food'],
    priceFilters: ['$'],
    cuisineTypes: ['Cafes/Brunch', 'Coffee']
  },
  'coffee-shops': {
    keywords: ['coffee shop', 'cafe', 'espresso'],
    priceFilters: ['$'],
    cuisineTypes: ['Coffee']
  },
  'breweries-food': {
    keywords: ['brewery with food', 'brewpub'],
    priceFilters: ['$$'],
    features: ['full bar', 'craft beer'],
    cuisineTypes: ['Brewery', 'Bars/Breweries']
  },
  'breweries-dog-friendly': {
    keywords: ['dog friendly brewery', 'pet friendly brewery'],
    priceFilters: ['$$'],
    features: ['dog friendly', 'pet friendly'],
    cuisineTypes: ['Brewery']
  },
  'sports-bars': {
    keywords: ['sports bar', 'sports grill'],
    priceFilters: ['$$'],
    features: ['sports viewing', 'tv screens'],
    cuisineTypes: ['Bars/Breweries']
  },
  'bars-with-food': {
    keywords: ['bar with food', 'gastropub'],
    priceFilters: ['$$'],
    features: ['full bar'],
    cuisineTypes: ['Bars/Breweries']
  },
  'dessert-bakeries': {
    keywords: ['bakery', 'dessert shop', 'pastry'],
    priceFilters: ['$', '$$'],
    cuisineTypes: ['Bakery', 'Dessert']
  },

  // Specific foods
  'tacos-mexican': {
    keywords: ['tacos', 'taco shop', 'mexican food'],
    priceFilters: ['$', '$$'],
    cuisineTypes: ['Mexican', 'Street Food']
  },
  'sushi-delivery': {
    keywords: ['sushi delivery', 'sushi restaurant'],
    priceFilters: ['$$', '$$$'],
    features: ['delivery'],
    cuisineTypes: ['Japanese', 'Sushi']
  },
  'burgers': {
    keywords: ['burger', 'hamburger', 'burger joint'],
    priceFilters: ['$', '$$'],
    cuisineTypes: ['American', 'Fast Casual']
  },

  // Special attributes
  'happy-hour': {
    keywords: ['happy hour', 'happy hour specials'],
    priceFilters: ['$$'],
    features: ['happy hour', 'drink specials']
  },
  'outdoor-seating': {
    keywords: ['outdoor seating', 'patio dining', 'rooftop'],
    priceFilters: ['$$', '$$$'],
    features: ['outdoor seating', 'patio', 'rooftop']
  },
  'takeout-restaurants': {
    keywords: ['takeout', 'to go', 'quick service'],
    priceFilters: ['$', '$$'],
    features: ['takeout', 'quick service']
  }
};

// Utility functions imported from shared module

// ===== GOOGLE PLACES API FUNCTIONS =====
async function searchGooglePlaces(query: string, city: string, type?: string): Promise<any[]> {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is required but not configured');
  }

  const searchQuery = `${query} in ${city}`;
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  
  url.searchParams.append('query', searchQuery);
  url.searchParams.append('key', GOOGLE_API_KEY);
  
  if (type) {
    url.searchParams.append('type', type);
  }

  try {
    console.log(`🔍 Google Places search: "${searchQuery}"`);
    const response = await fetch(url.toString());
    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }
    
    console.log(`📦 Google Places returned ${data.results?.length || 0} results`);
    return data.results || [];
    
  } catch (error) {
    console.error(`❌ Google Places API error:`, error);
    throw error;
  }
}

async function getPlaceDetails(placeId: string): Promise<any> {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is required');
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.append('place_id', placeId);
  url.searchParams.append('key', GOOGLE_API_KEY);
  url.searchParams.append('fields', 'name,formatted_address,geometry,place_id,rating,user_ratings_total,price_level,formatted_phone_number,website,opening_hours,photos,types');

  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Place Details API error: ${data.status}`);
    }
    
    return data.result;
  } catch (error) {
    console.error(`❌ Place Details API error:`, error);
    return null;
  }
}

async function discoverRestaurantsByCategory(
  city: string, 
  categoryKey: string, 
  limit: number = 20
): Promise<any[]> {
  const category = DISCOVERY_CATEGORIES[categoryKey];
  if (!category) {
    throw new Error(`Unknown category: ${categoryKey}`);
  }

  if (!GOOGLE_API_KEY) {
    console.error(`❌ GOOGLE_API_KEY not found in environment variables`);
    throw new Error('GOOGLE_API_KEY is required but not configured');
  }

  const results: any[] = [];
  
  console.log(`🎯 Starting discovery for category: ${categoryKey} with ${category.keywords.length} keywords`);
  
  // Search for each keyword in the category
  for (const keyword of category.keywords) {
    try {
      console.log(`🔍 Searching ${categoryKey} in ${city} with keyword: "${keyword}"`);
      
      // Search using Google Places Text Search
      const places = await searchGooglePlaces(keyword, city, 'restaurant');
      
      if (places.length === 0) {
        console.log(`⚠️  No places found for keyword "${keyword}" in ${city}`);
        continue;
      }
      
      // Process and filter results
      const filteredPlaces = places
        .filter((place: any) => {
          // Apply category-specific filters
          if (category.minReviews && place.user_ratings_total < category.minReviews) {
            console.log(`❌ Filtered out ${place.name || 'unknown'} - not enough reviews (${place.user_ratings_total})`);
            return false;
          }
          
          // Filter by rating if specified
          if (place.rating && place.rating < 3.0) {
            console.log(`❌ Filtered out ${place.name || 'unknown'} - low rating (${place.rating})`);
            return false;
          }
          
          return true;
        })
        .slice(0, Math.ceil(limit / category.keywords.length));

      console.log(`✅ Filtered to ${filteredPlaces.length} places for keyword "${keyword}"`);
      
      // Get detailed information for each place
      for (const place of filteredPlaces) {
        try {
          const details = await getPlaceDetails(place.place_id);
          if (details) {
            // Convert Google Places format to our expected format
            const processedPlace = {
              restaurant_name: details.name,
              full_address: details.formatted_address,
              rating: details.rating,
              review_count: details.user_ratings_total,
              price_level: details.price_level,
              phone_number: details.formatted_phone_number,
              website_url: details.website,
              place_id: details.place_id,
              location: details.geometry?.location,
              photos: details.photos,
              hours: details.opening_hours,
              types: details.types,
              category_found: categoryKey,
              keyword_found: keyword
            };
            
            results.push(processedPlace);
          }
        } catch (detailError) {
          console.error(`❌ Error getting details for ${place.name}:`, detailError);
        }
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.error(`❌ Error searching ${keyword} in ${city}:`, error);
    }
  }

  // Remove duplicates and limit results
  const uniqueResults = results
    .filter((item, index, self) => 
      index === self.findIndex(t => t.restaurant_name === item.restaurant_name && t.full_address === item.full_address)
    )
    .slice(0, limit);

  console.log(`🎯 Final results for ${categoryKey}: ${uniqueResults.length} unique restaurants`);
  return uniqueResults;
}

async function bulkDiscoverRestaurants(
  city: string, 
  categories: string[] = Object.keys(DISCOVERY_CATEGORIES),
  limitPerCategory: number = 20
) {
  const results: { [category: string]: any[] } = {};
  
  console.log(`🌟 Starting bulk discovery for ${city} across ${categories.length} categories`);
  
  // Process categories in parallel (but limit concurrency to avoid rate limits)
  const BATCH_SIZE = 3;
  for (let i = 0; i < categories.length; i += BATCH_SIZE) {
    const batch = categories.slice(i, i + BATCH_SIZE);
    
    const batchPromises = batch.map(async (category) => {
      try {
        const restaurants = await discoverRestaurantsByCategory(city, category, limitPerCategory);
        results[category] = restaurants;
        console.log(`✅ Found ${restaurants.length} restaurants for ${category}`);
      } catch (error) {
        console.error(`❌ Failed to discover ${category}:`, error);
        results[category] = [];
      }
    });
    
    await Promise.all(batchPromises);
    
    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < categories.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return results;
}

async function processAndSaveDiscoveredRestaurants(
  discoveryResults: { [category: string]: any[] },
  supabase: any
) {
  const processedRestaurants: any[] = [];
  const duplicateChecks = new Set<string>();
  
  for (const [category, restaurants] of Object.entries(discoveryResults)) {
    console.log(`🔄 Processing ${restaurants.length} restaurants for category: ${category}`);
    
    for (const restaurant of restaurants) {
      // Create unique identifier to avoid duplicates
      const identifier = `${restaurant.restaurant_name}-${restaurant.full_address}`;
      if (duplicateChecks.has(identifier)) {
        console.log(`⚠️  Skipping duplicate: ${restaurant.restaurant_name}`);
        continue;
      }
      duplicateChecks.add(identifier);
      
      try {
        // Process restaurant data using existing logic
        const processedRestaurant = {
          google_place_id: restaurant.place_id || null,
          name: restaurant.restaurant_name,
          address: restaurant.full_address,
          city: extractCity(restaurant.full_address),
          state: extractState(restaurant.full_address),
          zip_code: extractZipCode(restaurant.full_address),
          location: formatLocation(restaurant.location),
          cuisine_types: standardizeCuisine(restaurant.types || [category]),
          price_range: standardizePriceRange(restaurant.price_level),
          phone: normalizePhone(restaurant.phone_number),
          website: restaurant.website_url || null,
          hours: convertOpeningHours(restaurant.hours || {}),
          photos: normalizePhotos(restaurant.photos),
          cover_photo_url: getCoverPhoto(restaurant.photos),
          google_rating: restaurant.rating || null,
          google_reviews_count: restaurant.review_count || 0,
          troodie_rating: null,
          troodie_reviews_count: 0,
          features: normalizeFeatures([]),
          dietary_options: [],
          is_verified: false,
          is_claimed: false,
          owner_id: null,
          data_source: 'google', // Use 'google' since we're getting data from Google Places API
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_google_sync: new Date().toISOString(),
          ...convertGoogleRatingToTrafficLight(
            restaurant.rating, 
            restaurant.review_count
          )
        };
        
        processedRestaurants.push(processedRestaurant);
        console.log(`✅ Processed: ${restaurant.restaurant_name} (${category})`);
        
      } catch (processingError) {
        console.error(`❌ Error processing restaurant ${restaurant.restaurant_name}:`, processingError);
      }
    }
  }
  
  console.log(`📊 Total processed restaurants: ${processedRestaurants.length}`);
  
  // Batch insert to database
  if (processedRestaurants.length > 0) {
    try {
      console.log(`🚀 Attempting to insert ${processedRestaurants.length} restaurants into database...`);
      
      // Sample first restaurant to check data structure
      console.log(`🔍 Sample restaurant data:`, JSON.stringify(processedRestaurants[0], null, 2));
      
      const { data, error } = await supabase
        .from('restaurants')
        .upsert(processedRestaurants, { 
          onConflict: 'google_place_id',
          ignoreDuplicates: true 
        })
        .select();
        
      if (error) {
        console.error('❌ Batch insert error:', error);
        console.error('❌ Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log(`💾 Successfully saved ${data?.length || 0} restaurants to database`);
      console.log(`📊 Database response: ${data ? 'Success' : 'No data returned'}`);
      return data || [];
      
    } catch (dbError) {
      console.error('❌ Database operation failed:', dbError);
      console.error('❌ Full error object:', {
        name: dbError.name,
        message: dbError.message,
        stack: dbError.stack
      });
      throw dbError;
    }
  } else {
    console.log(`⚠️  No processed restaurants to save to database`);
  }
  
  return [];
}

// ===== MAIN EDGE FUNCTION =====
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      city, 
      categories = Object.keys(DISCOVERY_CATEGORIES),
      limitPerCategory = 20,
      saveToDatabase = true 
    } = await req.json();

    if (!city) {
      return new Response(JSON.stringify({
        error: 'City is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🚀 Starting restaurant discovery for ${city}`);
    console.log(`📋 Categories requested: ${categories.length}`, categories);
    console.log(`🎯 Limit per category: ${limitPerCategory}`);
    console.log(`💾 Save to database: ${saveToDatabase}`);
    console.log(`🔑 GOOGLE_API_KEY available: ${!!GOOGLE_API_KEY}`);
    
    // Discover restaurants
    const discoveryResults = await bulkDiscoverRestaurants(city, categories, limitPerCategory);
    
    // Calculate totals
    const totalFound = Object.values(discoveryResults).reduce((sum, restaurants) => sum + restaurants.length, 0);
    
    let savedRestaurants = [];
    if (saveToDatabase) {
      console.log(`💾 Preparing to save to database...`);
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '', 
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      console.log(`🔗 Supabase client created, starting save process...`);
      savedRestaurants = await processAndSaveDiscoveredRestaurants(discoveryResults, supabase);
      console.log(`✅ Database save operation completed. Saved: ${savedRestaurants.length} restaurants`);
    } else {
      console.log(`⚠️  Database save skipped (saveToDatabase: false)`);
    }

    return new Response(JSON.stringify({
      success: true,
      city,
      categoriesSearched: categories.length,
      totalRestaurantsFound: totalFound,
      restaurantsSaved: savedRestaurants.length,
      results: discoveryResults,
      summary: Object.entries(discoveryResults).map(([category, restaurants]) => ({
        category,
        count: restaurants.length
      }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Discovery error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to discover restaurants',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
