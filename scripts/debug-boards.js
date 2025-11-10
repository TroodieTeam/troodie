/**
 * Debug boards and saves for test accounts
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

async function debugBoards() {
  try {
    console.log('=== DEBUGGING BOARDS FOR CONSUMER ACCOUNTS ===\n');
    
    // First, get the user IDs
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, username')
      .in('email', ['consumer1@bypass.com', 'consumer2@bypass.com', 'consumer3@bypass.com']);
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }
    
    for (const user of users) {
      console.log(`\n📧 ${user.email} (${user.username})`);
      console.log(`   User ID: ${user.id}`);
      console.log('=' . repeat(60));
      
      // Query boards directly from boards table
      const { data: boards, error: boardsError } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', user.id);
      
      if (boardsError) {
        console.error('   Error fetching boards:', boardsError);
      } else {
        console.log(`\n   📋 Boards in database: ${boards.length}`);
        boards.forEach(board => {
          console.log(`      - ${board.title} (ID: ${board.id})`);
          console.log(`        user_id: ${board.user_id}`);
          console.log(`        type: ${board.type}`);
          console.log(`        is_private: ${board.is_private}`);
        });
      }
      
      // Try querying the user_boards view (this might fail)
      console.log('\n   🔍 Attempting to query user_boards view...');
      const { data: viewBoards, error: viewError } = await supabase
        .from('user_boards')
        .select('*')
        .eq('user_id', user.id);
      
      if (viewError) {
        console.log(`   ❌ View query failed: ${viewError.message}`);
      } else {
        console.log(`   ✅ View returned ${viewBoards ? viewBoards.length : 0} boards`);
      }
      
      // Check board_restaurants (saves)
      const { data: saves, error: savesError } = await supabase
        .from('board_restaurants')
        .select('id, board_id, restaurant_id')
        .eq('added_by', user.id);
      
      if (savesError) {
        console.error('   Error fetching saves:', savesError);
      } else {
        console.log(`\n   💾 Saves (board_restaurants): ${saves.length}`);
        
        // Count saves per board
        const savesPerBoard = {};
        saves.forEach(save => {
          savesPerBoard[save.board_id] = (savesPerBoard[save.board_id] || 0) + 1;
        });
        
        console.log('   Saves distribution:');
        for (const [boardId, count] of Object.entries(savesPerBoard)) {
          const board = boards.find(b => b.id === boardId);
          console.log(`      - ${board ? board.title : 'Unknown board'}: ${count} saves`);
        }
      }
    }
    
    console.log('\n' + '=' . repeat(60));
    console.log('DEBUG COMPLETE\n');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugBoards();