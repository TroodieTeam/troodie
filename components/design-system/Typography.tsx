/**
 * TYPOGRAPHY COMPONENTS
 * Design System Compliant v3.0
 * Standardized text components across all screens
 */

import React, { memo } from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
  TextStyle,
} from 'react-native';
import { DS } from './tokens';

// ============================================
// TYPES
// ============================================
export type TextVariant = 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'body' 
  | 'bodySmall' 
  | 'metadata' 
  | 'caption' 
  | 'button' 
  | 'link';

export type TextColor = 
  | 'dark' 
  | 'gray' 
  | 'light' 
  | 'white' 
  | 'primary' 
  | 'error' 
  | 'success' 
  | 'warning' 
  | 'info';

export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold';

export interface TypographyProps extends Omit<RNTextProps, 'style'> {
  variant?: TextVariant;
  color?: TextColor;
  align?: TextAlign;
  weight?: TextWeight;
  uppercase?: boolean;
  underline?: boolean;
  italic?: boolean;
  style?: TextStyle | TextStyle[];
  children: React.ReactNode;
}

// ============================================
// COLOR MAPPING
// ============================================
const COLOR_MAP: Record<TextColor, string> = {
  dark: DS.colors.textDark,
  gray: DS.colors.textGray,
  light: DS.colors.textLight,
  white: DS.colors.textWhite,
  primary: DS.colors.primaryOrange,
  error: DS.colors.error,
  success: DS.colors.success,
  warning: DS.colors.warning,
  info: DS.colors.info,
};

// ============================================
// WEIGHT MAPPING
// ============================================
const WEIGHT_MAP: Record<TextWeight, string> = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

// ============================================
// MAIN TYPOGRAPHY COMPONENT
// ============================================
export const Typography = memo(({
  variant = 'body',
  color = 'dark',
  align = 'left',
  weight,
  uppercase = false,
  underline = false,
  italic = false,
  style,
  children,
  ...props
}: TypographyProps) => {
  
  // Get base styles from variant
  const baseStyle = styles[variant];
  
  // Build dynamic styles
  const dynamicStyles: TextStyle = {
    color: COLOR_MAP[color],
    textAlign: align,
    ...(weight && { fontWeight: WEIGHT_MAP[weight] }),
    ...(uppercase && { textTransform: 'uppercase' }),
    ...(underline && { textDecorationLine: 'underline' }),
    ...(italic && { fontStyle: 'italic' }),
  };
  
  return (
    <RNText
      style={[baseStyle, dynamicStyles, style]}
      {...props}
    >
      {children}
    </RNText>
  );
});

Typography.displayName = 'Typography';

// ============================================
// PRESET COMPONENTS
// ============================================

// Headings
export const H1 = memo((props: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="h1" weight="bold" {...props} />
));
H1.displayName = 'H1';

export const H2 = memo((props: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="h2" weight="semibold" {...props} />
));
H2.displayName = 'H2';

export const H3 = memo((props: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="h3" weight="semibold" {...props} />
));
H3.displayName = 'H3';

// Body Text
export const Body = memo((props: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="body" {...props} />
));
Body.displayName = 'Body';

export const BodySmall = memo((props: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="bodySmall" {...props} />
));
BodySmall.displayName = 'BodySmall';

// Metadata & Captions
export const Metadata = memo((props: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="metadata" color="gray" {...props} />
));
Metadata.displayName = 'Metadata';

export const Caption = memo((props: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="caption" color="gray" {...props} />
));
Caption.displayName = 'Caption';

// Interactive Text
export const Link = memo((props: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="link" color="primary" underline {...props} />
));
Link.displayName = 'Link';

export const ButtonText = memo((props: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="button" weight="semibold" {...props} />
));
ButtonText.displayName = 'ButtonText';

// Special Purpose
export const ErrorText = memo((props: Omit<TypographyProps, 'variant' | 'color'>) => (
  <Typography variant="caption" color="error" {...props} />
));
ErrorText.displayName = 'ErrorText';

export const SuccessText = memo((props: Omit<TypographyProps, 'variant' | 'color'>) => (
  <Typography variant="caption" color="success" {...props} />
));
SuccessText.displayName = 'SuccessText';

export const Label = memo((props: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="metadata" weight="medium" uppercase {...props} />
));
Label.displayName = 'Label';

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  h1: DS.typography.h1,
  h2: DS.typography.h2,
  h3: DS.typography.h3,
  body: DS.typography.body,
  bodySmall: DS.typography.bodySmall,
  metadata: DS.typography.metadata,
  caption: DS.typography.caption,
  button: DS.typography.button,
  link: DS.typography.link,
});

export default Typography;