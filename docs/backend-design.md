# Troodie Backend Design & Database Schema

## Overview

This document serves as the living documentation for Troodie's backend architecture, database schema, and API design. It should be updated whenever the database schema changes or new features are added.

## Database Architecture

### Technology Stack
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth with email OTP
- **Real-time**: Supabase Realtime subscriptions
- **Storage**: Supabase Storage for images and media
- **Edge Functions**: Supabase Edge Functions for serverless logic

## Core Schema Design

### User Management

#### `users` Table
Primary user profile information extending Supabase Auth.

```sql
CREATE TABLE public.users (
  id uuid NOT NULL,                    -- Links to auth.users
  phone character varying UNIQUE,       -- Primary contact method
  username character varying UNIQUE,    -- @username for mentions
  name character varying,               -- Display name
  bio text,                           -- User bio
  avatar_url text,                     -- Profile image
  persona character varying,           -- User persona type
  is_verified boolean DEFAULT false,   -- Verified user status
  is_restaurant boolean DEFAULT false, -- Restaurant owner flag
  is_creator boolean DEFAULT false,    -- Content creator flag
  profile_completion integer DEFAULT 0, -- Profile completion percentage
  email text,                         -- Email address
  profile_image_url text,             -- Alternative profile image
  location text,                      -- User location
  saves_count integer DEFAULT 0,      -- Cached count
  reviews_count integer DEFAULT 0,    -- Cached count
  followers_count integer DEFAULT 0,  -- Cached count
  following_count integer DEFAULT 0,  -- Cached count
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
```

#### `user_onboarding` Table
Stores onboarding quiz responses and persona assignment.

```sql
CREATE TABLE public.user_onboarding (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  quiz_answers jsonb,                 -- Quiz response data
  persona character varying,           -- Assigned persona
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_onboarding_pkey PRIMARY KEY (id),
  CONSTRAINT user_onboarding_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
```

#### `user_preferences` Table
User notification and privacy preferences.

```sql
CREATE TABLE public.user_preferences (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  notification_likes boolean DEFAULT true,
  notification_comments boolean DEFAULT true,
  notification_follows boolean DEFAULT true,
  notification_community boolean DEFAULT true,
  notification_campaigns boolean DEFAULT true,
  email_notifications boolean DEFAULT false,
  push_notifications boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
```

### Restaurant Management

#### `restaurants` Table
Core restaurant data with Google Places integration.

```sql
CREATE TABLE public.restaurants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  google_place_id character varying UNIQUE,  -- Google Places ID
  name character varying NOT NULL,
  address text,
  city character varying,
  state character varying,
  zip_code character varying,
  location USER-DEFINED,              -- PostGIS geometry
  cuisine_types ARRAY,                -- Array of cuisine types
  price_range character varying,      -- $, $$, $$$, $$$$
  phone character varying,
  website text,
  hours jsonb,                       -- Operating hours
  photos ARRAY,                      -- Photo URLs
  cover_photo_url text,
  google_rating numeric,              -- Google rating
  google_reviews_count integer,       -- Google review count
  troodie_rating numeric,             -- Troodie community rating
  troodie_reviews_count integer DEFAULT 0,
  features ARRAY,                     -- Restaurant features
  dietary_options ARRAY,              -- Dietary restrictions
  is_verified boolean DEFAULT false,  -- Verified restaurant
  is_claimed boolean DEFAULT false,   -- Claimed by owner
  owner_id uuid,                      -- Restaurant owner
  data_source character varying CHECK (data_source::text = ANY (ARRAY['seed'::character varying, 'google'::character varying, 'user'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_google_sync timestamp with time zone,
  CONSTRAINT restaurants_pkey PRIMARY KEY (id),
  CONSTRAINT restaurants_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
```

### Social Features

#### Power Users & Critics Definition
Power users and critics are identified by the following criteria:

- **Power Users**: 
  - Have 10,000+ followers
  - Posted 50+ restaurant reviews with high engagement
  - Maintained consistent activity (weekly posts for 3+ months)
  - High average rating accuracy (aligned with community consensus)
  - Verified account status

- **Food Critics**:
  - Professional food critics with media affiliation
  - Verified credentials from recognized publications
  - Specialized food bloggers with 25,000+ followers
  - Restaurant industry professionals (chefs, sommeliers)
  - Manually verified by Troodie team

