// Script to check cities in the restaurants table for data quality issues
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in your .env file');
  console.error('Found SUPABASE_URL:', !!supabaseUrl);
  console.error('Found SUPABASE_ANON_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCities() {
  console.log('🔍 Checking cities in restaurants table...\n');

  try {
    // 1. Get all unique cities with restaurant count
    console.log('1. Querying cities with restaurant counts:');
    const { data: citiesData, error: citiesError } = await supabase
      .from('restaurants')
      .select('city')
      .not('city', 'is', null);

    if (citiesError) {
      console.error('❌ Error fetching cities:', citiesError);
      return;
    }

    // Process the data to count occurrences
    const cityCount = {};
    citiesData.forEach(row => {
      const city = row.city?.trim();
      if (city) {
        cityCount[city] = (cityCount[city] || 0) + 1;
      }
    });

    // Sort cities alphabetically
    const sortedCities = Object.entries(cityCount).sort(([a], [b]) => a.localeCompare(b));

    console.log(`📊 Found ${sortedCities.length} unique cities with ${citiesData.length} total restaurants\n`);

    // Display all cities with counts
    console.log('Cities and restaurant counts:');
    console.log('='.repeat(50));
    sortedCities.forEach(([city, count]) => {
      console.log(`${city.padEnd(30)} | ${count.toString().padStart(4)} restaurants`);
    });

    console.log('\n' + '='.repeat(50));
    console.log(`Total: ${sortedCities.length} cities, ${citiesData.length} restaurants\n`);

    // 2. Identify potential duplicates and data quality issues
    console.log('2. Data Quality Analysis:');
    console.log('-'.repeat(40));

    const duplicates = [];
    const suspicious = [];
    const cityNames = sortedCities.map(([city]) => city.toLowerCase());

    sortedCities.forEach(([city, count]) => {
      const cityLower = city.toLowerCase();
      
      // Check for potential duplicates (similar names)
      const similarCities = sortedCities.filter(([otherCity]) => {
        const otherCityLower = otherCity.toLowerCase();
        return otherCity !== city && (
          otherCityLower.includes(cityLower) || 
          cityLower.includes(otherCityLower) ||
          (cityLower.replace(/\s+/g, '') === otherCityLower.replace(/\s+/g, ''))
        );
      });

      if (similarCities.length > 0) {
        duplicates.push({
          city,
          count,
          similar: similarCities.map(([name, cnt]) => ({ name, count: cnt }))
        });
      }

      // Check for suspicious entries
      if (
        city.includes('Bldg') ||
        city.includes('Building') ||
        city.includes('Suite') ||
        city.includes('Unit') ||
        city.includes('Floor') ||
        city.includes('#') ||
        city.match(/^\d+/) ||
        city.length < 3 ||
        city.length > 50
      ) {
        suspicious.push({ city, count });
      }
    });

    // Report duplicates
    if (duplicates.length > 0) {
      console.log('\n🔍 Potential Duplicate Cities:');
      duplicates.forEach(({ city, count, similar }) => {
        console.log(`\n"${city}" (${count} restaurants)`);
        similar.forEach(({ name, count: simCount }) => {
          console.log(`  ↳ Similar to: "${name}" (${simCount} restaurants)`);
        });
      });
    } else {
      console.log('\n✅ No obvious duplicate cities found');
    }

    // Report suspicious entries
    if (suspicious.length > 0) {
      console.log('\n⚠️  Suspicious City Entries:');
      suspicious.forEach(({ city, count }) => {
        console.log(`  • "${city}" (${count} restaurants) - May be address data or invalid`);
      });
    } else {
      console.log('\n✅ No suspicious city entries found');
    }

    // 3. Get some sample restaurants to understand the data better
    console.log('\n3. Sample Restaurant Data:');
    console.log('-'.repeat(40));
    
    const { data: sampleData, error: sampleError } = await supabase
      .from('restaurants')
      .select('name, address, city, state, zip_code, data_source')
      .limit(10);

    if (sampleError) {
      console.error('❌ Error fetching sample data:', sampleError);
    } else {
      console.log('\nSample restaurants (first 10):');
      sampleData.forEach((restaurant, index) => {
        console.log(`\n${index + 1}. ${restaurant.name}`);
        console.log(`   Address: ${restaurant.address || 'N/A'}`);
        console.log(`   City: ${restaurant.city || 'N/A'}`);
        console.log(`   State: ${restaurant.state || 'N/A'}`);
        console.log(`   ZIP: ${restaurant.zip_code || 'N/A'}`);
        console.log(`   Source: ${restaurant.data_source || 'N/A'}`);
      });
    }

    // 4. Summary statistics
    console.log('\n4. Summary Statistics:');
    console.log('-'.repeat(40));
    console.log(`• Total unique cities: ${sortedCities.length}`);
    console.log(`• Total restaurants: ${citiesData.length}`);
    console.log(`• Average restaurants per city: ${(citiesData.length / sortedCities.length).toFixed(1)}`);
    console.log(`• Most restaurants in one city: ${Math.max(...sortedCities.map(([, count]) => count))}`);
    console.log(`• Cities with only 1 restaurant: ${sortedCities.filter(([, count]) => count === 1).length}`);
    console.log(`• Potential duplicates found: ${duplicates.length}`);
    console.log(`• Suspicious entries found: ${suspicious.length}`);

    // Top 10 cities by restaurant count
    const topCities = sortedCities.sort(([, a], [, b]) => b - a).slice(0, 10);
    console.log('\n📈 Top 10 Cities by Restaurant Count:');
    topCities.forEach(([city, count], index) => {
      console.log(`  ${(index + 1).toString().padStart(2)}. ${city.padEnd(25)} | ${count} restaurants`);
    });

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Run the script
checkCities().then(() => {
  console.log('\n✅ City analysis complete');
}).catch(error => {
  console.error('❌ Script failed:', error);
});