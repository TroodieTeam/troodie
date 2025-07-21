# Task 2.1: Charlotte Restaurant Data Seeding

**Epic:** Restaurant Data Management System  
**Priority:** High  
**Estimate:** 4 days  
**Status:** 🔴 Not Started

## Overview
Seed the Supabase database with 100 high-quality restaurants in Charlotte, NC to provide initial content for users and enable the restaurant search and discovery features.

## Business Value
- Provides immediate value to Charlotte users with local restaurant data
- Enables testing and validation of restaurant features
- Creates foundation for search and recommendation algorithms
- Demonstrates app value from day one

## Dependencies
- Task 1.1: Supabase Backend Setup (database schema must exist)

## Blocks
- Task 2.2: Restaurant Search & Discovery
- Task 3.1: Restaurant Save Functionality

---

## Acceptance Criteria

```gherkin
Feature: Charlotte Restaurant Database Seeding
  As a user in Charlotte
  I want to find local restaurants in the app
  So that I can save and share my experiences

Background:
  Given the Supabase database is configured
  And the restaurants table exists
  And Google Places API is available
  And I have the curated Charlotte restaurant list

Scenario: Initial Restaurant Data Import
  Given I have the Charlotte restaurant list from the PRD
  When I run the seeding script
  Then 100 restaurants should be imported with:
    | Field | Requirement |
    | Name | Required |
    | Address | Required |
    | Cuisine Types | At least 1 |
    | Price Range | $ to $$$$ |
    | Photos | At least 1 |
    | Google Place ID | When available |
    | Location coordinates | Required |
    | Hours of operation | When available |
    | Phone number | When available |
    | Website | When available |

Scenario: Geographic Distribution Validation
  Given the restaurants have been seeded
  When I query restaurants by neighborhood
  Then the distribution should match:
    | Neighborhood | Restaurant Count |
    | Uptown | 25 |
    | South End | 20 |
    | NoDa | 15 |
    | Plaza Midwood | 10 |
    | Ballantyne | 10 |
    | University Area | 10 |
    | Other areas | 10 |

Scenario: Cuisine Diversity Validation
  Given the restaurants have been seeded
  When I analyze cuisine distribution
  Then it should match target distribution:
    | Cuisine Category | Target % | Actual Count |
    | American/Southern | 20% | 20 restaurants |
    | International | 30% | 30 restaurants |
    | Fast Casual | 15% | 15 restaurants |
    | Fine Dining | 15% | 15 restaurants |
    | Cafes/Brunch | 10% | 10 restaurants |
    | Bars/Breweries | 10% | 10 restaurants |

Scenario: Price Range Distribution
  Given the restaurants have been seeded
  When I analyze price range distribution
  Then it should match target distribution:
    | Price Range | Target % | Actual Count |
    | $ | 20% | 20 restaurants |
    | $$ | 40% | 40 restaurants |
    | $$$ | 30% | 30 restaurants |
    | $$$$ | 10% | 10 restaurants |

Scenario: Data Quality Verification
  Given restaurants have been imported
  When I validate the data quality
  Then all restaurants should have:
    | Quality Check | Pass Rate |
    | Valid coordinates | 100% |
    | Readable addresses | 100% |
    | Valid cuisine types | 100% |
    | Photos available | 95%+ |
    | Proper price range format | 100% |
    | Non-empty names | 100% |

Scenario: Google Places API Integration
  Given a restaurant name and location
  When I query Google Places API
  Then I should receive:
    | Data Field | Requirement |
    | Place ID | Unique identifier |
    | Formatted address | Complete address |
    | Coordinates | Lat/lng |
    | Rating | If available |
    | Photos | Up to 5 photos |
    | Hours | Current operating hours |
    | Phone | Formatted phone number |
    | Website | If available |

Scenario: Photo Processing and Storage
  Given a restaurant has photos from Google Places
  When I process the photos
  Then I should:
    | Step | Action |
    | Download | Fetch photos from Google |
    | Optimize | Compress and resize |
    | Upload | Store in Supabase Storage |
    | Reference | Save URLs in database |
    | Verify | Ensure all photos accessible |

Scenario: Error Handling During Import
  Given some restaurants may not be found in Google Places
  When I encounter missing data
  Then I should:
    | Error Type | Handling |
    | Restaurant not found | Log warning, continue |
    | API rate limit hit | Wait and retry |
    | Invalid photo URL | Skip photo, continue |
    | Missing coordinates | Geocode address |
    | Network timeout | Retry with backoff |

Scenario: Database Performance After Seeding
  Given 100 restaurants are in the database
  When I run performance queries
  Then response times should be:
    | Query Type | Max Response Time |
    | Select all restaurants | 200ms |
    | Search by name | 100ms |
    | Filter by cuisine | 150ms |
    | Location-based search | 200ms |
    | Single restaurant detail | 50ms |

Scenario: Duplicate Prevention
  Given I run the seeding script multiple times
  When restaurants already exist in the database
  Then the script should:
    | Action | Behavior |
    | Check existing | Query by name and address |
    | Skip duplicates | Don't insert existing restaurants |
    | Update data | Refresh stale information |
    | Log skipped | Report duplicate count |

Scenario: Data Validation Rules
  Given restaurant data is being processed
  When I validate each restaurant
  Then validation rules should enforce:
    | Field | Validation Rule |
    | Name | 2-100 characters, no special chars except &,',-  |
    | Address | Must contain street and city |
    | Cuisine Types | Must be from approved list |
    | Price Range | Must be $, $$, $$$, or $$$$ |
    | Phone | Must be valid US phone format |
    | Coordinates | Must be within Charlotte metro area |
    | Website | Must be valid URL format |

Scenario: Seed Data Verification
  Given the seeding process is complete
  When I verify the seed data
  Then I should be able to:
    | Verification | Expected Result |
    | Count total restaurants | Exactly 100 |
    | Query by neighborhood | Results in each area |
    | Search by cuisine | Results for each type |
    | View restaurant photos | All images load |
    | Access restaurant details | Complete information |
```

