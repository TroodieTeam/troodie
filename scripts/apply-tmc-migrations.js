/**
 * Apply TMC-001 and TMC-002 Migrations
 * This script applies the Troodie-Managed Campaigns migrations directly
 */

const fs = require('fs');
const path = require('path');

// Read environment from .env.development
const envPath = path.join(__dirname, '..', '.env.development');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const SUPABASE_URL = envVars.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('============================================================================');
console.log('🚀 Deploying Troodie-Managed Campaigns (TMC-001 & TMC-002)');
console.log('============================================================================');
console.log('');
console.log(`📍 Project: ${SUPABASE_URL}`);
console.log('');

// Function to execute SQL via REST API
async function executeSQL(sql, description) {
  console.log(`⚙️  ${description}...`);

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ Failed: ${error}`);
    return false;
  }

  console.log('✅ Success');
  return true;
}

async function main() {
  console.log('============================================================================');
  console.log('📊 Step 1: Deploying TMC-001 - Database Schema Migration');
  console.log('============================================================================');
  console.log('');

  // Read TMC-001 migration
  const tmc001Path = path.join(__dirname, '..', 'supabase', 'migrations', '20251013_troodie_managed_campaigns_schema.sql');
  const tmc001SQL = fs.readFileSync(tmc001Path, 'utf-8');

  console.log('Note: This script requires direct database access.');
  console.log('Please run the migrations manually using one of these methods:');
  console.log('');
  console.log('Method 1: Use Supabase Dashboard SQL Editor');
  console.log('  1. Go to: ' + SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/').replace('.supabase.co', '') + '/sql/new');
  console.log('  2. Copy the SQL from: supabase/migrations/20251013_troodie_managed_campaigns_schema.sql');
  console.log('  3. Paste and run in SQL editor');
  console.log('');
  console.log('Method 2: Use the deployment script');
  console.log('  chmod +x deploy-tmc-001-002.sh');
  console.log('  ./deploy-tmc-001-002.sh');
  console.log('');
  console.log('Method 3: Use psql (if you have database password)');
  const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
  console.log(`  psql "postgresql://postgres:[PASSWORD]@db.${projectRef}.supabase.co:5432/postgres" -f supabase/migrations/20251013_troodie_managed_campaigns_schema.sql`);
  console.log('');

  console.log('============================================================================');
  console.log('TMC-001 Changes to Apply:');
  console.log('============================================================================');
  console.log('  • restaurants.is_platform_managed - Flag for Troodie-owned restaurants');
  console.log('  • restaurants.managed_by - Who manages this restaurant');
  console.log('  • campaigns.campaign_source - Campaign source tracking');
  console.log('  • campaigns.is_subsidized - Subsidy flag');
  console.log('  • campaigns.subsidy_amount_cents - Subsidy amount');
  console.log('  • platform_managed_campaigns table - Internal campaign tracking');
  console.log('  • RLS policies - Admin-only access to platform campaigns');
  console.log('  • Triggers - Auto-update spend and metrics');
  console.log('  • View - troodie_campaigns_summary');
  console.log('');

  console.log('============================================================================');
  console.log('📊 TMC-002: System Account Creation');
  console.log('============================================================================');
  console.log('');
  console.log('After TMC-001 is applied, run the seed script:');
  console.log(`  psql "postgresql://postgres:[PASSWORD]@db.${projectRef}.supabase.co:5432/postgres" -f supabase/seeds/create_troodie_system_account.sql`);
  console.log('');
  console.log('Or use Supabase Dashboard SQL Editor to run the contents of:');
  console.log('  supabase/seeds/create_troodie_system_account.sql');
  console.log('');

  console.log('============================================================================');
  console.log('📝 Manual Step Required After TMC-002');
  console.log('============================================================================');
  console.log('');
  console.log('Create auth.users record in Supabase Auth Dashboard:');
  console.log('  1. Go to: ' + SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/').replace('.supabase.co', '') + '/auth/users');
  console.log('  2. Click "Add User" → "Create new user"');
  console.log('  3. Email: kouame@troodieapp.com');
  console.log('  4. Password: (set a secure password)');
  console.log('  5. IMPORTANT: User ID must be: 00000000-0000-0000-0000-000000000001');
  console.log('');
  console.log('To update UUID after creation (if needed):');
  console.log(`  UPDATE auth.users SET id = '00000000-0000-0000-0000-000000000001' WHERE email = 'kouame@troodieapp.com';`);
  console.log('');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
