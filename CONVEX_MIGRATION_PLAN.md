# Troodie: Supabase → Convex + Clerk Migration Plan

**Project:** Troodie Creator Marketplace
**Current Stack:** Supabase (PostgreSQL + Auth) + React Native
**Target Stack:** Convex + Clerk + React Native
**Migration Date:** Q1 2025
**Status:** Planning Phase

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Target Architecture](#target-architecture)
4. [Database Schema Migration](#database-schema-migration)
5. [Authentication Migration](#authentication-migration)
6. [Service Layer Transformation](#service-layer-transformation)
7. [Migration Phases](#migration-phases)
8. [Testing Strategy](#testing-strategy)
9. [Rollback Plan](#rollback-plan)
10. [Timeline & Resources](#timeline--resources)

---

## Executive Summary

### Migration Goals
- **Zero downtime** - Maintain service continuity during migration
- **Data integrity** - Preserve all existing data relationships and constraints
- **Feature parity** - Maintain all current functionality
- **Performance improvement** - Leverage Convex's real-time capabilities
- **Auth modernization** - Migrate to Clerk for better auth UX

### Key Challenges
1. **54 service files** - Large service layer to refactor
2. **48 database tables** - Complex schema with relationships
3. **Real-time features** - Supabase Realtime → Convex subscriptions
4. **Auth migration** - Supabase Auth → Clerk (user data + sessions)
5. **File storage** - Supabase Storage → Convex file storage or external CDN
6. **Row Level Security (RLS)** - PostgreSQL RLS → Convex auth rules

### Success Metrics
- **Migration completion**: < 6 weeks
- **Downtime**: 0 hours
- **Data loss**: 0%
- **Feature regression**: 0%
- **Performance**: ≥ Current baseline
- **User churn**: < 1% during migration

---

## Current Architecture Analysis

### Technology Stack (Current)

```yaml
Backend:
  Database: Supabase PostgreSQL
  Auth: Supabase Auth (email OTP)
  Storage: Supabase Storage
  Realtime: Supabase Realtime subscriptions
  Functions: Supabase Edge Functions (Deno)

Frontend:
  Framework: React Native (Expo)
  Router: Expo Router
  State: React Context API
  Storage: AsyncStorage

External Services:
  Push Notifications: Expo Push Notifications
  Maps: Google Places API
  Payments: Stripe Connect
  Image Upload: Direct to Supabase Storage
```

### Database Inventory

**Core Tables (48 total)**:
- **Users & Auth** (5): users, user_preferences, user_onboarding, user_relationships, blocked_users
- **Restaurants** (5): restaurants, restaurant_saves, restaurant_claims, restaurant_images, save_boards
- **Posts & Content** (9): posts, post_likes, post_comments, post_saves, post_communities, comments, save_interactions, external_content_sources, share_analytics
- **Boards** (5): boards, board_members, board_collaborators, board_invitations, board_restaurants, board_subscriptions
- **Communities** (6): communities, community_members, community_posts, community_invites, community_admin_logs, post_communities
- **Creator Marketplace** (11): creator_profiles, creator_applications, creator_onboarding_progress, creator_portfolio_items, campaigns, campaign_applications, campaign_deliverables, portfolio_items, business_profiles, review_logs
- **Notifications** (4): notifications, notification_preferences, push_tokens, user_achievements
- **Analytics** (3): user_events, user_referrals, user_referral_conversions, user_invite_shares, favorite_spots, spatial_ref_sys, reports

### Service Layer Inventory

**54 Service Files**:
```
Core Services (10):
- authService.ts - Supabase Auth wrapper
- userService.ts - User CRUD operations
- profileService.ts - User profile management
- accountService.ts - Multi-role account management
- storageService.ts - Supabase Storage wrapper
- locationService.ts - Google Places integration
- notificationService.ts - In-app notifications
- pushNotificationService.ts - Push notifications
- toastService.ts - UI toasts
- moderationService.ts - Content moderation

Restaurant Services (7):
- restaurantService.ts - Restaurant CRUD
- restaurantClaimService.ts - Business claiming
- restaurantImageService.ts - Image management
- restaurantImageSyncService.ts - Auto cover photos
- restaurantPhotosService.ts - Photo gallery
- intelligentCoverPhotoService.ts - AI cover selection
- ratingService.ts - Traffic light ratings

Social Services (9):
- followService.ts - Follow/unfollow
- blockingService.ts - User blocking
- userSearchService.ts - User discovery
- shareService.ts - Content sharing
- socialActivityService.ts - Activity feed
- activityFeedService.ts - Feed aggregation
- saveService.ts - Restaurant saves
- postService.ts - Post management
- postEngagementService.ts - Likes/comments
- enhancedPostEngagementService.ts - Advanced engagement

Board Services (3):
- boardService.ts - Board CRUD
- boardServiceExtended.ts - Advanced board features
- boardInvitationService.ts - Board invites

Community Services (3):
- communityService.ts - Community CRUD
- communityAdminService.ts - Admin actions
- communityDiscoveryService.ts - Discovery algorithm

Creator Marketplace (5):
- creatorApplicationService.ts - Creator applications
- adminReviewService.ts - Admin review queue
- statusNotificationService.ts - Status updates
- accountService.ts - Account type management

Content Services (5):
- postMediaService.ts - Media upload
- linkMetadataService.ts - Link previews
- imageUploadService.ts - Image upload (v1)
- imageUploadServiceV2.ts - Image upload (v2)
- imageUploadServiceFormData.ts - FormData upload

Discovery & Analytics (4):
- localGemsService.ts - Restaurant discovery
- googlePlacesService.ts - Google Places API
- achievementService.ts - User achievements
- inviteService.ts - User invitations
```

### Critical Features Requiring Special Attention

1. **Real-time Features**:
   - Live notifications
   - Community feed updates
   - Campaign status changes
   - Follow/unfollow updates

2. **File Upload Flows**:
   - Post images (user content)
   - Restaurant photos (community sourced)
   - Profile avatars
   - Cover photos (restaurants & boards)
   - Portfolio items (creator content)

3. **Complex Queries**:
   - Social graph queries (followers, following, blocked users)
   - Feed generation (personalized, community, trending)
   - Restaurant discovery (location-based, recommendations)
   - Campaign matching (creator-restaurant pairing)

4. **Multi-Role Auth**:
   - Consumer accounts (default)
   - Creator accounts (with application/approval)
   - Business accounts (with restaurant claiming)
   - Account upgrades & role switching

---

## Target Architecture

### Technology Stack (Target)

```yaml
Backend:
  Database: Convex (Real-time reactive database)
  Auth: Clerk (Modern auth platform)
  Storage: Convex File Storage + CloudFlare R2 (for large files)
  Realtime: Built-in Convex reactivity
  Functions: Convex functions (TypeScript)

Frontend:
  Framework: React Native (Expo) - unchanged
  Router: Expo Router - unchanged
  State: Convex React hooks + React Context
  Storage: AsyncStorage - unchanged
  Auth: Clerk React Native SDK

External Services:
  Push Notifications: Expo Push Notifications - unchanged
  Maps: Google Places API - unchanged
  Payments: Stripe Connect - unchanged
  Image Upload: Convex File Storage
```

### Convex Architecture Patterns

#### 1. Database Schema Design

**Convex uses a document-based model** (not relational):

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table
  users: defineTable({
    // Clerk user ID as primary identifier
    clerkId: v.string(),
    phone: v.optional(v.string()),
    username: v.optional(v.string()),
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    persona: v.optional(v.string()),
    isVerified: v.boolean(),
    isCreator: v.boolean(),
    isRestaurant: v.boolean(),
    accountType: v.union(
      v.literal("consumer"),
      v.literal("creator"),
      v.literal("business")
    ),
    accountStatus: v.union(
      v.literal("active"),
      v.literal("suspended"),
      v.literal("pending_verification")
    ),
    profileCompletion: v.number(),
    savesCount: v.number(),
    reviewsCount: v.number(),
    followersCount: v.number(),
    followingCount: v.number(),
    defaultBoardId: v.optional(v.id("boards")),
    location: v.optional(v.string()),
    email: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_username", ["username"])
    .index("by_email", ["email"]),

  // Restaurants table
  restaurants: defineTable({
    googlePlaceId: v.optional(v.string()),
    name: v.string(),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    // Location stored as object instead of PostGIS
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
    })),
    cuisineTypes: v.optional(v.array(v.string())),
    priceRange: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    // Hours stored as JSON object
    hours: v.optional(v.any()),
    photos: v.optional(v.array(v.string())),
    coverPhotoUrl: v.optional(v.string()),
    googleRating: v.optional(v.number()),
    googleReviewsCount: v.optional(v.number()),
    troodieRating: v.optional(v.number()),
    troodieReviewsCount: v.number(),
    features: v.optional(v.array(v.string())),
    dietaryOptions: v.optional(v.array(v.string())),
    isVerified: v.boolean(),
    isClaimed: v.boolean(),
    ownerId: v.optional(v.id("users")),
    dataSource: v.optional(v.union(
      v.literal("seed"),
      v.literal("google"),
      v.literal("user")
    )),
    // Traffic light ratings
    redRatingsCount: v.number(),
    yellowRatingsCount: v.number(),
    greenRatingsCount: v.number(),
    totalRatingsCount: v.number(),
    overallRating: v.string(),
    coverPhotoSource: v.optional(v.string()),
    coverPhotoUpdatedAt: v.optional(v.number()),
    autoCoverEnabled: v.boolean(),
    hasManualCover: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastGoogleSync: v.optional(v.number()),
  })
    .index("by_google_place_id", ["googlePlaceId"])
    .index("by_city", ["city"])
    .index("by_owner", ["ownerId"])
    // Geospatial queries require custom indexing
    .searchIndex("search_restaurants", {
      searchField: "name",
      filterFields: ["city", "state", "cuisineTypes"],
    }),

  // User relationships (followers/following)
  userRelationships: defineTable({
    followerId: v.id("users"),
    followingId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_follower", ["followerId"])
    .index("by_following", ["followingId"])
    // Compound index for checking if A follows B
    .index("by_relationship", ["followerId", "followingId"]),

  // Posts
  posts: defineTable({
    userId: v.optional(v.id("users")),
    restaurantId: v.optional(v.id("restaurants")),
    caption: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),
    rating: v.optional(v.number()),
    visitDate: v.optional(v.string()),
    priceRange: v.optional(v.string()),
    visitType: v.optional(v.union(
      v.literal("dine_in"),
      v.literal("takeout"),
      v.literal("delivery")
    )),
    tags: v.optional(v.array(v.string())),
    privacy: v.union(
      v.literal("public"),
      v.literal("friends"),
      v.literal("private")
    ),
    locationLat: v.optional(v.number()),
    locationLng: v.optional(v.number()),
    likesCount: v.number(),
    commentsCount: v.number(),
    savesCount: v.number(),
    shareCount: v.number(),
    isTrending: v.boolean(),
    // External content fields
    contentType: v.union(
      v.literal("original"),
      v.literal("external")
    ),
    externalSource: v.optional(v.string()),
    externalUrl: v.optional(v.string()),
    externalTitle: v.optional(v.string()),
    externalDescription: v.optional(v.string()),
    externalThumbnail: v.optional(v.string()),
    externalAuthor: v.optional(v.string()),
    postType: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_restaurant", ["restaurantId"])
    .index("by_created_at", ["createdAt"])
    .index("by_trending", ["isTrending", "createdAt"]),

  // Boards
  boards: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    type: v.union(
      v.literal("free"),
      v.literal("private"),
      v.literal("paid")
    ),
    category: v.optional(v.string()),
    location: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    price: v.optional(v.number()),
    currency: v.string(),
    billingType: v.optional(v.string()),
    allowComments: v.boolean(),
    allowSaves: v.boolean(),
    memberCount: v.number(),
    restaurantCount: v.number(),
    shareCount: v.number(),
    isPrivate: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_type", ["type"])
    .index("by_created_at", ["createdAt"]),

  // Restaurant saves (many-to-many: users ↔ restaurants via boards)
  restaurantSaves: defineTable({
    userId: v.id("users"),
    restaurantId: v.id("restaurants"),
    boardId: v.id("boards"),
    personalRating: v.optional(v.number()),
    trafficLightRating: v.optional(v.union(
      v.literal("red"),
      v.literal("yellow"),
      v.literal("green")
    )),
    visitDate: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    wouldRecommend: v.optional(v.boolean()),
    priceRange: v.optional(v.string()),
    visitType: v.optional(v.union(
      v.literal("dine_in"),
      v.literal("takeout"),
      v.literal("delivery")
    )),
    privacy: v.optional(v.union(
      v.literal("public"),
      v.literal("friends"),
      v.literal("private")
    )),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_restaurant", ["restaurantId"])
    .index("by_board", ["boardId"])
    .index("by_user_and_restaurant", ["userId", "restaurantId"]),

  // Communities
  communities: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    category: v.optional(v.string()),
    location: v.optional(v.string()),
    adminId: v.optional(v.id("users")),
    createdBy: v.optional(v.id("users")),
    type: v.union(
      v.literal("public"),
      v.literal("private"),
      v.literal("paid")
    ),
    price: v.optional(v.number()),
    currency: v.string(),
    billingCycle: v.optional(v.string()),
    memberCount: v.number(),
    postCount: v.number(),
    activityLevel: v.number(),
    isActive: v.boolean(),
    isEventBased: v.boolean(),
    eventName: v.optional(v.string()),
    eventDate: v.optional(v.string()),
    settings: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_admin", ["adminId"])
    .index("by_type", ["type"])
    .index("by_created_at", ["createdAt"])
    .searchIndex("search_communities", {
      searchField: "name",
      filterFields: ["category", "location", "type"],
    }),

  // Notifications
  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("like"),
      v.literal("comment"),
      v.literal("follow"),
      v.literal("achievement"),
      v.literal("restaurant_recommendation"),
      v.literal("board_invite"),
      v.literal("post_mention"),
      v.literal("milestone"),
      v.literal("system")
    ),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.any()),
    relatedId: v.optional(v.string()),
    relatedType: v.optional(v.string()),
    priority: v.number(),
    isRead: v.boolean(),
    isActioned: v.boolean(),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_read", ["userId", "isRead"])
    .index("by_created_at", ["createdAt"]),

  // Creator profiles
  creatorProfiles: defineTable({
    userId: v.id("users"),
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    foodSpecialties: v.optional(v.array(v.string())),
    specialties: v.optional(v.array(v.string())),
    socialLinks: v.optional(v.any()),
    verificationStatus: v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("rejected")
    ),
    metrics: v.optional(v.any()),
    portfolioUploaded: v.boolean(),
    instantApproved: v.boolean(),
    avatarUrl: v.optional(v.string()),
    followersCount: v.number(),
    contentCount: v.number(),
    accountStatus: v.union(
      v.literal("active"),
      v.literal("suspended"),
      v.literal("pending_verification")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_verification_status", ["verificationStatus"]),

  // Campaigns
  campaigns: defineTable({
    restaurantId: v.id("restaurants"),
    ownerId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    requirements: v.optional(v.array(v.string())),
    campaignType: v.string(),
    budgetCents: v.number(),
    spentAmountCents: v.number(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    maxCreators: v.number(),
    selectedCreatorsCount: v.number(),
    totalDeliverables: v.number(),
    deliveredContentCount: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("review"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),

  // Campaign applications
  campaignApplications: defineTable({
    campaignId: v.id("campaigns"),
    creatorId: v.id("creatorProfiles"),
    proposedRateCents: v.optional(v.number()),
    proposedDeliverables: v.optional(v.string()),
    coverLetter: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("withdrawn")
    ),
    appliedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewerId: v.optional(v.id("users")),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_creator", ["creatorId"])
    .index("by_status", ["status"]),

  // Blocked users
  blockedUsers: defineTable({
    blockerId: v.id("users"),
    blockedId: v.id("users"),
    reason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_blocker", ["blockerId"])
    .index("by_blocked", ["blockedId"])
    .index("by_relationship", ["blockerId", "blockedId"]),

  // Reports
  reports: defineTable({
    reporterId: v.id("users"),
    targetType: v.union(
      v.literal("post"),
      v.literal("comment"),
      v.literal("user"),
      v.literal("board"),
      v.literal("community")
    ),
    targetId: v.string(),
    reason: v.union(
      v.literal("spam"),
      v.literal("harassment"),
      v.literal("hate_speech"),
      v.literal("violence"),
      v.literal("sexual_content"),
      v.literal("false_information"),
      v.literal("intellectual_property"),
      v.literal("self_harm"),
      v.literal("illegal_activity"),
      v.literal("other")
    ),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("reviewing"),
      v.literal("resolved"),
      v.literal("dismissed")
    ),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    resolutionNotes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_reporter", ["reporterId"])
    .index("by_status", ["status"])
    .index("by_target", ["targetType", "targetId"]),

  // Restaurant claims
  restaurantClaims: defineTable({
    restaurantId: v.id("restaurants"),
    userId: v.id("users"),
    email: v.string(),
    verificationMethod: v.optional(v.union(
      v.literal("domain_match"),
      v.literal("email_code"),
      v.literal("manual_review")
    )),
    verificationCode: v.optional(v.string()),
    codeExpiresAt: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("rejected"),
      v.literal("expired")
    ),
    verifiedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    adminNotes: v.optional(v.string()),
    submittedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id("users")),
    reviewNotes: v.optional(v.string()),
    canResubmit: v.boolean(),
    ownershipProofType: v.optional(v.string()),
    ownershipProofUrl: v.optional(v.string()),
    businessPhone: v.optional(v.string()),
    additionalNotes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // Creator applications
  creatorApplications: defineTable({
    userId: v.id("users"),
    instagramHandle: v.optional(v.string()),
    tiktokHandle: v.optional(v.string()),
    youtubeHandle: v.optional(v.string()),
    twitterHandle: v.optional(v.string()),
    followerCount: v.number(),
    contentCategories: v.optional(v.array(v.string())),
    sampleContentUrls: v.optional(v.array(v.string())),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    preferredCuisineTypes: v.optional(v.array(v.string())),
    hasBusinessEmail: v.boolean(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    submittedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id("users")),
    rejectionReason: v.optional(v.string()),
    reviewNotes: v.optional(v.string()),
    canResubmit: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // Push tokens
  pushTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    platform: v.union(
      v.literal("ios"),
      v.literal("android"),
      v.literal("web")
    ),
    deviceId: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_token", ["token"]),

  // Files (Convex file storage)
  files: defineTable({
    storageId: v.id("_storage"),
    userId: v.id("users"),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
    url: v.string(),
    category: v.union(
      v.literal("avatar"),
      v.literal("post_image"),
      v.literal("restaurant_photo"),
      v.literal("cover_photo"),
      v.literal("portfolio_item"),
      v.literal("document")
    ),
    relatedId: v.optional(v.string()),
    relatedType: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_category", ["category"])
    .index("by_related", ["relatedType", "relatedId"]),
});
```

#### 2. Auth Rules (RLS Replacement)

In Supabase, Row Level Security (RLS) policies protect data.
In Convex, we use **auth rules in queries and mutations**:

```typescript
// convex/users.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Helper to get current user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    return user;
  },
});

// Get user profile (public data only unless viewing own profile)
export const getProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    const user = await ctx.db.get(userId);

    if (!user) throw new Error("User not found");

    // Check if viewing own profile
    const isOwnProfile = identity && user.clerkId === identity.subject;

    // Return full data for own profile, limited data for others
    if (isOwnProfile) {
      return user;
    } else {
      // Public profile view - hide sensitive data
      return {
        _id: user._id,
        username: user.username,
        name: user.name,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
        accountType: user.accountType,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        savesCount: user.savesCount,
        // Hide: email, phone, location (unless public), etc.
      };
    }
  },
});

// Update profile (owner only)
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      ...args,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Follow user (authenticated users only)
export const followUser = mutation({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, { targetUserId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) throw new Error("User not found");
    if (currentUser._id === targetUserId) throw new Error("Cannot follow yourself");

    // Check if already following
    const existing = await ctx.db
      .query("userRelationships")
      .withIndex("by_relationship", (q) =>
        q.eq("followerId", currentUser._id).eq("followingId", targetUserId)
      )
      .first();

    if (existing) throw new Error("Already following");

    // Create relationship
    await ctx.db.insert("userRelationships", {
      followerId: currentUser._id,
      followingId: targetUserId,
      createdAt: Date.now(),
    });

    // Update counts
    await ctx.db.patch(currentUser._id, {
      followingCount: currentUser.followingCount + 1,
    });

    const targetUser = await ctx.db.get(targetUserId);
    if (targetUser) {
      await ctx.db.patch(targetUserId, {
        followersCount: targetUser.followersCount + 1,
      });
    }

    return { success: true };
  },
});
```

#### 3. Real-time Subscriptions

**Supabase Realtime** (manual subscriptions):
```typescript
// Current Supabase approach
const subscription = supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    console.log('New notification:', payload);
  })
  .subscribe();
```

**Convex Reactivity** (automatic):
```typescript
// Convex approach - automatically reactive
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function NotificationsList() {
  // This automatically updates when new notifications are added!
  const notifications = useQuery(api.notifications.list, {
    limit: 20,
  });

  return (
    <View>
      {notifications?.map(notif => (
        <NotificationItem key={notif._id} notification={notif} />
      ))}
    </View>
  );
}
```

**Every Convex query is automatically reactive** - no manual subscriptions needed!

#### 4. File Storage

**Supabase Storage** (direct upload):
```typescript
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.png`, file);
```

**Convex File Storage** (via mutation):
```typescript
// Step 1: Get upload URL
const uploadUrl = await convex.mutation(api.files.generateUploadUrl);

// Step 2: Upload file
const result = await fetch(uploadUrl, {
  method: "POST",
  headers: { "Content-Type": file.type },
  body: file,
});
const { storageId } = await result.json();

// Step 3: Save file metadata
await convex.mutation(api.files.saveFileMetadata, {
  storageId,
  filename: file.name,
  contentType: file.type,
  size: file.size,
  category: "avatar",
});
```

---

## Database Schema Migration

### Phase 1: Core Tables (Week 1)

**Priority 1 - Authentication & Users**:
```
✓ users
✓ user_preferences
✓ user_onboarding
✓ push_tokens
✓ user_achievements
✓ user_events
```

**Migration Strategy**:
1. Export all user data from Supabase
2. Transform `auth.users.id` (UUID) → `users.clerkId` (string)
3. Create Clerk accounts via Clerk Admin API (preserve email)
4. Import to Convex with Clerk IDs
5. Create user ID mapping table (Supabase UUID ↔ Convex ID)

**Data Transformation**:
```typescript
// Migration script pseudocode
const migrateUsers = async () => {
  // 1. Export from Supabase
  const supabaseUsers = await supabase
    .from('users')
    .select('*, auth.users(id, email)')
    .limit(1000);

  // 2. Create Clerk users
  for (const user of supabaseUsers) {
    const clerkUser = await clerkClient.users.createUser({
      emailAddress: [user.email],
      username: user.username,
      firstName: user.name?.split(' ')[0],
      lastName: user.name?.split(' ')[1],
      publicMetadata: {
        migratedFrom: 'supabase',
        supabaseId: user.id,
      },
    });

    // 3. Import to Convex
    await convex.mutation(api.users.create, {
      clerkId: clerkUser.id,
      username: user.username,
      name: user.name,
      bio: user.bio,
      avatarUrl: user.avatar_url,
      accountType: user.account_type,
      // ... map all fields
      createdAt: new Date(user.created_at).getTime(),
    });

    // 4. Store mapping
    await convex.mutation(api.migrations.saveIdMapping, {
      supabaseId: user.id,
      clerkId: clerkUser.id,
      convexId: newUser._id,
    });
  }
};
```

### Phase 2: Content Tables (Week 2)

**Priority 2 - Core Content**:
```
✓ restaurants
✓ restaurant_saves
✓ boards
✓ posts
✓ restaurant_images
```

**Special Considerations**:

1. **Location Data** (PostGIS → Convex):
```sql
-- Supabase (PostGIS geometry)
location GEOMETRY(Point, 4326)

-- Export with coordinates
SELECT
  ST_X(location::geometry) as longitude,
  ST_Y(location::geometry) as latitude
FROM restaurants;
```

```typescript
// Convex (object)
location: {
  latitude: 37.7749,
  longitude: -122.4194
}

// Query by distance (custom function)
export const nearbyRestaurants = query({
  args: {
    userLat: v.number(),
    userLng: v.number(),
    radiusMiles: v.number(),
  },
  handler: async (ctx, { userLat, userLng, radiusMiles }) => {
    const allRestaurants = await ctx.db.query("restaurants").collect();

    return allRestaurants
      .filter(r => {
        if (!r.location) return false;
        const distance = calculateDistance(
          userLat, userLng,
          r.location.latitude, r.location.longitude
        );
        return distance <= radiusMiles;
      })
      .sort((a, b) => {
        const distA = calculateDistance(userLat, userLng, a.location.latitude, a.location.longitude);
        const distB = calculateDistance(userLat, userLng, b.location.latitude, b.location.longitude);
        return distA - distB;
      });
  },
});

// Haversine formula for distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}
```

2. **File URLs Migration**:
   - Supabase Storage URLs → Convex File Storage or CDN
   - Options:
     - **Option A**: Migrate files to Convex (< 20MB per file limit)
     - **Option B**: Keep in Supabase Storage (migration phase only)
     - **Option C**: Migrate to CloudFlare R2 + CDN (recommended for large files)

### Phase 3: Social & Relationships (Week 3)

**Priority 3 - Social Features**:
```
✓ user_relationships (followers/following)
✓ blocked_users
✓ post_likes
✓ post_comments
✓ post_saves
✓ save_interactions
```

**Key Indexes for Performance**:
```typescript
// Compound indexes for common queries
.index("by_relationship", ["followerId", "followingId"])
.index("by_user_and_post", ["userId", "postId"])
```

### Phase 4: Communities & Boards (Week 3)

**Priority 4 - Group Features**:
```
✓ communities
✓ community_members
✓ community_posts
✓ community_invites
✓ board_members
✓ board_collaborators
✓ board_invitations
✓ board_restaurants
```

### Phase 5: Creator Marketplace (Week 4)

**Priority 5 - Creator Features**:
```
✓ creator_profiles
✓ creator_applications
✓ creator_portfolio_items
✓ creator_onboarding_progress
✓ business_profiles
✓ campaigns
✓ campaign_applications
✓ campaign_deliverables
✓ portfolio_items
✓ restaurant_claims
✓ review_logs
```

### Phase 6: Notifications & Analytics (Week 4)

**Priority 6 - Supporting Tables**:
```
✓ notifications
✓ notification_preferences
✓ share_analytics
✓ reports
✓ comments
✓ external_content_sources
✓ favorite_spots
✓ user_referrals
✓ user_referral_conversions
✓ user_invite_shares
✓ board_subscriptions
✓ save_boards
```

---

## Authentication Migration

### Supabase Auth → Clerk Migration

#### Current Auth Flow (Supabase)

```typescript
// supabase/auth
1. User enters email
2. Supabase sends OTP via email
3. User enters OTP
4. Supabase creates auth.users record
5. Trigger creates public.users record
6. Session stored in AsyncStorage
```

#### Target Auth Flow (Clerk)

```typescript
// Clerk
1. User enters email
2. Clerk sends OTP/magic link
3. User verifies
4. Clerk creates user
5. Convex webhook creates users record
6. Session managed by Clerk SDK
```

#### Migration Steps

**Step 1: Install Clerk**
```bash
npm install @clerk/clerk-expo
```

**Step 2: Configure Clerk Provider**
```typescript
// app/_layout.tsx
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache} // Custom token cache for React Native
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {/* App content */}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

// Token cache for React Native
import * as SecureStore from 'expo-secure-store';

const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};
```

**Step 3: Create Clerk Webhook for User Sync**
```typescript
// convex/clerk.ts (Convex HTTP action)
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix";

const http = httpRouter();

// Clerk webhook handler
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const svix_id = request.headers.get("svix-id");
    const svix_timestamp = request.headers.get("svix-timestamp");
    const svix_signature = request.headers.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response("Error: Missing Svix headers", { status: 400 });
    }

    const payload = await request.text();
    const body = JSON.parse(payload);

    // Verify webhook signature
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
    let evt;
    try {
      evt = wh.verify(payload, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err) {
      return new Response("Error: Invalid signature", { status: 400 });
    }

    const { type, data } = evt;

    switch (type) {
      case "user.created":
        // Create user in Convex
        await ctx.runMutation(api.users.createFromClerk, {
          clerkId: data.id,
          email: data.email_addresses[0]?.email_address,
          username: data.username,
          name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
          avatarUrl: data.image_url,
        });
        break;

      case "user.updated":
        // Update user in Convex
        await ctx.runMutation(api.users.updateFromClerk, {
          clerkId: data.id,
          email: data.email_addresses[0]?.email_address,
          username: data.username,
          name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
          avatarUrl: data.image_url,
        });
        break;

      case "user.deleted":
        // Soft delete user
        await ctx.runMutation(api.users.deleteFromClerk, {
          clerkId: data.id,
        });
        break;
    }

    return new Response("Webhook processed", { status: 200 });
  }),
});

export default http;
```

**Step 4: Migrate Existing Users**

```typescript
// Migration script: Create Clerk users from Supabase users
import { clerkClient } from "@clerk/clerk-sdk-node";

const migrateUsersToClerk = async () => {
  // 1. Get all Supabase users
  const { data: supabaseUsers } = await supabase
    .from('users')
    .select('*, auth.users(email)')
    .order('created_at', { ascending: true });

  for (const supabaseUser of supabaseUsers) {
    try {
      // 2. Create Clerk user (password-less)
      const clerkUser = await clerkClient.users.createUser({
        emailAddress: [supabaseUser.email],
        username: supabaseUser.username,
        firstName: supabaseUser.name?.split(' ')[0],
        lastName: supabaseUser.name?.split(' ')[1],
        // Store Supabase ID for reference
        publicMetadata: {
          supabaseId: supabaseUser.id,
          migratedAt: new Date().toISOString(),
        },
        // Skip password - users will set via "forgot password" flow
        skipPasswordRequirement: true,
      });

      // 3. Send password reset email
      await clerkClient.users.updateUser(clerkUser.id, {
        // This triggers password setup email
      });

      console.log(`Migrated user: ${supabaseUser.email} → ${clerkUser.id}`);
    } catch (error) {
      console.error(`Failed to migrate user ${supabaseUser.email}:`, error);
    }
  }
};
```

**Step 5: Update Frontend Auth Components**

```typescript
// Old: Supabase Auth
import { supabase } from '@/lib/supabase';

const signIn = async (email: string) => {
  const { error } = await supabase.auth.signInWithOtp({ email });
  return { error };
};

// New: Clerk Auth
import { useSignIn } from '@clerk/clerk-expo';

const SignInScreen = () => {
  const { signIn, setActive } = useSignIn();

  const handleSignIn = async (email: string) => {
    try {
      // Start sign-in process
      await signIn.create({
        identifier: email,
      });

      // Send OTP
      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: signIn.supportedFirstFactors[0].emailAddressId,
      });

      // Navigate to OTP verification screen
      router.push('/verify-otp');
    } catch (err) {
      console.error(err);
    }
  };

  const verifyOTP = async (code: string) => {
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        // User is signed in!
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ... UI
};
```

---

## Service Layer Transformation

### Service Architecture Comparison

**Current (Supabase)**:
```
Frontend → Services → Supabase Client → PostgreSQL
         ↓
      Context API (state)
```

**Target (Convex)**:
```
Frontend → Convex Hooks → Convex Functions → Convex DB
         ↓
      Auto-reactive state (built-in)
```

### Migration Strategy

**Pattern 1: Simple CRUD Services**

```typescript
// OLD: services/userService.ts (Supabase)
export const userService = {
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// Usage in component
const [profile, setProfile] = useState(null);
useEffect(() => {
  userService.getProfile(userId).then(setProfile);
}, [userId]);
```

```typescript
// NEW: convex/users.ts (Convex)
export const getProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId);
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      ...args,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Usage in component - automatically reactive!
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const ProfileScreen = () => {
  const profile = useQuery(api.users.getProfile, { userId: "..." });
  const updateProfile = useMutation(api.users.updateProfile);

  // profile automatically updates when data changes!
  // No manual refresh needed!
};
```

**Pattern 2: Complex Services with Business Logic**

```typescript
// OLD: services/restaurantService.ts
export const restaurantService = {
  async saveRestaurant(
    userId: string,
    restaurantId: string,
    boardId: string,
    data: SaveData
  ) {
    // 1. Create save
    const { data: save, error: saveError } = await supabase
      .from('restaurant_saves')
      .insert({
        user_id: userId,
        restaurant_id: restaurantId,
        board_id: boardId,
        ...data,
      })
      .select()
      .single();

    if (saveError) throw saveError;

    // 2. Update restaurant counts
    const { error: countError } = await supabase.rpc(
      'increment_restaurant_saves',
      { restaurant_id: restaurantId }
    );

    if (countError) throw countError;

    // 3. Update user counts
    await supabase.rpc('increment_user_saves', { user_id: userId });

    // 4. Create notification
    await notificationService.create({
      type: 'restaurant_save',
      user_id: userId,
      restaurant_id: restaurantId,
    });

    return save;
  },
};
```

```typescript
// NEW: convex/restaurants.ts
export const saveRestaurant = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    boardId: v.id("boards"),
    rating: v.optional(v.number()),
    notes: v.optional(v.string()),
    trafficLightRating: v.optional(v.union(
      v.literal("red"),
      v.literal("yellow"),
      v.literal("green")
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // 1. Check if already saved
    const existing = await ctx.db
      .query("restaurantSaves")
      .withIndex("by_user_and_restaurant", (q) =>
        q.eq("userId", user._id).eq("restaurantId", args.restaurantId)
      )
      .first();

    if (existing) throw new Error("Already saved");

    // 2. Create save
    const saveId = await ctx.db.insert("restaurantSaves", {
      userId: user._id,
      restaurantId: args.restaurantId,
      boardId: args.boardId,
      personalRating: args.rating,
      trafficLightRating: args.trafficLightRating,
      notes: args.notes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 3. Update restaurant counts (atomic)
    const restaurant = await ctx.db.get(args.restaurantId);
    if (restaurant) {
      const updates: any = {
        totalRatingsCount: restaurant.totalRatingsCount + 1,
      };

      if (args.trafficLightRating === "red") {
        updates.redRatingsCount = restaurant.redRatingsCount + 1;
      } else if (args.trafficLightRating === "yellow") {
        updates.yellowRatingsCount = restaurant.yellowRatingsCount + 1;
      } else if (args.trafficLightRating === "green") {
        updates.greenRatingsCount = restaurant.greenRatingsCount + 1;
      }

      await ctx.db.patch(args.restaurantId, updates);
    }

    // 4. Update user counts
    await ctx.db.patch(user._id, {
      savesCount: user.savesCount + 1,
    });

    // 5. Create notification (call another mutation)
    await ctx.runMutation(api.notifications.create, {
      userId: user._id,
      type: "restaurant_save",
      title: "Restaurant Saved",
      message: `You saved ${restaurant?.name}`,
      relatedId: saveId,
      relatedType: "save",
    });

    return { success: true, saveId };
  },
});
```

### Service-by-Service Migration Guide

**Group 1: Core Services (Week 2)**
- ✅ authService → Clerk SDK + Convex webhooks
- ✅ userService → convex/users.ts
- ✅ profileService → convex/users.ts (merge with userService)
- ✅ accountService → convex/accounts.ts
- ✅ storageService → convex/files.ts

**Group 2: Restaurant Services (Week 2)**
- ✅ restaurantService → convex/restaurants.ts
- ✅ restaurantClaimService → convex/restaurantClaims.ts
- ✅ restaurantImageService → convex/restaurantImages.ts
- ✅ ratingService → convex/ratings.ts (merge into restaurants.ts)

**Group 3: Social Services (Week 3)**
- ✅ followService → convex/follows.ts
- ✅ blockingService → convex/blocking.ts
- ✅ postService → convex/posts.ts
- ✅ postEngagementService → convex/postEngagement.ts
- ✅ saveService → convex/saves.ts
- ✅ shareService → convex/shares.ts
- ✅ socialActivityService → convex/activityFeed.ts

**Group 4: Board & Community Services (Week 3)**
- ✅ boardService → convex/boards.ts
- ✅ communityService → convex/communities.ts
- ✅ communityAdminService → convex/communityAdmin.ts

**Group 5: Creator Marketplace (Week 4)**
- ✅ creatorApplicationService → convex/creatorApplications.ts
- ✅ adminReviewService → convex/adminReview.ts
- ✅ campaignService → convex/campaigns.ts (new)

**Group 6: Supporting Services (Week 4)**
- ✅ notificationService → convex/notifications.ts
- ✅ pushNotificationService → Keep as-is (Expo integration)
- ✅ linkMetadataService → Keep as-is (external API)
- ✅ googlePlacesService → Keep as-is (Google API)
- ✅ achievementService → convex/achievements.ts
- ✅ imageUploadService → convex/files.ts

---

## Migration Phases

### Phase 0: Preparation (Week 0)

**Tasks**:
- [ ] Set up Convex project
- [ ] Set up Clerk project
- [ ] Configure development environment
- [ ] Create migration scripts repository
- [ ] Set up staging environment
- [ ] Document all Supabase RLS policies
- [ ] Export complete database schema
- [ ] Create data export scripts

**Deliverables**:
- Convex project initialized
- Clerk application configured
- Migration scripts ready
- Data backup completed

### Phase 1: Parallel Development (Weeks 1-2)

**Goal**: Build Convex backend while keeping Supabase running

**Tasks**:
- [ ] Implement Convex schema (all tables)
- [ ] Implement core Convex functions (users, auth)
- [ ] Set up Clerk webhooks
- [ ] Implement authentication flow
- [ ] Build Convex file storage system
- [ ] Create data migration scripts
- [ ] Set up dual-write system (write to both DBs)

**Testing**:
- Unit tests for all Convex functions
- Integration tests for auth flow
- Load testing for queries

### Phase 2: Data Migration (Week 3)

**Goal**: Migrate all data from Supabase → Convex

**Migration Order**:
1. Users (with Clerk account creation)
2. Restaurants
3. Boards
4. Posts
5. Saves
6. Communities
7. Relationships (follows, blocks)
8. Creator data
9. Notifications
10. Analytics data

**Process**:
```typescript
// Migration script structure
const migrateTable = async (tableName: string) => {
  console.log(`Starting migration: ${tableName}`);

  // 1. Export from Supabase
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(offset, offset + batchSize - 1)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) break;

    // 2. Transform data
    const transformedData = data.map(transformRow);

    // 3. Import to Convex
    for (const row of transformedData) {
      await convex.mutation(api.migrations.import, {
        table: tableName,
        data: row,
      });
    }

    console.log(`Migrated ${offset + data.length} rows`);
    offset += batchSize;
  }

  console.log(`Completed migration: ${tableName}`);
};
```

**Validation**:
- Row count verification (Supabase vs Convex)
- Data integrity checks
- Relationship validation
- File URL validation

### Phase 3: Frontend Migration (Week 4)

**Goal**: Update React Native app to use Convex + Clerk

**Tasks**:
- [ ] Install Convex & Clerk packages
- [ ] Update app/_layout.tsx with providers
- [ ] Migrate auth screens to Clerk
- [ ] Replace service calls with Convex hooks
- [ ] Update all components (page by page)
- [ ] Implement loading states
- [ ] Handle errors gracefully

**Migration Priority**:
1. Auth screens (login, signup, verify)
2. Profile screens
3. Home/Feed screens
4. Restaurant screens
5. Board screens
6. Community screens
7. Creator marketplace screens

**Pattern**:
```typescript
// Before: Service + useState
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  userService.getProfile(userId)
    .then(setData)
    .finally(() => setLoading(false));
}, [userId]);

// After: Convex useQuery
const data = useQuery(api.users.getProfile, { userId });
const loading = data === undefined;
```

### Phase 4: Testing & Validation (Week 5)

**Tasks**:
- [ ] End-to-end testing (all user flows)
- [ ] Performance testing (load, stress tests)
- [ ] Security audit (auth, permissions)
- [ ] Data consistency validation
- [ ] Mobile app testing (iOS + Android)
- [ ] User acceptance testing (beta group)

**Test Coverage**:
- Authentication flows ✓
- CRUD operations ✓
- Real-time updates ✓
- File uploads ✓
- Social features ✓
- Search & discovery ✓
- Creator marketplace ✓
- Notifications ✓

### Phase 5: Soft Launch (Week 6)

**Tasks**:
- [ ] Deploy to production (Convex + Clerk)
- [ ] Enable feature flags for gradual rollout
- [ ] Monitor error rates & performance
- [ ] Provide fallback to Supabase (if critical issues)
- [ ] Gather user feedback
- [ ] Fix critical bugs

**Monitoring**:
- Convex dashboard metrics
- Clerk analytics
- Sentry error tracking
- User feedback channels

### Phase 6: Cleanup (Week 7+)

**Tasks**:
- [ ] Decommission Supabase (after 30 days)
- [ ] Remove old service files
- [ ] Archive migration scripts
- [ ] Update documentation
- [ ] Close out migration project

---

## Testing Strategy

### Unit Tests

**Convex Functions**:
```typescript
// convex/users.test.ts (using Convex testing library)
import { test, expect } from "convex-test";
import { api } from "./_generated/api";

test("getProfile returns user data", async ({ run, db }) => {
  // Create test user
  const userId = await db.insert("users", {
    clerkId: "test_user",
    username: "testuser",
    name: "Test User",
    createdAt: Date.now(),
  });

  // Call function
  const profile = await run(api.users.getProfile, { userId });

  // Assert
  expect(profile).toMatchObject({
    username: "testuser",
    name: "Test User",
  });
});
```

### Integration Tests

**Auth Flow**:
```typescript
// Test Clerk → Convex sync
test("Clerk user creation syncs to Convex", async () => {
  // 1. Create Clerk user
  const clerkUser = await clerkClient.users.createUser({
    emailAddress: ["test@example.com"],
    username: "testuser",
  });

  // 2. Wait for webhook to process
  await waitFor(() => {
    const convexUser = await convex.query(api.users.getByClerkId, {
      clerkId: clerkUser.id,
    });
    return convexUser !== null;
  });

  // 3. Verify user exists in Convex
  const convexUser = await convex.query(api.users.getByClerkId, {
    clerkId: clerkUser.id,
  });

  expect(convexUser).toBeDefined();
  expect(convexUser.username).toBe("testuser");
});
```

### End-to-End Tests

**User Journey**:
```typescript
// e2e/flows/restaurant-save.test.ts
import { test, expect } from "@maestro/test";

test("User can save a restaurant", async () => {
  // 1. Sign in
  await maestro.signIn("test@example.com");

  // 2. Navigate to restaurant
  await maestro.tap({ text: "Restaurants" });
  await maestro.tap({ text: "Test Restaurant" });

  // 3. Save restaurant
  await maestro.tap({ id: "save-button" });
  await maestro.tap({ text: "Quick Saves" });

  // 4. Verify saved
  await maestro.assertVisible({ text: "Saved successfully" });
  await maestro.navigate("Profile");
  await maestro.tap({ text: "Quick Saves" });
  await maestro.assertVisible({ text: "Test Restaurant" });
});
```

### Performance Tests

**Load Testing**:
```typescript
// Load test: 1000 concurrent queries
import { loadTest } from "./test-utils";

test("Handle 1000 concurrent profile queries", async () => {
  const results = await loadTest({
    concurrency: 1000,
    duration: 60, // seconds
    fn: async () => {
      return await convex.query(api.users.getProfile, {
        userId: randomUserId(),
      });
    },
  });

  expect(results.successRate).toBeGreaterThan(0.99); // 99% success
  expect(results.p95Latency).toBeLessThan(500); // <500ms p95
});
```

---

## Rollback Plan

### Trigger Criteria

Rollback to Supabase if:
- Data loss detected (>0.1%)
- Auth failure rate >5%
- Query performance degradation >50%
- Critical feature broken
- User churn spike >10%

### Rollback Procedure

**Step 1: Immediate Actions (< 30 minutes)**
```bash
# 1. Revert to previous app version
expo publish --release-channel=rollback

# 2. Redirect API calls to Supabase
# (via feature flag or environment variable)
BACKEND_PROVIDER=supabase

# 3. Pause Convex webhook processing
# (via Convex dashboard)

# 4. Communicate to users
# (via in-app banner + email)
```

**Step 2: Data Sync (1-2 hours)**
```typescript
// Sync any new data from Convex → Supabase
const syncNewData = async () => {
  const cutoffTime = MIGRATION_START_TIME;

  // Sync new users
  const newUsers = await convex.query(api.users.listSince, {
    timestamp: cutoffTime,
  });
  for (const user of newUsers) {
    await supabase.from('users').insert(transformToSupabase(user));
  }

  // Sync new posts
  // Sync new saves
  // etc.
};
```

**Step 3: Validation (1 hour)**
- Verify all users can sign in
- Verify data integrity
- Verify critical features work
- Monitor error rates

**Step 4: Post-Mortem (within 48 hours)**
- Document root cause
- Identify fixes needed
- Plan re-migration timeline

---

## Timeline & Resources

### Migration Timeline

```
Week 0: Preparation
├─ Convex setup
├─ Clerk setup
└─ Export Supabase data

Week 1-2: Parallel Development
├─ Build Convex schema
├─ Implement core functions
├─ Set up Clerk auth
└─ Create migration scripts

Week 3: Data Migration
├─ Migrate users (with Clerk)
├─ Migrate content
└─ Validate data integrity

Week 4: Frontend Migration
├─ Update auth screens
├─ Migrate screens (page by page)
└─ Test all features

Week 5: Testing & Validation
├─ End-to-end testing
├─ Performance testing
└─ Security audit

Week 6: Soft Launch
├─ Deploy to production
├─ Monitor metrics
└─ Gather feedback

Week 7+: Cleanup
├─ Decommission Supabase
└─ Documentation

TOTAL: 6-7 weeks
```

### Resource Requirements

**Team**:
- 1 Backend Engineer (Convex expert)
- 1 Frontend Engineer (React Native expert)
- 1 DevOps Engineer (deployment, monitoring)
- 1 QA Engineer (testing)
- 1 Project Manager (coordination)

**Time Allocation**:
- Backend: 160 hours (4 weeks × 40 hrs)
- Frontend: 160 hours (4 weeks × 40 hrs)
- Testing: 80 hours (2 weeks × 40 hrs)
- DevOps: 40 hours (1 week × 40 hrs)
- PM: 40 hours (overhead)

**Total**: ~480 engineering hours

### Budget

```
Labor:
- Engineers: 480 hrs × $100/hr = $48,000

Infrastructure:
- Convex Pro: $25/month (during migration)
- Clerk Pro: $25/month (during migration)
- Staging environment: $50/month
Total: $100/month × 2 months = $200

Contingency (20%): $9,640

TOTAL: ~$58,000
```

---

## Risk Management

### Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data loss during migration | Low | Critical | Backup all data, validation scripts |
| Auth migration breaks existing users | Medium | High | Keep Supabase auth active during transition |
| Performance regression | Low | High | Load testing, query optimization |
| Feature parity gaps | Medium | Medium | Feature audit, comprehensive testing |
| File migration issues | Medium | Medium | Keep Supabase Storage during transition |
| Real-time updates broken | Low | High | Thorough testing of subscriptions |
| Mobile app crashes | Low | Critical | Extensive device testing, error tracking |
| Timeline overrun | High | Medium | Buffer time, phased rollout |

---

## Success Criteria

### Technical Metrics

- ✅ **Zero data loss** (100% data migrated)
- ✅ **Feature parity** (all features working)
- ✅ **Performance** (queries <500ms p95)
- ✅ **Real-time** (updates <1s latency)
- ✅ **Uptime** (99.9%+ during migration)

### Business Metrics

- ✅ **User retention** (>99% retained)
- ✅ **Auth success** (>99% sign-in success)
- ✅ **Error rate** (<0.1% error rate)
- ✅ **Support tickets** (<10% increase)

### User Experience

- ✅ **No downtime** (zero service interruption)
- ✅ **Transparent** (users don't notice backend change)
- ✅ **Faster** (improved performance perceived)
- ✅ **Reliable** (fewer bugs, better UX)

---

## Appendix

### A. Convex Resources

- [Convex Documentation](https://docs.convex.dev)
- [Convex with Clerk](https://docs.convex.dev/auth/clerk)
- [Convex File Storage](https://docs.convex.dev/file-storage)
- [Convex Migrations](https://docs.convex.dev/database/migrations)

### B. Clerk Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk React Native](https://clerk.com/docs/quickstarts/expo)
- [Clerk Webhooks](https://clerk.com/docs/integrations/webhooks)

### C. Migration Scripts

Location: `/scripts/migration/`

```
scripts/migration/
├── 01-export-supabase.ts
├── 02-create-clerk-users.ts
├── 03-import-to-convex.ts
├── 04-validate-data.ts
├── 05-sync-files.ts
└── utils/
    ├── transform.ts
    ├── validate.ts
    └── progress.ts
```

### D. Contact & Support

- **Project Manager**: [Name]
- **Tech Lead**: [Name]
- **Convex Support**: support@convex.dev
- **Clerk Support**: support@clerk.com

---

**Document Version**: 1.0
**Last Updated**: January 2025
**Status**: Ready for Review
**Next Review**: [Date after team review]
