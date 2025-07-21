# Restaurant Data Seeding Guide

This guide explains how to seed restaurant data for Troodie, starting with 100 curated restaurants in Charlotte, NC.

## Prerequisites

1. **Environment Variables**
   Create a `.env` file in the root directory with:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   GOOGLE_PLACES_API_KEY=your_google_api_key
   ```

2. **Google Places API Setup**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Enable Places API
   - Create API key with restrictions:
     - Application restrictions: None (for server-side)
     - API restrictions: Places API only

3. **Supabase Setup**
   - Run the database migrations in `supabase/migrations/`
   - Ensure PostGIS extension is enabled

## Installation

```bash
# Install dependencies
npm install @supabase/supabase-js dotenv @types/node

# Install TypeScript if not already installed
npm install -D typescript ts-node
```

## Running the Seed Script

```bash
# Run the seeding script
npx ts-node scripts/seed-restaurants.ts
```

The script will:
1. Create restaurant categories
2. Search for each restaurant on Google Places
3. Fetch detailed information including hours, photos, ratings
4. Insert data into your Supabase database

## What Gets Seeded

### Restaurant Data
- Basic info: Name, address, phone, website
- Location data: Lat/lng coordinates for mapping
- Hours of operation: Daily schedules
- Photos: Up to 5 photos per restaurant
- Ratings: Google ratings and review counts
- Categories: Cuisine types and features
- Price ranges: $ to $$$$

### Categories
- Date Night
- Business Lunch
- Family Friendly
- Late Night
- Brunch
- Fine Dining
- Casual
- Outdoor Seating
- Brewery
- Vegetarian Friendly

## Cost Estimation

Based on Google Places API pricing:
- Initial seeding of 100 restaurants: ~$10
  - Place Search: 100 requests × $0.032 = $3.20
  - Place Details: 100 requests × $0.017 = $1.70
  - Photos: 500 requests × $0.007 = $3.50

## Monitoring

Check seeding progress in the console:
```
[1/100] Processing The Capital Grille...
  → Successfully added
[2/100] Processing Barcelona Wine Bar...
  → Successfully added
...
```

## Troubleshooting

### Common Issues

1. **Restaurant not found on Google**
   - The script will skip and continue
   - You can manually add later

2. **API Rate Limits**
   - Script includes 200ms delay between requests
   - If you hit limits, wait and resume

3. **Duplicate restaurants**
   - Script checks for existing entries
   - Safe to run multiple times

### Checking Results

```sql
-- Count seeded restaurants
SELECT COUNT(*) FROM restaurants WHERE data_source = 'seed';

-- Check restaurants by area
SELECT 
  SUBSTRING(address FROM 'Charlotte|Uptown|South End|NoDa|Plaza Midwood') as area,
  COUNT(*) as count
FROM restaurants 
GROUP BY area;

-- Verify data completeness
SELECT 
  COUNT(*) as total,
  COUNT(phone) as with_phone,
  COUNT(website) as with_website,
  COUNT(hours) as with_hours,
  COUNT(photos) as with_photos
FROM restaurants;
```

## Next Steps

After seeding:

1. **Deploy the search Edge Function**
   ```bash
   supabase functions deploy search-restaurants
   ```

2. **Set up the refresh job**
   - Create a cron job to refresh restaurant data monthly
   - Use `refresh_restaurant_popularity()` function

3. **Test the search**
   - Use the app to search for restaurants
   - Verify Google Places integration works

## Adding More Cities

To add restaurants for other cities:

1. Create a new JSON file (e.g., `raleigh-restaurants.json`)
2. Update the seed script to use the new file
3. Run the seeding process

## Manual Restaurant Addition

For restaurants not on Google Places:

```sql
INSERT INTO restaurants (
  name, address, city, state, location,
  cuisine_types, price_range, data_source
) VALUES (
  'Restaurant Name',
  '123 Main St',
  'Charlotte',
  'NC',
  ST_SetSRID(ST_MakePoint(-80.8431, 35.2271), 4326),
  ARRAY['American', 'Southern'],
  '$$',
  'user'
);