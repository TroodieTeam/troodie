# Task CM-11: Implement Creator Availability Status

**Priority:** 🟠 P1 - High
**Severity:** Medium
**Feature:** CM-6 (Creator Profile Edit), CM-8 (Creator Profile View), CM-9 (Browse Creators)
**Estimated Effort:** 4-6 hours
**Status:** Not Started
**Related Audit:** `.tasks/creator-marketplace-audit-findings.md` - Section 5.2

---

## Problem Statement

The `availability_status` column exists in `creator_profiles` but is not implemented in the UI. This field is HIGH VALUE for both creators and businesses:

**For Creators:**
- Prevents unwanted inquiries when overwhelmed with work
- Professional way to manage workload without declining individual offers
- Creates sense of scarcity - "Open to Collabs" badge becomes meaningful
- Can temporarily pause without losing profile visibility

**For Businesses:**
- Immediately filters out creators who can't take new work
- Saves time - no outreach to busy creators who will decline
- Higher conversion - only contacting available creators
- Respects creator boundaries, building trust

---

## Current State

**Database:** Column exists with CHECK constraint
```sql
availability_status VARCHAR(20) DEFAULT 'available'
  CHECK (availability_status IN ('available', 'busy', 'not_accepting'))
```

**UI:** Not implemented anywhere

---

## Technical Requirements

### 1. Update CM-6: Creator Profile Edit

**File:** `app/creator/profile/edit.tsx`

Add availability status selector below "Open to Collaborations" toggle:

```tsx
// Availability Status Section
<View style={styles.sectionContainer}>
  <Text style={styles.sectionTitle}>Availability</Text>
  <Text style={styles.sectionDescription}>
    Let restaurants know if you're available for new campaigns
  </Text>

  <View style={styles.radioGroup}>
    <TouchableOpacity
      style={[styles.radioOption, availabilityStatus === 'available' && styles.radioSelected]}
      onPress={() => setAvailabilityStatus('available')}
    >
      <View style={[styles.radioCircle, availabilityStatus === 'available' && styles.radioCircleFilled]} />
      <View>
        <Text style={styles.radioLabel}>Available</Text>
        <Text style={styles.radioHint}>Actively looking for campaigns</Text>
      </View>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.radioOption, availabilityStatus === 'busy' && styles.radioSelected]}
      onPress={() => setAvailabilityStatus('busy')}
    >
      <View style={[styles.radioCircle, availabilityStatus === 'busy' && styles.radioCircleFilled]} />
      <View>
        <Text style={styles.radioLabel}>Busy</Text>
        <Text style={styles.radioHint}>Visible but may not respond quickly</Text>
      </View>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.radioOption, availabilityStatus === 'not_accepting' && styles.radioSelected]}
      onPress={() => setAvailabilityStatus('not_accepting')}
    >
      <View style={[styles.radioCircle, availabilityStatus === 'not_accepting' && styles.radioCircleFilled]} />
      <View>
        <Text style={styles.radioLabel}>Not Accepting</Text>
        <Text style={styles.radioHint}>Hidden from browse, won't receive invites</Text>
      </View>
    </TouchableOpacity>
  </View>
</View>
```

### 2. Update CM-8: Creator Profile View (Business)

**File:** `app/creator/[id]/index.tsx`

Display availability badge in profile header:

```tsx
// After "Open to Collabs" badge
{profile.availabilityStatus === 'busy' && (
  <View style={styles.busyBadge}>
    <Clock size={12} color="#92400E" />
    <Text style={styles.busyBadgeText}>Currently Busy</Text>
  </View>
)}

{profile.availabilityStatus === 'not_accepting' && (
  <View style={styles.unavailableBadge}>
    <X size={12} color="#DC2626" />
    <Text style={styles.unavailableBadgeText}>Not Accepting Work</Text>
  </View>
)}
```

### 3. Update CM-9: Browse Creators

**File:** `app/(tabs)/business/creators/browse.tsx`

#### A. Filter creators by availability in query

Update `get_creators()` function call or add client-side filter:

```tsx
// Option 1: Update database function (preferred)
// In get_creators(), add:
AND (cp.availability_status = 'available' OR cp.availability_status = 'busy')

// Option 2: Client-side filter
const visibleCreators = creators.filter(
  c => c.availability_status !== 'not_accepting'
);
```

#### B. Show availability badge on creator cards

```tsx
// In CreatorCard component
{creator.availability_status === 'busy' && (
  <View style={styles.busyIndicator}>
    <Text style={styles.busyText}>Busy</Text>
  </View>
)}
```

### 4. Update Service Layer

**File:** `services/creatorDiscoveryService.ts`

Add to `updateCreatorProfile()`:

```typescript
interface UpdateCreatorProfileParams {
  displayName?: string;
  bio?: string;
  location?: string;
  specialties?: string[];
  openToCollabs?: boolean;
  availabilityStatus?: 'available' | 'busy' | 'not_accepting'; // ADD THIS
}

export async function updateCreatorProfile(
  creatorId: string,
  params: UpdateCreatorProfileParams
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase
    .from('creator_profiles')
    .update({
      display_name: params.displayName,
      bio: params.bio,
      location: params.location,
      specialties: params.specialties,
      open_to_collabs: params.openToCollabs,
      availability_status: params.availabilityStatus, // ADD THIS
      updated_at: new Date().toISOString(),
    })
    .eq('id', creatorId);

  // ... rest of function
}
```

### 5. Update Hook

**File:** `hooks/useCreatorProfileId.ts`

Add `availability_status` to `useCreatorProfile()` query:

```typescript
const { data, error: profileError } = await supabase
  .from('creator_profiles')
  .select(`
    id,
    user_id,
    display_name,
    bio,
    location,
    food_specialties,
    verification_status,
    portfolio_uploaded,
    followers_count,
    content_count,
    availability_status  // ADD THIS
  `)
  .eq('user_id', user.id)
  .single();
```

---

## UI/UX Design

### Badge Styles

```tsx
// Available (default) - no badge needed, shows "Open to Collabs"

// Busy - amber/yellow
const busyBadge = {
  backgroundColor: '#FEF3C7', // amber-100
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
};
const busyBadgeText = {
  color: '#92400E', // amber-800
  fontSize: 11,
  fontWeight: '600',
};

// Not Accepting - red (shouldn't appear in browse, only direct profile view)
const unavailableBadge = {
  backgroundColor: '#FEE2E2', // red-100
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
};
const unavailableBadgeText = {
  color: '#DC2626', // red-600
  fontSize: 11,
  fontWeight: '600',
};
```

### Radio Button Styles

```tsx
const radioGroup = {
  marginTop: 12,
  gap: 12,
};

const radioOption = {
  flexDirection: 'row',
  alignItems: 'flex-start',
  padding: 12,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#E5E7EB', // gray-200
  backgroundColor: '#FFFFFF',
  gap: 12,
};

const radioSelected = {
  borderColor: '#F59E0B', // amber-500 (primary)
  backgroundColor: '#FFFBEB', // amber-50
};

const radioCircle = {
  width: 20,
  height: 20,
  borderRadius: 10,
  borderWidth: 2,
  borderColor: '#D1D5DB', // gray-300
  marginTop: 2,
};

const radioCircleFilled = {
  borderColor: '#F59E0B',
  backgroundColor: '#F59E0B',
};
```

---

## Logic Flow

### When creator sets "Not Accepting":
1. Profile hidden from browse results (`get_creators()` excludes them)
2. Direct profile link still works (in case shared before)
3. Shows "Not Accepting Work" badge on profile
4. "Invite to Campaign" button disabled (future feature)

### When creator sets "Busy":
1. Still appears in browse results
2. Shows "Busy" indicator badge
3. Businesses can still view profile and contact
4. Sets expectation that response may be slow

### When creator sets "Available":
1. Default behavior, appears in browse
2. No extra badge (already shows "Open to Collabs")
3. Signals they're actively looking

---

## Testing Requirements

### Unit Tests

1. Profile edit saves availability status correctly
2. Profile view displays correct badge
3. Browse creators filters out `not_accepting`
4. Browse creators shows `busy` badge

### Integration Tests

1. Creator can change availability from Available → Busy → Not Accepting
2. Business browsing only sees Available and Busy creators
3. Direct profile link works even for Not Accepting creators

### Edge Cases

1. New creator defaults to `available`
2. NULL value treated as `available`
3. Invalid value rejected by CHECK constraint

---

## Acceptance Criteria

- [ ] Availability selector added to CM-6 (profile edit)
- [ ] Availability badge displayed in CM-8 (profile view)
- [ ] Browse Creators filters out `not_accepting` creators
- [ ] Browse Creators shows `Busy` badge for busy creators
- [ ] Service layer updated to save availability status
- [ ] Hook updated to fetch availability status
- [ ] Default value is `available` for new creators
- [ ] UI matches design system (amber for busy, red for not accepting)
- [ ] All tests pass

---

## Related Files

- `app/creator/profile/edit.tsx` - Profile edit screen
- `app/creator/[id]/index.tsx` - Profile view screen
- `app/(tabs)/business/creators/browse.tsx` - Browse creators
- `services/creatorDiscoveryService.ts` - Service layer
- `hooks/useCreatorProfileId.ts` - Profile hook
- `supabase/migrations/20250122_creator_profiles_discovery.sql` - Schema

---

## Notes

- High value feature with low implementation effort
- Database column already exists, just needs UI
- Should be implemented before campaign invitation system
- Helps set creator expectations and reduces friction
