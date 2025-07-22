import { Stack } from 'expo-router';

export default function AddLayout() {
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
      <Stack.Screen name="create-post" />
      <Stack.Screen name="post-preview" />
      <Stack.Screen name="post-success" />
      <Stack.Screen name="restaurant-details" />
      <Stack.Screen name="save-restaurant" />
      <Stack.Screen name="save-success" />
      <Stack.Screen name="share-restaurant" />
      <Stack.Screen name="create-board" />
      <Stack.Screen name="board-details" />
      <Stack.Screen name="board-assignment" />
      <Stack.Screen name="communities" />
      <Stack.Screen name="community-detail" />
    </Stack>
  );
}