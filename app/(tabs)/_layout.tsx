import { HapticTab } from '@/components/HapticTab';
import { NotificationBadge } from '@/components/NotificationBadge';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { compactDesign, designTokens } from '@/constants/designTokens';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { Tabs, useRouter } from 'expo-router';
import { Bell, Compass, Home, MoreHorizontal, Plus } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function TabLayout() {
  const router = useRouter();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const updateUnreadCountRef = useRef<() => Promise<void>>();

  const handleUnreadCountChanged = useCallback((count: number) => {
    setUnreadCount(count);
  }, []);

  const handleNotificationReceived = useCallback(() => {
    updateUnreadCountRef.current?.();
  }, []);

  const { updateUnreadCount } = useRealtimeNotifications({
    onUnreadCountChanged: handleUnreadCountChanged,
    onNotificationReceived: handleNotificationReceived,
  });

  updateUnreadCountRef.current = updateUnreadCount;

  useEffect(() => {
    if (user?.id) {
      updateUnreadCount();
    }
  }, [user?.id, updateUnreadCount]);

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
            tabBarTestID: 'tab-home',
            tabBarIcon: ({ color, focused }) => (
              <Home size={compactDesign.icon.medium} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarTestID: 'tab-explore',
            tabBarIcon: ({ color, focused }) => (
              <Compass size={compactDesign.icon.medium} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: '',
            tabBarTestID: 'tab-add',
            tabBarIcon: () => <FloatingAddButton />,
          }}
        />
        <Tabs.Screen
          name="activity"
          options={{
            title: 'Notifications',
            tabBarTestID: 'tab-notifications',
            tabBarIcon: ({ color, focused }) => (
              <View>
                <Bell size={compactDesign.icon.medium} color={color} strokeWidth={focused ? 2.5 : 2} />
                <NotificationBadge count={unreadCount} size="small" />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'More',
            tabBarTestID: 'tab-more',
            tabBarIcon: ({ color, focused }) => (
              <MoreHorizontal size={compactDesign.icon.medium} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="business"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="creator"
          options={{
            href: null, // Hide from tab bar
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
