// IMPORTANT: Polyfills must be imported FIRST
import 'react-native-url-polyfill/auto';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { toastConfig } from '@/components/CustomToast';
import { NetworkStatusBanner } from '@/components/NetworkStatusBanner';
import { AppProvider } from '@/contexts/AppContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import config from '@/lib/config';
import { BackgroundTaskManager } from '@/utils/backgroundTasks';
import * as Sentry from '@sentry/react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import { useCallback, useEffect } from 'react';
import { View } from 'react-native';

Sentry.init({
  dsn: 'https://154af650ab170036784f1db10af4e5b8@o4509745606230016.ingest.us.sentry.io/4509745609900032',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Inner layout component that has access to auth context
function InnerLayout() {
  const router = useRouter();

  // Handle deep links
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      console.log('[Deep Link] Received URL:', url);
      // Parse the URL to extract the path
      const parsed = Linking.parse(url);
      console.log('[Deep Link] Parsed:', parsed);
      
      // Extract the path from the URL
      // Handle Expo dev URLs that have --/ prefix
      let path = parsed.path || '';
      if (path.includes('--/')) {
        path = path.split('--/')[1];
      }

      // Handle different deep link patterns
      if (path) {
        // Remove leading slash if present
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        console.log('[Deep Link] Clean path:', cleanPath);
        
        // Add a small delay to ensure navigation is ready
        setTimeout(() => {
          // Check for different route patterns
          if (cleanPath.startsWith('restaurant/')) {
            const id = cleanPath.replace('restaurant/', '');
            console.log('Navigating to restaurant:', id);
            router.push(`/restaurant/${id}`);
          } else if (cleanPath.startsWith('user/')) {
            const id = cleanPath.replace('user/', '');
            console.log('Navigating to user:', id);
            router.push(`/user/${id}`);
          } else if (cleanPath.startsWith('posts/')) {
            const id = cleanPath.replace('posts/', '');
            console.log('Navigating to post:', id);
            router.push(`/posts/${id}`);
          } else if (cleanPath.startsWith('boards/')) {
            const id = cleanPath.replace('boards/', '');
            console.log('Navigating to board:', id);
            router.push(`/boards/${id}`);
          } else if (cleanPath.startsWith('stripe/onboarding/')) {
            // Handle Stripe onboarding deep links
            const isReturn = cleanPath.includes('/return');
            const isRefresh = cleanPath.includes('/refresh');
            
            console.log('[Deep Link] ✅ Stripe onboarding callback detected!', { 
              isReturn, 
              isRefresh, 
              path: cleanPath,
              fullUrl: url,
              parsed
            });
            
            // Extract account_type from query params if present
            const accountType = parsed.queryParams?.account_type || 'business';
            
            console.log('[Deep Link] Navigating to campaign creation with params:', {
              stripeRefresh: 'true',
              accountType
            });
            
            // Navigate to campaign creation page with refresh trigger
            // The campaign creation page will handle refreshing the Stripe account status
            router.push({
              pathname: '/(tabs)/business/campaigns/create',
              params: {
                stripeRefresh: 'true',
                accountType: accountType as string,
              },
            });
            
            console.log('[Deep Link] Navigation triggered');
          } else {
            console.log('[Deep Link] ⚠️ Unhandled deep link path:', cleanPath);
          }
        }, 100);
      }
    };

    // Get the initial URL if the app was launched from a deep link
    const getInitialURL = async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        console.log('App opened with URL:', url);
        // Add a delay to ensure the app is fully initialized
        setTimeout(() => handleDeepLink(url), 500);
      }
    };

    getInitialURL();

    // Subscribe to incoming links
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('[Deep Link] App received URL event:', url);
      handleDeepLink(url);
    });
    
    // Also listen for app state changes (when app comes to foreground)
    // This helps catch deep links when returning from browser
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log('[Deep Link] App became active, checking for pending deep link...');
        // Small delay to ensure app is fully active
        setTimeout(async () => {
          const url = await Linking.getInitialURL();
          if (url && url.includes('stripe/onboarding')) {
            console.log('[Deep Link] Found pending Stripe deep link:', url);
            handleDeepLink(url);
          }
        }, 500);
      }
    };
    
    // Note: AppState listener would need to be imported from react-native
    // For now, the Linking.addEventListener should handle it
    
    return () => {
      subscription.remove();
    };
  }, [router]);

  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Get auth loading state
  const { loading: authLoading } = useAuth();

  // Coordinate splash screen hiding with both font and auth loading
  const onLayoutRootView = useCallback(async () => {
    if ((fontsLoaded || fontError) && !authLoading) {
      // Hide the splash screen only when both fonts and auth are ready
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, authLoading]);

  useEffect(() => {
    // Initialize background tasks
    const backgroundTaskManager = BackgroundTaskManager.getInstance();
    backgroundTaskManager.startBackgroundTasks();

    // Cleanup on unmount
    return () => {
      backgroundTaskManager.cleanup();
    };
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && !authLoading) {
      onLayoutRootView();
    }
  }, [fontsLoaded, fontError, authLoading, onLayoutRootView]);

  // Keep splash screen visible while fonts or auth are loading
  if (!fontsLoaded && !fontError) {
    // Return a View instead of null to prevent flash
    return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
  }

  if (authLoading) {
    // Keep showing splash while auth loads
    return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
  }

  const AppContent = (
    <AppProvider>
      <OnboardingProvider>
        <ThemeProvider value={DefaultTheme}>
          <NetworkStatusBanner />
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="add" options={{ headerShown: false }} />
            <Stack.Screen name="boards" options={{ headerShown: false }} />
            <Stack.Screen name="business" options={{ headerShown: false }} />
            <Stack.Screen name="creator" options={{ headerShown: false }} />
            <Stack.Screen name="restaurant/[id]/analytics" options={{ headerShown: false }} />
            <Stack.Screen name="restaurant/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="boards/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="posts/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="posts/[id]/comments" options={{ headerShown: false }} />
            <Stack.Screen name="user/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="find-friends" options={{ headerShown: false }} />
            <Stack.Screen name="user/[id]/following" options={{ headerShown: false }} />
            <Stack.Screen name="user/[id]/followers" options={{ headerShown: false }} />
            <Stack.Screen name="settings/blocked-users" options={{ headerShown: false }} />
            <Stack.Screen name="settings/content-creator" options={{ headerShown: false }} />
            <Stack.Screen name="admin/reviews" options={{ headerShown: false }} />
            <Stack.Screen name="quick-saves" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="dark" />
          <Toast config={toastConfig} />
        </ThemeProvider>
      </OnboardingProvider>
    </AppProvider>
  );

  // Get proper urlScheme for Stripe redirects (per Expo docs)
  const urlScheme = Constants.appOwnership === 'expo'
    ? Linking.createURL('/--/')
    : Linking.createURL('');

  return (
    <SafeAreaProvider>
      {config.stripePublishableKey ? (
        <StripeProvider 
          publishableKey={config.stripePublishableKey}
          urlScheme={urlScheme}
        >
          {AppContent}
        </StripeProvider>
      ) : (
        AppContent
      )}
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
  }

  return (
    <AuthProvider>
      <InnerLayout />
    </AuthProvider>
  );
});