#### `restaurant_saves` Table
User saves/bookmarks of restaurants.

```sql
CREATE TABLE public.restaurant_saves (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  restaurant_id uuid,
  personal_rating integer CHECK (personal_rating >= 1 AND personal_rating <= 5),
  visit_date date,
  photos ARRAY,                      -- User photos
  notes text,                        -- Personal notes
  tags ARRAY,                        -- User tags
  would_recommend boolean,
  price_range character varying,
  visit_type character varying CHECK (visit_type::text = ANY (ARRAY['dine_in'::character varying, 'takeout'::character varying, 'delivery'::character varying]::text[])),
  privacy character varying CHECK (privacy::text = ANY (ARRAY['public'::character varying, 'friends'::character varying, 'private'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT restaurant_saves_pkey PRIMARY KEY (id),
  CONSTRAINT restaurant_saves_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT restaurant_saves_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);
```

#### `posts` Table
Social media-style posts about restaurant visits.

```sql
CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  restaurant_id character varying NOT NULL,
  caption text,
  photos ARRAY,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  visit_date date,
  price_range character varying,
  visit_type character varying CHECK (visit_type::text = ANY (ARRAY['dine_in'::character varying, 'takeout'::character varying, 'delivery'::character varying]::text[])),
  tags ARRAY,
  privacy character varying DEFAULT 'public'::character varying CHECK (privacy::text = ANY (ARRAY['public'::character varying, 'friends'::character varying, 'private'::character varying]::text[])),
  location_lat numeric,
  location_lng numeric,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  saves_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  is_trending boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

#### `user_relationships` Table
Follow/unfollow relationships between users.

```sql
CREATE TABLE public.user_relationships (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  follower_id uuid,
  following_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_relationships_pkey PRIMARY KEY (id),
  CONSTRAINT user_relationships_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.users(id),
  CONSTRAINT user_relationships_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.users(id)
);
```

### Board System

#### `boards` Table
Collections of restaurants created by users.

```sql
CREATE TABLE public.boards (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,                      -- Board creator
  title character varying NOT NULL,
  description text,
  cover_image_url text,
  type character varying CHECK (type::text = ANY (ARRAY['free'::character varying, 'private'::character varying, 'paid'::character varying]::text[])),
  category character varying,
  location character varying,
  tags ARRAY,
  price numeric,                      -- For paid boards
  currency character varying DEFAULT 'USD'::character varying,
  billing_type character varying,
  allow_comments boolean DEFAULT true,
  allow_saves boolean DEFAULT true,
  member_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_private boolean DEFAULT false,
  restaurant_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT boards_pkey PRIMARY KEY (id),
  CONSTRAINT boards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
```

#### `board_members` Table
Board membership and roles.

```sql
CREATE TABLE public.board_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role character varying DEFAULT 'member'::character varying CHECK (role::text = ANY (ARRAY['owner'::character varying, 'admin'::character varying, 'member'::character varying]::text[])),
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT board_members_pkey PRIMARY KEY (id),
  CONSTRAINT board_members_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id),
  CONSTRAINT board_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

#### `board_restaurants` Table
Restaurants added to boards.

```sql
CREATE TABLE public.board_restaurants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  board_id uuid,
  restaurant_id uuid,
  added_by uuid,
  order_position integer,
  notes text,
  position integer DEFAULT 0,
  added_at timestamp with time zone DEFAULT now(),
  rating integer CHECK (rating >= 1 AND rating <= 5),
  visit_date date,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT board_restaurants_pkey PRIMARY KEY (id),
  CONSTRAINT board_restaurants_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id),
  CONSTRAINT board_restaurants_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id),
  CONSTRAINT board_restaurants_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(id)
);
```

### Community Features

#### `communities` Table
User-created communities around food interests.

```sql
CREATE TABLE public.communities (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  description text,
  cover_image_url text,
  category character varying,
  location character varying,
  admin_id uuid,
  type character varying CHECK (type::text = ANY (ARRAY['public'::character varying, 'private'::character varying, 'paid'::character varying]::text[])),
  price numeric,
  currency character varying DEFAULT 'USD'::character varying,
  billing_cycle character varying,
  member_count integer DEFAULT 0,
  activity_level integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT communities_pkey PRIMARY KEY (id),
  CONSTRAINT communities_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id)
);
```

#### `community_members` Table
Community membership management.

