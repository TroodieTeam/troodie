# Services Layer Documentation

This directory contains all service layer modules for the Troodie app. Services handle all business logic and database interactions.

## Service Architecture

### Principles
1. **Single Responsibility**: Each service handles one domain
2. **Type Safety**: All services use TypeScript with strict types
3. **Error Handling**: Services return `{ data, error }` patterns
4. **Supabase Integration**: All services import from `@/lib/supabase`
5. **No Direct DB Access in Components**: Components only call services

### Service Categories

#### Core User Services
- **authService.ts** - Authentication, user profiles, account types
- **userService.ts** - User CRUD operations
- **profileService.ts** - User profile management
- **accountService.ts** - Account type upgrades (consumer→creator→business)
- **followService.ts** - User follow/unfollow operations
- **userSearchService.ts** - Search users by name/username

#### Content Services
- **postService.ts** - Post CRUD, feed queries
- **postEngagementService.ts** - Likes, comments, saves
- **enhancedPostEngagementService.ts** - Advanced engagement features
- **postMediaService.ts** - Post image/video handling
- **shareService.ts** - Share posts/boards/restaurants

#### Board Services
- **boardService.ts** - Board CRUD, members, restaurants
- **boardServiceExtended.ts** - Advanced board features
- **boardInvitationService.ts** - Board invitations (send, accept, decline)
- **saveService.ts** - Save restaurants to boards

#### Restaurant Services
- **restaurantService.ts** - Restaurant CRUD, search
- **restaurantClaimService.ts** - Business owner claims
- **restaurantImageService.ts** - Restaurant photo management
- **restaurantImageSyncService.ts** - Sync with Google Places
- **restaurantPhotosService.ts** - Photo upload/retrieval
- **googlePlacesService.ts** - Google Places API integration
- **ratingService.ts** - Restaurant ratings

#### Community Services
- **communityService.ts** - Community CRUD, members
- **communityAdminService.ts** - Admin controls, moderation
- **communityDiscoveryService.ts** - Discover/explore communities
- **moderationService.ts** - Content moderation

#### Notification Services
- **notificationService.ts** - In-app notifications
- **notificationPreferencesService.ts** - User notification settings
- **pushNotificationService.ts** - Push notification delivery
- **statusNotificationService.ts** - Status update notifications

#### Media Services
- **imageUploadService.ts** - Base64 image uploads (legacy)
- **imageUploadServiceV2.ts** - Modern image uploads
- **imageUploadServiceFormData.ts** - FormData uploads
- **storageService.ts** - Supabase Storage operations
- **intelligentCoverPhotoService.ts** - Auto-select cover photos

#### Creator/Business Services
- **creatorApplicationService.ts** - Creator account applications
- **restaurantClaimService.ts** - Restaurant ownership claims
- **localGemsService.ts** - Local restaurant recommendations

#### Utility Services
- **toastService.ts** - Toast message helper
- **linkMetadataService.ts** - Extract link previews
- **locationService.ts** - Location/GPS services
- **activityFeedService.ts** - Activity feed generation
- **socialActivityService.ts** - Social activity tracking
- **achievementService.ts** - User achievements
- **inviteService.ts** - App invitations
- **blockingService.ts** - User blocking
- **adminReviewService.ts** - Admin review queue

## Common Patterns

### 1. Service Structure
```typescript
import { supabase } from '@/lib/supabase';

class MyService {
  async getItem(id: string): Promise<Item | null> {
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error:', error);
      return null;
    }

    return data;
  }
}

export const myService = new MyService();
```

### 2. Return Patterns
Services use consistent return patterns:

**Simple Query:**
```typescript
return data || null;
```

**With Error Handling:**
```typescript
return { data, error: error?.message };
```

**With Success Flag:**
```typescript
return { success: true, data, error: null };
```

### 3. RLS (Row Level Security)
- All database tables have RLS enabled
- Services don't need to check auth manually
- RLS policies automatically filter by `auth.uid()`
- See `supabase/migrations/003_row_level_security.sql`

### 4. Real-time Subscriptions
Services that need real-time data use custom hooks:
- `hooks/useRealtimeFeed.ts` - Real-time post updates
- `hooks/useRealtimeNotifications.ts` - Real-time notifications
- See service file + corresponding hook

## Testing Services

### Manual Testing
```typescript
import { myService } from '@/services/myService';

// In component or test
const result = await myService.getItem('123');
console.log(result);
```

### Integration with Components
```typescript
// In React component
import { useEffect, useState } from 'react';
import { myService } from '@/services/myService';

function MyComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function load() {
      const result = await myService.getItem('123');
      setData(result);
    }
    load();
  }, []);

  return <View>...</View>;
}
```

## Adding a New Service

### Checklist
1. Create `services/newService.ts`
2. Import supabase client
3. Define TypeScript interfaces
4. Implement methods with error handling
5. Export singleton instance
6. Add to this documentation
7. Create corresponding CLAUDE.md if complex

### Template
```typescript
import { supabase } from '@/lib/supabase';

export interface MyEntity {
  id: string;
  name: string;
  created_at: string;
}

class NewService {
  /**
   * Get entity by ID
   */
  async getById(id: string): Promise<MyEntity | null> {
    const { data, error } = await supabase
      .from('my_table')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[NewService] Error fetching:', error);
      return null;
    }

    return data;
  }

  /**
   * Create new entity
   */
  async create(entity: Omit<MyEntity, 'id' | 'created_at'>): Promise<MyEntity | null> {
    const { data, error } = await supabase
      .from('my_table')
      .insert(entity)
      .select()
      .single();

    if (error) {
      console.error('[NewService] Error creating:', error);
      return null;
    }

    return data;
  }
}

export const newService = new NewService();
```

## Debugging Services

### Enable Detailed Logging
Add console.log statements with service prefix:
```typescript
console.log('[ServiceName] Operation:', data);
console.error('[ServiceName] Error:', error);
```

### Check RLS Policies
If queries return empty:
```sql
-- Check if RLS is blocking
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

### Verify Auth State
```typescript
const { data: { session } } = await supabase.auth.getSession();
console.log('Current user:', session?.user?.id);
```

## Service-Specific Documentation

For complex services, see individual CLAUDE.md files:
- `services/boards/CLAUDE.md` - Board system
- `services/posts/CLAUDE.md` - Posts system
- `services/notifications/CLAUDE.md` - Notifications
- `services/media/CLAUDE.md` - Media handling
- `services/creator/CLAUDE.md` - Creator features

## Migration Impact

When database schema changes:
1. Update service methods
2. Update TypeScript types
3. Test all affected queries
4. Update documentation
5. Check RLS policies still work
