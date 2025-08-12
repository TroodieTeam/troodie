import React, { createContext, useContext, useState, ReactNode } from 'react';
import { OnboardingState, QuizAnswer, FavoriteSpot, PersonaType, PersonaScores } from '@/types/onboarding';

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
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const initialState: OnboardingState = {
  currentStep: 'welcome',
  quizAnswers: [],
  favoriteSpots: []
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
    setState(prev => ({ ...prev, currentStep: step }));
  };

  const updateState = (updates: Partial<OnboardingState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const resetOnboarding = () => {
    setState(initialState);
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
        resetOnboarding
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