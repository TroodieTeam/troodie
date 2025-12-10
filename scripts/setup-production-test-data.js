#!/usr/bin/env node

/**
 * Setup Production Test Data
 * 
 * This script provides SQL queries to set up production test data:
 * - Creates creator profiles for creator accounts
 * - Creates/claims restaurants for business accounts
 * - Sets up basic test data
 * 
 * Usage:
 *   node scripts/setup-production-test-data.js
 */

const fs = require('fs');
const path = require('path');

const SETUP_SQL = path.join(__dirname, '..', 'data', 'test-data', 'prod', '02-production-test-data-setup.sql');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function main() {
  log('\n' + '='.repeat(70), 'bright');
  log('📦 Production Test Data Setup', 'bright');
  log('='.repeat(70) + '\n', 'bright');

  // Check if SQL file exists
  if (!fs.existsSync(SETUP_SQL)) {
    log(`❌ Setup SQL file not found: ${SETUP_SQL}`, 'red');
    process.exit(1);
  }

  log('📋 This script will set up:', 'cyan');
  log('   ✅ Creator profiles for prod-creator1, prod-creator2, prod-creator3', 'blue');
  log('   ✅ Restaurants for prod-business1 and prod-business2', 'blue');
  log('   ✅ Restaurant claims linking businesses to restaurants', 'blue');
  log('   ✅ Default boards for all test users', 'blue');
  log('');

  log('💡 Instructions:', 'yellow');
  log('   1. Ensure users are synced (run sync-auth-to-public-users.sql first)', 'blue');
  log('   2. Open Supabase Dashboard → SQL Editor', 'blue');
  log('   3. Copy and paste the SQL from:', 'blue');
  log(`      ${SETUP_SQL}`, 'blue');
  log('   4. Run the SQL script', 'blue');
  log('');

  // Read and display SQL file location
  log('📝 SQL File Location:', 'cyan');
  log(`   ${SETUP_SQL}`, 'blue');
  log('');

  log('🔍 After running, verify with:', 'cyan');
  log('   node scripts/prod-test-data-helper.js creator-profiles', 'blue');
  log('   node scripts/prod-test-data-helper.js restaurants', 'blue');
  log('');
}

if (require.main === module) {
  main();
}

module.exports = { main };
