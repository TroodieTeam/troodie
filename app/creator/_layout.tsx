import { Stack } from 'expo-router';

export default function CreatorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="campaigns" />
      <Stack.Screen name="earnings" />
      <Stack.Screen name="analytics" />
    </Stack>
  );
}