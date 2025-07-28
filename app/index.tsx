import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const router = useRouter();
  const { loading, isAuthenticated } = useAuth();

  useEffect(() => {
    // Wait for auth to initialize
    if (loading) return;
    
    // Auth check
    
    if (isAuthenticated) {
      // User is logged in - go directly to main app
      // User authenticated, going to main app
      router.replace('/(tabs)');
    } else {
      // User is not logged in - go to onboarding
      // User not authenticated, going to onboarding
      router.replace('/onboarding/splash');
    }
  }, [router, loading, isAuthenticated]);

  // Return null as this is just a routing component
  return null;
}