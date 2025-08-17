#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.test' });

// Initialize Supabase client with service key for admin access
const supabase = createClient(
  process.env.SUPABASE_TEST_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

const TEST_DATA = {
  users: [
    {
      email: 'test@troodie.com',
      name: 'Test User',
      username: 'testuser',
      bio: 'E2E Test User Account'
    },
    {
      email: 'test2@troodie.com',
      name: 'Test Friend',
      username: 'testfriend',
      bio: 'Friend for E2E Testing'
    }
  ],
  restaurants: [
    {
      id: 'test-restaurant-1',
      name: 'Test Pizza Palace',
      cuisine_types: ['Italian', 'Pizza'],
      price_level: 2,
      rating: 4.5,
      description: 'Test restaurant for E2E testing',
      address: '123 Test St, Test City, TC 12345',
      latitude: 40.7128,
      longitude: -74.0060
    },
    {
      id: 'test-restaurant-2',
      name: 'Test Sushi Spot',
      cuisine_types: ['Japanese', 'Sushi'],
      price_level: 3,
      rating: 4.8,
      description: 'Another test restaurant',
      address: '456 Test Ave, Test City, TC 12345',
      latitude: 40.7580,
      longitude: -73.9855
    }
  ],
  posts: [
    {
      caption: 'Amazing test pizza!',
      rating: 5,
      restaurant_id: 'test-restaurant-1',
      privacy: 'public'
    },
    {
      caption: 'Great sushi for testing',
      rating: 4,
      restaurant_id: 'test-restaurant-2',
      privacy: 'public'
    }
  ]
};

async function seedTestData() {
  console.log('🌱 Seeding test data...');
  
  try {
    // Create test users
    console.log('Creating test users...');
    for (const user of TEST_DATA.users) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'TestPassword123!',
        email_confirm: true
      });
      
      if (authError && !authError.message.includes('already exists')) {
        console.error(`Failed to create user ${user.email}:`, authError);
        continue;
      }
      
      if (authData?.user) {
        // Update user profile
        await supabase
          .from('users')
          .upsert({
            id: authData.user.id,
            ...user,
            created_at: new Date().toISOString()
          });
      }
    }
    
    // Create test restaurants
    console.log('Creating test restaurants...');
    const { error: restaurantError } = await supabase
      .from('restaurants')
      .upsert(TEST_DATA.restaurants);
    
    if (restaurantError) {
      console.error('Failed to create restaurants:', restaurantError);
    }
    
    // Create test posts
    console.log('Creating test posts...');
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'test@troodie.com')
      .single();
    
    if (users) {
      for (const post of TEST_DATA.posts) {
        await supabase
          .from('posts')
          .insert({
            ...post,
            user_id: users.id,
            created_at: new Date().toISOString()
          });
      }
    }
    
    // Create follow relationships
    console.log('Creating follow relationships...');
    const { data: user1 } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'test@troodie.com')
      .single();
      
    const { data: user2 } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'test2@troodie.com')
      .single();
    
    if (user1 && user2) {
      await supabase
        .from('user_relationships')
        .upsert({
          follower_id: user2.id,
          following_id: user1.id
        });
    }
    
    console.log('✅ Test data seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    process.exit(1);
  }
}

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  try {
    // Delete test posts
    await supabase
      .from('posts')
      .delete()
      .in('restaurant_id', ['test-restaurant-1', 'test-restaurant-2']);
    
    // Delete test restaurants
    await supabase
      .from('restaurants')
      .delete()
      .like('id', 'test-%');
    
    // Delete test users
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .like('email', 'test%@troodie.com');
    
    if (users) {
      for (const user of users) {
        await supabase.auth.admin.deleteUser(user.id);
      }
    }
    
    console.log('✅ Test data cleaned up successfully!');
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
    process.exit(1);
  }
}

// CLI commands
const command = process.argv[2];

switch (command) {
  case 'seed':
    seedTestData();
    break;
  case 'cleanup':
    cleanupTestData();
    break;
  case 'reset':
    cleanupTestData().then(() => seedTestData());
    break;
  default:
    console.log(`
Usage: node test-data.js [command]

Commands:
  seed     - Create test data
  cleanup  - Remove test data
  reset    - Cleanup and reseed test data
    `);
}

module.exports = { seedTestData, cleanupTestData };