import { Stack } from 'expo-router';

export default function BoardsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: '#FFFFFF',
        },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}