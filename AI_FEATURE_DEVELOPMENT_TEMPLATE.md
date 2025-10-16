# AI-Driven Feature Development Template

**Purpose:** Step-by-step workflow for AI to implement features with full TDD coverage

---

## Feature Request Template

**Copy this template when requesting a new feature:**

```markdown
## Feature Request: [Feature Name]

### Description
[What is the feature? What problem does it solve?]

### User Stories
- As a [user type], I want to [action] so that [benefit]
- As a [user type], I want to [action] so that [benefit]

### Acceptance Criteria
- [ ] [Specific, testable requirement]
- [ ] [Specific, testable requirement]
- [ ] [Specific, testable requirement]

### Technical Requirements
- Database changes: [Yes/No - describe if yes]
- Affected services: [List services]
- New components needed: [List components]
- Integration points: [List integrations]

### Priority: [P0/P1/P2/P3]
### Estimated Complexity: [Low/Medium/High]
```

---

## AI Workflow Phases

### Phase 1: Analysis & Planning (AI - Autonomous)

**AI Actions:**
1. Parse feature request
2. Identify affected layers:
   - Database (migrations needed?)
   - Services (which services?)
   - Hooks (state management needed?)
   - Components (UI changes?)
   - E2E flows (user journeys?)
3. List all integration points
4. Generate test scenarios for each layer
5. Create implementation plan

**AI Output:**
```markdown
## Implementation Plan for [Feature Name]

### Affected Layers
- Database: [Tables to add/modify]
- Services: [Services to create/modify]
- Hooks: [Hooks to create/modify]
- Components: [Components to create/modify]
- E2E: [Flows to create/modify]

### Test Plan
- Unit tests: [X] tests across [Y] services
- Integration tests: [X] tests for [Y] flows
- Component tests: [X] tests for [Y] components
- E2E tests: [X] flows

### Dependencies
- [List any blocking dependencies]

### Implementation Order
1. [Step 1 with justification]
2. [Step 2 with justification]
...
```

---

### Phase 2: Database & Types (AI - Autonomous if schema changes needed)

**AI Actions:**
1. Create migration file `supabase/migrations/YYYYMMDDHHMMSS_feature_name.sql`
2. Write SQL for schema changes
3. Update TypeScript types in `lib/supabase.ts`
4. Document migration

**AI Checklist:**
- [ ] Migration file created with timestamp
- [ ] Schema changes implemented
- [ ] RLS policies added/updated
- [ ] TypeScript types updated
- [ ] Migration documented with comments
- [ ] Rollback SQL provided

**Example Migration:**
```sql
-- Migration: Add tipping feature
-- Created: 2025-10-11

-- Create tips table
CREATE TABLE IF NOT EXISTS tips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tipper_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(post_id, tipper_id)
);

-- RLS Policies
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tips on their posts"
  ON tips FOR SELECT
  USING (recipient_id = auth.uid() OR tipper_id = auth.uid());

CREATE POLICY "Users can create tips"
  ON tips FOR INSERT
  WITH CHECK (tipper_id = auth.uid() AND amount > 0);

-- Indexes
CREATE INDEX idx_tips_post_id ON tips(post_id);
CREATE INDEX idx_tips_recipient_id ON tips(recipient_id);

-- Rollback
-- DROP TABLE tips;
```

---

### Phase 3: Service Layer TDD (AI - Autonomous)

**AI Actions:**
1. **RED PHASE:** Create test file with failing tests
2. **GREEN PHASE:** Implement service to pass tests
3. **REFACTOR PHASE:** Improve code quality

#### Step 3.1: Create Service Tests (RED)

Create `__tests__/services/tipService.test.ts`:

```typescript
import { tipService } from '@/services/tipService'
import { supabase } from '@/lib/supabase'
import { mockUser, mockPost } from '../helpers/mockFactories'
import { createMockSupabaseClient, mockSupabaseSuccess, mockSupabaseError } from '../helpers/supabaseMocks'

jest.mock('@/lib/supabase', () => ({
  supabase: createMockSupabaseClient(),
}))

describe('tipService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createTip', () => {
    it('should create tip with valid amount', async () => {
      const tipper = mockUser()
      const recipient = mockUser()
      const post = mockPost({ user_id: recipient.id })
      const amount = 5.00

      const mockFrom = supabase.from as jest.Mock
      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(mockSupabaseSuccess({
          id: 'tip-123',
          post_id: post.id,
          tipper_id: tipper.id,
          recipient_id: recipient.id,
          amount,
        })),
      })

      const result = await tipService.createTip({
        postId: post.id,
        tipperId: tipper.id,
        recipientId: recipient.id,
        amount,
      })

      expect(result.data).toBeDefined()
      expect(result.data?.amount).toBe(amount)
      expect(result.error).toBeNull()
    })

    it('should reject negative amounts', async () => {
      const result = await tipService.createTip({
        postId: 'post-123',
        tipperId: 'user-123',
        recipientId: 'user-456',
        amount: -5.00,
      })

      expect(result.error).toBeTruthy()
      expect(result.error?.message).toContain('positive')
    })

    it('should enforce minimum amount', async () => {
      const result = await tipService.createTip({
        postId: 'post-123',
        tipperId: 'user-123',
        recipientId: 'user-456',
        amount: 0.50,
      })

      expect(result.error).toBeTruthy()
      expect(result.error?.message).toContain('minimum')
    })

    it('should enforce maximum amount', async () => {
      const result = await tipService.createTip({
        postId: 'post-123',
        tipperId: 'user-123',
        recipientId: 'user-456',
        amount: 1001.00,
      })

      expect(result.error).toBeTruthy()
      expect(result.error?.message).toContain('maximum')
    })

    it('should prevent self-tipping', async () => {
      const userId = 'user-123'

      const result = await tipService.createTip({
        postId: 'post-123',
        tipperId: userId,
        recipientId: userId,
        amount: 5.00,
      })

      expect(result.error).toBeTruthy()
      expect(result.error?.message).toContain('cannot tip yourself')
    })

    it('should handle duplicate tip attempts', async () => {
      const mockFrom = supabase.from as jest.Mock
      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(
          mockSupabaseError('Duplicate tip', '23505')
        ),
      })

      const result = await tipService.createTip({
        postId: 'post-123',
        tipperId: 'user-123',
        recipientId: 'user-456',
        amount: 5.00,
      })

      expect(result.error).toBeTruthy()
      expect(result.error?.message).toContain('already tipped')
    })
  })

  describe('getTipsForPost', () => {
    it('should fetch all tips for a post', async () => {
      const postId = 'post-123'
      const mockTips = [
        { id: 'tip-1', amount: 5.00, tipper_id: 'user-1' },
        { id: 'tip-2', amount: 10.00, tipper_id: 'user-2' },
      ]

      const mockFrom = supabase.from as jest.Mock
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue(mockSupabaseSuccess(mockTips)),
      })

      const result = await tipService.getTipsForPost(postId)

      expect(result.data).toHaveLength(2)
      expect(result.error).toBeNull()
    })
  })

  describe('getTotalTipsForUser', () => {
    it('should calculate total tips received', async () => {
      const userId = 'user-123'
      const mockTips = [
        { amount: 5.00 },
        { amount: 10.00 },
        { amount: 3.50 },
      ]

      const mockFrom = supabase.from as jest.Mock
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue(mockSupabaseSuccess(mockTips)),
      })

      const result = await tipService.getTotalTipsForUser(userId)

      expect(result.data).toBe(18.50)
      expect(result.error).toBeNull()
    })
  })
})
```

**Run tests (expected to FAIL):**
```bash
npm test -- tipService.test.ts
# Expected: ❌ All tests fail (service doesn't exist yet)
```

#### Step 3.2: Implement Service (GREEN)

Create `services/tipService.ts`:

```typescript
import { supabase } from '@/lib/supabase'

const MIN_TIP_AMOUNT = 1.00
const MAX_TIP_AMOUNT = 1000.00

export const tipService = {
  async createTip({
    postId,
    tipperId,
    recipientId,
    amount,
  }: {
    postId: string
    tipperId: string
    recipientId: string
    amount: number
  }) {
    // Validation
    if (amount <= 0) {
      return {
        data: null,
        error: { message: 'Amount must be positive' },
      }
    }

    if (amount < MIN_TIP_AMOUNT) {
      return {
        data: null,
        error: { message: `Minimum tip amount is $${MIN_TIP_AMOUNT}` },
      }
    }

    if (amount > MAX_TIP_AMOUNT) {
      return {
        data: null,
        error: { message: `Maximum tip amount is $${MAX_TIP_AMOUNT}` },
      }
    }

    if (tipperId === recipientId) {
      return {
        data: null,
        error: { message: 'You cannot tip yourself' },
      }
    }

    // Create tip
    const { data, error } = await supabase
      .from('tips')
      .insert({
        post_id: postId,
        tipper_id: tipperId,
        recipient_id: recipientId,
        amount,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return {
          data: null,
          error: { message: 'You have already tipped this post' },
        }
      }
      return { data: null, error }
    }

    return { data, error: null }
  },

  async getTipsForPost(postId: string) {
    const { data, error } = await supabase
      .from('tips')
      .select('*')
      .eq('post_id', postId)

    return { data: data || [], error }
  },

  async getTotalTipsForUser(userId: string) {
    const { data, error } = await supabase
      .from('tips')
      .select('amount')
      .eq('recipient_id', userId)

    if (error) {
      return { data: null, error }
    }

    const total = data.reduce((sum, tip) => sum + Number(tip.amount), 0)
    return { data: total, error: null }
  },
}
```

