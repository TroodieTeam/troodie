# Restaurant Data Seeding & Management PRD

## Executive Summary

This PRD outlines the strategy and implementation plan for seeding initial restaurant data for Charlotte, NC, and creating a robust system for restaurant data management that combines pre-seeded data with Google Places API integration for comprehensive coverage.

## Goals & Objectives

### Primary Goals
1. **Seed 100 high-quality restaurants** in Charlotte, NC area as initial dataset
2. **Create seamless restaurant search** experience combining local and Google data
3. **Ensure data quality** and consistency across all restaurant entries
4. **Minimize API costs** by caching Google Places data locally
5. **Enable organic growth** of restaurant database through user contributions

### Success Metrics
- 100% coverage of top-rated restaurants in Charlotte
- <500ms search response time for cached restaurants
- <2s response time for Google API searches
- 95% user satisfaction with restaurant search results
- <$100/month Google Places API costs

## Restaurant Data Model

### Core Restaurant Schema
```typescript
interface Restaurant {
  // Internal identifiers
  id: string                    // UUID
  google_place_id?: string      // Google Places ID for reference
  
  // Basic information
  name: string
  address: string
  city: string
  state: string
  zip_code: string
  country: string
  location: {                   // PostGIS Point
    lat: number
    lng: number
  }
  
  // Contact information
  phone?: string
  website?: string
  email?: string
  
  // Restaurant details
  cuisine_types: string[]       // ["American", "Southern", "BBQ"]
  price_range: "$" | "$$" | "$$$" | "$$$$"
  
  // Operational information
  hours: {
    [key: string]: {           // monday, tuesday, etc.
      open: string             // "09:00"
      close: string            // "22:00"
      is_closed?: boolean
    }
  }
  
  // Media
  photos: {
    url: string
    source: "google" | "user" | "owner"
    attribution?: string
  }[]
  cover_photo_url?: string
  
  // Ratings & Reviews
  google_rating?: number        // From Google
  google_reviews_count?: number
  troodie_rating?: number       // Internal rating
  troodie_reviews_count?: number
  
  // Features & Amenities
  features: string[]            // ["outdoor_seating", "wifi", "parking"]
  dietary_options: string[]     // ["vegetarian", "vegan", "gluten_free"]
  
  // Metadata
  is_verified: boolean          // Verified by owner/admin
  is_claimed: boolean           // Claimed by owner
  owner_id?: string             // User ID of claimed owner
  data_source: "seed" | "google" | "user"
  
  // Timestamps
  created_at: Date
  updated_at: Date
  last_google_sync?: Date
}
```

### Additional Data Tables

```sql
-- Restaurant categories for better organization
CREATE TABLE restaurant_categories (
  id UUID PRIMARY KEY,
  name VARCHAR(100) UNIQUE,
  icon VARCHAR(50),
  description TEXT
);

-- Many-to-many relationship
CREATE TABLE restaurant_category_mappings (
  restaurant_id UUID REFERENCES restaurants(id),
  category_id UUID REFERENCES restaurant_categories(id),
  PRIMARY KEY (restaurant_id, category_id)
);

-- Popular times data (from Google)
CREATE TABLE restaurant_popular_times (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  day_of_week INTEGER, -- 0-6
  hour INTEGER,        -- 0-23
  popularity INTEGER,  -- 0-100
  UNIQUE(restaurant_id, day_of_week, hour)
);

-- Special hours (holidays, events)
CREATE TABLE restaurant_special_hours (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  date DATE,
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN DEFAULT FALSE,
  note TEXT
);
```

## Seeding Strategy for Charlotte, NC

### Restaurant Selection Criteria

1. **Diversity of Cuisines** (Target Distribution)
   - American/Southern: 20%
   - International (Mexican, Italian, Asian): 30%
   - Fast Casual: 15%
   - Fine Dining: 15%
   - Cafes/Brunch: 10%
   - Bars/Breweries: 10%

