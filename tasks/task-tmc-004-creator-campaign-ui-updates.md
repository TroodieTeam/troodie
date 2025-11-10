# Troodie-Managed Campaigns: Creator Campaign UI Updates

- Epic: TMC (Troodie-Managed Campaigns)
- Priority: High
- Estimate: 1.5 days
- Status: 🟡 Needs Review
- Assignee: -
- Dependencies: TMC-001 (Database Schema), TMC-002 (System Account), TMC-003 (Admin UI)

## Overview
Update the creator-facing campaign browsing, discovery, and detail screens to properly display Troodie-managed campaigns with visual badges, source indicators, and trust signals. Ensure creators can easily distinguish between regular restaurant campaigns, Troodie-direct campaigns, partnership campaigns, and community challenges.

## Business Value
- Builds trust by transparently showing campaign sources
- Highlights Troodie-managed opportunities as guaranteed/reliable
- Differentiates partnership campaigns from organic restaurant campaigns
- Makes community challenges stand out as competitive opportunities
- Helps creators make informed decisions about campaign applications
- Critical for successful MVP launch with platform-managed campaigns

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Creator Campaign UI Updates
  As a creator
  I want to see clear indicators of campaign sources
  So that I know which campaigns are from restaurants vs Troodie

  Scenario: Browse campaigns with source badges
    Given I am a verified creator browsing campaigns
    When I view the campaign feed
    Then I see badge indicators on each campaign card
    And Troodie-direct campaigns show "Troodie Official" badge
    And Partnership campaigns show restaurant name (no Troodie indicator)
    And Community challenges show "Challenge" badge
    And Regular restaurant campaigns show no badge

  Scenario: View Troodie-direct campaign details
    Given I am viewing a Troodie-direct campaign
    When I open the campaign detail screen
    Then I see "Troodie Official Campaign" header
    And I see Troodie branding and logo
    And I see "Guaranteed Payment" trust indicator
    And I see campaign is "Platform Managed"
    And I see all standard campaign details

  Scenario: View partnership campaign details
    Given I am viewing a partnership campaign
    When I open the campaign detail screen
    Then the campaign appears as if from the restaurant
    And I do NOT see Troodie branding prominently
    And I see the partner restaurant name and details
    And Campaign functions identically to regular campaigns

  Scenario: View community challenge details
    Given I am viewing a community challenge campaign
    When I open the campaign detail screen
    Then I see "Community Challenge" header with trophy icon
    And I see prize pool amount prominently
    And I see challenge rules and judging criteria
    And I see leaderboard or voting information
    And I see current participant count

  Scenario: Filter campaigns by source
    Given I am on the campaign browse screen
    When I open filters
    Then I see filter options including "Troodie Official", "Challenges", "All Restaurants"
    And I can filter to show only Troodie-managed campaigns
    And I can filter to show only community challenges
    And Results update based on selected filters

  Scenario: Apply to Troodie-managed campaign
    Given I am viewing any Troodie-managed campaign
    When I click "Apply Now"
    Then the application flow is identical to regular campaigns
    And I can submit my application
    And I receive confirmation
    And Application status updates work the same way

  Scenario: See trust indicators for Troodie campaigns
    Given I am viewing a Troodie-direct campaign
    Then I see trust indicators like:
      | Indicator | Description |
      | Guaranteed Payment | Troodie handles all payments |
      | Fast Approval | 24-48 hour application review |
      | Platform Managed | Direct support from Troodie team |
      | No Partner Issues | No restaurant disputes or delays |
```

## Technical Implementation

### Campaign Card Component Updates
Update: `components/creator/CampaignCard.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Building2, Trophy, Shield, MapPin } from 'lucide-react-native';
import { router } from 'expo-router';
import { isTroodieCampaign } from '@/constants/systemAccounts';

interface Campaign {
  id: string;
  title: string;
  description: string;
  campaign_source: 'restaurant' | 'troodie_direct' | 'troodie_partnership' | 'community_challenge';
  proposed_rate_cents: number;
  restaurant: {
    id: string;
    name: string;
    city: string;
    state: string;
    profile_image_url?: string;
  };
  status: string;
  applications_count?: number;
  max_applications?: number;
}

interface CampaignCardProps {
  campaign: Campaign;
  onPress?: () => void;
}

