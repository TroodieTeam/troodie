import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SearchRequest {
  query: string
  location?: {
    lat: number
    lng: number
  }
  filters?: {
    cuisine_types?: string[]
    price_range?: string[]
    min_rating?: number
    max_distance?: number
    open_now?: boolean
  }
  limit?: number
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { query, location, filters, limit = 20 }: SearchRequest = await req.json()

    // 1. Search local database first
    let supabaseQuery = supabase
      .from('restaurants')
      .select(`
        *,
        restaurant_popularity (
          total_saves,
          avg_rating,
          unique_savers
        )
      `)

    // Apply text search
    if (query) {
      supabaseQuery = supabaseQuery.or(
        `name.ilike.%${query}%,cuisine_types.cs.{${query}}`
      )
    }

    // Apply filters
    if (filters) {
      if (filters.cuisine_types?.length) {
        supabaseQuery = supabaseQuery.contains('cuisine_types', filters.cuisine_types)
      }
      if (filters.price_range?.length) {
        supabaseQuery = supabaseQuery.in('price_range', filters.price_range)
      }
      if (filters.min_rating) {
        supabaseQuery = supabaseQuery.gte('google_rating', filters.min_rating)
      }
    }

    // Apply location filter if provided
    if (location && filters?.max_distance) {
      // PostGIS query for distance
      const { data: nearbyRestaurants } = await supabase.rpc('nearby_restaurants', {
        lat: location.lat,
        lng: location.lng,
        radius_meters: filters.max_distance * 1000 // Convert km to meters
      })
      
      if (nearbyRestaurants) {
        const ids = nearbyRestaurants.map((r: any) => r.id)
        supabaseQuery = supabaseQuery.in('id', ids)
      }
    }

    // Execute query
    const { data: localResults, error: dbError } = await supabaseQuery
      .limit(limit)
      .order('google_rating', { ascending: false })

    if (dbError) {
      throw dbError
    }

    // 2. If we have enough results, return them
    if (localResults && localResults.length >= 10) {
      return new Response(
        JSON.stringify({
          results: localResults,
          source: 'local',
          total: localResults.length
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 3. Search Google Places for additional results
    const googleResults = await searchGooglePlaces(query, location, googleApiKey)
    
    // 4. Import new restaurants from Google
    const newRestaurants = []
    for (const place of googleResults) {
      // Check if we already have this restaurant
      const exists = localResults?.some(r => r.google_place_id === place.place_id)
      if (!exists) {
        const imported = await importGoogleRestaurant(place, googleApiKey, supabase)
        if (imported) {
          newRestaurants.push(imported)
        }
      }
    }

    // 5. Combine results
    const combinedResults = [...(localResults || []), ...newRestaurants]
      .slice(0, limit)
      .sort((a, b) => (b.google_rating || 0) - (a.google_rating || 0))

    return new Response(
      JSON.stringify({
        results: combinedResults,
        source: 'combined',
        total: combinedResults.length,
        local_count: localResults?.length || 0,
        google_count: newRestaurants.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

async function searchGooglePlaces(
  query: string, 
  location: any, 
  apiKey: string
): Promise<any[]> {
  let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`
  
  if (location) {
    url += `&location=${location.lat},${location.lng}&radius=50000`
  } else {
    // Default to Charlotte, NC
    url += `&location=35.2271,-80.8431&radius=50000`
  }

  try {
    const response = await fetch(url)
    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error('Google Places search error:', error)
    return []
  }
}

async function importGoogleRestaurant(
  place: any, 
  apiKey: string,
  supabase: any
): Promise<any> {
  try {
    // Get detailed information
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?` +
      `place_id=${place.place_id}&` +
      `fields=name,formatted_address,geometry,formatted_phone_number,website,` +
      `opening_hours,price_level,rating,user_ratings_total,photos,types,address_components&` +
      `key=${apiKey}`

    const detailsResponse = await fetch(detailsUrl)
    const { result } = await detailsResponse.json()

    if (!result) return null

    // Extract zip code
    const zipCode = result.address_components?.find(
      (c: any) => c.types.includes('postal_code')
    )?.long_name

    // Process photos (get up to 3)
    const photos = result.photos?.slice(0, 3).map((photo: any) => ({
      url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1000&photoreference=${photo.photo_reference}&key=${apiKey}`,
      source: 'google',
      attribution: photo.html_attributions?.[0] || 'Google Places'
    })) || []

    // Convert opening hours
    const hours = result.opening_hours?.periods ? convertOpeningHours(result.opening_hours) : null

    // Prepare restaurant data
    const restaurantData = {
      google_place_id: place.place_id,
      name: result.name,
      address: result.formatted_address,
      city: extractCity(result.address_components) || 'Charlotte',
      state: 'NC',
      zip_code: zipCode,
      country: 'US',
      location: `POINT(${result.geometry.location.lng} ${result.geometry.location.lat})`,
      phone: result.formatted_phone_number,
      website: result.website,
      cuisine_types: extractCuisineTypes(result.types),
      price_range: convertPriceLevel(result.price_level),
      hours: hours,
      photos: photos,
      cover_photo_url: photos[0]?.url,
      google_rating: result.rating,
      google_reviews_count: result.user_ratings_total,
      features: extractFeatures(result.types),
      data_source: 'google',
      last_google_sync: new Date().toISOString()
    }

    // Insert into database
    const { data, error } = await supabase
      .from('restaurants')
      .insert(restaurantData)
      .select()
      .single()

    if (error) {
      console.error('Error inserting restaurant:', error)
      return null
    }

    return data

  } catch (error) {
    console.error('Error importing restaurant:', error)
    return null
  }
}

function extractCity(addressComponents: any[]): string | null {
  const cityComponent = addressComponents?.find(
    c => c.types.includes('locality') || c.types.includes('sublocality')
  )
  return cityComponent?.long_name || null
}

function extractCuisineTypes(types: string[]): string[] {
  const cuisineMap: { [key: string]: string } = {
    'restaurant': 'American',
    'bar': 'Bar',
    'cafe': 'Cafe',
    'bakery': 'Bakery',
    'meal_delivery': 'Delivery',
    'meal_takeaway': 'Takeout'
  }

  const cuisines: string[] = []
  types?.forEach(type => {
    if (cuisineMap[type] && type !== 'restaurant') {
      cuisines.push(cuisineMap[type])
    }
  })

  return cuisines.length > 0 ? cuisines : ['American']
}

function convertPriceLevel(priceLevel?: number): string {
  const priceLevelMap: { [key: number]: string } = {
    1: '$',
    2: '$$',
    3: '$$$',
    4: '$$$$'
  }
  return priceLevelMap[priceLevel || 2] || '$$'
}

function convertOpeningHours(openingHours: any): any {
  const daysMap: { [key: number]: string } = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday'
  }

  const hours: any = {}

  // Initialize all days as closed
  Object.values(daysMap).forEach(day => {
    hours[day] = { is_closed: true }
  })

  // Process periods
  openingHours.periods?.forEach((period: any) => {
    const dayName = daysMap[period.open.day]
    if (period.close) {
      hours[dayName] = {
        open: period.open.time.slice(0, 2) + ':' + period.open.time.slice(2),
        close: period.close.time.slice(0, 2) + ':' + period.close.time.slice(2),
        is_closed: false
      }
    } else {
      // 24 hours
      hours[dayName] = {
        open: '00:00',
        close: '23:59',
        is_closed: false
      }
    }
  })

  return hours
}

function extractFeatures(types: string[]): string[] {
  const featureMap: { [key: string]: string } = {
    'bar': 'bar',
    'cafe': 'cafe',
    'meal_delivery': 'delivery',
    'meal_takeaway': 'takeout',
    'restaurant': 'dine_in',
    'bakery': 'bakery',
    'night_club': 'nightlife'
  }

  const features: string[] = []
  types?.forEach(type => {
    if (featureMap[type]) {
      features.push(featureMap[type])
    }
  })

  return [...new Set(features)]
}