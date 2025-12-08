# Task CM-15: Creator Profile Edit Enhancements

**Priority:** 🟠 P1 - High
**Severity:** Medium
**Feature:** CM-6 (Creator Profile - Own View/Edit)
**Estimated Effort:** 6-8 hours
**Status:** Not Started
**Related Audit:** `.tasks/creator-marketplace-audit-findings.md` - Section 4

---

## Problem Statement

The creator profile edit screen is missing several important features:

1. **Missing Editable Fields:**
   - Cannot set availability status (see CM-11 for that specific feature)
   - Cannot manage portfolio images after onboarding
   - Cannot view profile completeness

2. **Empty States Not Handled:**
   - No guidance for creators on improving profile visibility
   - No profile completeness indicator

3. **No Portfolio Management:**
   - Portfolio only uploadable during onboarding
   - No way to add/remove/reorder portfolio items later

---

## Current State

**File:** `app/creator/profile/edit.tsx`

**Current Fields:**
- Display Name
- Bio
- Location
- Specialties (add/remove tags)
- Open to Collaborations toggle

**Missing:**
- Availability Status (covered in CM-11)
- Portfolio Management
- Profile Completeness Indicator

---

## Technical Requirements

### 1. Add Profile Completeness Indicator

At the top of the edit screen, show completion progress:

```tsx
interface ProfileCompleteness {
  percentage: number;
  missingItems: string[];
}

function calculateCompleteness(profile: CreatorProfile): ProfileCompleteness {
  const checks = [
    { field: 'display_name', label: 'Display name' },
    { field: 'bio', label: 'Bio' },
    { field: 'location', label: 'Location' },
    { field: 'specialties', label: 'Specialties', isArray: true },
    { field: 'portfolioItems', label: 'Portfolio images', isArray: true, min: 3 },
  ];

  const missing: string[] = [];
  let completed = 0;

  for (const check of checks) {
    const value = profile[check.field];
    if (check.isArray) {
      if (Array.isArray(value) && value.length >= (check.min || 1)) {
        completed++;
      } else {
        missing.push(check.label);
      }
    } else {
      if (value && String(value).trim()) {
        completed++;
      } else {
        missing.push(check.label);
      }
    }
  }

  return {
    percentage: Math.round((completed / checks.length) * 100),
    missingItems: missing,
  };
}
```

```tsx
// Render at top of screen
const { percentage, missingItems } = calculateCompleteness(creatorProfile);

<View style={styles.completenessCard}>
  <View style={styles.completenessHeader}>
    <Text style={styles.completenessTitle}>Profile Completeness</Text>
    <Text style={styles.completenessPercentage}>{percentage}%</Text>
  </View>
  <View style={styles.progressBar}>
    <View style={[styles.progressFill, { width: `${percentage}%` }]} />
  </View>
  {missingItems.length > 0 && (
    <Text style={styles.completenessHint}>
      Add {missingItems.slice(0, 2).join(' and ')} to improve visibility
    </Text>
  )}
</View>
```

### 2. Add Portfolio Management Section

```tsx
// State for portfolio
const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
const [uploadingPortfolio, setUploadingPortfolio] = useState(false);

// Fetch portfolio items on load
useEffect(() => {
  if (creatorProfile?.id) {
    loadPortfolioItems();
  }
}, [creatorProfile?.id]);

const loadPortfolioItems = async () => {
  const { data } = await supabase
    .from('creator_portfolio_items')
    .select('id, media_url, media_type, caption, display_order')
    .eq('creator_id', creatorProfile.id)
    .order('display_order');

  if (data) setPortfolioItems(data);
};

const handleAddPortfolioItem = async () => {
  // Use image picker
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    setUploadingPortfolio(true);
    try {
      // Upload to Supabase storage
      const url = await portfolioImageService.uploadPortfolioImage(
        result.assets[0].uri,
        creatorProfile.id
      );

      // Add to database
      const { data, error } = await supabase
        .from('creator_portfolio_items')
        .insert({
          creator_id: creatorProfile.id,
          media_url: url,
          media_type: 'image',
          display_order: portfolioItems.length,
        })
        .select()
        .single();

      if (data) {
        setPortfolioItems([...portfolioItems, data]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploadingPortfolio(false);
    }
  }
};

const handleRemovePortfolioItem = async (itemId: string) => {
  Alert.alert(
    'Remove Image',
    'Are you sure you want to remove this portfolio image?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await supabase
            .from('creator_portfolio_items')
            .delete()
            .eq('id', itemId);

          setPortfolioItems(portfolioItems.filter(p => p.id !== itemId));
        },
      },
    ]
  );
};
```

