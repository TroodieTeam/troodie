import { compactDesign } from '@/constants/designTokens';
import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { Compass, Heart, Home, Plus, User } from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomNavigationProps {
  currentRoute?: string;
}

export function BottomNavigation({ currentRoute }: BottomNavigationProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const navItems = [
    { name: 'home', title: 'Home', icon: Home, route: '/' },
    { name: 'explore', title: 'Explore', icon: Compass, route: '/explore' },
    { name: 'add', title: '', icon: Plus, route: '/add', isFloating: true },
    { name: 'activity', title: 'Activity', icon: Heart, route: '/activity' },
    { name: 'profile', title: 'Profile', icon: User, route: '/profile' },
  ];

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
    <View style={[
      styles.container,
      { paddingBottom: insets.bottom }
    ]}>
      <View style={styles.tabBar}>
        {navItems.map((item) => {
          const isActive = currentRoute === item.route || 
            (currentRoute === '/(tabs)' && item.route === '/');
          
          if (item.isFloating) {
            return (
              <View key={item.name} style={styles.tabItem}>
                <FloatingAddButton />
              </View>
            );
          }
          
          const IconComponent = item.icon;
          
          return (
            <TouchableOpacity
              key={item.name}
              style={styles.tabItem}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <IconComponent 
                size={compactDesign.icon.medium} 
                color={isActive ? theme.colors.primary : '#999'} 
                strokeWidth={isActive ? 2.5 : 2} 
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  floatingButton: {
    width: compactDesign.tabBar.height,
    height: compactDesign.tabBar.height,
    borderRadius: compactDesign.tabBar.height / 2,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});