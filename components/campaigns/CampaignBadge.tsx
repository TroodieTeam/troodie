import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle, Award } from 'lucide-react-native';
import { designTokens } from '@/constants/designTokens';

export type CampaignBadgeType = 'troodie-official' | 'challenge' | 'partnership';

interface CampaignBadgeProps {
  type: CampaignBadgeType;
  size?: 'small' | 'medium';
}

export default function CampaignBadge({ type, size = 'medium' }: CampaignBadgeProps) {
  // Partnership campaigns don't show badges (appear as normal restaurant campaigns)
  if (type === 'partnership') {
    return null;
  }

  const isSmall = size === 'small';

  if (type === 'troodie-official') {
    return (
      <View style={[styles.badge, styles.troodieBadge, isSmall && styles.badgeSmall]}>
        <CheckCircle
          size={isSmall ? 12 : 14}
          color={designTokens.colors.primaryOrange}
          strokeWidth={2.5}
        />
        <Text style={[styles.badgeText, styles.troodieText, isSmall && styles.badgeTextSmall]}>
          Troodie Official
        </Text>
      </View>
    );
  }

  if (type === 'challenge') {
    return (
      <View style={[styles.badge, styles.challengeBadge, isSmall && styles.badgeSmall]}>
        <Award
          size={isSmall ? 12 : 14}
          color="#10B981"
          strokeWidth={2.5}
        />
        <Text style={[styles.badgeText, styles.challengeText, isSmall && styles.badgeTextSmall]}>
          Challenge
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  troodieBadge: {
    backgroundColor: '#FFFAF2',
    borderColor: 'rgba(255, 173, 39, 0.3)',
  },
  challengeBadge: {
    backgroundColor: '#D1FAE5',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextSmall: {
    fontSize: 11,
  },
  troodieText: {
    color: designTokens.colors.primaryOrange,
  },
  challengeText: {
    color: '#10B981',
  },
});
