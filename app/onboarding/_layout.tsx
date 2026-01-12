import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="splash" />
      <Stack.Screen name="welcome" />
      {/* User type selection - new entry point after welcome (TRO-140) */}
      <Stack.Screen name="user-type" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="verify" />
      {/* Diner/Creator path */}
      <Stack.Screen name="quiz-intro" />
      <Stack.Screen name="quiz" />
      <Stack.Screen name="persona-result" />
      <Stack.Screen name="favorite-spots" />
      <Stack.Screen name="complete" />
      {/* Restaurant path (TRO-141) */}
      <Stack.Screen name="restaurant-claim" />
      <Stack.Screen name="restaurant-complete" />
      {/* Login */}
      <Stack.Screen name="login" />
    </Stack>
  );
}