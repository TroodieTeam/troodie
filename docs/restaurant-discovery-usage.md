# Restaurant Discovery Function Usage

## Overview

The `discover-restaurants` function extends your existing `add-restaurant` functionality to perform bulk discovery of restaurants by city and category. It uses the same data standardization and processing logic but searches across predefined categories.

## Key Features

### 🔍 **Category-Based Search**
- 40+ predefined restaurant categories
- Smart keyword mapping for each category
- Price range and feature filtering
- Automatic cuisine type standardization

### 🚀 **Bulk Processing**
- Searches multiple categories in parallel
- Rate limiting and batch processing
- Duplicate detection and removal
- Database upsert with conflict resolution

### 📊 **Same Data Quality**
- Uses your existing traffic light rating system
- Standardizes cuisine types to your approved list
- Processes photos, hours, and contact info
- Maintains data consistency with single restaurant adds

## API Usage

### Endpoint
```
POST /functions/v1/discover-restaurants
```

### Request Body
```json
{
  "city": "Austin, TX",                              // Required
  "categories": ["italian-restaurants", "bbq-restaurants"], // Optional - defaults to all
  "limitPerCategory": 20,                            // Optional - default 20
  "saveToDatabase": true                             // Optional - default true
}
```

### Response Format
```json
{
  "success": true,
  "city": "Austin, TX",
  "categoriesSearched": 2,
  "totalRestaurantsFound": 38,
  "restaurantsSaved": 35,
  "results": {
    "italian-restaurants": [
      {
        "restaurant_name": "Asti Trattoria",
        "full_address": "408 E 43rd St, Austin, TX 78751",
        "rating": "4.6",
        "review_count": "892",
        "price_level": "$$$",
        // ... full restaurant data
      }
    ],
    "bbq-restaurants": [
      // ... BBQ restaurants
    ]
  },
  "summary": [
    { "category": "italian-restaurants", "count": 18 },
    { "category": "bbq-restaurants", "count": 20 }
  ]
}
```

## Available Categories

### Cuisine-Based Categories
```javascript
'general-restaurants'           // High-rated restaurants across all cuisines
'american-restaurants'          // American & Southern cuisine, mid-price
'fine-dining'                   // Upscale, reservations required, high-price
'italian-restaurants'           // Italian with outdoor seating preference
'japanese-sushi'                // Japanese & Sushi, mid-high price
'mexican-texmex'                // Mexican/Tex-Mex with takeout options
'bbq-restaurants'               // BBQ, group-friendly
'seafood-restaurants'           // Seafood, mid-high price
'indian-thai'                   // Indian & Thai cuisine
'mediterranean-greek'           // Mediterranean & Greek
'new-american-contemporary'     // Modern cuisine, high-price
'french-restaurants'            // French cuisine
'casual-american'               // Family-friendly American
'pizza'                         // Pizza restaurants
'gluten-free'                   // Gluten-free options
'vegetarian'                    // Vegetarian restaurants
'vegan-vegetarian'              // Plant-based dining
```

### Meal Types & Occasions
```javascript
'brunch-family'                 // Family brunch spots
'brunch-outdoor'                // Outdoor brunch dining
'lunch-spots'                   // Quality lunch destinations
'dinner-restaurants'            // Evening dining
'late-night-food'               // Late night options
'romantic-restaurants'          // Date night venues
'family-friendly'               // Kid-friendly restaurants
```

### Food & Beverage Establishments
```javascript
'cafes-coffee-food'             // Cafes with food options
'coffee-shops'                  // Coffee-focused establishments
'breweries-food'                // Breweries with full food menus
'breweries-dog-friendly'        // Pet-friendly breweries
'sports-bars'                   // Sports viewing venues
'bars-with-food'                // Gastropubs and food-focused bars
'dessert-bakeries'              // Dessert and bakery shops
```

### Specific Foods
```javascript
'tacos-mexican'                 // Taco shops and Mexican food
'sushi-delivery'                // Sushi with delivery options
'burgers'                       // Burger restaurants
```

### Special Attributes
```javascript
'happy-hour'                    // Happy hour specials
'outdoor-seating'               // Patio and outdoor dining
'takeout-restaurants'           // Takeout-focused establishments
```

