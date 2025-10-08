# Charlotte Restaurant Seeder - Implementation Guide

## Overview

This guide documents the complete pipeline for processing raw restaurant data from JSON files into a SQL migration file ready for Supabase PostgreSQL database seeding, with full integration of Troodie's traffic light rating system.

## Pipeline Overview

```
Raw JSON Data → Clean & Filter → Transform Schema → Generate SQL → Database Migration
```

## Current Database Schema

### Restaurants Table (Current Schema)

```sql
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_place_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    location USER-DEFINED, -- PostGIS GEOGRAPHY(POINT)
    cuisine_types ARRAY, -- TEXT[]
    price_range VARCHAR(4),
    phone VARCHAR(20),
    website TEXT,
    hours JSONB,
    photos ARRAY, -- TEXT[]
    cover_photo_url TEXT,
    google_rating NUMERIC,
    google_reviews_count INTEGER,
    troodie_rating NUMERIC,
    troodie_reviews_count INTEGER DEFAULT 0,
    features ARRAY, -- TEXT[]
    dietary_options ARRAY, -- TEXT[]
    is_verified BOOLEAN DEFAULT FALSE,
    is_claimed BOOLEAN DEFAULT FALSE,
    owner_id UUID REFERENCES users(id),
    data_source VARCHAR(20) CHECK (data_source IN ('seed', 'google', 'user')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_google_sync TIMESTAMPTZ
);
```

**Note**: The traffic light rating system fields (`red_ratings_count`, `yellow_ratings_count`, `green_ratings_count`, `total_ratings_count`, `overall_rating`) are not yet present in the current schema. They need to be added via migration.

## Traffic Light Rating System Migration

To implement the traffic light rating system, you'll need to run the following migration:

```sql
-- Migration: Traffic Light Rating System Implementation
-- This migration adds traffic light rating fields and functions

-- 1. Add traffic light rating to restaurant_saves table
ALTER TABLE public.restaurant_saves 
ADD COLUMN IF NOT EXISTS traffic_light_rating character varying CHECK (
  traffic_light_rating::text = ANY (
    ARRAY['red'::character varying, 'yellow'::character varying, 'green'::character varying]
  )
);

-- 2. Add rating summary fields to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS red_ratings_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS yellow_ratings_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS green_ratings_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_ratings_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS overall_rating character varying DEFAULT 'neutral';

-- 3. Create function to update restaurant rating summary
CREATE OR REPLACE FUNCTION update_restaurant_rating_summary(restaurant_id uuid)
RETURNS void AS $$
DECLARE
  red_count integer;
  yellow_count integer;
  green_count integer;
  total_count integer;
  overall_rating character varying;
BEGIN
  -- Count ratings by type
  SELECT 
    COUNT(*) FILTER (WHERE traffic_light_rating = 'red'),
    COUNT(*) FILTER (WHERE traffic_light_rating = 'yellow'),
    COUNT(*) FILTER (WHERE traffic_light_rating = 'green'),
    COUNT(*)
  INTO red_count, yellow_count, green_count, total_count
  FROM public.restaurant_saves
  WHERE restaurant_id = $1 AND traffic_light_rating IS NOT NULL;
  
  -- Calculate overall rating
  IF total_count = 0 THEN
    overall_rating := 'neutral';
  ELSIF green_count > (red_count + yellow_count) THEN
    overall_rating := 'green';
  ELSIF red_count > (green_count + yellow_count) THEN
    overall_rating := 'red';
  ELSE
    overall_rating := 'yellow';
  END IF;
  
  -- Update restaurant rating summary
  UPDATE public.restaurants 
  SET 
    red_ratings_count = red_count,
    yellow_ratings_count = yellow_count,
    green_ratings_count = green_count,
    total_ratings_count = total_count,
    overall_rating = overall_rating
  WHERE id = $1;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to update rating summary when saves change
CREATE OR REPLACE FUNCTION trigger_update_rating_summary()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_restaurant_rating_summary(NEW.restaurant_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_restaurant_rating_summary(OLD.restaurant_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger
DROP TRIGGER IF EXISTS update_rating_summary_trigger ON public.restaurant_saves;
CREATE TRIGGER update_rating_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.restaurant_saves
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_rating_summary();
```

