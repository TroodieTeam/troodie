# Supabase Setup Instructions for Troodie

This guide will walk you through setting up the Supabase backend for the Troodie app.

## Prerequisites

- Supabase account (create one at [app.supabase.com](https://app.supabase.com))
- Node.js and npm installed
- Access to the Supabase project credentials

## Project Information

- **Supabase Project URL**: `https://cacrjcekanesymdzpjtt.supabase.co`
- **Project is already created** - You just need to run the migrations

## Setup Steps

### 1. Environment Configuration

The `.env` file has already been created with the necessary credentials:
```
SUPABASE_URL=https://cacrjcekanesymdzpjtt.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Database Setup

Navigate to your Supabase dashboard and run the SQL migrations in order:

1. **Initial Schema** (`supabase/migrations/001_initial_schema.sql`)
   - Creates all core tables (users, restaurants, boards, etc.)
   - Sets up indexes for performance
   - Creates views for common queries
   - Implements update triggers

2. **Storage Buckets** (`supabase/migrations/002_storage_buckets.sql`)
   - Creates storage buckets for avatars, restaurant photos, board covers, and community images
   - Sets up storage policies for access control

3. **Row Level Security** (`supabase/migrations/003_row_level_security.sql`)
   - Enables RLS on all tables
   - Creates security policies for data access
   - Ensures users can only access appropriate data

4. **Utility Functions** (`supabase/migrations/004_utility_functions.sql`)
   - Creates helper functions for rate limiting, notifications, persona calculation
   - Sets up triggers for real-time notifications
   - Enables real-time subscriptions on required tables

### 3. Authentication Setup

1. Go to **Authentication > Providers** in Supabase dashboard
2. Enable **Phone** provider
3. For production, configure SMS provider (Twilio):
   - Add Twilio Account SID
   - Add Twilio Auth Token
   - Add Twilio Message Service SID
   - Customize SMS templates

### 4. Running the App

1. Install dependencies (already done):
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. The app will connect to Supabase using the configured credentials

## File Structure

```
/lib
  └── supabase.ts          # Supabase client configuration

/services
  ├── userService.ts       # User-related operations
  ├── restaurantService.ts # Restaurant operations
  ├── boardService.ts      # Board management
  └── storageService.ts    # File upload handling

/hooks
  ├── useRealtimeFeed.ts        # Real-time feed updates
  ├── useRealtimeNotifications.ts # Real-time notifications
  └── useRealtimeCommunity.ts    # Community real-time updates

/contexts
  └── AuthContext.tsx      # Authentication context with Supabase

/supabase
  └── migrations/          # SQL migration files
```

## Key Features Implemented

1. **Authentication**
   - Phone-based OTP authentication
   - Session management with AsyncStorage
   - Auto-refresh tokens

2. **Database**
   - Complete schema for all app features
   - Row Level Security for data protection
   - Optimized indexes for performance
   - Real-time subscriptions enabled

3. **Storage**
   - Buckets for different file types
   - Public access for viewing
   - Authenticated uploads only
   - Automatic URL generation

4. **Real-time Features**
   - Live feed updates
   - Instant notifications
   - Community post streaming
   - Automatic UI updates

## Testing the Setup

1. **Test Authentication**:
   - Try signing up with a phone number
   - Verify OTP works (use Supabase dashboard logs)

2. **Test Database Connection**:
   ```javascript
   // In your app, test with:
   const { data } = await supabase.from('restaurants').select('*').limit(5)
   console.log(data)
   ```

3. **Test Real-time**:
   - Open two app instances
   - Create a post in one
   - See it appear in the other

## Troubleshooting

### Common Issues

1. **"relation does not exist" error**
   - Make sure all migrations ran in order
   - Check that PostGIS extension is enabled

2. **Authentication not working**
   - Verify phone provider is enabled
   - Check Supabase logs for SMS issues
   - For development, use Supabase dashboard to manually verify OTP

3. **Real-time not updating**
   - Ensure tables have replication enabled (done in migration 004)
   - Check RLS policies allow SELECT access
   - Verify WebSocket connection in network tab

4. **Storage upload fails**
   - Check bucket exists and is public
   - Verify storage policies are applied
   - Ensure file size is under limits (50MB default)

## Next Steps

1. **Development**:
   - The app is now connected to Supabase
   - All services are ready to use
   - Start implementing features using the services

2. **Production Preparation**:
   - Set up Twilio for SMS in production
   - Configure custom domain (optional)
   - Set up database backups
   - Monitor usage and performance

3. **Security**:
   - Review and tighten RLS policies as needed
   - Set up rate limiting for API calls
   - Configure CORS for web deployment
   - Regular security audits

## Useful Commands

```bash
# Check Supabase connection
npx supabase status

# Run migrations locally (if using Supabase CLI)
npx supabase db push

# Generate TypeScript types from schema
npx supabase gen types typescript --project-id cacrjcekanesymdzpjtt > types/supabase.ts
```

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Dashboard](https://app.supabase.com/project/cacrjcekanesymdzpjtt)
- [React Native + Supabase Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-react-native)

## Support

If you encounter any issues:
1. Check the Supabase dashboard logs
2. Review the error messages in the app console
3. Verify all migrations have been applied
4. Ensure environment variables are loaded correctly