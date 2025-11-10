import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Building2, Handshake, Trophy } from 'lucide-react-native';
import { ManagementType } from '@/types/campaign';

type CampaignType = ManagementType;

interface CampaignTypeSelectorProps {
  selectedType: CampaignType;
  onSelect: (type: CampaignType) => void;
}

export default function CampaignTypeSelector({ selectedType, onSelect }: CampaignTypeSelectorProps) {
  const campaignTypes = [
    {
      type: 'direct' as CampaignType,
      icon: Building2,
      title: 'Direct (Troodie-branded)',
      description: 'Campaign appears as official Troodie opportunity. Great for portfolio building and platform initiatives.',
      examples: ['Portfolio Builders', 'Platform Testing', 'Seasonal Campaigns'],
      budgetRange: '$25-$75 per creator',
    },
    {
      type: 'partnership' as CampaignType,
      icon: Handshake,
      title: 'Partnership (White-label)',
      description: 'Campaign appears as if from partner restaurant. Troodie subsidizes costs to help restaurants market.',
      examples: ['Restaurant Spotlights', 'New Menu Launches', 'Grand Openings'],
      budgetRange: '$50-$150 per creator',
    },
    {
      type: 'challenge' as CampaignType,
      icon: Trophy,
      title: 'Community Challenge',
      description: 'Gamified campaign with prize pool. Creators compete for rewards based on engagement and creativity.',
      examples: ['Best Brunch Spot', 'Hidden Gem Challenge', 'Seasonal Food Tours'],
      budgetRange: '$500-$2000 prize pool',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Campaign Type</Text>
      <Text style={styles.subtitle}>
        Choose how this campaign will appear to creators and be managed internally
      </Text>

      {campaignTypes.map((option) => {
        const Icon = option.icon;
        const isSelected = selectedType === option.type;

        return (
          <TouchableOpacity
            key={option.type}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => onSelect(option.type)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
                <Icon size={24} color={isSelected ? '#FF6B35' : '#6B7280'} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>
                  {option.title}
                </Text>
                <Text style={styles.cardBudget}>{option.budgetRange}</Text>
              </View>
            </View>

            <Text style={styles.cardDescription}>{option.description}</Text>

            <View style={styles.examplesContainer}>
              <Text style={styles.examplesLabel}>Examples:</Text>
              {option.examples.map((example, index) => (
                <Text key={index} style={styles.exampleItem}>
                  • {example}
                </Text>
              ))}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF7F5',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainerSelected: {
    backgroundColor: '#FEE2E2',
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  cardTitleSelected: {
    color: '#FF6B35',
  },
  cardBudget: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  cardDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  examplesContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  examplesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  exampleItem: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 4,
  },
});
