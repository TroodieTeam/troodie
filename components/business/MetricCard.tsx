import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { DS } from '@/components/design-system/tokens';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    percentage: number;
  };
}

export function MetricCard({ title, value, icon: Icon, trend }: MetricCardProps) {
  const formatValue = (val: number | string): string => {
    if (typeof val === 'number') {
      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
      return val.toString();
    }
    return val;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon size={20} color={DS.colors.primary} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.value}>{formatValue(value)}</Text>
      {trend && (
        <View style={styles.trend}>
          <Text
            style={[
              styles.trendText,
              trend.direction === 'up' && styles.trendUp,
              trend.direction === 'down' && styles.trendDown,
            ]}
          >
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}{' '}
            {Math.abs(trend.percentage).toFixed(1)}%
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: DS.colors.backgroundWhite,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: DS.colors.border,
    minHeight: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    color: DS.colors.textLight,
    marginLeft: 8,
    fontWeight: '500',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: DS.colors.text,
    marginBottom: 4,
  },
  trend: {
    marginTop: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  trendUp: {
    color: '#10B981',
  },
  trendDown: {
    color: '#EF4444',
  },
});

