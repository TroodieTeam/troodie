# Engineering Request #008: Multiple Deliverables Submission Support

**Priority:** 🟡 P2 - Can Ship Without, Fix Soon After  
**Severity:** Medium  
**Feature:** CM-4 (Deliverable Submission)  
**Estimated Effort:** 1 day  
**Status:** Not Started

---

## Problem Statement

The current deliverable submission UI only supports submitting one deliverable per campaign application. The database schema already supports multiple deliverables via the `deliverable_index` field, but the UI does not expose this functionality.

**Current Limitations:**
- Creators can only submit one post/deliverable per campaign
- No way to track progress across multiple required deliverables
- No UI to show all required deliverables for a campaign
- No batch submission workflow

**Impact:**
- Creators must submit deliverables one at a time
- No visibility into which deliverables are still needed
- Poor UX for campaigns requiring multiple posts
- Database supports it, but UI doesn't

---

## Technical Requirements

### Database Schema

**Current Schema:** Already supports multiple deliverables

The `campaign_deliverables` table has:
- `deliverable_index` field (INTEGER, CHECK > 0)
- `UNIQUE(campaign_application_id, deliverable_index)` constraint
- Supports multiple deliverables per application

**No database changes needed** - schema is already correct.

### Service Layer Updates

**File:** `services/deliverableSubmissionService.ts`

**Current State:**
- `submitDeliverable()` - Submits single deliverable
- `submitMultipleDeliverables()` - Exists but not fully utilized
- `getDeliverablesForCreatorCampaign()` - Gets all deliverables

**Required Updates:**

1. **Enhance `submitMultipleDeliverables()`:**
   ```typescript
   export async function submitMultipleDeliverables(
     submissions: SubmitDeliverableParams[],
     options?: {
       transaction?: boolean; // All-or-nothing
       continueOnError?: boolean; // Continue if one fails
     }
   ): Promise<{
     data: DeliverableSubmission[] | null;
     errors: Array<{ index: number; error: Error }>;
   }> {
     // Implementation with transaction support
   }
   ```

2. **Add `getRequiredDeliverables()`:**
   ```typescript
   export async function getRequiredDeliverables(
     campaignId: string
   ): Promise<{
     data: {
       total_required: number;
       deliverables: Array<{
         index: number;
         platform?: string;
         description?: string;
         required: boolean;
       }>;
     } | null;
     error: Error | null;
   }> {
     // Parse deliverable_requirements JSONB from campaign
     // Return structured list of required deliverables
   }
   ```

3. **Add `getSubmissionProgress()`:**
   ```typescript
   export async function getSubmissionProgress(
     creatorCampaignId: string
   ): Promise<{
     data: {
       submitted: number;
       required: number;
       percentage: number;
       complete: boolean;
       deliverables: Array<{
         index: number;
         status: 'submitted' | 'pending' | 'approved' | 'rejected';
         submitted_at?: string;
       }>;
     } | null;
     error: Error | null;
   }> {
     // Get required deliverables from campaign
     // Get submitted deliverables from campaign_deliverables
     // Calculate progress
   }
   ```

4. **Update `submitDeliverable()` to calculate index:**
   ```typescript
   export async function submitDeliverable(
     params: Omit<SubmitDeliverableParams, 'deliverable_index'> & {
       deliverable_index?: number; // Optional, auto-calculate if not provided
     }
   ): Promise<{ data: DeliverableSubmission | null; error: Error | null }> {
     // If deliverable_index not provided, calculate next available index
     // Check existing deliverables for this campaign_application_id
     // Set index to max(existing) + 1
   }
   ```

### UI Component Updates

**File:** `app/creator/campaigns/[id]/submit-deliverable.tsx`

**Current State:**
- Single deliverable form
- Single URL input
- Single submit button
- TODO comment indicating limitation

**Required Updates:**

1. **Add Deliverable List View:**
   - Show all required deliverables for campaign
   - Show which ones are submitted
   - Show which ones are pending
   - Progress indicator

2. **Add "Add Another Deliverable" Functionality:**
   - Allow creators to add multiple deliverables in one session
   - List of deliverables being prepared
   - Submit all at once or individually

3. **Update Form State:**
   ```typescript
   // Current: Single deliverable
   const [postUrl, setPostUrl] = useState('');
   const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
   
   // New: Multiple deliverables
   interface DeliverableFormData {
     url: string;
     platform: DeliverablePlatform | null;
     screenshotUri: string | null;
     caption: string;
     notes: string;
   }
   
   const [deliverables, setDeliverables] = useState<DeliverableFormData[]>([
     { url: '', platform: null, screenshotUri: null, caption: '', notes: '' }
   ]);
   ```

4. **Add Progress Tracking:**
   - Show "X of Y deliverables submitted"
   - Visual progress bar
   - Status indicators for each deliverable

---

## Implementation Details

### Step 1: Update Service Layer

**File:** `services/deliverableSubmissionService.ts`

1. **Enhance `getRequiredDeliverables()`:**
   ```typescript
   export async function getRequiredDeliverables(
     campaignId: string
   ): Promise<{
     data: {
       total_required: number;
       deliverables: Array<{
         index: number;
         platform?: DeliverablePlatform;
         description?: string;
         content_type?: string;
         required: boolean;
       }>;
     } | null;
     error: Error | null;
   }> {
     try {
       // Get campaign with deliverable_requirements
       const { data: campaign, error } = await supabase
         .from('campaigns')
         .select('deliverable_requirements')
         .eq('id', campaignId)
         .single();
       
       if (error) return { data: null, error };
       
       // Parse deliverable_requirements JSONB
       const requirements = campaign?.deliverable_requirements || {};
       const deliverablesList = requirements.deliverables || [];
       
       const deliverables = deliverablesList.map((req: any, index: number) => ({
         index: index + 1,
         platform: req.platform,
         description: req.description,
         content_type: req.content_type,
         required: req.required !== false, // Default to required
       }));
       
       return {
         data: {
           total_required: deliverables.length,
           deliverables,
         },
         error: null,
       };
     } catch (error) {
       return { data: null, error: error as Error };
     }
   }
   ```

2. **Update `submitDeliverable()` to auto-calculate index:**
   ```typescript
   export async function submitDeliverable(
     params: Omit<SubmitDeliverableParams, 'deliverable_index'> & {
       deliverable_index?: number;
     }
   ): Promise<{ data: DeliverableSubmission | null; error: Error | null }> {
     try {
       let deliverableIndex = params.deliverable_index;
       
       // Auto-calculate index if not provided
       if (!deliverableIndex) {
         const { data: existing } = await supabase
           .from('campaign_deliverables')
           .select('deliverable_index')
           .eq('creator_campaign_id', params.creator_campaign_id)
           .order('deliverable_index', { ascending: false })
           .limit(1);
         
         deliverableIndex = existing && existing.length > 0
           ? existing[0].deliverable_index + 1
           : 1;
       }
       
       // Continue with existing submission logic...
       const { data, error } = await supabase
         .from('campaign_deliverables')
         .insert({
           ...params,
           deliverable_index: deliverableIndex,
         })
         .select('*')
         .single();
       
       // ... rest of function
     } catch (error) {
       return { data: null, error: error as Error };
     }
   }
   ```

3. **Enhance `getSubmissionProgress()`:**
   ```typescript
   export async function getSubmissionProgress(
     creatorCampaignId: string,
     campaignId: string
   ): Promise<{
     data: {
       submitted: number;
       required: number;
       percentage: number;
       complete: boolean;
       deliverables: Array<{
         index: number;
         status: string;
         submitted_at?: string;
         platform?: string;
       }>;
     } | null;
     error: Error | null;
   }> {
     try {
       // Get required deliverables
       const { data: required } = await getRequiredDeliverables(campaignId);
       
       // Get submitted deliverables
       const { data: submitted } = await getDeliverablesForCreatorCampaign(
         creatorCampaignId
       );
       
       if (!required || !submitted) {
         return { data: null, error: new Error('Failed to fetch data') };
       }
       
       // Build deliverables array with status
       const deliverables = required.deliverables.map((req) => {
         const submittedDeliverable = submitted.find(
           (s) => s.deliverable_index === req.index
         );
         
         return {
           index: req.index,
           status: submittedDeliverable
             ? submittedDeliverable.status
             : 'pending',
           submitted_at: submittedDeliverable?.submitted_at,
           platform: submittedDeliverable?.platform || req.platform,
         };
       });
       
       const submittedCount = submitted.length;
       const requiredCount = required.total_required;
       const percentage = requiredCount > 0
         ? Math.round((submittedCount / requiredCount) * 100)
         : 0;
       
       return {
         data: {
           submitted: submittedCount,
           required: requiredCount,
           percentage,
           complete: submittedCount >= requiredCount,
           deliverables,
         },
         error: null,
       };
     } catch (error) {
       return { data: null, error: error as Error };
     }
   }
   ```

### Step 2: Update UI Component

**File:** `app/creator/campaigns/[id]/submit-deliverable.tsx`

**Major Changes:**

1. **Add Progress Section:**
   ```tsx
   // At top of screen, show progress
   <View style={styles.progressSection}>
     <Text style={styles.progressTitle}>
       Deliverable Progress
     </Text>
     <View style={styles.progressBar}>
       <View 
         style={[
           styles.progressFill, 
           { width: `${progress.percentage}%` }
         ]} 
       />
     </View>
     <Text style={styles.progressText}>
       {progress.submitted} of {progress.required} deliverables submitted
     </Text>
   </View>
   ```

