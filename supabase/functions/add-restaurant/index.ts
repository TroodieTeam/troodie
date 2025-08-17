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
const APPROVED_CUISINE_TYPES = [
  "American",
  "Southern",
  "International",
  "Fast Casual",
  "Fine Dining",
  "Cafes/Brunch",
  "Bars/Breweries",
  "Japanese",
  "Sushi",
  "Mexican",
  "Tex-Mex",
  "Asian",
  "Street Food",
  "Brewery",
  "Bakery",
  "Coffee",
  "Spanish",
  "Tapas",
  "BBQ",
  "Steakhouse",
  "Contemporary",
  "Rooftop",
  "Vegan",
  "Vegetarian",
  "Mediterranean",
  "Italian",
  "French",
  "Indian",
  "Thai",
  "Chinese",
  "Vietnamese"
];
// ===== DATA STANDARDIZATION FUNCTIONS =====
function normalizeCuisineString(value) {
  if (!value) return '';
  let v = value.toString().trim();
  // Common typo fixes
  v = v.replace(/\bsreet\b/gi, 'street');
  v = v.replace(/\bst\.?\s?food\b/gi, 'street food');
  // Collapse multiple spaces
  v = v.replace(/\s{2,}/g, ' ');
  return v;
}
function standardizeCuisine(rawCuisines) {
  if (!rawCuisines || rawCuisines.length === 0) return [
    "International"
  ];
  const standardized = [];
  const lowerCaseApproved = APPROVED_CUISINE_TYPES.map((c)=>c.toLowerCase());
  for (const rawCuisine of rawCuisines){
    const cleaned = normalizeCuisineString(rawCuisine);
    const lowerRaw = cleaned.toLowerCase();
    let matched = false;
    for (const approved of lowerCaseApproved){
      if (lowerRaw.includes(approved) || approved.includes(lowerRaw)) {
        standardized.push(APPROVED_CUISINE_TYPES[lowerCaseApproved.indexOf(approved)]);
        matched = true;
        break;
      }
    }
    if (!matched) {
      if (lowerRaw.includes("street food")) {
        standardized.push("Street Food");
      } else if (lowerRaw.includes("american") || lowerRaw.includes("southern") || lowerRaw.includes("comfort")) {
        standardized.push("American");
      } else if (lowerRaw.includes("mexican") || lowerRaw.includes("tex-mex")) {
        standardized.push("Mexican");
      } else if (lowerRaw.includes("sushi") || lowerRaw.includes("japanese")) {
        standardized.push("Japanese");
      } else if (lowerRaw.includes("asian") || lowerRaw.includes("chinese") || lowerRaw.includes("thai") || lowerRaw.includes("vietnamese")) {
        standardized.push("Asian");
      } else if (lowerRaw.includes("pizza") || lowerRaw.includes("italian")) {
        standardized.push("Italian");
      } else if (lowerRaw.includes("cafe") || lowerRaw.includes("brunch")) {
        standardized.push("Cafes/Brunch");
      } else if (lowerRaw.includes("bar") || lowerRaw.includes("brewery") || lowerRaw.includes("pub")) {
        standardized.push("Bars/Breweries");
      } else if (lowerRaw.includes("fine dining") || lowerRaw.includes("upscale")) {
        standardized.push("Fine Dining");
      } else if (lowerRaw.includes("fast casual") || lowerRaw.includes("sandwich") || lowerRaw.includes("burger")) {
        standardized.push("Fast Casual");
      } else {
        standardized.push("International");
      }
    }
  }
  return [
    ...new Set(standardized)
  ];
}
function standardizePriceRange(rawPrice) {
  if (!rawPrice) return '$$';
  if (typeof rawPrice === 'number') {
    if (rawPrice <= 1) return '$';
    if (rawPrice <= 2) return '$$';
    if (rawPrice <= 3) return '$$$';
    return '$$$$';
  }
  const price = rawPrice.toString().trim();
  if (price.includes('$')) {
    if (price.length === 1) return '$';
    if (price.length === 2) return '$$';
    if (price.length === 3) return '$$$';
    if (price.length >= 4) return '$$$$';
  }
  const lowerPrice = price.toLowerCase();
  if (lowerPrice.includes("cheap") || lowerPrice.includes("inexpensive") || lowerPrice.includes("budget")) return '$';
  if (lowerPrice.includes("moderate") || lowerPrice.includes("mid-range")) return '$$';
  if (lowerPrice.includes("expensive") || lowerPrice.includes("upscale") || lowerPrice.includes("fine dining")) return '$$$';
  if (lowerPrice.includes("very expensive") || lowerPrice.includes("luxury")) return '$$$$';
  return '$$';
}
function convertOpeningHours(hoursData) {
  if (!hoursData) return {};
  // Handle Google Places weekday_text format
  if (hoursData.weekday_text && Array.isArray(hoursData.weekday_text)) {
    const daysMap = {};
    const dayNames = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday'
    ];
    hoursData.weekday_text.forEach((dayText, index)=>{
      const day = dayNames[index];
      const parts = dayText.split(': ');
      if (parts.length > 1) {
        daysMap[day] = parts[1];
      }
    });
    return daysMap;
  }
  // Handle other formats
  const days = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
  ];
  const formattedHours = {};
  for (const day of days){
    const dayHours = hoursData[day] || hoursData[day.charAt(0).toUpperCase() + day.slice(1)];
    if (dayHours && typeof dayHours === 'string') {
      formattedHours[day.charAt(0).toUpperCase() + day.slice(1)] = dayHours;
    }
  }
  return Object.keys(formattedHours).length > 0 ? formattedHours : hoursData;
}
function normalizeFeatures(featuresData) {
  if (!featuresData) return [];
  if (typeof featuresData === 'string') {
    return featuresData.split(',').map((f)=>f.trim()).filter(Boolean);
  }
  if (Array.isArray(featuresData)) {
    return featuresData.map((f)=>typeof f === 'string' ? f : f.name || f.title || f).filter(Boolean).slice(0, 25); // Limit to prevent bloat
  }
  return [];
}
// ===== VALIDATION =====
function validateRestaurantInput(input) {
  const errors = [];
  if (!input.restaurantName || input.restaurantName.trim().length < 2) {
    errors.push("Restaurant name is required and must be at least 2 characters");
  }
  if (!input.address || input.address.trim().length < 5) {
    errors.push("Address is required and must be at least 5 characters");
  }
  if (input.placeId && !input.placeId.startsWith('ChIJ')) {
    errors.push("Invalid Google Place ID format");
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}
// ===== APIFY INTEGRATION =====
async function runApifyActor(restaurantName, location) {
  const client = new ApifyClient({
    token: APIFY_TOKEN
  });
  const input = {
    keywords: [
      restaurantName
    ],
    locations: [
      location
    ],
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
    const filteredResults = items.filter((item)=>{
      const nameMatch = item.restaurant_name?.toLowerCase().includes(restaurantName.toLowerCase());
      const addressMatch = item.full_address?.toLowerCase().includes(location.toLowerCase());
      return nameMatch || addressMatch;
    });
    return filteredResults.length > 0 ? filteredResults : items.slice(0, 1);
  } catch (error) {
    console.error('Apify actor error:', error);
    throw new Error(`Failed to scrape restaurant data: ${error.message}`);
  }
}
// ===== TRAFFIC LIGHT RATING CONVERSION =====
function convertStarToTrafficLight(starRating) {
  if (!starRating || starRating < 1 || starRating > 5) return null;
  // Convert 1-5 star ratings to traffic light system
  if (starRating >= 4.5) return 'green'; // 4.5-5.0: Highly recommended
  if (starRating >= 3.5) return 'yellow'; // 3.5-4.4: Good but mixed
  return 'red'; // 1.0-3.4: Not recommended
}
function calculateRatingConfidence(reviewCount) {
  if (reviewCount < 10) return 0.3; // Low confidence
  if (reviewCount < 50) return 0.6; // Medium confidence  
  if (reviewCount < 100) return 0.8; // Good confidence
  return 1.0; // High confidence
}
function convertGoogleRatingToTrafficLight(googleRating, reviewCount) {
  // Default neutral state
  const defaultResult = {
    red_ratings_count: 0,
    yellow_ratings_count: 0,
    green_ratings_count: 0,
    total_ratings_count: 0,
    overall_rating: 'neutral'
  };
  if (!googleRating || reviewCount < 5) {
    return defaultResult;
  }
  const trafficLightRating = convertStarToTrafficLight(googleRating);
  if (!trafficLightRating) {
    return defaultResult;
  }
  // Convert to simulated traffic light counts based on confidence
  const confidence = calculateRatingConfidence(reviewCount);
  const simulatedCount = Math.max(1, Math.floor(confidence * 10)); // 1-10 simulated ratings
  const result = {
    red_ratings_count: 0,
    yellow_ratings_count: 0,
    green_ratings_count: 0,
    total_ratings_count: simulatedCount,
    overall_rating: trafficLightRating
  };
  // Assign counts based on the rating
  if (trafficLightRating === 'green') {
    result.green_ratings_count = simulatedCount;
  } else if (trafficLightRating === 'yellow') {
    result.yellow_ratings_count = simulatedCount;
  } else {
    result.red_ratings_count = simulatedCount;
  }
  return result;
}
// ===== DATA PROCESSING =====
function parseCityStateZip(address) {
  if (!address || typeof address !== 'string') {
    return { city: '', state: '', zip: null, country: '' };
  }
  const parts = address.split(',').map((p)=>p.trim()).filter(Boolean);
  let country = '';
  // Detect and remove country if present at the end
  if (parts.length >= 3) {
    const last = parts[parts.length - 1];
    if (/^USA$|^United States$/i.test(last)) {
      country = last;
      parts.pop();
    }
  }
  // Find the segment that contains state and/or zip (usually last now)
  let state = '';
  let zip = null;
  let city = '';
  // Iterate from the end to find a segment with state code or zip code
  for (let i = parts.length - 1; i >= 0; i--) {
    const seg = parts[i];
    const stateMatch = seg.match(/\b([A-Z]{2})\b/);
    const zipMatch = seg.match(/\b\d{5}(?:-\d{4})?\b/);
    if (stateMatch || zipMatch) {
      state = stateMatch ? stateMatch[1] : '';
      zip = zipMatch ? zipMatch[0] : null;
      // City is the token immediately before this segment if available
      if (i - 1 >= 0) {
        const candidate = parts[i - 1];
        // If candidate looks like it contains street info, extract trailing city-like words
        if (/\d/.test(candidate) || candidate.length > 40) {
          const tailMatch = candidate.match(/([A-Za-z][A-Za-z\-']*(?:\s+[A-Za-z][A-Za-z\-']*)*)$/);
          city = tailMatch ? tailMatch[1] : candidate;
        } else {
          city = candidate;
        }
      }
      break;
    }
  }
  // Fallback: if city still empty and we have at least 2 parts, assume second token is city
  if (!city && parts.length >= 2) {
    city = parts[1];
  }
  return { city: city || '', state: state || '', zip: zip || null, country };
}
function extractCity(address) {
  const { city } = parseCityStateZip(address);
  return city || '';
}
function extractState(address) {
  const { state } = parseCityStateZip(address);
  return state || '';
}
function extractZipCode(address) {
  const { zip } = parseCityStateZip(address);
  return zip;
}
function formatLocation(locationData) {
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
function normalizeCuisineTypes(cuisines) {
  if (!cuisines) return [
    'Restaurant'
  ];
  let rawCuisines = [];
  if (typeof cuisines === 'string') {
    rawCuisines = [
      cuisines
    ];
  } else if (Array.isArray(cuisines)) {
    rawCuisines = cuisines.map((c)=>typeof c === 'string' ? c : c.title || c.name).filter(Boolean);
  }
  return standardizeCuisine(rawCuisines);
}
function normalizePhone(phone) {
  if (!phone) return null;
  // Clean phone number but preserve formatting
  return phone.toString().replace(/[^\d+\-\(\)\s\.]/g, '');
}
function normalizePhotos(photos) {
  if (!photos) return [];
  if (Array.isArray(photos)) {
    const googleKey = Deno.env.get('GOOGLE_MAPS_API_KEY') || Deno.env.get('GOOGLE_API_KEY');
    return photos.map((p)=>{
      if (typeof p === 'string') return p;
      if (p.photo_reference) {
        // Convert Google Photos reference to URL if API key is available; otherwise skip
        if (googleKey) {
          return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${p.photo_reference}&key=${googleKey}`;
        }
        return null;
      }
      return p.url || p.src;
    }).filter(Boolean).slice(0, 10);
  }
  return [];
}
function getCoverPhoto(photos) {
  const photoArray = normalizePhotos(photos);
  return photoArray.length > 0 ? photoArray[0] : null;
}
function processApifyData(apifyData, userInput) {
  const fullAddress = apifyData.full_address || userInput.address;
  const googleRating = parseFloat(apifyData.rating) || null;
  const reviewCount = parseInt(apifyData.review_count) || 0;
  // Convert Google rating to traffic light system
  const trafficLightRating = convertGoogleRatingToTrafficLight(googleRating, reviewCount);
  return {
    google_place_id: userInput.placeId || null,
    name: apifyData.restaurant_name || userInput.restaurantName,
    address: fullAddress,
    city: extractCity(fullAddress),
    state: extractState(fullAddress),
    zip_code: extractZipCode(fullAddress),
    location: formatLocation(apifyData.location),
    cuisine_types: normalizeCuisineTypes(apifyData.cuisine_type || apifyData.categories),
    price_range: standardizePriceRange(apifyData.price_level || apifyData.price),
    phone: normalizePhone(apifyData.phone_number || apifyData.phone),
    website: apifyData.website_url || apifyData.website || null,
    hours: convertOpeningHours(apifyData.hours || {}),
    photos: normalizePhotos(apifyData.images || apifyData.photos),
    cover_photo_url: getCoverPhoto(apifyData.images || apifyData.photos),
    google_rating: googleRating,
    google_reviews_count: reviewCount,
    troodie_rating: null,
    troodie_reviews_count: 0,
    features: normalizeFeatures(apifyData.amenities || apifyData.features || apifyData.key_features),
    dietary_options: [],
    is_verified: false,
    is_claimed: false,
    owner_id: null,
    data_source: 'user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_google_sync: null,
    ...trafficLightRating
  };
}
function processGooglePlacesData(placeDetails, userInput) {
  const fullAddress = userInput.address;
  const googleRating = placeDetails.rating || null;
  const reviewCount = placeDetails.user_ratings_total || 0;
  // Convert Google rating to traffic light system
  const trafficLightRating = convertGoogleRatingToTrafficLight(googleRating, reviewCount);
  // Process Google Places types into cuisine types
  let cuisineTypes = [
    'Restaurant'
  ];
  if (placeDetails.types) {
    const relevantTypes = placeDetails.types.filter((type)=>type.includes('restaurant') || type === 'cafe' || type === 'bar' || type === 'bakery' || type === 'meal_takeaway' || type === 'food');
    if (relevantTypes.length > 0) {
      cuisineTypes = standardizeCuisine(relevantTypes.map((type)=>type.replace(/_/g, ' ').replace(/restaurant/g, '').trim()).filter(Boolean));
    }
  }
  return {
    google_place_id: userInput.placeId || null,
    name: userInput.restaurantName,
    address: fullAddress,
    city: extractCity(fullAddress),
    state: extractState(fullAddress),
    zip_code: extractZipCode(fullAddress),
    location: placeDetails.geometry?.location ? `POINT(${placeDetails.geometry.location.lng} ${placeDetails.geometry.location.lat})` : null,
    cuisine_types: cuisineTypes,
    price_range: standardizePriceRange(placeDetails.price_level),
    phone: placeDetails.formatted_phone_number || null,
    website: placeDetails.website || null,
    hours: convertOpeningHours(placeDetails.opening_hours || {}),
    photos: normalizePhotos(placeDetails.photos),
    cover_photo_url: getCoverPhoto(placeDetails.photos),
    google_rating: googleRating,
    google_reviews_count: reviewCount,
    troodie_rating: null,
    troodie_reviews_count: 0,
    features: normalizeFeatures([]),
    dietary_options: [],
    is_verified: false,
    is_claimed: false,
    owner_id: null,
    data_source: 'user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_google_sync: null,
    ...trafficLightRating
  };
}
// ===== MAIN EDGE FUNCTION =====
serve(async (req)=>{
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
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // Check if restaurant already exists
    const { data: existingRestaurant } = await supabase.from('restaurants').select('id, name').or(`google_place_id.eq.${placeId},and(name.ilike.%${restaurantName}%,address.ilike.%${address}%)`).single();
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
    let processedRestaurant;
    // Priority 1: Use Google Places data if available
    if (placeDetails && placeDetails.geometry) {
      console.log(`📍 Processing Google Places data for: ${restaurantName}`);
      processedRestaurant = processGooglePlacesData(placeDetails, {
        restaurantName,
        address,
        placeId
      });
    } else if (APIFY_TOKEN) {
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
      console.log(`🧹 Processing scraped data...`);
      processedRestaurant = processApifyData(apifyResults[0], {
        restaurantName,
        address,
        placeId
      });
    } else {
      console.log(`📝 Creating basic restaurant entry for: ${restaurantName}`);
      processedRestaurant = {
        google_place_id: placeId || null,
        name: restaurantName,
        address: address,
        city: extractCity(address),
        state: extractState(address),
        zip_code: extractZipCode(address),
        location: null,
        cuisine_types: [
          'Restaurant'
        ],
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
    }
    // Insert into restaurants table
    const { data: insertedRestaurant, error: insertError } = await supabase.from('restaurants').insert(processedRestaurant).select().single();
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
  } catch (error) {
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
