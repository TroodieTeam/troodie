/**
 * AVATAR COMPONENT
 * Design System Compliant v3.0
 * Used in all screens for user representation
 */

import React, { memo, useState } from 'react';
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { User, Camera, CheckCircle } from 'lucide-react-native';
import { DS } from './tokens';

// ============================================
// TYPES
// ============================================
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type AvatarVariant = 'user' | 'story' | 'editable';

export interface AvatarProps {
  // Data
  uri?: string | null;
  name?: string;
  
  // Appearance
  size?: AvatarSize;
  variant?: AvatarVariant;
  
  // States
  isOnline?: boolean;
  isVerified?: boolean;
  hasStory?: boolean;
  storyViewed?: boolean;
  showBorder?: boolean;
  
  // Actions
  onPress?: () => void;
  onEditPress?: () => void;
  
  // Style
  style?: ViewStyle;
  testID?: string;
}

// ============================================
// CONSTANTS
// ============================================
const SIZES = {
  xs: DS.layout.avatarSize.xs,  // 24
  sm: DS.layout.avatarSize.sm,  // 32
  md: DS.layout.avatarSize.md,  // 40 (default)
  lg: DS.layout.avatarSize.lg,  // 56
  xl: DS.layout.avatarSize.xl,  // 64 (stories)
  xxl: DS.layout.avatarSize.xxl, // 80
};

const BORDER_WIDTH = 2;
const ONLINE_INDICATOR_RATIO = 0.25;

// ============================================
// COMPONENT
// ============================================
export const Avatar = memo(({
  uri,
  name = '',
  size = 'md',
  variant = 'user',
  isOnline = false,
  isVerified = false,
  hasStory = false,
  storyViewed = false,
  showBorder = false,
  onPress,
  onEditPress,
  style,
  testID,
}: AvatarProps) => {
  const [imageError, setImageError] = useState(false);
  
  const avatarSize = SIZES[size];
  const shouldShowImage = uri && !imageError;
  
  // Get initials from name
  const getInitials = (fullName: string): string => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };
  
  // Calculate dynamic styles
  const dynamicStyles = {
    container: {
      width: avatarSize,
      height: avatarSize,
    },
    image: {
      width: avatarSize,
      height: avatarSize,
      borderRadius: avatarSize / 2,
    },
    placeholder: {
      width: avatarSize,
      height: avatarSize,
      borderRadius: avatarSize / 2,
    },
    initials: {
      fontSize: avatarSize * 0.4,
    },
    storyBorder: {
      width: avatarSize + BORDER_WIDTH * 2,
      height: avatarSize + BORDER_WIDTH * 2,
      borderRadius: (avatarSize + BORDER_WIDTH * 2) / 2,
    },
    onlineIndicator: {
      width: avatarSize * ONLINE_INDICATOR_RATIO,
      height: avatarSize * ONLINE_INDICATOR_RATIO,
      borderRadius: (avatarSize * ONLINE_INDICATOR_RATIO) / 2,
      bottom: 0,
      right: 0,
    },
    verifiedBadge: {
      bottom: -2,
      right: -2,
    },
    editButton: {
      width: avatarSize * 0.3,
      height: avatarSize * 0.3,
      borderRadius: (avatarSize * 0.3) / 2,
      bottom: 0,
      right: 0,
    },
  };
  
  // Render the avatar image or placeholder
  const renderAvatar = () => {
    if (shouldShowImage) {
      return (
        <Image
          source={{ uri }}
          style={[styles.image, dynamicStyles.image]}
          onError={() => setImageError(true)}
          testID={`${testID}-image`}
        />
      );
    }
    
    // Show initials or default icon
    return (
      <View style={[styles.placeholder, dynamicStyles.placeholder]}>
        {name ? (
          <Text style={[styles.initials, dynamicStyles.initials]}>
            {getInitials(name)}
          </Text>
        ) : (
          <User 
            size={avatarSize * 0.5} 
            color={DS.colors.textGray}
          />
        )}
      </View>
    );
  };
  
  // Render story border if needed
  const renderStoryBorder = () => {
    if (!hasStory && !showBorder) return null;
    
    const borderColor = hasStory 
      ? (storyViewed ? DS.colors.borderLight : DS.colors.primaryOrange)
      : DS.colors.border;
    
    return (
      <View 
        style={[
          styles.storyBorder,
          dynamicStyles.storyBorder,
          { borderColor }
        ]}
      />
    );
  };
  
  // Render status indicators
  const renderIndicators = () => {
    return (
      <>
        {/* Online indicator */}
        {isOnline && (
          <View style={[styles.onlineIndicator, dynamicStyles.onlineIndicator]} />
        )}
        
        {/* Verified badge */}
        {isVerified && size !== 'xs' && (
          <View style={[styles.verifiedBadge, dynamicStyles.verifiedBadge]}>
            <CheckCircle 
              size={avatarSize * 0.3} 
              color={DS.colors.info}
              fill={DS.colors.surface}
            />
          </View>
        )}
        
        {/* Edit button for editable variant */}
        {variant === 'editable' && onEditPress && (
          <TouchableOpacity
            style={[styles.editButton, dynamicStyles.editButton]}
            onPress={onEditPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Camera size={avatarSize * 0.2} color={DS.colors.textWhite} />
          </TouchableOpacity>
        )}
      </>
    );
  };
  
  const containerContent = (
    <View style={[styles.container, dynamicStyles.container, style]}>
      {renderStoryBorder()}
      <View style={styles.avatarWrapper}>
        {renderAvatar()}
        {renderIndicators()}
      </View>
    </View>
  );
  
  // Wrap in TouchableOpacity if onPress is provided
  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        testID={testID}
      >
        {containerContent}
      </TouchableOpacity>
    );
  }
  
  return <View testID={testID}>{containerContent}</View>;
});

Avatar.displayName = 'Avatar';

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  image: {
    backgroundColor: DS.colors.surfaceLight,
  },
  placeholder: {
    backgroundColor: DS.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    ...DS.typography.body,
    fontWeight: '600',
    color: DS.colors.textGray,
  },
  storyBorder: {
    position: 'absolute',
    borderWidth: BORDER_WIDTH,
  },
  onlineIndicator: {
    position: 'absolute',
    backgroundColor: DS.colors.success,
    borderWidth: 2,
    borderColor: DS.colors.surface,
  },
  verifiedBadge: {
    position: 'absolute',
  },
  editButton: {
    position: 'absolute',
    backgroundColor: DS.colors.primaryOrange,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: DS.colors.surface,
  },
});

export default Avatar;