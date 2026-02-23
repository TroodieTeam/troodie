#!/usr/bin/env node
/**
 * Run SQL files against production Supabase database.
 * Uses the Supabase Management API (same as CLI) to run SQL as postgres owner.
 *
 * Usage:
 *   node scripts/run-prod-sql.js <sql-file-path>
 *   node scripts/run-prod-sql.js supabase/migrations/20260218_content_submission_flow.sql
 *   node scripts/run-prod-sql.js data/test-data/prod/10-setup-robust-test-scenario.sql
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_REF = 'cacrjcekanesymdzpjtt';

function getAccessToken() {
  // Try to get from Supabase CLI keychain (macOS)
  try {
    const raw = execSync(
      'security find-generic-password -s "Supabase CLI" -w 2>/dev/null',
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    // Token is base64 encoded with prefix
    if (raw.startsWith('go-keyring-base64:')) {
      return Buffer.from(raw.replace('go-keyring-base64:', ''), 'base64').toString('utf8');
    }
    return raw;
  } catch {
    // Fall back to env var
    if (process.env.SUPABASE_ACCESS_TOKEN) {
      return process.env.SUPABASE_ACCESS_TOKEN;
    }
    throw new Error(
      'Could not find Supabase access token.\n' +
      'Run: npx supabase login\n' +
      'Or set SUPABASE_ACCESS_TOKEN env var.'
    );
  }
}

function runSqlViaApi(sql, accessToken) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });

    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data });
        } else {
          reject(new Error(`API ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(300000, () => {
      req.destroy();
      reject(new Error('Request timed out (5 min)'));
    });
    req.write(body);
    req.end();
  });
}

async function main() {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error('Usage: node scripts/run-prod-sql.js <sql-file>');
    console.error('');
    console.error('Examples:');
    console.error('  node scripts/run-prod-sql.js supabase/migrations/20260218_content_submission_flow.sql');
    console.error('  node scripts/run-prod-sql.js supabase/migrations/20260219_add_troodieapp_visibility.sql');
    console.error('  node scripts/run-prod-sql.js data/test-data/prod/10-setup-robust-test-scenario.sql');
    process.exit(1);
  }

  const fullPath = path.resolve(sqlFile);
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    process.exit(1);
  }

  console.log('='.repeat(50));
  console.log('  Production SQL Runner (Management API)');
  console.log(`  Target: ${PROJECT_REF} (production)`);
  console.log('='.repeat(50));

  const accessToken = getAccessToken();
  console.log('  Auth: Supabase CLI token');

  const sql = fs.readFileSync(fullPath, 'utf8');
  console.log(`\nRunning: ${path.basename(sqlFile)} (${sql.length} chars)`);

  try {
    const result = await runSqlViaApi(sql, accessToken);
    console.log(`\nSQL executed successfully (HTTP ${result.status})`);

    // Try to parse and show results
    try {
      const parsed = JSON.parse(result.data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach((resultSet, i) => {
          if (resultSet && resultSet.length > 0) {
            console.log(`\n  Result set ${i + 1}: ${resultSet.length} rows`);
            // Show first few rows
            resultSet.slice(0, 5).forEach(row => {
              console.log(`    ${JSON.stringify(row)}`);
            });
            if (resultSet.length > 5) {
              console.log(`    ... and ${resultSet.length - 5} more rows`);
            }
          }
        });
      }
    } catch {
      // Response might not be JSON
      if (result.data && result.data.length > 0 && result.data.length < 500) {
        console.log(`  Response: ${result.data}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
