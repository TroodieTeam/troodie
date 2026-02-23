# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📚 Documentation Quick Links

**New to this project?** Start with [QUICK_START.md](./QUICK_START.md)

**Looking for specific docs?** See [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)

**Feature-specific guides:**
- [Boards System](./services/boards/CLAUDE.md) - Board CRUD, invitations, collaboration
- [Notifications](./services/notifications/CLAUDE.md) - In-app and push notifications
- [Posts System](./services/posts/CLAUDE.md) - Posts, feed, engagement
- [Media/Storage](./services/media/CLAUDE.md) - Image uploads, storage buckets
- [All Services](./services/CLAUDE.md) - Complete services overview

**Database:**
- [Migration Consolidation Guide](./supabase/migrations/MIGRATION_CONSOLIDATION_GUIDE.md)

**Recent Fixes:**
- [Board Invitation Modal Fix](./BOARD_INVITATION_FIX_SUMMARY.md)
- [Board Invitation RLS Fix](./BOARD_INVITATION_RLS_FIX.md)

**Development Workflow Skills:**
- `/explore` - Expand a raw idea into a structured idea spec
- `/groom` - Refine a ticket/idea into a technical spec with stakeholder questions
- `/groom --approve [name]` - Incorporate stakeholder answers and approve spec
- `/execute` - Implement an approved spec with self-testing and artifacts
- `/spec-interview` - Deep interactive interview for complex features (existing)

**Feature Lifecycle:**
- `specs/ideas/` - DRAFT idea specs from `/explore`
- `specs/features/[name]/` - Feature specs from `/groom` (spec.md, questions.md, status.md)
- `testing/manual/` - Manual test scripts from `/execute`
- `testing/sql/` - Verification and reset SQL from `/execute`

---

## Project Overview

Troodie is a React Native mobile app built with Expo that helps users discover, save, and share restaurant experiences. The app supports three account types: consumers, creators, and business owners, each with distinct features and workflows.

## Common Commands

### Development
```bash
npm start              # Start Expo dev server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm run web            # Run on web
```

### Testing
```bash
npm test               # Run Jest unit tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report
npm run test:e2e       # Run Maestro E2E tests
npm run test:e2e:ios   # Run E2E tests on iOS
npm run test:e2e:android # Run E2E tests on Android
npm run test:e2e:smoke # Run smoke tests only
```

### Code Quality
```bash
npm run lint           # Run ESLint
npm run typecheck      # Run TypeScript type checking (no emitting)
```

### Database
```bash
npm run db:migrate     # Push Supabase migrations to remote
```

### Production SQL Execution
```bash
node scripts/run-prod-sql.js <sql-file-path>   # Run SQL via Management API
node scripts/run-prod-sql.js data/test-data/prod/10-setup-robust-test-scenario.sql
```
- Uses Supabase Management API with keychain token from `npx supabase login`
- Runs as postgres owner (bypasses RLS)
- Known limitation: SELECT results and RAISE NOTICE output may not display

### E2E Test Data
```bash
npm run test:data:seed    # Seed test data
npm run test:data:cleanup # Clean up test data
npm run test:data:reset   # Reset test data
```

### Production E2E
```bash
EAS_BUILD_PROFILE=production npm start   # Start Expo against production Supabase
maestro test e2e/flows/production/        # Run all production E2E tests
node scripts/run-prod-sql.js data/test-data/prod/10-setup-robust-test-scenario.sql  # Seed production test data
node scripts/run-prod-sql.js data/test-data/prod/11-reset-robust-test-data.sql      # Reset production test data
```

## Architecture

### Authentication & User Flow
- **Phone-based OTP authentication** via Supabase Auth (see `contexts/AuthContext.tsx`)
- **Onboarding flow** managed by `contexts/OnboardingContext.tsx`
- Three account types: `consumer`, `creator`, `business` (stored in `users.account_type`)
- Account upgrades flow: Consumer → Creator (via application) → Business (via restaurant claim)
- **Production auth user creation**: MUST use the GoTrue Admin API (`POST /auth/v1/admin/users`), never direct SQL INSERT into `auth.users`. Direct SQL INSERT creates rows that GoTrue cannot authenticate against because `auth.identities` and internal metadata are not populated. See `LEARNINGS.md` for the full debugging saga.
- **Auth debugging**: When GoTrue returns 500 errors ("Database error checking email" or "Database error loading user"), check `auth.identities` FIRST for orphaned entries referencing non-existent users.

