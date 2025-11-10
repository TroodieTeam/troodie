/**
 * Test the complete saves flow
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

async function testCompleteFlow() {
  try {
    console.log('=== TESTING COMPLETE SAVES FLOW ===\n');
    
    const testEmail = 'consumer2@bypass.com';
    
    // 1. Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', testEmail)
      .single();
    
    if (!user) {
      console.error('❌ User not found');
      return;
    }
    
    console.log(`✅ User: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   saves_count: ${user.saves_count}`);
    console.log(`   followers_count: ${user.followers_count}`);
    console.log(`   following_count: ${user.following_count}`);
    
    // 2. Check boards
    const { data: boards } = await supabase
      .from('boards')
      .select('*')
      .eq('user_id', user.id);
    
    console.log(`\n✅ Boards: ${boards?.length || 0}`);
    
    // 3. Check for Your Saves board
    const yourSavesBoard = boards?.find(b => 
      b.title === 'Your Saves' || b.title === 'Quick Saves'
    );
    
    if (yourSavesBoard) {
      console.log(`✅ Has "Your Saves" board: ${yourSavesBoard.id}`);
    } else {
      console.log('⚠️  No "Your Saves" board - will use fallback');
    }
    
    // 4. Test boardService.getQuickSavesRestaurants logic
    console.log('\n📱 SIMULATING APP BEHAVIOR:');
    
    // Simulate getQuickSavesRestaurants
    if (yourSavesBoard) {
      const { data: quickSaves } = await supabase
        .from('board_restaurants')
        .select('*')
        .eq('board_id', yourSavesBoard.id)
        .limit(10);
      
      console.log(`   Quick Saves board would return: ${quickSaves?.length || 0} saves`);
    } else {
      console.log('   No Quick Saves board - triggering fallback...');
    }
    
    // Simulate getAllUserSaves fallback
    const { data: allSaves } = await supabase
      .from('board_restaurants')
      .select('*')
      .eq('added_by', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log(`   Fallback getAllUserSaves returns: ${allSaves?.length || 0} saves`);
    
    // 5. Check if saves have valid restaurants
    if (allSaves && allSaves.length > 0) {
      console.log('\n🔗 CHECKING RESTAURANT REFERENCES:');
      
      const sampleSaves = allSaves.slice(0, 3);
      for (const save of sampleSaves) {
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('name')
          .eq('id', save.restaurant_id)
          .single();
        
        if (restaurant) {
          console.log(`   ✅ Save -> ${restaurant.name}`);
        } else {
          console.log(`   ❌ Save -> Restaurant ${save.restaurant_id} NOT FOUND`);
        }
      }
    }
    
    // 6. What should be displayed
    console.log('\n📊 EXPECTED UI DISPLAY:');
    console.log(`   Homepage "Your Saves" section: ${allSaves?.length || 0} saves`);
    console.log(`   Profile "Saves" tab: ${allSaves?.length || 0} saves`);
    console.log(`   Profile "Boards" tab: ${boards?.length || 0} boards`);
    
    console.log('\n✅ If you see 0 saves in the app but this shows saves,');
    console.log('   then the issue is likely with the React state or rendering.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testCompleteFlow();