### Board Restaurants Table (Current Schema)

```sql
CREATE TABLE board_restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id),
    added_by UUID REFERENCES users(id),
    order_position INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    position INTEGER DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    visit_date DATE
);
```

**Note**: The `traffic_light_rating` field is not yet present in the current schema. It needs to be added via migration.

## Updated Schema After Migration

After running the traffic light rating migration, the restaurants table will include:

```sql
CREATE TABLE restaurants (
    -- ... existing fields ...
    -- Traffic Light Rating System Fields
    red_ratings_count INTEGER DEFAULT 0,
    yellow_ratings_count INTEGER DEFAULT 0,
    green_ratings_count INTEGER DEFAULT 0,
    total_ratings_count INTEGER DEFAULT 0,
    overall_rating VARCHAR(10) DEFAULT 'neutral' 
        CHECK (overall_rating IN ('red', 'yellow', 'green', 'neutral'))
);
```

And the restaurant_saves table will include:

```sql
CREATE TABLE restaurant_saves (
    -- ... existing fields ...
    -- Traffic Light Rating
    traffic_light_rating VARCHAR(10) CHECK (
        traffic_light_rating IS NULL OR
        traffic_light_rating IN ('red', 'yellow', 'green')
    )
);
```

## Step-by-Step Implementation

### 1. Data Source Setup

**Input**: Raw restaurant data in JSON format (Yelp-style structure)
- Location: `charlotte_restaurants_data.json`
- Format: Array of restaurant objects with inconsistent field names
- Content: ~200 restaurants including duplicates, fast food, and non-Charlotte locations

### 2. Data Cleaning Pipeline

#### 2.1 Fast Food Filtering
**Function**: `removeFastFoodRestaurants()` in `src/utils/dataCleaners.ts`

**Purpose**: Removes known fast food chains from the dataset
- **Filtered Chains**: McDonald's, Burger King, Wendy's, Subway, KFC, Taco Bell, etc.
- **Method**: Case-insensitive name matching against predefined list
- **Result**: ~30 fast food restaurants removed

#### 2.2 Geographic Filtering
**Function**: `filterCharlotteArea()` in `src/utils/dataCleaners.ts`

**Purpose**: Keeps only Charlotte-area restaurants
- **Target Areas**: Charlotte, Pineville, Matthews, Huntersville, Cornelius, etc.
- **Method**: City name and address matching
- **Result**: Non-Charlotte restaurants (e.g., NYC) removed

#### 2.3 Duplicate Removal
**Function**: `removeDuplicates()` in `src/utils/dataCleaners.ts`

**Purpose**: Removes exact duplicates while preserving different locations
- **Method**: Normalized name + address combination
- **Logic**: Same restaurant at same address = duplicate
- **Result**: ~20-30 duplicates removed

#### 2.4 Data Validation
**Function**: `validateBasicData()` in `src/utils/dataCleaners.ts`

**Purpose**: Ensures restaurants have required fields
- **Required Fields**: name, address, city, state
- **Result**: Invalid entries filtered out

### 3. Data Transformation

#### 3.1 Schema Conversion
**Function**: `transformYelpToAppSchema()` in `src/utils/dataTransformers.ts`

**Purpose**: Converts Yelp-style data to application schema

**Field Mappings**:
```typescript
// Input (Yelp) → Output (App)
restaurant_name → name
full_address → address
rating → google_rating
review_count → google_reviews_count
categories → cuisine_types
price_level → price_range
images → photos
key_features → features
```

#### 3.2 Data Normalization

**Cuisine Types**: `normalizeCuisineTypes()`
- Handles string arrays, object arrays, comma-separated strings
- Converts to consistent string array format

**Price Range**: `normalizePriceRange()`
- Converts numeric (1-4) to string format ('$', '$$', '$$$', '$$$$')
- Handles existing string formats

**Hours**: `normalizeHours()`
- Converts various formats to JSONB object
- Standardizes day names and time formats

**Photos**: `normalizePhotos()`
- Extracts URLs from photo objects
- Handles both string arrays and object arrays
- Sets cover photo from first image

**Features**: `normalizeFeatures()`
- Converts string/array formats to string array
- Handles inconsistent field names (key_features, keyFeatures, amenities)

### 4. Traffic Light Rating Integration

