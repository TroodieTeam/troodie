---
argument-hint: [idea, feature request, or concept in a sentence or two]
description: Expand a raw idea into a structured idea spec grounded in the Troodie codebase
allowed-tools: Read, Write, Glob, Grep, Bash
---

# Explore: Idea Expansion

You are a product-minded engineer. Your job is to take a raw idea and expand it into a structured idea spec grounded in the actual Troodie codebase. You do NOT ask questions — you research the codebase and produce output.

## Input

<idea>$ARGUMENTS</idea>

## Process

### Step 1: Understand the Codebase Context

1. Read `CLAUDE.md` to understand the project architecture, patterns, and conventions.
2. Based on the idea, use Glob and Grep to find related files:
   - Search for related services in `services/`
   - Search for related screens in `app/`
   - Search for related components in `components/`
   - Search for related hooks in `hooks/`
   - Search for related database tables in `supabase/migrations/`
   - Search for related types in `types/` and `lib/supabase.ts`
3. Read the most relevant files (up to 5-8 files) to understand what already exists.

### Step 2: Analyze Feasibility

Based on what you found:
- What infrastructure already exists that this idea can build on?
- What's completely new and needs to be built from scratch?
- What are the technical risks or unknowns?
- What external dependencies or integrations are needed?
- What database changes would be required?

### Step 3: Assess Complexity

Rate the idea as one of:
- **Small**: 1-3 tasks, single service/screen, no schema changes
- **Medium**: 4-8 tasks, multiple services/screens, minor schema changes
- **Large**: 9+ tasks, new subsystem, significant schema changes, new integrations

### Step 4: Generate Slug

Create a kebab-case slug from the idea:
- Max 4-5 words
- Remove filler words (the, a, an, for, to, of, with, and)
- Use descriptive nouns and verbs
- Examples: "board-update-push-notifications", "creator-analytics-dashboard", "restaurant-photo-moderation"

### Step 5: Write the Idea Spec

Write the file to `specs/ideas/[slug].md`.

## Output Format

Write the following to `specs/ideas/[slug].md`:

```markdown
# Idea: [Human-readable title]

> Status: DRAFT
> Created: [YYYY-MM-DD]
> Source: /explore
> Slug: [slug]

## Problem Statement

[What problem does this solve? Who has this problem? Why does it matter?]

## User Value

[What value does this deliver to users? Which account types benefit? How does it improve their experience?]

## Rough Scope

### What Already Exists
- [List existing infrastructure, services, components, database tables that are relevant]
- [Reference specific files with paths]

### What Needs to Be Built
- [List new services, screens, components, database changes needed]
- [Be specific about what's new vs what's a modification]

### Navigation / UX Sketch
- [Where does this feature live in the app?]
- [How does the user discover and access it?]
- [What's the basic flow?]

## Open Questions

[Things that need human input before this can become a full spec. These are genuine unknowns, not things you can figure out from the code.]

1. [Question 1]
2. [Question 2]
3. ...

## Feasibility Notes

- **Complexity**: [Small/Medium/Large]
- **Technical Risk**: [Low/Medium/High] — [brief explanation]
- **Dependencies**: [List any external dependencies, APIs, or services needed]
- **Effort Estimate**: [Rough t-shirt size and what drives the estimate]

## Codebase References

| Area | File | Relevance |
|------|------|-----------|
| [Service/Screen/etc] | [file path] | [Why it's relevant] |
| ... | ... | ... |

## Next Steps

To refine this idea into a full technical spec with stakeholder questions, run:
```
/groom [slug]
```
```

## Rules

1. **Do NOT use AskUserQuestion** — this skill is non-interactive
2. **Do NOT invent features** — only describe what the idea implies
3. **Ground everything in the codebase** — reference actual files and patterns
4. **Be honest about unknowns** — flag them as Open Questions
5. **Be concise** — this is an idea spec, not a full technical spec
6. After writing the file, print a brief summary: the slug, complexity rating, and what the key open questions are
