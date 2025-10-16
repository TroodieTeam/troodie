# Troodie Documentation Index

Complete documentation structure for the Troodie codebase.

## 📚 Main Documentation

### Core Files
- **[CLAUDE.md](./CLAUDE.md)** - Main project guide for Claude Code
- **[README.md](./README.md)** - Project overview and setup
- **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** - This file

## 🗄️ Database & Migrations

### Migration Documentation
- **[supabase/migrations/MIGRATION_CONSOLIDATION_GUIDE.md](./supabase/migrations/MIGRATION_CONSOLIDATION_GUIDE.md)**
  - Strategy for consolidating 108+ migrations
  - Best practices for production deployment
  - Migration cleanup procedures

- **[supabase/consolidate_migrations.sh](./supabase/consolidate_migrations.sh)**
  - Automated migration cleanup script
  - Removes test/debug files
  - Archives old migrations

### Current State
- **108 migration files** (as of Oct 2025)
- Migrations need consolidation before v1.0 production
- See consolidation guide for cleanup plan

## 🔧 Services Documentation

### Overview
- **[services/CLAUDE.md](./services/CLAUDE.md)**
  - Complete services architecture
  - Common patterns and best practices
  - Service categories and index
  - Testing and debugging guides

### Feature-Specific Guides

#### Board System
- **[services/boards/CLAUDE.md](./services/boards/CLAUDE.md)**
  - `boardService.ts` - CRUD operations
  - `boardInvitationService.ts` - Invitation system
  - Board types and collaboration
  - Database schema and RLS
  - Troubleshooting invitation issues

#### Notification System
- **[services/notifications/CLAUDE.md](./services/notifications/CLAUDE.md)**
  - `notificationService.ts` - Core notifications
  - `pushNotificationService.ts` - Push delivery
  - `notificationPreferencesService.ts` - User settings
  - Notification types and data structures
  - Real-time subscriptions
  - Navigation patterns

#### Post System
- **[services/posts/CLAUDE.md](./services/posts/CLAUDE.md)**
  - `postService.ts` - Post CRUD
  - `postEngagementService.ts` - Likes, comments, saves
  - `postMediaService.ts` - Image/video handling
  - Post types (reviews, simple, external)
  - Feed generation
  - Engagement patterns

#### Media & Storage
- **[services/media/CLAUDE.md](./services/media/CLAUDE.md)**
  - `imageUploadServiceV2.ts` - Modern uploads
  - `storageService.ts` - Supabase Storage
  - `intelligentCoverPhotoService.ts` - AI cover selection
  - Storage buckets and RLS
  - Image optimization
  - Upload patterns

### Quick Service Reference

| Service Category | Key Files | Documentation |
|-----------------|-----------|---------------|
| **Authentication** | `authService.ts`, `userService.ts` | See services/CLAUDE.md |
| **Boards** | `boardService.ts`, `boardInvitationService.ts` | services/boards/CLAUDE.md |
| **Posts** | `postService.ts`, `postEngagementService.ts` | services/posts/CLAUDE.md |
| **Notifications** | `notificationService.ts`, `pushNotificationService.ts` | services/notifications/CLAUDE.md |
| **Media** | `imageUploadServiceV2.ts`, `storageService.ts` | services/media/CLAUDE.md |
| **Restaurants** | `restaurantService.ts`, `googlePlacesService.ts` | services/CLAUDE.md |
| **Communities** | `communityService.ts`, `communityAdminService.ts` | services/CLAUDE.md |
| **Social** | `followService.ts`, `activityFeedService.ts` | services/CLAUDE.md |

## 🐛 Troubleshooting & Fixes

### Recent Fixes
- **[BOARD_INVITATION_FIX_SUMMARY.md](./BOARD_INVITATION_FIX_SUMMARY.md)**
  - Fixed board invitation modal not showing
  - Navigation parameter fix

- **[BOARD_INVITATION_RLS_FIX.md](./BOARD_INVITATION_RLS_FIX.md)**
  - Fixed RLS policies blocking invitation queries
  - Removed auth.users access from policies

- **[FIX_BOARD_INVITATIONS.md](./FIX_BOARD_INVITATIONS.md)**
  - Historical board invitation debugging

- **[BRANCH_IMPLEMENTATION_AND_TESTING_GUIDE.md](./BRANCH_IMPLEMENTATION_AND_TESTING_GUIDE.md)**
  - Branch workflow and testing procedures

## 📱 App Architecture

### Navigation
- **File-based routing** with Expo Router
- Routes in `app/` directory
- Deep linking configured for all major screens

### Key Screens
```
app/
├── (tabs)/
│   ├── index.tsx           # Feed screen
│   ├── explore.tsx         # Search/discover
│   ├── add.tsx            # Create post
│   ├── activity.tsx       # Notifications
│   └── profile.tsx        # User profile
├── boards/
│   └── [id].tsx           # Board detail
├── notifications/
│   └── index.tsx          # Notifications list
├── restaurant/
│   └── [id].tsx           # Restaurant detail
└── _layout.tsx            # Root layout
```

