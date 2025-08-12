import { useOnboarding } from '@/contexts/OnboardingContext';
import { quizQuestions } from '@/data/quizQuestions';
import { calculatePersona } from '@/utils/personaCalculator';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

  // Initialize question index based on existing answers
  React.useEffect(() => {
    // Find the last answered question or start from beginning
    const answeredQuestions = state.quizAnswers.length;
    if (answeredQuestions > 0 && answeredQuestions < quizQuestions.length) {
      // Start from the next unanswered question
      setCurrentQuestionIndex(answeredQuestions);
      scrollViewRef.current?.scrollTo({ x: answeredQuestions * SCREEN_WIDTH, animated: false });
    }
  }, []);

  React.useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex]);

  const handleAnswer = (optionId: string) => {
    // Save the answer (this will update existing answers)
    addQuizAnswer({
      questionId: currentQuestion.id,
      answerId: optionId,
    });

    // Check if this was the last question
    if (currentQuestionIndex === quizQuestions.length - 1) {
      // Calculate persona with updated answers
      const allAnswers = [
        ...state.quizAnswers.filter(a => a.questionId !== currentQuestion.id),
        { questionId: currentQuestion.id, answerId: optionId }
      ];
      const { persona, scores } = calculatePersona(allAnswers);
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

  const handleSkip = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      scrollViewRef.current?.scrollTo({ x: nextIndex * SCREEN_WIDTH, animated: true });
    } else {
      // If skipping the last question, still calculate persona with existing answers
      if (state.quizAnswers.length >= quizQuestions.length / 2) {
        const { persona, scores } = calculatePersona(state.quizAnswers);
        setPersona(persona, scores);
        setCurrentStep('quiz');
        router.push('/onboarding/persona-result');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={handleBack} 
          style={styles.backButton}
        >
          <Ionicons 
            name="chevron-back" 
            size={28} 
            color="#333" 
          />
        </TouchableOpacity>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View 
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {currentQuestionIndex + 1} of {quizQuestions.length}
          </Text>
        </View>

        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
      >
        {quizQuestions.map((question, index) => (
          <View key={question.id} style={styles.questionContainer}>
            <Text style={styles.questionNumber}>Question {index + 1}</Text>
            <Text style={styles.questionText}>{question.question}</Text>
            
            <View style={styles.optionsContainer}>
              {question.options.map((option) => {
                // Check if this option was previously selected
                const isSelected = index === currentQuestionIndex && 
                  currentAnswer?.answerId === option.id;
                const wasAnswered = state.quizAnswers.find(
                  a => a.questionId === question.id
                )?.answerId === option.id;
                
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.optionButton,
                      (isSelected || (index === currentQuestionIndex && wasAnswered)) && styles.selectedOption
                    ]}
                    onPress={() => index === currentQuestionIndex && handleAnswer(option.id)}
                  >
                    <View style={styles.optionContent}>
                      <View style={[
                        styles.optionLetter,
                        (isSelected || (index === currentQuestionIndex && wasAnswered)) && styles.selectedOptionLetter
                      ]}>
                        <Text style={[
                          styles.optionLetterText,
                          (isSelected || (index === currentQuestionIndex && wasAnswered)) && styles.selectedOptionLetterText
                        ]}>{option.id}</Text>
                      </View>
                      <Text style={[
                        styles.optionText,
                        (isSelected || (index === currentQuestionIndex && wasAnswered)) && styles.selectedOptionText
                      ]}>{option.text}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFAD27',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  skipButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  skipText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#FFAD27',
  },
  questionContainer: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  questionNumber: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: '#333',
    marginBottom: 40,
    lineHeight: 36,
  },
  optionsContainer: {
    gap: 16,
  },
  optionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionLetterText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#333',
    lineHeight: 22,
  },
  selectedOption: {
    borderColor: '#FFAD27',
    backgroundColor: '#FFF9F0',
  },
  selectedOptionLetter: {
    backgroundColor: '#FFAD27',
  },
  selectedOptionLetterText: {
    color: '#FFFFFF',
  },
  selectedOptionText: {
    color: '#333',
    fontFamily: 'Inter_600SemiBold',
  },
});