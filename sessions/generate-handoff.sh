#!/bin/bash
# Generate a session handoff document with git diff information

# Get current date
DATE=$(date +%Y-%m-%d)

# Get feature name from argument or prompt
if [ -z "$1" ]; then
    read -p "Feature name (lowercase-with-dashes): " FEATURE_NAME
else
    FEATURE_NAME=$1
fi

# Get current branch
BRANCH=$(git branch --show-current)

# Create filename
FILENAME="sessions/${DATE}-${FEATURE_NAME}.md"

# Get list of modified files
MODIFIED_FILES=$(git diff --name-only HEAD~5 2>/dev/null || git diff --name-only)

# Generate file content
cat > "$FILENAME" << EOF
# Session Handoff: ${FEATURE_NAME}

**Date:** ${DATE}
**Branch:** \`${BRANCH}\`
**Status:** READY FOR TESTING

## Summary
<!-- 2-3 sentences: what was done and why -->

## Changes Made
- Feature 1: Description

## Files Modified
| File | Change | Description |
|------|--------|-------------|
EOF

# Add each modified file to the table
for file in $MODIFIED_FILES; do
    echo "| \`$file\` | Modified | TODO: add description |" >> "$FILENAME"
done

cat >> "$FILENAME" << 'EOF'

## Testing Instructions

### Test 1: [Name]
1. Step
2. Step
3. **Expected:** Result

## Known Issues
- [ ] None

## Next Steps
1. Review and merge PR

## Links
- PR: #xxx
- Docs: `/docs/xxx.md`
EOF

echo "Created: $FILENAME"
echo "Don't forget to fill in the TODOs!"