2. **Geographic Distribution**
   - Uptown: 25 restaurants
   - South End: 20 restaurants
   - NoDa: 15 restaurants
   - Plaza Midwood: 10 restaurants
   - Ballantyne: 10 restaurants
   - University Area: 10 restaurants
   - Other neighborhoods: 10 restaurants

3. **Price Range Distribution**
   - $: 20%
   - $$: 40%
   - $$$: 30%
   - $$$$: 10%

4. **Rating Criteria**
   - Only restaurants with 4.0+ Google rating
   - Minimum 50 Google reviews
   - Operational for at least 1 year

### Initial Restaurant List Categories

#### Uptown Charlotte (25)
- **Fine Dining**: The Capital Grille, Barcelona Wine Bar, Stoke
- **Business Lunch**: Aria Tuscan Grille, 5Church, Fahrenheit
- **Casual**: Sycamore Brewing, Queen City Q, Valhalla Pub
- **International**: Yama Izakaya, La Belle Helene, Indaco

#### South End (20)
- **Trendy**: O-Ku, Superica, Barcelona Wine Bar
- **Breweries**: Sycamore Brewing, Wooden Robot, Unknown Brewing
- **Casual Dining**: Hawkers Asian Street Food, Paco's Tacos

#### NoDa (15)
- **Local Favorites**: Haberdish, Reigning Doughnuts, NoDa Bodega
- **Breweries**: NoDa Brewing, Birdsong Brewing
- **International**: Sabor Latin Street Grill

#### Plaza Midwood (10)
- **Neighborhood Gems**: Soul Gastrolounge, Midwood Smokehouse
- **Brunch**: Zada Jane's, The People's Market

### Data Sources

1. **Primary Source**: Google Places API
   - Basic information
   - Hours of operation
   - Photos (up to 5 per restaurant)
   - Ratings and review counts
   - Popular times

2. **Secondary Sources**:
   - Yelp API (for additional photos and reviews context)
   - Restaurant websites (for menus and special features)
   - Social media (Instagram/Facebook for recent photos)

## Implementation Plan

