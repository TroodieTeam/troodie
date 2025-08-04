import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const googleApiKey = process.env.GOOGLE_PLACES_API_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Read restaurant data
const restaurantData = JSON.parse(
  readFileSync(join(__dirname, 'charlotte-restaurants.json'), 'utf-8')
)

interface GooglePlaceResult {
  place_id: string
  name: string
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  formatted_phone_number?: string
  website?: string
  opening_hours?: {
    weekday_text: string[]
    periods: Array<{
      open: { day: number; time: string }
      close?: { day: number; time: string }
    }>
  }
  price_level?: number
  rating?: number
  user_ratings_total?: number
  photos?: Array<{
    photo_reference: string
    height: number
    width: number
  }>
  types?: string[]
  address_components?: Array<{
    long_name: string
    short_name: string
    types: string[]
  }>
}

async function searchGooglePlace(name: string, area: string): Promise<string | null> {
  const query = `${name} ${area} Charlotte NC`
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
    query
  )}&inputtype=textquery&fields=place_id,name,formatted_address,geometry&key=${googleApiKey}`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (data.candidates && data.candidates.length > 0) {
      return data.candidates[0].place_id
    }
    return null
  } catch (error) {
    console.error(`Error searching for ${name}:`, error)
    return null
  }
}

async function getPlaceDetails(placeId: string): Promise<GooglePlaceResult | null> {
  const fields = [
    'place_id',
    'name',
    'formatted_address',
    'geometry',
    'formatted_phone_number',
    'website',
    'opening_hours',
    'price_level',
    'rating',
    'user_ratings_total',
    'photos',
    'types',
    'address_components'
  ].join(',')

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${googleApiKey}`

  try {
    const response = await fetch(url)
    const data = await response.json()
    return data.result
  } catch (error) {
    console.error(`Error getting details for ${placeId}:`, error)
    return null
  }
}

async function getPhotoUrls(photos: any[]): Promise<string[]> {
  if (!photos || photos.length === 0) return []

  // Get up to 5 photos
  const photoUrls = photos.slice(0, 5).map(photo => {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1000&photoreference=${photo.photo_reference}&key=${googleApiKey}`
  })

  return photoUrls
}

function extractZipCode(addressComponents: any[]): string | null {
  const zipComponent = addressComponents?.find(component =>
    component.types.includes('postal_code')
  )
  return zipComponent?.long_name || null
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
  if (!openingHours || !openingHours.periods) return null

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
  openingHours.periods.forEach((period: any) => {
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

  // Add some default features based on restaurant type
  if (types?.includes('restaurant')) {
    features.push('reservations')
  }

  return [...new Set(features)]
}

async function seedRestaurant(restaurant: any, index: number) {

  try {
    // Check if restaurant already exists
    const { data: existing } = await supabase
      .from('restaurants')
      .select('id')
      .eq('name', restaurant.name)
      .eq('city', 'Charlotte')
      .single()

    if (existing) {
      return
    }

    // Search for place on Google
    const placeId = await searchGooglePlace(restaurant.name, restaurant.area)
    if (!placeId) {
      return
    }

    // Get detailed information
    const details = await getPlaceDetails(placeId)
    if (!details) {
      return
    }

    // Get photo URLs
    const photoUrls = await getPhotoUrls(details.photos || [])

    // Prepare data for insertion
    const restaurantData = {
      google_place_id: placeId,
      name: details.name,
      address: details.formatted_address,
      city: 'Charlotte',
      state: 'NC',
      zip_code: extractZipCode(details.address_components || []),
      country: 'US',
      location: `POINT(${details.geometry.location.lng} ${details.geometry.location.lat})`,
      phone: details.formatted_phone_number,
      website: details.website,
      cuisine_types: restaurant.cuisine,
      price_range: convertPriceLevel(details.price_level),
      hours: convertOpeningHours(details.opening_hours),
      photos: photoUrls.map(url => ({
        url,
        source: 'google',
        attribution: 'Google Places'
      })),
      cover_photo_url: photoUrls[0],
      google_rating: details.rating,
      google_reviews_count: details.user_ratings_total,
      features: extractFeatures(details.types || []),
      dietary_options: [], // Will be populated later based on reviews/menus
      is_verified: false,
      is_claimed: false,
      data_source: 'seed',
      last_google_sync: new Date().toISOString()
    }

    // Insert into database
    const { error } = await supabase
      .from('restaurants')
      .insert(restaurantData)

    if (error) {
      console.error(`  → Error inserting:`, error.message)
    } else {
    }

  } catch (error) {
    console.error(`  → Error processing ${restaurant.name}:`, error)
  }

  // Rate limiting - wait 200ms between requests
  await new Promise(resolve => setTimeout(resolve, 200))
}

async function seedAllRestaurants() {

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < restaurantData.restaurants.length; i++) {
    try {
      await seedRestaurant(restaurantData.restaurants[i], i)
      successCount++
    } catch (error) {
      errorCount++
    }
  }

}

// Add popular categories
async function seedCategories() {
  const categories = [
    { name: 'Date Night', icon: 'heart', description: 'Romantic restaurants perfect for dates' },
    { name: 'Business Lunch', icon: 'briefcase', description: 'Professional atmosphere for meetings' },
    { name: 'Family Friendly', icon: 'users', description: 'Great for kids and families' },
    { name: 'Late Night', icon: 'moon', description: 'Open late for night owls' },
    { name: 'Brunch', icon: 'coffee', description: 'Weekend brunch spots' },
    { name: 'Fine Dining', icon: 'star', description: 'Upscale dining experiences' },
    { name: 'Casual', icon: 'smile', description: 'Relaxed, everyday dining' },
    { name: 'Outdoor Seating', icon: 'sun', description: 'Al fresco dining options' },
    { name: 'Brewery', icon: 'beer', description: 'Craft beer and brewpubs' },
    { name: 'Vegetarian Friendly', icon: 'leaf', description: 'Great vegetarian options' }
  ]

  for (const category of categories) {
    const { error } = await supabase
      .from('restaurant_categories')
      .insert(category)
      .single()

    if (!error) {
    }
  }
}

// Run the seeding process
async function main() {
  // First, seed categories
  await seedCategories()

  // Then seed restaurants
  await seedAllRestaurants()
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error)
}

export { seedRestaurant, seedAllRestaurants }