import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { DS } from '@/components/design-system/tokens';

interface SavesChartProps {
  data: Array<{ date: string; count: number }>;
}

const CHART_HEIGHT = 200;
const CHART_PADDING = 16;

export function SavesChart({ data }: SavesChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - (CHART_PADDING * 2 + 32); // Account for padding
  const barWidth = Math.max(20, (chartWidth - (data.length - 1) * 8) / data.length);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.chart}>
        {data.map((item, index) => {
          const barHeight = (item.count / maxCount) * (CHART_HEIGHT - 40);
          return (
            <View key={index} style={styles.barContainer}>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(barHeight, 4),
                      width: barWidth,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel} numberOfLines={1}>
                {formatDate(item.date)}
              </Text>
              <Text style={styles.barValue}>{item.count}</Text>
            </View>
          );
        })}
      </View>
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
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: CHART_HEIGHT,
    paddingHorizontal: 8,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    height: CHART_HEIGHT - 40,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  bar: {
    backgroundColor: DS.colors.primary,
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: DS.colors.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  barValue: {
    fontSize: 11,
    fontWeight: '600',
    color: DS.colors.text,
    marginTop: 4,
  },
  emptyContainer: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: DS.colors.textLight,
  },
});