### State Management
- **AuthContext** - User session and profile
- **AppContext** - App-wide settings
- **OnboardingContext** - Onboarding state
- **Local state** - Component-level with hooks

### Data Layer
- **Supabase** - PostgreSQL + Realtime + Storage + Auth
- **Services** - Business logic layer (services/)
- **Types** - TypeScript definitions (lib/supabase.ts, types/)
- **RLS** - Row Level Security on all tables

## 🔐 Security

### Row Level Security (RLS)
- All tables have RLS enabled
- Policies in `supabase/migrations/003_row_level_security.sql`
- Service layer doesn't need auth checks (RLS handles it)

### Authentication
- Phone-based OTP via Supabase Auth
- Session persistence with AsyncStorage
- Auto-refresh tokens

### Storage Security
- Bucket-level RLS policies
- User folder isolation
- Public/private bucket separation

## 🧪 Testing

### Testing Documentation

#### Comprehensive Testing Plan
- **[TESTING_GAP_ANALYSIS_AND_ROADMAP.md](./TESTING_GAP_ANALYSIS_AND_ROADMAP.md)**
  - Complete gap analysis of current testing state
  - Detailed implementation roadmap (12-week plan)
  - AI-driven TDD workflow design
  - Coverage targets by layer (services, components, hooks, utils)
  - Priority matrix and dependency order
  - Success metrics and milestones

#### Quick Start & Templates
- **[TESTING_QUICK_START.md](./TESTING_QUICK_START.md)**
  - 2-hour setup guide for testing infrastructure
  - Install dependencies and configure Jest
  - Create test helpers and mock factories
  - Setup CI/CD pipeline
  - Verification steps and troubleshooting

- **[AI_FEATURE_DEVELOPMENT_TEMPLATE.md](./AI_FEATURE_DEVELOPMENT_TEMPLATE.md)**
  - Complete workflow template for AI-driven feature development
  - Phase-by-phase TDD implementation guide
  - Example feature implementation (tipping system)
  - Test patterns for services, hooks, components, E2E
  - Verification checklist and success criteria

- **[TDD_WORKFLOW_AND_TEST_PLAN.md](./TDD_WORKFLOW_AND_TEST_PLAN.md)**
  - Original TDD workflow documentation
  - Test strategy overview
  - Comprehensive test plan by feature
  - Testing tools and setup
  - Best practices and patterns

### Current Test Coverage

#### Unit Tests (3 services, ~7% coverage)
- ✅ `communityService.test.ts` - Comprehensive coverage
- ✅ `restaurantService.test.ts` - Basic coverage
- ✅ `locationService.test.ts` - Basic coverage

#### E2E Tests (14 flows, ~70% critical flows)
- ✅ Authentication flows (login, signup, logout)
- ✅ Content creation (create review, save to board)
- ✅ Discovery (search, filter, city selector, save restaurant)
- ✅ Profile (edit profile, upload avatar)
- ✅ Social (follow user, like review, comment)

#### Coverage Gaps
- ❌ 44 untested services (93% gap)
- ❌ 90+ untested components (100% gap)
- ❌ 18 untested hooks (100% gap)
- ❌ 16 untested utilities (100% gap)
- ❌ 0 integration tests (100% gap)
- ⚠️ ~6 missing E2E flows (30% gap)

### Test Types & Commands
- **Unit tests**: Jest + React Native Testing Library
- **Integration tests**: Cross-service flow testing
- **Component tests**: React component testing
- **E2E tests**: Maestro flows

```bash
# Unit & Integration Tests
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report

# E2E Tests
npm run test:e2e            # All E2E tests
npm run test:e2e:smoke      # Smoke tests only
npm run test:e2e:ios        # iOS only
npm run test:e2e:android    # Android only

# Quality Checks
npm run typecheck           # TypeScript check
npm run lint                # ESLint check

# Test Data Management
npm run test:data:seed      # Seed test data
npm run test:data:cleanup   # Clean up
npm run test:data:reset     # Reset to fresh state
```

### Testing Infrastructure

#### Dependencies Required
```bash
npm install --save-dev \
  jest \
  @testing-library/react-native \
  @testing-library/jest-native \
  @testing-library/react-hooks \
  @types/jest \
  @faker-js/faker \
  jest-extended
```

#### Test Utilities Location
```
__tests__/
├── helpers/
│   ├── mockFactories.ts       # Generate mock data
│   ├── supabaseMocks.ts       # Mock Supabase client
│   ├── testBuilders.ts        # Fluent test data builders
│   └── integrationSetup.ts    # Integration test setup
├── services/                  # Service unit tests
├── components/                # Component tests
├── hooks/                     # Hook tests
├── utils/                     # Utility tests
└── integration/               # Integration tests
```