---

## Technical Implementation

### Seeding Script
```typescript
// scripts/seed-charlotte-restaurants.ts
import { createClient } from '@supabase/supabase-js'
import { Client } from '@googlemaps/google-maps-services-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const googleMaps = new Client({})

interface RestaurantSeed {
  name: string
  area: string
  cuisine: string[]
  expectedPriceRange?: string
}

// Curated list of 100 Charlotte restaurants
const CHARLOTTE_RESTAURANTS: RestaurantSeed[] = [
  // Uptown (25)
  { name: "The Capital Grille", area: "Uptown", cuisine: ["American", "Steakhouse"] },
  { name: "Barcelona Wine Bar", area: "Uptown", cuisine: ["Spanish", "Tapas"] },
  { name: "Stoke Charlotte", area: "Uptown", cuisine: ["American", "Fine Dining"] },
  { name: "5Church Charlotte", area: "Uptown", cuisine: ["American", "Contemporary"] },
  { name: "Fahrenheit Charlotte", area: "Uptown", cuisine: ["American", "Rooftop"] },
  
  // South End (20)
  { name: "O-Ku Charlotte", area: "South End", cuisine: ["Japanese", "Sushi"] },
  { name: "Superica", area: "South End", cuisine: ["Mexican", "Tex-Mex"] },
  { name: "Hawkers Asian Street Food", area: "South End", cuisine: ["Asian", "Street Food"] },
  { name: "Sycamore Brewing", area: "South End", cuisine: ["American", "Brewery"] },
  
  // NoDa (15)
  { name: "Haberdish", area: "NoDa", cuisine: ["Southern", "American"] },
  { name: "Reigning Doughnuts", area: "NoDa", cuisine: ["Bakery", "Coffee"] },
  { name: "NoDa Brewing Company", area: "NoDa", cuisine: ["American", "Brewery"] },
  
  // Plaza Midwood (10)
  { name: "Soul Gastrolounge", area: "Plaza Midwood", cuisine: ["American", "Contemporary"] },
  { name: "Midwood Smokehouse", area: "Plaza Midwood", cuisine: ["BBQ", "Southern"] },
  
  // Continue with remaining 50 restaurants...
]

async function seedRestaurant(restaurantInfo: RestaurantSeed) {
  try {
    console.log(`Processing: ${restaurantInfo.name}`)
    
    // 1. Check if restaurant already exists
    const { data: existing } = await supabase
      .from('restaurants')
      .select('id')
      .eq('name', restaurantInfo.name)
      .single()
    
    if (existing) {
      console.log(`Skipping existing restaurant: ${restaurantInfo.name}`)
      return
    }

    // 2. Search Google Places
    const searchResponse = await googleMaps.findPlaceFromText({
      params: {
        input: `${restaurantInfo.name} Charlotte NC`,
        inputtype: 'textquery',
        fields: ['place_id', 'name', 'formatted_address', 'geometry'],
        key: process.env.GOOGLE_API_KEY!,
      }
    })

    if (!searchResponse.data.candidates?.length) {
      console.error(`Restaurant not found in Google Places: ${restaurantInfo.name}`)
      return
    }

    const placeId = searchResponse.data.candidates[0].place_id!

    // 3. Get detailed information
    const detailsResponse = await googleMaps.placeDetails({
      params: {
        place_id: placeId,
        fields: [
          'name', 'formatted_address', 'geometry', 'formatted_phone_number',
          'website', 'opening_hours', 'price_level', 'rating', 'user_ratings_total',
          'photos', 'types', 'address_components'
        ],
        key: process.env.GOOGLE_API_KEY!,
      }
    })

    const place = detailsResponse.data.result

    // 4. Process photos
    const photos = await processRestaurantPhotos(place.photos || [])

    // 5. Extract address components
    const addressComponents = extractAddressComponents(place.address_components || [])

    // 6. Transform data for our schema
    const restaurantData = {
      google_place_id: placeId,
      name: place.name,
      address: place.formatted_address,
      city: addressComponents.city || 'Charlotte',
      state: addressComponents.state || 'NC',
      zip_code: addressComponents.zipCode,
      location: `POINT(${place.geometry?.location?.lng} ${place.geometry?.location?.lat})`,
      phone: place.formatted_phone_number,
      website: place.website,
      cuisine_types: restaurantInfo.cuisine,
      price_range: convertGooglePriceLevel(place.price_level),
      hours: convertOpeningHours(place.opening_hours),
      photos: photos,
      cover_photo_url: photos[0]?.url,
      google_rating: place.rating,
      google_reviews_count: place.user_ratings_total,
      features: extractFeatures(place.types || []),
      data_source: 'seed',
      last_google_sync: new Date().toISOString()
    }

    // 7. Insert into database
    const { error } = await supabase
      .from('restaurants')
      .insert(restaurantData)

    if (error) {
      console.error(`Error inserting ${restaurantInfo.name}:`, error)
    } else {
      console.log(`✅ Successfully seeded: ${restaurantInfo.name}`)
    }

    // 8. Rate limiting
    await sleep(200) // Respect Google API rate limits

  } catch (error) {
    console.error(`Error processing ${restaurantInfo.name}:`, error)
  }
}

async function processRestaurantPhotos(googlePhotos: any[]): Promise<any[]> {
  const photos = []
  
  for (const photo of googlePhotos.slice(0, 5)) { // Limit to 5 photos
    try {
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${process.env.GOOGLE_API_KEY}`
      
      // Upload to Supabase Storage
      const response = await fetch(photoUrl)
      const blob = await response.blob()
      
      const fileName = `restaurants/${Date.now()}-${Math.random()}.jpg`
      
      const { data, error } = await supabase.storage
        .from('restaurant-photos')
        .upload(fileName, blob)
      
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage
          .from('restaurant-photos')
          .getPublicUrl(fileName)
        
        photos.push({
          url: publicUrl,
          source: 'google',
          attribution: photo.html_attributions?.[0]
        })
      }
    } catch (error) {
      console.error('Error processing photo:', error)
    }
  }
  
  return photos
}

