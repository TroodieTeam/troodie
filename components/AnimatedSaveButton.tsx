import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  ActivityIndicator,
  ViewStyle
} from 'react-native';
import { Bookmark } from 'lucide-react-native';
import { designTokens } from '@/constants/designTokens';

interface AnimatedSaveButtonProps {
  onPress: (e: any) => void;
  onLongPress?: (e: any) => void;
  isSaved: boolean;
  isLoading?: boolean;
  style?: ViewStyle;
  size?: number;
}

export const AnimatedSaveButton: React.FC<AnimatedSaveButtonProps> = ({
  onPress,
  onLongPress,
  isSaved,
  isLoading,
  style,
  size = 18
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const colorAnim = useRef(new Animated.Value(isSaved ? 1 : 0)).current;

  useEffect(() => {
    // Animate color transition
    Animated.timing(colorAnim, {
      toValue: isSaved ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isSaved]);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.85,
        useNativeDriver: true,
      }),
      Animated.spring(rotateAnim, {
        toValue: -0.1,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 3,
        tension: 40,
      }),
      Animated.spring(rotateAnim, {
        toValue: 0,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handlePress = (e: any) => {
    e.stopPropagation();
    
    // Trigger bounce animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();

    onPress(e);
  };

  const interpolatedColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [designTokens.colors.textLight, designTokens.colors.primaryOrange]
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-15deg', '15deg']
  });

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
      disabled={isLoading}
    >
      <Animated.View
        style={{
          transform: [
            { scale: scaleAnim },
            { rotate: rotate }
          ]
        }}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={designTokens.colors.textMedium} />
        ) : (
          <Animated.View>
            <Bookmark
              size={size}
              color={isSaved ? designTokens.colors.primaryOrange : designTokens.colors.textLight}
              fill={isSaved ? designTokens.colors.primaryOrange : 'transparent'}
            />
          </Animated.View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
    alignSelf: 'center',
  }
});