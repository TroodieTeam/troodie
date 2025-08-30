import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const router = useRouter();
  const { loading, isAuthenticated, isAnonymous } = useAuth();

  useEffect(() => {
    // Wait for auth to initialize
    if (loading) return;
    
    // Auth check
    
    if (isAuthenticated || isAnonymous) {
      // User is logged in or browsing anonymously - go directly to main app
      // User authenticated or anonymous, going to main app
      router.replace('/(tabs)');
    } else {
      // User is not logged in - go to onboarding
      // User not authenticated, going to onboarding
      router.replace('/onboarding/splash');
    }
  }, [router, loading, isAuthenticated, isAnonymous]);

  // Return null to prevent any flash - the splash screen is handled in _layout.tsx
  return null;
}