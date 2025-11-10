/**
 * LAYOUT COMPONENTS & UTILITIES
 * Design System Compliant v3.0
 * Spacing, containers, and layout helpers
 */

import React, { memo } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ViewStyle,
  SafeAreaView,
} from 'react-native';
import { DS } from './tokens';

// ============================================
// TYPES
// ============================================
export type SpacingSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl';
export type FlexAlign = 'start' | 'center' | 'end' | 'stretch';
export type FlexJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

export interface SpacerProps {
  size?: SpacingSize;
  horizontal?: boolean;
}

export interface ContainerProps {
  children: React.ReactNode;
  padding?: SpacingSize;
  paddingHorizontal?: SpacingSize;
  paddingVertical?: SpacingSize;
  center?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export interface RowProps {
  children: React.ReactNode;
  gap?: SpacingSize;
  align?: FlexAlign;
  justify?: FlexJustify;
  wrap?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export interface ColumnProps extends RowProps {}

export interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
  safeArea?: boolean;
  padding?: SpacingSize;
  style?: ViewStyle;
  refreshControl?: React.ReactElement;
  testID?: string;
}

export interface CardProps {
  children: React.ReactNode;
  padding?: SpacingSize;
  variant?: 'default' | 'flat' | 'outlined';
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
}

// ============================================
// SPACER COMPONENT
// ============================================
export const Spacer = memo(({ 
  size = 'md', 
  horizontal = false 
}: SpacerProps) => {
  const spacing = DS.spacing[size];
  
  return (
    <View 
      style={{
        width: horizontal ? spacing : undefined,
        height: !horizontal ? spacing : undefined,
      }}
    />
  );
});

Spacer.displayName = 'Spacer';

// ============================================
// CONTAINER COMPONENT
// ============================================
export const Container = memo(({
  children,
  padding = 'md',
  paddingHorizontal,
  paddingVertical,
  center = false,
  style,
  testID,
}: ContainerProps) => {
  const dynamicStyles: ViewStyle = {
    padding: DS.spacing[padding],
    ...(paddingHorizontal && { paddingHorizontal: DS.spacing[paddingHorizontal] }),
    ...(paddingVertical && { paddingVertical: DS.spacing[paddingVertical] }),
  };
  
  return (
    <View
      style={[
        styles.container,
        center && styles.containerCenter,
        dynamicStyles,
        style,
      ]}
      testID={testID}
    >
      {children}
    </View>
  );
});

Container.displayName = 'Container';

// ============================================
// ROW COMPONENT
// ============================================
const ALIGN_MAP: Record<FlexAlign, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

const JUSTIFY_MAP: Record<FlexJustify, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
};

export const Row = memo(({
  children,
  gap = 'md',
  align = 'center',
  justify = 'start',
  wrap = false,
  style,
  testID,
}: RowProps) => {
  const dynamicStyles: ViewStyle = {
    gap: DS.spacing[gap],
    alignItems: ALIGN_MAP[align] as ViewStyle['alignItems'],
    justifyContent: JUSTIFY_MAP[justify] as ViewStyle['justifyContent'],
    ...(wrap && { flexWrap: 'wrap' }),
  };
  
  return (
    <View
      style={[styles.row, dynamicStyles, style]}
      testID={testID}
    >
      {children}
    </View>
  );
});

Row.displayName = 'Row';

// ============================================
// COLUMN COMPONENT
// ============================================
export const Column = memo(({
  children,
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  style,
  testID,
}: ColumnProps) => {
  const dynamicStyles: ViewStyle = {
    gap: DS.spacing[gap],
    alignItems: ALIGN_MAP[align] as ViewStyle['alignItems'],
    justifyContent: JUSTIFY_MAP[justify] as ViewStyle['justifyContent'],
  };
  
  return (
    <View
      style={[styles.column, dynamicStyles, style]}
      testID={testID}
    >
      {children}
    </View>
  );
});

Column.displayName = 'Column';

