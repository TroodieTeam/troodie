#!/bin/bash
set -e

# Configuration
MAX_ITERATIONS=${MAX_ITERATIONS:-30}
RATE_LIMIT_SECONDS=${RATE_LIMIT_SECONDS:-5}
LOG_DIR=".ralph/logs"
LOG_FILE="$LOG_DIR/ralph_$(date +%Y%m%d_%H%M%S).log"

# State
ITERATION=0
CONSECUTIVE_ERRORS=0
MAX_CONSECUTIVE_ERRORS=3

# Ensure log directory exists
mkdir -p "$LOG_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

cleanup() {
  log "Loop terminated at iteration $ITERATION"
}
trap cleanup EXIT

log "Starting Ralph Loop for Troodie (max: $MAX_ITERATIONS iterations)"
log "Log file: $LOG_FILE"

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))
  log "=== Iteration $ITERATION of $MAX_ITERATIONS ==="

  # Run Claude Code
  if OUTPUT=$(claude --print "$(cat .ralph/PROMPT.md)" 2>&1); then
    echo "$OUTPUT" >> "$LOG_FILE"
    CONSECUTIVE_ERRORS=0

    # Check for completion
    if echo "$OUTPUT" | grep -qE "(COMPLETE|ALL_DONE)"; then
      log "Task completed successfully!"
      exit 0
    fi

    # Check for human needed
    if echo "$OUTPUT" | grep -qE "(BLOCKED|NEED_HUMAN)"; then
      log "Human intervention required"
      echo "$OUTPUT" | grep -E "(BLOCKED|NEED_HUMAN)"
      exit 1
    fi

  else
    CONSECUTIVE_ERRORS=$((CONSECUTIVE_ERRORS + 1))
    log "Error in iteration (consecutive: $CONSECUTIVE_ERRORS)"

    if [ $CONSECUTIVE_ERRORS -ge $MAX_CONSECUTIVE_ERRORS ]; then
      log "Circuit breaker: Too many consecutive errors"
      exit 1
    fi
  fi

  # Rate limiting
  sleep $RATE_LIMIT_SECONDS
done

log "Reached maximum iterations"
exit 1
