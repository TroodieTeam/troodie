# Development Workflow Optimization Guide

## Executive Summary
This guide provides an optimized workflow for efficient development sessions with AI assistants, focusing on clear communication, context management, and first-time task completion success.

## Core Problem Analysis

Based on your development patterns, the main inefficiencies are:
1. **Context Gaps**: AI lacks understanding of existing architecture and patterns
2. **Vague Requirements**: Tasks described without clear success criteria
3. **Missing Dependencies**: Not specifying related files or systems
4. **Assumption Mismatches**: AI makes incorrect assumptions about tech stack or patterns
5. **Rework Cycles**: Multiple iterations due to incomplete initial context

## Optimized Workflow Process

### 1. Pre-Development Setup

#### A. Context Documentation
Maintain these files in your project:

```markdown
# docs/CLAUDE.md
Tech Stack:
- Frontend: React Native (Expo)
- Backend: Supabase (PostgreSQL)
- Auth: Supabase Auth (Email OTP)
- Storage: Supabase Storage
- State: React hooks + Context API
- Navigation: Expo Router

Code Conventions:
- TypeScript for all files
- Functional components only
- Custom hooks in hooks/
- Services in services/
- Async/await over promises
- Error boundaries for critical flows

Testing Commands:
- npm run lint
- npm run typecheck
- npm test

Common Patterns:
- Loading states: useLoading hook
- Error handling: try/catch with user feedback
- Data fetching: services layer with caching
- Image upload: ImageUploadServiceV2
```

#### B. Task Planning Template
Before starting any development session, fill this out:

```markdown
## Task: [Feature Name]

### Current State
- What exists now:
- Related files:
- Database tables involved:

### Desired Outcome
- User story:
- Success criteria:
- UI/UX requirements:

### Technical Requirements
- New components needed:
- API endpoints:
- Database changes:
- State management:

### Constraints
- Must use existing: [patterns/services]
- Cannot modify: [protected files]
- Performance requirements:
- Security considerations:
```

### 2. Prompt Engineering Templates

#### A. Feature Implementation Prompt

```markdown
I need to implement [FEATURE NAME] for my React Native app.

**Context:**
- Current implementation: [describe what exists]
- Tech stack: React Native, Expo, Supabase, TypeScript
- Relevant files:
  - [file1.tsx] - handles X
  - [file2.ts] - provides Y service
  - Database tables: [table1, table2]

**Requirements:**
1. [Specific requirement 1]
2. [Specific requirement 2]
3. Must follow existing patterns in [reference file]

**Success Criteria:**
- [ ] User can [action]
- [ ] Data persists to [table]
- [ ] Error states handled
- [ ] Loading states shown
- [ ] Follows existing UI patterns

**Implementation Approach:**
Please:
1. Review the existing patterns first
2. Create/modify necessary files
3. Include error handling
4. Add TypeScript types
5. Follow our naming conventions

**Files to modify/create:**
- [ ] Component: app/[path]/[name].tsx
- [ ] Service: services/[name]Service.ts
- [ ] Types: types/[name].ts
- [ ] Database: migrations/[name].sql (if needed)
```

#### B. Bug Fix Prompt

```markdown
Bug: [DESCRIPTION]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. Expected: [behavior]
4. Actual: [behavior]

**Context:**
- File where error occurs: [path]
- Error message: [exact error]
- Related components: [list]
- Database queries involved: [list]

**Investigation Needed:**
- Check [specific area]
- Verify [assumption]
- Test [edge case]

Please diagnose and fix the issue, explaining the root cause.
```

#### C. Refactoring Prompt

```markdown
Refactor: [COMPONENT/SERVICE NAME]

**Current Issues:**
- [Issue 1]
- [Issue 2]

**Files to Refactor:**
- [file1.tsx]: [specific problems]
- [file2.ts]: [specific problems]

**Refactoring Goals:**
- [ ] Improve [performance/readability/maintainability]
- [ ] Extract [common logic/components]
- [ ] Add proper TypeScript types
- [ ] Reduce complexity from X to Y

**Constraints:**
- Maintain backward compatibility
- Keep same public API
- Don't break existing tests
- Follow patterns from [reference file]

**Testing:**
After refactoring, these should still work:
- [Feature 1]
- [Feature 2]
```

### 3. Context Management System

#### A. Session Context File
Create a temporary file for each development session:

```markdown
# .session/2024-01-13-creator-marketplace.md

## Session Goal
Implement creator marketplace MVP

## Files Modified
- [x] app/creator/onboarding.tsx - Created
- [x] services/creatorService.ts - Added functions
- [ ] types/creator.ts - Pending

## Database Changes
- [x] creator_profiles table extended
- [ ] Migration script created

## Dependencies Added
- None

## Testing Status
- [ ] Lint check
- [ ] Type check
- [ ] Manual testing

## Notes for Next Session
- Need to add error handling for X
- Consider caching for Y
- Review performance of Z
```

#### B. Component Documentation Template

```typescript
/**
 * ComponentName
 *
 * Purpose: [What this component does]
 *
 * Props:
 * - prop1: [description]
 * - prop2: [description]
 *
 * State:
 * - state1: [what it tracks]
 *
 * Dependencies:
 * - Service1: [how it's used]
 * - Hook1: [what for]
 *
 * Database:
 * - Reads from: [tables]
 * - Writes to: [tables]
 *
 * Related Components:
 * - Component1: [relationship]
 */
```

### 4. Efficient Communication Patterns

#### A. Information Hierarchy
Structure your prompts with most important info first:

```
1. WHAT: Clear task description
2. WHERE: Specific files/locations
3. HOW: Preferred approach/patterns
4. CONSTRAINTS: What not to change
5. VALIDATION: How to verify success
```

#### B. Use Concrete Examples

Instead of:
```
"Make the creator onboarding flow better"
```

Use:
```
"Simplify creator onboarding from 7 steps to 3:
1. Profile info (name, bio, location)
2. Portfolio upload (3-5 images)
3. Instant activation
Remove: social media connection, rate setting, manual review
Reference: app/onboarding/ for user onboarding patterns"
```

#### C. Specify Output Format

```markdown
Please provide:
1. List of files to be modified
2. Database migrations needed
3. Step-by-step implementation
4. Code with inline comments
5. Testing checklist
```

### 5. Common Context Snippets

#### A. Supabase Patterns

```markdown
**Supabase Context:**
- Auth: Email OTP, no passwords
- Profile creation: After OTP verification via ensure_user_profile()
- Image upload: Use ImageUploadServiceV2
- RLS: Enabled on all tables
- Error handling: Check for PGRST errors
- Real-time: Use channels for live updates
```

#### B. React Native Patterns

```markdown
**React Native Context:**
- Navigation: Expo Router file-based
- State: useState + Context for global
- Forms: React Hook Form
- Styling: StyleSheet + themed components
- Images: Expo Image component
- Permissions: expo-permissions
```

#### C. Database Patterns

```markdown
**Database Context:**
- Soft deletes: Use deleted_at timestamp
- Audit fields: created_at, updated_at on all tables
- UUIDs: All IDs are UUID type
- Relationships: Foreign keys with CASCADE
- Functions: PostgreSQL functions for complex logic
- Triggers: For automated updates
```

### 6. Testing & Validation Checklist

#### Pre-Implementation
- [ ] Related files identified
- [ ] Database schema reviewed
- [ ] Existing patterns studied
- [ ] Edge cases considered
- [ ] Error scenarios planned

#### During Implementation
- [ ] Following existing patterns
- [ ] TypeScript types added
- [ ] Error handling included
- [ ] Loading states managed
- [ ] Comments added for complex logic

#### Post-Implementation
- [ ] Lint check passes
- [ ] TypeScript compilation succeeds
- [ ] Manual testing completed
- [ ] Database migrations work
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Security reviewed

### 7. Optimization Tips

#### A. Batch Related Tasks
Group similar work together:
```markdown
"I need to implement three related features for creator marketplace:
1. Creator onboarding flow
2. Restaurant claiming system
3. Campaign creation interface

They all share:
- Database: creator_profiles, business_profiles tables
- Auth: account_type field determines access
- UI: Follow patterns from app/(tabs)/profile.tsx
```

#### B. Provide File Contents
When referencing patterns:
```markdown
"Follow the error handling pattern from this service:
[paste relevant code snippet]

Apply this same pattern to the new CreatorService"
```

#### C. Specify Success Metrics
```markdown
"Success means:
- Page loads in <2 seconds
- Form validates all fields
- Errors show user-friendly messages
- Data saves to database
- User sees confirmation
- Can navigate back without data loss"
```

### 8. Progressive Disclosure Strategy

#### Level 1: Task Overview
Start with high-level description

#### Level 2: Technical Details
Add implementation specifics