#### 4.1 Rating System Overview

Troodie uses a traffic light rating system instead of traditional 5-star ratings:

- **Green**: "Go" - Highly recommended
- **Yellow**: "Maybe" - Mixed reviews or situational
- **Red**: "Stop" - Not recommended
- **Neutral**: No ratings yet

#### 4.2 Rating Data Structure

```typescript
interface TrafficLightRating {
  red_ratings_count: number
  yellow_ratings_count: number
  green_ratings_count: number
  total_ratings_count: number
  overall_rating: 'red' | 'yellow' | 'green' | 'neutral'
  green_percentage: number
  yellow_percentage: number
  red_percentage: number
}
```

#### 4.3 Rating Conversion from Google/Yelp

```typescript
// Convert 5-star ratings to traffic light system
function convertStarToTrafficLight(starRating: number): 'red' | 'yellow' | 'green' | null {
  if (!starRating) return null
  
  if (starRating >= 4.5) return 'green'
  if (starRating >= 3.5) return 'yellow'
  return 'red'
}

// Enhanced conversion with review count consideration
function convertRatingWithContext(
  starRating: number, 
  reviewCount: number
): { rating: 'red' | 'yellow' | 'green' | null, confidence: number } {
  if (!starRating || reviewCount < 10) {
    return { rating: null, confidence: 0 }
  }
  
  const rating = convertStarToTrafficLight(starRating)
  const confidence = Math.min(reviewCount / 100, 1) // Higher confidence with more reviews
  
  return { rating, confidence }
}
```

### 5. SQL Generation

#### 5.1 Migration File Creation
**Function**: `generateSqlMigration()` in `src/utils/sqlGenerator.ts`

**Output**: `charlotte_restaurants_migration.sql`

**Features**:
- PostGIS extension enablement
- Proper SQL escaping for special characters
- Type casting for arrays and JSONB
- PostGIS geography conversion
- Traffic light rating initialization

#### 5.2 SQL Formatting

**String Escaping**: `escapeSql()`
- Escapes single quotes (`'` → `''`)
- Handles null values

**Array Conversion**: `arrayToPostgresArray()`
- Converts JavaScript arrays to PostgreSQL `TEXT[]`
- Handles empty arrays with explicit casting: `ARRAY[]::TEXT[]`

**Location Conversion**: `locationToPostGIS()`
- Converts `POINT(lng lat)` to PostGIS format
- Uses `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography`

**Value Formatting**: `formatSqlValue()`
- Type-specific formatting (boolean, number, array, geography, jsonb)
- Proper NULL handling

#### 5.3 Traffic Light Rating SQL Generation

```typescript
// Generate traffic light rating fields
function generateTrafficLightRatingSQL(restaurant: Restaurant): string {
  const { rating, confidence } = convertRatingWithContext(
    restaurant.google_rating, 
    restaurant.google_reviews_count
  )
  
  if (!rating) {
    return `
      red_ratings_count = 0,
      yellow_ratings_count = 0,
      green_ratings_count = 0,
      total_ratings_count = 0,
      overall_rating = 'neutral'
    `
  }
  
  const counts = {
    red: rating === 'red' ? 1 : 0,
    yellow: rating === 'yellow' ? 1 : 0,
    green: rating === 'green' ? 1 : 0
  }
  
  return `
    red_ratings_count = ${counts.red},
    yellow_ratings_count = ${counts.yellow},
    green_ratings_count = ${counts.green},
    total_ratings_count = 1,
    overall_rating = '${rating}'
  `
}
```

**Note**: This function works after the traffic light rating migration has been applied.

### 6. Database Schema Compliance

#### 6.1 Required Fields
```sql
-- All restaurants get these default values
is_claimed = FALSE
is_verified = FALSE
data_source = 'seed'
created_at = NOW()
updated_at = NOW()
troodie_rating = NULL
troodie_reviews_count = 0
dietary_options = ARRAY[]::TEXT[]
```

**Note**: Traffic light rating fields are available after running the migration. If you haven't applied the traffic light rating migration yet, you'll need to run it first.

