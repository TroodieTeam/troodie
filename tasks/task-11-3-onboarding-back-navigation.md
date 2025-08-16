# Task 11.3: Onboarding Back Navigation

## Epic: User Experience Enhancements
**Priority**: Medium  
**Estimate**: 1 day  
**Status**: ✅ Complete  
**Assignee**: –  
**Dependencies**: None  

---

## Overview
Implement proper back navigation within the onboarding flow, allowing users to navigate between questions while preserving their previous answers and maintaining a smooth user experience.

## Business Value
- **Improved User Experience**: Users can review and modify their answers without losing progress
- **Reduced Friction**: Eliminates the frustration of losing answers when navigating back
- **Better Completion Rates**: Users are more likely to complete onboarding when they can easily correct mistakes
- **Professional Feel**: Smooth navigation enhances the app's perceived quality

## Dependencies
- Existing onboarding flow implementation
- OnboardingContext state management
- Quiz questions and answer storage

## Blocks
- Enhanced onboarding user experience
- Better user retention during onboarding
- Improved app first-impression quality

---

## Acceptance Criteria

### Feature: Onboarding Back Navigation
As a user going through the onboarding process
I want to navigate back to previous questions
So that I can review and modify my answers without losing progress

#### Scenario: Navigating back within onboarding
Given I am on Question 3 of onboarding
When I tap the back button
Then I return to Question 2
And my previous answers are preserved

#### Scenario: Navigating back from first question
Given I am on Question 1 of onboarding
When I tap the back button
Then I return to the previous onboarding screen
And my current answer is preserved

#### Scenario: Modifying previous answers
Given I am on Question 2 of onboarding
And I previously answered "Option A"
When I navigate back to Question 1
And I change my answer to "Option B"
And I navigate forward to Question 2
Then my updated answer "Option B" is displayed
And my progress is maintained

#### Scenario: Preserving answers across navigation
Given I have answered Questions 1, 2, and 3
When I navigate back to Question 1
And I navigate forward through all questions
Then all my previous answers are still selected
And I can continue from where I left off

---

## Technical Implementation

### Enhanced Quiz Navigation
```typescript
// Enhanced quiz screen with proper back navigation
export default function QuizScreen() {
  const router = useRouter();
  const { state, addQuizAnswer, setPersona, setCurrentStep } = useOnboarding();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;

  // Get the current question's answer if it exists
  const currentAnswer = state.quizAnswers.find(
    answer => answer.questionId === currentQuestion.id
  );

  const handleAnswer = (optionId: string) => {
    // Save the answer (this will update existing answers)
    addQuizAnswer({
      questionId: currentQuestion.id,
      answerId: optionId,
    });

    // Check if this was the last question
    if (currentQuestionIndex === quizQuestions.length - 1) {
      // Calculate persona with all answers
      const { persona, scores } = calculatePersona(state.quizAnswers);
      setPersona(persona, scores);
      setCurrentStep('quiz');
      router.push('/onboarding/persona-result');
    } else {
      // Move to next question
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      scrollViewRef.current?.scrollTo({ x: nextIndex * SCREEN_WIDTH, animated: true });
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      // Navigate to previous question within quiz
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      scrollViewRef.current?.scrollTo({ x: prevIndex * SCREEN_WIDTH, animated: true });
    } else {
      // Navigate back to previous onboarding screen
      router.back();
    }
  };

  // Render question with preserved answer
  const renderQuestion = () => {
    return (
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionButton,
                currentAnswer?.answerId === option.id && styles.selectedOption
              ]}
              onPress={() => handleAnswer(option.id)}
            >
              <Text style={[
                styles.optionText,
                currentAnswer?.answerId === option.id && styles.selectedOptionText
              ]}>
                {option.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };
}
```

### Enhanced OnboardingContext
```typescript
// Improved answer management in OnboardingContext
const addQuizAnswer = (answer: QuizAnswer) => {
  setState(prev => ({
    ...prev,
    quizAnswers: [
      ...prev.quizAnswers.filter(a => a.questionId !== answer.questionId),
      answer
    ]
  }));
};

// Add method to get specific answer
const getQuizAnswer = (questionId: string): QuizAnswer | undefined => {
  return state.quizAnswers.find(answer => answer.questionId === questionId);
};

// Add method to clear specific answer
const clearQuizAnswer = (questionId: string) => {
  setState(prev => ({
    ...prev,
    quizAnswers: prev.quizAnswers.filter(a => a.questionId !== questionId)
  }));
};
```

### Progress Persistence
```typescript
// Ensure progress is maintained across navigation
const initializeQuestionIndex = () => {
  // Find the last answered question or start from beginning
  const answeredQuestions = state.quizAnswers.length;
  const lastAnsweredIndex = Math.min(answeredQuestions, quizQuestions.length - 1);
  
  // If we have answers, start from the next unanswered question
  // If we're at the end, stay at the last question
  const startIndex = answeredQuestions >= quizQuestions.length 
    ? quizQuestions.length - 1 
    : answeredQuestions;
    
  setCurrentQuestionIndex(startIndex);
};

// Use this in useEffect
useEffect(() => {
  initializeQuestionIndex();
}, []);
```

### Visual Feedback for Navigation
```typescript
// Enhanced back button with visual feedback
const renderBackButton = () => {
  const canGoBack = currentQuestionIndex > 0;
  
  return (
    <TouchableOpacity 
      onPress={handleBack} 
      style={[
        styles.backButton,
        !canGoBack && styles.backButtonDisabled
      ]}
    >
      <Ionicons 
        name="chevron-back" 
        size={28} 
        color={canGoBack ? "#333" : "#999"} 
      />
    </TouchableOpacity>
  );
};
```

---

## Definition of Done

- [ ] Back navigation works properly between onboarding questions
- [ ] Previous answers are preserved when navigating back
- [ ] Users can modify previous answers and see changes reflected
- [ ] Navigation from first question goes to previous onboarding screen
- [ ] Progress indicator accurately reflects current position
- [ ] Visual feedback shows which answers are selected
- [ ] No data loss occurs during navigation
- [ ] Smooth animations between questions
- [ ] Error handling for edge cases (no answers, invalid state)
- [ ] User testing confirms intuitive navigation experience

---

## Resources

- [Current onboarding layout](app/onboarding/_layout.tsx)
- [OnboardingContext implementation](contexts/OnboardingContext.tsx)
- [Quiz screen implementation](app/onboarding/quiz.tsx)
- [Quiz questions data](data/quizQuestions.ts)

---

## Notes

### Implementation Considerations
- **State Management**: Ensure OnboardingContext properly preserves all answer data
- **Navigation Flow**: Consider how back navigation affects the overall onboarding flow
- **Performance**: Optimize for smooth transitions between questions
- **Edge Cases**: Handle scenarios where users navigate back from various states

### User Experience Improvements
- **Visual Indicators**: Show which questions have been answered
- **Progress Persistence**: Maintain progress even if user leaves and returns
- **Answer Preview**: Allow users to see their answers before proceeding
- **Skip Functionality**: Maintain skip functionality while preserving answers

### Testing Scenarios
- Test navigation between all question combinations
- Verify answer preservation across multiple navigation cycles
- Test edge cases (first question, last question, no answers)
- Validate that persona calculation still works with modified answers

### Future Enhancements
- **Answer Review**: Add a review screen showing all answers before completion
- **Answer Validation**: Prevent proceeding with invalid answer combinations
- **Auto-save**: Automatically save progress to prevent data loss
- **Resume Functionality**: Allow users to resume onboarding from where they left off
