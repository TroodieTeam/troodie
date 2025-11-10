/**
 * Apply TMC-001 Migration Directly to Remote Database
 * This script applies the Troodie-Managed Campaigns schema migration
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tcultsriqunnxujqiwea.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjdWx0c3JpcXVubnh1anFpd2VhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjY4MTkzMywiZXhwIjoyMDcyMjU3OTMzfQ.DbNO7VYCKt8PIbSxPg8Dngmo38w-zVNjV2Q8sfbbLEI';

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applyMigration() {
  console.log('🚀 Applying TMC-001 Migration: Troodie-Managed Campaigns Schema');
  console.log('');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251013_troodie_managed_campaigns_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📂 Read migration file: 20251013_troodie_managed_campaigns_schema.sql');
    console.log(`📝 Migration size: ${migrationSQL.length} characters`);
    console.log('');

    // Execute the migration SQL
    console.log('⚙️  Executing migration SQL...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ Error applying migration:', error);
      process.exit(1);
    }

    console.log('✅ TMC-001 Migration applied successfully!');
    console.log('');
    console.log('Changes applied:');
    console.log('  • restaurants.is_platform_managed column');
    console.log('  • restaurants.managed_by column');
    console.log('  • campaigns.campaign_source column');
    console.log('  • campaigns.is_subsidized column');
    console.log('  • campaigns.subsidy_amount_cents column');
    console.log('  • platform_managed_campaigns table');
    console.log('  • RLS policies for admin access');
    console.log('  • Automatic spend tracking triggers');
    console.log('  • Metrics tracking triggers');
    console.log('  • troodie_campaigns_summary view');
    console.log('');
    console.log('✅ Next step: Run TMC-002 (Create system account)');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

// Run the migration
applyMigration();
