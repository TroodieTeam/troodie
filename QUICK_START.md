# Quick Start Guide

New to this codebase? Start here!

## 🎯 Documentation Navigation

### Start Here
1. **[CLAUDE.md](./CLAUDE.md)** - Main project guide (architecture, commands, patterns)
2. **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** - Find any documentation
3. **[DOCUMENTATION_SUMMARY.md](./DOCUMENTATION_SUMMARY.md)** - What exists and why

### Feature Guides
- **Boards**: [services/boards/CLAUDE.md](./services/boards/CLAUDE.md)
- **Notifications**: [services/notifications/CLAUDE.md](./services/notifications/CLAUDE.md)
- **Posts**: [services/posts/CLAUDE.md](./services/posts/CLAUDE.md)
- **Media**: [services/media/CLAUDE.md](./services/media/CLAUDE.md)
- **All Services**: [services/CLAUDE.md](./services/CLAUDE.md)

## 🚀 Project Setup

### Prerequisites
```bash
node >= 18
npm >= 9
Expo CLI
```

### Install & Run
```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Environment
Copy `.env.development` and configure:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GOOGLE_MAPS_API_KEY`

## 📁 Project Structure

```
troodie/
├── app/                    # Screens (Expo Router)
│   ├── (tabs)/            # Tab navigation
│   ├── boards/            # Board screens
│   └── notifications/     # Notification screens
├── services/              # Business logic (46 services)
│   ├── boardService.ts
│   ├── postService.ts
│   └── ...
├── components/            # Reusable UI
├── contexts/              # React Context
├── hooks/                 # Custom hooks
├── lib/                   # Utilities
├── types/                 # TypeScript types
├── supabase/
│   └── migrations/        # Database migrations (108 files)
└── constants/             # Design tokens, config
```

## 🎓 Learning Path

### Day 1: Understand the Architecture
1. Read [CLAUDE.md](./CLAUDE.md) sections:
   - Project Overview
   - Architecture
   - Key Service Patterns
2. Explore `app/` directory structure
3. Look at a few services in `services/`

### Day 2: Database & Services
1. Browse `supabase/migrations/` to understand schema
2. Read [services/CLAUDE.md](./services/CLAUDE.md)
3. Pick a feature you'll work on, read its CLAUDE.md

### Day 3: Make Your First Change
1. Find a small task or bug
2. Read the relevant service docs
3. Make the change following existing patterns
4. Test locally

## 🔍 Finding Things

### "Where is the code for...?"

| Feature | Service | Screen |
|---------|---------|--------|
| User login | `services/authService.ts` | `app/(auth)/` |
| Creating boards | `services/boardService.ts` | `app/boards/` |
| Board invites | `services/boardInvitationService.ts` | `app/boards/[id].tsx` |
| Notifications | `services/notificationService.ts` | `app/notifications/` |
| Posts/Feed | `services/postService.ts` | `app/(tabs)/index.tsx` |
| Image upload | `services/imageUploadServiceV2.ts` | Used everywhere |
| Restaurants | `services/restaurantService.ts` | `app/restaurant/` |

### "How do I...?"

**Create a board:**
```typescript
import { boardService } from '@/services/boardService';

const board = await boardService.createBoard({
  userId: user.id,
  name: 'My Board',
  description: 'Cool restaurants',
  is_private: false
});
```

**Send an invitation:**
```typescript
import { boardInvitationService } from '@/services/boardInvitationService';

await boardInvitationService.inviteByUserId(
  boardId,
  inviterId,
  inviteeId
);
```

**Upload an image:**
```typescript
import { imageUploadServiceV2 } from '@/services/imageUploadServiceV2';

const url = await imageUploadServiceV2.uploadImage(
  imageUri,
  'post-photos',
  `${userId}/${Date.now()}.jpg`
);
```

**Query the database:**
```typescript
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase
  .from('boards')
  .select('*')
  .eq('user_id', userId);
```

## 🐛 Debugging

### Common Issues

