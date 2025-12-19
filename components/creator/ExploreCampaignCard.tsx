import { ExploreCampaign } from '@/types/exploreCampaign';
import { Building, Clock, DollarSign, Target } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ExploreCampaignCardProps {
  campaign: ExploreCampaign;
  onPress: (campaign: ExploreCampaign) => void;
}

export function ExploreCampaignCard({ campaign, onPress }: ExploreCampaignCardProps) {
  const daysLeft = Math.ceil(
    (new Date(campaign.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const hasApplied = campaign.applications && campaign.applications.length > 0;
  
  // Calculate deliverable count
  let deliverableCount = 0;
  if (campaign.deliverable_requirements) {
    try {
      const requirements = typeof campaign.deliverable_requirements === 'string'
        ? JSON.parse(campaign.deliverable_requirements)
        : campaign.deliverable_requirements;
      deliverableCount = requirements?.deliverables?.length || 0;
    } catch (e) {
      // Ignore parsing errors
    }
  }

  return (
    <TouchableOpacity
      style={styles.campaignCard}
      onPress={() => onPress(campaign)}
      activeOpacity={0.7}
    >
      {/* Campaign Image */}
      {campaign.restaurant?.cover_photo_url && (
        <Image
          source={{ uri: campaign.restaurant.cover_photo_url }}
          style={styles.campaignImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.restaurantInfo}>
            {!campaign.restaurant?.cover_photo_url && (
              <View style={styles.restaurantIcon}>
                <Building size={16} color="#666" />
              </View>
            )}
            <Text style={styles.restaurantName}>{campaign.restaurant?.name}</Text>
          </View>
          {hasApplied && (
            <View style={styles.appliedBadge}>
              <Text style={styles.appliedBadgeText}>Applied</Text>
            </View>
          )}
        </View>

        <Text style={styles.campaignTitle}>{campaign.title}</Text>
        <Text style={styles.campaignDescription} numberOfLines={2}>
          {campaign.description}
        </Text>

        <View style={styles.campaignStats}>
          <View style={styles.statItem}>
            <DollarSign size={14} color="#10B981" />
            <Text style={styles.statText}>
              ${(campaign.budget_cents / 100).toFixed(0)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Clock size={14} color="#F59E0B" />
            <Text style={styles.statText}>{daysLeft}d left</Text>
          </View>
          {deliverableCount > 0 && (
            <View style={styles.statItem}>
              <Target size={14} color="#EC4899" />
              <Text style={styles.statText}>
                {deliverableCount} deliverable{deliverableCount !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  campaignCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
  },
  campaignImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F7F7F7',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  restaurantIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  appliedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#10B981',
  },
  appliedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  campaignTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  campaignDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  campaignStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#262626',
  },
});
