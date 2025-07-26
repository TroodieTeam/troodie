import { boardService } from '@/services/boardService';
import { communityService } from '@/services/communityService';
import { postService } from '@/services/postService';
import { Screen, UserState } from '@/types/core';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

interface AppState {
  userState: UserState;
  hasCreatedBoard: boolean;
  hasCreatedPost: boolean;
  hasJoinedCommunity: boolean;
  networkProgress: number;
}

interface AppContextType {
  userState: UserState;
  updateUserState: (updates: Partial<UserState>) => void;
  currentScreen: Screen;
  setCurrentScreen: (screen: Screen) => void;
  hasCreatedBoard: boolean;
  hasCreatedPost: boolean;
  hasJoinedCommunity: boolean;
  networkProgress: number;
  updateNetworkProgress: (action: 'board' | 'post' | 'community') => void;
}

const defaultUserState: UserState = {
  id: '',
  email: '',
  friendsCount: 0,
  isNewUser: true,
  hasLimitedActivity: true,
  achievements: [],
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    userState: defaultUserState,
    hasCreatedBoard: false,
    hasCreatedPost: false,
    hasJoinedCommunity: false,
    networkProgress: 0
  });
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');

  const updateUserState = (updates: Partial<UserState>) => {
    setState(prev => ({ 
      ...prev, 
      userState: { ...prev.userState, ...updates } 
    }));
  };

  // Update network progress when user completes actions
  const updateNetworkProgress = useCallback((action: 'board' | 'post' | 'community') => {
    setState(prev => {
      const updates: Partial<AppState> = {};
      
      switch (action) {
        case 'board':
          updates.hasCreatedBoard = true;
          break;
        case 'post':
          updates.hasCreatedPost = true;
          break;
        case 'community':
          updates.hasJoinedCommunity = true;
          break;
      }
      
      const newProgress = [
        updates.hasCreatedBoard ?? prev.hasCreatedBoard,
        updates.hasCreatedPost ?? prev.hasCreatedPost,
        updates.hasJoinedCommunity ?? prev.hasJoinedCommunity
      ].filter(Boolean).length;
      
      return {
        ...prev,
        ...updates,
        networkProgress: newProgress
      };
    });
  }, []);

  // Check network progress on app load
  useEffect(() => {
    const checkNetworkProgress = async () => {
      if (!state.userState.id) return;
      
      try {
        const [boards, posts, communities] = await Promise.all([
          boardService.getUserBoards(state.userState.id),
          postService.getUserPosts(state.userState.id),
          communityService.getUserCommunities(state.userState.id)
        ]);
        
        setState(prev => ({
          ...prev,
          hasCreatedBoard: boards.length > 0,
          hasCreatedPost: posts.length > 0,
          hasJoinedCommunity: communities.length > 0,
          networkProgress: [
            boards.length > 0,
            posts.length > 0,
            communities.length > 0
          ].filter(Boolean).length
        }));
      } catch (error) {
        console.error('Error checking network progress:', error);
      }
    };
    
    checkNetworkProgress();
  }, [state.userState.id]);

  return (
    <AppContext.Provider
      value={{
        userState: state.userState,
        updateUserState,
        currentScreen,
        setCurrentScreen,
        hasCreatedBoard: state.hasCreatedBoard,
        hasCreatedPost: state.hasCreatedPost,
        hasJoinedCommunity: state.hasJoinedCommunity,
        networkProgress: state.networkProgress,
        updateNetworkProgress,
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