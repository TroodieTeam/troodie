import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserState, Screen } from '@/types/core';

interface AppContextType {
  userState: UserState;
  updateUserState: (updates: Partial<UserState>) => void;
  currentScreen: Screen;
  setCurrentScreen: (screen: Screen) => void;
}

const defaultUserState: UserState = {
  id: '',
  email: '',
  friendsCount: 0,
  isNewUser: true,
  achievements: [],
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [userState, setUserState] = useState<UserState>(defaultUserState);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');

  const updateUserState = (updates: Partial<UserState>) => {
    setUserState(prev => ({ ...prev, ...updates }));
  };

  return (
    <AppContext.Provider
      value={{
        userState,
        updateUserState,
        currentScreen,
        setCurrentScreen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}