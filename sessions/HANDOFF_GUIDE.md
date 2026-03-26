# Session Handoffs

This directory contains session handoff documents for tracking development progress across Claude Code sessions.

## Purpose

Handoff documents ensure continuity between development sessions by capturing:
- What was accomplished
- Which files were changed
- How to test the changes
- What remains to be done

## Naming Convention

Files follow this pattern:
```
YYYY-MM-DD-feature-name.md
```

Examples:
- `2024-01-15-creator-marketplace.md`
- `2024-01-16-board-invitations-fix.md`

## Creating a Handoff

1. Copy `HANDOFF_TEMPLATE.md` or use `./generate-handoff.sh`
2. Fill in all sections
3. Update status: COMPLETE, READY FOR TESTING, or BLOCKED

## Quick Reference

| Status | Meaning |
|--------|---------|
| COMPLETE | All work done, tests pass |
| READY FOR TESTING | Implementation done, needs QA |
| BLOCKED | Cannot proceed, see Known Issues |