```sql
CREATE TABLE public.community_members (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  community_id uuid,
  user_id uuid,
  role character varying DEFAULT 'member'::character varying,
  status character varying DEFAULT 'active'::character varying,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT community_members_pkey PRIMARY KEY (id),
  CONSTRAINT community_members_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id),
  CONSTRAINT community_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
```

#### `community_posts` Table
Posts within communities.

```sql
CREATE TABLE public.community_posts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  community_id uuid,
  user_id uuid,
  content text NOT NULL,
  images ARRAY,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT community_posts_pkey PRIMARY KEY (id),
  CONSTRAINT community_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT community_posts_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id)
);
```

### Engagement & Interactions

#### `post_likes` Table
Likes on posts.

```sql
CREATE TABLE public.post_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_likes_pkey PRIMARY KEY (id),
  CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT post_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

#### `post_comments` Table
Comments on posts with nested replies.

```sql
CREATE TABLE public.post_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid,
  user_id uuid,
  parent_comment_id uuid,             -- For nested replies
  content text NOT NULL,
  likes_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_comments_pkey PRIMARY KEY (id),
  CONSTRAINT post_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT post_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.post_comments(id),
  CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id)
);
```

#### `post_saves` Table
Saving posts to boards.

```sql
CREATE TABLE public.post_saves (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid,
  user_id uuid,
  board_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_saves_pkey PRIMARY KEY (id),
  CONSTRAINT post_saves_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT post_saves_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id),
  CONSTRAINT post_saves_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id)
);
```

### Notifications System

#### `notifications` Table
In-app notifications.

```sql
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  type character varying CHECK (type::text = ANY (ARRAY['like'::character varying, 'comment'::character varying, 'follow'::character varying, 'achievement'::character varying, 'restaurant_recommendation'::character varying, 'board_invite'::character varying, 'post_mention'::character varying, 'milestone'::character varying, 'system'::character varying]::text[])),
  title character varying,
  body text,
  data jsonb,                        -- Additional notification data
  is_read boolean DEFAULT false,
  message text,
  related_id character varying,       -- Related entity ID
  related_type character varying,     -- Related entity type
  is_actioned boolean DEFAULT false,
  expires_at timestamp with time zone,
  priority integer DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
