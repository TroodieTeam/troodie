#!/usr/bin/env node

/**
 * Automatically fix CREATE POLICY statements to be idempotent
 * by adding DROP POLICY IF EXISTS before each CREATE POLICY
 */

const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

function fixPolicies(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const fixedLines = [];
  let changes = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this is a CREATE POLICY line
    if (line.match(/^\s*CREATE POLICY/)) {
      // Check if DROP POLICY IF EXISTS already exists in the previous 10 lines
      const contextStart = Math.max(0, i - 10);
      const context = lines.slice(contextStart, i).join('\n');
      
      if (!context.match(/DROP POLICY IF EXISTS/)) {
        // Extract policy name and table name
        // Pattern 1: CREATE POLICY "quoted name" ON table_name
        let policyMatch = line.match(/CREATE POLICY\s+"([^"]+)"\s+ON\s+(\w+)/);
        
        // Pattern 2: CREATE POLICY policy_name ON table_name (unquoted)
        if (!policyMatch) {
          policyMatch = line.match(/CREATE POLICY\s+(\w+)\s+ON\s+(\w+)/);
        }
        
        // Pattern 3: CREATE POLICY on one line, name and ON on next lines
        if (!policyMatch) {
          // Look ahead up to 3 lines
          let combined = line;
          for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            combined += ' ' + lines[j];
            const combinedMatch = combined.match(/CREATE POLICY\s+"([^"]+)"\s+ON\s+(\w+)/);
            if (combinedMatch) {
              policyMatch = combinedMatch;
              break;
            }
            const combinedMatch2 = combined.match(/CREATE POLICY\s+(\w+)\s+ON\s+(\w+)/);
            if (combinedMatch2) {
              policyMatch = combinedMatch2;
              break;
            }
          }
        }
        
        if (policyMatch) {
          const policyName = policyMatch[1];
          const tableName = policyMatch[2];
          
          // Add DROP POLICY IF EXISTS before CREATE POLICY
          // Use quotes if original had quotes
          const quotedName = line.includes('"') ? `"${policyName}"` : policyName;
          fixedLines.push(`-- Drop policy if it exists to make migration idempotent`);
          fixedLines.push(`DROP POLICY IF EXISTS ${quotedName} ON ${tableName};`);
          changes++;
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
    const changes = fixPolicies(filePath);
    
    if (changes > 0) {
      results[file] = changes;
      totalFixed += changes;
    }
  }

  console.log(`Fixed ${totalFixed} CREATE POLICY statements across ${Object.keys(results).length} files\n`);
  
  if (Object.keys(results).length > 0) {
    console.log('Top 20 files fixed:');
    const sorted = Object.entries(results).sort((a, b) => b[1] - a[1]);
    for (const [file, count] of sorted.slice(0, 20)) {
      console.log(`  ${file}: ${count} policy(ies)`);
    }
    if (sorted.length > 20) {
      console.log(`  ... and ${sorted.length - 20} more files`);
    }
  }
}

main();
