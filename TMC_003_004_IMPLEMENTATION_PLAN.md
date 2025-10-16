# TMC-003 & TMC-004 Implementation Plan

## ✅ Status: Ready to Implement

### Completed
- ✅ TMC-001: Database schema deployed
- ✅ TMC-002: System account created (kouame@troodieapp.com)
- ✅ Design system tokens identified from v1_component_referrence.html
- ✅ CampaignDetailsForm.tsx created

### Design System Key Patterns

From `v1_component_referrence.html`:

**Colors:**
- Primary: `#FFAD27` (orange)
- Background: `#FFFFFF` (white)
- Borders: `#E5E5E5` (neutral-200)
- Text: `#171717` (neutral-900)
- Secondary text: `#525252` (neutral-600)
- Muted text: `#737373` (neutral-500)

**Components:**
- Buttons: `rounded-full` (pill shape), `h-10` or `h-11`, `px-4` or `px-5`
- Cards: `rounded-2xl` or `rounded-xl`, `ring-1 ring-neutral-200`
- Inputs: `rounded-xl`, `h-12`, `px-3`, `ring-1 ring-neutral-200`
- Icons: Circular containers with `bg-[#FFFAF2]` (light orange tint)
- Badges: Small pills with colored backgrounds (emerald, amber for status)

**Interactions:**
- Hover: `hover:brightness-110` on primary buttons
- Active: `active:scale-95` for press feedback
- Transitions: `transition` class for smooth animations

---

## TMC-003: Admin Campaign Creation UI

### Components to Build

1. **✅ CampaignDetailsForm.tsx** - DONE
   - Campaign title, description
   - Requirements list (add/remove)
   - Max creators, dates

2. **BudgetTrackingForm.tsx**
   ```
   - Budget source dropdown (marketing, growth, partnerships, etc.)
   - Approved budget input (in cents)
   - Cost center input
   - Target metrics (creators, content pieces, reach)
   ```

3. **PartnershipDetailsForm.tsx**
   ```
   - Only shown for "partnership" campaign type
   - Partner restaurant selector
   - Partnership dates
   - Agreement signed checkbox
   - Subsidy amount
   ```

4. **CampaignPreview.tsx**
   ```
   - Read-only view of all campaign details
   - Shows how it will appear to creators
   - "Publish Campaign" button
   ```

5. **AdminCampaignWizard.tsx** (Main Container)
   ```
   - Wizard with steps: Type → Details → Budget → (Partnership if needed) → Preview
   - Progress indicator at top
   - Back/Next buttons
   - Uses CampaignTypeSelector (already created)
   ```

### Screens to Create

1. **app/admin/campaigns/create.tsx**
   - Renders AdminCampaignWizard
   - Handles navigation after creation

2. **app/admin/campaigns/index.tsx**
   - List of all platform campaigns
   - Filter by status, type
   - Quick stats (budget used, creators, etc.)

3. **app/admin/campaigns/[id].tsx**
   - View/edit existing campaign
   - Real-time metrics
   - List of applications

---

## TMC-004: Creator Campaign UI Updates

### Components to Update/Create

1. **CampaignCard.tsx** (Update existing)
   - Add "Troodie Official" badge for `campaign_source = 'troodie_direct'`
   - Add "Challenge" badge for `campaign_source = 'community_challenge'`
   - Trust signals (guaranteed payment, fast approval)

2. **CampaignBadge.tsx** (New)
   ```tsx
   // Badge types:
   - "troodie-official" (orange badge with checkmark)
   - "challenge" (trophy icon, gradient)
   - "partnership" (hidden - appears as normal restaurant)
   ```

3. **CampaignDetailScreen.tsx** (Update)
   - Show trust signals for Troodie campaigns
   - Highlight guaranteed payment
   - Show "Managed by Troodie" section

### Trust Signals to Add

For `troodie_direct` campaigns, show:
- ✓ **Guaranteed Payment** - Troodie pays directly
- ⏱ **Fast Approval** - 24-48 hour review
- ✓ **Platform Managed** - Direct support from Troodie

---

## Implementation Order

### Phase 1: Complete TMC-003 Admin UI (Day 1-2)
1. ✅ CampaignDetailsForm.tsx
2. BudgetTrackingForm.tsx
3. PartnershipDetailsForm.tsx
4. CampaignPreview.tsx
5. AdminCampaignWizard.tsx
6. Create admin screens

### Phase 2: TMC-004 Creator UI (Day 3)
7. Create CampaignBadge.tsx
8. Update CampaignCard.tsx with badges
9. Update campaign detail screen with trust signals
10. Test with real data

### Phase 3: Testing (Day 4)
11. Create test campaigns (all 3 types)
12. Verify badges show correctly
13. Test application flow
14. Verify budget tracking

---

## Code Structure

```
components/admin/
├── CampaignTypeSelector.tsx ✅ (already created)
├── CampaignDetailsForm.tsx ✅ (just created)
├── BudgetTrackingForm.tsx (TODO)
├── PartnershipDetailsForm.tsx (TODO)
├── CampaignPreview.tsx (TODO)
└── AdminCampaignWizard.tsx (TODO)

components/campaigns/
├── CampaignCard.tsx (UPDATE - add badges)
├── CampaignBadge.tsx (NEW)
└── TrustSignals.tsx (NEW)

app/admin/campaigns/
├── create.tsx (NEW)
├── index.tsx (NEW)
└── [id].tsx (NEW)
```

---

## Next Steps

**Ready to continue?** I'll create the remaining components:

1. BudgetTrackingForm.tsx
2. PartnershipDetailsForm.tsx
3. CampaignPreview.tsx
4. AdminCampaignWizard.tsx
5. CampaignBadge.tsx (for creators)

Then wire up the screens and test!

---

## Services Already Built

These are ready to use:
- ✅ `platformCampaignService.ts` - Create/read/update campaigns
- ✅ `systemAccountService.ts` - Verify admin access
- ✅ `analyticsService.ts` - Budget tracking & metrics

---

**Estimated Time Remaining**: 6-8 hours of implementation
