# Troodie Backend Architecture & Supabase Integration Guide

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [Authentication & Authorization](#authentication--authorization)
5. [Real-time Features](#real-time-features)
6. [API Design](#api-design)
7. [Supabase Setup Guide](#supabase-setup-guide)
8. [Security & Performance](#security--performance)
9. [Deployment Strategy](#deployment-strategy)

## Overview

Troodie is a social restaurant discovery platform that connects food enthusiasts through personalized recommendations, curated boards, and communities. The backend architecture supports:

- **User personas and personalization**
- **Social networking features**
- **Content creation and curation**
- **Monetization through paid boards and communities**
- **Creator economy with campaigns**
- **Real-time activity feeds and notifications**

## Technology Stack

### Core Technologies
- **Backend-as-a-Service**: Supabase
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth with phone verification
- **Real-time**: Supabase Realtime
- **Storage**: Supabase Storage for images/videos
- **Edge Functions**: Supabase Edge Functions for complex business logic
- **Frontend**: React Native with Expo

### External Services
- **SMS Provider**: Twilio (for phone verification)
- **Payment Processing**: Stripe
- **Maps/Places**: Google Places API
- **Image Processing**: Cloudinary (optional)
- **Push Notifications**: Expo Push Notifications

## Database Schema

### Core Tables

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE,
    name VARCHAR(100),
    bio TEXT,
    avatar_url TEXT,
    persona VARCHAR(50),
    is_verified BOOLEAN DEFAULT FALSE,
    is_restaurant BOOLEAN DEFAULT FALSE,
    is_creator BOOLEAN DEFAULT FALSE,
    profile_completion INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User relationships
CREATE TABLE user_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- Restaurants table
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_place_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    location GEOGRAPHY(POINT),
    cuisine TEXT[],
    price_range VARCHAR(4),
    phone VARCHAR(20),
    website TEXT,
    hours JSONB,
    photos TEXT[],
    rating DECIMAL(2,1),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Boards table
CREATE TABLE boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    type VARCHAR(20) CHECK (type IN ('free', 'private', 'paid')),
    category VARCHAR(50),
    location VARCHAR(255),
    tags TEXT[],
    price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    billing_type VARCHAR(20),
    allow_comments BOOLEAN DEFAULT TRUE,
    allow_saves BOOLEAN DEFAULT TRUE,
    member_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Board collaborators
CREATE TABLE board_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(board_id, user_id)
);

-- Board restaurants
CREATE TABLE board_restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    added_by UUID REFERENCES users(id),
    order_position INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(board_id, restaurant_id)
);

-- Board subscriptions (for paid boards)
CREATE TABLE board_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(20),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(board_id, user_id)
);

-- Restaurant saves/posts
CREATE TABLE restaurant_saves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    personal_rating INTEGER CHECK (personal_rating >= 1 AND personal_rating <= 5),
    visit_date DATE,
    photos TEXT[],
    notes TEXT,
    tags TEXT[],
    would_recommend BOOLEAN,
    price_range VARCHAR(4),
    visit_type VARCHAR(20) CHECK (visit_type IN ('dine_in', 'takeout', 'delivery')),
    privacy VARCHAR(20) CHECK (privacy IN ('public', 'friends', 'private')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Save board associations
CREATE TABLE save_boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    save_id UUID REFERENCES restaurant_saves(id) ON DELETE CASCADE,
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(save_id, board_id)
);

-- Social interactions
CREATE TABLE save_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    save_id UUID REFERENCES restaurant_saves(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    interaction_type VARCHAR(20) CHECK (interaction_type IN ('like', 'save', 'share')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(save_id, user_id, interaction_type)
);

-- Comments
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    save_id UUID REFERENCES restaurant_saves(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communities
CREATE TABLE communities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    category VARCHAR(50),
    location VARCHAR(255),
    admin_id UUID REFERENCES users(id),
    type VARCHAR(20) CHECK (type IN ('public', 'private', 'paid')),
    price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    billing_cycle VARCHAR(20),
    member_count INTEGER DEFAULT 0,
    activity_level INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community members
CREATE TABLE community_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    status VARCHAR(20) DEFAULT 'active',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(community_id, user_id)
);

-- Community posts
CREATE TABLE community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    images TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator campaigns
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id),
    creator_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    requirements TEXT[],
    budget DECIMAL(10,2),
    deadline TIMESTAMPTZ,
    status VARCHAR(20) CHECK (status IN ('pending', 'active', 'review', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign deliverables
CREATE TABLE campaign_deliverables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    type VARCHAR(50),
    description TEXT,
    status VARCHAR(20),
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50),
    title VARCHAR(255),
    body TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_likes BOOLEAN DEFAULT TRUE,
    notification_comments BOOLEAN DEFAULT TRUE,
    notification_follows BOOLEAN DEFAULT TRUE,
    notification_community BOOLEAN DEFAULT TRUE,
    notification_campaigns BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT FALSE,
    push_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding data
CREATE TABLE user_onboarding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    quiz_answers JSONB,
    favorite_spots JSONB,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_restaurants_location ON restaurants USING GIST(location);
CREATE INDEX idx_restaurant_saves_user_id ON restaurant_saves(user_id);
CREATE INDEX idx_restaurant_saves_restaurant_id ON restaurant_saves(restaurant_id);
CREATE INDEX idx_boards_user_id ON boards(user_id);
CREATE INDEX idx_communities_location ON communities(location);
CREATE INDEX idx_notifications_user_id ON notifications(user_id, is_read);
CREATE INDEX idx_user_relationships_follower ON user_relationships(follower_id);
CREATE INDEX idx_user_relationships_following ON user_relationships(following_id);
```

### Views for Common Queries

```sql
-- User stats view
CREATE VIEW user_stats AS
SELECT 
    u.id,
    COUNT(DISTINCT f1.follower_id) as followers_count,
    COUNT(DISTINCT f2.following_id) as following_count,
    COUNT(DISTINCT rs.id) as saves_count,
    COUNT(DISTINCT b.id) as boards_count
FROM users u
LEFT JOIN user_relationships f1 ON u.id = f1.following_id
LEFT JOIN user_relationships f2 ON u.id = f2.follower_id
LEFT JOIN restaurant_saves rs ON u.id = rs.user_id
LEFT JOIN boards b ON u.id = b.user_id
GROUP BY u.id;

-- Restaurant popularity view
CREATE VIEW restaurant_popularity AS
SELECT 
    r.id,
    r.name,
    COUNT(DISTINCT rs.id) as total_saves,
    AVG(rs.personal_rating) as avg_rating,
    COUNT(DISTINCT rs.user_id) as unique_savers
FROM restaurants r
LEFT JOIN restaurant_saves rs ON r.id = rs.restaurant_id
GROUP BY r.id;
```

## Authentication & Authorization

### Supabase Auth Configuration

1. **Phone Authentication Setup**
```javascript
// Initialize Supabase client
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Phone sign up
const { data, error } = await supabase.auth.signUp({
  phone: '+1234567890',
  password: 'temporary-password', // Optional, can use OTP only
})

// Verify OTP
const { data, error } = await supabase.auth.verifyOtp({
  phone: '+1234567890',
  token: '123456',
  type: 'sms'
})
```

2. **Row Level Security (RLS) Policies**

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
-- ... (enable for all tables)

-- Users table policies
CREATE POLICY "Users can view public profiles" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Restaurant saves policies
CREATE POLICY "Public saves are viewable by all" ON restaurant_saves
    FOR SELECT USING (privacy = 'public');

CREATE POLICY "Friends can view friends-only saves" ON restaurant_saves
    FOR SELECT USING (
        privacy = 'friends' AND 
        EXISTS (
            SELECT 1 FROM user_relationships 
            WHERE follower_id = auth.uid() 
            AND following_id = user_id
        )
    );

CREATE POLICY "Users can view own saves" ON restaurant_saves
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own saves" ON restaurant_saves
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own saves" ON restaurant_saves
    FOR UPDATE USING (user_id = auth.uid());

-- Boards policies
CREATE POLICY "Public boards are viewable by all" ON boards
    FOR SELECT USING (type = 'free');

CREATE POLICY "Private boards viewable by members" ON boards
    FOR SELECT USING (
        type = 'private' AND (
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM board_collaborators
                WHERE board_id = boards.id
                AND user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Paid boards viewable by subscribers" ON boards
    FOR SELECT USING (
        type = 'paid' AND (
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM board_subscriptions
                WHERE board_id = boards.id
                AND user_id = auth.uid()
                AND status = 'active'
                AND expires_at > NOW()
            )
        )
    );

-- Communities policies
CREATE POLICY "Public communities viewable by all" ON communities
    FOR SELECT USING (type = 'public');

CREATE POLICY "Community members can view private communities" ON communities
    FOR SELECT USING (
        type IN ('private', 'paid') AND
        EXISTS (
            SELECT 1 FROM community_members
            WHERE community_id = communities.id
            AND user_id = auth.uid()
            AND status = 'active'
        )
    );
```

### User Roles and Permissions

```sql
-- Create custom roles enum
CREATE TYPE user_role AS ENUM ('user', 'creator', 'restaurant', 'admin');

-- Add role to users table
ALTER TABLE users ADD COLUMN role user_role DEFAULT 'user';

-- Function to check user permissions
CREATE OR REPLACE FUNCTION has_permission(user_id UUID, resource TEXT, action TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role user_role;
BEGIN
    SELECT role INTO user_role FROM users WHERE id = user_id;
    
    -- Define permission logic
    CASE
        WHEN resource = 'campaign' AND action = 'create' THEN
            RETURN user_role IN ('creator', 'restaurant');
        WHEN resource = 'board' AND action = 'monetize' THEN
            RETURN user_role IN ('creator', 'user');
        ELSE
            RETURN TRUE; -- Default allow for basic actions
    END CASE;
END;
$$ LANGUAGE plpgsql;
```

## Real-time Features

### Supabase Realtime Configuration

1. **Enable Realtime for Tables**
```sql
-- Enable realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE restaurant_saves;
ALTER PUBLICATION supabase_realtime ADD TABLE save_interactions;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE community_posts;
```

2. **Client-side Subscriptions**
```javascript
// Subscribe to new saves from friends
const savesSubscription = supabase
  .channel('friend-saves')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'restaurant_saves',
      filter: `user_id=in.(${friendIds.join(',')})`
    },
    (payload) => {
      console.log('New save from friend:', payload.new)
      // Update UI with new save
    }
  )
  .subscribe()

// Subscribe to notifications
const notificationsSubscription = supabase
  .channel('user-notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('New notification:', payload.new)
      // Show notification to user
    }
  )
  .subscribe()

// Subscribe to community posts
const communitySubscription = supabase
  .channel('community-posts')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'community_posts',
      filter: `community_id=eq.${communityId}`
    },
    (payload) => {
      console.log('Community update:', payload)
      // Update community feed
    }
  )
  .subscribe()
```

### Notification System

```sql
-- Function to create notifications
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type VARCHAR,
    p_title VARCHAR,
    p_body TEXT,
    p_data JSONB
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (p_user_id, p_type, p_title, p_body, p_data)
    RETURNING id INTO notification_id;
    
    -- Trigger push notification if enabled
    PERFORM send_push_notification(p_user_id, p_title, p_body);
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger for like notifications
CREATE OR REPLACE FUNCTION notify_on_like() RETURNS TRIGGER AS $$
BEGIN
    -- Don't notify for self-likes
    IF NEW.user_id != (SELECT user_id FROM restaurant_saves WHERE id = NEW.save_id) THEN
        PERFORM create_notification(
            (SELECT user_id FROM restaurant_saves WHERE id = NEW.save_id),
            'like',
            'New Like',
            (SELECT name FROM users WHERE id = NEW.user_id) || ' liked your save',
            jsonb_build_object('save_id', NEW.save_id, 'user_id', NEW.user_id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_like_notification
AFTER INSERT ON save_interactions
FOR EACH ROW
WHEN (NEW.interaction_type = 'like')
EXECUTE FUNCTION notify_on_like();
```

## API Design

### Edge Functions for Complex Operations

1. **Persona Assignment**
```typescript
// supabase/functions/assign-persona/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface QuizAnswer {
  questionId: number
  answer: string
}

const personaWeights = {
  trendsetter: { dining_frequency: 2, cuisine_adventure: 3, ... },
  culinary_adventurer: { cuisine_adventure: 5, price_sensitivity: 1, ... },
  // ... other personas
}

serve(async (req) => {
  const { answers, userId } = await req.json()
  
  // Calculate persona scores
  const scores = calculatePersonaScores(answers)
  const assignedPersona = getTopPersona(scores)
  
  // Update user profile
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  const { error } = await supabase
    .from('users')
    .update({ persona: assignedPersona })
    .eq('id', userId)
  
  return new Response(
    JSON.stringify({ persona: assignedPersona }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

2. **Restaurant Search and Import**
```typescript
// supabase/functions/search-restaurants/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { query, location, method } = await req.json()
  
  if (method === 'text') {
    // Search in database first
    const supabase = createClient(...)
    const { data: dbResults } = await supabase
      .from('restaurants')
      .select('*')
      .textSearch('name', query)
      .limit(10)
    
    // If not enough results, search Google Places
    if (dbResults.length < 5) {
      const googleResults = await searchGooglePlaces(query, location)
      // Import new restaurants to database
      for (const place of googleResults) {
        await importRestaurant(place)
      }
    }
  }
  
  return new Response(JSON.stringify({ results }))
})
```

3. **Feed Algorithm**
```typescript
// supabase/functions/generate-feed/index.ts
serve(async (req) => {
  const { userId, page = 1, limit = 20 } = await req.json()
  
  // Get user data
  const user = await getUser(userId)
  const friendIds = await getFriendIds(userId)
  
  // Build personalized feed
  const feedItems = await supabase
    .from('restaurant_saves')
    .select(`
      *,
      restaurant:restaurants(*),
      user:users(*),
      interactions:save_interactions(count)
    `)
    .or(`
      user_id.in.(${friendIds.join(',')}),
      and(privacy.eq.public,restaurant.cuisine.cs.{${user.persona}})
    `)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)
  
  // Apply persona-based ranking
  const rankedItems = rankByPersona(feedItems, user.persona)
  
  return new Response(JSON.stringify({ feed: rankedItems }))
})
```

### RESTful Endpoints via PostgREST

Supabase automatically generates RESTful APIs for your tables. Examples:

```bash
# Get user profile
GET /rest/v1/users?id=eq.{userId}

# Get restaurant saves with related data
GET /rest/v1/restaurant_saves?select=*,restaurant:restaurants(*),user:users(*)&user_id=eq.{userId}

# Create a new save
POST /rest/v1/restaurant_saves
{
  "user_id": "...",
  "restaurant_id": "...",
  "personal_rating": 5,
  "notes": "Amazing experience!"
}

# Search restaurants by location
GET /rest/v1/restaurants?select=*&location=near.{lat,lng,radius}

# Get trending restaurants
GET /rest/v1/restaurants?select=*,saves:restaurant_saves(count)&order=saves.count.desc&limit=10
```

## Supabase Setup Guide

### Step 1: Create Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Create a new project
3. Save your project URL and anon key

### Step 2: Database Setup

1. Run the schema SQL in Supabase SQL editor
2. Enable Row Level Security on all tables
3. Create RLS policies
4. Enable Realtime for required tables

### Step 3: Authentication Setup

1. Enable Phone Auth in Authentication settings
2. Configure SMS provider (Twilio):
   ```
   - Add Twilio Account SID
   - Add Twilio Auth Token
   - Add Twilio Message Service SID
   - Set SMS template
   ```

### Step 4: Storage Setup

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('restaurant-photos', 'restaurant-photos', true),
  ('board-covers', 'board-covers', true),
  ('community-images', 'community-images', true);

-- Storage policies
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### Step 5: Edge Functions Deployment

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Initialize functions
supabase functions new assign-persona
supabase functions new search-restaurants
supabase functions new generate-feed
supabase functions new process-payment

# Deploy functions
supabase functions deploy assign-persona
supabase functions deploy search-restaurants
# ... deploy all functions
```

### Step 6: Environment Variables

Set these in your Expo app:

```javascript
// .env
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
GOOGLE_PLACES_API_KEY=your-google-key
STRIPE_PUBLISHABLE_KEY=your-stripe-key
```

### Step 7: Client Integration

```javascript
// lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

## Security & Performance

### Security Best Practices

1. **API Key Management**
   - Never expose service role key in client
   - Use environment variables
   - Rotate keys regularly

2. **Data Validation**
   ```sql
   -- Add constraints
   ALTER TABLE restaurant_saves 
   ADD CONSTRAINT valid_rating CHECK (personal_rating >= 1 AND personal_rating <= 5);
   
   ALTER TABLE users 
   ADD CONSTRAINT valid_username CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$');
   ```

3. **Rate Limiting**
   ```sql
   -- Function to check rate limits
   CREATE OR REPLACE FUNCTION check_rate_limit(
       p_user_id UUID,
       p_action VARCHAR,
       p_limit INTEGER,
       p_window INTERVAL
   ) RETURNS BOOLEAN AS $$
   DECLARE
       action_count INTEGER;
   BEGIN
       SELECT COUNT(*) INTO action_count
       FROM user_actions
       WHERE user_id = p_user_id
       AND action = p_action
       AND created_at > NOW() - p_window;
       
       RETURN action_count < p_limit;
   END;
   $$ LANGUAGE plpgsql;
   ```

### Performance Optimization

1. **Database Indexes**
   ```sql
   -- Composite indexes for common queries
   CREATE INDEX idx_saves_user_created ON restaurant_saves(user_id, created_at DESC);
   CREATE INDEX idx_saves_restaurant_rating ON restaurant_saves(restaurant_id, personal_rating);
   CREATE INDEX idx_boards_type_created ON boards(type, created_at DESC);
   ```

2. **Materialized Views**
   ```sql
   -- Trending restaurants materialized view
   CREATE MATERIALIZED VIEW trending_restaurants AS
   SELECT 
       r.*,
       COUNT(DISTINCT rs.user_id) as saves_last_week,
       AVG(rs.personal_rating) as avg_rating_last_week
   FROM restaurants r
   JOIN restaurant_saves rs ON r.id = rs.restaurant_id
   WHERE rs.created_at > NOW() - INTERVAL '7 days'
   GROUP BY r.id
   ORDER BY saves_last_week DESC;
   
   -- Refresh periodically
   CREATE OR REPLACE FUNCTION refresh_trending()
   RETURNS void AS $$
   BEGIN
       REFRESH MATERIALIZED VIEW trending_restaurants;
   END;
   $$ LANGUAGE plpgsql;
   ```

3. **Caching Strategy**
   - Use Supabase CDN for images
   - Cache restaurant data locally
   - Implement pagination for feeds
   - Use connection pooling

## Deployment Strategy

### Development Workflow

1. **Local Development**
   ```bash
   # Use Supabase CLI for local development
   supabase start
   supabase db reset
   ```

2. **Staging Environment**
   - Create separate Supabase project for staging
   - Mirror production schema
   - Use test data

3. **Production Deployment**
   ```bash
   # Database migrations
   supabase db push
   
   # Deploy edge functions
   supabase functions deploy --project-ref your-project-ref
   
   # Update environment variables
   supabase secrets set STRIPE_SECRET_KEY=your-key
   ```

### Monitoring & Analytics

1. **Database Monitoring**
   - Enable Supabase dashboard metrics
   - Set up alerts for slow queries
   - Monitor storage usage

2. **Application Monitoring**
   ```javascript
   // Track user events
   const trackEvent = async (event: string, properties: any) => {
     await supabase.from('analytics_events').insert({
       user_id: userId,
       event,
       properties,
       created_at: new Date()
     })
   }
   ```

3. **Error Tracking**
   - Integrate Sentry for error monitoring
   - Log Edge Function errors
   - Monitor API response times

### Backup Strategy

1. **Automated Backups**
   - Enable Point-in-Time Recovery (PITR)
   - Daily automated backups
   - Test restore procedures

2. **Data Export**
   ```sql
   -- Regular exports of critical data
   COPY (SELECT * FROM users) TO 'users_backup.csv' CSV HEADER;
   COPY (SELECT * FROM restaurants) TO 'restaurants_backup.csv' CSV HEADER;
   ```

## Next Steps

1. **Phase 1: Core Features (Months 1-2)**
   - User authentication and profiles
   - Restaurant database and saves
   - Basic social features
   - Free boards

2. **Phase 2: Social & Discovery (Months 3-4)**
   - Friend network
   - Activity feeds
   - Explore with recommendations
   - Communities

3. **Phase 3: Monetization (Months 5-6)**
   - Paid boards
   - Premium communities
   - Creator dashboard
   - Payment processing

4. **Phase 4: Advanced Features (Months 7+)**
   - AI-powered recommendations
   - Advanced search
   - Analytics dashboard
   - Third-party integrations

## Conclusion

This backend architecture provides a scalable foundation for Troodie using Supabase's powerful features. The combination of PostgreSQL's robustness, real-time subscriptions, built-in authentication, and edge functions creates a modern, performant backend that can grow with your user base.

Key advantages of this architecture:
- **Rapid development** with Supabase's auto-generated APIs
- **Real-time features** out of the box
- **Scalability** with PostgreSQL and CDN
- **Security** with RLS and authentication
- **Cost-effective** with usage-based pricing

Remember to regularly review and optimize your database queries, monitor performance metrics, and gather user feedback to continuously improve the platform.