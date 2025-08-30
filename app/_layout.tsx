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
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';

import { toastConfig } from '@/components/CustomToast';
import { NetworkStatusBanner } from '@/components/NetworkStatusBanner';
import { AppProvider } from '@/contexts/AppContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { BackgroundTaskManager } from '@/utils/backgroundTasks';
import * as Sentry from '@sentry/react-native';
import { useEffect, useCallback, useState } from 'react';
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
      console.log('Handling deep link:', url);
      
      // Parse the URL to extract the path
      const parsed = Linking.parse(url);
      console.log('Parsed URL:', parsed);
      
      // Extract the path from the URL
      // Handle Expo dev URLs that have --/ prefix
      let path = parsed.path || '';
      if (path.includes('--/')) {
        path = path.split('--/')[1];
      }
      
      console.log('Extracted path:', path);
      
      // Handle different deep link patterns
      if (path) {
        // Remove leading slash if present
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        
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
      console.log('App received URL:', url);
      handleDeepLink(url);
    });
    
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

  return (
    <AppProvider>
      <OnboardingProvider>
        <ThemeProvider value={DefaultTheme}>
          <NetworkStatusBanner />
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="add" options={{ headerShown: false }} />
            <Stack.Screen name="restaurant/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="boards/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="posts/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="user/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="find-friends" options={{ headerShown: false }} />
            <Stack.Screen name="user/[id]/following" options={{ headerShown: false }} />
            <Stack.Screen name="user/[id]/followers" options={{ headerShown: false }} />
            <Stack.Screen name="settings/blocked-users" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="dark" />
          <Toast config={toastConfig} />
        </ThemeProvider>
      </OnboardingProvider>
    </AppProvider>
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