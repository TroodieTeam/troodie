# Troodie Development Prompt Templates

Copy and customize these templates for efficient AI-assisted development sessions.

## 🚀 Feature Implementation

```markdown
## Task: [FEATURE NAME]

### Context
- **Project**: Troodie - React Native/Expo/Supabase/TypeScript
- **Current State**: [What exists now]
- **Location**: [Where this feature will live]
- **Reference**: docs/CLAUDE.md for tech stack details

### Requirements
1. [Specific requirement 1]
2. [Specific requirement 2]
3. [Specific requirement 3]

### Technical Details
- **Components**: [New components needed]
- **Services**: [Services to create/modify]
- **Database**: [Tables and fields involved]
- **Related Files**:
  - `[path/to/file1.tsx]` - [what it does]
  - `[path/to/file2.ts]` - [what it does]

### Implementation Approach
- Follow pattern from: `[reference/file.tsx]`
- Use existing service: `[serviceName]`
- Style matching: `[component/to/match]`

### Success Criteria
- [ ] User can [action 1]
- [ ] Data saves to [table]
- [ ] Error states handled with user feedback
- [ ] Loading states shown during async operations
- [ ] TypeScript types complete
- [ ] Follows existing UI patterns

### Constraints
- Must use existing ImageUploadServiceV2 for images
- Cannot modify [protected files]
- Must maintain backward compatibility
- Follow RLS policies for data access
```

## 🐛 Bug Fix

```markdown
## Bug: [ISSUE DESCRIPTION]

### Reproduction Steps
1. Navigate to [screen/page]
2. Perform [action]
3. **Expected**: [what should happen]
4. **Actual**: [what actually happens]

### Error Details
- **Error Message**: `[exact error message]`
- **File**: `[path/to/file.tsx:line]`
- **Console Output**:
```
[paste console errors]
```

### Context
- **Affected Component**: `[component/file]`
- **Related Services**: `[services involved]`
- **Database Queries**: `[tables accessed]`
- **Recent Changes**: [what changed recently]

### Investigation Areas
- [ ] Check [specific function/area]
- [ ] Verify [assumption]
- [ ] Test [edge case]
- [ ] Review [related system]

Please diagnose root cause and provide fix with explanation.
```

## 🏗️ Database Schema Change

```markdown
## Database Change: [DESCRIPTION]

### Current Schema
```sql
-- Current table structure
CREATE TABLE table_name (
  existing_fields...
);
```

### Required Changes
1. [Change 1 description]
2. [Change 2 description]

### New Schema
```sql
-- Desired structure
[new table definition]
```

### Migration Requirements
- [ ] Preserve existing data
- [ ] Update RLS policies
- [ ] Add indexes for: [fields]
- [ ] Update TypeScript types
- [ ] Modify affected services

### Affected Code
- Service: `services/[name]Service.ts`
- Component: `app/[path]/[component].tsx`
- Types: `types/[name].ts`

### Rollback Plan
```sql
-- Rollback migration if needed
[rollback SQL]
```
```

## 🎨 UI Component Creation

```markdown
## Component: [COMPONENT NAME]

### Purpose
[What this component does and where it's used]

### Design Reference
- Similar to: `components/[existing].tsx`
- Figma/Screenshot: [link or description]
- Style guide: [specific requirements]

### Props Interface
```typescript
interface ComponentNameProps {
  prop1: type;
  prop2?: type;
  onAction: (param: type) => void;
}
```

### Features
- [ ] [Feature 1]
- [ ] [Feature 2]
- [ ] Responsive design
- [ ] Accessibility support
- [ ] Loading states
- [ ] Error states

### Data Requirements
- Fetches from: `[service.method()]`
- Updates: `[table/field]`
- Real-time: [yes/no, what updates]

### State Management
- Local state: [what it tracks]
- Context: [what context if any]
- Props drilling: [what's passed down]

### Example Usage
```typescript
<ComponentName
  prop1="value"
  onAction={handleAction}
/>
```
```

## 🔄 Refactoring

```markdown
## Refactor: [COMPONENT/SERVICE NAME]

### Current Problems
1. [Issue 1 - e.g., code duplication]
2. [Issue 2 - e.g., poor performance]
3. [Issue 3 - e.g., missing types]

### Files to Refactor
- `[file1.tsx]`: [specific issues]
- `[file2.ts]`: [specific issues]

### Refactoring Goals
- [ ] Extract common logic to: `[hooks/useCustomHook.ts]`
- [ ] Improve performance by: [specific approach]
- [ ] Add TypeScript types for: [what needs types]
- [ ] Reduce complexity from [X lines] to [Y lines]
- [ ] Improve readability with: [specific changes]

### Patterns to Apply
- Follow structure from: `[reference/file.tsx]`
- Use utility from: `[utils/helper.ts]`
- Apply pattern: [specific pattern name]

### Testing Requirements
After refactoring, verify:
- [ ] [Feature 1] still works
- [ ] [Feature 2] still works
- [ ] No TypeScript errors
- [ ] Performance improved by X%
- [ ] All tests pass

### Risk Assessment
- **High Risk**: [changes that could break things]
- **Medium Risk**: [changes needing careful testing]
- **Low Risk**: [safe improvements]
```

