# Claude Code Context - Troodie Project

This file provides essential context for AI-assisted development sessions. Always reference this file when starting a new development task.

## Tech Stack

### Frontend
- **Framework**: React Native with Expo SDK 51
- **Language**: TypeScript (strict mode)
- **Navigation**: Expo Router (file-based)
- **State Management**: React hooks + Context API
- **Forms**: React Hook Form
- **Styling**: StyleSheet + Themed components
- **Images**: Expo Image component

### Backend
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth (Email OTP only, no passwords)
- **Storage**: Supabase Storage (avatars, post-photos, portfolio buckets)
- **Real-time**: Supabase Realtime subscriptions
- **API**: Supabase auto-generated REST APIs
- **Edge Functions**: Supabase Edge Functions (Deno)

### Development Tools
- **Package Manager**: npm
- **Testing**: Jest + React Native Testing Library
- **Linting**: ESLint with React Native config
- **Type Checking**: TypeScript compiler
- **Build**: Expo EAS Build

## Project Structure

```
troodie/
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Tab navigation screens
│   ├── auth/              # Authentication flows
│   ├── onboarding/        # User onboarding
│   ├── restaurant/        # Restaurant details
│   ├── creator/           # Creator marketplace
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
│   ├── cards/            # Card components
│   ├── ui/               # UI primitives
│   └── creator/          # Creator-specific
├── services/             # Business logic
│   ├── supabase.ts       # Supabase client
│   ├── authService.ts    # Authentication
│   └── *Service.ts       # Domain services
├── hooks/                # Custom React hooks
├── types/                # TypeScript definitions
├── constants/            # App constants
├── utils/                # Utility functions
└── docs/                 # Documentation
```

## Code Conventions

### General Patterns
- **Components**: Functional components only (no class components)
- **Hooks**: Custom hooks in `hooks/` folder, prefixed with `use`
- **Services**: Business logic in `services/` folder, suffixed with `Service`
- **Types**: TypeScript interfaces in `types/` folder
- **Async**: Always use async/await over raw promises
- **Errors**: Try/catch with user-friendly error messages

### Naming Conventions
- **Files**: PascalCase for components, camelCase for utilities
- **Components**: PascalCase (e.g., `RestaurantCard`)
- **Functions**: camelCase (e.g., `getUserProfile`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_UPLOAD_SIZE`)
- **Types/Interfaces**: PascalCase, prefixed with I for interfaces

### Component Pattern
```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLoading } from '@/hooks/useLoading';

interface ComponentNameProps {
  prop1: string;
  prop2?: number;
}

