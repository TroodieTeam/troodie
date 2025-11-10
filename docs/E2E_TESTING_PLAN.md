# E2E Testing Implementation Plan for Troodie

## Phase 1: Setup & Infrastructure

### 1.1 Install Maestro
```bash
# macOS/Linux
curl -Ls "https://get.maestro.mobile.dev" | bash

# Verify installation
maestro --version
```

### 1.2 Project Structure
```
troodie/
├── e2e/
│   ├── flows/           # Test flows organized by feature
│   │   ├── auth/
│   │   │   ├── login.yaml
│   │   │   ├── signup.yaml
│   │   │   └── onboarding.yaml
│   │   ├── discovery/
│   │   │   ├── explore.yaml
│   │   │   └── search.yaml
│   │   ├── social/
│   │   │   ├── follow-user.yaml
│   │   │   └── activity-feed.yaml
│   │   └── content/
│   │       ├── create-post.yaml
│   │       └── save-restaurant.yaml
│   ├── helpers/         # Reusable test utilities
│   │   └── common.yaml
│   ├── fixtures/        # Test data
│   │   └── users.json
│   └── maestro.yaml     # Configuration
```

### 1.3 Development Build Setup
```json
// package.json
{
  "scripts": {
    "test:e2e:ios": "maestro test e2e/flows --platform ios",
    "test:e2e:android": "maestro test e2e/flows --platform android",
    "test:e2e:record": "maestro record",
    "test:e2e:studio": "maestro studio",
    "build:test:ios": "eas build --profile test --platform ios --local",
    "build:test:android": "eas build --profile test --platform android --local"
  }
}
```

### 1.4 EAS Configuration for Test Builds
```json
// eas.json
{
  "build": {
    "test": {
      "extends": "development",
      "env": {
        "EXPO_PUBLIC_ENV": "test",
        "EXPO_PUBLIC_SUPABASE_URL": "$SUPABASE_TEST_URL",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "$SUPABASE_TEST_ANON_KEY"
      },
      "ios": {
        "simulator": true,
        "buildConfiguration": "Debug"
      },
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleDebug"
      }
    }
  }
}
```

## Phase 2: Core Test Scenarios

### Critical User Journeys (Priority 1)

#### 2.1 Authentication Flow
```yaml
# e2e/flows/auth/login.yaml
appId: com.troodie.app
---
- launchApp:
    clearState: true
    
- assertVisible: "Welcome to TROODIE"

- tapOn: "Continue with Email"

- inputText: "test@example.com"
- tapOn: "Next"

- inputText: "TestPassword123!"
- tapOn: "Sign In"

- assertVisible: "Home"
```

#### 2.2 Restaurant Discovery
```yaml
# e2e/flows/discovery/explore.yaml
appId: com.troodie.app
---
- launchApp

- tapOn: "Explore"

- assertVisible: "What's Hot"
- assertVisible: 
    text: ".*restaurant.*"
    regex: true

- tapOn:
    index: 0
    className: "RestaurantCard"

- assertVisible: "Save"
- assertVisible: "Reviews"

- tapOn: "Save"

- assertVisible: "Saved to Your Saves"
```

#### 2.3 Social Interactions
```yaml
# e2e/flows/social/follow-user.yaml
appId: com.troodie.app
---
- launchApp

- tapOn: "Activity"

- tapOn:
    text: "@.*"
    regex: true
    index: 0

- assertVisible: "Follow"

- tapOn: "Follow"

- assertVisible: "Following"

- tapOn: "Followers"
- assertVisible: "${output.username}"
```

### Secondary Flows (Priority 2)

#### 2.4 Content Creation
```yaml
# e2e/flows/content/create-post.yaml
appId: com.troodie.app
---
- launchApp

- tapOn: "+"

- tapOn: "Review a Spot"

- inputText: "Amazing food!"

- tapOn: "Select Restaurant"
- tapOn:
    index: 0
    className: "RestaurantOption"

- tapOn: "Post"

- assertVisible: "Posted successfully"
```

## Phase 3: Test Data Management

### 3.1 Test Database Setup
```javascript
// e2e/helpers/testDb.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_TEST_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function seedTestData() {
  // Create test users
  const testUsers = [
    { email: 'test1@troodie.com', name: 'Test User 1' },
    { email: 'test2@troodie.com', name: 'Test User 2' }
  ];
  
  // Create test restaurants
  const testRestaurants = [
    { name: 'Test Pizza Place', cuisine: 'Italian' },
    { name: 'Test Sushi Bar', cuisine: 'Japanese' }
  ];
  
  // Seed data
  await supabase.from('users').insert(testUsers);
  await supabase.from('restaurants').insert(testRestaurants);
}

async function cleanupTestData() {
  await supabase.from('users').delete().like('email', '%@troodie.com');
  await supabase.from('restaurants').delete().like('name', 'Test%');
}
```

