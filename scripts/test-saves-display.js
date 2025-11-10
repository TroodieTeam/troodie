/**
 * Test saves display for consumer accounts
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

async function testSavesDisplay() {
  try {
    console.log('=== TESTING SAVES DISPLAY ===\n');
    
    const testEmail = 'consumer2@bypass.com';
    
    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', testEmail)
      .single();
    
    if (userError || !user) {
      console.error('User not found');
      return;
    }
    
    console.log(`Testing ${testEmail} (${user.username})`);
    console.log(`User ID: ${user.id}`);
    console.log('=' . repeat(60));
    
    // Check for "Your Saves" board
    const { data: quickSavesBoard, error: qsError } = await supabase
      .from('boards')
      .select('*')
      .eq('user_id', user.id)
      .in('title', ['Your Saves', 'Quick Saves'])
      .eq('type', 'free')
      .maybeSingle();
    
    if (quickSavesBoard) {
      console.log(`\n✅ Found "${quickSavesBoard.title}" board (ID: ${quickSavesBoard.id})`);
      
      // Get saves from this board
      const { data: quickSaves, error: quickSavesError } = await supabase
        .from('board_restaurants')
        .select('*')
        .eq('board_id', quickSavesBoard.id);
      
      console.log(`   Contains ${quickSaves?.length || 0} saves`);
    } else {
      console.log('\n❌ No "Your Saves" or "Quick Saves" board found');
      console.log('   The Saves tab will fallback to showing all saves');
    }
    
    // Get ALL saves for the user
    const { data: allSaves, error: allSavesError } = await supabase
      .from('board_restaurants')
      .select('*')
      .eq('added_by', user.id)
      .order('created_at', { ascending: false });
    
    console.log(`\n📊 Total saves across all boards: ${allSaves?.length || 0}`);
    
    // Group saves by board
    const savesByBoard = {};
    const { data: boards } = await supabase
      .from('boards')
      .select('id, title')
      .eq('user_id', user.id);
    
    boards?.forEach(board => {
      savesByBoard[board.id] = {
        title: board.title,
        saves: 0
      };
    });
    
    allSaves?.forEach(save => {
      if (savesByBoard[save.board_id]) {
        savesByBoard[save.board_id].saves++;
      }
    });
    
    console.log('\n📋 Saves distribution by board:');
    Object.values(savesByBoard).forEach(board => {
      console.log(`   - ${board.title}: ${board.saves} saves`);
    });
    
    console.log('\n💡 Expected behavior:');
    if (quickSavesBoard) {
      console.log('   ✅ Saves tab should show saves from "Your Saves" board');
    } else {
      console.log('   ✅ Saves tab should show ALL saves (fallback)');
      console.log('   ✅ With the fix, should display up to 50 most recent saves');
    }
    
    console.log('\n' + '=' . repeat(60));
    console.log('TEST COMPLETE\n');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSavesDisplay();