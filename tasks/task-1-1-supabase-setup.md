# Task 1.1: Supabase Backend Setup and Configuration

**Epic:** Backend Infrastructure & Database Setup  
**Priority:** Critical  
**Estimate:** 5 days  
**Status:** 🔴 Not Started

## Overview
Set up and configure Supabase backend infrastructure including PostgreSQL database, authentication, storage, and real-time features to serve as the foundation for the Troodie app.

Here is the supabase project url: [REDACTED - See .env file]

here is the supabase api key: [REDACTED - See .env file]


## Business Value
- Provides scalable backend-as-a-service foundation
- Enables rapid development with auto-generated APIs
- Supports real-time features out of the box
- Reduces infrastructure management overhead

## Dependencies
- None (foundation task)

## Blocks
- Task 1.2: Email OTP Authentication
- Task 2.1: Charlotte Restaurant Seeding
- Task 3.1: Restaurant Save Functionality

---

## Acceptance Criteria

```gherkin
Feature: Supabase Backend Configuration
  As a developer
  I want to set up and configure Supabase backend
  So that the app can store and retrieve data

Scenario: Initial Supabase Project Setup
  Given I have a Supabase account
  When I create a new Supabase project for Troodie
  Then the project should be configured with:
    | Component | Status |
    | PostgreSQL Database | Active |
    | Row Level Security | Enabled |
    | Authentication | Configured |
    | Storage Buckets | Created |
    | Realtime | Enabled |

Scenario: Database Schema Implementation
  Given I have a Supabase project
  When I execute the database schema from backend-design.md
  Then the following tables should be created:
    | Table | Purpose |
    | users | User profiles and authentication |
    | restaurants | Restaurant data and metadata |
    | restaurant_saves | User restaurant saves/posts |
    | boards | User-created restaurant collections |
    | communities | Social communities |
    | user_relationships | Follow/friend connections |
    | notifications | Real-time notifications |
    | user_onboarding | Onboarding quiz and persona data |
    | favorite_spots | User's favorite restaurant categories |

Scenario: Database Indexes Creation
  Given the core tables exist
  When I create performance indexes
  Then the following indexes should be created:
    | Index | Table | Columns | Type |
    | idx_restaurants_location | restaurants | location | GIST |
    | idx_restaurant_saves_user_id | restaurant_saves | user_id | BTREE |
    | idx_restaurant_saves_restaurant_id | restaurant_saves | restaurant_id | BTREE |
    | idx_boards_user_id | boards | user_id | BTREE |
    | idx_notifications_user_id | notifications | user_id, is_read | BTREE |
    | idx_user_relationships_follower | user_relationships | follower_id | BTREE |
    | idx_user_relationships_following | user_relationships | following_id | BTREE |

Scenario: Row Level Security Setup
  Given tables are created
  When I enable Row Level Security
  Then RLS should be enabled on all tables
  And basic security policies should be created:
    | Table | Policy | Rule |
    | users | Users can view public profiles | SELECT for all |
    | users | Users can update own profile | UPDATE where auth.uid() = id |
    | restaurant_saves | Public saves viewable by all | SELECT where privacy = 'public' |
    | restaurant_saves | Users can view own saves | SELECT where user_id = auth.uid() |
    | restaurant_saves | Users can create own saves | INSERT where user_id = auth.uid() |

Scenario: Storage Buckets Configuration
  Given the Supabase project is active
  When I create storage buckets
  Then the following buckets should be created:
    | Bucket | Public | Purpose |
    | avatars | true | User profile pictures |
    | restaurant-photos | true | Restaurant and food photos |
    | board-covers | true | Board cover images |
    | community-images | true | Community photos |
  And storage policies should allow:
    | Bucket | Operation | Rule |
    | avatars | SELECT | Public access |
    | avatars | INSERT/UPDATE | Own folder only |
    | restaurant-photos | SELECT | Public access |
    | restaurant-photos | INSERT | Authenticated users |

Scenario: Realtime Configuration
  Given tables are created
  When I enable realtime features
  Then realtime should be enabled for:
    | Table | Purpose |
    | restaurant_saves | New save notifications |
    | save_interactions | Like/comment updates |
    | comments | Real-time comments |
    | notifications | Instant notifications |
    | community_posts | Community activity |

Scenario: Environment Configuration
  Given I have the Supabase project credentials
  When I configure the React Native app
  Then the app should connect to Supabase successfully
  And environment variables should be properly secured:
    | Variable | Required | Purpose |
    | SUPABASE_URL | Yes | Project API endpoint |
    | SUPABASE_ANON_KEY | Yes | Public API key |
    | SUPABASE_SERVICE_KEY | No (server only) | Admin operations |

Scenario: Database Functions Creation
  Given the schema is implemented
  When I create utility functions
  Then the following functions should be created:
    | Function | Purpose | Returns |
    | check_rate_limit | Prevent spam/abuse | boolean |
    | create_notification | Generate user notifications | uuid |
    | calculate_persona_scores | Onboarding quiz scoring | text |
    | get_user_stats | Profile statistics | json |

Scenario: API Connection Validation
  Given the backend is configured
  When I test the connection from React Native
  Then I should be able to:
    | Operation | Expected Result |
    | Connect to database | Success response |
    | Execute simple query | Data returned |
    | Authenticate user | Session created |
    | Upload to storage | File stored |
    | Subscribe to realtime | Events received |

Scenario: Development vs Production Configuration
  Given I need different environments
  When I configure project settings
  Then development should have:
    | Setting | Development | Production |
    | Rate limiting | Relaxed | Strict |
    | CORS settings | Localhost allowed | Domain restricted |
    | Auth redirects | Local URLs | Production URLs |
    | Email templates | Test templates | Branded templates |
```

