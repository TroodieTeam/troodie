import { Stack } from 'expo-router';
import React from 'react';

export default function AddLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="save-restaurant" />
      <Stack.Screen name="restaurant-details" />
      <Stack.Screen name="board-assignment" />
      <Stack.Screen name="share-restaurant" />
      <Stack.Screen name="create-board" />
      <Stack.Screen name="board-type" />
      <Stack.Screen name="board-details" />
      <Stack.Screen name="board-restaurants" />
      <Stack.Screen name="board-monetization" />
      <Stack.Screen name="communities" />
      <Stack.Screen name="community-detail" />
      <Stack.Screen name="join-community" />
      <Stack.Screen name="search-places" />
      <Stack.Screen name="find-friends" />
    </Stack>
  );
}