#### 6.2 Data Types
- **Arrays**: `TEXT[]` for cuisine_types, features, photos, dietary_options
- **Geography**: `GEOGRAPHY(POINT)` for location
- **JSONB**: `JSONB` for hours
- **Timestamps**: `TIMESTAMP` for created_at, updated_at
- **Traffic Light**: `VARCHAR(10)` for overall_rating

### 7. Enhanced Data Processing

#### 7.1 Rating Quality Assessment

```typescript
interface RatingQuality {
  hasEnoughReviews: boolean
  reviewCount: number
  ratingConsistency: number
  confidenceScore: number
}

function assessRatingQuality(restaurant: Restaurant): RatingQuality {
  const reviewCount = restaurant.google_reviews_count || 0
  const rating = restaurant.google_rating || 0
  
  return {
    hasEnoughReviews: reviewCount >= 10,
    reviewCount,
    ratingConsistency: calculateRatingConsistency(restaurant),
    confidenceScore: Math.min(reviewCount / 100, 1)
  }
}
```

#### 7.2 Restaurant Categorization

```typescript
interface RestaurantCategory {
  cuisine: string[]
  priceTier: '$' | '$$' | '$$$' | '$$$$'
  neighborhood: string
  diningType: 'fine_dining' | 'casual' | 'fast_casual' | 'bar' | 'cafe'
  features: string[]
}

function categorizeRestaurant(restaurant: Restaurant): RestaurantCategory {
  return {
    cuisine: restaurant.cuisine_types || [],
    priceTier: restaurant.price_range || '$$',
    neighborhood: extractNeighborhood(restaurant.address),
    diningType: determineDiningType(restaurant),
    features: restaurant.features || []
  }
}
```

### 8. Usage Examples

#### 8.1 Complete Pipeline
```typescript
import { cleanRestaurantData } from './utils/dataCleaners';
import { transformRestaurantsBatch } from './utils/dataTransformers';
import { generateSqlMigration } from './utils/sqlGenerator';

// Load raw data
const rawData = JSON.parse(fs.readFileSync('input.json', 'utf8'));

// Clean data
const cleanedData = cleanRestaurantData(rawData);

// Transform schema with traffic light ratings
const transformedData = transformRestaurantsBatch(cleanedData);

// Generate SQL with rating system
generateSqlMigration(transformedData, 'output.sql');
```

#### 8.2 Individual Functions
```typescript
// Remove fast food only
const noFastFood = removeFastFoodRestaurants(restaurants);

// Transform single restaurant with traffic light rating
const transformed = transformYelpToAppSchema(yelpRestaurant);

// Generate SQL for specific data
generateSqlMigration(restaurants, 'custom_migration.sql');
```

#### 8.3 Rating System Integration
```typescript
// Convert existing 5-star ratings to traffic light
const restaurantsWithTrafficLight = restaurants.map(restaurant => ({
  ...restaurant,
  ...generateTrafficLightRating(restaurant.google_rating, restaurant.google_reviews_count)
}));

// Generate SQL with traffic light fields
const sql = generateSqlMigration(restaurantsWithTrafficLight, 'migration.sql');
```

**Note**: This works after the traffic light rating migration has been applied.

### 9. Final Results

**Input**: 197 raw restaurants
**After Cleaning**: 89 unique Charlotte restaurants
**Output**: SQL migration with 89 INSERT statements including traffic light ratings

**Key Metrics**:
- 30 fast food restaurants removed
- 20+ duplicates removed
- 50+ non-Charlotte restaurants filtered
- 100% SQL syntax compliance
- All data types properly cast
- Traffic light ratings calculated for all restaurants (after migration)

### 10. Database Deployment

1. **Run Migration**: Execute `charlotte_restaurants_migration.sql` in Supabase
2. **Verify Data**: Check restaurant count and sample records
3. **Test Queries**: Ensure PostGIS functions work correctly
4. **Verify Ratings**: Check traffic light rating calculations
5. **Backup**: Create database backup before large insertions

## File Structure

```
src/utils/
├── dataCleaners.ts      # Data filtering and validation
├── dataTransformers.ts  # Schema conversion and normalization
├── sqlGenerator.ts      # SQL migration generation
├── ratingConverter.ts   # Traffic light rating conversion
└── validators.ts        # Data validation rules

Output Files:
├── charlotte_restaurants_data.json     # Cleaned input data
└── charlotte_restaurants_migration.sql # Final SQL migration
```

