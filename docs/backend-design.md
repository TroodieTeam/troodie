# Troodie Backend Design & Database Schema

## Overview

This document serves as the living documentation for Troodie's backend architecture, database schema, and API design. It should be updated whenever the database schema changes or new features are added.

## Database Architecture

### Technology Stack
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth with email passwordless (OTP)
- **Real-time**: Supabase Realtime subscriptions
- **Storage**: Supabase Storage for images and media
- **Edge Functions**: Supabase Edge Functions for serverless logic

## Authentication Configuration

### Email Passwordless (OTP) Authentication

Troodie uses Supabase's email passwordless authentication with One-Time Passwords (OTP).

**Key Configuration**:
- **Authentication Method**: Email OTP (6-digit codes)
- **OTP Validity**: 1 hour (3600 seconds)
- **Rate Limiting**: 1 OTP request per 60 seconds per email
- **User Creation**: Automatic on first signup
- **Email Confirmation**: Disabled (users are auto-confirmed)

**Required Supabase Dashboard Settings**:
1. **Authentication > Providers > Email**:
   - Enable Email Provider: ON
   - Confirm email: OFF
   - Enable email signup: ON

2. **Project Settings > Auth**:
   - Enable sign ups: ON
   - Auto-confirm users: ON

**Auth Flow**:
1. **Sign Up**: User enters email → OTP sent → User enters OTP → Account created & logged in
2. **Sign In**: User enters email → OTP sent → User enters OTP → Logged in
3. **Resend OTP**: Rate limited to once per 60 seconds

**Implementation Details**:
- `signInWithOtp` handles both signup and login
- For signup: `shouldCreateUser: true` allows new user creation
- For login: `shouldCreateUser: false` prevents accidental account creation
- User profiles are created after OTP verification using `ensure_user_profile` function
- **No auth triggers** - Profile creation happens in-app to avoid "Database error saving new user"

### User Profile Creation

**Automatic Profile Setup**:
When a new user signs up, the following happens automatically after OTP verification:

1. **User Profile Creation**:
   - Function: `ensure_user_profile(user_id, email)`
   - Creates entry in `public.users` table
   - Sets initial fields (id, email, created_at, updated_at)

2. **Default Board Creation**:
   - Every user gets a "Quick Saves" board automatically
   - Board details:
     - Title: "Quick Saves"
     - Description: "Your personal collection of saved restaurants"
     - Type: "free"
     - Privacy: public (is_private: false)
   - User is added as "owner" in board_members table
   - User's `default_board_id` is set to this board
   - `has_created_board` flag is set to true

**Database Functions**:
- `ensure_user_profile(p_user_id, p_email)` - Creates user profile and default board
- `create_default_boards_for_existing_users()` - Retroactively creates boards for existing users
- `get_or_create_default_board(p_user_id)` - Gets or creates user's default board

### Quick Saves Board

**Overview**:
Users have a "Quick Saves" board for instant restaurant bookmarking. This is managed through the application logic using the boardService.

