# Task 11.4: Onboarding Quiz Intro Screen

## Epic: User Experience Enhancements
**Priority**: Medium  
**Estimate**: 0.75 day  
**Status**: 🟡 Needs Review  
**Assignee**: –  
**Dependencies**: None  

---

## Overview
Add an introductory screen before the onboarding quiz that explains why the quiz matters, how it personalizes the user experience, and what benefits users will receive from completing it. This screen will set proper expectations and increase quiz completion rates.

## Business Value
- **Increased Completion Rates**: Users understand the value and are more likely to complete the quiz
- **Better User Expectations**: Clear explanation of how personalization works
- **Improved Onboarding Flow**: More professional and informative user experience
- **Higher Engagement**: Users feel invested in the process when they understand the benefits

## Dependencies
- Existing onboarding flow implementation
- Quiz questions and persona system
- OnboardingContext state management

## Blocks
- Enhanced onboarding user experience
- Better quiz completion rates
- Improved user understanding of personalization

---

## Acceptance Criteria

### Feature: Onboarding Quiz Introduction
As a user who has created an account
I want to understand why the quiz matters before starting it
So that I can make informed decisions and get the most personalized experience

#### Scenario: Viewing onboarding intro
Given I have created an account
When onboarding begins
Then I see a brief intro explaining why the quiz matters and how it personalizes results
And I must tap "Continue" to proceed to Question 1

#### Scenario: Understanding personalization benefits
Given I am on the quiz intro screen
When I read the explanation
Then I understand that my answers will create a personalized food persona
And I know this will improve my restaurant recommendations and community experience

#### Scenario: Proceeding to quiz
Given I am on the quiz intro screen
When I tap "Continue"
Then I am taken to Question 1 of the quiz
And the intro screen is not shown again during this onboarding session

#### Scenario: Skipping intro (optional)
Given I am on the quiz intro screen
When I tap "Skip Intro" (if implemented)
Then I proceed directly to Question 1
And the intro is marked as seen for future reference

---

## Technical Implementation

### New Intro Screen Component
```typescript
// app/onboarding/quiz-intro.tsx
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function QuizIntroScreen() {
  const router = useRouter();
  const { setCurrentStep } = useOnboarding();

  const handleContinue = () => {
    setCurrentStep('quiz');
    router.push('/onboarding/quiz');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="restaurant" size={80} color="#FFAD27" />
        </View>

        <Text style={styles.title}>Let's Personalize Your Experience</Text>
        
        <Text style={styles.subtitle}>
          Answer a few quick questions to help us understand your food preferences
        </Text>

        <View style={styles.benefitsContainer}>
          <View style={styles.benefitItem}>
            <Ionicons name="star" size={24} color="#FFAD27" />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Better Recommendations</Text>
              <Text style={styles.benefitDescription}>
                Get restaurant suggestions that match your taste and style
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="people" size={24} color="#FFAD27" />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Connect with Food Lovers</Text>
              <Text style={styles.benefitDescription}>
                Find people who share your culinary interests
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="compass" size={24} color="#FFAD27" />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Discover Your Food Persona</Text>
              <Text style={styles.benefitDescription}>
                Learn about your unique dining personality
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.quizInfo}>
          This quick quiz takes about 2 minutes and helps us create your personalized food profile.
        </Text>
      </View>

      <View style={styles.bottomContent}>
        <TouchableOpacity 
          style={styles.continueButton} 
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Continue to Quiz</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

### Updated Onboarding Layout
```typescript
// app/onboarding/_layout.tsx
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="splash" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="quiz-intro" /> {/* New intro screen */}
      <Stack.Screen name="quiz" />
      <Stack.Screen name="persona-result" />
      <Stack.Screen name="favorite-spots" />
      <Stack.Screen name="complete" />
      <Stack.Screen name="login" />
    </Stack>
  );
}
```

### Enhanced OnboardingContext
```typescript
// Add intro tracking to OnboardingContext
interface OnboardingState {
  currentStep: OnboardingState['currentStep'];
  quizAnswers: QuizAnswer[];
  favoriteSpots: FavoriteSpot[];
  hasSeenQuizIntro?: boolean; // Track if user has seen intro
}

const initialState: OnboardingState = {
  currentStep: 'welcome',
  quizAnswers: [],
  favoriteSpots: [],
  hasSeenQuizIntro: false
};

// Add method to mark intro as seen
const markQuizIntroSeen = () => {
  setState(prev => ({ ...prev, hasSeenQuizIntro: true }));
};

// Enhanced setCurrentStep to handle intro flow
const setCurrentStep = (step: OnboardingState['currentStep']) => {
  setState(prev => ({ 
    ...prev, 
    currentStep: step,
    // Mark intro as seen when moving to quiz
    hasSeenQuizIntro: step === 'quiz' ? true : prev.hasSeenQuizIntro
  }));
};
```

### Navigation Flow Logic
```typescript
// In the screen that leads to quiz (e.g., verify.tsx)
const handleQuizNavigation = () => {
  const { hasSeenQuizIntro } = state;
  
  if (hasSeenQuizIntro) {
    // Skip intro if already seen
    setCurrentStep('quiz');
    router.push('/onboarding/quiz');
  } else {
    // Show intro for first-time users
    setCurrentStep('quiz-intro');
    router.push('/onboarding/quiz-intro');
  }
};
```

### Styling for Intro Screen
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF7',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  benefitsContainer: {
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  benefitText: {
    flex: 1,
    marginLeft: 16,
  },
  benefitTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    lineHeight: 20,
  },
  quizInfo: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bottomContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  continueButton: {
    backgroundColor: '#FFAD27',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    marginRight: 8,
  },
});
```

---

## Definition of Done

- [ ] Quiz intro screen implemented with clear explanation of benefits
- [ ] Screen explains personalization and quiz purpose
- [ ] "Continue" button navigates to Question 1
- [ ] Back navigation works properly
- [ ] Intro screen is integrated into onboarding flow
- [ ] OnboardingContext tracks intro viewing status
- [ ] Visual design matches app's design system
- [ ] Content is clear and engaging
- [ ] No technical errors or navigation issues
- [ ] User testing confirms improved understanding and engagement

---

## Resources

- [Current onboarding layout](app/onboarding/_layout.tsx)
- [OnboardingContext implementation](contexts/OnboardingContext.tsx)
- [Quiz questions data](data/quizQuestions.ts)
- [Persona calculation utility](utils/personaCalculator.ts)

---

## Notes

### Content Considerations
- **Clear Value Proposition**: Explain specific benefits users will receive
- **Time Expectation**: Set proper expectations about quiz duration
- **Privacy Assurance**: Mention that answers are used only for personalization
- **Optional Nature**: Consider if users can skip (though not recommended)

### Design Considerations
- **Visual Hierarchy**: Clear progression from title to benefits to action
- **Icon Usage**: Use relevant icons to illustrate each benefit
- **Color Consistency**: Match app's color scheme and design tokens
- **Typography**: Use consistent font families and sizing

### User Experience Improvements
- **Progress Indication**: Show where user is in the onboarding flow
- **Skip Option**: Consider adding a skip option for returning users
- **Animation**: Add subtle animations to make the screen more engaging
- **Accessibility**: Ensure screen is accessible to all users

### Testing Scenarios
- Test navigation flow from different entry points
- Verify intro is shown only once per user
- Test back navigation and edge cases
- Validate content clarity and user understanding

### Future Enhancements
- **A/B Testing**: Test different intro content and layouts
- **Analytics**: Track intro completion rates and user engagement
- **Localization**: Prepare for multiple language support
- **Dynamic Content**: Show different benefits based on user context
