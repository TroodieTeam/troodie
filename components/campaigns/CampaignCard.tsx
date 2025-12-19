import { CampaignSearchResult } from '@/services/campaignSearchService';
import { Building, Clock, DollarSign, Heart, MapPin, Target } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CampaignCardProps {
  campaign: CampaignSearchResult;
  onPress: (campaign: CampaignSearchResult) => void;
  onSaveToggle: (campaignId: string, currentSavedState: boolean) => void;
  showDistance?: boolean;
}

export function CampaignCard({ campaign, onPress, onSaveToggle, showDistance }: CampaignCardProps) {
  const daysLeft = Math.ceil(
    (new Date(campaign.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

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

  // Format distance
  const distanceMiles = campaign.distance_meters 
    ? (campaign.distance_meters / 1609.34).toFixed(1) 
    : null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(campaign)}
      activeOpacity={0.7}
    >
      {/* Campaign Image */}
      {campaign.restaurant?.cover_photo_url ? (
        <Image
          source={{ uri: campaign.restaurant.cover_photo_url }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Building size={48} color="#CCC" />
        </View>
      )}

      {/* Save Button Overlay */}
      <TouchableOpacity 
        style={styles.saveButton}
        onPress={(e) => {
          e.stopPropagation();
          onSaveToggle(campaign.id, campaign.is_saved);
        }}
      >
        <Heart 
          size={20} 
          color={campaign.is_saved ? "#EF4444" : "#FFF"} 
          fill={campaign.is_saved ? "#EF4444" : "rgba(0,0,0,0.3)"}
        />
      </TouchableOpacity>

      {/* Distance Badge Overlay */}
      {showDistance && distanceMiles && (
        <View style={styles.distanceBadge}>
          <MapPin size={12} color="#FFF" />
          <Text style={styles.distanceText}>{distanceMiles} mi</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.restaurantInfo}>
            {!campaign.restaurant?.cover_photo_url && (
              <View style={styles.restaurantIcon}>
                <Building size={16} color="#666" />
              </View>
            )}
            <Text style={styles.restaurantName} numberOfLines={1}>
              {campaign.restaurant?.name || campaign.restaurant_name}
            </Text>
          </View>
          {/* Status Badge can go here if needed */}
        </View>

        <Text style={styles.title} numberOfLines={1}>{campaign.title}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {campaign.description}
        </Text>

        <View style={styles.stats}>
          <View style={styles.statItem}>
            <DollarSign size={14} color="#10B981" />
            <Text style={styles.statText}>
              ${(campaign.budget_cents / 100).toFixed(0)}
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Clock size={14} color="#F59E0B" />
            <Text style={styles.statText}>
              {daysLeft > 0 ? `${daysLeft}d left` : 'Ends today'}
            </Text>
          </View>
          
          {deliverableCount > 0 && (
            <View style={styles.statItem}>
              <Target size={14} color="#EC4899" />
              <Text style={styles.statText}>
                {deliverableCount} task{deliverableCount !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: '#F7F7F7',
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceBadge: {
    position: 'absolute',
    bottom: 150, // Approximate position above content area
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  distanceText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  restaurantIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
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
