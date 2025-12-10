# Task CM-14: Improve Creator Profile UI (Business View)

**Priority:** 🟠 P1 - High
**Severity:** Medium
**Feature:** CM-8 (Creator Profile - Business View)
**Estimated Effort:** 6-8 hours
**Status:** Not Started
**Related Audit:** `.tasks/creator-marketplace-audit-findings.md` - Section 3

---

## Problem Statement

The creator profile screen (when viewed by businesses) looks sparse and incomplete. The current UI issues:

1. **Missing Data Display:**
   - No estimated rate information
   - No completed campaigns count
   - No star rating for past performance
   - No portfolio images (only sample posts)

2. **UI Looks "Wonky and Blank":**
   - Empty states not handled (no bio shows nothing)
   - No skeleton loading state
   - Metrics section sparse with only 2 items
   - No CTA button for businesses

3. **Database Fields Not Displayed:**
   - `availability_status` - not shown
   - Platform follower breakdown - not shown
   - Username (@handle) - not shown

---

## Current State

**File:** `app/creator/[id]/index.tsx`

**Current Layout:**
```
┌─────────────────────────────┐
│ [Back]  Creator Profile     │
├─────────────────────────────┤
│         [Avatar]            │
│       Display Name          │
│       📍 Location           │
│    [Open to Collabs]        │
│                             │
│  👥 10K      📈 4.5%        │
│  Followers   Engagement     │
├─────────────────────────────┤
│ About                       │
│ Bio text...                 │
├─────────────────────────────┤
│ Specialties                 │
│ [Tag] [Tag] [Tag]           │
├─────────────────────────────┤
│ Sample Posts                │
│ [img] [img] [img]           │
└─────────────────────────────┘
```

---

## Proposed Layout

```
┌─────────────────────────────┐
│ [Back]  Creator Profile [✏️]│ (edit icon if own profile)
├─────────────────────────────┤
│         [Avatar]            │
│       Display Name          │
│       @username             │ ← ADD
│       📍 Location           │
│                             │
│  [Available] or [Busy]      │ ← ADD availability badge
│  [Open to Collabs]          │
├─────────────────────────────┤
│  Stats Row (4 items)        │
│ ┌─────┬─────┬─────┬─────┐   │
│ │ 10K │ 4.5%│  5  │ 4.8 │   │
│ │Fllwr│Engmt│Camps│ ⭐  │   │ ← ADD campaigns + rating
│ └─────┴─────┴─────┴─────┘   │
├─────────────────────────────┤
│ Estimated Rate              │ ← ADD
│ $200 - $500 per post        │
├─────────────────────────────┤
│ About                       │
│ Bio text or placeholder     │ ← ADD empty state
├─────────────────────────────┤
│ Specialties                 │
│ [Tag] [Tag] [Tag]           │
│ or "No specialties set"     │ ← ADD empty state
├─────────────────────────────┤
│ Portfolio                   │ ← ADD if portfolio items
│ [img] [img] [img]           │
├─────────────────────────────┤
│ Sample Posts                │
│ [img] [img] [img]           │
│ or "No posts yet"           │ ← ADD empty state
├─────────────────────────────┤
│ [Invite to Campaign]        │ ← ADD CTA (future feature)
└─────────────────────────────┘
```

---

## Technical Requirements

### 1. Update Data Fetching

**File:** `services/creatorDiscoveryService.ts`

Update `getCreatorProfile()` to fetch additional data:

```typescript
export async function getCreatorProfile(creatorId: string): Promise<{
  data: CreatorProfile | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('creator_profiles')
    .select(`
      id,
      user_id,
      display_name,
      bio,
      location,
      specialties,
      open_to_collabs,
      availability_status,
      total_followers,
      troodie_engagement_rate,
      instagram_followers,
      tiktok_followers,
      youtube_followers,
      users!inner (
        username,
        avatar_url
      )
    `)
    .eq('id', creatorId)
    .single();

  if (error) return { data: null, error: error.message };

  // Fetch completed campaigns count and rating
  const { data: campaignStats } = await supabase
    .from('campaign_applications')
    .select('id, status, rating')
    .eq('creator_id', creatorId)
    .eq('status', 'completed');

  const completedCampaigns = campaignStats?.length || 0;
  const avgRating = campaignStats?.length
    ? campaignStats.reduce((sum, c) => sum + (c.rating || 0), 0) / campaignStats.length
    : null;

  // Fetch portfolio items
  const { data: portfolioItems } = await supabase
    .from('creator_portfolio_items')
    .select('id, media_url, media_type')
    .eq('creator_id', creatorId)
    .order('display_order')
    .limit(6);

  return {
    data: {
      ...data,
      username: data.users?.username,
      avatarUrl: data.users?.avatar_url,
      completedCampaigns,
      avgRating,
      portfolioItems: portfolioItems || [],
    },
    error: null,
  };
}
```

