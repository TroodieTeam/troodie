# Testing Infrastructure - Quick Start Guide

**Goal:** Get testing infrastructure ready for AI-driven development in 1 day

---

## Step 1: Install Testing Dependencies (15 minutes)

```bash
# Install all required testing packages
npm install --save-dev \
  jest@^29.7.0 \
  @types/jest@^29.5.11 \
  react-test-renderer@19.1.0 \
  @testing-library/react-native@^12.4.2 \
  @testing-library/jest-native@^5.4.3 \
  @testing-library/react-hooks@^8.0.1 \
  @faker-js/faker@^8.3.1 \
  jest-extended@^4.0.2

# Verify installation
npm list jest @testing-library/react-native
```

---

## Step 2: Update Test Configuration (10 minutes)

### Update `jest.config.js`:

```javascript
module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      statements: 75,
      branches: 70,
      functions: 75,
      lines: 75,
    },
  },
}
```

### Update `jest.setup.js`:

```javascript
import '@testing-library/jest-native/extend-expect'

// Mock react-native modules
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  Accuracy: {
    Balanced: 3,
  },
}))

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Link: 'Link',
}))

// Mock react-native-toast-message
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
  hide: jest.fn(),
}))

// Silence console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock __DEV__ flag
global.__DEV__ = true
```

---

## Step 3: Create Test Helpers (30 minutes)

### Create `__tests__/helpers/mockFactories.ts`:

```typescript
import { faker } from '@faker-js/faker'

export const mockUser = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  username: faker.internet.userName().toLowerCase(),
  email: faker.internet.email(),
  display_name: faker.person.fullName(),
  avatar_url: faker.image.avatar(),
  bio: faker.lorem.sentence(),
  account_type: 'consumer' as const,
  is_verified: false,
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides,
})

export const mockRestaurant = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  name: faker.company.name() + ' Restaurant',
  city: 'Charlotte',
  state: 'NC',
  address: faker.location.streetAddress(),
  google_rating: faker.number.float({ min: 3.5, max: 5, precision: 0.1 }),
  google_place_id: faker.string.alphanumeric(27),
  cuisine_type: faker.helpers.arrayElement(['Italian', 'Mexican', 'Asian', 'American']),
  price_level: faker.helpers.arrayElement(['$', '$$', '$$$', '$$$$']),
  created_at: faker.date.past().toISOString(),
  ...overrides,
})

export const mockPost = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  user_id: faker.string.uuid(),
  content: faker.lorem.paragraph(),
  post_type: 'review' as const,
  restaurant_id: faker.string.uuid(),
  created_at: faker.date.recent().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides,
})

export const mockBoard = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  name: faker.lorem.words(3),
  description: faker.lorem.sentence(),
  owner_id: faker.string.uuid(),
  type: 'free' as const,
  is_public: true,
  created_at: faker.date.past().toISOString(),
  ...overrides,
})

export const mockCommunity = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  name: faker.lorem.words(2),
  description: faker.lorem.sentence(),
  admin_id: faker.string.uuid(),
  type: 'public' as const,
  member_count: faker.number.int({ min: 10, max: 1000 }),
  created_at: faker.date.past().toISOString(),
  ...overrides,
})

export const mockNotification = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  user_id: faker.string.uuid(),
  type: 'like' as const,
  title: faker.lorem.sentence(),
  message: faker.lorem.sentence(),
  read: false,
  created_at: faker.date.recent().toISOString(),
  ...overrides,
})
```

### Create `__tests__/helpers/supabaseMocks.ts`:

```typescript
export const createMockSupabaseQuery = () => {
  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  }
  return mockQuery
}

export const createMockSupabaseClient = () => ({
  from: jest.fn((table: string) => createMockSupabaseQuery()),
  auth: {
    signInWithOtp: jest.fn().mockResolvedValue({ data: {}, error: null }),
    verifyOtp: jest.fn().mockResolvedValue({ data: { session: {} }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    }),
  },
  storage: {
    from: jest.fn((bucket: string) => ({
      upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
      download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/image.jpg' },
      }),
      remove: jest.fn().mockResolvedValue({ data: {}, error: null }),
    })),
  },
})

export const mockSupabaseSuccess = (data: any) => ({
  data,
  error: null,
})

export const mockSupabaseError = (message: string, code?: string) => ({
  data: null,
  error: { message, code: code || 'UNKNOWN_ERROR' },
})
```

### Create `__tests__/helpers/testBuilders.ts`:

