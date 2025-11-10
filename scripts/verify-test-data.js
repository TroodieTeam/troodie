/**
 * Verify test data for consumer accounts
 * This script checks what data actually exists for our test accounts
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.development' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTestData() {
  try {
    console.log('=== VERIFYING TEST DATA FOR CONSUMER ACCOUNTS ===\n');
    
    const testEmails = ['consumer1@bypass.com', 'consumer2@bypass.com', 'consumer3@bypass.com'];
    
    for (const email of testEmails) {
      console.log(`\n📧 ${email}`);
      console.log('=' . repeat(50));
      
      // Get user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (userError) {
        console.log('❌ User not found');
        continue;
      }
      
      console.log(`✅ User found: ${user.username || 'no username'}`);
      console.log(`   - ID: ${user.id}`);
      console.log(`   - saves_count field: ${user.saves_count || 0}`);
      console.log(`   - followers_count field: ${user.followers_count || 0}`);
      console.log(`   - following_count field: ${user.following_count || 0}`);
      
      // Count actual boards
      const { data: boards, error: boardsError } = await supabase
        .from('boards')
        .select('id, title')
        .eq('user_id', user.id);
      
      console.log(`\n📋 Boards: ${boards ? boards.length : 0}`);
      if (boards && boards.length > 0) {
        boards.forEach(board => {
          console.log(`   - ${board.title}`);
        });
      }
      
      // Count actual saves (board_restaurants)
      const { data: saves, error: savesError } = await supabase
        .from('board_restaurants')
        .select('id')
        .eq('added_by', user.id);
      
      console.log(`\n💾 Saves (board_restaurants): ${saves ? saves.length : 0}`);
      
      // Count actual relationships
      const { data: following, error: followingError } = await supabase
        .from('user_relationships')
        .select('id')
        .eq('follower_id', user.id);
      
      const { data: followers, error: followersError } = await supabase
        .from('user_relationships')
        .select('id')
        .eq('following_id', user.id);
      
      console.log(`\n👥 Relationships:`);
      console.log(`   - Following: ${following ? following.length : 0}`);
      console.log(`   - Followers: ${followers ? followers.length : 0}`);
      
      // Check if counts match
      console.log(`\n🔍 Verification:`);
      const savesMatch = saves && user.saves_count === saves.length;
      const followersMatch = followers && user.followers_count === followers.length;
      const followingMatch = following && user.following_count === following.length;
      
      console.log(`   - Saves count ${savesMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
      console.log(`   - Followers count ${followersMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
      console.log(`   - Following count ${followingMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
      
      // Check qualification
      const isQualified = saves && saves.length >= 40 && 
                          boards && boards.length >= 3 && 
                          (following ? following.length : 0) + (followers ? followers.length : 0) >= 5;
      
      console.log(`\n🎯 Creator Qualification: ${isQualified ? '✅ QUALIFIED' : '❌ NOT QUALIFIED'}`);
      if (!isQualified) {
        console.log(`   Needs:`);
        if (!saves || saves.length < 40) console.log(`   - ${40 - (saves ? saves.length : 0)} more saves`);
        if (!boards || boards.length < 3) console.log(`   - ${3 - (boards ? boards.length : 0)} more boards`);
        const friendCount = (following ? following.length : 0) + (followers ? followers.length : 0);
        if (friendCount < 5) console.log(`   - ${5 - friendCount} more friends`);
      }
    }
    
    console.log('\n' + '=' . repeat(50));
    console.log('VERIFICATION COMPLETE');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyTestData();