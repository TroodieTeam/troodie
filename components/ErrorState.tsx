import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { AlertCircle, RefreshCw, WifiOff, ServerCrash } from 'lucide-react-native';
import { designTokens } from '@/constants/designTokens';

export type ErrorType = 'network' | 'server' | 'notFound' | 'permission' | 'generic';

interface ErrorStateProps {
  error: Error | null;
  errorType?: ErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
  fullScreen?: boolean;
  customAction?: {
    label: string;
    onPress: () => void;
  };
}

const getErrorDetails = (errorType: ErrorType, error: Error | null) => {
  switch (errorType) {
    case 'network':
      return {
        icon: WifiOff,
        title: 'No Internet Connection',
        message: 'Please check your network connection and try again.',
        iconColor: '#EF4444'
      };
    case 'server':
      return {
        icon: ServerCrash,
        title: 'Server Error',
        message: 'Something went wrong on our end. Please try again later.',
        iconColor: '#F59E0B'
      };
    case 'notFound':
      return {
        icon: AlertCircle,
        title: 'Not Found',
        message: 'The content you\'re looking for doesn\'t exist.',
        iconColor: '#6B7280'
      };
    case 'permission':
      return {
        icon: AlertCircle,
        title: 'Permission Denied',
        message: 'You don\'t have permission to access this content.',
        iconColor: '#EF4444'
      };
    default:
      return {
        icon: AlertCircle,
        title: 'Something Went Wrong',
        message: error?.message || 'An unexpected error occurred. Please try again.',
        iconColor: '#EF4444'
      };
  }
};

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  errorType = 'generic',
  title: customTitle,
  message: customMessage,
  onRetry,
  retrying = false,
  fullScreen = false,
  customAction
}) => {
  const errorDetails = getErrorDetails(errorType, error);
  const Icon = errorDetails.icon;

  return (
    <View style={[styles.container, fullScreen && styles.fullScreenContainer]}>
      <View style={[styles.iconContainer, { backgroundColor: `${errorDetails.iconColor}15` }]}>
        <Icon size={32} color={errorDetails.iconColor} />
      </View>
      
      <Text style={styles.title}>{customTitle || errorDetails.title}</Text>
      <Text style={styles.message}>{customMessage || errorDetails.message}</Text>
      
      {(onRetry || customAction) && (
        <View style={styles.actions}>
          {onRetry && (
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={onRetry}
              disabled={retrying}
            >
              {retrying ? (
                <ActivityIndicator size="small" color={designTokens.colors.white} />
              ) : (
                <>
                  <RefreshCw size={16} color={designTokens.colors.white} />
                  <Text style={styles.retryButtonText}>Retry</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          
          {customAction && (
            <TouchableOpacity 
              style={styles.customActionButton} 
              onPress={customAction.onPress}
            >
              <Text style={styles.customActionText}>{customAction.label}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: designTokens.spacing.xl,
    alignItems: 'center',
  },
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: designTokens.spacing.lg,
  },
  title: {
    ...designTokens.typography.cardTitle,
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textMedium,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: designTokens.spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    gap: designTokens.spacing.md,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: designTokens.spacing.xl,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.full,
    minWidth: 120,
    justifyContent: 'center',
  },
  retryButtonText: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
  customActionButton: {
    paddingHorizontal: designTokens.spacing.xl,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.full,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
  },
  customActionText: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
  },
});