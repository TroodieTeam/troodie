import { Tabs } from 'expo-router';
import { Compass, Heart, Home, Plus, User } from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { theme } from '@/constants/theme';
import { designTokens, compactDesign } from '@/constants/designTokens';
import { useRouter } from 'expo-router';

export default function TabLayout() {
  const router = useRouter();
  const FloatingAddButton = () => (
    <TouchableOpacity
      style={styles.floatingButton}
      activeOpacity={0.8}
      onPress={() => router.push('/add')}
    >
      <Plus size={compactDesign.icon.medium} color="#FFFFFF" strokeWidth={3} />
    </TouchableOpacity>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#999',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            borderTopWidth: 1,
            borderTopColor: '#F0F0F0',
            backgroundColor: '#FFFFFF',
          },
          default: {
            borderTopWidth: 1,
            borderTopColor: '#F0F0F0',
            backgroundColor: '#FFFFFF',
          },
        }),
        tabBarLabelStyle: {
          fontSize: 10, // Reduced from 11
          fontFamily: 'Inter_500Medium',
          marginTop: -2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Home size={compactDesign.icon.medium} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <Compass size={compactDesign.icon.medium} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarIcon: () => <FloatingAddButton />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, focused }) => (
            <Heart size={compactDesign.icon.medium} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <User size={compactDesign.icon.medium} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    width: compactDesign.tabBar.height,
    height: compactDesign.tabBar.height,
    borderRadius: compactDesign.tabBar.height / 2,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...designTokens.shadows.button,
  },
});
