#!/usr/bin/env node

/**
 * Script to identify idempotency issues in migration files
 * This helps identify patterns that need to be fixed
 */

const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  // Check for CREATE TRIGGER without DROP TRIGGER IF EXISTS before it
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.match(/^\s*CREATE TRIGGER/)) {
      // Check 10 lines before for DROP TRIGGER IF EXISTS
      const contextStart = Math.max(0, i - 10);
      const context = lines.slice(contextStart, i).join('\n');
      
      // Extract trigger name and table
      const triggerMatch = line.match(/CREATE TRIGGER\s+(\w+)/);
      if (triggerMatch && !context.match(/DROP TRIGGER IF EXISTS/)) {
        const triggerName = triggerMatch[1];
        issues.push({
          type: 'CREATE_TRIGGER',
          line: i + 1,
          trigger: triggerName,
          context: line.trim()
        });
      }
    }

    // Check for CREATE INDEX without IF NOT EXISTS
    if (line.match(/^\s*CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?!.*IF NOT EXISTS)/)) {
      issues.push({
        type: 'CREATE_INDEX',
        line: i + 1,
        context: line.trim()
      });
    }

    // Check for ALTER TABLE ADD COLUMN without IF NOT EXISTS
    if (line.match(/ALTER TABLE.*ADD COLUMN(?!.*IF NOT EXISTS)/i)) {
      issues.push({
        type: 'ALTER_TABLE_ADD_COLUMN',
        line: i + 1,
        context: line.trim()
      });
    }

    // Check for CREATE POLICY without DROP POLICY IF EXISTS before it
    if (line.match(/^\s*CREATE POLICY/)) {
      const contextStart = Math.max(0, i - 10);
      const context = lines.slice(contextStart, i).join('\n');
      
      if (!context.match(/DROP POLICY IF EXISTS/)) {
        issues.push({
          type: 'CREATE_POLICY',
          line: i + 1,
          context: line.trim()
        });
      }
    }
  }

  return issues;
}

function main() {
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const results = {};
  let totalIssues = 0;

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const issues = checkFile(filePath);
    
    if (issues.length > 0) {
      results[file] = issues;
      totalIssues += issues.length;
    }
  }

  // Group by type
  const byType = {
    CREATE_TRIGGER: [],
    CREATE_INDEX: [],
    ALTER_TABLE_ADD_COLUMN: [],
    CREATE_POLICY: []
  };

  for (const [file, issues] of Object.entries(results)) {
    for (const issue of issues) {
      byType[issue.type].push({ file, ...issue });
    }
  }

  console.log('Migration Idempotency Issues Report\n');
  console.log(`Total files with issues: ${Object.keys(results).length}`);
  console.log(`Total issues found: ${totalIssues}\n`);

  console.log('By Type:');
  console.log(`  CREATE TRIGGER: ${byType.CREATE_TRIGGER.length}`);
  console.log(`  CREATE INDEX: ${byType.CREATE_INDEX.length}`);
  console.log(`  ALTER TABLE ADD COLUMN: ${byType.ALTER_TABLE_ADD_COLUMN.length}`);
  console.log(`  CREATE POLICY: ${byType.CREATE_POLICY.length}\n`);

  // Show files with CREATE TRIGGER issues (highest priority)
  if (byType.CREATE_TRIGGER.length > 0) {
    console.log('Files with CREATE TRIGGER issues (need DROP TRIGGER IF EXISTS):');
    const triggerFiles = [...new Set(byType.CREATE_TRIGGER.map(i => i.file))];
    triggerFiles.forEach(f => {
      const count = byType.CREATE_TRIGGER.filter(i => i.file === f).length;
      console.log(`  ${f} (${count} triggers)`);
    });
    console.log('');
  }

  // Write detailed report
  const reportPath = path.join(__dirname, '..', '.migration-idempotency-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({ results, byType }, null, 2));
  console.log(`Detailed report written to: ${reportPath}`);
}

main();
