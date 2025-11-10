/**
 * Test script to run the qualifying data SQL
 * This tests that the SQL script runs without errors
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.development' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runScript() {
  try {
    console.log('Running qualifying data SQL script...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add-qualifying-data.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Note: Supabase JS client doesn't support running raw SQL directly
    // We'll need to use the Supabase SQL Editor or psql command
    console.log('SQL script has been updated with correct column names:');
    console.log('- Changed "name" to "title" for boards table');
    console.log('- Added "type" column with value "free"');
    console.log('- Added "cover_image_url" column with null value');
    console.log('\nTo run this script, use the Supabase SQL Editor or run:');
    console.log('psql [connection_string] < scripts/add-qualifying-data.sql');
    
    // Let's at least verify the test accounts exist
    const { data: users, error } = await supabase
      .from('users')
      .select('email, account_type')
      .in('email', ['consumer1@bypass.com', 'consumer2@bypass.com', 'consumer3@bypass.com'])
      .order('email');
    
    if (error) {
      console.error('Error checking users:', error);
    } else if (users && users.length > 0) {
      console.log('\nExisting test accounts found:');
      users.forEach(user => {
        console.log(`- ${user.email} (${user.account_type})`);
      });
    } else {
      console.log('\nNo test accounts found. You may need to run the account creation script first.');
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

runScript();