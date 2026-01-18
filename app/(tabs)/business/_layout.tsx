import { Stack } from 'expo-router';
import React from 'react';

export default function BusinessLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Hide stack headers since screens have their own
      }}
    >
      <Stack.Screen
        name="dashboard"
        options={{
          title: 'Business Dashboard',
          headerBackVisible: true,
        }}
      />
      <Stack.Screen
        name="campaigns/index"
        options={{
          title: 'Manage Campaigns',
          headerBackVisible: true,
        }}
      />
      <Stack.Screen
        name="campaigns/[id]"
        options={{
          title: 'Campaign Details',
          headerBackVisible: true,
        }}
      />
      <Stack.Screen
        name="analytics"
        options={{
          title: 'Business Analytics',
          headerBackVisible: true,
        }}
      />
      <Stack.Screen
        name="applications"
        options={{
          title: 'Review Applications',
          headerBackVisible: true,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Restaurant Settings',
          headerBackVisible: true,
        }}
      />
      <Stack.Screen
        name="restaurant-settings"
        options={{
          title: 'Restaurant Settings',
          headerBackVisible: true,
        }}
      />
      <Stack.Screen
        name="campaigns/create"
        options={{
          title: 'Create Campaign',
          presentation: 'modal',
          headerBackVisible: true,
        }}
      />
      <Stack.Screen
        name="creators/browse"
        options={{
          title: 'Discover Creators',
          headerBackVisible: true,
        }}
      />
    </Stack>
  );
}