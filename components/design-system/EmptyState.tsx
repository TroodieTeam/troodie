/**
 * EMPTY STATE COMPONENT
 * Design System Compliant v3.0
 * Consistent empty states across all screens
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { 
  Search,
  Users,
  Bookmark,
  Camera,
  FolderOpen,
  MessageSquare,
  MapPin,
  Heart,
  AlertCircle,
  LucideIcon,
} from 'lucide-react-native';
import { DS } from './tokens';
import { Button } from './Button';

// ============================================
// TYPES
// ============================================
export type EmptyStateType = 
  | 'no-results'
  | 'no-saves'
  | 'no-posts'
  | 'no-boards'
  | 'no-friends'
  | 'no-activity'
  | 'no-restaurants'
  | 'no-comments'
  | 'error'
  | 'custom';

export interface EmptyStateProps {
  // Content
  type?: EmptyStateType;
  title?: string;
  message?: string;
  icon?: LucideIcon;
  
  // Actions
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  
  // Style
  fullScreen?: boolean;
  compact?: boolean;
  style?: ViewStyle;
  testID?: string;
}

// ============================================
// PRESETS
// ============================================
const EMPTY_STATE_PRESETS: Record<EmptyStateType, {
  icon: LucideIcon;
  title: string;
  message: string;
  actionLabel?: string;
}> = {
  'no-results': {
    icon: Search,
    title: 'No results found',
    message: 'Try adjusting your search or filters',
  },
  'no-saves': {
    icon: Bookmark,
    title: 'No saved restaurants yet',
    message: 'Start exploring and save your favorite spots',
    actionLabel: 'Explore Restaurants',
  },
  'no-posts': {
    icon: Camera,
    title: 'No posts yet',
    message: 'Share your first restaurant experience',
    actionLabel: 'Create Post',
  },
  'no-boards': {
    icon: FolderOpen,
    title: 'No boards created',
    message: 'Organize your favorite restaurants into collections',
    actionLabel: 'Create Board',
  },
  'no-friends': {
    icon: Users,
    title: 'Connect with food lovers',
    message: 'Follow friends to see their restaurant discoveries',
    actionLabel: 'Find Friends',
  },
  'no-activity': {
    icon: Heart,
    title: 'No activity yet',
    message: 'Follow friends and join communities to see updates',
    actionLabel: 'Find Friends',
  },
  'no-restaurants': {
    icon: MapPin,
    title: 'No restaurants here',
    message: 'Be the first to add a restaurant in this area',
    actionLabel: 'Add Restaurant',
  },
  'no-comments': {
    icon: MessageSquare,
    title: 'No comments yet',
    message: 'Be the first to share your thoughts',
    actionLabel: 'Add Comment',
  },
  'error': {
    icon: AlertCircle,
    title: 'Something went wrong',
    message: 'We couldn\'t load this content. Please try again.',
    actionLabel: 'Retry',
  },
  'custom': {
    icon: AlertCircle,
    title: '',
    message: '',
  },
};

// ============================================
// COMPONENT
// ============================================
export const EmptyState = memo(({
  type = 'custom',
  title: customTitle,
  message: customMessage,
  icon: CustomIcon,
  actionLabel: customActionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  fullScreen = false,
  compact = false,
  style,
  testID,
}: EmptyStateProps) => {
  
  // Get preset or use custom values
  const preset = EMPTY_STATE_PRESETS[type];
  const Icon = CustomIcon || preset.icon;
  const title = customTitle || preset.title;
  const message = customMessage || preset.message;
  const actionLabel = customActionLabel || preset.actionLabel;
  
  // Calculate icon size based on compact mode
  const iconSize = compact ? 48 : 64;
  
  return (
    <View
      style={[
        styles.container,
        fullScreen && styles.containerFullScreen,
        compact && styles.containerCompact,
        style,
      ]}
      testID={testID}
    >
      {/* Icon */}
      <View style={[
        styles.iconContainer,
        compact && styles.iconContainerCompact,
      ]}>
        <Icon 
          size={iconSize} 
          color={DS.colors.textLight}
          strokeWidth={1.5}
        />
      </View>
      
      {/* Title */}
      {title && (
        <Text style={[
          styles.title,
          compact && styles.titleCompact,
        ]}>
          {title}
        </Text>
      )}
      
      {/* Message */}
      {message && (
        <Text style={[
          styles.message,
          compact && styles.messageCompact,
        ]}>
          {message}
        </Text>
      )}
      
      {/* Actions */}
      {(actionLabel || secondaryActionLabel) && (
        <View style={[
          styles.actions,
          compact && styles.actionsCompact,
        ]}>
          {actionLabel && onAction && (
            <Button
              title={actionLabel}
              onPress={onAction}
              variant="primary"
              size={compact ? 'small' : 'medium'}
              testID={`${testID}-action`}
            />
          )}
          
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              title={secondaryActionLabel}
              onPress={onSecondaryAction}
              variant="text"
              size={compact ? 'small' : 'medium'}
              testID={`${testID}-secondary-action`}
            />
          )}
        </View>
      )}
    </View>
  );
});

EmptyState.displayName = 'EmptyState';

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: DS.spacing.xl,
    paddingVertical: DS.spacing.xxxl,
  },
  containerFullScreen: {
    minHeight: 400,
  },
  containerCompact: {
    paddingVertical: DS.spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: DS.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: DS.spacing.xl,
  },
  iconContainerCompact: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: DS.spacing.lg,
  },
  title: {
    ...DS.typography.h2,
    color: DS.colors.textDark,
    textAlign: 'center',
    marginBottom: DS.spacing.sm,
  },
  titleCompact: {
    ...DS.typography.h3,
  },
  message: {
    ...DS.typography.body,
    color: DS.colors.textGray,
    textAlign: 'center',
    marginBottom: DS.spacing.xl,
    maxWidth: 280,
  },
  messageCompact: {
    marginBottom: DS.spacing.lg,
  },
  actions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: DS.spacing.md,
  },
  actionsCompact: {
    gap: DS.spacing.sm,
  },
});

export default EmptyState;