import { designTokens } from '@/constants/designTokens';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  height?: number;
  style?: any;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  label, 
  showPercentage = true,
  height = 8,
  style 
}) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);
  
  const progressColor = progress === 100 
    ? designTokens.colors.success 
    : designTokens.colors.primaryOrange;
  
  return (
    <View style={[styles.container, style]}>
      {(label || showPercentage) && (
        <View style={styles.labelContainer}>
          {label && <Text style={styles.label}>{label}</Text>}
          {showPercentage && (
            <Text style={[styles.percentage, { color: progressColor }]}>
              {Math.round(progress)}%
            </Text>
          )}
        </View>
      )}
      
      <View style={[styles.track, { height }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              height,
              backgroundColor: progressColor,
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: designTokens.spacing.sm,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: designTokens.colors.textPrimary,
  },
  percentage: {
    fontSize: 14,
    fontWeight: '600',
  },
  track: {
    backgroundColor: designTokens.colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 4,
  },
});