### Navigation Structure
- **File-based routing** using Expo Router (app directory)
- Main tabs: Feed (`(tabs)/index.tsx`), Search, Add, Activity, Profile
- Deep linking support for: `/restaurant/[id]`, `/user/[id]`, `/posts/[id]`, `/boards/[id]`
- Deep link handling in `app/_layout.tsx:59-126`

### Data Layer Architecture
- **Backend**: Supabase (PostgreSQL + Realtime + Storage + Auth)
- **Supabase client**: `lib/supabase.ts` (configured with AsyncStorage for session persistence)
- **Services layer**: All database operations in `services/` directory (e.g., `postService.ts`, `boardService.ts`)
- **Type-safe database**: Comprehensive Database type definitions in `lib/supabase.ts:19-2058`
- **Real-time features**: Custom hooks in `hooks/` (e.g., `useRealtimeFeed.ts`, `useRealtimeNotifications.ts`)

### Key Service Patterns
Services follow consistent patterns:
- Import supabase client from `lib/supabase.ts`
- Return `{ data, error }` objects
- Include type-safe query builders
- Handle RLS (Row Level Security) automatically

Example services:
- `postService.ts` - Post CRUD, engagement (likes, comments, saves)
- `boardService.ts` - Board management, invitations, members
- `restaurantService.ts` - Restaurant data, claims, images
- `authService.ts` - User profile updates, account upgrades
- `notificationService.ts` - Push notifications, in-app notifications

### State Management
- **Auth state**: `AuthContext.tsx` (user session, profile data)
- **App state**: `AppContext.tsx` (app-wide settings, user preferences)
- **Onboarding state**: `OnboardingContext.tsx` (onboarding progress tracking)
- **Component state**: React hooks (useState, useEffect, custom hooks)

### Component Organization
- `components/` - Reusable UI components (e.g., `PostCard.tsx`, `BoardCard.tsx`, `CustomToast.tsx`)
- `app/` - Screen components using file-based routing
- Component patterns: Functional components with TypeScript, hooks for state/effects

### Image Handling
- **Upload service**: `services/imageUploadService.ts` (base64), `imageUploadServiceV2.ts` (newer)
- **Storage buckets**: avatars, restaurant-photos, board-covers, community-images
- **Image manipulation**: Uses `expo-image-manipulator` for resizing/compression before upload
- Intelligent cover photo selection in `services/intelligentCoverPhotoService.ts`

### Notifications
- **Push notifications**: `services/pushNotificationService.ts` + `hooks/usePushNotifications.ts`
- **In-app notifications**: Real-time subscription via `hooks/useRealtimeNotifications.ts`
- **Toast messages**: `react-native-toast-message` with custom config in `components/CustomToast.tsx`
- Notification preferences stored in `notification_preferences` table

## Database Schema Key Tables

Core tables (see migrations in `supabase/migrations/`):
- `users` - User profiles, account types, verification status
- `restaurants` - Restaurant data (Google Places integration + user-submitted)
- `posts` - User posts with photos, ratings, external content support
- `boards` - Collections of saves (free/private/paid types)
- `restaurant_saves` - User saves with personal ratings/notes
- `communities` - Public/private/paid communities
- `notifications` - In-app notifications with real-time updates
- `creator_applications` - Creator account upgrade applications
- `restaurant_claims` - Restaurant ownership claims
- `campaigns` - Business-to-creator marketing campaigns

## Important Patterns

### Error Handling
- Services return `{ data, error }` - always check both
- Use `ErrorState.tsx` component for error UI
- Toast messages for user feedback via `toastService.ts`

