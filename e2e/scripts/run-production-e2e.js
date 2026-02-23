#!/usr/bin/env node
/**
 * Production E2E Test Orchestrator
 *
 * Runs Maestro E2E tests against the production environment.
 * Uses robust test data (prod-*@bypass.com accounts).
 *
 * Usage:
 *   node e2e/scripts/run-production-e2e.js
 *   npm run test:e2e:production
 *
 * Prerequisites:
 *   1. Expo dev server running with production env:
 *      npm run start:production
 *   2. Robust test data seeded in production Supabase
 *   3. iOS Simulator or Android Emulator with dev build
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SUITE_FILE = path.join(__dirname, '..', 'suites', 'production.yaml');
const REPORTS_DIR = path.join(__dirname, '..', 'reports', 'production');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function section(title) {
  console.log('');
  log('─'.repeat(50), 'blue');
  log(`  ${title}`, 'blue');
  log('─'.repeat(50), 'blue');
}

function checkPrerequisites() {
  section('Checking Prerequisites');

  // Check Maestro
  try {
    const version = execSync('maestro --version', { encoding: 'utf8', stdio: 'pipe' }).trim();
    log(`  Maestro: ${version}`, 'green');
  } catch {
    log('  Maestro: NOT INSTALLED', 'red');
    log('  Install: curl -Ls "https://get.maestro.mobile.dev" | bash', 'dim');
    return false;
  }

  // Check suite file
  if (!fs.existsSync(SUITE_FILE)) {
    log(`  Suite file: MISSING (${SUITE_FILE})`, 'red');
    return false;
  }
  log(`  Suite file: OK`, 'green');

  // Check simulator/emulator
  let deviceFound = false;
  try {
    const result = execSync('xcrun simctl list devices booted', { encoding: 'utf8', stdio: 'pipe' });
    if (result.includes('Booted')) {
      log('  iOS Simulator: RUNNING', 'green');
      deviceFound = true;
    }
  } catch { /* not iOS */ }

  if (!deviceFound) {
    try {
      const result = execSync('adb devices', { encoding: 'utf8', stdio: 'pipe' });
      const lines = result.trim().split('\n').filter(l => l.includes('device') && !l.includes('List'));
      if (lines.length > 0) {
        log('  Android Emulator: RUNNING', 'green');
        deviceFound = true;
      }
    } catch { /* not Android */ }
  }

  if (!deviceFound) {
    log('  Device: NOT FOUND', 'red');
    log('  Start a simulator: open -a Simulator', 'dim');
    return false;
  }

  // Reminder about Expo
  log('', 'reset');
  log('  Make sure Expo dev server is running:', 'yellow');
  log('    npm run start:production', 'dim');

  return true;
}

function runTests() {
  section('Running Production E2E Tests');

  // Create reports dir
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const startTime = Date.now();

  try {
    execSync(`maestro test "${SUITE_FILE}"`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..', '..'),
    });

    const duration = Math.round((Date.now() - startTime) / 1000);
    return { success: true, duration };
  } catch {
    const duration = Math.round((Date.now() - startTime) / 1000);
    return { success: false, duration };
  }
}

function printSummary(result) {
  section('Results');

  const minutes = Math.floor(result.duration / 60);
  const seconds = result.duration % 60;

  if (result.success) {
    log('  PASSED', 'green');
  } else {
    log('  FAILED', 'red');
  }

  log(`  Duration: ${minutes}m ${seconds}s`, 'reset');
  log(`  Screenshots: e2e/reports/production/`, 'dim');
  console.log('');

  log('  Test accounts used:', 'reset');
  log('    prod-consumer1@bypass.com  (login, feed)', 'dim');
  log('    prod-consumer4@bypass.com  (social)', 'dim');
  log('    prod-consumer7@bypass.com  (restaurants)', 'dim');
  log('    prod-creator1@bypass.com   (campaigns)', 'dim');
  log('    prod-creator3@bypass.com   (earnings)', 'dim');
  log('    prod-business2@bypass.com  (applications)', 'dim');
  log('    prod-business3@bypass.com  (deliverables)', 'dim');
  console.log('');
}

// Main
console.log('');
log('  PRODUCTION E2E TEST RUNNER', 'blue');
log('  v1.0.16.b1 | Robust Test Data', 'dim');
console.log('');

if (!checkPrerequisites()) {
  log('\nPrerequisites not met. Fix the issues above and retry.', 'red');
  process.exit(1);
}

const result = runTests();
printSummary(result);
process.exit(result.success ? 0 : 1);