## Implementation Examples

### Frontend Integration
```typescript
// Search for romantic restaurants in San Francisco
const discoverRestaurants = async (city: string, categories: string[]) => {
  const response = await fetch('/functions/v1/discover-restaurants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      city,
      categories,
      limitPerCategory: 15,
      saveToDatabase: true
    })
  });
  
  return response.json();
};

// Usage
const results = await discoverRestaurants('San Francisco, CA', [
  'romantic-restaurants', 
  'fine-dining', 
  'italian-restaurants'
]);
```

### Batch Processing Multiple Cities
```javascript
const cities = ['Austin, TX', 'Nashville, TN', 'Portland, OR'];
const categories = ['bbq-restaurants', 'breweries-food', 'food-trucks'];

for (const city of cities) {
  const results = await discoverRestaurants(city, categories);
  console.log(`Found ${results.totalRestaurantsFound} restaurants in ${city}`);
}
```

### Category-Specific Searches
```javascript
// Find all Italian restaurants with outdoor seating
const italianResults = await discoverRestaurants('Denver, CO', ['italian-restaurants']);

// Discover family-friendly options
const familyResults = await discoverRestaurants('Orlando, FL', [
  'family-friendly', 
  'brunch-family', 
  'pizza'
]);

// Late night food discovery
const lateNightResults = await discoverRestaurants('Las Vegas, NV', [
  'late-night-food',
  'bars-with-food'
]);
```

## Database Integration

### Automatic Upsert
The function automatically:
- Checks for existing restaurants by name + address
- Updates existing records with new data
- Inserts new restaurants
- Tracks discovery source and category

### Enhanced Schema Fields
New restaurants include:
```sql
discovery_category VARCHAR -- Which category found this restaurant
data_source VARCHAR        -- Set to 'bulk_discovery'
created_at TIMESTAMP      -- Discovery timestamp
updated_at TIMESTAMP      -- Last update
```

## Performance & Rate Limiting

### Batch Processing
- Processes 3 categories in parallel
- 2-second delay between batches
- Respects Apify rate limits

### Optimization Tips
```javascript
// For better performance, group related categories
const efficientSearch = await discoverRestaurants('Boston, MA', [
  'italian-restaurants',     // Related cuisine types
  'mediterranean-greek',     // process together
  'pizza'
]);

// Avoid mixing very different search types in one call
// This is less efficient:
const inefficientSearch = await discoverRestaurants('Boston, MA', [
  'fine-dining',            // Different search patterns
  'coffee-shops',           // and price ranges
  'late-night-food'         // make this slower
]);
```

## Error Handling

### Common Error Responses
```json
{
  "error": "City is required",
  "status": 400
}

{
  "error": "Unknown category: invalid-category-name",
  "status": 400
}

{
  "error": "Failed to discover restaurants",
  "details": "Rate limit exceeded",
  "status": 500
}
```

### Partial Success Handling
The function continues processing even if some categories fail:
```json
{
  "success": true,
  "categoriesSearched": 3,
  "totalRestaurantsFound": 45,
  "restaurantsSaved": 42,
  "results": {
    "italian-restaurants": [/* ... */],
    "bbq-restaurants": [],      // Failed - empty array
    "seafood-restaurants": [/* ... */]
  },
  "errors": {
    "bbq-restaurants": "Rate limit exceeded for this category"
  }
}
```

## Comparison to add-restaurant Function

| Feature | add-restaurant | discover-restaurants |
|---------|----------------|---------------------|
| **Input** | Single restaurant details | City + categories |
| **Data Sources** | Google Places → Apify → Manual | Apify bulk search |
| **Output** | Single restaurant record | Bulk restaurant data |
| **Use Case** | User-submitted restaurants | Systematic discovery |
| **Processing** | Real-time single insert | Batch processing with upsert |
| **Validation** | Input validation required | Automated filtering |

## Next Steps

1. **Deploy the function** to your Supabase Edge Functions
2. **Test with a single category** first
3. **Monitor rate limits** and adjust batch sizes if needed
4. **Integrate into your app** for systematic restaurant discovery
5. **Consider scheduling** regular discovery runs for new cities
