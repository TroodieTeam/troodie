import { ApplicationFormModal } from '@/components/creator/ApplicationFormModal';
import { CampaignDetailModal } from '@/components/creator/CampaignDetailModal';
import { ExploreCampaignCard } from '@/components/creator/ExploreCampaignCard';
import { ExploreHeader } from '@/components/creator/ExploreHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useExploreCampaigns } from '@/hooks/useExploreCampaigns';
import { supabase } from '@/lib/supabase';
import { ExploreCampaign } from '@/types/exploreCampaign';
import { Target } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ExploreCampaigns() {
  const { user } = useAuth();
  const { campaigns, loading, refreshing, refresh } = useExploreCampaigns();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCampaigns, setFilteredCampaigns] = useState<ExploreCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<ExploreCampaign | null>(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [applying, setApplying] = useState(false);

  // Filter campaigns by search query
  useEffect(() => {
    let filtered = [...campaigns];

    if (searchQuery) {
      filtered = filtered.filter(
        (campaign) =>
          campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          campaign.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          campaign.restaurant?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCampaigns(filtered);
  }, [searchQuery, campaigns]);

  const handleCampaignPress = (campaign: ExploreCampaign) => {
    setSelectedCampaign(campaign);
    setShowCampaignModal(true);
  };

  const handleApplyClick = (campaign: ExploreCampaign) => {
    setSelectedCampaign(campaign);
    setShowApplicationForm(true);
  };

  const handleSubmitApplication = async (coverLetter: string) => {
    if (!selectedCampaign || !user) {
      return;
    }

    setApplying(true);
    try {
      // Get creator profile ID for the current user
      const { data: creatorProfile, error: creatorError } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (creatorError || !creatorProfile) {
        Alert.alert('Error', 'Creator profile not found. Please complete your creator profile first.');
        return;
      }

      // Check if already applied
      const { data: existingApp } = await supabase
        .from('campaign_applications')
        .select('id')
        .eq('campaign_id', selectedCampaign.id)
        .eq('creator_id', creatorProfile.id)
        .maybeSingle();

      if (existingApp) {
        Alert.alert('Already Applied', 'You have already applied to this campaign');
        setShowApplicationForm(false);
        refresh();
        return;
      }

      // Create application
      const { error } = await supabase.from('campaign_applications').insert({
        campaign_id: selectedCampaign.id,
        creator_id: creatorProfile.id,
        status: 'pending',
        proposed_rate_cents: null,
        cover_letter: coverLetter.trim() || null,
        proposed_deliverables: null,
        applied_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error creating application:', error);
        throw error;
      }

      Alert.alert(
        'Success!',
        'Your application has been submitted. You can view it in "My Campaigns".',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowApplicationForm(false);
              setShowCampaignModal(false);
              refresh();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error applying to campaign:', error);
      Alert.alert('Error', 'Failed to submit application. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ExploreHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* Campaign List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#F59E0B" style={styles.loader} />
        ) : filteredCampaigns.length > 0 ? (
          <>
            <View style={styles.resultHeader}>
              <Text style={styles.resultCount}>
                {filteredCampaigns.length} {filteredCampaigns.length === 1 ? 'campaign' : 'campaigns'} available
              </Text>
            </View>
            {filteredCampaigns.map((campaign) => (
              <ExploreCampaignCard
                key={campaign.id}
                campaign={campaign}
                onPress={handleCampaignPress}
              />
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Target size={48} color="#CCC" />
            <Text style={styles.emptyTitle}>No campaigns found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try adjusting your search' : 'Check back later for new opportunities'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Campaign Detail Modal */}
      <CampaignDetailModal
        visible={showCampaignModal}
        campaign={selectedCampaign}
        onClose={() => {
          setShowCampaignModal(false);
          setSelectedCampaign(null);
        }}
        onApply={handleApplyClick}
      />

      {/* Application Form Modal */}
      <ApplicationFormModal
        visible={showApplicationForm}
        campaign={selectedCampaign}
        onClose={() => {
          setShowApplicationForm(false);
          setSelectedCampaign(null);
        }}
        onSubmit={handleSubmitApplication}
        applying={applying}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 16,
  },
  loader: {
    marginTop: 50,
  },
  resultHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  resultCount: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});
