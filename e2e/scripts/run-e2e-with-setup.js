#!/usr/bin/env node
/**
 * Creator Marketplace E2E Test Orchestrator
 * 
 * Purpose: Automate the full E2E test flow including data setup
 * Target: 60 min manual → 10 min automated
 * 
 * Usage:
 *   node e2e/scripts/run-e2e-with-setup.js
 *   npm run test:e2e:marketplace:full
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_KEY',
  sqlSetupFile: path.join(__dirname, 'setup-e2e-test-data.sql'),
  maestroSuite: path.join(__dirname, '..', 'suites', 'creator-marketplace.yaml'),
  reportsDir: path.join(__dirname, '..', 'reports'),
};

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log('━'.repeat(50), 'blue');
  log(`  ${title}`, 'blue');
  log('━'.repeat(50), 'blue');
  console.log('');
}

async function runSqlSetup() {
  logSection('PHASE 1: SQL Data Setup');
  
  // Check if SQL file exists
  if (!fs.existsSync(CONFIG.sqlSetupFile)) {
    log(`❌ SQL setup file not found: ${CONFIG.sqlSetupFile}`, 'red');
    return false;
  }

  log('📋 SQL setup file ready: setup-e2e-test-data.sql', 'green');
  log('', 'reset');
  log('To run SQL setup, execute in Supabase SQL Editor:', 'yellow');
  log(`   File: ${CONFIG.sqlSetupFile}`, 'reset');
  log('', 'reset');
  log('This pre-configures:', 'reset');
  log('  ✅ Business Stripe account (skip onboarding)', 'green');
  log('  ✅ Creator Stripe account (skip onboarding)', 'green');
  log('  ✅ Paid campaign ready for applications', 'green');
  log('  ✅ Payment records in place', 'green');
  console.log('');

  // In a real implementation, you could use Supabase JS client:
  // const { createClient } = require('@supabase/supabase-js');
  // const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  // const sql = fs.readFileSync(CONFIG.sqlSetupFile, 'utf8');
  // await supabase.rpc('exec_sql', { sql_query: sql });

  return true;
}

function checkMaestro() {
  logSection('PHASE 2: Environment Check');
  
  try {
    execSync('maestro --version', { stdio: 'pipe' });
    log('✅ Maestro CLI installed', 'green');
  } catch (e) {
    log('❌ Maestro not found. Install with:', 'red');
    log("   curl -Ls 'https://get.maestro.mobile.dev' | bash", 'reset');
    return false;
  }

  // Check for running simulator
  try {
    const result = execSync('xcrun simctl list devices', { encoding: 'utf8', stdio: 'pipe' });
    if (result.includes('Booted')) {
      log('✅ iOS Simulator running', 'green');
      return true;
    }
  } catch (e) {
    // iOS check failed, try Android
  }

  try {
    const result = execSync('adb devices', { encoding: 'utf8', stdio: 'pipe' });
    if (result.includes('device')) {
      log('✅ Android Emulator running', 'green');
      return true;
    }
  } catch (e) {
    // Android check failed
  }

  log('❌ No simulator/emulator running', 'red');
  log('   Start one with: open -a Simulator (iOS)', 'reset');
  return false;
}

function runMaestroTests() {
  logSection('PHASE 3: Maestro Tests');

  // Ensure reports directory exists
  if (!fs.existsSync(CONFIG.reportsDir)) {
    fs.mkdirSync(CONFIG.reportsDir, { recursive: true });
  }

  log(`Running: ${CONFIG.maestroSuite}`, 'reset');
  console.log('');

  const startTime = Date.now();

  try {
    execSync(`maestro test "${CONFIG.maestroSuite}"`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..', '..'),
    });
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    log(`\n✅ Tests completed in ${duration} seconds`, 'green');
    return { success: true, duration };
  } catch (e) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    log(`\n❌ Tests failed after ${duration} seconds`, 'red');
    return { success: false, duration };
  }
}

function printSummary(result) {
  logSection('TEST RUN SUMMARY');
  
  const minutes = Math.floor(result.duration / 60);
  const seconds = result.duration % 60;
  
  if (result.success) {
    log(`🎉 SUCCESS!`, 'green');
  } else {
    log(`❌ FAILED`, 'red');
  }
  
  log(`Duration: ${minutes}m ${seconds}s`, 'reset');
  
  if (result.duration < 600) {
    log(`\n✅ Under 10 minute target! 🚀`, 'green');
  } else {
    log(`\n⚠️  Over 10 minute target. Consider optimization.`, 'yellow');
  }
  
  console.log('');
  log('Screenshots: e2e/reports/', 'reset');
  log('Next steps:', 'reset');
  log('  - Review screenshots for visual verification', 'reset');
  log('  - Check Supabase for data state verification', 'reset');
  console.log('');
}

async function main() {
  console.log('');
  log('═'.repeat(50), 'blue');
  log('  CREATOR MARKETPLACE E2E TEST ORCHESTRATOR', 'blue');
  log('  Target: 60 min → 10 min ⚡', 'blue');
  log('═'.repeat(50), 'blue');
  console.log('');

  // Phase 1: SQL Setup
  const sqlReady = await runSqlSetup();
  if (!sqlReady) {
    log('\n⚠️  SQL setup required. Run manually if needed.', 'yellow');
  }

  // Wait for user confirmation if running interactively
  if (process.stdin.isTTY && !process.env.CI) {
    log('\nPress Enter to continue with Maestro tests...', 'yellow');
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
  }

  // Phase 2: Environment Check
  if (!checkMaestro()) {
    process.exit(1);
  }

  // Phase 3: Run Tests
  const result = runMaestroTests();

  // Summary
  printSummary(result);

  process.exit(result.success ? 0 : 1);
}

main().catch(console.error);