function convertGooglePriceLevel(priceLevel?: number): string {
  switch (priceLevel) {
    case 1: return '$'
    case 2: return '$$'
    case 3: return '$$$'
    case 4: return '$$$$'
    default: return '$$'
  }
}

function convertOpeningHours(hours?: any): any {
  if (!hours?.periods) return {}
  
  const hoursMap: any = {}
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  
  hours.periods.forEach((period: any) => {
    const dayName = dayNames[period.open?.day || 0]
    hoursMap[dayName] = {
      open: period.open?.time || '00:00',
      close: period.close?.time || '23:59',
      is_closed: !period.open
    }
  })
  
  return hoursMap
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Main seeding function
async function seedAllRestaurants() {
  console.log('🚀 Starting Charlotte restaurant seeding...')
  
  let successCount = 0
  let errorCount = 0
  
  for (const restaurant of CHARLOTTE_RESTAURANTS) {
    try {
      await seedRestaurant(restaurant)
      successCount++
    } catch (error) {
      errorCount++
      console.error(`Failed to seed ${restaurant.name}:`, error)
    }
  }
  
  console.log(`✅ Seeding complete! Success: ${successCount}, Errors: ${errorCount}`)
  
  // Verify final count
  const { count } = await supabase
    .from('restaurants')
    .select('*', { count: 'exact', head: true })
  
  console.log(`📊 Total restaurants in database: ${count}`)
}

// Run the seeding
if (require.main === module) {
  seedAllRestaurants()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seeding failed:', error)
      process.exit(1)
    })
}
```

### Package.json Script
```json
{
  "scripts": {
    "seed:restaurants": "tsx scripts/seed-charlotte-restaurants.ts"
  }
}
```

---

## Definition of Done

- [ ] Seeding script is implemented and tested
- [ ] All 100 Charlotte restaurants are successfully imported
- [ ] Geographic distribution matches target (25/20/15/10/10/10/10)
- [ ] Cuisine diversity matches target distribution
- [ ] Price range distribution matches target (20%/40%/30%/10%)
- [ ] Data quality validation passes (100% valid coordinates, addresses, etc.)
- [ ] Photos are processed and stored in Supabase Storage
- [ ] Google Places API integration works correctly
- [ ] Error handling prevents script failures
- [ ] Duplicate prevention works on re-runs
- [ ] Database performance meets requirements
- [ ] All Gherkin scenarios pass
- [ ] Documentation is updated with seeding process

---

## Resources

- [Restaurant Data PRD](../prd/restaurant-data/prd.md)
- [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Task 1.1: Supabase Backend Setup](./task-1-1-supabase-setup.md)

---

## Notes

- Estimated 4 days includes API integration, error handling, and validation
- Google Places API costs: ~$10 for initial seeding (100 restaurants)
- Consider running script in chunks to respect API rate limits
- Store Google attribution data for photo compliance
- Create backup/export mechanism for restaurant data
- Plan for periodic data refresh (monthly/quarterly) 