```

#### `notification_preferences` Table
User notification settings.

```sql
CREATE TABLE public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  category character varying NOT NULL,
  push_enabled boolean DEFAULT true,
  in_app_enabled boolean DEFAULT true,
  email_enabled boolean DEFAULT false,
  frequency character varying DEFAULT 'immediate'::character varying CHECK (frequency::text = ANY (ARRAY['immediate'::character varying, 'daily'::character varying, 'weekly'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notification_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

#### `push_tokens` Table
Push notification tokens for mobile devices.

```sql
CREATE TABLE public.push_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  token character varying NOT NULL,
  platform character varying NOT NULL CHECK (platform::text = ANY (ARRAY['ios'::character varying, 'android'::character varying, 'web'::character varying]::text[])),
  device_id character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT push_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

### Achievement & Gamification

#### `user_achievements` Table
User achievement unlocks.

```sql
CREATE TABLE public.user_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id character varying NOT NULL,
  unlocked_at timestamp with time zone DEFAULT now(),
  points integer DEFAULT 0,
  CONSTRAINT user_achievements_pkey PRIMARY KEY (id),
  CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

#### `user_events` Table
User activity tracking for achievements.

```sql
CREATE TABLE public.user_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type character varying NOT NULL,
  event_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_events_pkey PRIMARY KEY (id),
  CONSTRAINT user_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

### Referral System

#### `user_referrals` Table
User referral codes.

```sql
CREATE TABLE public.user_referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  referral_code character varying NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_referrals_pkey PRIMARY KEY (id),
  CONSTRAINT user_referrals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

#### `user_referral_conversions` Table
Referral conversion tracking.

```sql
CREATE TABLE public.user_referral_conversions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  converted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_referral_conversions_pkey PRIMARY KEY (id),
  CONSTRAINT user_referral_conversions_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES auth.users(id),
  CONSTRAINT user_referral_conversions_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES auth.users(id)
);
```

#### `user_invite_shares` Table
Track invite sharing activity.

```sql
CREATE TABLE public.user_invite_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shared_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_invite_shares_pkey PRIMARY KEY (id),
  CONSTRAINT user_invite_shares_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

### Restaurant Social Activity

#### `restaurant_visits` Table
Track user visits to restaurants for social activity feed.

```sql
CREATE TABLE public.restaurant_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  restaurant_id uuid NOT NULL,
  visit_type character varying CHECK (visit_type::text = ANY (ARRAY['check_in'::character varying, 'review'::character varying, 'save'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT restaurant_visits_pkey PRIMARY KEY (id),
  CONSTRAINT restaurant_visits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT restaurant_visits_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);
```

#### `restaurant_activity_feed` View
Aggregated view for restaurant social activity.

```sql
CREATE VIEW restaurant_activity_feed AS
SELECT 
  rv.id,
  rv.restaurant_id,
  rv.user_id,
  u.name as user_name,
  u.avatar_url,
  rv.visit_type,
  rv.created_at,
  CASE 
    WHEN ur.follower_id IS NOT NULL THEN true 
    ELSE false 
  END as is_friend,
  u.is_verified,
  u.followers_count,
  CASE 
    WHEN u.followers_count > 10000 AND u.is_verified THEN true
    ELSE false
  END as is_power_user
FROM restaurant_visits rv
JOIN users u ON rv.user_id = u.id
LEFT JOIN user_relationships ur ON ur.following_id = rv.user_id AND ur.follower_id = auth.uid()
ORDER BY rv.created_at DESC;
```

### Campaign System

#### `campaigns` Table
Restaurant marketing campaigns.

```sql
CREATE TABLE public.campaigns (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid,
  creator_id uuid,
  title character varying NOT NULL,
  description text,
  requirements ARRAY,
  budget numeric,
  deadline timestamp with time zone,
  status character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'active'::character varying, 'review'::character varying, 'completed'::character varying, 'cancelled'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT campaigns_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id),
  CONSTRAINT campaigns_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id)
);
```

#### `campaign_deliverables` Table
Campaign deliverables tracking.

```sql
CREATE TABLE public.campaign_deliverables (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  campaign_id uuid,
  type character varying,
  description text,
  status character varying,
  submitted_at timestamp with time zone,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT campaign_deliverables_pkey PRIMARY KEY (id),
  CONSTRAINT campaign_deliverables_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id)
);
```

### Legacy Tables (Deprecated)

#### `board_collaborators` Table
**DEPRECATED** - Replaced by `board_members`

#### `board_subscriptions` Table
**DEPRECATED** - Subscription management moved to external system

#### `comments` Table
**DEPRECATED** - Replaced by `post_comments`

#### `favorite_spots` Table
**DEPRECATED** - Replaced by `restaurant_saves`

#### `save_boards` Table
**DEPRECATED** - Replaced by `post_saves`

#### `save_interactions` Table
**DEPRECATED** - Replaced by `post_likes` and `post_saves`

## Row Level Security (RLS) Policies

### Core Principles
- Users can only access their own data
- Public data (restaurants, public posts) is readable by all
- Private data requires explicit permissions
- Board/community access controlled by membership

### Key Policies

#### Users Table
```sql
-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);
```

#### Posts Table
```sql
-- Public posts visible to all
CREATE POLICY "Public posts are viewable by all" ON public.posts
  FOR SELECT USING (privacy = 'public');

-- Friends posts visible to followers
CREATE POLICY "Friends posts visible to followers" ON public.posts
  FOR SELECT USING (
    privacy = 'friends' AND 
    EXISTS (
      SELECT 1 FROM public.user_relationships 
      WHERE follower_id = auth.uid() AND following_id = user_id
    )
  );

-- Private posts only visible to author
CREATE POLICY "Private posts only visible to author" ON public.posts
  FOR SELECT USING (privacy = 'private' AND user_id = auth.uid());
```

#### Boards Table
```sql
-- Public boards visible to all
CREATE POLICY "Public boards are viewable by all" ON public.boards
  FOR SELECT USING (is_private = false);

-- Private boards only visible to members
CREATE POLICY "Private boards only visible to members" ON public.boards
  FOR SELECT USING (
    is_private = true AND 
    EXISTS (
      SELECT 1 FROM public.board_members 
      WHERE board_id = id AND user_id = auth.uid()
    )
  );
```

## Indexes for Performance

### Critical Indexes
```sql
-- Restaurant search optimization
CREATE INDEX idx_restaurants_location ON restaurants USING GIST (location);
CREATE INDEX idx_restaurants_cuisine_types ON restaurants USING GIN (cuisine_types);
CREATE INDEX idx_restaurants_google_place_id ON restaurants (google_place_id);

-- Post feed optimization
CREATE INDEX idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX idx_posts_user_id ON posts (user_id);
CREATE INDEX idx_posts_restaurant_id ON posts (restaurant_id);

-- User relationships
CREATE INDEX idx_user_relationships_follower ON user_relationships (follower_id);
CREATE INDEX idx_user_relationships_following ON user_relationships (following_id);

-- Board membership
CREATE INDEX idx_board_members_user_id ON board_members (user_id);
CREATE INDEX idx_board_members_board_id ON board_members (board_id);

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id, is_read) WHERE is_read = false;
```

## API Design Patterns

### RESTful Endpoints
```
GET    /api/restaurants          # List restaurants
GET    /api/restaurants/:id      # Get restaurant details
POST   /api/restaurants/:id/save # Save restaurant
DELETE /api/restaurants/:id/save # Unsave restaurant