**Run tests (expected to PASS):**
```bash
npm test -- tipService.test.ts
# Expected: ✅ All tests pass
```

**AI Checklist:**
- [ ] All service tests pass
- [ ] Code follows project patterns
- [ ] Error handling is comprehensive
- [ ] Edge cases are covered
- [ ] Validation logic is tested

---

### Phase 4: Integration Testing (AI - Autonomous)

**AI Actions:**
1. Create integration test file
2. Test cross-service interactions
3. Verify side effects (notifications, real-time updates)

Create `__tests__/integration/tipping.test.ts`:

```typescript
describe('Tipping Integration Flow', () => {
  it('should create tip and trigger notifications', async () => {
    // This would use real Supabase test database
    // 1. Create test users
    // 2. Create test post
    // 3. Create tip
    // 4. Verify notification created
    // 5. Verify earnings updated
    // 6. Verify real-time event fired
  })
})
```

---

### Phase 5: Hook Layer TDD (AI - Autonomous)

**AI Actions:**
1. **RED:** Create hook tests
2. **GREEN:** Implement hook
3. **REFACTOR:** Improve code

Create `__tests__/hooks/useTipping.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react-hooks'
import { useTipping } from '@/hooks/useTipping'
import { tipService } from '@/services/tipService'

jest.mock('@/services/tipService')

describe('useTipping', () => {
  it('should handle tip creation', async () => {
    const mockCreateTip = jest.fn().mockResolvedValue({
      data: { id: 'tip-123', amount: 5.00 },
      error: null,
    })
    ;(tipService.createTip as jest.Mock) = mockCreateTip

    const { result } = renderHook(() => useTipping('post-123'))

    await act(async () => {
      await result.current.createTip(5.00)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(mockCreateTip).toHaveBeenCalledWith({
      postId: 'post-123',
      amount: 5.00,
    })
  })

  it('should handle errors', async () => {
    const mockCreateTip = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Insufficient funds' },
    })
    ;(tipService.createTip as jest.Mock) = mockCreateTip

    const { result } = renderHook(() => useTipping('post-123'))

    await act(async () => {
      await result.current.createTip(5.00)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeTruthy()
  })
})
```

Create `hooks/useTipping.ts`:

```typescript
import { useState } from 'react'
import { tipService } from '@/services/tipService'
import { useAuth } from '@/contexts/AuthContext'

export const useTipping = (postId: string) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createTip = async (amount: number) => {
    if (!user) {
      setError('Must be logged in to tip')
      return
    }

    setLoading(true)
    setError(null)

    const { data, error } = await tipService.createTip({
      postId,
      tipperId: user.id,
      amount,
    })

    if (error) {
      setError(error.message)
    }

    setLoading(false)
    return { data, error }
  }

  return { createTip, loading, error }
}
```

---

### Phase 6: Component Layer TDD (AI - Autonomous)

**AI Actions:**
1. **RED:** Create component tests
2. **GREEN:** Implement component
3. **REFACTOR:** Improve UI/UX

Create `__tests__/components/TipButton.test.tsx`:

```typescript
import { render, fireEvent } from '@testing-library/react-native'
import { TipButton } from '@/components/TipButton'
import { useTipping } from '@/hooks/useTipping'

jest.mock('@/hooks/useTipping')

describe('TipButton', () => {
  it('should render correctly', () => {
    const mockUseTipping = {
      createTip: jest.fn(),
      loading: false,
      error: null,
    }
    ;(useTipping as jest.Mock).mockReturnValue(mockUseTipping)

    const { getByTestId } = render(<TipButton postId="post-123" />)

    expect(getByTestId('tip-button')).toBeDefined()
  })

  it('should call createTip on press', () => {
    const mockCreateTip = jest.fn()
    ;(useTipping as jest.Mock).mockReturnValue({
      createTip: mockCreateTip,
      loading: false,
      error: null,
    })

    const { getByTestId } = render(<TipButton postId="post-123" />)

    fireEvent.press(getByTestId('tip-button'))

    expect(mockCreateTip).toHaveBeenCalled()
  })

  it('should show loading state', () => {
    ;(useTipping as jest.Mock).mockReturnValue({
      createTip: jest.fn(),
      loading: true,
      error: null,
    })

    const { getByTestId } = render(<TipButton postId="post-123" />)

    expect(getByTestId('tip-button-loading')).toBeDefined()
  })
})
```

Create `components/TipButton.tsx`:

```typescript
import { View, TouchableOpacity, Text, ActivityIndicator } from 'react-native'
import { useTipping } from '@/hooks/useTipping'

export const TipButton = ({ postId }: { postId: string }) => {
  const { createTip, loading, error } = useTipping(postId)

  const handlePress = async () => {
    await createTip(5.00) // Default $5 tip
  }

  if (loading) {
    return (
      <View testID="tip-button-loading">
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <TouchableOpacity testID="tip-button" onPress={handlePress}>
      <Text>Tip $5</Text>
    </TouchableOpacity>
  )
}
```