### Environment Configuration
- `.env.development` and `.env.production` files
- Loaded in `app.config.js` based on `EAS_BUILD_PROFILE`
- **Important**: `.env.development` loads as the base for ALL profiles. `.env.production` only OVERRIDES variables it explicitly defines. Any variable in `.env.development` not present in `.env.production` persists with its dev value (e.g., `EXPO_PUBLIC_TEST_AUTH_PASSWORD=000000`).
- Access via `Constants.expoConfig.extra.*`
- Required vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GOOGLE_MAPS_API_KEY`

### TypeScript Usage
- Strict mode enabled (`tsconfig.json`)
- Path alias: `@/*` maps to project root
- Database types in `lib/supabase.ts`
- Component props always typed
- Type definitions in `types/` directory

### Testing Approach
- **Unit tests**: Jest with React Native Testing Library (`__tests__/`)
- **E2E tests**: Maestro framework (`e2e/flows/`)
- Test utilities in `e2e/helpers/`
- Mock data in `e2e/fixtures/`
- Use `test:e2e:smoke` for quick validation
- **Production E2E tests**: Flows in `e2e/flows/production/` run against production Supabase. Start Expo with `EAS_BUILD_PROFILE=production npm start`.
- **Toast handling**: Always call `runFlow: ../../helpers/dismiss-toast.yaml` before tab bar interactions in Maestro tests. The iOS 26 simulator shows a persistent location error toast that overlaps the tab bar.
- **Selector strategy**: Prefer `testID` (id:) selectors. When using `visible:` or `assertVisible:`, target standalone Text elements (section headers), not TouchableOpacity items whose accessibilityText concatenates child labels.
- **Test data setup pattern**: Create auth users via Admin API, then create `public.users` and all other application data via SQL using `scripts/run-prod-sql.js`.

### Real-time Subscriptions
Pattern for real-time features:
1. Create subscription in custom hook (see `hooks/useRealtimeFeed.ts`)
2. Subscribe to table changes with filters
3. Handle INSERT/UPDATE/DELETE events
4. Clean up subscription in useEffect return
5. Update local state optimistically

### Multi-Account Support
- Account type stored in `users.account_type` (consumer/creator/business)
- Upgrade flows handled by dedicated services:
  - `creatorApplicationService.ts` for creator upgrades
  - `restaurantClaimService.ts` for business upgrades
- UI adapts based on account type (check `useAccountType.ts` hook)

### Deep Linking
- URL scheme: `troodie://`
- Handled in `app/_layout.tsx` InnerLayout component
- Supports dynamic routes with IDs
- Handles Expo dev server prefix (`--/`)

## Build & Deployment

### EAS Build
```bash
eas build --profile development  # Dev build
eas build --profile preview      # Internal preview
eas build --profile production   # Production build
```

Build configuration in `eas.json` with environment-specific profiles.

### App Configuration
- iOS Bundle ID: `com.troodie.troodie.com`
- iOS Build Number: Managed in `app.config.js:35`
- Deep link scheme: `troodie`
- Sentry DSN configured for error tracking

## External Integrations

- **Supabase**: Database, Auth, Storage, Realtime
- **Google Places API**: Restaurant data enrichment
- **Sentry**: Error tracking and performance monitoring
- **Expo**: Build, updates, notifications infrastructure

## File Path Conventions

When reading code or making changes:
- Import from services: `import { functionName } from '@/services/serviceName'`
- Import from components: `import ComponentName from '@/components/ComponentName'`
- Import from hooks: `import { useHookName } from '@/hooks/useHookName'`
- Import from contexts: `import { useContext } from '@/contexts/ContextName'`

## Critical Files

- `app/_layout.tsx` - Root layout, auth initialization, deep linking
- `contexts/AuthContext.tsx` - Authentication state and user session
- `lib/supabase.ts` - Supabase client and database types
- `app.config.js` - App configuration and environment loading
- `supabase/migrations/` - Database schema and migrations
- `scripts/run-prod-sql.js` - Production SQL runner via Management API
- `data/test-data/prod/10-setup-robust-test-scenario.sql` - Production test data setup (20 accounts)
- `data/test-data/prod/11-reset-robust-test-data.sql` - Production test data teardown
- `e2e/helpers/dismiss-toast.yaml` - Toast dismiss helper for Maestro tests
- `e2e/helpers/login-bypass.yaml` - Reusable login flow for E2E tests
- `e2e/MAESTRO_BEST_PRACTICES.md` - Comprehensive Maestro testing guide
