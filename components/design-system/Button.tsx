/**
 * BUTTON COMPONENT
 * Design System Compliant v3.0
 * 3 variants: Primary, Secondary, Text
 */

import React, { memo } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { DS } from './tokens';

// ============================================
// TYPES
// ============================================
export type ButtonVariant = 'primary' | 'secondary' | 'text';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps {
  // Content
  title: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  
  // Appearance
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  
  // States
  disabled?: boolean;
  loading?: boolean;
  pressed?: boolean;
  
  // Actions
  onPress?: () => void;
  onLongPress?: () => void;
  
  // Style
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

// ============================================
// CONSTANTS
// ============================================
const HEIGHTS = {
  small: DS.layout.buttonHeight.small,   // 32
  medium: DS.layout.buttonHeight.medium,  // 44 (default, min touch target)
  large: DS.layout.buttonHeight.large,    // 56
};

const ICON_SIZES = {
  small: 16,
  medium: 20,
  large: 24,
};

const FONT_SIZES = {
  small: 12,
  medium: 14,
  large: 16,
};

// ============================================
// COMPONENT
// ============================================
export const Button = memo(({
  title,
  icon: Icon,
  iconPosition = 'left',
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  loading = false,
  pressed = false,
  onPress,
  onLongPress,
  style,
  textStyle,
  testID,
}: ButtonProps) => {
  
  const isDisabled = disabled || loading;
  
  // Get colors based on variant and state
  const getColors = () => {
    if (isDisabled) {
      return {
        background: variant === 'text' ? DS.colors.transparent : DS.colors.surfaceLight,
        text: DS.colors.textLight,
        border: DS.colors.borderLight,
      };
    }
    
    if (pressed) {
      switch (variant) {
        case 'primary':
          return {
            background: DS.colors.primaryOrangePressed,
            text: DS.colors.textWhite,
            border: DS.colors.primaryOrangePressed,
          };
        case 'secondary':
          return {
            background: DS.colors.surfaceLight,
            text: DS.colors.primaryOrangePressed,
            border: DS.colors.primaryOrangePressed,
          };
        case 'text':
          return {
            background: DS.colors.transparent,
            text: DS.colors.primaryOrangePressed,
            border: DS.colors.transparent,
          };
      }
    }
    
    // Default colors
    switch (variant) {
      case 'primary':
        return {
          background: DS.colors.primaryOrange,
          text: DS.colors.textWhite,
          border: DS.colors.primaryOrange,
        };
      case 'secondary':
        return {
          background: DS.colors.surface,
          text: DS.colors.primaryOrange,
          border: DS.colors.primaryOrange,
        };
      case 'text':
        return {
          background: DS.colors.transparent,
          text: DS.colors.primaryOrange,
          border: DS.colors.transparent,
        };
    }
  };
  
  const colors = getColors();
  const height = HEIGHTS[size];
  const iconSize = ICON_SIZES[size];
  const fontSize = FONT_SIZES[size];
  
  // Dynamic styles
  const dynamicStyles = {
    container: {
      height,
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: variant === 'secondary' ? 1 : 0,
      width: fullWidth ? '100%' : undefined,
      paddingHorizontal: variant === 'text' ? DS.spacing.sm : DS.spacing.lg,
    },
    text: {
      color: colors.text,
      fontSize,
    },
  };
  
  // Render loading spinner
  if (loading) {
    return (
      <View
        style={[
          styles.container,
          dynamicStyles.container,
          style,
        ]}
        testID={`${testID}-loading`}
      >
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? DS.colors.textWhite : DS.colors.primaryOrange}
        />
      </View>
    );
  }
  
  return (
    <TouchableOpacity
      style={[
        styles.container,
        dynamicStyles.container,
        style,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      testID={testID}
    >
      <View style={styles.content}>
        {/* Left icon */}
        {Icon && iconPosition === 'left' && (
          <View style={styles.iconLeft}>
            <Icon size={iconSize} color={colors.text} />
          </View>
        )}
        
        {/* Title */}
        <Text
          style={[
            styles.text,
            dynamicStyles.text,
            textStyle,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        
        {/* Right icon */}
        {Icon && iconPosition === 'right' && (
          <View style={styles.iconRight}>
            <Icon size={iconSize} color={colors.text} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

Button.displayName = 'Button';

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    borderRadius: DS.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...DS.typography.button,
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: DS.spacing.sm,
  },
  iconRight: {
    marginLeft: DS.spacing.sm,
  },
});

// ============================================
// PRESET BUTTONS
// ============================================

// Primary CTA Button
export const PrimaryButton = (props: Omit<ButtonProps, 'variant'>) => (
  <Button variant="primary" {...props} />
);

// Secondary Button
export const SecondaryButton = (props: Omit<ButtonProps, 'variant'>) => (
  <Button variant="secondary" {...props} />
);

// Text Button
export const TextButton = (props: Omit<ButtonProps, 'variant'>) => (
  <Button variant="text" {...props} />
);

export default Button;