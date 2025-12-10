import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import { DS } from '@/components/design-system/tokens';

interface TrendingBadgeProps {
  savesCount: number;
}

export function TrendingBadge({ savesCount }: TrendingBadgeProps) {
  return (
    <View style={styles.container}>
      <TrendingUp size={20} color="#EF4444" />
      <View style={styles.content}>
        <Text style={styles.title}>Trending Now!</Text>
        <Text style={styles.subtitle}>
          {savesCount} saves in the last 24 hours
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  content: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#991B1B',
  },
});

