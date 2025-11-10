# Restaurant Claiming Flow

- Epic: CM (Creator Marketplace)
- Priority: Critical
- Estimate: 3 days → **1.5 days (simplified)**
- Status: 🟡 Needs Review
- Assignee: -
- Dependencies: CM-001, CM-002

## MVP Simplification Summary
**Decision Date:** September 11, 2025  
**Decision Makers:** Development Team  
**Original Scope:** 4 verification methods, role conflict resolution, multi-step flows  
**Simplified Scope:** Domain-based instant verification with email fallback

### Rationale for Simplification
1. **Complexity Reduction:** Original design had 4 verification methods (email, phone, document, postcard) creating extensive testing requirements and edge cases
2. **Time to Market:** Simplified approach reduces implementation from 3 days to 1.5 days
3. **User Experience:** Domain matching enables instant verification (30 seconds vs 5-10 minutes)
4. **Business Reality:** Most legitimate restaurant owners have email addresses matching their domain
5. **Security Maintained:** Email verification still prevents fraudulent claims
6. **Iterative Approach:** Can add phone/document verification post-launch if needed

### Key Simplifications Made
- **Removed:** Phone verification, postcard verification, complex document upload flows
- **Removed:** Role conflict resolution system (creator vs owner conflicts)
- **Removed:** Multi-step verification state machine
- **Added:** Instant domain matching (email@restaurant.com = instant verify)
- **Simplified:** Email verification to just 6-digit code
- **Deferred:** Manual review only for edge cases

### Success Metrics for MVP
- 60%+ instant verification rate via domain matching
- < 2 minute average claiming time
- < 5% require manual support

### Post-MVP Enhancements (If Needed)
- SMS verification for high-value restaurants
- Google My Business API integration
- Social media verification
- Complex role conflict handling

---

## Overview
Implement simplified restaurant claiming and verification system allowing restaurant owners to claim their business profiles and access marketplace features. Uses domain-based instant verification when possible, with simple email verification as fallback. The claiming flow can be initiated from multiple entry points including the restaurant detail page and the More tab.

## Business Value
- Enables restaurant owners to access Creator Marketplace features
- Ensures authentic business representation on platform
- Critical for two-sided marketplace growth
- Prevents fraudulent business claims
- Foundation for restaurant analytics and campaign management

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Restaurant Claiming Flow
  As a restaurant owner
  I want to claim my restaurant's profile
  So that I can manage my business presence and create creator campaigns

  Scenario: Claiming from restaurant detail page
    Given I am viewing a restaurant detail page
    When I tap the dropdown menu (three dots)
    And I select "Claim This Business"
    Then I am taken to the claiming flow
    And I can verify ownership
    And the restaurant shows as "Claimed" after verification

  Scenario: Claiming from More tab
    Given I am in the More tab
    When I tap "Claim Your Restaurant"
    Then I see a restaurant search screen
    And I can find and select my restaurant
    And I proceed with the claiming flow

  Scenario: Successful restaurant claim via email
    Given I find my restaurant on Troodie
    When I initiate the claiming process
    And I verify ownership via business email
    Then my account type becomes "business"
    And I can access the business dashboard
    And my restaurant profile shows as "Claimed"

  Scenario: Phone verification method
    Given email verification is not available
    When I choose phone verification
    And I receive and enter the verification code
    Then ownership is verified successfully
    And I complete business profile setup

  Scenario: Document verification for complex cases
    Given automated verification fails
    When I upload business documents
    Then my claim enters manual review
    And I receive status updates via email
    And verification completes within 48 hours

  Scenario: Role conflict resolution
    Given I'm already a creator who promoted this restaurant
    When I try to claim the restaurant
    Then I see conflict resolution options
    And I can choose to transfer creator earnings
    Or maintain separate creator/owner roles
    And the system prevents conflicts of interest
