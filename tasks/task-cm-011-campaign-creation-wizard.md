# Campaign Creation Wizard

- Epic: CM (Creator Marketplace)
- Priority: Critical
- Estimate: 3 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: CM-001, CM-002

## Overview
Build a comprehensive wizard for restaurants to create marketing campaigns targeting local creators. The wizard should guide restaurants through campaign setup with AI assistance, creator matching, and budget optimization.

## Business Value
- Core revenue driver for Creator Marketplace
- Enables restaurants to easily launch creator campaigns
- Reduces barrier to entry for restaurant marketing
- Provides structured campaign data for optimization
- Essential for marketplace two-sided growth

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Campaign Creation Wizard
  As a restaurant owner
  I want to create marketing campaigns easily
  So that I can work with local creators to promote my business

  Scenario: Basic campaign creation
    Given I am logged in as a restaurant owner
    When I start creating a new campaign
    Then I see a step-by-step wizard
    And I can set campaign goals, budget, and timeline
    And I receive AI suggestions for optimization
    And I can preview the campaign before publishing

  Scenario: Creator targeting and matching
    Given I am creating a campaign
    When I reach the creator selection step
    Then I see AI-recommended creators based on my criteria
    And I can filter creators by location, specialty, and budget
    And I can view creator portfolios and statistics
    And I can invite specific creators or make it open for applications

  Scenario: Campaign budget optimization
    Given I set a campaign budget
    When the AI analyzes my requirements
    Then I receive suggestions for budget allocation
    And I see predicted reach and engagement estimates
    And I can adjust deliverables based on budget constraints

  Scenario: Campaign preview and launch
    Given I complete all wizard steps
    When I review my campaign
    Then I see a comprehensive preview with all details
    And I can edit any section before publishing
    And I can save as draft or publish immediately
    And creators are notified when published
```

## Technical Implementation

### Wizard State Management
```typescript
interface CampaignWizardState {
  currentStep: number;
  totalSteps: number;
  campaignData: Partial<Campaign>;
  validation: Record<string, string[]>;
  aiSuggestions: AISuggestion[];
  isLoading: boolean;
  error?: string;
}

interface Campaign {
  // Basic Info
  name: string;
  description: string;
  objective: CampaignObjective;
  
  // Targeting
  targetAudience: AudienceProfile;
  targetLocation: GeoArea;
  creatorCriteria: CreatorCriteria;
  
  // Budget & Timeline
  budget: MoneyAmount;
  budgetAllocation: BudgetBreakdown;
  startDate: Date;
  endDate: Date;
  
  // Deliverables
  deliverables: Deliverable[];
  contentGuidelines: ContentGuideline[];
  
  // Creator Selection
  invitationType: 'open' | 'invite_only' | 'hybrid';
  maxCreators: number;
  preSelectedCreators: string[];
  
  // AI Predictions
  predictedReach: number;
  predictedEngagement: number;
  estimatedROI: number;
}

const useCampaignWizard = () => {
  const [state, setState] = useState<CampaignWizardState>(initialState);
  
  const updateCampaignData = useCallback((updates: Partial<Campaign>) => {
    setState(prev => ({
      ...prev,
      campaignData: { ...prev.campaignData, ...updates },
      aiSuggestions: [] // Reset suggestions when data changes
    }));
    
    // Trigger AI analysis after data update
    debounce(generateAISuggestions, 1000)(updates);
  }, []);

  const generateAISuggestions = async (campaignData: Partial<Campaign>) => {
    const suggestions = await campaignAIService.analyzeCampaign(campaignData);
    setState(prev => ({ ...prev, aiSuggestions: suggestions }));
  };

  return { state, updateCampaignData, nextStep, previousStep, saveDraft, publishCampaign };
};
```

### Wizard Steps Component
```typescript
const CampaignWizard: React.FC = () => {
  const { state, updateCampaignData, nextStep, previousStep } = useCampaignWizard();
  
  const steps = [
    { id: 1, title: 'Campaign Basics', component: CampaignBasicsStep },
    { id: 2, title: 'Target Audience', component: TargetAudienceStep },
    { id: 3, title: 'Creator Matching', component: CreatorMatchingStep },
    { id: 4, title: 'Budget & Timeline', component: BudgetTimelineStep },
    { id: 5, title: 'Deliverables', component: DeliverablesStep },
    { id: 6, title: 'Review & Launch', component: ReviewLaunchStep }
  ];

  const CurrentStepComponent = steps[state.currentStep - 1].component;

  return (
    <SafeAreaView style={styles.container}>
      <WizardHeader 
        currentStep={state.currentStep}
        totalSteps={state.totalSteps}
        title={steps[state.currentStep - 1].title}
      />
      
      <ScrollView style={styles.content}>
        <CurrentStepComponent 
          data={state.campaignData}
          onUpdate={updateCampaignData}
          suggestions={state.aiSuggestions}
          validation={state.validation}
        />
      </ScrollView>
      
      <WizardFooter
        canGoBack={state.currentStep > 1}
        canGoNext={isStepValid(state.currentStep, state.campaignData)}
        isLoading={state.isLoading}
        onBack={previousStep}
        onNext={nextStep}
        onSaveDraft={saveDraft}
      />
    </SafeAreaView>
  );
};
```

### Step 1: Campaign Basics
```typescript
const CampaignBasicsStep: React.FC<StepProps> = ({ data, onUpdate, suggestions }) => {
  const objectives = [
    { id: 'foot_traffic', title: 'Drive Foot Traffic', icon: '👥', description: 'Bring more customers to your restaurant' },
    { id: 'brand_awareness', title: 'Increase Awareness', icon: '📱', description: 'Get your restaurant noticed online' },
    { id: 'menu_promotion', title: 'Promote Menu Items', icon: '🍽️', description: 'Highlight specific dishes or specials' },
    { id: 'event_promotion', title: 'Promote Events', icon: '🎉', description: 'Market special events or occasions' }
  ];

  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>What's your campaign goal?</Text>
      
      <View style={styles.objectiveGrid}>
        {objectives.map(objective => (
          <TouchableOpacity
            key={objective.id}
            style={[
              styles.objectiveCard,
              data.objective === objective.id && styles.objectiveCardSelected
            ]}
            onPress={() => onUpdate({ objective: objective.id })}
          >
            <Text style={styles.objectiveIcon}>{objective.icon}</Text>
            <Text style={styles.objectiveTitle}>{objective.title}</Text>
            <Text style={styles.objectiveDescription}>{objective.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <AIsuggestionCard suggestions={suggestions.filter(s => s.type === 'objective')} />

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Campaign Name</Text>
        <TextInput
          style={styles.textInput}
          value={data.name}
          onChangeText={(name) => onUpdate({ name })}
          placeholder="e.g., Valentine's Day Special"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Description</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={data.description}
          onChangeText={(description) => onUpdate({ description })}
          placeholder="Describe what you want to promote..."
          multiline
          numberOfLines={4}
        />
      </View>
    </View>
  );
};
```

### Step 3: Creator Matching with AI
```typescript
const CreatorMatchingStep: React.FC<StepProps> = ({ data, onUpdate, suggestions }) => {
  const [creators, setCreators] = useState<CreatorMatch[]>([]);
  const [filters, setFilters] = useState<CreatorFilters>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    searchCreators();
  }, [data.targetAudience, data.targetLocation, filters]);

  const searchCreators = async () => {
    setLoading(true);
    try {
      const matches = await creatorMatchingService.findMatches({
        campaign: data,
        filters,
        limit: 20
      });
      setCreators(matches);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>AI-Recommended Creators</Text>
      
      <AIInsightCard>
        <Text>Found {creators.length} creators matching your criteria</Text>
        <Text>Average engagement rate: 4.2%</Text>
        <Text>Estimated total reach: {formatNumber(creators.reduce((sum, c) => sum + c.reach, 0))}</Text>
      </AIInsightCard>

      <CreatorFilters 
        filters={filters}
        onChange={setFilters}
        suggestions={suggestions.filter(s => s.type === 'creator_criteria')}
      />

      <FlatList
        data={creators}
        keyExtractor={(item) => item.creator.id}
        renderItem={({ item }) => (
          <CreatorMatchCard
            creator={item.creator}
            matchScore={item.matchScore}
            matchExplanation={item.explanation}
            onInvite={() => inviteCreator(item.creator.id)}
            onViewProfile={() => viewCreatorProfile(item.creator.id)}
          />
        )}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={searchCreators} />
        }
      />

      <View style={styles.inviteOptions}>
        <TouchableOpacity 
          style={styles.optionButton}
          onPress={() => onUpdate({ invitationType: 'open' })}
        >
          <Text>Open Applications</Text>
          <Text style={styles.optionSubtext}>Let creators apply to your campaign</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.optionButton}
          onPress={() => onUpdate({ invitationType: 'invite_only' })}
        >
          <Text>Invite Only</Text>
          <Text style={styles.optionSubtext}>Only invite specific creators</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
```

### Budget Optimization AI
```typescript
class CampaignAIService {
  async analyzeCampaign(campaignData: Partial<Campaign>): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];

    // Budget optimization
    if (campaignData.budget && campaignData.deliverables) {
      const budgetAnalysis = await this.analyzeBudget(campaignData);
      suggestions.push(...budgetAnalysis);
    }

    // Creator recommendations
    if (campaignData.targetAudience) {
      const creatorSuggestions = await this.recommendCreators(campaignData);
      suggestions.push(...creatorSuggestions);
    }

    // Timeline optimization
    if (campaignData.startDate && campaignData.objective) {
      const timingSuggestions = await this.optimizeTiming(campaignData);
      suggestions.push(...timingSuggestions);
    }

    return suggestions;
  }

  private async analyzeBudget(campaignData: Partial<Campaign>): Promise<AISuggestion[]> {
    // AI logic for budget optimization
    const suggestions = [];
    
    // Market rate analysis
    const marketRates = await this.getMarketRates(campaignData.targetLocation);
    
    // ROI predictions
    const roiPrediction = await this.predictROI(campaignData);
    
    if (roiPrediction.confidence > 0.7) {
      suggestions.push({
        type: 'budget',
        title: 'Budget Optimization',
        description: `Based on similar campaigns, consider allocating ${roiPrediction.suggestedBudget} for optimal ROI`,
        confidence: roiPrediction.confidence,
        action: 'update_budget'
      });
    }

    return suggestions;
  }
}
```

### Validation System
```typescript
const validateWizardStep = (step: number, data: Partial<Campaign>): ValidationResult => {
  const errors: Record<string, string[]> = {};

  switch (step) {
    case 1: // Campaign Basics
      if (!data.name) errors.name = ['Campaign name is required'];
      if (!data.objective) errors.objective = ['Please select a campaign objective'];
      if (!data.description || data.description.length < 20) {
        errors.description = ['Description must be at least 20 characters'];
      }
      break;

    case 2: // Target Audience
      if (!data.targetAudience) errors.targetAudience = ['Please define your target audience'];
      if (!data.targetLocation) errors.targetLocation = ['Please set target location'];
      break;

    case 4: // Budget & Timeline
      if (!data.budget || data.budget.amount <= 0) {
        errors.budget = ['Budget must be greater than $0'];
      }
      if (!data.startDate) errors.startDate = ['Start date is required'];
      if (!data.endDate) errors.endDate = ['End date is required'];
      if (data.startDate && data.endDate && data.startDate >= data.endDate) {
        errors.dateRange = ['End date must be after start date'];
      }
      break;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
```

## Definition of Done
- [ ] Complete 6-step wizard with validation
- [ ] AI suggestions for each step work correctly
- [ ] Creator matching and filtering functional
- [ ] Budget optimization provides accurate estimates
- [ ] Campaign preview shows all details correctly
- [ ] Save draft and publish functionality works
- [ ] Responsive design works on all device sizes
- [ ] Accessibility support for screen readers
- [ ] Error handling for network failures
- [ ] Unit tests cover wizard logic
- [ ] Integration tests verify end-to-end flow
- [ ] Performance optimized (< 2s step transitions)

## Notes
- Use React Hook Form for complex form state management
- Implement progressive disclosure to avoid overwhelming users
- Cache AI suggestions to reduce API calls
- Consider offline mode for draft saving
- Accessible from More tab Business Tools section
- Reference: Simplified navigation through More tab organization