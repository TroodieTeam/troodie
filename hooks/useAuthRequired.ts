import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';

export function useAuthRequired() {
  const { isAuthenticated, isAnonymous } = useAuth();
  const router = useRouter();

  const requireAuth = useCallback((
    callback: () => void,
    feature?: string,
    message?: string
  ) => {
    if (isAuthenticated) {
      callback();
    } else {
      // Navigate to login instead of showing modal
      router.push('/onboarding/login');
    }
  }, [isAuthenticated, router]);

  return {
    requireAuth,
    isAuthenticated,
    isAnonymous,
  };
}