import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator, Text, View } from 'react-native';
import { Share2 } from 'lucide-react-native';
import ShareService, { ShareContent } from '@/services/shareService';
import { theme } from '@/constants/theme';
import { showToast } from '@/services/toastService';

interface ShareButtonProps {
  content: ShareContent;
  variant?: 'icon' | 'button' | 'text';
  size?: 'small' | 'medium' | 'large';
  color?: string;
  showCount?: boolean;
  shareCount?: number;
  onShareComplete?: (result: any) => void;
  style?: any;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  content,
  variant = 'icon',
  size = 'medium',
  color = theme.colors.text,
  showCount = false,
  shareCount = 0,
  onShareComplete,
  style
}) => {
  const [isSharing, setIsSharing] = useState(false);
  const [localShareCount, setLocalShareCount] = useState(shareCount);

  const handleShare = async () => {
    if (isSharing) return;
    
    setIsSharing(true);
    
    try {
      const result = await ShareService.share(content);
      
      if (result.success) {
        showToast('Shared successfully!', 'success');
        setLocalShareCount(prev => prev + 1);
        onShareComplete?.(result);
      } else if (result.action === 'dismissed') {
        // User cancelled, no need to show error
      } else {
        showToast('Failed to share', 'error');
      }
    } catch (error) {
      console.error('Share error:', error);
      showToast('Something went wrong', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 18;
      case 'large': return 28;
      default: return 24;
    }
  };

  const getButtonPadding = () => {
    switch (size) {
      case 'small': return { paddingHorizontal: 12, paddingVertical: 6 };
      case 'large': return { paddingHorizontal: 20, paddingVertical: 12 };
      default: return { paddingHorizontal: 16, paddingVertical: 8 };
    }
  };

  if (variant === 'icon') {
    return (
      <TouchableOpacity
        onPress={handleShare}
        disabled={isSharing}
        style={[styles.iconContainer, style]}
        activeOpacity={0.7}
      >
        {isSharing ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          <View style={styles.iconWrapper}>
            <Share2 size={getIconSize()} color={color} />
            {showCount && localShareCount > 0 && (
              <Text style={[styles.countText, { color }]}>{localShareCount}</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'button') {
    return (
      <TouchableOpacity
        onPress={handleShare}
        disabled={isSharing}
        style={[
          styles.button,
          getButtonPadding(),
          { backgroundColor: theme.colors.primary },
          style
        ]}
        activeOpacity={0.8}
      >
        {isSharing ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <View style={styles.buttonContent}>
            <Share2 size={getIconSize()} color="#FFFFFF" />
            <Text style={styles.buttonText}>Share</Text>
            {showCount && localShareCount > 0 && (
              <Text style={styles.buttonCount}>({localShareCount})</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'text') {
    return (
      <TouchableOpacity
        onPress={handleShare}
        disabled={isSharing}
        style={[styles.textButton, style]}
        activeOpacity={0.7}
      >
        {isSharing ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <View style={styles.textButtonContent}>
            <Share2 size={getIconSize()} color={theme.colors.primary} />
            <Text style={styles.textButtonText}>Share</Text>
            {showCount && localShareCount > 0 && (
              <Text style={styles.textButtonCount}>• {localShareCount}</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  iconContainer: {
    padding: 8,
  },
  iconWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  buttonCount: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    opacity: 0.9,
  },
  textButton: {
    padding: 8,
  },
  textButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  textButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  textButtonCount: {
    color: theme.colors.textLight,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  countText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginLeft: 2,
  },
});