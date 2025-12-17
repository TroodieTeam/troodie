import { DS } from '@/components/design-system/tokens';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircle, ArrowLeft, Edit } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Hooks
import { useCampaignActions } from '@/hooks/useCampaignActions';
import { useCampaignDetail } from '@/hooks/useCampaignDetail';

// Components
import { ApplicationsList } from '@/components/campaigns/detail/ApplicationsList';
import { CampaignHero } from '@/components/campaigns/detail/CampaignHero';
import { DeliverablesList } from '@/components/campaigns/detail/DeliverablesList';
import { InvitationsList } from '@/components/campaigns/detail/InvitationsList';
import { OverviewTab } from '@/components/campaigns/detail/OverviewTab';
import { RatingModal } from '@/components/campaigns/detail/RatingModal';
import { TabNavigation, TabType } from '@/components/campaigns/detail/TabNavigation';

export default function CampaignDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  // State for UI
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Custom Hooks
  const {
    loading,
    refreshing,
    campaign,
    applications,
    deliverables,
    invitations,
    isTestCampaign,
    handleRefresh,
    setApplications,
    setDeliverables,
    loadCampaignData
  } = useCampaignDetail(id);

  const {
    processingPayment,
    ratingModalVisible,
    rating,
    setRating,
    ratingComment,
    setRatingComment,
    submittingRating,
    setRatingModalVisible,
    handleDeliverableStatusChange,
    handleStatusChange,
    handleApplicationAction,
    handleOpenRatingModal,
    handleSubmitRating,
    handleWithdrawInvitation
  } = useCampaignActions(campaign, loadCampaignData, setDeliverables, setApplications);

  // Refresh campaign data when screen comes into focus
  // This ensures budget and deliverable counts are updated after approval
  useFocusEffect(
    useCallback(() => {
      loadCampaignData();
    }, [loadCampaignData])
  );

  // Loading State
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={DS.colors.primaryOrange} />
        </View>
      </SafeAreaView>
    );
  }

  // Not Found State
  if (!campaign) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
        <View style={{ padding: DS.spacing.lg }}>
          <Text style={{ ...DS.typography.h3 }}>Campaign not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: DS.spacing.lg,
        paddingTop: DS.spacing.md,
        paddingBottom: DS.spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: DS.colors.background,
      }}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={{ padding: DS.spacing.xs, marginLeft: -DS.spacing.xs }}
        >
          <ArrowLeft size={24} color={DS.colors.textDark} />
        </TouchableOpacity>
        
        <Text style={{ 
          ...DS.typography.h3, 
          color: DS.colors.textDark,
          flex: 1,
          textAlign: 'center',
          marginHorizontal: DS.spacing.md
        }} numberOfLines={1}>
          {campaign.title || campaign.name}
        </Text>
        
        <TouchableOpacity 
          onPress={() => router.push(`/business/campaigns/${id}/edit`)}
          style={{ padding: DS.spacing.xs }}
        >
          <Edit size={20} color={DS.colors.primaryOrange} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={DS.colors.primaryOrange} />
        }
        contentContainerStyle={{ paddingBottom: DS.spacing.xxxl }}
      >
        {isTestCampaign && (
          <View style={{
            marginHorizontal: DS.spacing.lg,
            marginTop: DS.spacing.md,
            backgroundColor: '#FFFBEB',
            borderRadius: DS.borderRadius.md,
            padding: DS.spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#FCD34D',
          }}>
            <AlertCircle size={20} color={DS.colors.warning} style={{ marginRight: DS.spacing.sm }} />
            <Text style={{ ...DS.typography.caption, color: DS.colors.warning, fontWeight: '600' }}>
              Test Mode: Use this campaign for rating flow testing
            </Text>
          </View>
        )}

        <CampaignHero campaign={campaign} />

        <TabNavigation 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          counts={{
            applications: applications.filter(a => a.status === 'pending').length,
            invitations: invitations.filter(i => i.status === 'pending').length,
            deliverables: deliverables.filter(d => d.status === 'pending_review').length
          }}
        />

        <View style={{ paddingHorizontal: DS.spacing.lg }}>
          {activeTab === 'overview' && (
            <OverviewTab 
              campaign={campaign}
              applications={applications}
              deliverables={deliverables}
              processingPayment={processingPayment}
              onStatusChange={handleStatusChange}
            />
          )}

          {activeTab === 'applications' && (
            <ApplicationsList 
              applications={applications}
              onAction={handleApplicationAction}
              onOpenRating={handleOpenRatingModal}
            />
          )}

          {activeTab === 'deliverables' && (
            <DeliverablesList 
              deliverables={deliverables}
              onStatusChange={handleDeliverableStatusChange}
              onRateCreator={handleOpenRatingModal}
            />
          )}

          {activeTab === 'invitations' && (
            <InvitationsList 
              invitations={invitations}
              onWithdraw={handleWithdrawInvitation}
            />
          )}
        </View>
      </ScrollView>

      <RatingModal 
        visible={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        rating={rating}
        setRating={setRating}
        comment={ratingComment}
        setComment={setRatingComment}
        onSubmit={handleSubmitRating}
        submitting={submittingRating}
      />
    </SafeAreaView>
  );
}