#### Level 3: Code Context
Include relevant code snippets

#### Level 4: Edge Cases
Describe special scenarios

Example:
```markdown
Level 1: "Add creator onboarding"

Level 2: "3-step onboarding: profile, portfolio, activation
Uses: creator_profiles table, portfolio bucket"

Level 3: "Similar to app/onboarding/ but simpler
[paste UserOnboarding component structure]"

Level 4: "Handle: duplicate emails, image upload failures,
network interruptions, back navigation"
```

### 9. Anti-Patterns to Avoid

#### Don't:
- ❌ "Make it work like Instagram"
- ❌ "Fix all the bugs"
- ❌ "Improve performance"
- ❌ "Make it better"
- ❌ "Follow best practices"

#### Do:
- ✅ "Add double-tap to like, showing heart animation like posts/PostCard.tsx"
- ✅ "Fix TypeError in line 234 of restaurantService.ts when restaurant is null"
- ✅ "Reduce initial load from 3s to <1s by implementing pagination"
- ✅ "Improve form UX by adding inline validation and error messages"
- ✅ "Follow our error handling pattern from services/userService.ts"

### 10. Recovery Strategies

#### When Things Go Wrong:

##### A. Rollback Plan
```markdown
"If this breaks, rollback by:
1. Reverting these files: [list]
2. Running migration: rollback_[feature].sql
3. Clearing cache: npm run clear-cache"
```

##### B. Debug Information
```markdown
"Getting error: [exact error]
Occurs when: [specific action]
In file: [path:line]
Related data: [relevant state/props]
Console shows: [messages]
Network tab: [requests failing]"
```

##### C. Incremental Fixes
```markdown
"Let's fix incrementally:
1. First, just make X work
2. Then add Y
3. Finally optimize Z

Currently stuck on step 1 with [specific issue]"
```

## Sample Optimized Prompt

Here's a complete example using all optimizations:

```markdown
## Task: Add Restaurant Image Gallery with Intelligent Cover Photos

### Context
- App: React Native with Expo, TypeScript, Supabase
- Current: Restaurants show single cover photo
- Database: restaurants table has cover_photo_url field
- Related files:
  - app/restaurant/[id].tsx - restaurant detail page
  - components/RestaurantImage.tsx - image display component
  - services/restaurantService.ts - data fetching

### Requirements
1. Create image gallery for each restaurant
2. Auto-select best cover photo based on quality/engagement
3. Allow manual override by restaurant owners
4. Track image metrics (views, likes)

### Implementation Details
- New table: restaurant_images (id, restaurant_id, image_url, metrics)
- Service: intelligentCoverPhotoService.ts
- Component: RestaurantGallery.tsx
- Follow image handling pattern from app/posts/PostCard.tsx
- Use ImageUploadServiceV2 for uploads

### Success Criteria
- [ ] Gallery shows all restaurant images
- [ ] Cover updates when better image available
- [ ] Manual selection persists
- [ ] Loads in <1 second
- [ ] Handles 0-100 images gracefully

### Constraints
- Don't modify existing restaurants table structure
- Maintain backward compatibility
- Use existing image upload service
- Follow UI from components/cards/

Please:
1. Create database migration
2. Build the service layer
3. Implement UI components
4. Add error handling
5. Include TypeScript types
```

## Quick Reference Card

### Essential Context to Always Include:
1. **Tech Stack**: React Native, Expo, Supabase, TypeScript
2. **File Paths**: Exact locations of files to modify
3. **Database Tables**: Names and relevant fields
4. **Patterns to Follow**: Reference specific files
5. **Success Criteria**: Measurable outcomes

### Prompt Structure:
```
1. Task: [What to build]
2. Context: [Current state]
3. Requirements: [Specific needs]
4. Constraints: [Limitations]
5. Success: [How to verify]
6. Approach: [Preferred method]
```

### Magic Phrases:
- "Follow the pattern from [file]"
- "Similar to [component] but with [difference]"
- "Must work with existing [system]"
- "Reference implementation: [file]"
- "Test by [specific action]"

## Conclusion

Efficient development with AI requires:
1. **Clear Context**: Provide complete technical environment
2. **Specific Requirements**: Define exact needs and constraints
3. **Pattern References**: Point to existing code to follow
4. **Success Metrics**: Specify how to verify completion
5. **Progressive Detail**: Layer information appropriately

This workflow reduces rework from ~3-4 iterations to 1-2, improving development velocity by 50-70%.