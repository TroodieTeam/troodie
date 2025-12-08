#!/usr/bin/env node

/**
 * Automatically fix ALTER TABLE ADD COLUMN statements to be idempotent
 * by adding IF NOT EXISTS
 */

const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

function fixAddColumn(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const fixedLines = [];
  let changes = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Check if this is an ALTER TABLE ADD COLUMN line without IF NOT EXISTS
    // Match: ALTER TABLE ... ADD COLUMN ... (without IF NOT EXISTS)
    if (line.match(/ALTER TABLE.*ADD COLUMN(?!.*IF NOT EXISTS)/i)) {
      // Add IF NOT EXISTS after ADD COLUMN
      line = line.replace(
        /(ADD COLUMN\s+)(\w+)/i,
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
    const changes = fixAddColumn(filePath);
    
    if (changes > 0) {
      results[file] = changes;
      totalFixed += changes;
    }
  }

  console.log(`Fixed ${totalFixed} ALTER TABLE ADD COLUMN statements across ${Object.keys(results).length} files\n`);
  
  if (Object.keys(results).length > 0) {
    console.log('Files fixed:');
    for (const [file, count] of Object.entries(results)) {
      console.log(`  ${file}: ${count} column(s)`);
    }
  }
}

main();