```tsx
// Render Portfolio Section
<View style={styles.section}>
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>Portfolio</Text>
    <Text style={styles.sectionCount}>{portfolioItems.length}/10 images</Text>
  </View>
  <Text style={styles.sectionHint}>
    Showcase your best food content to attract restaurants
  </Text>

  <View style={styles.portfolioGrid}>
    {portfolioItems.map((item) => (
      <View key={item.id} style={styles.portfolioItem}>
        <Image source={{ uri: item.media_url }} style={styles.portfolioImage} />
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemovePortfolioItem(item.id)}
        >
          <X size={16} color="white" />
        </TouchableOpacity>
      </View>
    ))}

    {portfolioItems.length < 10 && (
      <TouchableOpacity
        style={styles.addPortfolioButton}
        onPress={handleAddPortfolioItem}
        disabled={uploadingPortfolio}
      >
        {uploadingPortfolio ? (
          <ActivityIndicator size="small" color={DS.colors.primary} />
        ) : (
          <>
            <Plus size={24} color={DS.colors.primary} />
            <Text style={styles.addPortfolioText}>Add Image</Text>
          </>
        )}
      </TouchableOpacity>
    )}
  </View>
</View>
```

### 3. Add Profile Tips Section

```tsx
// Show tips for improving profile
<View style={styles.tipsCard}>
  <View style={styles.tipsHeader}>
    <Lightbulb size={20} color="#F59E0B" />
    <Text style={styles.tipsTitle}>Profile Tips</Text>
  </View>
  <View style={styles.tipsList}>
    <Text style={styles.tipItem}>• Add a bio that describes your content style</Text>
    <Text style={styles.tipItem}>• Include 3+ portfolio images showing your best work</Text>
    <Text style={styles.tipItem}>• Set your location to appear in local searches</Text>
    <Text style={styles.tipItem}>• Add specialties that match your food content</Text>
  </View>
</View>
```

### 4. Add New Styles

```typescript
const styles = StyleSheet.create({
  // ... existing styles ...

  // Completeness Card
  completenessCard: {
    backgroundColor: DS.colors.backgroundWhite,
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DS.colors.border,
  },
  completenessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  completenessTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: DS.colors.text,
  },
  completenessPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: DS.colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: DS.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: DS.colors.primary,
    borderRadius: 4,
  },
  completenessHint: {
    fontSize: 12,
    color: DS.colors.textLight,
    marginTop: 8,
  },

  // Section Styles
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: DS.colors.text,
  },
  sectionCount: {
    fontSize: 13,
    color: DS.colors.textLight,
  },
  sectionHint: {
    fontSize: 13,
    color: DS.colors.textLight,
    marginBottom: 12,
  },

  // Portfolio Grid
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  portfolioItem: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  addPortfolioButton: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: DS.colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DS.colors.background,
  },
  addPortfolioText: {
    fontSize: 11,
    color: DS.colors.primary,
    marginTop: 4,
  },

  // Tips Card
  tipsCard: {
    backgroundColor: '#FFFBEB', // amber-50
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FDE68A', // amber-200
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E', // amber-800
  },
  tipsList: {
    gap: 6,
  },
  tipItem: {
    fontSize: 13,
    color: '#78350F', // amber-900
    lineHeight: 18,
  },
});
```

---

## Testing Requirements

### Unit Tests

1. Profile completeness calculates correctly
2. Missing items identified correctly
3. Portfolio items load on mount
4. Add portfolio item works
5. Remove portfolio item works

### Integration Tests

1. Save profile updates correctly
2. Portfolio images upload to storage
3. Portfolio items persist after refresh
4. Completeness updates as fields filled

### Edge Cases

1. Profile with all fields complete (100%)
2. Profile with no fields complete (0%)
3. Upload failure handling
4. Maximum portfolio items (10) enforced
5. Very long bio (character limit)

---

## Acceptance Criteria

- [ ] Profile completeness indicator displayed
- [ ] Missing items hint shown
- [ ] Progress bar animates
- [ ] Portfolio management section added
- [ ] Can add new portfolio images
- [ ] Can remove existing portfolio images
- [ ] Portfolio limited to 10 images
- [ ] Tips section provides guidance
- [ ] All changes save correctly
- [ ] Loading states for uploads

---

## Dependencies

- CM-11 (Availability Status) - Should be implemented first
- `portfolioImageService` - Image upload service

---

## Related Files

- `app/creator/profile/edit.tsx` - Profile edit screen
- `services/portfolioImageService.ts` - Image upload
- `hooks/useCreatorProfileId.ts` - Profile hook
- `components/creator/CreatorOnboardingV1.tsx` - Reference for portfolio picker

---

## Notes

- This extends CM-6 beyond just availability status
- Portfolio management is important for creator success
- Completeness indicator encourages profile completion
- Tips help new creators understand what makes a good profile