```typescript
import { mockUser, mockRestaurant, mockPost, mockBoard } from './mockFactories'

export class UserBuilder {
  private user: any

  constructor() {
    this.user = mockUser()
  }

  withId(id: string) {
    this.user.id = id
    return this
  }

  withUsername(username: string) {
    this.user.username = username
    return this
  }

  withAccountType(type: 'consumer' | 'creator' | 'business') {
    this.user.account_type = type
    return this
  }

  verified() {
    this.user.is_verified = true
    return this
  }

  asCreator() {
    this.user.account_type = 'creator'
    this.user.is_verified = true
    return this
  }

  asBusiness() {
    this.user.account_type = 'business'
    this.user.is_verified = true
    return this
  }

  build() {
    return this.user
  }
}

export class RestaurantBuilder {
  private restaurant: any

  constructor() {
    this.restaurant = mockRestaurant()
  }

  withId(id: string) {
    this.restaurant.id = id
    return this
  }

  withName(name: string) {
    this.restaurant.name = name
    return this
  }

  inCity(city: string, state: string = 'NC') {
    this.restaurant.city = city
    this.restaurant.state = state
    return this
  }

  withRating(rating: number) {
    this.restaurant.google_rating = rating
    return this
  }

  build() {
    return this.restaurant
  }
}

export class PostBuilder {
  private post: any

  constructor() {
    this.post = mockPost()
  }

  withId(id: string) {
    this.post.id = id
    return this
  }

  byUser(userId: string) {
    this.post.user_id = userId
    return this
  }

  forRestaurant(restaurantId: string) {
    this.post.restaurant_id = restaurantId
    this.post.post_type = 'review'
    return this
  }

  withContent(content: string) {
    this.post.content = content
    return this
  }

  asSimplePost() {
    this.post.post_type = 'simple'
    this.post.restaurant_id = null
    return this
  }

  build() {
    return this.post
  }
}

export class BoardBuilder {
  private board: any

  constructor() {
    this.board = mockBoard()
  }

  withId(id: string) {
    this.board.id = id
    return this
  }

  ownedBy(userId: string) {
    this.board.owner_id = userId
    return this
  }

  named(name: string) {
    this.board.name = name
    return this
  }

  asPrivate() {
    this.board.type = 'private'
    this.board.is_public = false
    return this
  }

  asPaid() {
    this.board.type = 'paid'
    return this
  }

  build() {
    return this.board
  }
}
```

---

## Step 4: Verify Setup (10 minutes)

### Create a test to verify setup `__tests__/setup.test.ts`:

```typescript
describe('Test Infrastructure Setup', () => {
  it('should have Jest configured correctly', () => {
    expect(true).toBe(true)
  })

  it('should have test utilities available', () => {
    const { mockUser } = require('./helpers/mockFactories')
    const user = mockUser()
    expect(user).toHaveProperty('id')
    expect(user).toHaveProperty('username')
  })

  it('should have Supabase mocks available', () => {
    const { createMockSupabaseClient } = require('./helpers/supabaseMocks')
    const client = createMockSupabaseClient()
    expect(client.from).toBeDefined()
    expect(client.auth).toBeDefined()
  })

  it('should have test builders available', () => {
    const { UserBuilder } = require('./helpers/testBuilders')
    const user = new UserBuilder().asCreator().build()
    expect(user.account_type).toBe('creator')
    expect(user.is_verified).toBe(true)
  })
})
```

### Run the test:

```bash
npm test -- setup.test.ts
```

