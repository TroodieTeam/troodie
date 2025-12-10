#!/usr/bin/env node

/**
 * Automatically fix CREATE TRIGGER statements to be idempotent
 * by adding DROP TRIGGER IF EXISTS before each CREATE TRIGGER
 */

const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

function fixTriggers(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const fixedLines = [];
  let changes = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this is a CREATE TRIGGER line
    if (line.match(/^\s*CREATE TRIGGER/)) {
      // Check if DROP TRIGGER IF EXISTS already exists in the previous 10 lines
      const contextStart = Math.max(0, i - 10);
      const context = lines.slice(contextStart, i).join('\n');
      
      if (!context.match(/DROP TRIGGER IF EXISTS/)) {
        // Extract trigger name and table name - handle multiple patterns
        let triggerName = null;
        let tableName = null;
        
        // Pattern 1: CREATE TRIGGER name ... ON table
        const match1 = line.match(/CREATE TRIGGER\s+(\w+)\s+.*?\s+ON\s+(\w+)/);
        if (match1) {
          triggerName = match1[1];
          tableName = match1[2];
        }
        
        // Pattern 2: CREATE TRIGGER name ON table (simpler)
        if (!triggerName) {
          const match2 = line.match(/CREATE TRIGGER\s+(\w+)\s+ON\s+(\w+)/);
          if (match2) {
            triggerName = match2[1];
            tableName = match2[2];
          }
        }
        
        // Pattern 3: Look ahead to next lines for ON table
        if (!triggerName) {
          const triggerMatch = line.match(/CREATE TRIGGER\s+(\w+)/);
          if (triggerMatch) {
            triggerName = triggerMatch[1];
            // Look ahead up to 5 lines for ON table_name
            for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
              const onMatch = lines[j].match(/ON\s+(\w+)/);
              if (onMatch) {
                tableName = onMatch[1];
                break;
              }
            }
          }
        }
        
        if (triggerName && tableName) {
          // Add DROP TRIGGER IF EXISTS before CREATE TRIGGER
          fixedLines.push(`-- Drop trigger if it exists to make migration idempotent`);
          fixedLines.push(`DROP TRIGGER IF EXISTS ${triggerName} ON ${tableName};`);
          changes++;
        } else {
          // If we can't parse it, at least log it
          console.warn(`Warning: Could not parse trigger in ${path.basename(filePath)}:${i + 1}: ${line.trim()}`);
        }
      }
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
    const changes = fixTriggers(filePath);
    
    if (changes > 0) {
      results[file] = changes;
      totalFixed += changes;
    }
  }

  console.log(`Fixed ${totalFixed} CREATE TRIGGER statements across ${Object.keys(results).length} files\n`);
  
  if (Object.keys(results).length > 0) {
    console.log('Files fixed:');
    for (const [file, count] of Object.entries(results)) {
      console.log(`  ${file}: ${count} trigger(s)`);
    }
  }
}

main();