**Schema Updates**:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_board_id UUID REFERENCES boards(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_avatar_url TEXT;
```

The Quick Saves board is created automatically when needed through `boardService.getUserQuickSavesBoard()` and `boardService.saveRestaurantToQuickSaves()`.

## Storage Configuration

### Storage Buckets

#### `avatars` Bucket
Stores user profile images/avatars.

**Configuration**:
- **Public**: Yes (publicly accessible for viewing)
- **File Size Limit**: 5MB per file
- **Allowed MIME Types**: 
  - `image/jpeg`
  - `image/jpg`
  - `image/png`
  - `image/gif`
  - `image/webp`
- **Path Structure**: `{user_id}/{timestamp}-{random}.jpg`
- **Upload Service**: `ImageUploadServiceV2` (see `services/imageUploadServiceV2.ts`)
- **Upload Methods** (in order of reliability):
  1. Base64 encoding via Expo FileSystem with base64-arraybuffer
  2. Direct blob upload with explicit content type
  3. FormData multipart upload as fallback
- **Image Processing**:
  - Automatic resize to max width 800px
  - Compression quality: 0.7
  - Format: JPEG
- **RLS Policies**:
  - Public read access for all
  - Users can upload/update/delete files in their own folder (`{user_id}/*`)

#### `post-photos` Bucket
Stores all user-uploaded photos for posts.

**Configuration**:
- **Public**: Yes (publicly accessible for viewing)
- **File Size Limit**: 10MB per file
- **Allowed MIME Types**: 
  - `image/jpeg`
  - `image/jpg`
  - `image/png`
  - `image/gif`
  - `image/webp`
- **Upload Service**: `ImageUploadServiceV2` (see `services/imageUploadServiceV2.ts`)
- **Upload Methods** (same as avatars bucket):
  1. Base64 encoding via Expo FileSystem with base64-arraybuffer
  2. Direct blob upload with explicit content type
  3. FormData multipart upload as fallback
- **Image Processing**:
  - Automatic resize to max width 800px
  - Compression quality: 0.7
  - Format: JPEG

**Folder Structure**:
```
post-photos/
└── posts/
    └── {post_id}/
        └── {timestamp}-{random_id}.jpg
```

**RLS Policies**:
- Authenticated users can upload photos to their own posts
- Authenticated users can update/delete their own photos
- **Public read access for all photos** (unrestricted viewing)
- Bucket marked as public for direct URL access

**Storage Policy Implementation**:
```sql
-- Public read access for all post photos (simplified policy)
CREATE POLICY "Public can view all post photos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'post-photos');

-- Users can upload photos to any post folder (posts/{post_id}/)
CREATE POLICY "Users can upload their own post photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'post-photos' AND
  (storage.foldername(name))[1] = 'posts'
);

-- Ensure bucket is marked as public
UPDATE storage.buckets SET public = true WHERE id = 'post-photos';
```

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
  avatar_url text,                     -- Profile image (primary field for user avatars)
  persona character varying,           -- User persona type
  is_verified boolean DEFAULT false,   -- Verified user status
  is_restaurant boolean DEFAULT false, -- Restaurant owner flag
  is_creator boolean DEFAULT false,    -- Content creator flag
  profile_completion integer DEFAULT 0, -- Profile completion percentage
  email text,                         -- Email address
  profile_image_url text,             -- DEPRECATED: Use avatar_url instead
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
  submitted_by uuid,                  -- User who submitted (for user-generated)
  is_approved boolean DEFAULT false,  -- Admin approval status
  approved_at timestamp with time zone,
  approved_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_google_sync timestamp with time zone,
  CONSTRAINT restaurants_pkey PRIMARY KEY (id),
  CONSTRAINT restaurants_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id),
  CONSTRAINT restaurants_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id),
  CONSTRAINT restaurants_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id)
);
```

#### User-Submitted Restaurants

**Overview**:
Users can add new restaurants that aren't in the database, which are saved to their personal collection and optionally submitted for community-wide visibility after moderation.

**Schema Updates**:
```sql
-- Add user submission tracking
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES users(id);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
```

**Function Implementation**:
```sql
CREATE OR REPLACE FUNCTION create_user_restaurant(
  p_user_id UUID,
  p_name VARCHAR,
  p_address TEXT,
  p_city VARCHAR,
  p_state VARCHAR,
  p_cuisine_types TEXT[],
  p_description TEXT DEFAULT NULL,
  p_website TEXT DEFAULT NULL,
  p_price_range VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_restaurant_id UUID;
  v_default_board_id UUID;
BEGIN
  -- Insert restaurant
  INSERT INTO restaurants (
    name, address, city, state, cuisine_types, 
    data_source, submitted_by, website, price_range
  ) VALUES (
    p_name, p_address, p_city, p_state, p_cuisine_types,
    'user', p_user_id, p_website, p_price_range
  ) RETURNING id INTO v_restaurant_id;
  
  -- Get user's default board
  SELECT get_or_create_default_board(p_user_id) INTO v_default_board_id;
  
  -- Auto-save to user's collection
  INSERT INTO restaurant_saves (
    user_id, restaurant_id, board_id
  ) VALUES (
    p_user_id, v_restaurant_id, v_default_board_id
  );
  
  RETURN v_restaurant_id;
END;
$$ LANGUAGE plpgsql;
```

**Moderation Workflow**:
1. User submits restaurant via "Add" tab
2. Restaurant created with `data_source = 'user'` and `is_approved = false`
3. Auto-saved to user's personal collection (visible to them immediately)
4. Admin reviews submission in moderation queue
5. If approved, `is_approved = true` and restaurant becomes publicly visible
6. If rejected, restaurant remains in user's collection only

#### `external_content_sources` Table
Supported external content platforms for posts.

```sql
CREATE TABLE public.external_content_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  domain character varying,
  icon_url text,
  is_supported boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT external_content_sources_pkey PRIMARY KEY (id)
);
```

**Default Sources**:
- TikTok (tiktok.com)
- Instagram (instagram.com)
- YouTube (youtube.com)
- Twitter (twitter.com)
- Articles
- Other

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
Social media-style posts about restaurant visits with support for both original and external content.

```sql
CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  restaurant_id character varying NOT NULL,
  caption text,
  photos ARRAY,                       -- Array of photo URLs
  rating integer CHECK (rating >= 1 AND rating <= 5),
  visit_date date,
  price_range character varying,
  visit_type character varying CHECK (visit_type::text = ANY (ARRAY['dine_in'::character varying, 'takeout'::character varying, 'delivery'::character varying]::text[])),
  tags ARRAY,                         -- Array of tags
  privacy character varying DEFAULT 'public'::character varying CHECK (privacy::text = ANY (ARRAY['public'::character varying, 'friends'::character varying, 'private'::character varying]::text[])),
  location_lat numeric,
  location_lng numeric,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  saves_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  is_trending boolean DEFAULT false,
  -- External content support
  content_type character varying DEFAULT 'original' CHECK (content_type::text = ANY (ARRAY['original'::character varying, 'external'::character varying]::text[])),
  external_source character varying,   -- Source platform (tiktok, instagram, etc.)
  external_url text,                  -- Original URL
  external_title text,                -- Title from external source
  external_description text,          -- Description from external source
  external_thumbnail text,            -- Thumbnail image URL
  external_author text,               -- Original author/creator
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

**Content Types**:
- `original`: User-created content with photos, ratings, and personal experiences
- `external`: Curated content from external sources (TikTok, Instagram, articles, etc.)

**Note**: The `community_id` field for community posts is planned for future implementation.

#### `external_content_sources` Table
Reference table for supported external content platforms.

```sql
CREATE TABLE public.external_content_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  domain character varying,           -- Platform domain (e.g., tiktok.com)
  icon_url text,                     -- Platform icon URL
  is_supported boolean DEFAULT true, -- Whether platform is currently supported
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT external_content_sources_pkey PRIMARY KEY (id),
  CONSTRAINT external_content_sources_name_unique UNIQUE (name)
);
```

**Supported Platforms**:
- TikTok (`tiktok.com`)
- Instagram (`instagram.com`)
- YouTube (`youtube.com`)
- Twitter (`twitter.com`)
- Articles (blogs, news sites)
- Other (generic external links)

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

#### User Search Functionality

**Full-Text Search Implementation**:

```sql
-- Add search indexes
CREATE INDEX IF NOT EXISTS idx_users_search ON users USING gin(
  to_tsvector('english', COALESCE(username, '') || ' ' || COALESCE(name, '') || ' ' || COALESCE(bio, ''))
);

-- Search function with follow status
CREATE OR REPLACE FUNCTION search_users(
  search_query TEXT, 
  limit_count INT DEFAULT 20, 
  offset_count INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  username VARCHAR,
  name VARCHAR,
  bio TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN,
  followers_count INT,
  is_following BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.name,
    u.bio,
    u.avatar_url,
    u.is_verified,
    u.followers_count,
    EXISTS(
      SELECT 1 FROM user_relationships ur 
      WHERE ur.follower_id = auth.uid() AND ur.following_id = u.id
    ) as is_following
  FROM users u
  WHERE 
    to_tsvector('english', COALESCE(u.username, '') || ' ' || COALESCE(u.name, '') || ' ' || COALESCE(u.bio, ''))
    @@ plainto_tsquery('english', search_query)
  ORDER BY u.followers_count DESC, u.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;
```

**Features**:
- Full-text search across username, name, and bio
- Returns follow status for current user
- Prioritizes verified users and those with more followers
- Supports pagination for large result sets

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

**Note**: Communities support hierarchical role-based access control (RBAC) where owners have full control, admins can manage content and members, moderators can manage content, and members can view and post.

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
Community membership management with role-based access control.

```sql
CREATE TABLE public.community_members (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  community_id uuid,
  user_id uuid,
  role character varying DEFAULT 'member'::character varying CHECK (role::text = ANY (ARRAY['owner'::character varying, 'admin'::character varying, 'moderator'::character varying, 'member'::character varying]::text[])),
  status character varying DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'active'::character varying, 'declined'::character varying]::text[])),
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT community_members_pkey PRIMARY KEY (id),
  CONSTRAINT community_members_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE,
  CONSTRAINT community_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT community_members_unique UNIQUE (community_id, user_id)
);
```

**Roles**:
- `owner`: Creator of the community, has all permissions
- `admin`: Can manage posts, members, and community settings
- `moderator`: Can manage posts and basic moderation
- `member`: Regular member with read/post permissions

**Admin Permissions**:
- Delete the entire community
- Edit community details (name, description, settings)
- Remove any member (except owner)
- Delete any post within the community
- Promote/demote members (future feature)

#### `community_posts` Table
Posts within communities.

```sql
CREATE TABLE public.community_posts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  community_id uuid,
  user_id uuid,
  content text NOT NULL,
  images ARRAY,
  deleted_at timestamp with time zone,
  deleted_by uuid REFERENCES users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT community_posts_pkey PRIMARY KEY (id),
  CONSTRAINT community_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT community_posts_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id)
);
```

#### `community_admin_logs` Table
Audit trail for administrative actions in communities.

```sql
CREATE TABLE IF NOT EXISTS community_admin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES communities(id),
  admin_id UUID REFERENCES users(id),
  action_type VARCHAR NOT NULL CHECK (action_type IN ('remove_member', 'delete_post', 'delete_message', 'update_role')),
  target_id UUID NOT NULL,
  target_type VARCHAR NOT NULL CHECK (target_type IN ('user', 'post', 'message')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_community_admin_logs_community ON community_admin_logs(community_id);
CREATE INDEX idx_community_admin_logs_admin ON community_admin_logs(admin_id);
```

**Admin Control Features**:
- Soft delete for posts (maintains audit trail)
- Remove members from community
- Delete inappropriate content
- Update member roles
- All actions logged for accountability

**Permission Function**:
```sql
CREATE OR REPLACE FUNCTION check_community_permission(
  p_user_id UUID,
  p_community_id UUID,
  p_action VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  v_role VARCHAR;
BEGIN
  -- Get user's role in the community
  SELECT role INTO v_role
  FROM community_members
  WHERE user_id = p_user_id 
    AND community_id = p_community_id
    AND status = 'active';
  
  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check permissions based on role
  CASE v_role
    WHEN 'owner' THEN
      RETURN TRUE; -- Owners can do everything
    WHEN 'admin' THEN
      RETURN p_action IN ('remove_member', 'delete_post', 'delete_message', 'view_audit_logs');
    WHEN 'moderator' THEN
      RETURN p_action IN ('delete_post', 'delete_message');
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
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

### Share Analytics

#### `share_analytics` Table
Track sharing activity for boards, posts, and profiles.

```sql
CREATE TABLE IF NOT EXISTS share_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  content_type VARCHAR NOT NULL CHECK (content_type IN ('board', 'post', 'profile')),
  content_id UUID NOT NULL,
  platform VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add share count columns to existing tables
ALTER TABLE posts ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;
```

**Usage**:
- Track when users share content via system share sheet
- Analyze popular content based on share metrics
- Platform field captures where content was shared (if available)

### UI String Management

#### Recommendation System Naming
The application uses a dual recommendation system with distinct naming:

1. **"Your Network"** - Social-based recommendations showing activity from users you follow
   - Shows restaurants and dishes that friends are saving, visiting, and recommending
   - Based on social graph and relationship data
   - Personalized based on who you follow
   - Empty state encourages following more users

2. **"What's Hot in Your City"** - Location-based trending content
   - Shows trending restaurants based on community activity in your area
   - Algorithm considers saves, reviews, posts, and engagement patterns
   - Location-based filtering for relevant local content
   - Emphasizes community-wide popular spots

**Implementation**:
- Centralized string constants in `constants/strings.ts`
- InfoModal components explain recommendation logic to users
- Consistent terminology across all screens and components
- Migration utilities for updating existing references

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

## Troubleshooting

### Common Authentication Issues

#### "Database error saving new user"
This error typically occurs when there are database triggers on the `auth.users` table that fail during user creation.

**Solution**:
- Remove all triggers on `auth.users` table
- Handle profile creation after OTP verification instead
- Use the `ensure_user_profile` function to create profiles

**Migration to fix**:
```sql
-- Remove all auth triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
```

#### Profile Not Created
If a user successfully logs in but has no profile in `public.users`:

**Solution**:
```sql
-- Manually create profile
SELECT public.ensure_user_profile('user-uuid-here', 'user@email.com');
```

#### No Default Board
If a user exists but has no default "Quick Saves" board:

**Solution**:
```sql
-- Create default boards for all users missing them
SELECT public.create_default_boards_for_existing_users();
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
CREATE INDEX idx_posts_content_type ON posts (content_type);
CREATE INDEX idx_posts_external_source ON posts (external_source);
CREATE INDEX idx_posts_external_url ON posts (external_url);

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
POST   /api/posts              # Create post (original or external)
GET    /api/posts/:id          # Get post details
PUT    /api/posts/:id          # Update post
DELETE /api/posts/:id          # Delete post
GET    /api/posts/external     # Get external content posts
GET    /api/posts/original     # Get original posts only
GET    /api/posts/external/:source # Get posts from specific external source

GET    /api/external-sources   # List supported external content sources
GET    /api/link-metadata      # Extract metadata from external URLs

GET    /api/boards             # List boards
POST   /api/boards            # Create board
GET    /api/boards/:id        # Get board details
PUT    /api/boards/:id        # Update board
DELETE /api/boards/:id        # Delete board

GET    /api/users/:id          # Get user profile
PUT    /api/users/:id          # Update user profile
POST   /api/users/:id/follow   # Follow user
DELETE /api/users/:id/follow   # Unfollow user

GET    /api/communities        # List communities
POST   /api/communities       # Create community
GET    /api/communities/:id   # Get community details
PUT    /api/communities/:id   # Update community (admin/owner only)
DELETE /api/communities/:id   # Delete community (admin/owner only)

POST   /api/communities/:id/join    # Join community
DELETE /api/communities/:id/leave   # Leave community
DELETE /api/communities/:id/members/:userId # Remove member (admin/owner only)
GET    /api/communities/:id/members  # Get community members
GET    /api/communities/:id/posts    # Get community posts
DELETE /api/communities/:id/posts/:postId # Delete post (admin/owner only)
PUT    /api/communities/:id/members/:userId/role # Update member role (owner only)
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

// External content posts
supabase
  .channel('external_posts')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'posts', filter: 'content_type=eq.external' },
    (payload) => handleNewExternalPost(payload)
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

#### Original Content Posts
1. **Validation**: Check user permissions and content
2. **Media Upload**: Upload images to Supabase Storage
3. **Creation**: Insert into `posts` table with `content_type='original'`
4. **Notifications**: Trigger notifications to followers
5. **Feed**: Update real-time feeds

#### External Content Posts
1. **URL Validation**: Validate external URL format
2. **Metadata Extraction**: Fetch title, description, thumbnail from URL
3. **Source Detection**: Identify platform (TikTok, Instagram, etc.)
4. **Creation**: Insert into `posts` table with `content_type='external'`
5. **Attribution**: Store original source and author information
6. **Notifications**: Trigger notifications to followers
7. **Feed**: Update real-time feeds with external content indicator

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

### Content Moderation
- External URL validation and safety checks
- Prohibited domain filtering
- Copyright violation detection
- Spam and malicious content prevention
- Community reporting system for inappropriate external content

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

**Last Updated**: 2025-07-30
**Version**: 1.2
**Maintainer**: Engineering Team