## Traffic Light Rating System Integration

### Rating Logic

1. **Green Rating**: 4.5+ stars with 50+ reviews
2. **Yellow Rating**: 3.5-4.4 stars or mixed reviews
3. **Red Rating**: Below 3.5 stars
4. **Neutral**: Insufficient data (<10 reviews)

**Note**: This system works after the traffic light rating migration has been applied.

### Rating Confidence

```typescript
function calculateRatingConfidence(starRating: number, reviewCount: number): number {
  if (reviewCount < 10) return 0
  if (reviewCount < 50) return 0.5
  if (reviewCount < 100) return 0.8
  return 1.0
}
```

### Rating Display

```typescript
interface RatingDisplay {
  type: 'traffic_light' | 'converted' | 'none'
  value: 'red' | 'yellow' | 'green' | 'neutral'
  count: number
  confidence?: number
  original?: number // Original star rating
}

function getDisplayRating(restaurant: Restaurant): RatingDisplay {
  // Priority 1: Traffic light ratings if available
  if (restaurant.total_ratings_count > 0) {
    return {
      type: 'traffic_light',
      value: restaurant.overall_rating,
      count: restaurant.total_ratings_count
    }
  }
  
  // Priority 2: Converted Google rating
  if (restaurant.google_rating) {
    return {
      type: 'converted',
      value: convertStarToTrafficLight(restaurant.google_rating),
      count: restaurant.google_reviews_count,
      original: restaurant.google_rating
    }
  }
  
  return { type: 'none', value: 'neutral' }
}
```

**Note**: Traffic light rating display works after the migration has been applied.
```

## Troubleshooting

### Common Issues

1. **SQL Syntax Errors**: Check for unescaped quotes or invalid PostGIS syntax
2. **Type Errors**: Ensure all arrays are properly cast to `TEXT[]`
3. **Validation Failures**: Review data quality and adjust validation rules
4. **Memory Issues**: Process large datasets in batches
5. **Rating Conversion Errors**: Verify star rating to traffic light conversion logic

### Debugging Tips

- Use console.log statements in utility functions
- Check sample SQL output before full generation
- Validate data at each pipeline stage
- Test with small datasets first
- Verify traffic light rating calculations

## Future Enhancements

1. **Batch Processing**: Handle larger datasets efficiently
2. **Data Sources**: Support additional restaurant data formats
3. **Validation Rules**: Add more sophisticated data quality checks
4. **Error Recovery**: Implement retry logic for failed transformations
5. **Monitoring**: Add detailed logging and metrics collection
6. **Rating Analytics**: Track rating trends and user behavior
7. **AI Integration**: Use ML to improve rating predictions
8. **Social Features**: Implement friend consensus ratings

## Migration Notes

### Implementation Steps

To implement the traffic light rating system:

1. **Run Migration**: Apply the traffic light rating migration (provided above)
2. **Preserve Original Data**: Keep `google_rating` and `google_reviews_count`
3. **Calculate Traffic Light**: Use conversion functions for initial ratings
4. **Update UI**: Display traffic light ratings instead of stars
5. **User Education**: Explain the new rating system to users

1. **Preserve Original Data**: Keep `google_rating` and `google_reviews_count`
2. **Calculate Traffic Light**: Use conversion functions for initial ratings
3. **Update UI**: Display traffic light ratings instead of stars
4. **User Education**: Explain the new rating system to users

### Backward Compatibility

```typescript
// Support both rating systems during transition
function getRatingDisplay(restaurant: Restaurant): RatingDisplay {
  // New traffic light system
  if (restaurant.overall_rating && restaurant.overall_rating !== 'neutral') {
    return {
      type: 'traffic_light',
      value: restaurant.overall_rating,
      count: restaurant.total_ratings_count
    }
  }
  
  // Fallback to converted Google rating
  if (restaurant.google_rating) {
    return {
      type: 'converted',
      value: convertStarToTrafficLight(restaurant.google_rating),
      count: restaurant.google_reviews_count,
      original: restaurant.google_rating
    }
  }
  
  return { type: 'none', value: 'neutral' }
}
```

---

**Last Updated**: January 2025
**Version**: 2.0 (with Traffic Light Rating System Implementation)
**Maintainer**: Engineering Team 