**Query returns empty:**
- Check RLS policies in migrations
- Verify user is authenticated
- Check auth.uid() matches expected user

**Upload fails:**
- Check storage bucket exists
- Verify RLS allows upload
- Check file size < 50MB

**Notification not showing:**
- Check notification was created (query DB)
- Verify navigation handler exists
- Check real-time subscription is active

**Modal not appearing:**
- Check URL params are passed correctly
- Verify data exists in database
- Check RLS allows reading the data

### Debugging Tools

```typescript
// Check auth state
const { data: { session } } = await supabase.auth.getSession();
console.log('User:', session?.user?.id);

// Test query directly
const { data, error } = await supabase
  .from('table_name')
  .select('*');
console.log('Data:', data, 'Error:', error);

// Check RLS policies
// In Supabase dashboard → SQL Editor:
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

## 📚 Key Concepts

### Services Layer
- All database operations go through services
- Services import from `@/lib/supabase`
- Return `{ data, error }` or just `data`
- No direct DB access in components

### Row Level Security (RLS)
- All tables have RLS enabled
- Policies auto-filter by `auth.uid()`
- Services don't need manual auth checks
- If query returns empty, check RLS policies

### Expo Router
- File-based routing in `app/`
- `[id].tsx` = dynamic route
- `(tabs)/` = tab group
- Navigation: `router.push('/path')`

### TypeScript
- Strict mode enabled
- Database types in `lib/supabase.ts`
- Component props always typed
- Use `@/` for imports

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Type checking
npm run typecheck

# Linting
npm run lint
```

## 📖 Documentation

### When you need...
- **Big picture**: [CLAUDE.md](./CLAUDE.md)
- **Find anything**: [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)
- **Specific feature**: `services/{feature}/CLAUDE.md`
- **Troubleshooting**: Check feature docs → troubleshooting section
- **Recent fixes**: `*_FIX.md` files in root

### Update docs when...
- Adding features
- Fixing bugs
- Changing patterns
- Finding issues

## 🚨 Important Notes

### Before Making Changes
1. Read the relevant service documentation
2. Understand the database schema
3. Check if RLS policies need updates
4. Follow existing patterns

### Before Committing
1. Test your changes
2. Run type checking
3. Update documentation
4. Write clear commit message

### Before Deploying
1. Test on staging
2. Check migration order
3. Verify RLS policies
4. Update version numbers

## 🆘 Getting Help

### In Order
1. Check this Quick Start
2. Read feature-specific CLAUDE.md
3. Check troubleshooting sections
4. Review recent fix documents
5. Check git history
6. Ask team/Claude Code

## 🎯 Your First Tasks

### Good Starter Tasks
- Fix a UI bug
- Add a small feature to existing screen
- Improve error messages
- Update documentation
- Add tests

### Avoid Initially
- Changing database schema
- Modifying RLS policies
- Refactoring core services
- Changing authentication

## 📝 Cheat Sheet

```typescript
// Import paths (use @/ alias)
import { service } from '@/services/serviceName';
import { Component } from '@/components/Component';
import { useHook } from '@/hooks/useHook';

// Service pattern
const data = await service.getData(id);
if (!data) {
  console.error('Failed to get data');
  return;
}

// Database query
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('id', id)
  .single();

// Navigation
import { useRouter } from 'expo-router';
const router = useRouter();
router.push('/path');
router.push(`/item/${id}`);
router.push(`/item/${id}?param=value`);

// Image upload
const url = await imageUploadServiceV2.uploadImage(
  uri,
  bucket,
  path
);

// Get current user
const { user } = useAuth();
```

## ✅ Ready to Code?

1. Clone the repo ✓
2. Install dependencies ✓
3. Configure environment ✓
4. Read this guide ✓
5. Pick a task
6. Read relevant docs
7. Make changes
8. Test
9. Commit
10. Celebrate! 🎉

---

**Need more details?** → [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)

**Want to understand architecture?** → [CLAUDE.md](./CLAUDE.md)

**Working on a feature?** → `services/{feature}/CLAUDE.md`
