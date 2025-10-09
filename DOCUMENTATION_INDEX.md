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

### Test Types
- **Unit tests**: Jest + React Native Testing Library
- **E2E tests**: Maestro flows
- **Test commands**: See package.json scripts

### Test Data
```bash
npm run test:data:seed     # Seed test data
npm run test:data:cleanup  # Clean up
npm run test:data:reset    # Reset to fresh state
```

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