### Testing Roadmap

#### Phase 1: Foundation (Week 1) - **PENDING**
- [ ] Install all testing dependencies
- [ ] Create test utilities and mocks
- [ ] Setup CI/CD for tests
- [ ] Update documentation

#### Phase 2: Core Services (Weeks 2-5) - **PENDING**
- [ ] Auth services (80%+ coverage)
- [ ] Board services (80%+ coverage)
- [ ] Post services (80%+ coverage)
- [ ] Restaurant services (80%+ coverage)

#### Phase 3: Advanced Features (Weeks 6-9) - **PENDING**
- [ ] Social & notification services
- [ ] All critical hooks
- [ ] All critical utilities
- [ ] 50%+ component coverage

#### Phase 4: Full Coverage (Weeks 10-12) - **PENDING**
- [ ] 70%+ component coverage
- [ ] 100% critical E2E flows
- [ ] All integration tests
- [ ] Coverage thresholds met

### AI-Driven Development

Once testing infrastructure is complete, AI can autonomously:
1. ✅ Implement new features with full test coverage
2. ✅ Follow TDD workflow (Red → Green → Refactor)
3. ✅ Verify implementations meet acceptance criteria
4. ✅ Detect regressions before code review
5. ✅ Create comprehensive documentation
6. ✅ Generate PRs with full context

See [AI_FEATURE_DEVELOPMENT_TEMPLATE.md](./AI_FEATURE_DEVELOPMENT_TEMPLATE.md) for complete workflow.

## 📦 Key Dependencies

### Core
- **Expo** - React Native framework
- **Supabase** - Backend platform
- **TypeScript** - Type safety
- **Expo Router** - Navigation

### UI
- **React Native** - Mobile UI
- **Lucide Icons** - Icon library
- **React Native Toast Message** - Toast notifications

### Services
- **Google Places API** - Restaurant data
- **Expo Image Picker** - Image selection
- **Expo Notifications** - Push notifications

## 🚀 Deployment

### Environments
- **Development**: `.env.development`
- **Production**: `.env.production`
- **Build profiles**: `eas.json`

### Build Commands
```bash
eas build --profile development
eas build --profile production
```

### Database Migrations
```bash
# After consolidation
npx supabase db push  # Push to remote
```

## 📝 Making Changes

### Adding a Feature
1. Plan database schema changes
2. Create migration file
3. Update service layer
4. Update TypeScript types
5. Build UI components
6. Add to documentation
7. Write tests

### Modifying a Service
1. Read relevant services/*/CLAUDE.md
2. Update service methods
3. Update types if needed
4. Test changes
5. Update documentation
6. Check for RLS impacts

### Database Changes
1. Create timestamped migration file
2. Test on local/dev environment
3. Document in migration file
4. Update service layer
5. Update TypeScript types
6. Deploy to production

## 🔍 Finding Information

### "Where is...?"
- **Database schema**: `supabase/migrations/`
- **Business logic**: `services/`
- **UI components**: `components/`
- **Screens**: `app/`
- **Types**: `lib/supabase.ts`, `types/`
- **Constants**: `constants/`
- **Utilities**: `lib/`, `utils/`

### "How do I...?"
- **Create a post**: See services/posts/CLAUDE.md
- **Send a notification**: See services/notifications/CLAUDE.md
- **Upload an image**: See services/media/CLAUDE.md
- **Invite to board**: See services/boards/CLAUDE.md
- **Add a service**: See services/CLAUDE.md

### "Why is...?"
- **Query returning empty**: Check RLS policies
- **Upload failing**: Check storage bucket RLS
- **Notification not showing**: Check notification type handler
- **Modal not appearing**: Check URL params and invitation_id

## 🔄 Keeping Documentation Updated

### When to Update
- Adding new services → Update services/CLAUDE.md + create specific doc
- Changing database → Update migration docs + service docs
- Fixing bugs → Document in troubleshooting section
- Adding features → Update relevant feature docs

### Documentation Standards
- Use Markdown format
- Include code examples
- Add troubleshooting sections
- Link to related files
- Keep examples up to date

## 📞 Getting Help

### Resources
1. Check this documentation index
2. Read feature-specific docs
3. Check troubleshooting sections
4. Review recent fix documents
5. Check git history for context

### Common Issues
- See individual feature CLAUDE.md files
- Check recent fix documents (BOARD_INVITATION_*.md)
- Review RLS policies if queries fail
- Test authentication state first

## 📈 Project Status

### Current State (Oct 2025)
- ✅ Core functionality complete
- ✅ Services documented
- ⚠️ Migrations need consolidation
- 🔄 Preparing for v1.0 production
- 📝 Documentation in progress

### Next Steps
1. Consolidate migrations (see guide)
2. Complete E2E test coverage
3. Performance optimization
4. Production deployment
5. User acceptance testing
