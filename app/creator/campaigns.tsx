import { EmptyState } from '@/components/common/EmptyState';
import { CreatorHeader } from '@/components/creator/CreatorHeader';
import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
    acceptInvitation,
    declineInvitation,
    getInvitationsForCreator,
    type CampaignInvitation
} from '@/services/campaignInvitationService';
import { useFocusEffect, useRouter } from 'expo-router';
import {
    Check,
    Clock,
    DollarSign,
    Filter,
    MapPin,
    Target,
    X
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type CampaignStatus = 'pending' | 'applied' | 'accepted' | 'active' | 'completed' | 'rejected';
type TabType = 'active' | 'pending' | 'completed' | 'invitations';

interface Campaign {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_image?: string;
  title: string;
  description: string;
  requirements: string[];
  deliverables: string[];
  payout_per_creator: number;
  deadline: Date;
  location: string;
  categories: string[];
  status: string;
  creator_status?: CampaignStatus;
  applied_at?: Date;
  deliverables_status?: Record<string, boolean>;
  has_deliverables_submitted?: boolean;
  deliverable_status?: string;
}

export default function MyCampaigns() {
  const router = useRouter();
  const { user } = useAuth();
  const [creatorProfileId, setCreatorProfileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationNote, setApplicationNote] = useState('');
  const [invitations, setInvitations] = useState<CampaignInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<CampaignInvitation | null>(null);
  const [showCampaignDetailsModal, setShowCampaignDetailsModal] = useState(false);
  const [campaignDetails, setCampaignDetails] = useState<any>(null);
  const [loadingCampaignDetails, setLoadingCampaignDetails] = useState(false);
  const [filters, setFilters] = useState({
    location: '',
    minPayout: 0,
    category: '',
  });

  useEffect(() => {
    if (user?.id) {
      loadCreatorProfile();
    }
  }, [user?.id]);

  useEffect(() => {
    if (creatorProfileId) {
      if (activeTab === 'invitations') {
        loadInvitations();
      } else {
        loadCampaigns();
      }
    }
  }, [creatorProfileId, activeTab]);

  // Refresh campaigns when screen comes into focus (e.g., returning from submit-deliverable)
  useFocusEffect(
    useCallback(() => {
      if (creatorProfileId) {
        loadCampaigns();
      }
    }, [creatorProfileId])
  );

  const loadCreatorProfile = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error loading creator profile:', error);
        // User might not have a creator profile yet
        return;
      }
      
      if (data) {
        setCreatorProfileId(data.id);
      }
    } catch (error) {
      console.error('Error loading creator profile:', error);
    }
  };

  const loadCampaigns = async () => {
    if (!creatorProfileId) return;
    
    try {
      console.log('[Campaigns] loadCampaigns called');
      console.log('[Campaigns] creatorProfileId:', creatorProfileId);
      console.log('[Campaigns] activeTab:', activeTab);
      
      // Always filter by creator's applications - this is "My Campaigns" screen
      let query = supabase.from('campaigns').select(`
        *,
        restaurants!inner(name, cover_photo_url, photos),
        campaign_applications!inner(
          status,
          applied_at,
          proposed_rate_cents
        ),
        campaign_deliverables!left(
          id,
          status,
          submitted_at
        )
      `).eq('campaign_applications.creator_id', creatorProfileId);

      // Filter based on active tab
      switch (activeTab) {
        case 'active':
          query = query.eq('campaign_applications.status', 'accepted');
          break;
        case 'pending':
          query = query.eq('campaign_applications.status', 'pending');
          break;
        case 'completed':
          query = query.eq('campaign_applications.status', 'accepted'); // Completed campaigns are still 'accepted' status
          // TODO: Add completed status to campaign_applications if needed
          break;
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Transform data
      let transformedCampaigns = data?.map(campaign => {
        // Calculate payout_per_creator from budget_cents
        // Since we only support 1 creator per campaign, payout_per_creator = total budget
        // Convert cents to dollars: budget_cents / 100
        let payoutPerCreator: number;
        if (campaign.budget_cents != null) {
          // Total budget is the payout (1 creator per campaign)
          payoutPerCreator = campaign.budget_cents / 100;
        } else if (campaign.payout_per_creator != null) {
          // Fallback: use stored payout_per_creator if budget_cents is not available
          payoutPerCreator = campaign.payout_per_creator;
        } else {
          payoutPerCreator = 0;
        }
        
        return {
          id: campaign.id,
          restaurant_id: campaign.restaurant_id,
          restaurant_name: campaign.restaurants?.name || 'Unknown Restaurant',
          restaurant_image: campaign.restaurants?.cover_photo_url || campaign.restaurants?.photos?.[0],
          title: campaign.title,
          description: campaign.description,
          requirements: campaign.requirements || [],
          deliverables: campaign.deliverables || [],
          payout_per_creator: payoutPerCreator || 0,
          deadline: new Date(campaign.end_date),
          location: campaign.location,
          categories: campaign.categories || [],
          status: campaign.status,
          creator_status: campaign.campaign_applications?.[0]?.status,
          applied_at: campaign.campaign_applications?.[0]?.applied_at ? 
            new Date(campaign.campaign_applications[0].applied_at) : undefined,
          deliverables_status: {},
          has_deliverables_submitted: campaign.campaign_deliverables && campaign.campaign_deliverables.length > 0,
          deliverable_status: campaign.campaign_deliverables?.[0]?.status,
        };
      }) || [];

      setCampaigns(transformedCampaigns);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInvitations = async () => {
    if (!creatorProfileId) return;
    
    try {
      setLoadingInvitations(true);
      const { data, error } = await getInvitationsForCreator(creatorProfileId, 'pending');
      
      if (error) {
        console.error('Error loading invitations:', error);
        return;
      }
      
      setInvitations(data || []);
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      const { data, error } = await acceptInvitation(invitationId);
      
      if (error) {
        Alert.alert('Error', error.message || 'Failed to accept invitation');
        return;
      }
      
      Alert.alert('Success', 'Invitation accepted! The campaign has been added to your Active campaigns.');
      loadInvitations();
      // Switch to active tab to show the new campaign
      setActiveTab('active');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to accept invitation');
    }
  };

  const handleViewCampaignDetails = async (invitation: CampaignInvitation) => {
    if (!invitation.campaign?.id) return;
    
    setSelectedInvitation(invitation);
    setShowCampaignDetailsModal(true);
    setLoadingCampaignDetails(true);
    
    try {
      // Fetch full campaign details
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          restaurants (
            id,
            name,
            cover_photo_url,
            photos
          )
        `)
        .eq('id', invitation.campaign.id)
        .single();
      
      if (error) {
        console.error('Error loading campaign details:', error);
        Alert.alert('Error', 'Failed to load campaign details');
        setShowCampaignDetailsModal(false);
        return;
      }
      
      setCampaignDetails(data);
    } catch (error) {
      console.error('Error in handleViewCampaignDetails:', error);
      Alert.alert('Error', 'Failed to load campaign details');
      setShowCampaignDetailsModal(false);
    } finally {
      setLoadingCampaignDetails(false);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    Alert.alert(
      'Decline Invitation',
      'Are you sure you want to decline this invitation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data, error } = await declineInvitation(invitationId);
              
              if (error) {
                Alert.alert('Error', error.message || 'Failed to decline invitation');
                return;
              }
              
              loadInvitations();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to decline invitation');
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'invitations') {
      await loadInvitations();
    } else {
      await loadCampaigns();
    }
    setRefreshing(false);
  };

  const applyToCampaign = async (campaignId: string) => {
    if (!creatorProfileId) return;
    
    try {
      const { error } = await supabase
        .from('campaign_applications')
        .insert({
          campaign_id: campaignId,
          creator_id: creatorProfileId,
          status: 'pending',
          cover_letter: applicationNote,
          proposed_rate_cents: 5000, // $50 default rate in cents
        });
      
      if (error) throw error;
      
      setShowApplicationModal(false);
      setApplicationNote('');
      setSelectedCampaign(null);
      loadCampaigns();
    } catch (error) {
      console.error('Error applying to campaign:', error);
    }
  };

  const updateDeliverable = async (campaignId: string, deliverableId: string, completed: boolean) => {
    if (!creatorProfileId) return;
    
    try {
      const campaign = campaigns.find(c => c.id === campaignId);
      const updatedStatus = {
        ...(campaign?.deliverables_status || {}),
        [deliverableId]: completed,
      };
      
      // Mock update for now - deliverables tracking not in campaign_applications table
      console.log('Deliverable updated:', deliverableId, completed);
      // Update local state to reflect change
      setCampaigns(prev => prev.map(c => 
        c.id === campaignId 
          ? { ...c, deliverables_status: updatedStatus }
          : c
      ));
      
      loadCampaigns();
    } catch (error) {
      console.error('Error updating deliverable:', error);
    }
  };

  const getStatusColor = (status?: CampaignStatus) => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'completed':
        return '#737373';
      case 'applied':
      case 'accepted':
        return '#F59E0B';
      case 'rejected':
        return '#EF4444';
      default:
        return '#737373';
    }
  };

  const getStatusText = (status?: CampaignStatus) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'applied':
      case 'pending':
        return 'Pending';
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Available';
    }
  };

  const renderCampaignCard = (campaign: Campaign) => (
    <TouchableOpacity
      key={campaign.id}
      style={styles.campaignCard}
      onPress={() => {
        // Direct navigation based on campaign status
        if (campaign.creator_status === 'accepted') {
          // Always allow navigation to submit-deliverable screen
          // The submit-deliverable screen will handle showing progress and
          // allowing additional submissions if not all deliverables are submitted
          router.push(`/creator/submit-deliverable?campaignId=${campaign.id}`);
        } else if (campaign.creator_status === 'pending') {
          // Show application pending state
          Alert.alert(
            'Application Pending',
            'Your application is under review. You\'ll be notified once the restaurant makes a decision.',
            [{ text: 'OK' }]
          );
        } else if (campaign.creator_status === 'rejected') {
          // Show rejection state
          Alert.alert(
            'Application Not Selected',
            'Thank you for your interest. Keep an eye out for other opportunities!',
            [{ text: 'OK' }]
          );
        } else {
          // Available campaign - show application modal
          setSelectedCampaign(campaign);
          setShowApplicationModal(true);
        }
      }}
    >
      <View style={styles.campaignHeader}>
        {campaign.restaurant_image && (
          <Image source={{ uri: campaign.restaurant_image }} style={styles.restaurantImage} />
        )}
        <View style={styles.campaignInfo}>
          <Text style={styles.restaurantName}>{campaign.restaurant_name}</Text>
          <Text style={styles.campaignTitle} numberOfLines={2}>{campaign.title}</Text>
          <View style={styles.campaignMeta}>
            <View style={styles.metaItem}>
              <MapPin size={12} color="#737373" />
              <Text style={styles.metaText}>{campaign.location}</Text>
            </View>
            <View style={styles.metaItem}>
              <Clock size={12} color="#737373" />
              <Text style={styles.metaText}>
                {Math.ceil((campaign.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.campaignPayout}>
          <Text style={styles.payoutAmount}>
            ${typeof campaign.payout_per_creator === 'number' 
              ? campaign.payout_per_creator.toFixed(0) 
              : '0'}
          </Text>
          {campaign.creator_status && (
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(campaign.creator_status)}20` }]}>
              <Text style={[styles.statusTextBadge, { color: getStatusColor(campaign.creator_status) }]}>
                {getStatusText(campaign.creator_status)}
              </Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Action Indicator */}
      <View style={styles.actionIndicator}>
        {campaign.creator_status === 'accepted' && !campaign.has_deliverables_submitted && (
          <Text style={styles.actionText}>Submit Deliverables →</Text>
        )}
        {campaign.creator_status === 'accepted' && campaign.has_deliverables_submitted && (
          <Text style={styles.actionTextPending}>
            {campaign.deliverable_status === 'pending_review' ? 'Under Review' : 
             campaign.deliverable_status === 'approved' ? 'Approved' :
             campaign.deliverable_status === 'rejected' ? 'Needs Revision' : 'Deliverables Submitted'}
          </Text>
        )}
        {campaign.creator_status === 'pending' && (
          <Text style={styles.actionTextPending}>Pending Review</Text>
        )}
        {campaign.creator_status === 'rejected' && (
          <Text style={styles.actionTextRejected}>Not Selected</Text>
        )}
      </View>
      
      {activeTab === 'active' && campaign.deliverables && (
        <View style={styles.deliverablesSection}>
          <Text style={styles.deliverablesTitle}>Deliverables</Text>
          {campaign.deliverables.map((deliverable, index) => (
            <TouchableOpacity
              key={index}
              style={styles.deliverableItem}
              onPress={() => updateDeliverable(campaign.id, index.toString(), !campaign.deliverables_status?.[index.toString()])}
            >
              <View style={[
                styles.checkbox,
                campaign.deliverables_status?.[index.toString()] && styles.checkboxChecked
              ]}>
                {campaign.deliverables_status?.[index.toString()] && (
                  <Check size={12} color="#FFFFFF" />
                )}
              </View>
              <Text style={[
                styles.deliverableText,
                campaign.deliverables_status?.[index.toString()] && styles.deliverableTextCompleted
              ]}>
                {deliverable}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    const emptyMessages: Record<TabType, { title: string; description: string; ctaLabel?: string; onCtaPress?: () => void }> = {
      active: {
        title: 'No Active Campaigns',
        description: 'Your accepted campaigns will appear here',
      },
      pending: {
        title: 'No Pending Applications',
        description: 'Start applying to campaigns to get matched with restaurants.',
        ctaLabel: 'Explore Campaigns',
        onCtaPress: () => router.push('/creator/explore-campaigns'),
      },
      completed: {
        title: 'No Completed Campaigns',
        description: 'Your completed campaigns will appear here',
      },
      invitations: {
        title: 'No Invitations',
        description: 'You haven\'t received any campaign invitations yet.',
      },
    };
    
    const message = emptyMessages[activeTab];
    
    return (
      <EmptyState
        icon={Target}
        title={message.title}
        message={message.description}
        ctaLabel={message.ctaLabel}
        onCtaPress={message.onCtaPress}
      />
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <CreatorHeader 
        title="My Campaigns" 
        rightElement={
          <TouchableOpacity style={styles.filterButton} activeOpacity={0.7}>
            <Filter size={DS.layout.iconSize.md} color={DS.colors.textGray} />
          </TouchableOpacity>
        }
      />

      {/* Tabs */}
      <View style={styles.tabs}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {(['active', 'pending', 'completed', 'invitations'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <View style={styles.tabContent}>
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'invitations' ? 'Invitations' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
                {tab === 'invitations' && invitations.length > 0 && (
                  <View style={[styles.badge, activeTab === tab && styles.badgeActive]}>
                    <Text style={[styles.badgeText, activeTab === tab && styles.badgeTextActive]}>
                      {invitations.length}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
      >
        {activeTab === 'invitations' ? (
          loadingInvitations ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#10B981" />
            </View>
          ) : invitations.length > 0 ? (
            <View style={styles.campaignsList}>
              {invitations.map((invitation) => (
                <TouchableOpacity
                  key={invitation.id}
                  style={styles.invitationCard}
                  onPress={() => handleViewCampaignDetails(invitation)}
                  activeOpacity={0.7}
                >
                  <View style={styles.invitationHeader}>
                    <Text style={styles.invitationTitle}>New Invitation</Text>
                    <Text style={styles.invitationDate}>
                      {new Date(invitation.invited_at).toLocaleDateString()}
                    </Text>
                  </View>
                  {invitation.campaign && (
                    <>
                      <Text style={styles.invitationCampaignTitle}>
                        {invitation.campaign.title}
                      </Text>
                      <Text style={styles.invitationRestaurant}>
                        {invitation.campaign.restaurant_name}
                      </Text>
                      <View style={styles.invitationMeta}>
                        <Text style={styles.invitationBudget}>
                          ${(invitation.campaign.budget_cents / 100).toLocaleString()}
                        </Text>
                        <Text style={styles.invitationDeadline}>
                          Deadline: {new Date(invitation.campaign.deadline).toLocaleDateString()}
                        </Text>
                      </View>
                      {invitation.message && (
                        <View style={styles.invitationMessage}>
                          <Text style={styles.invitationMessageText}>{invitation.message}</Text>
                        </View>
                      )}
                      <View style={styles.invitationActions}>
                        <TouchableOpacity
                          style={styles.declineButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDeclineInvitation(invitation.id);
                          }}
                        >
                          <Text style={styles.declineButtonText}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.acceptButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleAcceptInvitation(invitation.id);
                          }}
                        >
                          <Text style={styles.acceptButtonText}>Accept</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <EmptyState
              icon={Target}
              title="No Invitations"
              message="You haven't received any campaign invitations yet."
            />
          )
        ) : campaigns.length > 0 ? (
          <View style={styles.campaignsList}>
            {campaigns.map(renderCampaignCard)}
          </View>
        ) : (
          renderEmptyState()
        )}
      </ScrollView>


      {/* Campaign Details Modal */}
      <Modal
        visible={showCampaignDetailsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCampaignDetailsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Campaign Details</Text>
            <TouchableOpacity onPress={() => setShowCampaignDetailsModal(false)}>
              <X size={24} color={DS.colors.textDark} />
            </TouchableOpacity>
          </View>
          
          {loadingCampaignDetails ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={DS.colors.primaryOrange} />
            </View>
          ) : campaignDetails && selectedInvitation?.campaign ? (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Restaurant Image */}
              {campaignDetails.restaurants?.cover_photo_url && (
                <Image
                  source={{ uri: campaignDetails.restaurants.cover_photo_url }}
                  style={styles.campaignImage}
                  resizeMode="cover"
                />
              )}
              
              {/* Restaurant Name */}
              <View style={styles.modalRestaurantSection}>
                <Text style={styles.modalRestaurantName}>
                  {campaignDetails.restaurants?.name || selectedInvitation.campaign.restaurant_name}
                </Text>
              </View>
              
              {/* Campaign Title */}
              <Text style={styles.modalCampaignTitle}>
                {selectedInvitation.campaign.title}
              </Text>
              
              {/* Campaign Description */}
              <Text style={styles.modalDescription}>
                {selectedInvitation.campaign.description || campaignDetails.description}
              </Text>
              
              {/* Campaign Stats */}
              <View style={styles.modalStats}>
                <View style={styles.modalStatItem}>
                  <DollarSign size={20} color={DS.colors.success} />
                  <View style={styles.modalStatContent}>
                    <Text style={styles.modalStatLabel}>Budget</Text>
                    <Text style={styles.modalStatValue}>
                      ${(selectedInvitation.campaign.budget_cents / 100).toLocaleString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.modalStatItem}>
                  <Clock size={20} color={DS.colors.warning} />
                  <View style={styles.modalStatContent}>
                    <Text style={styles.modalStatLabel}>Deadline</Text>
                    <Text style={styles.modalStatValue}>
                      {new Date(selectedInvitation.campaign.deadline).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>
              
              {/* Requirements */}
              {campaignDetails.requirements && Array.isArray(campaignDetails.requirements) && campaignDetails.requirements.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Requirements</Text>
                  {campaignDetails.requirements.map((req: string, index: number) => (
                    <View key={index} style={styles.requirementItem}>
                      <Text style={styles.requirementBullet}>•</Text>
                      <Text style={styles.requirementText}>{req}</Text>
                    </View>
                  ))}
                </View>
              )}
              
              {/* Deliverables */}
              {campaignDetails.deliverables && Array.isArray(campaignDetails.deliverables) && campaignDetails.deliverables.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Expected Deliverables</Text>
                  {campaignDetails.deliverables.map((deliverable: string, index: number) => (
                    <View key={index} style={styles.requirementItem}>
                      <Text style={styles.requirementBullet}>•</Text>
                      <Text style={styles.requirementText}>{deliverable}</Text>
                    </View>
                  ))}
                </View>
              )}
              
              {/* Invitation Message */}
              {selectedInvitation.message && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Message from Business</Text>
                  <View style={styles.invitationMessageBox}>
                    <Text style={styles.invitationMessageText}>{selectedInvitation.message}</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          ) : null}
          
          {/* Modal Footer Actions */}
          {selectedInvitation && !loadingCampaignDetails && (
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalDeclineButton}
                onPress={() => {
                  setShowCampaignDetailsModal(false);
                  handleDeclineInvitation(selectedInvitation.id);
                }}
              >
                <Text style={styles.modalDeclineButtonText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalAcceptButton}
                onPress={() => {
                  setShowCampaignDetailsModal(false);
                  handleAcceptInvitation(selectedInvitation.id);
                }}
              >
                <Text style={styles.modalAcceptButtonText}>Accept Invitation</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Application Modal */}
      <Modal
        visible={showApplicationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowApplicationModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Apply to Campaign</Text>
            <TouchableOpacity onPress={() => setShowApplicationModal(false)}>
              <X size={24} color="#000000" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Why are you a good fit for this campaign?</Text>
            <TextInput
              style={styles.textArea}
              value={applicationNote}
              onChangeText={setApplicationNote}
              placeholder="Tell the restaurant about your experience and audience..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.applyButton, !applicationNote && styles.applyButtonDisabled]}
              onPress={() => selectedCampaign && applyToCampaign(selectedCampaign.id)}
              disabled={!applicationNote}
            >
              <Text style={styles.applyButtonText}>Submit Application</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButton: {
    padding: DS.spacing.sm,
    borderRadius: DS.borderRadius.sm,
  },
  tabs: {
    paddingHorizontal: DS.spacing.lg,
    paddingTop: DS.spacing.sm,
    paddingBottom: DS.spacing.md,
    backgroundColor: DS.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.borderLight,
  },
  tabsContent: {
    paddingRight: DS.spacing.lg,
    gap: DS.spacing.sm,
  },
  tab: {
    paddingHorizontal: DS.spacing.lg,
    paddingVertical: DS.spacing.sm + 2,
    borderRadius: DS.borderRadius.full,
    backgroundColor: DS.colors.surfaceLight,
    minHeight: DS.layout.buttonHeight.small,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: DS.colors.success,
    ...DS.shadows.sm,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    ...DS.typography.button,
    color: DS.colors.textGray,
  },
  tabTextActive: {
    color: DS.colors.textWhite,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  campaignsList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 16,
  },
  campaignCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  campaignHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  restaurantImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
  },
  campaignInfo: {
    flex: 1,
    marginRight: 8,
  },
  restaurantName: {
    fontSize: 12,
    color: '#737373',
    marginBottom: 4,
  },
  campaignTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    lineHeight: 22,
  },
  campaignMeta: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#737373',
  },
  campaignPayout: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  payoutAmount: {
    fontSize: 20,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusTextBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
  deliverablesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  deliverablesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  deliverableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  deliverableText: {
    fontSize: 14,
    color: '#000000',
    flex: 1,
  },
  deliverableTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#737373',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#737373',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  modalContent: {
    padding: 16,
  },
  modalRestaurant: {
    fontSize: 14,
    color: '#737373',
    marginBottom: 4,
  },
  modalCampaignTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: '#737373',
    lineHeight: 20,
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  modalListText: {
    fontSize: 14,
    color: '#737373',
    flex: 1,
  },
  modalMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 24,
  },
  modalMetricItem: {
    alignItems: 'center',
  },
  modalMetricValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 4,
    marginBottom: 2,
  },
  modalMetricLabel: {
    fontSize: 12,
    color: '#737373',
  },
  applyButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  applyButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 120,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusContainer: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 14,
    color: '#737373',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionIndicator: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  actionTextPending: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F59E0B',
  },
  actionTextRejected: {
    fontSize: 14,
    fontWeight: '500',
    color: '#EF4444',
  },
  invitationCard: {
    backgroundColor: DS.colors.surface,
    borderRadius: DS.borderRadius.lg,
    padding: DS.spacing.lg,
    marginBottom: DS.spacing.md,
    borderWidth: 1,
    borderColor: DS.colors.border,
    ...DS.shadows.sm,
  },
  invitationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  invitationTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    textTransform: 'uppercase',
  },
  invitationDate: {
    fontSize: 12,
    color: '#737373',
  },
  invitationCampaignTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  invitationRestaurant: {
    fontSize: 14,
    color: '#737373',
    marginBottom: 12,
  },
  invitationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  invitationBudget: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  invitationDeadline: {
    fontSize: 13,
    color: '#737373',
  },
  invitationMessage: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  invitationMessageText: {
    fontSize: 14,
    color: '#262626',
    lineHeight: 20,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  declineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#737373',
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  badge: {
    backgroundColor: DS.colors.success,
    borderRadius: DS.borderRadius.full,
    paddingHorizontal: DS.spacing.xs + 2,
    paddingVertical: 2,
    marginLeft: DS.spacing.xs,
    minWidth: 20,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: {
    backgroundColor: DS.colors.textWhite,
  },
  badgeText: {
    ...DS.typography.caption,
    fontWeight: '700',
    color: DS.colors.textWhite,
    fontSize: 10,
    lineHeight: 14,
  },
  badgeTextActive: {
    color: DS.colors.success,
  },
  // Campaign Details Modal Styles
  campaignImage: {
    width: '100%',
    height: 200,
    backgroundColor: DS.colors.surfaceLight,
  },
  modalRestaurantSection: {
    paddingHorizontal: DS.spacing.lg,
    paddingTop: DS.spacing.md,
  },
  modalRestaurantName: {
    ...DS.typography.h3,
    color: DS.colors.textGray,
  },
  modalCampaignTitle: {
    ...DS.typography.h1,
    color: DS.colors.textDark,
    paddingHorizontal: DS.spacing.lg,
    marginTop: DS.spacing.sm,
    marginBottom: DS.spacing.md,
  },
  modalDescription: {
    ...DS.typography.body,
    color: DS.colors.textDark,
    paddingHorizontal: DS.spacing.lg,
    marginBottom: DS.spacing.lg,
    lineHeight: 22,
  },
  modalStats: {
    flexDirection: 'row',
    paddingHorizontal: DS.spacing.lg,
    marginBottom: DS.spacing.lg,
    gap: DS.spacing.md,
  },
  modalStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.surfaceLight,
    padding: DS.spacing.md,
    borderRadius: DS.borderRadius.md,
    gap: DS.spacing.sm,
  },
  modalStatContent: {
    flex: 1,
  },
  modalStatLabel: {
    ...DS.typography.caption,
    color: DS.colors.textGray,
    marginBottom: DS.spacing.xs,
  },
  modalStatValue: {
    ...DS.typography.h3,
    color: DS.colors.textDark,
  },
  modalSection: {
    paddingHorizontal: DS.spacing.lg,
    marginBottom: DS.spacing.lg,
  },
  modalSectionTitle: {
    ...DS.typography.h3,
    color: DS.colors.textDark,
    marginBottom: DS.spacing.md,
  },
  requirementItem: {
    flexDirection: 'row',
    marginBottom: DS.spacing.sm,
    paddingLeft: DS.spacing.xs,
  },
  requirementBullet: {
    ...DS.typography.body,
    color: DS.colors.textDark,
    marginRight: DS.spacing.sm,
    fontWeight: '600',
  },
  requirementText: {
    ...DS.typography.body,
    color: DS.colors.textDark,
    flex: 1,
    lineHeight: 22,
  },
  invitationMessageBox: {
    backgroundColor: DS.colors.surfaceLight,
    padding: DS.spacing.md,
    borderRadius: DS.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: DS.colors.primaryOrange,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: DS.spacing.lg,
    gap: DS.spacing.md,
    borderTopWidth: 1,
    borderTopColor: DS.colors.border,
    backgroundColor: DS.colors.surface,
  },
  modalDeclineButton: {
    flex: 1,
    paddingVertical: DS.spacing.md,
    borderRadius: DS.borderRadius.md,
    borderWidth: 1,
    borderColor: DS.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DS.colors.surface,
  },
  modalDeclineButtonText: {
    ...DS.typography.button,
    color: DS.colors.textDark,
  },
  modalAcceptButton: {
    flex: 2,
    paddingVertical: DS.spacing.md,
    borderRadius: DS.borderRadius.md,
    backgroundColor: DS.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...DS.shadows.sm,
  },
  modalAcceptButtonText: {
    ...DS.typography.button,
    color: DS.colors.textWhite,
  },
});