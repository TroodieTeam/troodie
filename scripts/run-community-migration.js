// Script to run the community migration
// Run this with: node scripts/run-community-migration.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY/SUPABASE_ANON_KEY in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250125_create_communities.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration...');
    
    // Note: This approach won't work with the anon key due to permissions
    // The migration should be run via Supabase Dashboard SQL editor
    
    console.log('\n⚠️  IMPORTANT: Due to permission restrictions, please run this migration manually:');
    console.log('\n1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Create a new query');
    console.log('4. Copy and paste the contents of:');
    console.log(`   ${migrationPath}`);
    console.log('5. Run the query');
    console.log('\nThis will create all the necessary tables, functions, and permissions for the community feature.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

runMigration();