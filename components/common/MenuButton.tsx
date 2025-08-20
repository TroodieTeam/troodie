import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Platform,
  ViewStyle,
  TouchableOpacityProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MenuButtonProps extends TouchableOpacityProps {
  size?: number;
  color?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

/**
 * MenuButton component with iPad-optimized touch targets
 * Ensures minimum 44x44 point touch area as per Apple HIG
 */
export function MenuButton({
  size = 20,
  color = '#666',
  iconName = 'ellipsis-horizontal',
  style,
  onPress,
  ...props
}: MenuButtonProps) {
  const isPad = Platform.OS === 'ios' && Platform.isPad;
  
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,
        isPad && styles.buttonIPad,
        style
      ]}
      hitSlop={
        isPad 
          ? { top: 15, bottom: 15, left: 15, right: 15 }
          : { top: 10, bottom: 10, left: 10, right: 10 }
      }
      activeOpacity={0.7}
      {...props}
    >
      <Ionicons name={iconName} size={isPad ? size + 4 : size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonIPad: {
    minWidth: 44,
    minHeight: 44,
    padding: 10,
  },
});