### 3.2 Test Helpers
```yaml
# e2e/helpers/common.yaml
appId: com.troodie.app
---
# Login helper
- runFlow:
    when:
      visible: "Sign In"
    commands:
      - tapOn: "Continue with Email"
      - inputText: "${EMAIL}"
      - tapOn: "Next"
      - inputText: "${PASSWORD}"
      - tapOn: "Sign In"
      
# Wait for element helper
- repeat:
    times: 10
    commands:
      - evalScript: "setTimeout(() => {}, 1000)"
    while:
      notVisible: "${ELEMENT}"
```

## Phase 4: CI/CD Integration

### 4.1 GitHub Actions Workflow
```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
          
      - name: Install dependencies
        run: npm ci
        
      - name: Setup Expo
        run: npm install -g eas-cli expo-cli
        
      - name: Build iOS test app
        run: npm run build:test:ios
        
      - name: Install Maestro
        run: curl -Ls "https://get.maestro.mobile.dev" | bash
        
      - name: Start iOS Simulator
        run: |
          xcrun simctl boot "iPhone 14"
          xcrun simctl install booted ./ios-build.app
          
      - name: Run E2E tests
        run: npm run test:e2e:ios
        
      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-screenshots
          path: e2e/screenshots/

  test-android:
    runs-on: ubuntu-latest
    steps:
      # Similar steps for Android
```

## Phase 5: Test Coverage Strategy

### 5.1 Coverage Matrix

| Feature | P1 (Critical) | P2 (Important) | P3 (Nice to have) |
|---------|--------------|----------------|-------------------|
| Auth | Login, Signup | Password reset | Social login |
| Discovery | Browse, Search | Filters | Map view |
| Social | Follow, Feed | Comments | Share |
| Content | Create post | Edit post | Delete post |
| Profile | View, Edit | Settings | Privacy |

### 5.2 Test Execution Schedule
- **Every PR**: P1 smoke tests (5 min)
- **Daily**: P1 + P2 regression (20 min)
- **Weekly**: Full suite including P3 (45 min)
- **Release**: Full suite + manual exploratory

## Phase 6: Monitoring & Reporting

### 6.1 Test Metrics Dashboard
```javascript
// e2e/reporting/metrics.js
class TestMetrics {
  constructor() {
    this.results = [];
  }
  
  trackTest(name, duration, status) {
    this.results.push({
      name,
      duration,
      status,
      timestamp: new Date(),
      build: process.env.BUILD_NUMBER
    });
  }
  
  generateReport() {
    return {
      totalTests: this.results.length,
      passed: this.results.filter(r => r.status === 'passed').length,
      failed: this.results.filter(r => r.status === 'failed').length,
      avgDuration: this.results.reduce((acc, r) => acc + r.duration, 0) / this.results.length,
      slowestTest: this.results.sort((a, b) => b.duration - a.duration)[0]
    };
  }
}
```

### 6.2 Failure Analysis
- Screenshot on failure
- Video recording for complex flows
- Network request logs
- Console logs capture

## Phase 7: Best Practices

### 7.1 Test Writing Guidelines
1. **Use test IDs** for reliable element selection
   ```jsx
   <TouchableOpacity testID="save-button">
   ```

2. **Avoid hardcoded waits**
   ```yaml
   # Bad
   - wait: 5
   
   # Good
   - waitForAnimationToEnd
   - assertVisible: "Element"
   ```

3. **Test isolation**
   - Each test should be independent
   - Clean state before each test
   - Use unique test data

4. **Descriptive test names**
   ```yaml
   # Good
   user_can_follow_another_user_from_profile.yaml
   
   # Bad
   test1.yaml
   ```

### 7.2 Maintenance Strategy
- Weekly test review meetings
- Quarterly test refactoring
- Flaky test tracking and fixing
- Test documentation updates

## Implementation Timeline

**Week 1-2**: Setup & Infrastructure
- Install Maestro
- Configure test builds
- Set up CI/CD

**Week 3-4**: Core Test Development
- Auth flows
- Discovery flows
- Social flows

**Week 5-6**: Extended Coverage
- Content creation
- Profile management
- Edge cases

**Week 7-8**: Optimization & Documentation
- Performance tuning
- Documentation
- Team training

## Success Metrics
- 80% coverage of critical user journeys
- < 5% test flakiness rate
- < 30 min full suite execution
- 100% PR validation coverage

## Tools & Resources
- [Maestro Documentation](https://maestro.mobile.dev)
- [Expo Testing Guide](https://docs.expo.dev/develop/unit-testing/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)