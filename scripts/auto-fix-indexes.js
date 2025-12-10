#!/usr/bin/env node

/**
 * Automatically fix CREATE INDEX statements to be idempotent
 * by adding IF NOT EXISTS
 */

const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

function fixIndexes(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const fixedLines = [];
  let changes = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Check if this is a CREATE INDEX line without IF NOT EXISTS
    if (line.match(/^\s*CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?!.*IF NOT EXISTS)/)) {
      // Add IF NOT EXISTS after INDEX
      line = line.replace(
        /(CREATE\s+(?:UNIQUE\s+)?INDEX\s+)(\w+)/,
        '$1IF NOT EXISTS $2'
      );
      changes++;
    }
    
    fixedLines.push(line);
  }

  if (changes > 0) {
    fs.writeFileSync(filePath, fixedLines.join('\n'), 'utf8');
    return changes;
  }
  
  return 0;
}

function main() {
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const results = {};
  let totalFixed = 0;

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const changes = fixIndexes(filePath);
    
    if (changes > 0) {
      results[file] = changes;
      totalFixed += changes;
    }
  }

  console.log(`Fixed ${totalFixed} CREATE INDEX statements across ${Object.keys(results).length} files\n`);
  
  if (Object.keys(results).length > 0) {
    console.log('Files fixed:');
    for (const [file, count] of Object.entries(results)) {
      console.log(`  ${file}: ${count} index(es)`);
    }
  }
}

main();