---

### Phase 7: E2E Testing (AI - Autonomous)

Create `e2e/flows/tipping/tip-on-post.yaml`:

```yaml
appId: com.troodie.troodie.com
---
# Test: User can tip on a post
- launchApp:
    clearState: true

# Login
- runFlow: ../helpers/auth.yaml

# Navigate to feed
- tapOn:
    id: "tab-feed"

# Find a post
- assertVisible:
    id: "post-card"

# Tap tip button
- tapOn:
    id: "tip-button"

# Confirm tip amount
- tapOn:
    id: "confirm-tip-button"

# Verify success message
- assertVisible: "Tip sent successfully"

# Verify notification sent to creator
- tapOn:
    id: "tab-activity"

- assertVisible: "tipped your post"
```

---

### Phase 8: Full Verification (AI - Autonomous)

**AI runs complete validation suite:**

```bash
# 1. Unit tests
npm test
# Expected: ✅ All tests pass

# 2. Test coverage
npm run test:coverage
# Expected: ✅ Coverage thresholds met

# 3. Type checking
npm run typecheck
# Expected: ✅ No TypeScript errors

# 4. Linting
npm run lint
# Expected: ✅ No linting errors

# 5. E2E smoke tests
npm run test:e2e:smoke
# Expected: ✅ All critical flows pass
```

**AI Verification Checklist:**
- [ ] All unit tests pass
- [ ] Test coverage meets targets (80%+ services, 70%+ components)
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] E2E tests pass
- [ ] No regressions in existing features
- [ ] Performance is acceptable

---

### Phase 9: Documentation (AI - Autonomous)

**AI creates/updates documentation:**

1. **Update `services/CLAUDE.md`** - Add tipService documentation
2. **Update `DOCUMENTATION_INDEX.md`** - Add tipping feature
3. **Create migration docs** - Document database changes
4. **Update API docs** - Document service methods

---

### Phase 10: Commit & PR (AI - Autonomous)

**AI creates commit and PR:**

```bash
# Stage changes
git add .

# Create commit
git commit -m "feat: add tipping feature with full test coverage

- Add tips database table and RLS policies
- Implement tipService with validation
- Create useTipping hook for state management
- Add TipButton component with loading states
- Add E2E test for tip flow
- Update documentation

Tests: 18 unit, 3 integration, 1 E2E
Coverage: 85% (services), 78% (components)
"

# Push and create PR
git push origin feature/tipping
gh pr create \
  --title "feat: Add tipping feature" \
  --body "$(cat PR_TEMPLATE.md)"
```

---

## AI Success Criteria

Feature implementation is complete when:

✅ **All tests pass** (unit, integration, E2E)
✅ **Coverage targets met** (80%+ services, 70%+ components)
✅ **No type errors** (npm run typecheck)
✅ **No lint errors** (npm run lint)
✅ **No regressions** (existing tests still pass)
✅ **Documentation updated** (service docs, API docs)
✅ **CI/CD checks pass** (GitHub Actions)
✅ **PR created** with full description

---

## Example: Full Feature Request for AI

```markdown
## Feature Request: User Tipping System

### Description
Allow users to tip content creators on their posts. Tips range from $1 to $1000 and go directly to the creator's earnings.

### User Stories
- As a user, I want to tip a creator on their post so that I can show appreciation
- As a creator, I want to receive tips so that I can earn from my content
- As a user, I want to see total tips on a post so that I know how much support it has received

### Acceptance Criteria
- [ ] Users can tip between $1 and $1000 on any post
- [ ] Users cannot tip their own posts
- [ ] Users cannot tip the same post twice
- [ ] Creator receives notification when tipped
- [ ] Tips are tracked in creator earnings dashboard
- [ ] Total tips shown on post (optional, can be hidden)

### Technical Requirements
- Database changes: Yes - create tips table with RLS policies
- Affected services: Create tipService, update notificationService
- New components needed: TipButton, TipModal (amount selection)
- Integration points: Notification system, earnings tracking

### Priority: P1
### Estimated Complexity: Medium

---

Claude, please implement this feature following the TDD workflow with full test coverage.
```

**AI will then autonomously:**
1. Analyze requirements
2. Create implementation plan
3. Write database migration
4. Implement service with tests (TDD)
5. Implement hook with tests (TDD)
6. Implement component with tests (TDD)
7. Create E2E tests
8. Run full verification
9. Update documentation
10. Create PR

**Human involvement:** Code review and merge decision only!

---

**Template Version:** 1.0
**Last Updated:** October 11, 2025