### Phase 1: Database Setup

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create restaurants table with all fields
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_place_id VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip_code VARCHAR(10),
  country VARCHAR(2) DEFAULT 'US',
  location GEOGRAPHY(POINT) NOT NULL,
  phone VARCHAR(20),
  website TEXT,
  email VARCHAR(255),
  cuisine_types TEXT[],
  price_range VARCHAR(4) CHECK (price_range IN ('$', '$$', '$$$', '$$$$')),
  hours JSONB,
  photos JSONB,
  cover_photo_url TEXT,
  google_rating DECIMAL(2,1),
  google_reviews_count INTEGER,
  troodie_rating DECIMAL(2,1),
  troodie_reviews_count INTEGER DEFAULT 0,
  features TEXT[],
  dietary_options TEXT[],
  is_verified BOOLEAN DEFAULT FALSE,
  is_claimed BOOLEAN DEFAULT FALSE,
  owner_id UUID REFERENCES users(id),
  data_source VARCHAR(20) CHECK (data_source IN ('seed', 'google', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_google_sync TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_restaurants_location ON restaurants USING GIST(location);
CREATE INDEX idx_restaurants_city ON restaurants(city);
CREATE INDEX idx_restaurants_cuisine ON restaurants USING GIN(cuisine_types);
CREATE INDEX idx_restaurants_name_search ON restaurants USING GIN(to_tsvector('english', name));
```

### Phase 2: Seeding Script

```typescript
// scripts/seed-charlotte-restaurants.ts
import { createClient } from '@supabase/supabase-js'
import { Client } from '@googlemaps/google-maps-services-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const googleMaps = new Client({})

// List of restaurants to seed (curated list)
const CHARLOTTE_RESTAURANTS = [
  { name: "The Capital Grille", area: "Uptown", cuisine: ["American", "Steakhouse"] },
  { name: "O-Ku Charlotte", area: "South End", cuisine: ["Japanese", "Sushi"] },
  { name: "Haberdish", area: "NoDa", cuisine: ["Southern", "American"] },
  // ... complete list of 100 restaurants
]

async function seedRestaurant(restaurantInfo: any) {
  try {
    // 1. Search for restaurant using Google Places
    const searchResponse = await googleMaps.findPlaceFromText({
      params: {
        input: `${restaurantInfo.name} Charlotte NC`,
        inputtype: 'textquery',
        fields: ['place_id', 'name', 'formatted_address', 'geometry'],
        key: GOOGLE_API_KEY,
      }
    })

    if (!searchResponse.data.candidates?.length) {
      console.error(`Restaurant not found: ${restaurantInfo.name}`)
      return
    }

    const placeId = searchResponse.data.candidates[0].place_id

    // 2. Get detailed information
    const detailsResponse = await googleMaps.placeDetails({
      params: {
        place_id: placeId,
        fields: [
          'name', 'formatted_address', 'geometry', 'formatted_phone_number',
          'website', 'opening_hours', 'price_level', 'rating', 'user_ratings_total',
          'photos', 'types', 'address_components'
        ],
        key: GOOGLE_API_KEY,
      }
    })

    const place = detailsResponse.data.result

    // 3. Process photos
    const photos = await processPhotos(place.photos || [])

    // 4. Transform data for our schema
    const restaurantData = {
      google_place_id: placeId,
      name: place.name,
      address: place.formatted_address,
      city: 'Charlotte',
      state: 'NC',
      zip_code: extractZipCode(place.address_components),
      location: `POINT(${place.geometry.location.lng} ${place.geometry.location.lat})`,
      phone: place.formatted_phone_number,
      website: place.website,
      cuisine_types: restaurantInfo.cuisine,
      price_range: convertPriceLevel(place.price_level),
      hours: convertOpeningHours(place.opening_hours),
      photos: photos,
      cover_photo_url: photos[0]?.url,
      google_rating: place.rating,
      google_reviews_count: place.user_ratings_total,
      features: extractFeatures(place.types),
      data_source: 'seed',
      last_google_sync: new Date().toISOString()
    }

    // 5. Insert into Supabase
    const { error } = await supabase
      .from('restaurants')
      .insert(restaurantData)

    if (error) {
      console.error(`Error inserting ${restaurantInfo.name}:`, error)
    } else {
      console.log(`Successfully seeded: ${restaurantInfo.name}`)
    }

  } catch (error) {
    console.error(`Error processing ${restaurantInfo.name}:`, error)
  }
}

// Run seeding
async function seedAllRestaurants() {
  console.log('Starting Charlotte restaurant seeding...')
  
  for (const restaurant of CHARLOTTE_RESTAURANTS) {
    await seedRestaurant(restaurant)
    // Add delay to respect API rate limits
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  console.log('Seeding complete!')
}

seedAllRestaurants()
```

### Phase 3: Search Implementation

```typescript
// Edge Function: search-restaurants
import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from '@supabase/supabase-js'

serve(async (req) => {
  const { query, location, limit = 20 } = await req.json()
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  )

  // 1. Search in local database first
  let { data: localResults, error } = await supabase
    .from('restaurants')
    .select('*')
    .textSearch('name', query)
    .limit(limit)

  if (localResults && localResults.length >= 10) {
    // If we have enough local results, return them
    return new Response(JSON.stringify({ 
      results: localResults,
      source: 'local'
    }))
  }

  // 2. Search Google Places for additional results
  const googleResults = await searchGooglePlaces(query, location)
  
  // 3. Import new restaurants from Google
  const newRestaurants = []
  for (const place of googleResults) {
    if (!localResults?.find(r => r.google_place_id === place.place_id)) {
      const imported = await importGoogleRestaurant(place)
      if (imported) newRestaurants.push(imported)
    }
  }

  // 4. Combine and return results
  const combinedResults = [...(localResults || []), ...newRestaurants]
    .slice(0, limit)

  return new Response(JSON.stringify({ 
    results: combinedResults,
    source: 'combined'
  }))
})

async function searchGooglePlaces(query: string, location?: any) {
  const params = {
    query: query,
    key: Deno.env.get('GOOGLE_API_KEY'),
  }

  if (location) {
    params.location = `${location.lat},${location.lng}`
    params.radius = 50000 // 50km radius
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?${new URLSearchParams(params)}`
  )

  const data = await response.json()
  return data.results || []
}

async function importGoogleRestaurant(place: any) {
  // Get detailed information
  const detailsResponse = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?` +
    `place_id=${place.place_id}&` +
    `fields=name,formatted_address,geometry,formatted_phone_number,website,` +
    `opening_hours,price_level,rating,user_ratings_total,photos,types&` +
    `key=${Deno.env.get('GOOGLE_API_KEY')}`
  )

  const { result } = await detailsResponse.json()

  // Transform and insert into database
  const restaurantData = transformGooglePlace(result)
  
  const { data, error } = await supabase
    .from('restaurants')
    .insert(restaurantData)
    .select()
    .single()

  return error ? null : data
}
```

### Phase 4: Restaurant Management Features

#### 1. Restaurant Claiming System

```typescript
// Allow restaurant owners to claim their listing
interface RestaurantClaim {
  id: string
  restaurant_id: string
  user_id: string
  verification_method: 'phone' | 'email' | 'document'
  verification_data: any
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by?: string
  reviewed_at?: Date
  created_at: Date
}
```

#### 2. Data Quality Management

```sql
-- Track data quality and updates
CREATE TABLE restaurant_data_quality (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  completeness_score INTEGER, -- 0-100
  accuracy_score INTEGER,     -- 0-100
  missing_fields TEXT[],
  last_verified DATE,
  verification_source VARCHAR(50)
);

-- User-submitted corrections
CREATE TABLE restaurant_corrections (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  user_id UUID REFERENCES users(id),
  field_name VARCHAR(50),
  current_value TEXT,
  suggested_value TEXT,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. Automated Data Refresh

```typescript
// Scheduled function to refresh restaurant data
async function refreshRestaurantData() {
  // Get restaurants that haven't been synced in 30 days
  const { data: staleRestaurants } = await supabase
    .from('restaurants')
    .select('id, google_place_id')
    .or('last_google_sync.is.null,last_google_sync.lt.now() - interval \'30 days\'')
    .not('google_place_id', 'is', null)
    .limit(50)

  for (const restaurant of staleRestaurants) {
    await syncWithGoogle(restaurant.id, restaurant.google_place_id)
  }
}
```

## Search Experience Design

### Search Flow

1. **User enters search query**
   - Text search: "Italian restaurants"
   - Location-based: "Restaurants near me"
   - Filter-based: "$$$ restaurants in South End"

2. **System searches local database**
   - Full-text search on name
   - Cuisine type matching
   - Location radius search
   - Apply filters (price, rating, features)

3. **If insufficient results (<5)**
   - Query Google Places API
   - Import matching restaurants
   - Combine with local results

4. **Return ranked results**
   - Prioritize verified/claimed restaurants
   - Sort by relevance and ratings
   - Include social proof (friend visits)

### Search UI Components

```typescript
interface SearchFilters {
  cuisine_types?: string[]
  price_range?: string[]
  min_rating?: number
  max_distance?: number
  features?: string[]
  dietary_options?: string[]
  open_now?: boolean
}

interface SearchResult {
  restaurant: Restaurant
  distance?: number
  relevance_score: number
  social_proof?: {
    friends_who_saved: number
    recent_saves: number
  }
}
```

## Cost Management

### Google Places API Pricing
- **Places Search**: $32 per 1,000 requests
- **Place Details**: $17 per 1,000 requests
- **Place Photos**: $7 per 1,000 requests

### Cost Optimization Strategies

1. **Aggressive Caching**
   - Cache all restaurant data locally
   - Only refresh data monthly
   - Store photos in Supabase Storage

2. **Smart Querying**
   - Always check local database first
   - Batch API requests when possible
   - Use fields parameter to limit data

3. **Usage Monitoring**
   ```sql
   CREATE TABLE api_usage_tracking (
     id UUID PRIMARY KEY,
     api_name VARCHAR(50),
     endpoint VARCHAR(100),
     user_id UUID,
     cost_estimate DECIMAL(10,4),
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

### Estimated Monthly Costs
- Initial seeding (100 restaurants): ~$10
- Ongoing searches (1000/day): ~$50
- Photo requests: ~$20
- **Total**: <$100/month

## Success Metrics & KPIs

### Data Quality Metrics
- **Coverage**: % of Charlotte restaurants in database
- **Completeness**: Average completeness score per restaurant
- **Accuracy**: % of verified/claimed restaurants
- **Freshness**: % of restaurants updated in last 30 days

### User Experience Metrics
- **Search Success Rate**: % of searches with relevant results
- **Search Speed**: Average response time
- **Cache Hit Rate**: % of searches served from local data
- **User Satisfaction**: Rating of search results quality

### Business Metrics
- **API Cost per User**: Monthly Google API cost / MAU
- **Data Growth**: New restaurants added per month
- **User Contributions**: Restaurant corrections/additions by users

## Implementation Timeline

### Week 1-2: Infrastructure Setup
- Set up database schema
- Configure Google Places API
- Create data import pipeline

### Week 3-4: Initial Seeding
- Curate list of 100 Charlotte restaurants
- Run seeding script
- Verify data quality

### Week 5-6: Search Implementation
- Build search Edge Function
- Implement caching strategy
- Create search UI components

### Week 7-8: Testing & Optimization
- Load testing with various queries
- Optimize search performance
- Monitor API usage

### Week 9-10: Launch & Monitor
- Deploy to production
- Monitor usage and costs
- Gather user feedback

## Future Enhancements

### Phase 2 Features
1. **Menu Integration**
   - Partner with menu providers
   - User-uploaded menu photos
   - OCR for menu text extraction

2. **Real-time Availability**
   - Wait time estimates
   - Reservation integration
   - Live capacity updates

3. **Enhanced Media**
   - User photo uploads
   - 360° restaurant views
   - Video reviews

4. **AI-Powered Features**
   - Cuisine classification
   - Dish recognition
   - Personalized recommendations

### Geographic Expansion
1. Start with major NC cities (Raleigh, Greensboro)
2. Expand to Southeast region
3. National rollout plan

## Risks & Mitigation

### Technical Risks
- **API Rate Limits**: Implement request queuing and caching
- **Data Accuracy**: Regular validation and user reporting
- **Storage Costs**: Optimize image storage and CDN usage

### Business Risks
- **Google API Price Changes**: Build fallback data sources
- **Restaurant Data Rights**: Clear terms of service
- **Competition**: Focus on unique social features

## Appendix

### A. Charlotte Restaurant Categories

#### Must-Have Cuisines
- Southern/Soul Food
- BBQ
- Mexican
- Italian
- Asian (Chinese, Japanese, Thai, Vietnamese)
- American/Burgers
- Pizza
- Mediterranean
- Indian
- Breweries/Gastropubs

#### Neighborhood Distribution Map
[Include visual map of Charlotte neighborhoods with restaurant density]

### B. Google Places API Fields Reference

#### Essential Fields
- place_id, name, formatted_address
- geometry (location)
- formatted_phone_number
- website
- opening_hours
- price_level
- rating, user_ratings_total

#### Optional Fields
- photos (limit to 5)
- reviews (sample only)
- types (for categorization)
- business_status

### C. Sample API Responses

[Include example JSON responses for reference]