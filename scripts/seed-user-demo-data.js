#!/usr/bin/env node

/**
 * User Demo Data Seeding Script for Troodie
 *
 * Creates realistic demo data for a real user account to showcase features.
 * All data is tagged with a demo_session_id for easy cleanup.
 *
 * Usage: node scripts/seed-user-demo-data.js --email=your@email.com [--scenario=consumer-light]
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.development' });

// Parse CLI arguments
const args = process.argv.slice(2);
const getArg = (name) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : null;
};

const userEmail = getArg('email');
const scenario = getArg('scenario') || 'consumer-light';

if (!userEmail) {
  console.error('❌ Error: --email argument is required');
  console.log('\nUsage: node scripts/seed-user-demo-data.js --email=your@email.com [--scenario=consumer-light]');
  process.exit(1);
}

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env.development file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Generate unique demo session ID
const demoSessionId = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper: Get random items from array
const getRandomItems = (array, count) => {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Helper: Generate random date in the past (days ago)
const randomPastDate = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date.toISOString();
};

// Helper: Get random rating
const randomRating = () => {
  const ratings = ['red', 'yellow', 'green'];
  return ratings[Math.floor(Math.random() * ratings.length)];
};

// Sample board names and descriptions
const BOARD_TEMPLATES = [
  { name: 'Date Night Spots', description: 'Perfect restaurants for a romantic evening' },
  { name: 'Weekend Brunch', description: 'My favorite brunch places' },
  { name: 'Quick Lunch', description: 'Great spots for a quick meal' },
  { name: 'Hidden Gems', description: 'Off the beaten path discoveries' },
  { name: 'Budget Eats', description: 'Delicious food without breaking the bank' },
  { name: 'Fine Dining', description: 'Special occasion restaurants' },
  { name: 'Vegetarian Friendly', description: 'Great veggie options' },
  { name: 'Late Night Eats', description: 'For when hunger strikes late' }
];

// Sample post captions/reviews
const POST_TEMPLATES = [
  'Absolutely loved this place! The {dish} was incredible.',
  'Hidden gem alert! 🌟 Everything here is delicious.',
  'Can\'t stop thinking about the {dish}. Must try!',
  'New favorite spot! Great ambiance and amazing food.',
  'The {dish} here is next level. Highly recommend!',
  'Perfect spot for {occasion}. Will definitely be back.',
  'This place never disappoints. Consistently amazing.',
  'Just discovered this gem and I\'m obsessed!',
  'The vibes here are immaculate. Food is incredible too.',
  'Best {dish} I\'ve had in a long time!'
];

const DISHES = ['pasta', 'burger', 'sushi', 'pizza', 'tacos', 'ramen', 'salad', 'steak', 'dessert', 'cocktails'];
const OCCASIONS = ['date night', 'brunch', 'lunch', 'dinner', 'happy hour', 'a celebration'];

/**
 * SCENARIO CONFIGURATION
 */
const SCENARIOS = {
  'consumer-light': {
    saves: 15,
    boards: 3,
    posts: 10,
    friends: 5
  }
};

const config = SCENARIOS[scenario];
if (!config) {
  console.error(`❌ Unknown scenario: ${scenario}`);
  console.log(`\nAvailable scenarios: ${Object.keys(SCENARIOS).join(', ')}`);
  process.exit(1);
}

/**
 * Main seeding functions
 */

async function verifyUser() {
  console.log(`\n🔍 Verifying user: ${userEmail}...\n`);

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, name, account_type, username')
    .eq('email', userEmail)
    .single();

  if (error || !user) {
    console.error(`❌ User not found: ${userEmail}`);
    console.log('\nMake sure the user exists in the database.');
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.name || user.username} (${user.account_type})`);
  console.log(`   ID: ${user.id}`);

  return user;
}

async function loadRestaurants() {
  console.log('\n📖 Loading restaurant data...\n');

  const restaurantFile = path.join(__dirname, '..', 'data', 'restaurants_rows.json');

  if (!fs.existsSync(restaurantFile)) {
    console.error(`❌ Restaurant file not found: ${restaurantFile}`);
    console.error(`\nPlease place your restaurant JSON file at:`);
    console.error(`   ${restaurantFile}`);
    console.error(`\nSee data/README.md for details.`);
    process.exit(1);
  }

  const restaurantData = JSON.parse(fs.readFileSync(restaurantFile, 'utf8'));
  console.log(`✅ Loaded ${restaurantData.length} restaurants from file`);

  return restaurantData;
}

async function createBoards(user, count) {
  console.log(`\n📋 Creating ${count} boards...\n`);

  const boardsToCreate = getRandomItems(BOARD_TEMPLATES, count);
  const createdBoards = [];

  for (const boardTemplate of boardsToCreate) {
    try {
      const boardData = {
        user_id: user.id,
        title: boardTemplate.name, // Use 'title' not 'name'
        description: boardTemplate.description,
        type: 'free', // Use 'type' not 'board_type'
        demo_session_id: demoSessionId,
        created_at: randomPastDate(90),
        updated_at: new Date().toISOString()
      };

      const { data: board, error } = await supabase
        .from('boards')
        .insert(boardData)
        .select('id, title')
        .single();

      if (error) {
        console.error(`❌ Failed to create board "${boardTemplate.name}":`, error.message);
        continue;
      }

      console.log(`✅ Created board: "${board.title}"`);
      createdBoards.push(board);

    } catch (error) {
      console.error(`❌ Error creating board:`, error.message);
    }
  }

  return createdBoards;
}

async function createRestaurantSaves(user, restaurants, count, boards) {
  console.log(`\n🍽️ Creating ${count} restaurant saves...\n`);

  if (boards.length === 0) {
    console.log('⚠️  No boards available. Skipping restaurant saves.');
    return [];
  }

  const selectedRestaurants = getRandomItems(restaurants, count);
  const createdSaves = [];

  for (const restaurant of selectedRestaurants) {
    try {
      const rating = Math.floor(Math.random() * 5) + 1; // 1-5 rating
      const notes = Math.random() > 0.5 ? 'Great experience! Would recommend.' : null;

      // Pick a random board for this save
      const randomBoard = boards[Math.floor(Math.random() * boards.length)];

      // Get current max position for the board
      const { data: existingRestaurants } = await supabase
        .from('board_restaurants')
        .select('position')
        .eq('board_id', randomBoard.id)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = existingRestaurants && existingRestaurants[0]
        ? existingRestaurants[0].position + 1
        : 0;

      // Use board_restaurants table (like the app does)
      const { error } = await supabase
        .from('board_restaurants')
        .insert({
          board_id: randomBoard.id,
          restaurant_id: restaurant.id,
          added_by: user.id,
          position: nextPosition,
          notes: notes,
          rating: rating,
          demo_session_id: demoSessionId,
          added_at: randomPastDate(120)
        });

      if (error) {
        // Skip if restaurant already in board (duplicate key)
        if (error.code === '23505') {
          console.log(`⚠️  ${restaurant.name} already in board (skipped)`);
          continue;
        }
        console.error(`❌ Failed to save restaurant "${restaurant.name}":`, error.message);
        continue;
      }

      console.log(`✅ Saved: ${restaurant.name}`);
      console.log(`   └─ Added to board: "${randomBoard.title}"`);
      createdSaves.push({
        board_id: randomBoard.id,
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name
      });

    } catch (error) {
      console.error(`❌ Error saving restaurant:`, error.message);
    }
  }

  return createdSaves;
}

async function createPosts(user, restaurants, count) {
  console.log(`\n✍️ Creating ${count} posts...\n`);

  const selectedRestaurants = getRandomItems(restaurants, count);
  const createdPosts = [];

  for (const restaurant of selectedRestaurants) {
    try {
      // Generate caption from template
      const template = POST_TEMPLATES[Math.floor(Math.random() * POST_TEMPLATES.length)];
      const dish = DISHES[Math.floor(Math.random() * DISHES.length)];
      const occasion = OCCASIONS[Math.floor(Math.random() * OCCASIONS.length)];
      const caption = template
        .replace('{dish}', dish)
        .replace('{occasion}', occasion);

      // Rating for posts is 1-5 integer (not traffic light)
      const numericRating = Math.floor(Math.random() * 5) + 1;

      const postData = {
        user_id: user.id,
        restaurant_id: restaurant.id,
        caption: caption,
        rating: numericRating, // Integer 1-5
        post_type: 'simple', // Use 'simple' as default post_type
        privacy: 'public', // Use 'privacy' not 'visibility'
        demo_session_id: demoSessionId,
        created_at: randomPastDate(90),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('posts')
        .insert(postData);

      if (error) {
        console.error(`❌ Failed to create post for "${restaurant.name}":`, error.message);
        continue;
      }

      console.log(`✅ Posted about: ${restaurant.name}`);
      console.log(`   Caption: "${caption.substring(0, 50)}..."`);
      createdPosts.push({ ...postData, restaurant_name: restaurant.name });

    } catch (error) {
      console.error(`❌ Error creating post:`, error.message);
    }
  }

  return createdPosts;
}

async function createFriendConnections(user, count) {
  console.log(`\n👥 Creating ${count} follow connections...\n`);

  try {
    // Get random users from the database (excluding the current user)
    const { data: potentialFollows, error } = await supabase
      .from('users')
      .select('id, name, username')
      .neq('id', user.id)
      .limit(count * 2); // Get more than needed

    if (error || !potentialFollows || potentialFollows.length === 0) {
      console.log('⚠️  No other users found in database. Skipping follow connections.');
      return [];
    }

    const selectedUsers = getRandomItems(potentialFollows, Math.min(count, potentialFollows.length));
    const createdRelationships = [];

    for (const otherUser of selectedUsers) {
      try {
        // Create a follow relationship (user follows otherUser)
        const { error: relError } = await supabase
          .from('user_relationships')
          .insert({
            follower_id: user.id, // Current user follows
            following_id: otherUser.id, // This other user
            demo_session_id: demoSessionId,
            created_at: randomPastDate(180)
          });

        if (relError) {
          // Skip if already following (duplicate key constraint)
          if (relError.message.includes('duplicate key') || relError.code === '23505') {
            console.log(`⚠️  Already following: ${otherUser.name || otherUser.username} (skipped)`);
            continue;
          }
          console.error(`❌ Failed to follow ${otherUser.name || otherUser.username}:`, relError.message);
          continue;
        }

        console.log(`✅ Following: ${otherUser.name || otherUser.username}`);
        createdRelationships.push({
          follower_id: user.id,
          following_id: otherUser.id,
          user_name: otherUser.name || otherUser.username
        });

      } catch (error) {
        console.error(`❌ Error creating relationship:`, error.message);
      }
    }

    return createdRelationships;

  } catch (error) {
    console.error(`❌ Error creating follow connections:`, error.message);
    return [];
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting User Demo Data Seeding');
  console.log('====================================');
  console.log(`📧 User Email: ${userEmail}`);
  console.log(`🎯 Scenario: ${scenario}`);
  console.log(`🆔 Demo Session ID: ${demoSessionId}`);

  try {
    // 1. Verify user exists
    const user = await verifyUser();

    // 2. Load restaurant data
    const restaurants = await loadRestaurants();

    // 3. Create boards
    const boards = await createBoards(user, config.boards);

    // 4. Create restaurant saves
    const saves = await createRestaurantSaves(user, restaurants, config.saves, boards);

    // 5. Create posts
    const posts = await createPosts(user, restaurants, config.posts);

    // 6. Create friend connections
    const friends = await createFriendConnections(user, config.friends);

    console.log('\n====================================');
    console.log('✅ Demo Data Seeding Complete!');
    console.log('====================================\n');

    console.log('📊 Summary:');
    console.log(`- Created ${boards.length} boards`);
    console.log(`- Created ${saves.length} restaurant saves`);
    console.log(`- Created ${posts.length} posts`);
    console.log(`- Created ${friends.length} follow connections`);

    console.log(`\n🔑 Demo Session ID: ${demoSessionId}`);
    console.log('   Use this ID to clean up the demo data later.\n');

    console.log('🧹 To cleanup this demo data, run:');
    console.log(`   node scripts/cleanup-user-demo-data.js --email=${userEmail}\n`);

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the script
main();
