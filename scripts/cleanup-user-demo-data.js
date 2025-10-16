#!/usr/bin/env node

/**
 * User Demo Data Cleanup Script for Troodie
 *
 * Removes all demo-tagged data for a specific user while preserving their profile.
 * This script deletes all records with a demo_session_id associated with the user.
 *
 * Usage: node scripts/cleanup-user-demo-data.js --email=your@email.com [--session=demo_session_id]
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.development' });

// Parse CLI arguments
const args = process.argv.slice(2);
const getArg = (name) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : null;
};

const userEmail = getArg('email');
const sessionId = getArg('session'); // Optional: cleanup specific session only

if (!userEmail) {
  console.error('❌ Error: --email argument is required');
  console.log('\nUsage: node scripts/cleanup-user-demo-data.js --email=your@email.com [--session=demo_session_id]');
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

/**
 * Helper function to delete records with demo_session_id
 */
async function deleteFromTable(tableName, userId, sessionId = null) {
  try {
    let query = supabase
      .from(tableName)
      .delete()
      .eq('user_id', userId)
      .not('demo_session_id', 'is', null);

    // If specific session ID provided, only delete that session
    if (sessionId) {
      query = query.eq('demo_session_id', sessionId);
    }

    const { data, error, count } = await query.select();

    if (error) {
      console.error(`❌ Error deleting from ${tableName}:`, error.message);
      return 0;
    }

    const deletedCount = data ? data.length : 0;
    if (deletedCount > 0) {
      console.log(`✅ Deleted ${deletedCount} records from ${tableName}`);
    }

    return deletedCount;

  } catch (error) {
    console.error(`❌ Error processing ${tableName}:`, error.message);
    return 0;
  }
}

/**
 * Delete board_restaurants (restaurant saves to boards)
 */
async function deleteBoardRestaurants(userId, sessionId = null) {
  try {
    let query = supabase
      .from('board_restaurants')
      .delete()
      .eq('added_by', userId)
      .not('demo_session_id', 'is', null);

    if (sessionId) {
      query = query.eq('demo_session_id', sessionId);
    }

    const { data, error } = await query.select();

    if (error) {
      console.error(`❌ Error deleting from board_restaurants:`, error.message);
      return 0;
    }

    const deletedCount = data ? data.length : 0;
    if (deletedCount > 0) {
      console.log(`✅ Deleted ${deletedCount} restaurant saves from boards`);
    }

    return deletedCount;

  } catch (error) {
    console.error(`❌ Error processing board_restaurants:`, error.message);
    return 0;
  }
}

/**
 * Delete user_relationships (uses follower_id and following_id)
 */
async function deleteUserRelationships(userId, sessionId = null) {
  try {
    let query = supabase
      .from('user_relationships')
      .delete()
      .eq('follower_id', userId) // User is the follower
      .not('demo_session_id', 'is', null);

    if (sessionId) {
      query = query.eq('demo_session_id', sessionId);
    }

    const { data, error } = await query.select();

    if (error) {
      console.error(`❌ Error deleting from user_relationships:`, error.message);
      return 0;
    }

    const deletedCount = data ? data.length : 0;
    if (deletedCount > 0) {
      console.log(`✅ Deleted ${deletedCount} records from user_relationships`);
    }

    return deletedCount;

  } catch (error) {
    console.error(`❌ Error processing user_relationships:`, error.message);
    return 0;
  }
}

/**
 * Get count of demo data before deletion
 */
async function getDemoDataCounts(userId) {
  const counts = {};

  try {
    // Boards
    const { count: boardsCount } = await supabase
      .from('boards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('demo_session_id', 'is', null);
    counts.boards = boardsCount || 0;

    // Board restaurants (restaurant saves)
    const { count: boardRestaurantsCount } = await supabase
      .from('board_restaurants')
      .select('*', { count: 'exact', head: true })
      .eq('added_by', userId)
      .not('demo_session_id', 'is', null);
    counts.saves = boardRestaurantsCount || 0;

    // Posts
    const { count: postsCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('demo_session_id', 'is', null);
    counts.posts = postsCount || 0;

    // User relationships
    const { count: relationshipsCount } = await supabase
      .from('user_relationships')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId) // User is the follower
      .not('demo_session_id', 'is', null);
    counts.relationships = relationshipsCount || 0;

    return counts;

  } catch (error) {
    console.error('❌ Error getting counts:', error.message);
    return counts;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🧹 Starting User Demo Data Cleanup');
  console.log('====================================');
  console.log(`📧 User Email: ${userEmail}`);
  if (sessionId) {
    console.log(`🆔 Session ID: ${sessionId}`);
  } else {
    console.log('🆔 Session ID: ALL demo sessions');
  }

  try {
    // Verify user exists
    console.log(`\n🔍 Verifying user: ${userEmail}...\n`);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, account_type, username')
      .eq('email', userEmail)
      .single();

    if (error || !user) {
      console.error(`❌ User not found: ${userEmail}`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.name || user.username} (${user.account_type})`);
    console.log(`   ID: ${user.id}`);

    // Get current counts
    console.log('\n📊 Scanning for demo data...\n');
    const counts = await getDemoDataCounts(user.id);

    const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);

    if (totalRecords === 0) {
      console.log('✨ No demo data found. Nothing to clean up!');
      return;
    }

    console.log('Found demo data:');
    if (counts.boards > 0) console.log(`  - ${counts.boards} boards`);
    if (counts.saves > 0) console.log(`  - ${counts.saves} restaurant saves`);
    if (counts.posts > 0) console.log(`  - ${counts.posts} posts`);
    if (counts.relationships > 0) console.log(`  - ${counts.relationships} follow connections`);

    console.log(`\n  Total: ${totalRecords} records\n`);

    // Confirm deletion
    console.log('⚠️  This will DELETE all demo-tagged data for this user.');
    console.log('⚠️  The user profile will be preserved.\n');

    // Delete data (in order to respect foreign key constraints)
    console.log('🗑️  Deleting demo data...\n');

    let totalDeleted = 0;

    // 1. Delete junction table records first
    totalDeleted += await deleteBoardRestaurants(user.id, sessionId);

    // 2. Delete dependent records
    totalDeleted += await deleteFromTable('posts', user.id, sessionId);
    totalDeleted += await deleteUserRelationships(user.id, sessionId);

    // 3. Delete boards last
    totalDeleted += await deleteFromTable('boards', user.id, sessionId);

    console.log('\n====================================');
    console.log('✅ Cleanup Complete!');
    console.log('====================================\n');

    console.log('📊 Summary:');
    console.log(`- Deleted ${totalDeleted} total records`);
    console.log(`- User profile preserved: ${user.name || user.username}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the script
main();