GET    /api/posts               # List posts
POST   /api/posts              # Create post
GET    /api/posts/:id          # Get post details
PUT    /api/posts/:id          # Update post
DELETE /api/posts/:id          # Delete post

GET    /api/boards             # List boards
POST   /api/boards            # Create board
GET    /api/boards/:id        # Get board details
PUT    /api/boards/:id        # Update board
DELETE /api/boards/:id        # Delete board

GET    /api/users/:id          # Get user profile
PUT    /api/users/:id          # Update user profile
POST   /api/users/:id/follow   # Follow user
DELETE /api/users/:id/follow   # Unfollow user
```

### Real-time Subscriptions
```typescript
// Post feed updates
supabase
  .channel('posts')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'posts' },
    (payload) => handleNewPost(payload)
  )
  .subscribe();

// Notification updates
supabase
  .channel('notifications')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
    (payload) => handleNewNotification(payload)
  )
  .subscribe();
```

## Data Flow Patterns

### Restaurant Discovery
1. **Search**: User searches restaurants via Google Places API
2. **Cache**: Results cached in `restaurants` table
3. **Enrich**: Additional data added from Troodie community
4. **Rank**: Results ranked by relevance and community activity

### Post Creation Flow
1. **Validation**: Check user permissions and content
2. **Creation**: Insert into `posts` table
3. **Media**: Upload images to Supabase Storage
4. **Notifications**: Trigger notifications to followers
5. **Feed**: Update real-time feeds

### Board Management
1. **Creation**: User creates board with settings
2. **Membership**: Add/remove members with roles
3. **Content**: Add restaurants to board
4. **Sharing**: Share board with community
5. **Monetization**: Handle paid board subscriptions

## Security Considerations

### Authentication
- Email OTP via Supabase Auth
- Session management with refresh tokens
- Device fingerprinting for security

### Authorization
- Row Level Security (RLS) policies
- Role-based access control
- Content privacy controls

### Data Protection
- PII encryption for sensitive data
- GDPR compliance for user data
- Data retention policies

## Performance Optimization

### Caching Strategy
- Redis for session data
- CDN for static assets
- Database query result caching

### Database Optimization
- Connection pooling
- Query optimization
- Index maintenance

### Mobile Optimization
- Image compression and resizing
- Lazy loading for feeds
- Offline data synchronization

## Monitoring & Analytics

### Key Metrics
- User engagement (posts, saves, follows)
- Restaurant discovery and saves
- Board creation and sharing
- Notification delivery rates

### Error Tracking
- Database query performance
- API response times
- Real-time subscription health
- Push notification delivery

## Migration Strategy

### Schema Changes
1. **Development**: Test changes in development environment
2. **Staging**: Validate in staging with production data
3. **Production**: Deploy with zero-downtime migrations
4. **Rollback**: Maintain rollback procedures

### Data Migration
- Preserve existing data during schema changes
- Validate data integrity after migrations
- Monitor performance impact

## Future Considerations

### Scalability
- Horizontal scaling with read replicas
- Microservices architecture for specific features
- Edge computing for global performance

### Feature Additions
- Advanced search and filtering
- AI-powered recommendations
- Social commerce features
- Creator marketplace expansion

---

**Last Updated**: 2025-07-27
**Version**: 1.1
**Maintainer**: Engineering Team