2. **Add Deliverable List:**
   ```tsx
   // Show list of required deliverables
   <View style={styles.deliverablesList}>
     {progress.deliverables.map((deliverable) => (
       <DeliverableItem
         key={deliverable.index}
         index={deliverable.index}
         status={deliverable.status}
         platform={deliverable.platform}
         onPress={() => handleEditDeliverable(deliverable.index)}
       />
     ))}
   </View>
   ```

3. **Update Form to Support Multiple:**
   ```tsx
   // Change from single form to array-based
   const [deliverables, setDeliverables] = useState<DeliverableFormData[]>([
     { url: '', platform: null, screenshotUri: null, caption: '', notes: '' }
   ]);
   
   const addDeliverable = () => {
     setDeliverables([...deliverables, {
       url: '',
       platform: null,
       screenshotUri: null,
       caption: '',
       notes: ''
     }]);
   };
   
   const removeDeliverable = (index: number) => {
     setDeliverables(deliverables.filter((_, i) => i !== index));
   };
   
   const updateDeliverable = (index: number, updates: Partial<DeliverableFormData>) => {
     const updated = [...deliverables];
     updated[index] = { ...updated[index], ...updates };
     setDeliverables(updated);
   };
   ```

4. **Update Submit Handler:**
   ```tsx
   const handleSubmit = async () => {
     // Validate all deliverables
     const validDeliverables = deliverables.filter(d => 
       d.url.trim() && d.platform
     );
     
     if (validDeliverables.length === 0) {
       Alert.alert('Error', 'Please add at least one deliverable');
       return;
     }
     
     setIsSubmitting(true);
     
     try {
       // Submit all deliverables
       const submissions = validDeliverables.map((deliverable, index) => ({
         creator_campaign_id: creatorCampaignId,
         campaign_id: campaignId,
         creator_id: user.id,
         platform: deliverable.platform!,
         post_url: deliverable.url.trim(),
         screenshot_url: deliverable.screenshotUri, // Upload first
         caption: deliverable.caption.trim() || undefined,
         notes_to_restaurant: deliverable.notes.trim() || undefined,
       }));
       
       const { data, errors } = await submitMultipleDeliverables(submissions);
       
       if (errors.length > 0) {
         Alert.alert(
           'Partial Success',
           `${data?.length || 0} deliverables submitted. ${errors.length} failed.`
         );
       } else {
         Alert.alert(
           'Success!',
           'All deliverables submitted successfully.',
           [{ text: 'OK', onPress: () => router.back() }]
         );
       }
     } catch (error) {
       Alert.alert('Error', 'Failed to submit deliverables');
     } finally {
       setIsSubmitting(false);
     }
   };
   ```

### Step 3: Create Deliverable Item Component

**File:** `components/creator/DeliverableItem.tsx`

```tsx
interface DeliverableItemProps {
  index: number;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  platform?: string;
  submittedAt?: string;
  onPress: () => void;
}

export function DeliverableItem({
  index,
  status,
  platform,
  submittedAt,
  onPress,
}: DeliverableItemProps) {
  const statusColors = {
    pending: '#9CA3AF',
    submitted: '#3B82F6',
    approved: '#10B981',
    rejected: '#EF4444',
  };
  
  return (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemIndex}>Deliverable {index}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[status] }]}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>
      {platform && (
        <Text style={styles.platform}>{platform}</Text>
      )}
      {submittedAt && (
        <Text style={styles.submittedAt}>
          Submitted {formatDate(submittedAt)}
        </Text>
      )}
    </TouchableOpacity>
  );
}
```

---

## User Flows

### Flow 1: Submit Multiple Deliverables

1. Creator opens campaign details
2. Clicks "Submit Deliverables"
3. Sees progress indicator: "0 of 3 deliverables submitted"
4. Sees list of required deliverables:
   - Deliverable 1: Instagram Post (pending)
   - Deliverable 2: TikTok Video (pending)
   - Deliverable 3: YouTube Short (pending)
5. Clicks on "Deliverable 1"
6. Enters Instagram post URL
7. Optionally uploads screenshot
8. Adds caption and notes
9. Clicks "Add Another Deliverable" or "Save & Continue"
10. Repeats for remaining deliverables
11. Reviews all deliverables in list
12. Clicks "Submit All Deliverables"
13. System submits all at once
14. Progress updates: "3 of 3 deliverables submitted"
15. Success message shown

### Flow 2: Submit Deliverables Individually