```

## Technical Implementation

### Entry Points Implementation

#### Restaurant Detail Page Integration
```typescript
// In RestaurantDetailScreen.tsx
const RestaurantDetailScreen: React.FC = () => {
  const { restaurant } = useRestaurant();
  const { user, accountType } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const dropdownOptions = [
    {
      id: 'share',
      label: 'Share Restaurant',
      icon: 'Share',
      action: () => shareRestaurant(restaurant)
    },
    {
      id: 'report',
      label: 'Report Issue',
      icon: 'Flag',
      action: () => reportIssue(restaurant.id)
    }
  ];

  // Add claim option if restaurant is not claimed and user is not already a business owner
  if (!restaurant.isClaimed && accountType !== 'business') {
    dropdownOptions.splice(1, 0, {
      id: 'claim',
      label: 'Claim This Business',
      icon: 'Building',
      action: () => navigation.navigate('ClaimRestaurant', { restaurantId: restaurant.id })
    });
  }

  // Show "Manage Business" if user owns this restaurant
  if (restaurant.ownerId === user?.id) {
    dropdownOptions.unshift({
      id: 'manage',
      label: 'Manage Business',
      icon: 'Settings',
      action: () => navigation.navigate('BusinessDashboard', { restaurantId: restaurant.id })
    });
  }

  return (
    <View style={styles.container}>
      {/* Restaurant header with dropdown */}
      <View style={styles.header}>
        <Text style={styles.restaurantName}>{restaurant.name}</Text>
        <TouchableOpacity 
          style={styles.dropdownButton}
          onPress={() => setShowDropdown(true)}
        >
          <MoreVertical size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Claimed badge if applicable */}
      {restaurant.isClaimed && (
        <View style={styles.claimedBadge}>
          <CheckCircle size={16} color="#10B981" />
          <Text style={styles.claimedText}>Verified Business</Text>
        </View>
      )}

      {/* Dropdown menu */}
      <Modal visible={showDropdown} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay}
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.dropdownMenu}>
            {dropdownOptions.map(option => (
              <TouchableOpacity
                key={option.id}
                style={styles.dropdownOption}
                onPress={() => {
                  setShowDropdown(false);
                  option.action();
                }}
              >
                <Icon name={option.icon} size={20} color="#666" />
                <Text style={styles.dropdownLabel}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Rest of restaurant details */}
    </View>
  );
};
```

#### More Tab Entry Point
```typescript
// In MoreScreen.tsx - already covered in task-cm-003
// Adding restaurant search screen for claiming flow

const RestaurantSearchForClaim: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<Location>();

  useEffect(() => {
    getCurrentLocation().then(setUserLocation);
  }, []);

  const searchRestaurants = async () => {
    if (searchQuery.length < 2) return;
    
    setLoading(true);
    try {
      const results = await restaurantService.search({
        query: searchQuery,
        location: userLocation,
        limit: 20,
        includeClaimedStatus: true
      });
      setRestaurants(results);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Find Your Restaurant</Text>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by restaurant name or address"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={searchRestaurants}
          returnKeyType="search"
        />
      </View>

      {userLocation && (
        <TouchableOpacity 
          style={styles.nearbyButton}
          onPress={() => searchNearbyRestaurants()}
        >
          <MapPin size={16} color="#007AFF" />
          <Text style={styles.nearbyText}>Show restaurants near me</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.restaurantCard}
            onPress={() => navigation.navigate('ClaimRestaurant', { 
              restaurantId: item.id,
              restaurant: item 
            })}
          >
            <Image source={{ uri: item.imageUrl }} style={styles.restaurantImage} />
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantName}>{item.name}</Text>
              <Text style={styles.restaurantAddress}>{item.address}</Text>
              {item.isClaimed && (
                <View style={styles.claimedIndicator}>
                  <Text style={styles.claimedText}>Already claimed</Text>
                </View>
              )}
            </View>
            <ChevronRight size={20} color="#999" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No restaurants found</Text>
            <Text style={styles.emptySubtitle}>
              Try searching with a different name or location
            </Text>
            <TouchableOpacity 
              style={styles.addRestaurantButton}
              onPress={() => navigation.navigate('AddRestaurant')}
            >
              <Plus size={20} color="#007AFF" />
              <Text style={styles.addRestaurantText}>Add a new restaurant</Text>
            </TouchableOpacity>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={searchRestaurants} />
        }
      />
    </SafeAreaView>
  );
};
```

### Claiming Flow State Machine
```typescript
interface ClaimingState {
  restaurantId: string;
  currentStep: ClaimingStep;
  verificationMethod: VerificationMethod;
  verificationStatus: VerificationStatus;
  businessInfo: BusinessInfo;
  conflicts: RoleConflict[];
  error?: string;
}

