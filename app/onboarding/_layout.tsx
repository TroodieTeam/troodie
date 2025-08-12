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
      <Stack.Screen name="signup" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="quiz-intro" />
      <Stack.Screen name="quiz" />
      <Stack.Screen name="persona-result" />
      <Stack.Screen name="favorite-spots" />
      <Stack.Screen name="complete" />
      <Stack.Screen name="login" />
    </Stack>
  );
}