1. Creator opens campaign details
2. Clicks "Submit Deliverables"
3. Sees progress: "1 of 3 deliverables submitted"
4. Sees list:
   - Deliverable 1: Instagram Post (submitted - approved)
   - Deliverable 2: TikTok Video (pending)
   - Deliverable 3: YouTube Short (pending)
5. Clicks on "Deliverable 2"
6. Submits TikTok video URL
7. Clicks "Submit This Deliverable"
8. Progress updates: "2 of 3 deliverables submitted"
9. Returns to list
10. Continues with remaining deliverables

---

## Testing Requirements

### Unit Tests

1. **Service Tests:**
   - `getRequiredDeliverables()` - Parses JSONB correctly
   - `submitDeliverable()` - Auto-calculates index correctly
   - `getSubmissionProgress()` - Calculates progress correctly
   - `submitMultipleDeliverables()` - Handles batch submission

2. **Component Tests:**
   - Progress indicator shows correct percentage
   - Deliverable list renders correctly
   - Add/remove deliverable works
   - Form validation works for multiple deliverables

### Integration Tests

1. **End-to-End Flow:**
   - Creator submits multiple deliverables
   - Progress updates correctly
   - All deliverables saved to database
   - Status updates correctly

2. **Edge Cases:**
   - Campaign with no deliverable requirements
   - Campaign with single deliverable
   - Creator submits more than required
   - Partial submission failures

### Manual Testing Checklist

- [ ] Progress indicator shows correct count
- [ ] Required deliverables list displays correctly
- [ ] Can add multiple deliverables in one session
- [ ] Can remove deliverables before submission
- [ ] Can submit all deliverables at once
- [ ] Can submit deliverables individually
- [ ] Progress updates after each submission
- [ ] Status indicators show correctly
- [ ] Form validation works for each deliverable
- [ ] Error handling works correctly
- [ ] Loading states display correctly
- [ ] Success message shows after submission

---

## Acceptance Criteria

- [ ] Service functions updated to support multiple deliverables
- [ ] `getRequiredDeliverables()` implemented
- [ ] `getSubmissionProgress()` implemented
- [ ] `submitDeliverable()` auto-calculates index
- [ ] UI updated to show progress indicator
- [ ] UI updated to show deliverable list
- [ ] "Add Another Deliverable" functionality works
- [ ] Batch submission works
- [ ] Individual submission works
- [ ] Progress tracking works correctly
- [ ] All tests passing
- [ ] Error handling implemented
- [ ] Loading states implemented
- [ ] Empty states implemented

---

## Design Mockups

### Progress Section

```
┌─────────────────────────────────────┐
│  Deliverable Progress              │
├─────────────────────────────────────┤
│  [████████░░░░░░░░░░] 40%          │
│  2 of 5 deliverables submitted     │
└─────────────────────────────────────┘
```

### Deliverable List

```
┌─────────────────────────────────────┐
│  Required Deliverables              │
├─────────────────────────────────────┤
│  ✓ Deliverable 1                   │
│    Instagram Post - Approved        │
│    Submitted Jan 15                 │
├─────────────────────────────────────┤
│  ⏳ Deliverable 2                   │
│    TikTok Video - Pending           │
│    [Submit]                         │
├─────────────────────────────────────┤
│  ⏳ Deliverable 3                   │
│    YouTube Short - Pending          │
│    [Submit]                         │
└─────────────────────────────────────┘
```

### Multi-Deliverable Form

```
┌─────────────────────────────────────┐
│  Submit Deliverables                │
├─────────────────────────────────────┤
│  Deliverable 1                      │
│  [URL Input]                        │
│  [Screenshot Upload]                │
│  [Caption]                          │
├─────────────────────────────────────┤
│  [+ Add Another Deliverable]        │
├─────────────────────────────────────┤
│  Deliverable 2                      │
│  [URL Input]                        │
│  ...                                │
├─────────────────────────────────────┤
│  [Submit All Deliverables]          │
└─────────────────────────────────────┘
```

---

## Related Files

- `services/deliverableSubmissionService.ts` - Service (needs updates)
- `app/creator/campaigns/[id]/submit-deliverable.tsx` - UI (needs major update)
- `components/creator/DeliverableItem.tsx` - New component
- `types/deliverableRequirements.ts` - Types (may need updates)

---

## Notes

- Database schema already supports this - no migration needed
- This is primarily a UI/UX enhancement
- Backward compatible - single deliverable submission still works
- Can be implemented incrementally (start with progress tracking, then add multi-submit)

---

## Future Enhancements

- Drag-and-drop reordering of deliverables
- Bulk upload from clipboard (paste multiple URLs)
- Template deliverables (pre-fill common fields)
- Deliverable dependencies (submit in order)
- Auto-detect platform from URL and pre-fill form
- Draft saves (save progress and continue later)