### 2. Update CreatorProfile Interface

```typescript
export interface CreatorProfile {
  id: string;
  userId: string;
  displayName: string;
  username?: string;              // ADD
  bio?: string;
  location?: string;
  specialties?: string[];
  openToCollabs: boolean;
  availabilityStatus?: string;    // ADD
  totalFollowers: number;
  engagementRate: number;
  avatarUrl?: string;
  completedCampaigns?: number;    // ADD
  avgRating?: number;             // ADD
  portfolioItems?: PortfolioItem[]; // ADD
  samplePosts?: SamplePost[];
}

interface PortfolioItem {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
}
```

### 3. Update Profile Screen UI

**File:** `app/creator/[id]/index.tsx`

#### A. Add Username

```tsx
<Text style={styles.displayName}>{profile.displayName}</Text>
{profile.username && (
  <Text style={styles.username}>@{profile.username}</Text>
)}
```

#### B. Add Availability Badge

```tsx
{profile.availabilityStatus === 'busy' && (
  <View style={styles.busyBadge}>
    <Clock size={12} color="#92400E" />
    <Text style={styles.busyBadgeText}>Currently Busy</Text>
  </View>
)}
{profile.availabilityStatus === 'not_accepting' && (
  <View style={styles.unavailableBadge}>
    <XCircle size={12} color="#DC2626" />
    <Text style={styles.unavailableBadgeText}>Not Accepting Work</Text>
  </View>
)}
```

#### C. Update Stats Row (4 Items)

```tsx
<View style={styles.statsRow}>
  <View style={styles.statItem}>
    <Users size={20} color={DS.colors.primary} />
    <Text style={styles.statValue}>{formatFollowers(profile.totalFollowers)}</Text>
    <Text style={styles.statLabel}>Followers</Text>
  </View>
  <View style={styles.statItem}>
    <TrendingUp size={20} color={DS.colors.primary} />
    <Text style={styles.statValue}>{profile.engagementRate.toFixed(1)}%</Text>
    <Text style={styles.statLabel}>Engagement</Text>
  </View>
  <View style={styles.statItem}>
    <Briefcase size={20} color={DS.colors.primary} />
    <Text style={styles.statValue}>{profile.completedCampaigns || 0}</Text>
    <Text style={styles.statLabel}>Campaigns</Text>
  </View>
  <View style={styles.statItem}>
    <Star size={20} color={DS.colors.primary} />
    <Text style={styles.statValue}>
      {profile.avgRating ? profile.avgRating.toFixed(1) : '—'}
    </Text>
    <Text style={styles.statLabel}>Rating</Text>
  </View>
</View>
```

#### D. Add Estimated Rate Card

```tsx
<View style={styles.rateCard}>
  <Text style={styles.rateTitle}>Estimated Rate</Text>
  <Text style={styles.rateValue}>{getEstimatedRate(profile.totalFollowers)}</Text>
  <Text style={styles.rateHint}>Based on follower count</Text>
</View>
```

```typescript
function getEstimatedRate(followers: number): string {
  if (followers < 5000) return '$50 - $200';
  if (followers < 10000) return '$200 - $500';
  if (followers < 50000) return '$500 - $1,000';
  return '$1,000+';
}
```

#### E. Add Empty States

