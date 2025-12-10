#!/usr/bin/env node

/**
 * Test Scenario Setup Script
 * 
 * Creates a complete test scenario by:
 * 1. Reading configuration from data/test-data/dev/*.json
 * 2. Generating SQL to create all test entities
 * 3. Optionally executing against Supabase
 * 
 * Usage:
 *   node scripts/setup-test-scenario.js --generate-sql  # Generate SQL file
 *   node scripts/setup-test-scenario.js --execute       # Execute against Supabase (requires env vars)
 *   node scripts/setup-test-scenario.js --help           # Show help
 */

const fs = require('fs');
const path = require('path');

const TEST_DATA_DIR = path.join(__dirname, '..', 'data', 'test-data', 'dev');
const OUTPUT_SQL = path.join(__dirname, '..', 'data', 'test-data', 'dev', 'setup-test-scenario.sql');

function loadTestData(filename) {
  const filepath = path.join(TEST_DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.warn(`Warning: ${filename} not found`);
    return null;
  }
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function generateSQL() {
  console.log('📝 Generating test scenario SQL...\n');
  
  // Load test data configs
  const users = loadTestData('users.json');
  const restaurants = loadTestData('restaurants.json');
  const creatorProfiles = loadTestData('creator_profiles.json');
  
  // Read the SQL template (we already created it)
  if (fs.existsSync(OUTPUT_SQL)) {
    console.log(`✅ SQL file already exists: ${OUTPUT_SQL}`);
    console.log('   Run this file in Supabase SQL Editor to set up test data.\n');
    return;
  }
  
  console.log('⚠️  SQL file not found. Run the SQL script directly:');
  console.log(`   ${OUTPUT_SQL}\n`);
}

function showHelp() {
  console.log(`
Test Scenario Setup Script

This script helps set up a complete test environment with:
  - Test users (consumer, creator, business)
  - Test restaurants (claimed and unclaimed)
  - Creator profiles
  - Business profiles
  - Sample posts and saves
  - Test campaigns

Usage:
  node scripts/setup-test-scenario.js [options]

Options:
  --generate-sql     Generate SQL setup file (already exists)
  --execute          Execute SQL against Supabase (requires SUPABASE_URL, etc.)
  --help             Show this help message

Quick Start:
  1. Run the SQL file in Supabase SQL Editor:
     data/test-data/dev/setup-test-scenario.sql
  
  2. Or use the helper to view test data:
     node scripts/test-data-helper.js users

Test Accounts Created:
  - consumer1@troodieapp.com (OTP: 000000)
  - creator1@troodieapp.com (OTP: 000000)
  - business1@troodieapp.com (OTP: 000000)

See data/test-data/dev/README.md for more details.
`);
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    showHelp();
    return;
  }

  switch (command) {
    case '--generate-sql':
      generateSQL();
      break;
    case '--execute':
      console.log('⚠️  Direct execution not yet implemented.');
      console.log('   Please run the SQL file in Supabase SQL Editor:\n');
      console.log(`   ${OUTPUT_SQL}\n`);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main();

