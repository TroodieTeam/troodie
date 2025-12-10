# Task CM-13: Display Campaign Deliverables to Creators (Bug Fix)

**Priority:** 🔴 P0 - Critical
**Severity:** High
**Feature:** Creator Campaign Discovery
**Estimated Effort:** 2-3 hours
**Status:** Not Started
**Related Audit:** `.tasks/creator-marketplace-audit-findings.md` - Section 6a

---

## Problem Statement

**Critical Bug:** When creators view a campaign or apply to it, they cannot see what deliverables are expected. The `deliverables[]` data IS collected from restaurants and stored in the database, but it is NOT displayed to creators.

### What Creators Currently See:
- ✅ Campaign title
- ✅ Description
- ✅ Budget/Payout
- ✅ Deadline
- ✅ Requirements (if any)
- ❌ **Deliverables - NOT SHOWN**

### The Problem:
Creators are applying to campaigns **blind** without knowing exactly what content the restaurant expects. They select "proposed deliverables" when applying, but don't know if that matches what the restaurant actually wants.

This creates a mismatch between creator expectations and restaurant expectations, leading to:
- Rejected applications
- Confusion and frustration
- Wasted time for both parties

---

## Current Data Flow

```
1. Restaurant creates campaign:
   - Adds deliverables: [{ type: "Instagram Reel", description: "...", quantity: 1 }]
   - Stored in: campaigns.deliverable_requirements JSONB

2. Creator browses campaigns:
   - Sees: title, description, budget, deadline, requirements
   - Does NOT see: deliverables ← BUG

3. Creator applies:
   - Selects proposed_deliverables (guessing what restaurant wants)
   - Restaurant may reject if mismatch
```

---

## Technical Requirements

### File: `app/creator/explore-campaigns.tsx`

### 1. Add Deliverable Type

```typescript
interface Deliverable {
  id: string;
  type: string;
  description: string;
  quantity: number;
}

interface Campaign {
  // ... existing fields ...
  deliverable_requirements?: {
    deliverables?: Deliverable[];
    // other fields we're removing
  };
}
```

### 2. Update Campaign Query

Ensure `deliverable_requirements` is being fetched:

```typescript
const { data, error } = await supabase
  .from('campaigns')
  .select(`
    *,
    restaurant:restaurants(
      id,
      name,
      cuisine_types,
      address,
      city,
      state,
      cover_photo_url
    ),
    applications:campaign_applications(
      id,
      status,
      creator_id
    )
  `)
  .eq('status', 'active')
  .gte('end_date', new Date().toISOString())
  .order('created_at', { ascending: false });
```

The `*` should already include `deliverable_requirements`. Verify this is working.

### 3. Add Deliverables Section to Campaign Detail Modal

In the `showCampaignModal` modal content, add after requirements section:

```tsx
{/* Expected Deliverables Section */}
{selectedCampaign.deliverable_requirements?.deliverables &&
 selectedCampaign.deliverable_requirements.deliverables.length > 0 && (
  <View style={styles.modalSection}>
    <Text style={styles.modalSectionTitle}>Expected Deliverables</Text>
    {selectedCampaign.deliverable_requirements.deliverables.map((deliverable, index) => (
      <View key={index} style={styles.deliverableItem}>
        <View style={styles.deliverableHeader}>
          <Text style={styles.deliverableType}>
            {deliverable.quantity > 1 ? `${deliverable.quantity}× ` : ''}
            {deliverable.type}
          </Text>
        </View>
        {deliverable.description && (
          <Text style={styles.deliverableDescription}>
            {deliverable.description}
          </Text>
        )}
      </View>
    ))}
  </View>
)}
```

### 4. Add Styles for Deliverables

```typescript
// Add to StyleSheet.create({})
deliverableItem: {
  backgroundColor: '#F9FAFB', // gray-50
  padding: 12,
  borderRadius: 8,
  marginBottom: 8,
},
deliverableHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},
deliverableType: {
  fontSize: 14,
  fontWeight: '600',
  color: '#262626',
},
deliverableDescription: {
  fontSize: 13,
  color: '#666',
  marginTop: 4,
  lineHeight: 18,
},
```

### 5. Also Show in Campaign Card (Preview)

In `renderCampaignCard()`, add deliverable count indicator:

```tsx
<View style={styles.campaignStats}>
  <View style={styles.statItem}>
    <DollarSign size={14} color="#10B981" />
    <Text style={styles.statText}>${...}</Text>
  </View>
  <View style={styles.statItem}>
    <Clock size={14} color="#F59E0B" />
    <Text style={styles.statText}>{daysLeft}d left</Text>
  </View>
  <View style={styles.statItem}>
    <Users size={14} color="#8B5CF6" />
    <Text style={styles.statText}>{spotsLeft} spots</Text>
  </View>
  {/* Add deliverable count */}
  {campaign.deliverable_requirements?.deliverables && (
    <View style={styles.statItem}>
      <Target size={14} color="#EC4899" />
      <Text style={styles.statText}>
        {campaign.deliverable_requirements.deliverables.length} deliverable{campaign.deliverable_requirements.deliverables.length !== 1 ? 's' : ''}
      </Text>
    </View>
  )}
</View>
```

---

## Expected Result

### Campaign Card Preview:
```
┌─────────────────────────────────────┐
│ [Restaurant Image]                   │
├─────────────────────────────────────┤
│ 🏪 Restaurant Name                   │
│ Summer Menu Launch                   │
│ We're launching our new summer...    │
│                                      │
│ 💵 $200  ⏰ 5d left  👥 3 spots  🎯 2 deliverables │
│                                      │
│ [product_launch] [Italian]           │
└─────────────────────────────────────┘
```

### Campaign Detail Modal:
```
┌─────────────────────────────────────┐
│ Campaign Details              [X]   │
├─────────────────────────────────────┤
│ [Restaurant Image]                   │
│                                      │
│ 🏪 Restaurant Name                   │
│                                      │
│ Summer Menu Launch                   │
│ We're launching our new summer       │
│ cocktail menu and want food          │
│ creators to visit...                 │
│                                      │
│ 💵 Budget: $200   📅 Jun 1 - Jun 30  │
│                                      │
│ ─── Expected Deliverables ───        │
│ ┌─────────────────────────────────┐ │
│ │ 1× Instagram Reel                │ │
│ │ 15-30 second video showcasing   │ │
│ │ the new cocktail menu           │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 2× Instagram Story              │ │
│ │ Share your visit experience     │ │
│ └─────────────────────────────────┘ │
│                                      │
│ ─── Requirements ───                 │
│ • Tag @restaurantname                │
│ • Use #SummerSips hashtag            │
│                                      │
│ ┌─────────────────────────────────┐ │
│ │        [Apply Now]               │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## Testing Requirements

### Unit Tests

1. Campaign with deliverables shows deliverable section
2. Campaign without deliverables doesn't show section
3. Deliverable count shows correctly on cards
4. Multiple deliverables render correctly
5. Quantity > 1 shows "2×" prefix

### Integration Tests

1. Create campaign with deliverables as restaurant
2. View campaign as creator
3. Verify deliverables displayed in modal
4. Verify deliverable count on card

### Edge Cases

1. Campaign with `deliverable_requirements: null`
2. Campaign with `deliverable_requirements: {}`
3. Campaign with `deliverable_requirements: { deliverables: [] }`
4. Campaign with `deliverable_requirements: { deliverables: null }`
5. Very long deliverable descriptions (truncation)

---

## Acceptance Criteria

- [ ] Deliverables displayed in campaign detail modal
- [ ] Deliverable count shown on campaign cards
- [ ] Handles campaigns without deliverables gracefully
- [ ] Quantity prefix (2×, 3×) shown for multi-quantity deliverables
- [ ] Description shown under each deliverable type
- [ ] Styling consistent with design system
- [ ] No TypeScript errors
- [ ] Works with existing campaign data

---

## Related Files

- `app/creator/explore-campaigns.tsx` - Campaign discovery screen
- `app/(tabs)/business/campaigns/create.tsx` - Where deliverables are created

---

## Notes

- This is a **bug fix**, not a feature
- Critical for creator/restaurant alignment
- Should be deployed immediately
- No database changes required
- Data already exists, just needs to be displayed