**Expected Output:**
```
 PASS  __tests__/setup.test.ts
  Test Infrastructure Setup
    ✓ should have Jest configured correctly
    ✓ should have test utilities available
    ✓ should have Supabase mocks available
    ✓ should have test builders available

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

---

## Step 5: Create First Real Service Test (30 minutes)

### Example: Test `authService.ts`

Create `__tests__/services/authService.test.ts`:

```typescript
import { authService } from '@/services/authService'
import { supabase } from '@/lib/supabase'
import { mockUser } from '../helpers/mockFactories'
import { createMockSupabaseClient } from '../helpers/supabaseMocks'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: createMockSupabaseClient(),
}))

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('signInWithOTP', () => {
    it('should send OTP for valid phone number', async () => {
      const phone = '+1234567890'

      const mockAuth = supabase.auth as jest.Mocked<typeof supabase.auth>
      mockAuth.signInWithOtp.mockResolvedValue({
        data: {},
        error: null,
      })

      const result = await authService.signInWithOTP(phone)

      expect(mockAuth.signInWithOtp).toHaveBeenCalledWith({
        phone,
      })
      expect(result.error).toBeNull()
    })

    it('should handle invalid phone number', async () => {
      const phone = 'invalid'

      const mockAuth = supabase.auth as jest.Mocked<typeof supabase.auth>
      mockAuth.signInWithOtp.mockResolvedValue({
        data: {},
        error: { message: 'Invalid phone number', code: 'INVALID_PHONE' },
      })

      const result = await authService.signInWithOTP(phone)

      expect(result.error).toBeTruthy()
      expect(result.error?.message).toContain('Invalid phone')
    })
  })

  describe('verifyOTP', () => {
    it('should verify valid OTP code', async () => {
      const phone = '+1234567890'
      const token = '123456'
      const mockSession = { user: mockUser(), access_token: 'token' }

      const mockAuth = supabase.auth as jest.Mocked<typeof supabase.auth>
      mockAuth.verifyOtp.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const result = await authService.verifyOTP(phone, token)

      expect(mockAuth.verifyOtp).toHaveBeenCalledWith({
        phone,
        token,
        type: 'sms',
      })
      expect(result.data).toEqual(mockSession)
      expect(result.error).toBeNull()
    })

    it('should reject invalid OTP code', async () => {
      const phone = '+1234567890'
      const token = 'wrong'

      const mockAuth = supabase.auth as jest.Mocked<typeof supabase.auth>
      mockAuth.verifyOtp.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid OTP', code: 'INVALID_OTP' },
      })

      const result = await authService.verifyOTP(phone, token)

      expect(result.error).toBeTruthy()
      expect(result.error?.code).toBe('INVALID_OTP')
    })
  })
})
```

### Run the test:

```bash
npm test -- authService.test.ts
```

---

## Step 6: Setup CI/CD (20 minutes)

### Create `.github/workflows/test.yml`:

```yaml
name: Test Suite

on:
  pull_request:
    branches: [main, develop, feature/*]
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true

      - name: TypeScript type check
        run: npm run typecheck

      - name: Lint check
        run: npm run lint
```

### Create pre-commit hook (optional):

Create `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run fast tests before commit
npm test -- --onlyChanged --passWithNoTests
npm run typecheck
npm run lint
```

---

## Step 7: Document Testing Patterns (15 minutes)

### Create `__tests__/README.md`:

```markdown
# Testing Guide

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- authService.test.ts

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Writing Tests

### Service Tests

```typescript
import { myService } from '@/services/myService'
import { supabase } from '@/lib/supabase'
import { mockUser } from '../helpers/mockFactories'
import { createMockSupabaseClient } from '../helpers/supabaseMocks'

jest.mock('@/lib/supabase', () => ({
  supabase: createMockSupabaseClient(),
}))

describe('myService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('myMethod', () => {
    it('should do something', async () => {
      // Arrange
      const testData = mockUser()

      // Act
      const result = await myService.myMethod(testData.id)

      // Assert
      expect(result).toBeDefined()
    })
  })
})
```

### Using Test Builders

```typescript
import { UserBuilder, RestaurantBuilder } from '../helpers/testBuilders'

const creator = new UserBuilder()
  .withUsername('testcreator')
  .asCreator()
  .build()

const restaurant = new RestaurantBuilder()
  .withName('Test Restaurant')
  .inCity('Charlotte', 'NC')
  .withRating(4.5)
  .build()
```

## Test Utilities

- `mockFactories.ts` - Generate mock data
- `supabaseMocks.ts` - Mock Supabase client
- `testBuilders.ts` - Fluent API for test data
```

---

## Quick Validation Checklist

After completing all steps, verify:

- [ ] All dependencies installed (`npm list jest`)
- [ ] Setup test passes (`npm test -- setup.test.ts`)
- [ ] Can run all tests (`npm test`)
- [ ] Can run coverage (`npm run test:coverage`)
- [ ] Mock factories work
- [ ] Supabase mocks work
- [ ] Test builders work
- [ ] CI/CD workflow created (`.github/workflows/test.yml`)
- [ ] Documentation created (`__tests__/README.md`)

---

## Next Steps

After infrastructure is ready:

1. **Week 2-3:** Test auth services (authService, userService, profileService)
2. **Week 4-5:** Test core services (boardService, postService, restaurantService)
3. **Week 6-7:** Test social & notifications
4. **Week 8-9:** Test hooks & utilities
5. **Week 10-11:** Test components
6. **Week 12:** Integration tests & polish

---

## Troubleshooting

### Tests not running
```bash
# Clear Jest cache
npx jest --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Import errors
- Check `jest.config.js` has correct `moduleNameMapper`
- Verify `@/` alias is configured
- Check file paths are correct

### Mock not working
- Ensure `jest.clearAllMocks()` in `beforeEach`
- Check mock is imported before service
- Verify mock path matches actual file path

---

**Total Setup Time:** ~2 hours
**Ready for:** AI-driven TDD workflow
