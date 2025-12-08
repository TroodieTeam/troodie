#!/usr/bin/env node

/**
 * Setup Production Test Users
 * 
 * This script runs the production test user setup SQL via Supabase CLI
 * or provides instructions for manual execution.
 * 
 * Usage:
 *   node scripts/setup-production-test-users.js [--project-ref=xxx]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const TEST_USERS_SQL = path.join(__dirname, '..', 'data', 'test-data', 'prod', '01-production-test-users-setup.sql');

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

function exec(command, options = {}) {
  try {
    return execSync(command, { 
      encoding: 'utf-8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
  } catch (error) {
    if (!options.silent) {
      log(`Error: ${error.message}`, 'red');
    }
    throw error;
  }
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function executeSQL(sql, description) {
  log(`\n📝 ${description}`, 'cyan');
  
  // Try using Supabase CLI psql if available
  try {
    // Check if we can use psql via Supabase CLI
    log('   Attempting to execute via Supabase CLI...', 'blue');
    
    // For now, provide instructions for manual execution
    log('\n💡 Manual Execution Required:', 'yellow');
    log('   1. Open Supabase Dashboard → SQL Editor', 'blue');
    log('   2. Copy the SQL from:', 'blue');
    log(`      ${TEST_USERS_SQL}`, 'blue');
    log('   3. Paste and run in SQL Editor', 'blue');
    log('\n   Or use psql directly:', 'blue');
    log('   psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" -f ' + TEST_USERS_SQL, 'blue');
    
    return false;
  } catch (error) {
    log(`   ❌ Failed: ${error.message}`, 'red');
    return false;
  }
}

async function verifyTestUsers() {
  log('\n🔍 Verification', 'cyan');
  log('-'.repeat(70));
  log('   Run this query in Supabase SQL Editor to verify:', 'blue');
  log('   ', 'blue');
  log('   SELECT email, account_type, is_test_account', 'blue');
  log('   FROM users', 'blue');
  log('   WHERE email LIKE \'prod-%@bypass.com\';', 'blue');
  log('   ', 'blue');
  log('   Expected: 7 test users (2 consumers, 3 creators, 2 businesses)', 'green');
}

async function main() {
  log('\n' + '='.repeat(70), 'bright');
  log('👥 Production Test Users Setup', 'bright');
  log('='.repeat(70) + '\n', 'bright');

  // Check if SQL file exists
  if (!fs.existsSync(TEST_USERS_SQL)) {
    log(`❌ Test users SQL file not found: ${TEST_USERS_SQL}`, 'red');
    process.exit(1);
  }

  log('📋 This script will set up production test accounts:', 'cyan');
  log('   - prod-consumer1@bypass.com (Consumer)', 'blue');
  log('   - prod-consumer2@bypass.com (Consumer)', 'blue');
  log('   - prod-creator1@bypass.com (Creator - Available)', 'blue');
  log('   - prod-creator2@bypass.com (Creator - Available)', 'blue');
  log('   - prod-creator3@bypass.com (Creator - Busy)', 'blue');
  log('   - prod-business1@bypass.com (Business)', 'blue');
  log('   - prod-business2@bypass.com (Business)', 'blue');
  log('\n   All accounts use OTP: 000000', 'blue');
  log('   All accounts are automatically isolated from production users', 'blue');

  const confirm = await askQuestion('\nProceed with setup? (yes/no): ');
  if (confirm.toLowerCase() !== 'yes') {
    log('❌ Setup cancelled', 'red');
    process.exit(0);
  }

  // Read SQL file
  const sql = fs.readFileSync(TEST_USERS_SQL, 'utf-8');
  
  // Execute SQL
  await executeSQL(sql, 'Setting up production test users');
  
  await verifyTestUsers();
  
  log('\n✅ Setup instructions provided above', 'green');
  log('\n📋 Next Steps:', 'cyan');
  log('   1. Run the SQL in Supabase SQL Editor', 'blue');
  log('   2. Verify test users were created', 'blue');
  log('   3. Test login with prod-creator1@bypass.com (OTP: 000000)', 'blue');
  log('   4. Continue with feature testing:', 'blue');
  log('      docs/CREATOR_MARKETPLACE_PRODUCTION_LOCAL_TESTING.md', 'blue');
}

if (require.main === module) {
  main().catch(error => {
    log(`\n❌ Unexpected error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { executeSQL, verifyTestUsers };
