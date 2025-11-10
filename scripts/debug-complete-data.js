/**
 * Complete debug of saves, boards, and restaurants
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

async function debugCompleteData() {
  try {
    console.log('=== COMPLETE DATA DEBUG ===\n');
    
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
    
    console.log(`Testing ${testEmail}`);
    console.log(`User ID: ${user.id}`);
    console.log('=' . repeat(60));
    
    // 1. Check restaurants exist
    console.log('\n📍 RESTAURANTS CHECK:');
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('id, name')
      .limit(10);
    
    console.log(`   Total restaurants in database: ${restaurants?.length || 0}`);
    if (restaurants && restaurants.length > 0) {
      console.log('   Sample restaurants:');
      restaurants.slice(0, 3).forEach(r => {
        console.log(`     - ${r.name} (${r.id})`);
      });
    }
    
    // 2. Check boards
    console.log('\n📋 BOARDS CHECK:');
    const { data: boards, error: boardsError } = await supabase
      .from('boards')
      .select('id, title, user_id')
      .eq('user_id', user.id);
    
    console.log(`   User has ${boards?.length || 0} boards`);
    if (boards && boards.length > 0) {
      boards.forEach(b => {
        console.log(`     - ${b.title} (${b.id})`);
      });
    }
    
    // 3. Check board_restaurants (saves)
    console.log('\n💾 SAVES CHECK:');
    const { data: saves, error: savesError } = await supabase
      .from('board_restaurants')
      .select('id, board_id, restaurant_id, added_by')
      .eq('added_by', user.id)
      .limit(5);
    
    console.log(`   User has ${saves?.length || 0} saves (showing first 5)`);
    
    // 4. Check if saved restaurants exist
    if (saves && saves.length > 0) {
      console.log('\n🔗 VERIFYING SAVED RESTAURANTS EXIST:');
      
      for (const save of saves.slice(0, 3)) {
        const { data: restaurant, error: restError } = await supabase
          .from('restaurants')
          .select('id, name')
          .eq('id', save.restaurant_id)
          .single();
        
        if (restaurant) {
          console.log(`   ✅ Save ${save.id.substring(0, 8)}... -> Restaurant: ${restaurant.name}`);
        } else {
          console.log(`   ❌ Save ${save.id.substring(0, 8)}... -> Restaurant ${save.restaurant_id.substring(0, 8)}... NOT FOUND`);
        }
      }
    }
    
    // 5. Check "Your Saves" board
    console.log('\n🎯 "YOUR SAVES" BOARD CHECK:');
    const { data: yourSavesBoard } = await supabase
      .from('boards')
      .select('*')
      .eq('user_id', user.id)
      .in('title', ['Your Saves', 'Quick Saves'])
      .maybeSingle();
    
    if (yourSavesBoard) {
      console.log(`   ✅ Found "${yourSavesBoard.title}" board`);
      
      // Count saves in this board
      const { data: yourSaves, count } = await supabase
        .from('board_restaurants')
        .select('*', { count: 'exact', head: false })
        .eq('board_id', yourSavesBoard.id);
      
      console.log(`   Contains ${count || 0} saves`);
    } else {
      console.log('   ❌ No "Your Saves" or "Quick Saves" board');
      console.log('   App will fallback to showing all saves');
    }
    
    // 6. Test the service functions
    console.log('\n🧪 TESTING SERVICE FUNCTIONS:');
    
    // Test getQuickSavesRestaurants
    try {
      const boardService = {
        getUserQuickSavesBoard: async (userId) => {
          const { data } = await supabase
            .from('boards')
            .select('*')
            .eq('user_id', userId)
            .in('title', ['Your Saves', 'Quick Saves'])
            .eq('type', 'free')
            .limit(1)
            .maybeSingle();
          return data;
        },
        getQuickSavesRestaurants: async (userId, limit) => {
          const board = await boardService.getUserQuickSavesBoard(userId);
          if (!board) return [];
          
          const { data } = await supabase
            .from('board_restaurants')
            .select('*')
            .eq('board_id', board.id)
            .limit(limit || 10);
          
          return data || [];
        }
      };
      
      const quickSaves = await boardService.getQuickSavesRestaurants(user.id, 10);
      console.log(`   getQuickSavesRestaurants returned: ${quickSaves.length} saves`);
    } catch (error) {
      console.log(`   getQuickSavesRestaurants error: ${error.message}`);
    }
    
    // Test getAllUserSaves
    try {
      const { data: allSaves } = await supabase
        .from('board_restaurants')
        .select('*')
        .eq('added_by', user.id)
        .limit(10)
        .order('created_at', { ascending: false });
      
      console.log(`   getAllUserSaves would return: ${allSaves?.length || 0} saves`);
    } catch (error) {
      console.log(`   getAllUserSaves error: ${error.message}`);
    }
    
    console.log('\n' + '=' . repeat(60));
    console.log('DEBUG COMPLETE\n');
    
    console.log('📌 SUMMARY:');
    console.log(`   User: ${user.email}`);
    console.log(`   Boards: ${boards?.length || 0}`);
    console.log(`   Total Saves: ${user.saves_count || 0}`);
    console.log(`   Has "Your Saves" board: ${yourSavesBoard ? 'Yes' : 'No (will use fallback)'}`);
    console.log(`   Restaurants exist: ${restaurants && restaurants.length > 0 ? 'Yes' : 'No'}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugCompleteData();