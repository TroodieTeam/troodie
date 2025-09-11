#!/usr/bin/env node

/**
 * Test Data Seeding Script for Troodie
 * 
 * This script creates test users and restaurants for development and testing.
 * All test accounts use emails ending with @bypass.com for auth bypass.
 * 
 * Usage: node scripts/seed-test-accounts.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.development' });

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env.development file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test user configurations
const TEST_USERS = [
  // Consumer accounts (default type)
  {
    email: 'consumer1@bypass.com',
    username: 'test_consumer_1',
    name: 'Test Consumer One',
    bio: 'I love exploring new restaurants and sharing my food adventures!',
    account_type: 'consumer',
    profile_image_url: 'https://ui-avatars.com/api/?name=Test+Consumer+One&background=FF6B6B&color=fff'
  },
  {
    email: 'consumer2@bypass.com',
    username: 'test_consumer_2',
    name: 'Test Consumer Two',
    bio: 'Foodie at heart, always searching for the next great meal.',
    account_type: 'consumer',
    profile_image_url: 'https://ui-avatars.com/api/?name=Test+Consumer+Two&background=4ECDC4&color=fff'
  },
  {
    email: 'consumer3@bypass.com',
    username: 'test_consumer_3',
    name: 'Test Consumer Three',
    bio: 'Weekend brunch enthusiast and coffee addict.',
    account_type: 'consumer',
    profile_image_url: 'https://ui-avatars.com/api/?name=Test+Consumer+Three&background=FFE66D&color=333'
  },
  
  // Creator accounts
  {
    email: 'creator1@bypass.com',
    username: 'test_creator_1',
    name: 'Test Creator One',
    bio: 'Food blogger and content creator. Sharing the best eats in town!',
    account_type: 'creator',
    profile_image_url: 'https://ui-avatars.com/api/?name=Test+Creator+One&background=A8E6CF&color=333',
    creator_profile: {
      specialties: ['Restaurant Reviews', 'Food Photography', 'Local Cuisine'],
      social_links: {
        instagram: '@test_creator_1',
        tiktok: '@test_creator_1',
        youtube: 'TestCreatorOne'
      },
      media_kit_url: null,
      rate_card: {
        post: 100,
        reel: 250,
        story: 50
      }
    }
  },
  {
    email: 'creator2@bypass.com',
    username: 'test_creator_2',
    name: 'Test Creator Two',
    bio: 'Travel and food influencer. Discovering hidden gems worldwide.',
    account_type: 'creator',
    profile_image_url: 'https://ui-avatars.com/api/?name=Test+Creator+Two&background=FFD3B6&color=333',
    creator_profile: {
      specialties: ['Travel Food', 'Street Food', 'Cultural Cuisine'],
      social_links: {
        instagram: '@test_creator_2',
        tiktok: '@test_creator_2'
      },
      media_kit_url: null,
      rate_card: {
        post: 150,
        reel: 300,
        story: 75
      }
    }
  },
  
  // Business accounts (will be set up after restaurant creation)
  {
    email: 'business1@bypass.com',
    username: 'test_business_1',
    name: 'Test Business Owner One',
    bio: 'Owner of The Rustic Table - Farm to table dining experience.',
    account_type: 'business',
    profile_image_url: 'https://ui-avatars.com/api/?name=Test+Business+One&background=95A9FF&color=fff',
    restaurant_index: 0 // Will claim the first restaurant
  },
  {
    email: 'business2@bypass.com',
    username: 'test_business_2',
    name: 'Test Business Owner Two',
    bio: 'Managing partner at Sakura Sushi - Authentic Japanese cuisine.',
    account_type: 'business',
    profile_image_url: 'https://ui-avatars.com/api/?name=Test+Business+Two&background=FF95BA&color=fff',
    restaurant_index: 1 // Will claim the second restaurant
  },
  
  // Multi-role user (creator who also owns a business)
  {
    email: 'multi_role@bypass.com',
    username: 'test_multi_role',
    name: 'Test Multi Role User',
    bio: 'Food blogger and restaurant owner. Living the dream!',
    account_type: 'business', // Will be upgraded to business after claiming
    profile_image_url: 'https://ui-avatars.com/api/?name=Test+Multi+Role&background=B395FF&color=fff',
    restaurant_index: 2, // Will claim the third restaurant
    creator_profile: {
      specialties: ['Restaurant Management', 'Recipe Development', 'Food Trends'],
      social_links: {
        instagram: '@test_multi_role',
        website: 'www.testmultirole.com'
      },
      media_kit_url: null,
      rate_card: {
        post: 200,
        reel: 400,
        story: 100
      }
    }
  }
];

// Test restaurant data
const TEST_RESTAURANTS = [
  {
    name: 'The Rustic Table',
    description: 'Farm-to-table restaurant featuring locally sourced ingredients and seasonal menus.',
    cuisine_type: 'American',
    price_range: 3,
    address: '123 Farm Road',
    city: 'Portland',
    state: 'OR',
    zip_code: '97201',
    country: 'USA',
    phone: '(503) 555-0101',
    website: 'www.therustictable.test',
    hours: {
      monday: '11:00 AM - 9:00 PM',
      tuesday: '11:00 AM - 9:00 PM',
      wednesday: '11:00 AM - 9:00 PM',
      thursday: '11:00 AM - 10:00 PM',
      friday: '11:00 AM - 11:00 PM',
      saturday: '10:00 AM - 11:00 PM',
      sunday: '10:00 AM - 9:00 PM'
    },
    latitude: 45.5152,
    longitude: -122.6784,
    rating: 4.5,
    review_count: 127,
    photos: [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
      'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800'
    ],
    is_claimed: false,
    claimed_by: null,
    verified: false,
    featured: true,
    tags: ['farm-to-table', 'organic', 'local', 'seasonal'],
    amenities: ['outdoor-seating', 'wifi', 'parking', 'reservations']
  },
  {
    name: 'Sakura Sushi',
    description: 'Authentic Japanese sushi bar with fresh daily catches and traditional preparations.',
    cuisine_type: 'Japanese',
    price_range: 4,
    address: '456 Cherry Blossom Lane',
    city: 'Seattle',
    state: 'WA',
    zip_code: '98101',
    country: 'USA',
    phone: '(206) 555-0202',
    website: 'www.sakurasushi.test',
    hours: {
      monday: 'Closed',
      tuesday: '5:00 PM - 10:00 PM',
      wednesday: '5:00 PM - 10:00 PM',
      thursday: '5:00 PM - 10:00 PM',
      friday: '5:00 PM - 11:00 PM',
      saturday: '12:00 PM - 11:00 PM',
      sunday: '12:00 PM - 9:00 PM'
    },
    latitude: 47.6062,
    longitude: -122.3321,
    rating: 4.8,
    review_count: 256,
    photos: [
      'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800',
      'https://images.unsplash.com/photo-1553621042-f6e147245754?w=800'
    ],
    is_claimed: false,
    claimed_by: null,
    verified: false,
    featured: true,
    tags: ['sushi', 'japanese', 'omakase', 'sake'],
    amenities: ['reservations', 'private-dining', 'bar']
  },
  {
    name: 'Bella Vista Italian Kitchen',
    description: 'Traditional Italian trattoria with homemade pasta and wood-fired pizzas.',
    cuisine_type: 'Italian',
    price_range: 3,
    address: '789 Vineyard Way',
    city: 'San Francisco',
    state: 'CA',
    zip_code: '94102',
    country: 'USA',
    phone: '(415) 555-0303',
    website: 'www.bellavista.test',
    hours: {
      monday: '11:30 AM - 10:00 PM',
      tuesday: '11:30 AM - 10:00 PM',
      wednesday: '11:30 AM - 10:00 PM',
      thursday: '11:30 AM - 10:00 PM',
      friday: '11:30 AM - 11:00 PM',
      saturday: '11:30 AM - 11:00 PM',
      sunday: '11:30 AM - 10:00 PM'
    },
    latitude: 37.7749,
    longitude: -122.4194,
    rating: 4.6,
    review_count: 189,
    photos: [
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
      'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=800'
    ],
    is_claimed: false,
    claimed_by: null,
    verified: false,
    featured: false,
    tags: ['italian', 'pasta', 'pizza', 'wine'],
    amenities: ['outdoor-seating', 'wifi', 'bar', 'happy-hour']
  },
  {
    name: 'Taco Libre',
    description: 'Vibrant taqueria serving authentic street tacos and craft margaritas.',
    cuisine_type: 'Mexican',
    price_range: 2,
    address: '321 Fiesta Street',
    city: 'Austin',
    state: 'TX',
    zip_code: '78701',
    country: 'USA',
    phone: '(512) 555-0404',
    website: 'www.tacolibre.test',
    hours: {
      monday: '11:00 AM - 11:00 PM',
      tuesday: '11:00 AM - 11:00 PM',
      wednesday: '11:00 AM - 11:00 PM',
      thursday: '11:00 AM - 12:00 AM',
      friday: '11:00 AM - 1:00 AM',
      saturday: '10:00 AM - 1:00 AM',
      sunday: '10:00 AM - 11:00 PM'
    },
    latitude: 30.2672,
    longitude: -97.7431,
    rating: 4.4,
    review_count: 312,
    photos: [
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800',
      'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800'
    ],
    is_claimed: false,
    claimed_by: null,
    verified: false,
    featured: true,
    tags: ['mexican', 'tacos', 'margaritas', 'street-food'],
    amenities: ['outdoor-seating', 'bar', 'live-music', 'happy-hour']
  },
  {
    name: 'The Green Garden',
    description: 'Plant-based restaurant offering creative vegan and vegetarian dishes.',
    cuisine_type: 'Vegetarian',
    price_range: 3,
    address: '555 Wellness Way',
    city: 'Los Angeles',
    state: 'CA',
    zip_code: '90001',
    country: 'USA',
    phone: '(310) 555-0505',
    website: 'www.greengarden.test',
    hours: {
      monday: '8:00 AM - 9:00 PM',
      tuesday: '8:00 AM - 9:00 PM',
      wednesday: '8:00 AM - 9:00 PM',
      thursday: '8:00 AM - 9:00 PM',
      friday: '8:00 AM - 10:00 PM',
      saturday: '8:00 AM - 10:00 PM',
      sunday: '8:00 AM - 9:00 PM'
    },
    latitude: 34.0522,
    longitude: -118.2437,
    rating: 4.7,
    review_count: 198,
    photos: [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800'
    ],
    is_claimed: false,
    claimed_by: null,
    verified: false,
    featured: false,
    tags: ['vegan', 'vegetarian', 'healthy', 'organic'],
    amenities: ['outdoor-seating', 'wifi', 'parking', 'gluten-free-options']
  },
  {
    name: 'Bombay Spice House',
    description: 'Authentic Indian cuisine with traditional tandoori specialties and regional curries.',
    cuisine_type: 'Indian',
    price_range: 2,
    address: '888 Curry Court',
    city: 'Chicago',
    state: 'IL',
    zip_code: '60601',
    country: 'USA',
    phone: '(312) 555-0606',
    website: 'www.bombayspice.test',
    hours: {
      monday: '11:00 AM - 10:00 PM',
      tuesday: '11:00 AM - 10:00 PM',
      wednesday: '11:00 AM - 10:00 PM',
      thursday: '11:00 AM - 10:00 PM',
      friday: '11:00 AM - 11:00 PM',
      saturday: '11:00 AM - 11:00 PM',
      sunday: '11:00 AM - 10:00 PM'
    },
    latitude: 41.8781,
    longitude: -87.6298,
    rating: 4.5,
    review_count: 234,
    photos: [
      'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800',
      'https://images.unsplash.com/photo-1567337710282-00832b415979?w=800'
    ],
    is_claimed: false,
    claimed_by: null,
    verified: false,
    featured: true,
    tags: ['indian', 'curry', 'tandoori', 'vegetarian-friendly'],
    amenities: ['delivery', 'takeout', 'catering', 'buffet']
  },
  {
    name: 'Le Petit Bistro',
    description: 'Cozy French bistro serving classic dishes and an extensive wine selection.',
    cuisine_type: 'French',
    price_range: 4,
    address: '222 Champs Avenue',
    city: 'New York',
    state: 'NY',
    zip_code: '10001',
    country: 'USA',
    phone: '(212) 555-0707',
    website: 'www.lepetitbistro.test',
    hours: {
      monday: 'Closed',
      tuesday: '5:30 PM - 10:00 PM',
      wednesday: '5:30 PM - 10:00 PM',
      thursday: '5:30 PM - 10:00 PM',
      friday: '5:30 PM - 11:00 PM',
      saturday: '5:00 PM - 11:00 PM',
      sunday: '5:00 PM - 9:00 PM'
    },
    latitude: 40.7128,
    longitude: -74.0060,
    rating: 4.9,
    review_count: 167,
    photos: [
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800'
    ],
    is_claimed: false,
    claimed_by: null,
    verified: false,
    featured: false,
    tags: ['french', 'fine-dining', 'wine', 'romantic'],
    amenities: ['reservations', 'wine-bar', 'private-dining', 'valet-parking']
  },
  {
    name: 'Dragon Palace',
    description: 'Upscale Chinese restaurant specializing in Szechuan and Cantonese cuisine.',
    cuisine_type: 'Chinese',
    price_range: 3,
    address: '999 Dynasty Drive',
    city: 'Boston',
    state: 'MA',
    zip_code: '02101',
    country: 'USA',
    phone: '(617) 555-0808',
    website: 'www.dragonpalace.test',
    hours: {
      monday: '11:30 AM - 10:00 PM',
      tuesday: '11:30 AM - 10:00 PM',
      wednesday: '11:30 AM - 10:00 PM',
      thursday: '11:30 AM - 10:00 PM',
      friday: '11:30 AM - 11:00 PM',
      saturday: '11:30 AM - 11:00 PM',
      sunday: '11:30 AM - 10:00 PM'
    },
    latitude: 42.3601,
    longitude: -71.0589,
    rating: 4.4,
    review_count: 289,
    photos: [
      'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800',
      'https://images.unsplash.com/photo-1555992336-fb0d29498b13?w=800'
    ],
    is_claimed: false,
    claimed_by: null,
    verified: false,
    featured: true,
    tags: ['chinese', 'szechuan', 'dim-sum', 'seafood'],
    amenities: ['reservations', 'private-dining', 'bar', 'banquet-hall']
  },
  {
    name: 'BBQ Pit Master',
    description: 'Southern-style barbecue joint with slow-smoked meats and homemade sides.',
    cuisine_type: 'BBQ',
    price_range: 2,
    address: '777 Smokehouse Lane',
    city: 'Nashville',
    state: 'TN',
    zip_code: '37201',
    country: 'USA',
    phone: '(615) 555-0909',
    website: 'www.bbqpitmaster.test',
    hours: {
      monday: '11:00 AM - 9:00 PM',
      tuesday: '11:00 AM - 9:00 PM',
      wednesday: '11:00 AM - 9:00 PM',
      thursday: '11:00 AM - 9:00 PM',
      friday: '11:00 AM - 10:00 PM',
      saturday: '11:00 AM - 10:00 PM',
      sunday: '11:00 AM - 9:00 PM'
    },
    latitude: 36.1627,
    longitude: -86.7816,
    rating: 4.6,
    review_count: 423,
    photos: [
      'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=800'
    ],
    is_claimed: false,
    claimed_by: null,
    verified: false,
    featured: false,
    tags: ['bbq', 'southern', 'smoked-meat', 'comfort-food'],
    amenities: ['outdoor-seating', 'takeout', 'catering', 'live-music']
  },
  {
    name: 'Pho Saigon',
    description: 'Family-owned Vietnamese restaurant famous for traditional pho and banh mi.',
    cuisine_type: 'Vietnamese',
    price_range: 1,
    address: '333 Noodle Street',
    city: 'Houston',
    state: 'TX',
    zip_code: '77001',
    country: 'USA',
    phone: '(713) 555-1010',
    website: 'www.phosaigon.test',
    hours: {
      monday: '9:00 AM - 9:00 PM',
      tuesday: '9:00 AM - 9:00 PM',
      wednesday: '9:00 AM - 9:00 PM',
      thursday: '9:00 AM - 9:00 PM',
      friday: '9:00 AM - 10:00 PM',
      saturday: '9:00 AM - 10:00 PM',
      sunday: '9:00 AM - 9:00 PM'
    },
    latitude: 29.7604,
    longitude: -95.3698,
    rating: 4.7,
    review_count: 356,
    photos: [
      'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800',
      'https://images.unsplash.com/photo-1582878826629-29b392528cc0?w=800'
    ],
    is_claimed: false,
    claimed_by: null,
    verified: false,
    featured: true,
    tags: ['vietnamese', 'pho', 'banh-mi', 'authentic'],
    amenities: ['takeout', 'delivery', 'wheelchair-accessible', 'cash-only']
  }
];

// Add 20 more diverse restaurants
const ADDITIONAL_RESTAURANTS = [
  'Mediterranean Mezze House', 'Seoul Kitchen', 'The Breakfast Club', 'Curry & Kabab',
  'Pizza Paradise', 'The Seafood Shack', 'Greek Taverna', 'Ramen Revolution',
  'Caribbean Delights', 'The Steakhouse', 'Thai Orchid', 'Burger Barn',
  'Ethiopian Experience', 'Peruvian Ceviche Bar', 'The Deli Corner',
  'Moroccan Nights', 'British Pub & Grub', 'Cuban Cafe', 'Turkish Delights',
  'Aussie Bites'
].map((name, index) => ({
  name,
  description: `Authentic cuisine and memorable dining experience at ${name}.`,
  cuisine_type: ['Mediterranean', 'Korean', 'American', 'Indian', 'Italian', 
                 'Seafood', 'Greek', 'Japanese', 'Caribbean', 'Steakhouse',
                 'Thai', 'American', 'Ethiopian', 'Peruvian', 'Deli',
                 'Moroccan', 'British', 'Cuban', 'Turkish', 'Australian'][index],
  price_range: Math.floor(Math.random() * 4) + 1,
  address: `${100 + index} Test Street`,
  city: ['Miami', 'Denver', 'Phoenix', 'Detroit', 'Minneapolis',
         'Philadelphia', 'Atlanta', 'Dallas', 'Orlando', 'Las Vegas',
         'Portland', 'San Diego', 'Cleveland', 'Pittsburgh', 'Baltimore',
         'Milwaukee', 'Kansas City', 'St. Louis', 'Charlotte', 'Tampa'][index],
  state: ['FL', 'CO', 'AZ', 'MI', 'MN', 'PA', 'GA', 'TX', 'FL', 'NV',
          'ME', 'CA', 'OH', 'PA', 'MD', 'WI', 'MO', 'MO', 'NC', 'FL'][index],
  zip_code: `${10000 + index}`,
  country: 'USA',
  phone: `(555) 555-${String(1100 + index).padStart(4, '0')}`,
  website: `www.${name.toLowerCase().replace(/\s+/g, '')}.test`,
  hours: {
    monday: '11:00 AM - 9:00 PM',
    tuesday: '11:00 AM - 9:00 PM',
    wednesday: '11:00 AM - 9:00 PM',
    thursday: '11:00 AM - 10:00 PM',
    friday: '11:00 AM - 11:00 PM',
    saturday: '10:00 AM - 11:00 PM',
    sunday: '10:00 AM - 9:00 PM'
  },
  latitude: 40.7128 + (Math.random() - 0.5) * 20,
  longitude: -74.0060 + (Math.random() - 0.5) * 20,
  rating: 3.5 + Math.random() * 1.5,
  review_count: Math.floor(Math.random() * 500) + 50,
  photos: [
    `https://images.unsplash.com/photo-${1500000000000 + index * 1000000000}?w=800`,
    `https://images.unsplash.com/photo-${1500000000001 + index * 1000000000}?w=800`
  ],
  is_claimed: false,
  claimed_by: null,
  verified: false,
  featured: index % 3 === 0,
  tags: [`${name.split(' ')[0].toLowerCase()}`, 'restaurant', 'dining'],
  amenities: ['wifi', 'parking', 'reservations']
}));

// Combine all restaurants
const ALL_RESTAURANTS = [...TEST_RESTAURANTS, ...ADDITIONAL_RESTAURANTS];

async function createTestUsers() {
  console.log('\n📝 Creating test users...\n');
  const createdUsers = [];
  
  for (const userData of TEST_USERS) {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email, account_type')
        .eq('email', userData.email)
        .single();
      
      if (existingUser) {
        console.log(`✓ User already exists: ${userData.email} (${existingUser.account_type})`);
        createdUsers.push(existingUser);
        continue;
      }
      
      // Generate a UUID for the user
      const userId = crypto.randomUUID ? crypto.randomUUID() : 
                     'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                       const r = Math.random() * 16 | 0;
                       const v = c === 'x' ? r : (r & 0x3 | 0x8);
                       return v.toString(16);
                     });
      
      // Insert user into users table
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: userData.email,
          username: userData.username,
          name: userData.name,
          bio: userData.bio,
          profile_image_url: userData.profile_image_url,
          account_type: userData.account_type,
          account_status: 'active',
          is_verified: true,
          profile_completion: 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error(`❌ Failed to create user ${userData.email}:`, error.message);
        continue;
      }
      
      console.log(`✅ Created ${userData.account_type} user: ${userData.email}`);
      
      // Store user data for later processing
      createdUsers.push({ ...newUser, ...userData });
      
    } catch (error) {
      console.error(`❌ Error creating user ${userData.email}:`, error.message);
    }
  }
  
  return createdUsers;
}

async function createTestRestaurants() {
  console.log('\n🍽️ Creating test restaurants...\n');
  const createdRestaurants = [];
  
  for (const restaurantData of ALL_RESTAURANTS) {
    try {
      // Check if restaurant already exists
      const { data: existingRestaurant } = await supabase
        .from('restaurants')
        .select('id, name')
        .eq('name', restaurantData.name)
        .single();
      
      if (existingRestaurant) {
        console.log(`✓ Restaurant already exists: ${restaurantData.name}`);
        createdRestaurants.push(existingRestaurant);
        continue;
      }
      
      // Insert restaurant
      const { data: newRestaurant, error } = await supabase
        .from('restaurants')
        .insert({
          ...restaurantData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error(`❌ Failed to create restaurant ${restaurantData.name}:`, error.message);
        continue;
      }
      
      console.log(`✅ Created restaurant: ${restaurantData.name}`);
      createdRestaurants.push(newRestaurant);
      
    } catch (error) {
      console.error(`❌ Error creating restaurant ${restaurantData.name}:`, error.message);
    }
  }
  
  return createdRestaurants;
}

async function setupCreatorProfiles(users) {
  console.log('\n🎨 Setting up creator profiles...\n');
  
  for (const user of users) {
    if (user.creator_profile) {
      try {
        // Check if creator profile already exists
        const { data: existingProfile } = await supabase
          .from('creator_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (existingProfile) {
          console.log(`✓ Creator profile already exists for: ${user.email}`);
          continue;
        }
        
        // Insert creator profile
        const { error } = await supabase
          .from('creator_profiles')
          .insert({
            user_id: user.id,
            specialties: user.creator_profile.specialties,
            social_links: user.creator_profile.social_links,
            media_kit_url: user.creator_profile.media_kit_url,
            rate_card: user.creator_profile.rate_card,
            is_verified: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.error(`❌ Failed to create creator profile for ${user.email}:`, error.message);
          continue;
        }
        
        // Update user account type to creator if not already business
        if (user.account_type === 'consumer') {
          await supabase
            .from('users')
            .update({ 
              account_type: 'creator',
              account_upgraded_at: new Date().toISOString()
            })
            .eq('id', user.id);
        }
        
        console.log(`✅ Created creator profile for: ${user.email}`);
        
      } catch (error) {
        console.error(`❌ Error creating creator profile for ${user.email}:`, error.message);
      }
    }
  }
}

async function setupBusinessProfiles(users, restaurants) {
  console.log('\n🏢 Setting up business profiles and claiming restaurants...\n');
  
  for (const user of users) {
    if (user.restaurant_index !== undefined && restaurants[user.restaurant_index]) {
      try {
        const restaurant = restaurants[user.restaurant_index];
        
        // Check if business profile already exists
        const { data: existingProfile } = await supabase
          .from('business_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (existingProfile) {
          console.log(`✓ Business profile already exists for: ${user.email}`);
          continue;
        }
        
        // Insert business profile
        const { error: profileError } = await supabase
          .from('business_profiles')
          .insert({
            user_id: user.id,
            restaurant_id: restaurant.id,
            business_name: restaurant.name,
            business_type: 'restaurant',
            role: 'owner',
            verification_status: 'verified',
            verification_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (profileError) {
          console.error(`❌ Failed to create business profile for ${user.email}:`, profileError.message);
          continue;
        }
        
        // Update restaurant to mark as claimed
        const { error: restaurantError } = await supabase
          .from('restaurants')
          .update({
            is_claimed: true,
            claimed_by: user.id,
            verified: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', restaurant.id);
        
        if (restaurantError) {
          console.error(`❌ Failed to claim restaurant ${restaurant.name}:`, restaurantError.message);
          continue;
        }
        
        // Update user account type to business
        await supabase
          .from('users')
          .update({ 
            account_type: 'business',
            account_upgraded_at: new Date().toISOString(),
            is_restaurant: true
          })
          .eq('id', user.id);
        
        console.log(`✅ ${user.email} claimed restaurant: ${restaurant.name}`);
        
      } catch (error) {
        console.error(`❌ Error setting up business profile for ${user.email}:`, error.message);
      }
    }
  }
}

async function createSampleBoards(users) {
  console.log('\n📋 Creating sample boards for users...\n');
  
  const boardTemplates = [
    { name: 'Favorites', description: 'My all-time favorite restaurants' },
    { name: 'Date Night', description: 'Perfect spots for a romantic evening' },
    { name: 'Brunch Spots', description: 'Best places for weekend brunch' },
    { name: 'Quick Bites', description: 'Great for a quick meal' },
    { name: 'Hidden Gems', description: 'Off the beaten path discoveries' }
  ];
  
  for (const user of users.slice(0, 5)) { // Create boards for first 5 users
    try {
      const boardsToCreate = boardTemplates.slice(0, Math.floor(Math.random() * 3) + 1);
      
      for (const board of boardsToCreate) {
        const { error } = await supabase
          .from('boards')
          .insert({
            user_id: user.id,
            name: board.name,
            description: board.description,
            is_private: Math.random() > 0.7,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (!error) {
          console.log(`✅ Created board "${board.name}" for ${user.email}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error creating boards for ${user.email}:`, error.message);
    }
  }
}

async function main() {
  console.log('🚀 Starting Troodie Test Data Seeding');
  console.log('=====================================');
  
  try {
    // Create test users
    const users = await createTestUsers();
    
    // Create test restaurants
    const restaurants = await createTestRestaurants();
    
    // Setup creator profiles
    await setupCreatorProfiles(users);
    
    // Setup business profiles and claim restaurants
    await setupBusinessProfiles(users, restaurants);
    
    // Create sample boards
    await createSampleBoards(users);
    
    console.log('\n=====================================');
    console.log('✅ Test Data Seeding Complete!');
    console.log('=====================================\n');
    
    console.log('📊 Summary:');
    console.log(`- Created/verified ${users.length} test users`);
    console.log(`- Created/verified ${restaurants.length} restaurants`);
    console.log(`- All test accounts use @bypass.com emails`);
    console.log(`- Use OTP code: 000000 for all test accounts`);
    
    console.log('\n🔑 Test Account Credentials:');
    console.log('----------------------------');
    TEST_USERS.forEach(user => {
      console.log(`${user.account_type.toUpperCase()}: ${user.email} | OTP: 000000`);
    });
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the script
main();