#!/usr/bin/env node

/**
 * Script to run the migration to fix restaurant_id nullable issue
 * Run this with: node scripts/run-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Get Supabase credentials from environment
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('Make sure EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting migration to fix restaurant_id nullable issue...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250808_fix_restaurant_id_nullable.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL loaded successfully');
    console.log('⏳ Running migration...\n');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    }).single();

    if (error) {
      // If exec_sql doesn't exist, try a direct query (this might not work with all Supabase setups)
      console.log('⚠️  exec_sql function not available, attempting alternative method...');
      
      // Split the migration into individual statements and run them
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        // Note: This approach might not work - you may need to run the migration directly in Supabase dashboard
      }
      
      console.log('\n⚠️  Could not run migration automatically.');
      console.log('📋 Please run the following SQL in your Supabase SQL editor:');
      console.log('-----------------------------------------------------------');
      console.log(migrationSQL);
      console.log('-----------------------------------------------------------');
      return;
    }

    console.log('✅ Migration completed successfully!');
    console.log('📝 restaurant_id is now nullable for simple posts');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📋 Please run the migration manually in Supabase SQL editor:');
    console.log('   1. Go to your Supabase dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Copy and paste the contents of:');
    console.log('      supabase/migrations/20250808_fix_restaurant_id_nullable.sql');
    console.log('   4. Run the query');
  }
}

// Run the migration
runMigration();