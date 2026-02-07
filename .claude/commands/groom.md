---
argument-hint: [vague ticket text, OR idea-name from specs/ideas/, OR --approve feature-name followed by answers]
description: Refine a vague ticket or idea into a technical spec with stakeholder questions, or approve with answers
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion
---

# Groom: Spec Refinement & Deliberation

You are a senior technical product manager. Your job is to transform vague input into a precise, actionable technical spec — OR to approve an existing spec by incorporating stakeholder answers.

## Input

<input>$ARGUMENTS</input>

## Detect Input Mode

Examine the input and determine which mode to use:

### Mode 1: Approve — input starts with `--approve`

The input format is: `--approve [feature-name] [answers...]`

Answers can be in any of these formats:
- `Q1: answer text` / `Q2: answer text`
- `1: answer text` / `2: answer text`
- `1. answer text` / `2. answer text`
- Free-form text after the feature name (you'll map it to questions intelligently)

**Steps:**
1. Parse the feature name from the input (first token after `--approve`)
2. Read `specs/features/[feature-name]/status.md` — verify status is `DELIBERATE`
3. Read `specs/features/[feature-name]/questions.md` — get the pending questions
4. Read `specs/features/[feature-name]/spec.md` — get the current spec
5. Parse the answers from the input
6. For each answer:
   - Update the corresponding question in `questions.md`: replace `_pending_` with the answer
   - Incorporate the answer into the relevant section of `spec.md` (update design decisions, scope, etc.)
7. Check if any **Priority Questions** still have `_pending_` answers
   - If yes: print which questions are still pending and STOP (status stays DELIBERATE)
   - If no: proceed to approval
8. Update `status.md`:
   - Change Status to `APPROVED`
   - Update Last Updated timestamp
   - Add entry to Status History
9. Print confirmation: feature name, status change, and pointer to `/execute [feature-name]`

**STOP after Mode 1 steps. Do not continue to Mode 2 or 3.**

---

### Mode 2: Idea Reference — input matches an existing idea file

Check if `specs/ideas/[input].md` exists (try the input as-is, kebab-cased, or with common variations).

If found:
1. Read the idea file as rich starting context
2. Proceed to the **Grooming Process** below with the idea content as input

---

### Mode 3: Raw Ticket — default

Use the raw input text directly and proceed to the **Grooming Process** below.

---

## Grooming Process (Modes 2 & 3)

### Step 1: Context Gathering

1. Read `CLAUDE.md` to understand architecture and conventions
2. Use Glob to find related files:
   - `services/**/*.ts` — related services
   - `app/**/*.tsx` — related screens
   - `components/**/*.tsx` — related components
   - `hooks/**/*.ts` — related hooks
   - `supabase/migrations/**/*.sql` — schema patterns
   - `types/**/*.ts` — related types
3. Use Grep to search for specific patterns, function names, table names related to the feature
4. Read the most relevant files (up to 10) to deeply understand existing patterns
5. Check recent migrations in `supabase/migrations/` to understand the current schema evolution

### Step 2: Generate Feature Name

Create a kebab-case feature name:
- Max 4-5 words, descriptive
- If coming from an idea (Mode 2), use the same slug
- If from raw ticket (Mode 3), derive from the core concept

### Step 3: Create Feature Directory

Create `specs/features/[feature-name]/` with three files:

---

### File 1: `spec.md`

Write a comprehensive technical spec:

```markdown
# [Feature Name] Technical Specification

> Status: DELIBERATE
> Created: [YYYY-MM-DD]
> Source: [raw ticket text or "idea: specs/ideas/[slug].md"]
> Feature: [feature-name]

## Overview

[2-3 sentence summary of what this feature does and why it matters]

## Problem Statement

[What problem does this solve? Who has this problem? What's the impact of not solving it?]

## User Stories

- As a [user type], I want to [action] so that [benefit]
- ...

## User Experience

### Screens & Views

| Screen | Purpose | Entry Points | Account Types |
|--------|---------|--------------|---------------|
| ...    | ...     | ...          | ...           |

### User Flows

1. **[Flow Name]**
   - Step 1: [User action] → [System response]
   - Step 2: ...

### Components

- [ ] `[ComponentName]` — [description, props, behavior]
- ...

### States

| State | Visual | Trigger |
|-------|--------|---------|
| Loading | [description] | [when] |
| Empty | [description] | [when] |
| Error | [description] | [when] |
| Success | [description] | [when] |

## Technical Design

### Database Schema

#### New Tables
```sql
-- [table description]
CREATE TABLE [table_name] (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- fields...
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Schema Changes
- Table: [existing_table]
  - Add: [field] [type] — [reason]

#### RLS Policies
```sql
-- [Policy description]
CREATE POLICY "[policy_name]" ON [table]
  FOR [action] TO authenticated
  USING ([condition]);
```

### Services

| Service | File | Methods | Description |
|---------|------|---------|-------------|
| ...     | `services/[name].ts` | [method list] | [what it does] |

### Hooks

| Hook | File | Purpose | Dependencies |
|------|------|---------|--------------|
| ...  | `hooks/[name].ts` | [purpose] | [services/contexts used] |

### Navigation Changes

- [Route changes, new screens, tab modifications]

### Integration Points

- [Existing service]: [how this feature integrates]
- ...

## Security

### Access Control

| Action | Consumer | Creator | Business | Unauthenticated |
|--------|----------|---------|----------|-----------------|
| ...    | ...      | ...     | ...      | ...             |

### Data Protection

- [What sensitive data exists and how it's protected]

## Edge Cases

| Scenario | Expected Behavior | Implementation Note |
|----------|-------------------|---------------------|
| ...      | ...               | ...                 |

## Error Handling

| Error Condition | User Message | Recovery Action |
|-----------------|--------------|-----------------|
| ...             | ...          | ...             |

## Implementation Phases

### Phase 1: [Name] (MVP)
**Goal**: [What this achieves]

#### Tasks
- [ ] **Task 1.1**: [Title]
  - Files: [files to create/modify]
  - Acceptance: [how to verify]
- [ ] **Task 1.2**: ...

### Phase 2: [Name]
**Goal**: [What this achieves]
**Depends on**: Phase 1

#### Tasks
- [ ] **Task 2.1**: ...

### Phase 3: [Name] (if applicable)
**Goal**: [What this achieves]
**Depends on**: Phase 2

#### Tasks
- [ ] **Task 3.1**: ...

## Testing Requirements

### Unit Tests
- [ ] [Test description]

### E2E Tests (Maestro)
- [ ] [Flow description]

### Manual Testing
- [ ] [Scenario description]

## Acceptance Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- ...
```

---

### File 2: `questions.md`

Write stakeholder questions categorized by priority:

```markdown
# Stakeholder Questions: [Feature Name]

> Feature: [feature-name]
> Spec: `specs/features/[feature-name]/spec.md`
> Created: [YYYY-MM-DD]

## Priority Questions (Blocking)

These MUST be answered before implementation can begin.

### Q1: [Question]
- **Context**: [What you found in the codebase that prompted this question]
- **Options**:
  - A) [Option] — [tradeoff]
  - B) [Option] — [tradeoff]
- **AI Recommendation**: [Your recommendation and why]
- **Answer**: _pending_

### Q2: [Question]
- **Context**: ...
- **Options**: ...
- **AI Recommendation**: ...
- **Answer**: _pending_

## Design Tradeoffs (Affects Scope)

These have sensible defaults but stakeholder input is valuable.

### Q3: [Question]
- **Context**: ...
- **Options**: ...
- **AI Recommendation**: ...
- **Default if unanswered**: [What the AI will assume]
- **Answer**: _pending_

## Nice-to-Know (Non-blocking)

These provide helpful context but won't block implementation.

### Q4: [Question]
- **Context**: ...
- **Answer**: _pending_

---

## How to Approve

Once Priority Questions are answered, approve the spec:

```
/groom --approve [feature-name] Q1: [answer] Q2: [answer] Q3: [answer or "use default"]
```

Design Tradeoffs default to AI recommendations if not explicitly answered.
Nice-to-Know questions are optional.
```

---

### File 3: `status.md`

```markdown
# Status: [Feature Name]

| Field | Value |
|-------|-------|
| **Status** | DELIBERATE |
| **Created** | [YYYY-MM-DD] |
| **Last Updated** | [YYYY-MM-DD] |
| **Source** | [raw ticket or idea reference] |
| **Spec** | `specs/features/[feature-name]/spec.md` |
| **Questions** | `specs/features/[feature-name]/questions.md` |
| **Branch** | -- |
| **Implementation Plan** | -- |
| **Progress** | -- |

## Status History

| Date | From | To | Note |
|------|------|----|------|
| [YYYY-MM-DD] | -- | DELIBERATE | Initial spec created via /groom |
```

---

### Step 4: Print Summary

After creating all three files, print:
- Feature name and directory path
- Number of priority questions that need answers
- Brief scope summary (phases, task count)
- The exact `/groom --approve` command to use

## Rules

1. **Be thorough** — read enough code to make the spec accurate, not aspirational
2. **Reference real files** — every service, hook, and component you mention should correspond to actual patterns in the codebase (or be clearly marked as "new")
3. **SQL must be valid** — schema changes should follow existing migration patterns
4. **Questions should be genuine** — don't ask questions you can answer from the code. Only ask about product decisions, scope choices, and design tradeoffs that need human judgment
5. **Keep phases small** — each phase should be independently valuable and deliverable
6. **For Mode 1 (approve)**: do NOT regenerate the spec from scratch. Edit the existing spec to incorporate answers