## 🔌 API Integration

```markdown
## API Integration: [SERVICE NAME]

### Endpoint Details
- **Base URL**: `[api.example.com]`
- **Authentication**: [method - token/oauth/etc]
- **Rate Limits**: [if any]

### Required Endpoints
1. `GET /endpoint1` - [purpose]
2. `POST /endpoint2` - [purpose]
3. `PUT /endpoint3` - [purpose]

### Data Mapping
```typescript
// External API Response
{
  external_field: value
}

// Our Database Schema
{
  internal_field: value
}

// Mapping required:
external_field -> internal_field
```

### Service Implementation
- Create service: `services/[name]Service.ts`
- Add types: `types/[name].ts`
- Error handling: [specific requirements]
- Caching strategy: [if needed]

### Integration Points
- Called from: `[component/screen]`
- Triggers: [when it's called]
- Updates: `[what it updates]`
- Fallback: [what happens if it fails]

### Environment Variables
```bash
EXPO_PUBLIC_API_KEY=xxx
EXPO_PUBLIC_API_URL=xxx
```
```

## 🧪 Test Creation

```markdown
## Tests for: [COMPONENT/SERVICE NAME]

### Test Coverage Needed
- [ ] Unit tests for: [functions/methods]
- [ ] Integration tests for: [workflows]
- [ ] Component tests for: [UI components]

### Test Scenarios
1. **Happy Path**: [normal operation]
2. **Error Cases**: [what could go wrong]
3. **Edge Cases**: [boundary conditions]
4. **Performance**: [load/stress scenarios]

### Mock Data Required
```typescript
const mockUser = {
  id: 'uuid',
  name: 'Test User'
};

const mockRestaurant = {
  // mock structure
};
```

### Expected Behaviors
- When [action], expect [result]
- When [error], expect [handling]
- When [edge case], expect [behavior]

### Files to Test
- `[component.tsx]`: Test [specific aspects]
- `[service.ts]`: Test [specific methods]
- `[utils.ts]`: Test [specific functions]
```

## 🚢 Deployment Preparation

```markdown
## Deployment: [FEATURE/VERSION]

### Pre-Deployment Checklist
- [ ] All TypeScript errors resolved
- [ ] Lint checks pass
- [ ] Tests pass
- [ ] Environment variables set
- [ ] Database migrations ready

### Database Changes
```sql
-- Migrations to run
[migration SQL]
```

### Environment Updates
```bash
# New variables needed
EXPO_PUBLIC_NEW_VAR=value
```

### Build Commands
```bash
# Development build
npx expo start --clear

# Preview build
eas build --profile preview

# Production build
eas build --profile production
```

### Rollback Plan
1. [Step to rollback code]
2. [Step to rollback database]
3. [Step to restore service]

### Monitoring
- Watch for: [specific metrics]
- Alert if: [conditions]
- Log: [what to track]
```

## 🎯 Quick Fix Template

```markdown
Quick fix needed:

**File**: `[path/to/file.tsx]`
**Line**: [line number]
**Issue**: [what's wrong]
**Fix**: [what to change]

Example:
```typescript
// Current (broken)
[current code]

// Should be
[fixed code]
```

Please apply fix and verify no side effects.
```

## 📋 Code Review Request

```markdown
## Review: [FEATURE/PR NAME]

### Changed Files
- `[file1.tsx]` - [what changed]
- `[file2.ts]` - [what changed]

### Review Focus Areas
1. [ ] Security: Check for [specific concerns]
2. [ ] Performance: Review [specific areas]
3. [ ] Types: Verify TypeScript coverage
4. [ ] Patterns: Ensure follows project conventions
5. [ ] Edge Cases: Consider [scenarios]

### Specific Questions
- Is [approach X] the best way to handle this?
- Should we cache [data Y]?
- Any security concerns with [feature Z]?

### Testing Done
- [x] Manual testing on iOS
- [x] Manual testing on Android
- [x] Unit tests added
- [ ] Integration tests added

Please review for:
- Code quality
- Performance implications
- Security issues
- Better approaches
```

## 💡 Best Practices Reminder

When using these templates:

1. **Always include**: Project context (React Native/Expo/Supabase)
2. **Reference**: Existing files for patterns to follow
3. **Specify**: Exact file paths and table names
4. **Define**: Clear success criteria
5. **Consider**: Error handling and edge cases
6. **Include**: TypeScript types requirements
7. **Note**: Any constraints or things to avoid

## 🔗 Quick Context

Always start with:
```markdown
Context: Troodie app - React Native, Expo, Supabase, TypeScript
Reference: docs/CLAUDE.md for full stack details
```

Then add your specific requirements using the appropriate template above.