export default function CampaignCard({ campaign, onPress }: CampaignCardProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/creator/campaigns/${campaign.id}`);
    }
  };

  const renderSourceBadge = () => {
    if (campaign.campaign_source === 'troodie_direct') {
      return (
        <View style={[styles.badge, styles.badgeTroodie]}>
          <Shield size={14} color="#FFFFFF" />
          <Text style={styles.badgeText}>Troodie Official</Text>
        </View>
      );
    }

    if (campaign.campaign_source === 'community_challenge') {
      return (
        <View style={[styles.badge, styles.badgeChallenge]}>
          <Trophy size={14} color="#FFFFFF" />
          <Text style={styles.badgeText}>Challenge</Text>
        </View>
      );
    }

    // Partnership campaigns don't show a badge - they appear as restaurant campaigns
    return null;
  };

  const getRestaurantDisplay = () => {
    // For all campaign types, show the restaurant name
    // (Partnerships already have partner restaurant set, Direct campaigns use Troodie Community)
    return campaign.restaurant.name;
  };

  const isGuaranteedPayment = isTroodieCampaign(campaign.campaign_source);

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      {/* Source Badge */}
      {renderSourceBadge()}

      {/* Restaurant Info */}
      <View style={styles.restaurantSection}>
        {campaign.restaurant.profile_image_url ? (
          <Image
            source={{ uri: campaign.restaurant.profile_image_url }}
            style={styles.restaurantImage}
          />
        ) : (
          <View style={styles.restaurantImagePlaceholder}>
            <Building2 size={20} color="#6B7280" />
          </View>
        )}

        <View style={styles.restaurantInfo}>
          <Text style={styles.restaurantName}>{getRestaurantDisplay()}</Text>
          <View style={styles.locationRow}>
            <MapPin size={12} color="#6B7280" />
            <Text style={styles.location}>
              {campaign.restaurant.city}, {campaign.restaurant.state}
            </Text>
          </View>
        </View>

        {/* Guaranteed Payment Indicator */}
        {isGuaranteedPayment && (
          <View style={styles.guaranteedBadge}>
            <Shield size={12} color="#10B981" />
          </View>
        )}
      </View>

      {/* Campaign Details */}
      <Text style={styles.title} numberOfLines={2}>
        {campaign.title}
      </Text>

      <Text style={styles.description} numberOfLines={3}>
        {campaign.description}
      </Text>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.paymentSection}>
          <Text style={styles.paymentLabel}>Payment</Text>
          <Text style={styles.paymentAmount}>
            ${(campaign.proposed_rate_cents / 100).toFixed(0)}
          </Text>
        </View>

        {campaign.max_applications && (
          <View style={styles.spotsSection}>
            <Text style={styles.spotsText}>
              {campaign.applications_count || 0} / {campaign.max_applications} spots
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    zIndex: 1,
  },
  badgeTroodie: {
    backgroundColor: '#FF6B35',
  },
  badgeChallenge: {
    backgroundColor: '#8B5CF6',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  restaurantSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  restaurantImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  restaurantImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantInfo: {
    flex: 1,
    marginLeft: 12,
  },
  restaurantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 12,
    color: '#6B7280',
  },
  guaranteedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  paymentSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  paymentLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B35',
  },
  spotsSection: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  spotsText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
});
```

### Campaign Detail Screen Updates
Update: `app/creator/campaigns/[id].tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Shield, Trophy, Clock, CheckCircle } from 'lucide-react-native';
import { getCampaignById } from '@/services/campaignService';
import { isTroodieCampaign } from '@/constants/systemAccounts';

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<any>(null);

  useEffect(() => {
    loadCampaign();
  }, [id]);

  const loadCampaign = async () => {
    setLoading(true);
    const { data, error } = await getCampaignById(id);
    if (data) setCampaign(data);
    setLoading(false);
  };

  const renderTrustIndicators = () => {
    if (!isTroodieCampaign(campaign.campaign_source)) {
      return null;
    }

    const indicators = [
      {
        icon: Shield,
        title: 'Guaranteed Payment',
        description: 'Troodie handles all payments directly',
      },
      {
        icon: Clock,
        title: 'Fast Approval',
        description: '24-48 hour application review',
      },
      {
        icon: CheckCircle,
        title: 'Platform Managed',
        description: 'Direct support from Troodie team',
      },
    ];

    return (
      <View style={styles.trustSection}>
        <Text style={styles.sectionTitle}>Why This Campaign is Special</Text>
        {indicators.map((indicator, index) => {
          const Icon = indicator.icon;
          return (
            <View key={index} style={styles.trustIndicator}>
              <View style={styles.trustIconContainer}>
                <Icon size={20} color="#10B981" />
              </View>
              <View style={styles.trustContent}>
                <Text style={styles.trustTitle}>{indicator.title}</Text>
                <Text style={styles.trustDescription}>{indicator.description}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderCampaignHeader = () => {
    if (campaign.campaign_source === 'troodie_direct') {
      return (
        <View style={styles.troodieHeader}>
          <View style={styles.troodieBadgeLarge}>
            <Shield size={24} color="#FFFFFF" />
            <Text style={styles.troodieBadgeText}>Troodie Official Campaign</Text>
          </View>
          <Text style={styles.troodieSubheader}>
            Platform-managed opportunity with guaranteed payment
          </Text>
        </View>
      );
    }

    if (campaign.campaign_source === 'community_challenge') {
      return (
        <View style={styles.challengeHeader}>
          <View style={styles.challengeBadgeLarge}>
            <Trophy size={24} color="#FFFFFF" />
            <Text style={styles.challengeBadgeText}>Community Challenge</Text>
          </View>
          <Text style={styles.challengeSubheader}>
            Compete with other creators for prizes and recognition
          </Text>
        </View>
      );
    }

    // Regular restaurant or partnership - no special header
    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaView>
    );
  }

  if (!campaign) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Campaign not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Campaign Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Campaign Type Header */}
        {renderCampaignHeader()}

        {/* Restaurant/Source Section */}
        <View style={styles.restaurantSection}>
          {campaign.restaurant.profile_image_url && (
            <Image
              source={{ uri: campaign.restaurant.profile_image_url }}
              style={styles.restaurantImage}
            />
          )}
          <Text style={styles.restaurantName}>{campaign.restaurant.name}</Text>
          <Text style={styles.location}>
            {campaign.restaurant.city}, {campaign.restaurant.state}
          </Text>
        </View>

        {/* Campaign Title & Description */}
        <View style={styles.contentSection}>
          <Text style={styles.campaignTitle}>{campaign.title}</Text>
          <Text style={styles.campaignDescription}>{campaign.description}</Text>
        </View>

        {/* Trust Indicators (Troodie campaigns only) */}
        {renderTrustIndicators()}

        {/* Campaign Details */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Campaign Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment</Text>
            <Text style={styles.detailValue}>
              ${(campaign.proposed_rate_cents / 100).toFixed(0)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Available Spots</Text>
            <Text style={styles.detailValue}>
              {campaign.applications_count || 0} / {campaign.max_applications}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Campaign Duration</Text>
            <Text style={styles.detailValue}>
              {new Date(campaign.start_date).toLocaleDateString()} -{' '}
              {new Date(campaign.end_date).toLocaleDateString()}
            </Text>
          </View>

          {campaign.requirements && (
            <View style={styles.requirementsSection}>
              <Text style={styles.detailLabel}>Requirements</Text>
              <Text style={styles.requirementsText}>{campaign.requirements}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Apply Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={() => router.push(`/creator/campaigns/${campaign.id}/apply`)}
        >
          <Text style={styles.applyButtonText}>Apply Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 32,
  },
  scrollView: {
    flex: 1,
  },
  troodieHeader: {
    backgroundColor: '#FF6B35',
    padding: 20,
    alignItems: 'center',
  },
  troodieBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  troodieBadgeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  troodieSubheader: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
  },
  challengeHeader: {
    backgroundColor: '#8B5CF6',
    padding: 20,
    alignItems: 'center',
  },
  challengeBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  challengeBadgeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  challengeSubheader: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
  },
  restaurantSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  restaurantImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#6B7280',
  },
  contentSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  campaignTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  campaignDescription: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  trustSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  trustIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  trustIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trustContent: {
    flex: 1,
  },
  trustTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  trustDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  detailsSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  requirementsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  requirementsText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginTop: 8,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  applyButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
```

### Campaign Filters Component
Create: `components/creator/CampaignFilters.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { X, Shield, Trophy, Building2 } from 'lucide-react-native';

interface CampaignFiltersProps {
  visible: boolean;
  onClose: () => void;
  selectedSources: string[];
  onSourceToggle: (source: string) => void;
}

export default function CampaignFilters({
  visible,
  onClose,
  selectedSources,
  onSourceToggle,
}: CampaignFiltersProps) {
  const sources = [
    {
      id: 'all',
      icon: Building2,
      label: 'All Campaigns',
      description: 'Show all available opportunities',
    },
    {
      id: 'troodie_direct',
      icon: Shield,
      label: 'Troodie Official',
      description: 'Platform-managed with guaranteed payment',
    },
    {
      id: 'community_challenge',
      icon: Trophy,
      label: 'Challenges',
      description: 'Competitive campaigns with prizes',
    },
    {
      id: 'restaurant',
      icon: Building2,
      label: 'Restaurant Campaigns',
      description: 'Direct from restaurant partners',
    },
  ];

  const isSelected = (sourceId: string) => {
    if (sourceId === 'all') {
      return selectedSources.length === 0;
    }
    return selectedSources.includes(sourceId);
  };

  const handleToggle = (sourceId: string) => {
    if (sourceId === 'all') {
      onSourceToggle('all'); // Clear all filters
    } else {
      onSourceToggle(sourceId);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Filter Campaigns</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          {/* Source Filters */}
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Campaign Source</Text>

            {sources.map((source) => {
              const Icon = source.icon;
              const selected = isSelected(source.id);

              return (
                <TouchableOpacity
                  key={source.id}
                  style={[styles.filterOption, selected && styles.filterOptionSelected]}
                  onPress={() => handleToggle(source.id)}
                >
                  <View style={styles.filterIconContainer}>
                    <Icon size={20} color={selected ? '#FF6B35' : '#6B7280'} />
                  </View>

                  <View style={styles.filterContent}>
                    <Text style={[styles.filterLabel, selected && styles.filterLabelSelected]}>
                      {source.label}
                    </Text>
                    <Text style={styles.filterDescription}>{source.description}</Text>
                  </View>

                  {selected && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Apply Button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.applyButton} onPress={onClose}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterOptionSelected: {
    backgroundColor: '#FFF7F5',
    borderColor: '#FF6B35',
  },
  filterIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  filterContent: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  filterLabelSelected: {
    color: '#FF6B35',
  },
  filterDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  applyButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
```

## Definition of Done
- [ ] CampaignCard component updated with source badges
- [ ] Campaign detail screen updated with Troodie/Challenge headers
- [ ] Trust indicators displayed for Troodie-managed campaigns
- [ ] Partnership campaigns appear as regular restaurant campaigns (no Troodie branding)
- [ ] Community challenges display trophy icon and challenge-specific UI
- [ ] Campaign filters component created and functional
- [ ] Filter by campaign source works correctly
- [ ] Apply flow works identically for all campaign types
- [ ] Guaranteed payment indicator shows on Troodie campaigns
- [ ] Visual design matches brand guidelines
- [ ] All components use React Native (View, Text, TouchableOpacity, etc.)
- [ ] Manual testing confirms proper display of all campaign types
- [ ] Edge cases handled (missing images, long text, etc.)

## Notes
- **React Native**: All code uses React Native components (View, Text, TouchableOpacity, Modal, ScrollView, SafeAreaView, Image)
- **Partnership Transparency**: White-label partnerships appear as restaurant campaigns to maintain authenticity
- **Trust Signals**: Emphasize guaranteed payment and platform management for Troodie-direct campaigns
- **Visual Differentiation**: Use color coding (Orange for Troodie, Purple for Challenges)
- **Filter UX**: Modal bottom sheet for mobile-friendly filtering experience
- **Backwards Compatible**: Regular restaurant campaigns continue working without changes
- **Reference**: TROODIE_MANAGED_CAMPAIGNS_STRATEGY.md section "Creator Experience"
- **Related Tasks**: TMC-001 (Database Schema), TMC-003 (Admin UI), TMC-005 (Analytics)
- **Future Enhancement**: Add "Featured" badge for high-priority Troodie campaigns, creator ratings/reviews for completed platform campaigns
