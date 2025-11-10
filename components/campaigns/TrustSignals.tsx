import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle, Clock, Headphones } from 'lucide-react-native';
import { designTokens } from '@/constants/designTokens';

interface TrustSignalsProps {
  campaignSource: 'troodie_direct' | 'troodie_partnership' | 'community_challenge';
}

export default function TrustSignals({ campaignSource }: TrustSignalsProps) {
  // Only show trust signals for troodie_direct campaigns
  if (campaignSource !== 'troodie_direct') {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Why Work With Troodie</Text>

      <View style={styles.signalsContainer}>
        <View style={styles.signalRow}>
          <View style={[styles.signalIcon, { backgroundColor: '#D1FAE5' }]}>
            <CheckCircle size={18} color="#10B981" strokeWidth={2.5} />
          </View>
          <View style={styles.signalContent}>
            <Text style={styles.signalTitle}>Guaranteed Payment</Text>
            <Text style={styles.signalDescription}>
              Troodie pays you directly upon approval - no waiting for restaurants
            </Text>
          </View>
        </View>

        <View style={styles.signalRow}>
          <View style={[styles.signalIcon, { backgroundColor: '#DBEAFE' }]}>
            <Clock size={18} color="#1E40AF" strokeWidth={2.5} />
          </View>
          <View style={styles.signalContent}>
            <Text style={styles.signalTitle}>Fast Approval</Text>
            <Text style={styles.signalDescription}>
              Content reviewed and approved within 24-48 hours
            </Text>
          </View>
        </View>

        <View style={styles.signalRow}>
          <View style={[styles.signalIcon, { backgroundColor: '#FFFAF2' }]}>
            <Headphones size={18} color={designTokens.colors.primaryOrange} strokeWidth={2.5} />
          </View>
          <View style={styles.signalContent}>
            <Text style={styles.signalTitle}>Platform Managed</Text>
            <Text style={styles.signalDescription}>
              Direct support from Troodie team throughout the campaign
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: designTokens.colors.textDark,
    marginBottom: 16,
  },
  signalsContainer: {
    gap: 16,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  signalIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  signalContent: {
    flex: 1,
  },
  signalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textDark,
    marginBottom: 2,
  },
  signalDescription: {
    fontSize: 13,
    color: designTokens.colors.textMedium,
    lineHeight: 18,
  },
});
