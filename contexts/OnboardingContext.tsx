import React, { createContext, useContext, useState, ReactNode } from 'react';
import { OnboardingState, QuizAnswer, FavoriteSpot, PersonaType, PersonaScores, UserType, RestaurantClaimData } from '@/types/onboarding';

interface OnboardingContextType {
  state: OnboardingState;
  setPhoneNumber: (phone: string) => void;
  addQuizAnswer: (answer: QuizAnswer) => void;
  getQuizAnswer: (questionId: string) => QuizAnswer | undefined;
  clearQuizAnswer: (questionId: string) => void;
  setPersona: (persona: PersonaType, scores: PersonaScores) => void;
  addFavoriteSpot: (spot: FavoriteSpot) => void;
  removeFavoriteSpot: (category: string, name: string) => void;
  updateFavoriteSpot: (category: string, oldName: string, spot: FavoriteSpot) => void;
  setCurrentStep: (step: OnboardingState['currentStep']) => void;
  updateState: (updates: Partial<OnboardingState>) => void;
  resetOnboarding: () => void;
  // NEW: User type segmentation methods
  setUserType: (userType: UserType) => void;
  setRestaurantClaim: (data: RestaurantClaimData) => void;
  updateRestaurantClaim: (updates: Partial<RestaurantClaimData>) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const initialState: OnboardingState = {
  currentStep: 'welcome',
  quizAnswers: [],
  favoriteSpots: [],
  hasSeenQuizIntro: false
};

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(initialState);

  const setPhoneNumber = (phone: string) => {
    setState(prev => ({ ...prev, phoneNumber: phone }));
  };

  const addQuizAnswer = (answer: QuizAnswer) => {
    setState(prev => ({
      ...prev,
      quizAnswers: [...prev.quizAnswers.filter(a => a.questionId !== answer.questionId), answer]
    }));
  };

  const getQuizAnswer = (questionId: string): QuizAnswer | undefined => {
    return state.quizAnswers.find(answer => answer.questionId === questionId);
  };

  const clearQuizAnswer = (questionId: string) => {
    setState(prev => ({
      ...prev,
      quizAnswers: prev.quizAnswers.filter(a => a.questionId !== questionId)
    }));
  };

  const setPersona = (persona: PersonaType, scores: PersonaScores) => {
    setState(prev => ({ ...prev, persona, personaScores: scores }));
  };

  const addFavoriteSpot = (spot: FavoriteSpot) => {
    setState(prev => ({
      ...prev,
      favoriteSpots: [...prev.favoriteSpots, spot]
    }));
  };

  const removeFavoriteSpot = (category: string, name: string) => {
    setState(prev => ({
      ...prev,
      favoriteSpots: prev.favoriteSpots.filter(
        s => !(s.category === category && s.restaurant_name === name)
      )
    }));
  };

  const updateFavoriteSpot = (category: string, oldName: string, spot: FavoriteSpot) => {
    setState(prev => ({
      ...prev,
      favoriteSpots: prev.favoriteSpots.map(s =>
        s.category === category && s.restaurant_name === oldName ? spot : s
      )
    }));
  };

  const setCurrentStep = (step: OnboardingState['currentStep']) => {
    setState(prev => ({ 
      ...prev, 
      currentStep: step,
      // Mark intro as seen when moving to quiz
      hasSeenQuizIntro: step === 'quiz' ? true : prev.hasSeenQuizIntro
    }));
  };

  const updateState = (updates: Partial<OnboardingState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const resetOnboarding = () => {
    setState(initialState);
  };

  // NEW: Set user type for segmentation
  const setUserType = (userType: UserType) => {
    setState(prev => ({ ...prev, userType }));
  };

  // NEW: Set restaurant claim data
  const setRestaurantClaim = (data: RestaurantClaimData) => {
    setState(prev => ({ ...prev, restaurantClaim: data }));
  };

  // NEW: Update restaurant claim data (partial update)
  const updateRestaurantClaim = (updates: Partial<RestaurantClaimData>) => {
    setState(prev => ({
      ...prev,
      restaurantClaim: { ...prev.restaurantClaim, ...updates }
    }));
  };

  return (
    <OnboardingContext.Provider
      value={{
        state,
        setPhoneNumber,
        addQuizAnswer,
        getQuizAnswer,
        clearQuizAnswer,
        setPersona,
        addFavoriteSpot,
        removeFavoriteSpot,
        updateFavoriteSpot,
        setCurrentStep,
        updateState,
        resetOnboarding,
        setUserType,
        setRestaurantClaim,
        updateRestaurantClaim
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}