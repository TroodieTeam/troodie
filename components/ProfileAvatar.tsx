import React from 'react';
import { TouchableOpacity, Image, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { DS } from '@/components/design-system/tokens';
import { User } from 'lucide-react-native';

interface ProfileAvatarProps {
  size?: number;
  onPress?: () => void;
  style?: any;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ 
  size = 32, 
  onPress,
  style 
}) => {
  const router = useRouter();
  const { user, isAuthenticated, profile } = useAuth();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/(tabs)/profile');
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <TouchableOpacity 
        style={[styles.container, { width: size, height: size }, style]}
        onPress={() => router.push('/onboarding/splash')}
      >
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
          <User size={size * 0.5} color={DS.colors.textWhite} />
        </View>
      </TouchableOpacity>
    );
  }

  // Get avatar URL from profile or user object
  const avatarUrl = profile?.avatar_url || user?.avatar_url;
  const displayName = profile?.name || user?.name || user?.email;

  return (
    <TouchableOpacity 
      style={[styles.container, { width: size, height: size }, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {avatarUrl ? (
        <Image 
          source={{ uri: avatarUrl }} 
          style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.placeholderText, { fontSize: size * 0.4 }]}>
            {displayName?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
      )}
      {/* Active indicator */}
      <View style={[styles.activeIndicator, { 
        width: size * 0.25, 
        height: size * 0.25,
        borderWidth: size * 0.06,
        right: -size * 0.03,
        bottom: -size * 0.03
      }]} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatar: {
    backgroundColor: DS.colors.surfaceLight,
  },
  placeholder: {
    backgroundColor: DS.colors.primaryOrange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: DS.colors.textWhite,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    backgroundColor: '#4CAF50',
    borderRadius: 999,
    borderColor: DS.colors.surface,
  },
});