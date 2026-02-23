#!/usr/bin/env node
/**
 * Run SQL files against any Supabase database (dev, staging, or production).
 * Uses the Supabase Management API to run SQL as postgres owner.
 *
 * Usage:
 *   node scripts/run-sql.js --dev <sql-file>       # Development
 *   node scripts/run-sql.js --prod <sql-file>      # Production
 *   node scripts/run-sql.js --staging <sql-file>   # Staging
 *   node scripts/run-sql.js --ref <ref> <sql-file> # Custom project ref
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECTS = {
  dev: 'tcultsriqunnxujqiwea',
  development: 'tcultsriqunnxujqiwea',
  prod: 'cacrjcekanesymdzpjtt',
  production: 'cacrjcekanesymdzpjtt',
  staging: 'gyhuhywytzdxijvlfilf',
};

function getAccessToken() {
  try {
    const raw = execSync(
      'security find-generic-password -s "Supabase CLI" -w 2>/dev/null',
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    if (raw.startsWith('go-keyring-base64:')) {
      return Buffer.from(raw.replace('go-keyring-base64:', ''), 'base64').toString('utf8');
    }
    return raw;
  } catch {
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

function runSqlViaApi(sql, accessToken, projectRef) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${projectRef}/database/query`,
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
    req.setTimeout(300000, () => { req.destroy(); reject(new Error('Request timed out (5 min)')); });
    req.write(body);
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);
  let projectRef = null;
  let envName = null;
  let sqlFile = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.replace('--', '');
      if (key === 'ref') {
        projectRef = args[++i];
        envName = 'custom';
      } else if (PROJECTS[key]) {
        projectRef = PROJECTS[key];
        envName = key;
      }
    } else {
      sqlFile = arg;
    }
  }

  if (!projectRef || !sqlFile) {
    console.error('Usage: node scripts/run-sql.js --<env> <sql-file>');
    console.error('');
    console.error('Environments:');
    console.error('  --dev        Development (tcultsriqunnxujqiwea)');
    console.error('  --prod       Production  (cacrjcekanesymdzpjtt)');
    console.error('  --staging    Staging     (gyhuhywytzdxijvlfilf)');
    console.error('  --ref <ref>  Custom project reference');
    console.error('');
    console.error('Examples:');
    console.error('  node scripts/run-sql.js --dev supabase/migrations/20260222_enable_users_realtime.sql');
    console.error('  node scripts/run-sql.js --prod supabase/migrations/20260222_enable_users_realtime.sql');
    process.exit(1);
  }

  const fullPath = path.resolve(sqlFile);
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log(`  SQL Runner — ${envName.toUpperCase()}`);
  console.log(`  Project: ${projectRef}`);
  console.log('='.repeat(60));

  const accessToken = getAccessToken();
  const sql = fs.readFileSync(fullPath, 'utf8');
  console.log(`\nRunning: ${path.basename(sqlFile)} (${sql.length} chars)`);

  try {
    const result = await runSqlViaApi(sql, accessToken, projectRef);
    console.log(`\nSQL executed successfully (HTTP ${result.status})`);
    try {
      const parsed = JSON.parse(result.data);
      // Management API returns array of result sets (one per statement)
      if (Array.isArray(parsed)) {
        parsed.forEach((resultSet, i) => {
          if (Array.isArray(resultSet) && resultSet.length > 0) {
            console.log(`\n  Result set ${i + 1}: ${resultSet.length} rows`);
            resultSet.slice(0, 10).forEach(row => {
              console.log(`    ${JSON.stringify(row)}`);
            });
            if (resultSet.length > 10) {
              console.log(`    ... and ${resultSet.length - 10} more rows`);
            }
          } else if (resultSet && typeof resultSet === 'object' && !Array.isArray(resultSet)) {
            console.log(`\n  Result ${i + 1}: ${JSON.stringify(resultSet)}`);
          }
        });
      } else if (parsed && typeof parsed === 'object') {
        console.log(`\n  Response: ${JSON.stringify(parsed, null, 2)}`);
      }
    } catch {
      if (result.data && result.data.length > 0 && result.data.length < 1000) {
        console.log(`  Raw response: ${result.data}`);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  }
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
