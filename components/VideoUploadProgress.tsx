/**
 * Video Upload Progress Component
 * 
 * Displays a beautiful, seamless loading experience for video uploads
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { ProgressBar } from './ProgressBar';
import { Ionicons } from '@expo/vector-icons';

export interface VideoUploadProgressState {
  isVisible: boolean;
  currentVideo: number;
  totalVideos: number;
  progress: number; // 0-100
  status: 'uploading' | 'optimizing' | 'processing' | 'complete';
  fileName?: string;
}

interface VideoUploadProgressProps {
  state: VideoUploadProgressState;
  onDismiss?: () => void;
}

export function VideoUploadProgress({ state, onDismiss }: VideoUploadProgressProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;


  useEffect(() => {
    if (state.isVisible) {
      // Reset animations when becoming visible
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [state.isVisible, fadeAnim, slideAnim]);

  const getStatusText = () => {
    switch (state.status) {
      case 'uploading':
        return 'Uploading video...';
      case 'optimizing':
        return 'Optimizing video...';
      case 'processing':
        return 'Processing video...';
      case 'complete':
        return 'Video uploaded!';
      default:
        return 'Uploading...';
    }
  };

  const getStatusIcon = () => {
    switch (state.status) {
      case 'uploading':
      case 'optimizing':
      case 'processing':
        return <ActivityIndicator size="large" color="#FF6B35" />;
      case 'complete':
        return (
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
          </View>
        );
      default:
        return <ActivityIndicator size="large" color="#FF6B35" />;
    }
  };

  if (!state.isVisible) return null;

  return (
    <Modal
      transparent
      visible={state.isVisible}
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            {getStatusIcon()}
            <Text style={styles.title}>{getStatusText()}</Text>
            {state.totalVideos > 1 && (
              <Text style={styles.subtitle}>
                Video {state.currentVideo} of {state.totalVideos}
              </Text>
            )}
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <ProgressBar
              progress={Math.max(0, Math.min(100, state.progress))}
              showPercentage={true}
              height={6}
            />
          </View>

          {/* Status Message */}
          {state.status === 'optimizing' && (
            <View style={styles.statusMessage}>
              <Ionicons name="sparkles" size={16} color="#FF6B35" />
              <Text style={styles.statusText}>
                Compressing video for faster upload...
              </Text>
            </View>
          )}

          {state.status === 'uploading' && state.progress < 10 && (
            <View style={styles.statusMessage}>
              <Ionicons name="cloud-upload" size={16} color="#FF6B35" />
              <Text style={styles.statusText}>
                Preparing upload...
              </Text>
            </View>
          )}

          {/* File Name (if available) */}
          {state.fileName && (
            <Text style={styles.fileName} numberOfLines={1}>
              {state.fileName}
            </Text>
          )}

          {/* Dismiss button (only when complete) */}
          {state.status === 'complete' && onDismiss && (
            <View style={styles.dismissContainer}>
              <Text style={styles.dismissText} onPress={onDismiss}>
                Continue
              </Text>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 16,
  },
  statusMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 13,
    color: '#FF6B35',
    marginLeft: 8,
    fontWeight: '500',
  },
  fileName: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  successIcon: {
    marginBottom: 8,
  },
  dismissContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    width: '100%',
  },
  dismissText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
    textAlign: 'center',
    paddingVertical: 8,
  },
});