```tsx
{/* About Section */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>About</Text>
  {profile.bio ? (
    <Text style={styles.bioText}>{profile.bio}</Text>
  ) : (
    <Text style={styles.emptyText}>No bio provided</Text>
  )}
</View>

{/* Specialties Section */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Specialties</Text>
  {profile.specialties && profile.specialties.length > 0 ? (
    <View style={styles.tagsContainer}>
      {profile.specialties.map((s, i) => (
        <View key={i} style={styles.tag}>
          <Text style={styles.tagText}>{s}</Text>
        </View>
      ))}
    </View>
  ) : (
    <Text style={styles.emptyText}>No specialties set</Text>
  )}
</View>
```

#### F. Add Portfolio Section

```tsx
{/* Portfolio Section */}
{profile.portfolioItems && profile.portfolioItems.length > 0 && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Portfolio</Text>
    <View style={styles.mediaGrid}>
      {profile.portfolioItems.map((item) => (
        <TouchableOpacity key={item.id} style={styles.mediaItem}>
          <Image source={{ uri: item.mediaUrl }} style={styles.mediaImage} />
          {item.mediaType === 'video' && (
            <View style={styles.videoIndicator}>
              <Play size={16} color="white" />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  </View>
)}
```

#### G. Add CTA Button (Placeholder for Future)

```tsx
{/* CTA Button - Future: Invite to Campaign */}
{!isOwnProfile && (
  <View style={styles.ctaContainer}>
    <TouchableOpacity
      style={styles.ctaButton}
      onPress={() => {
        // Future: Open invite modal
        Alert.alert('Coming Soon', 'Invite to Campaign feature coming soon!');
      }}
    >
      <Text style={styles.ctaButtonText}>Invite to Campaign</Text>
    </TouchableOpacity>
  </View>
)}
```

### 4. Add New Styles

```typescript
const styles = StyleSheet.create({
  // ... existing styles ...

  username: {
    fontSize: 14,
    color: DS.colors.textLight,
    marginTop: 4,
  },
  busyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginTop: 8,
  },
  busyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  unavailableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginTop: 8,
  },
  unavailableBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: DS.colors.backgroundWhite,
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: DS.colors.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: DS.colors.textLight,
    marginTop: 2,
  },
  rateCard: {
    backgroundColor: '#F0FDF4', // green-50
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0', // green-200
  },
  rateTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534', // green-800
    marginBottom: 4,
  },
  rateValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#15803D', // green-700
  },
  rateHint: {
    fontSize: 11,
    color: '#166534',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: DS.colors.textLight,
    fontStyle: 'italic',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaItem: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  ctaContainer: {
    padding: 16,
    backgroundColor: DS.colors.backgroundWhite,
    borderTopWidth: 1,
    borderTopColor: DS.colors.border,
  },
  ctaButton: {
    backgroundColor: DS.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

---

## Testing Requirements

### Visual Tests

1. Profile with all data populated looks complete
2. Profile with missing bio shows placeholder
3. Profile with no specialties shows placeholder
4. Profile with no posts shows empty state
5. Stats row displays 4 items evenly
6. Rate card displays correctly
7. Availability badges show correct colors

### Integration Tests

1. Profile loads correctly for valid creator ID
2. Profile shows 404 for invalid ID
3. Edit button shows only for own profile
4. CTA button shows for business users

### Edge Cases

1. Creator with 0 followers
2. Creator with no completed campaigns
3. Creator with no rating
4. Creator with very long bio (truncation)
5. Creator with many specialties (wrapping)

---

## Acceptance Criteria

- [ ] Username (@handle) displayed below display name
- [ ] Availability badge shown when busy/not_accepting
- [ ] Stats row shows 4 items (followers, engagement, campaigns, rating)
- [ ] Estimated rate card displayed
- [ ] Empty states for bio, specialties, posts
- [ ] Portfolio section shows if items exist
- [ ] CTA button (placeholder) for businesses
- [ ] Loading state shows skeleton
- [ ] All data fetched correctly
- [ ] Styling consistent with design system

---

## Related Files

- `app/creator/[id]/index.tsx` - Profile view screen
- `services/creatorDiscoveryService.ts` - Data fetching
- `components/design-system/tokens.ts` - Design tokens

---

## Notes

- This is a UI/UX improvement task
- Depends on CM-11 (availability status) being implemented
- CTA button is placeholder for future invitation feature
- Rating may show "—" until rating system is implemented (CM-9 Issue #9)