// ============================================
// SCREEN COMPONENT
// ============================================
export const Screen = memo(({
  children,
  scrollable = false,
  keyboardAvoiding = true,
  safeArea = true,
  padding,
  style,
  refreshControl,
  testID,
}: ScreenProps) => {
  const content = (
    <View style={[styles.screen, style]}>
      {children}
    </View>
  );
  
  const scrollableContent = scrollable ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.scrollContent,
        padding && { padding: DS.spacing[padding] },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {content}
    </ScrollView>
  ) : (
    <View style={[
      styles.flex,
      padding && { padding: DS.spacing[padding] },
    ]}>
      {content}
    </View>
  );
  
  const keyboardAvoidingContent = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {scrollableContent}
    </KeyboardAvoidingView>
  ) : scrollableContent;
  
  if (safeArea) {
    return (
      <SafeAreaView style={styles.flex} testID={testID}>
        {keyboardAvoidingContent}
      </SafeAreaView>
    );
  }
  
  return <View style={styles.flex} testID={testID}>{keyboardAvoidingContent}</View>;
});

Screen.displayName = 'Screen';

// ============================================
// CARD COMPONENT
// ============================================
export const Card = memo(({
  children,
  padding = 'md',
  variant = 'default',
  onPress,
  style,
  testID,
}: CardProps) => {
  const cardStyles = [
    styles.card,
    variant === 'flat' && styles.cardFlat,
    variant === 'outlined' && styles.cardOutlined,
    { padding: DS.spacing[padding] },
    style,
  ];
  
  if (onPress) {
    const TouchableOpacity = require('react-native').TouchableOpacity;
    return (
      <TouchableOpacity
        style={cardStyles}
        onPress={onPress}
        activeOpacity={0.8}
        testID={testID}
      >
        {children}
      </TouchableOpacity>
    );
  }
  
  return (
    <View style={cardStyles} testID={testID}>
      {children}
    </View>
  );
});

Card.displayName = 'Card';

// ============================================
// DIVIDER COMPONENT
// ============================================
export interface DividerProps {
  thickness?: number;
  color?: string;
  spacing?: SpacingSize;
  style?: ViewStyle;
}

export const Divider = memo(({
  thickness = 1,
  color = DS.colors.borderLight,
  spacing = 'md',
  style,
}: DividerProps) => {
  return (
    <View
      style={[
        {
          height: thickness,
          backgroundColor: color,
          marginVertical: DS.spacing[spacing],
        },
        style,
      ]}
    />
  );
});

Divider.displayName = 'Divider';

// ============================================
// UTILITY FUNCTIONS
// ============================================
export const spacing = {
  padding: (size: SpacingSize): ViewStyle => ({
    padding: DS.spacing[size],
  }),
  paddingHorizontal: (size: SpacingSize): ViewStyle => ({
    paddingHorizontal: DS.spacing[size],
  }),
  paddingVertical: (size: SpacingSize): ViewStyle => ({
    paddingVertical: DS.spacing[size],
  }),
  margin: (size: SpacingSize): ViewStyle => ({
    margin: DS.spacing[size],
  }),
  marginHorizontal: (size: SpacingSize): ViewStyle => ({
    marginHorizontal: DS.spacing[size],
  }),
  marginVertical: (size: SpacingSize): ViewStyle => ({
    marginVertical: DS.spacing[size],
  }),
  gap: (size: SpacingSize): ViewStyle => ({
    gap: DS.spacing[size],
  }),
};

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    width: '100%',
  },
  containerCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  column: {
    flexDirection: 'column',
  },
  screen: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: DS.colors.surface,
    borderRadius: DS.borderRadius.lg,
    ...DS.shadows.sm,
  },
  cardFlat: {
    ...DS.shadows.none,
  },
  cardOutlined: {
    ...DS.shadows.none,
    borderWidth: 1,
    borderColor: DS.colors.border,
  },
});

export default {
  Spacer,
  Container,
  Row,
  Column,
  Screen,
  Card,
  Divider,
  spacing,
};