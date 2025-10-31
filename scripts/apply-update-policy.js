const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.development' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyUpdatePolicy() {
  try {
    console.log('Applying UPDATE policy for campaign_applications...');
    
    // Test if we can update an application first
    console.log('Testing current UPDATE permissions...');
    
    // Try to update a test application to see if it works
    const { data: testApps, error: fetchError } = await supabase
      .from('campaign_applications')
      .select('id, status')
      .limit(1);

    if (fetchError) {
      console.error('Error fetching test application:', fetchError);
      return;
    }

    if (testApps && testApps.length > 0) {
      const testApp = testApps[0];
      console.log('Found test application:', testApp.id);
      
      // Try to update it
      const { error: updateError } = await supabase
        .from('campaign_applications')
        .update({ status: testApp.status }) // No-op update
        .eq('id', testApp.id);

      if (updateError) {
        console.error('❌ UPDATE failed (RLS policy missing):', updateError.message);
        console.log('This confirms the missing UPDATE policy is the issue.');
      } else {
        console.log('✅ UPDATE succeeded - policy may already exist');
      }
    }

    console.log('Note: RLS policies need to be applied via Supabase Dashboard SQL Editor');
    console.log('Go to: https://supabase.com/dashboard/project/tcultsriqunnxujqiwea/sql');
    console.log('Run the SQL from apply_update_policy.sql');
  } catch (error) {
    console.error('Error testing policies:', error);
    process.exit(1);
  }
}

applyUpdatePolicy();
