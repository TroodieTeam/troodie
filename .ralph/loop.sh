#!/bin/bash
set -e

# ============================================================
# Ralph Loop - AFK Mode for Troodie
# ============================================================

# Configuration
MAX_ITERATIONS=${MAX_ITERATIONS:-30}
RATE_LIMIT_SECONDS=${RATE_LIMIT_SECONDS:-5}
PROMPT_FILE=${PROMPT_FILE:-.ralph/PROMPT.md}
LOG_DIR=".ralph/logs"
LOG_FILE="$LOG_DIR/ralph_$(date +%Y%m%d_%H%M%S).log"

# State
ITERATION=0
CONSECUTIVE_ERRORS=0
MAX_CONSECUTIVE_ERRORS=3
SAME_OUTPUT_COUNT=0
LAST_OUTPUT_HASH=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure log directory exists
mkdir -p "$LOG_DIR"

log() {
  local color=$1
  local message=$2
  echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] $message${NC}" | tee -a "$LOG_FILE"
}

log_info() { log "$BLUE" "$1"; }
log_success() { log "$GREEN" "$1"; }
log_warning() { log "$YELLOW" "$1"; }
log_error() { log "$RED" "$1"; }

cleanup() {
  log_info "Loop terminated at iteration $ITERATION"
  log_info "Log file: $LOG_FILE"
}
trap cleanup EXIT

# Header
echo ""
log_info "=============================================="
log_info "  Ralph Loop - AFK Mode"
log_info "  Project: Troodie"
log_info "  Max Iterations: $MAX_ITERATIONS"
log_info "  Rate Limit: ${RATE_LIMIT_SECONDS}s"
log_info "  Prompt: $PROMPT_FILE"
log_info "=============================================="
echo ""

# Main loop
while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))
  log_info "=== Iteration $ITERATION of $MAX_ITERATIONS ==="

  # Run Claude Code
  if OUTPUT=$(claude --print --dangerously-skip-permissions "$(cat $PROMPT_FILE)" 2>&1); then
    echo "$OUTPUT" >> "$LOG_FILE"
    CONSECUTIVE_ERRORS=0

    # Stuck loop detection via output hash
    OUTPUT_HASH=$(echo "$OUTPUT" | md5 -q 2>/dev/null || echo "$OUTPUT" | md5sum | cut -d' ' -f1)

    if [ "$OUTPUT_HASH" = "$LAST_OUTPUT_HASH" ]; then
      SAME_OUTPUT_COUNT=$((SAME_OUTPUT_COUNT + 1))
      log_warning "Same output detected ($SAME_OUTPUT_COUNT consecutive)"

      if [ $SAME_OUTPUT_COUNT -ge 3 ]; then
        log_error "Circuit breaker: Loop appears stuck (same output 3x)"
        log_error "Review the log file for details: $LOG_FILE"
        exit 1
      fi
    else
      SAME_OUTPUT_COUNT=0
    fi
    LAST_OUTPUT_HASH="$OUTPUT_HASH"

    # Check for completion signals
    if echo "$OUTPUT" | grep -qE "^COMPLETE$|ALL_DONE"; then
      log_success "=============================================="
      log_success "  ALL TASKS COMPLETED SUCCESSFULLY!"
      log_success "=============================================="
      exit 0
    fi

    # Check for blocker signals
    if echo "$OUTPUT" | grep -qE "^BLOCKED:|^NEED_HUMAN:"; then
      log_warning "=============================================="
      log_warning "  HUMAN INTERVENTION REQUIRED"
      log_warning "=============================================="
      echo "$OUTPUT" | grep -E "^BLOCKED:|^NEED_HUMAN:" | tee -a "$LOG_FILE"
      exit 1
    fi

    # Check for continue signal
    if echo "$OUTPUT" | grep -qE "^CONTINUE$"; then
      log_success "Task completed, continuing to next..."
    fi

  else
    CONSECUTIVE_ERRORS=$((CONSECUTIVE_ERRORS + 1))
    log_error "Error in iteration (consecutive: $CONSECUTIVE_ERRORS)"

    if [ $CONSECUTIVE_ERRORS -ge $MAX_CONSECUTIVE_ERRORS ]; then
      log_error "Circuit breaker: Too many consecutive errors ($MAX_CONSECUTIVE_ERRORS)"
      exit 1
    fi
  fi

  # Rate limiting
  log_info "Waiting ${RATE_LIMIT_SECONDS}s before next iteration..."
  sleep $RATE_LIMIT_SECONDS
done

log_warning "=============================================="
log_warning "  MAX ITERATIONS REACHED ($MAX_ITERATIONS)"
log_warning "  Check .ralph/PROGRESS.md for status"
log_warning "=============================================="
exit 1