---

## Technical Implementation

### Database Schema Script
```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone VARCHAR(20) UNIQUE,
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

-- Restaurants table
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_place_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    location GEOGRAPHY(POINT),
    cuisine_types TEXT[],
    price_range VARCHAR(4),
    phone VARCHAR(20),
    website TEXT,
    hours JSONB,
    photos TEXT[],
    cover_photo_url TEXT,
    google_rating DECIMAL(2,1),
    google_reviews_count INTEGER,
    troodie_rating DECIMAL(2,1),
    troodie_reviews_count INTEGER DEFAULT 0,
    features TEXT[],
    dietary_options TEXT[],
    is_verified BOOLEAN DEFAULT FALSE,
    is_claimed BOOLEAN DEFAULT FALSE,
    owner_id UUID REFERENCES users(id),
    data_source VARCHAR(20) CHECK (data_source IN ('seed', 'google', 'user')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_google_sync TIMESTAMPTZ
);

-- Continue with remaining tables from backend-design.md...
```

### Environment Configuration
```typescript
// lib/supabase.ts
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || ''
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

---

## Definition of Done

- [ ] Supabase project created and configured
- [ ] All database tables created with proper schema
- [ ] All database indexes created for performance
- [ ] Row Level Security enabled with basic policies
- [ ] Storage buckets created with appropriate policies
- [ ] Realtime enabled for required tables
- [ ] Environment variables configured in React Native app
- [ ] Database utility functions created and tested
- [ ] Connection validated from React Native app
- [ ] Development and production configurations documented
- [ ] All Gherkin scenarios pass
- [ ] Database documentation updated
- [ ] Environment setup guide created for team

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Backend Design Document](../docs/backend-design.md)
- [Supabase Integration Guide](../docs/supabase-integration-guide.md)

---

## Notes

- This is the foundation task that blocks all other backend-dependent features
- Estimated 5 days includes time for proper testing and documentation
- Consider setting up both development and production instances
- Ensure all team members have access to Supabase project
- Document all configuration steps for future reference 