export default function ComponentName({ prop1, prop2 = 0 }: ComponentNameProps) {
  const [state, setState] = useState<string>('');
  const { loading, setLoading } = useLoading();

  useEffect(() => {
    // Effect logic
  }, []);

  return (
    <View style={styles.container}>
      <Text>{prop1}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

### Service Pattern
```typescript
import { supabase } from '@/lib/supabase';

class ServiceName {
  async getData(id: string) {
    try {
      const { data, error } = await supabase
        .from('table_name')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('ServiceName.getData error:', error);
      throw new Error('Failed to fetch data');
    }
  }
}

export const serviceName = new ServiceName();
```

## Database Patterns

### Key Tables
- `users` - User profiles (extends auth.users)
- `restaurants` - Restaurant data with Google Places integration
- `posts` - User posts (original and external content)
- `restaurant_saves` - User bookmarks
- `boards` - Collections of restaurants
- `communities` - User communities
- `creator_profiles` - Creator marketplace profiles
- `business_profiles` - Restaurant owner profiles
- `campaigns` - Marketing campaigns

### Common Patterns
- **Soft Deletes**: Use `deleted_at` timestamp instead of hard deletes
- **Audit Fields**: All tables have `created_at`, `updated_at`
- **UUIDs**: All IDs are UUID type
- **RLS**: Row Level Security enabled on all tables
- **Functions**: Complex logic in PostgreSQL functions
- **Triggers**: Automated updates via triggers

### Authentication Flow
1. User enters email
2. OTP sent via Supabase Auth
3. User enters 6-digit code
4. After verification, `ensure_user_profile()` creates profile
5. Default "Quick Saves" board created automatically
6. **NO auth triggers** - profile creation happens in-app

## Common Services & Utilities

### Image Upload
```typescript
// Always use ImageUploadServiceV2 for image uploads
import { imageUploadService } from '@/services/imageUploadServiceV2';

const url = await imageUploadService.uploadImage(
  imageUri,
  'bucket-name',
  'folder/path'
);
```

### Error Handling
```typescript
try {
  // Operation
} catch (error) {
  console.error('Context:', error);
  Alert.alert('Error', 'User-friendly message');
}
```

### Loading States
```typescript
import { useLoading } from '@/hooks/useLoading';

const { loading, setLoading } = useLoading();

const handleAction = async () => {
  setLoading(true);
  try {
    // Async operation
  } finally {
    setLoading(false);
  }
};
```

## Testing Commands

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Run tests
npm test

# Build check
npx expo prebuild --clean

# Start development
npx expo start
```

## Current Feature Areas

### Creator Marketplace
- Location: `app/creator/`, `components/creator/`
- Tables: `creator_profiles`, `campaigns`, `portfolio_items`
- Services: `creatorService`, `campaignService`

### Restaurant Management
- Location: `app/restaurant/`, `app/(tabs)/explore.tsx`
- Tables: `restaurants`, `restaurant_images`, `restaurant_saves`
- Services: `restaurantService`, `googlePlacesService`

### Social Features
- Location: `app/(tabs)/home.tsx`, `app/posts/`
- Tables: `posts`, `post_likes`, `post_comments`, `user_relationships`
- Services: `postService`, `socialService`

### Boards & Communities
- Location: `app/boards/`, `app/communities/`
- Tables: `boards`, `board_members`, `communities`, `community_members`
- Services: `boardService`, `communityService`

## Environment Variables

```bash
# .env.local
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_key
```

## Common Issues & Solutions

### Issue: "Database error saving new user"
**Solution**: Remove auth triggers, use `ensure_user_profile()` function after OTP verification

### Issue: Images not uploading
**Solution**: Use `ImageUploadServiceV2` with base64 encoding method

### Issue: RLS policy violations
**Solution**: Check user authentication and table RLS policies

### Issue: Navigation not working
**Solution**: Ensure using Expo Router's `router.push()` not React Navigation

## Performance Considerations

- **Images**: Resize to max 800px width before upload
- **Lists**: Implement pagination for >20 items
- **Queries**: Use select() to limit fields returned
- **Real-time**: Subscribe only to necessary channels
- **Cache**: Use React Query or SWR for data caching

## Security Notes

- **Never** commit `.env` files
- **Always** validate user input
- **Use** RLS policies for data access control
- **Sanitize** user-generated content
- **Validate** file uploads (type, size)
- **Check** user permissions before operations

## Deployment

### Development
```bash
npx expo start
```

### Staging
```bash
eas build --profile preview
```

### Production
```bash
eas build --profile production
eas submit
```

## Quick Command Reference

```bash
# Development
npx expo start --clear          # Start with cache cleared
npx expo start --ios            # Start iOS simulator
npx expo start --android        # Start Android emulator

# Database
npx supabase db reset           # Reset local database
npx supabase db push            # Push migrations
npx supabase gen types typescript --local > types/supabase.ts

# Testing
npm run lint                    # Run ESLint
npm run typecheck              # Run TypeScript check
npm test                       # Run tests

# Build
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

## Contact & Resources

- **Documentation**: `/docs` folder
- **Backend Design**: `/docs/backend-design.md`
- **Database Schema**: Supabase Dashboard > Database > Tables
- **API Docs**: Supabase Dashboard > API Docs

---

**Last Updated**: 2024-01-13
**Version**: 1.0
**Purpose**: AI Assistant Context for Development