type ClaimingStep = 
  | 'initiate'
  | 'verification_method'
  | 'verification_process'
  | 'conflict_resolution'
  | 'business_setup'
  | 'account_selection'
  | 'complete';

type VerificationMethod = 
  | 'email'
  | 'phone'
  | 'document'
  | 'postcard';

type VerificationStatus = 
  | 'pending'
  | 'in_progress'
  | 'verified'
  | 'failed'
  | 'manual_review';

const useRestaurantClaiming = (restaurantId: string) => {
  const [state, setState] = useState<ClaimingState>(initialState);
  
  const initiateClaiiming = async () => {
    // Check for existing claims
    const existingClaim = await claimingService.checkExistingClaim(restaurantId);
    if (existingClaim) {
      throw new Error('Restaurant already claimed');
    }
    
    // Check for role conflicts
    const conflicts = await claimingService.checkRoleConflicts(restaurantId, user.id);
    
    setState(prev => ({ 
      ...prev, 
      currentStep: conflicts.length > 0 ? 'conflict_resolution' : 'verification_method',
      conflicts 
    }));
  };
  
  return { state, initiateClaiiming, selectVerificationMethod, submitVerification };
};
```

### Verification Methods Component
```typescript
const VerificationMethodStep: React.FC<{ onSelect: (method: VerificationMethod) => void }> = ({ onSelect }) => {
  const restaurant = useRestaurant();
  const availableMethods = getAvailableVerificationMethods(restaurant);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How would you like to verify ownership?</Text>
      
      {availableMethods.map(method => (
        <TouchableOpacity
          key={method.type}
          style={styles.methodCard}
          onPress={() => onSelect(method.type)}
        >
          <View style={styles.methodHeader}>
            <Icon name={method.icon} size={24} color={method.available ? '#4CAF50' : '#999'} />
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>{method.title}</Text>
              <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
            </View>
            <View style={styles.methodTiming}>
              <Text style={styles.timingText}>{method.timing}</Text>
            </View>
          </View>
          
          <Text style={styles.methodDescription}>{method.description}</Text>
          
          {method.type === 'email' && restaurant.businessEmail && (
            <Text style={styles.methodDetail}>
              We'll send a code to: {maskEmail(restaurant.businessEmail)}
            </Text>
          )}
          
          {method.type === 'phone' && restaurant.businessPhone && (
            <Text style={styles.methodDetail}>
              We'll call: {maskPhone(restaurant.businessPhone)}
            </Text>
          )}
          
          {!method.available && (
            <Text style={styles.unavailableReason}>{method.unavailableReason}</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};
```

### Role Conflict Resolution
```typescript
const RoleConflictStep: React.FC<{ conflicts: RoleConflict[], onResolve: (resolution: ConflictResolution) => void }> = ({ conflicts, onResolve }) => {
  return (
    <View style={styles.container}>
      <Icon name="AlertTriangle" size={48} color="#FF9500" style={styles.warningIcon} />
      <Text style={styles.title}>Role Conflict Detected</Text>
      
      <View style={styles.conflictSummary}>
        <Text style={styles.conflictText}>
          You're trying to claim "{restaurant.name}" but you have:
        </Text>
        
        {conflicts.map(conflict => (
          <View key={conflict.type} style={styles.conflictItem}>
            <Icon name="Dot" size={16} color="#FF9500" />
            <Text style={styles.conflictDescription}>{conflict.description}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.optionsTitle}>Resolution Options:</Text>
      
      <TouchableOpacity 
        style={styles.optionCard}
        onPress={() => onResolve({ type: 'dual_role', transferEarnings: false })}
      >
        <Text style={styles.optionTitle}>1. Keep Both Roles (Recommended)</Text>
        <Text style={styles.optionDescription}>
          Maintain creator and owner roles separately with clear disclosure requirements
        </Text>
        <View style={styles.optionBenefits}>
          <Text style={styles.benefitText}>✓ Keep creator earnings history</Text>
          <Text style={styles.benefitText}>✓ Access both creator and business features</Text>
          <Text style={styles.benefitText}>✓ Clear conflict-of-interest policies</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.optionCard}
        onPress={() => onResolve({ type: 'transfer_creator', transferEarnings: true })}
      >
        <Text style={styles.optionTitle}>2. Transfer Creator Role</Text>
        <Text style={styles.optionDescription}>
          Transfer creator earnings and become owner-only
        </Text>
        <View style={styles.optionBenefits}>
          <Text style={styles.benefitText}>✓ Simplified single-role experience</Text>
          <Text style={styles.benefitText}>✓ No conflict-of-interest concerns</Text>
          <Text style={styles.cautionText}>⚠ Lose creator features permanently</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.optionCard}
        onPress={() => onResolve({ type: 'separate_account' })}
      >
        <Text style={styles.optionTitle}>3. Create Separate Business Account</Text>
        <Text style={styles.optionDescription}>
          Keep personal account as creator, create new business account
        </Text>
        <View style={styles.optionBenefits}>
          <Text style={styles.benefitText}>✓ Complete separation of roles</Text>
          <Text style={styles.cautionText}>⚠ Requires managing two accounts</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};
```

### Verification Service
```typescript
class RestaurantClaimingService {
  async checkExistingClaim(restaurantId: string): Promise<ExistingClaim | null> {
    const { data } = await supabase
      .from('restaurant_claims')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'verified')
      .single();
    
    return data;
  }

  async checkRoleConflicts(restaurantId: string, userId: string): Promise<RoleConflict[]> {
    const conflicts: RoleConflict[] = [];
    
    // Check creator history with this restaurant
    const { data: creatorHistory } = await supabase
      .from('creator_transactions')
      .select('amount_cents, created_at')
      .eq('creator_id', userId)
      .eq('restaurant_id', restaurantId);
    
    if (creatorHistory && creatorHistory.length > 0) {
      const totalEarnings = creatorHistory.reduce((sum, t) => sum + t.amount_cents, 0);
      conflicts.push({
        type: 'creator_earnings',
        description: `Posted ${creatorHistory.length} creator campaigns here`,
        severity: 'medium',
        metadata: { totalEarnings, campaignCount: creatorHistory.length }
      });
    }
    
    // Check existing reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select('id, rating')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId);
    
    if (reviews && reviews.length > 0) {
      conflicts.push({
        type: 'existing_reviews',
        description: `Written ${reviews.length} reviews for this restaurant`,
        severity: 'low',
        metadata: { reviewCount: reviews.length }
      });
    }
    
    return conflicts;
  }

  async initiateEmailVerification(restaurantId: string, email: string): Promise<VerificationResult> {
    const verificationCode = generateVerificationCode();
    
    // Store verification attempt
    await supabase.from('verification_attempts').insert({
      restaurant_id: restaurantId,
      method: 'email',
      contact: email,
      code: verificationCode,
      expires_at: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });
    
    // Send verification email
    await emailService.sendVerificationEmail(email, {
      restaurantName: restaurant.name,
      verificationCode,
      expirationTime: 10
    });
    
    return { success: true, expiresAt: new Date(Date.now() + 10 * 60 * 1000) };
  }

  async verifyCode(restaurantId: string, code: string): Promise<VerificationResult> {
    const { data: attempt } = await supabase
      .from('verification_attempts')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (!attempt) {
      return { success: false, error: 'Invalid or expired verification code' };
    }
    
    // Mark as verified
    await supabase.from('restaurant_claims').insert({
      restaurant_id: restaurantId,
      user_id: attempt.user_id,
      verification_method: attempt.method,
      status: 'verified',
      verified_at: new Date().toISOString()
    });
    
    return { success: true };
  }
}
```

### Business Profile Setup
```typescript
const BusinessProfileSetup: React.FC = () => {
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({});
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Complete Your Business Profile</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business Information</Text>
        
        <FormField
          label="Legal Business Name"
          value={businessInfo.legalName}
          onChangeText={(legalName) => setBusinessInfo(prev => ({ ...prev, legalName }))}
          required
        />
        
        <FormField
          label="Your Role"
          value={businessInfo.role}
          onChangeText={(role) => setBusinessInfo(prev => ({ ...prev, role }))}
          options={['Owner', 'Manager', 'Marketing Manager', 'General Manager']}
          required
        />
        
        <FormField
          label="Business Phone"
          value={businessInfo.phone}
          onChangeText={(phone) => setBusinessInfo(prev => ({ ...prev, phone }))}
          keyboardType="phone-pad"
        />
        
        <FormField
          label="Business Email"
          value={businessInfo.email}
          onChangeText={(email) => setBusinessInfo(prev => ({ ...prev, email }))}
          keyboardType="email-address"
        />
        
        <FormField
          label="Tax ID (Optional)"
          value={businessInfo.taxId}
          onChangeText={(taxId) => setBusinessInfo(prev => ({ ...prev, taxId }))}
          placeholder="For payment processing"
          secureTextEntry
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Team Members (Optional)</Text>
        <Text style={styles.sectionDescription}>
          Add team members who can help manage campaigns
        </Text>
        
        {teamMembers.map((member, index) => (
          <TeamMemberCard
            key={index}
            member={member}
            onUpdate={(updated) => updateTeamMember(index, updated)}
            onRemove={() => removeTeamMember(index)}
          />
        ))}
        
        <TouchableOpacity style={styles.addMemberButton} onPress={addTeamMember}>
          <Icon name="Plus" size={20} color="#007AFF" />
          <Text style={styles.addMemberText}>Add Team Member</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};
```

## Definition of Done
- [ ] Restaurant detail page dropdown includes "Claim This Business" option
- [ ] More tab includes "Claim Your Restaurant" entry point
- [ ] Restaurant search screen allows finding unclaimed restaurants
- [ ] All verification methods work correctly
- [ ] Role conflict resolution handles edge cases
- [ ] Business profile setup is comprehensive
- [ ] Account type changes to "business" after successful claim
- [ ] Claimed restaurants show verified badge
- [ ] Email, phone, and document verification functional
- [ ] Manual review process for complex cases
- [ ] Error handling for all failure scenarios
- [ ] Responsive design across device sizes
- [ ] Accessibility compliance for screen readers
- [ ] Unit tests cover claiming logic
- [ ] Integration tests verify end-to-end flow
- [ ] Security review for verification processes

## Notes
- Implement fraud detection for suspicious claims
- Consider integration with business verification services
- Plan for international restaurant verification
- Store verification audit trail for compliance
- Two entry points: Restaurant detail page dropdown and More tab
- After claiming, business tools appear in More tab Business section
- Restaurant owners can manage their business from the restaurant detail page
- Prevent users from claiming multiple restaurants unless justified