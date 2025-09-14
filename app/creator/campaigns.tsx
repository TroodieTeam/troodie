import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreatorHeader } from '@/components/creator/CreatorHeader';
import {
  Target,
  Clock,
  DollarSign,
  MapPin,
  Check,
  X,
  Filter,
  ChevronRight,
  Calendar,
  Users,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type CampaignStatus = 'applied' | 'accepted' | 'active' | 'completed' | 'rejected';
type TabType = 'active' | 'available' | 'pending' | 'completed';

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
}

export default function MyCampaigns() {
  const { user } = useAuth();
  const [creatorProfileId, setCreatorProfileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationNote, setApplicationNote] = useState('');
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
      loadCampaigns();
    }
  }, [creatorProfileId, activeTab]);

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
      let query = supabase.from('campaigns').select(`
        *,
        restaurants!inner(name, cover_photo_url, photos),
        campaign_applications!left(
          status,
          applied_at,
          proposed_rate_cents
        )
      `);

      // Add creator filter
      if (activeTab !== 'available') {
        query = query.eq('campaign_applications.creator_id', creatorProfileId);
      }

      // Filter based on active tab
      switch (activeTab) {
        case 'active':
          query = query.eq('campaign_applications.status', 'accepted');
          break;
        case 'available':
          query = query.eq('status', 'active');
          // Don't show campaigns already applied to
          break;
        case 'pending':
          query = query.eq('campaign_applications.status', 'pending');
          break;
        case 'completed':
          query = query.eq('campaign_applications.status', 'completed');
          break;
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Transform data
      const transformedCampaigns = data?.map(campaign => ({
        id: campaign.id,
        restaurant_id: campaign.restaurant_id,
        restaurant_name: campaign.restaurants?.name || 'Unknown Restaurant',
        restaurant_image: campaign.restaurants?.cover_photo_url || campaign.restaurants?.photos?.[0],
        title: campaign.title,
        description: campaign.description,
        requirements: campaign.requirements || [],
        deliverables: campaign.deliverables || [],
        payout_per_creator: campaign.payout_per_creator,
        deadline: new Date(campaign.end_date),
        location: campaign.location,
        categories: campaign.categories || [],
        status: campaign.status,
        creator_status: campaign.campaign_applications?.[0]?.status,
        applied_at: campaign.campaign_applications?.[0]?.applied_at ? 
          new Date(campaign.campaign_applications[0].applied_at) : undefined,
        deliverables_status: {},
      })) || [];
      
      setCampaigns(transformedCampaigns);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCampaigns();
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
      
      if (error) throw error;
      
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
      onPress={() => setSelectedCampaign(campaign)}
    >
      <View style={styles.campaignHeader}>
        {campaign.restaurant_image && (
          <Image source={{ uri: campaign.restaurant_image }} style={styles.restaurantImage} />
        )}
        <View style={styles.campaignInfo}>
          <Text style={styles.restaurantName}>{campaign.restaurant_name}</Text>
          <Text style={styles.campaignTitle} numberOfLines={1}>{campaign.title}</Text>
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
          <Text style={styles.payoutAmount}>${campaign.payout_per_creator}</Text>
          {campaign.creator_status && (
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(campaign.creator_status)}20` }]}>
              <Text style={[styles.statusText, { color: getStatusColor(campaign.creator_status) }]}>
                {getStatusText(campaign.creator_status)}
              </Text>
            </View>
          )}
        </View>
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
    const emptyMessages: Record<TabType, { title: string; description: string }> = {
      active: {
        title: 'No Active Campaigns',
        description: 'Browse available campaigns to get started',
      },
      available: {
        title: 'No Available Campaigns',
        description: 'Check back soon for new opportunities',
      },
      pending: {
        title: 'No Pending Applications',
        description: 'Apply to campaigns to see them here',
      },
      completed: {
        title: 'No Completed Campaigns',
        description: 'Your completed campaigns will appear here',
      },
    };
    
    const message = emptyMessages[activeTab];
    
    return (
      <View style={styles.emptyState}>
        <Target size={48} color="#E5E5E5" />
        <Text style={styles.emptyTitle}>{message.title}</Text>
        <Text style={styles.emptyDescription}>{message.description}</Text>
      </View>
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <CreatorHeader 
        title="My Campaigns" 
        rightElement={
          <TouchableOpacity style={styles.filterButton}>
            <Filter size={20} color="#737373" />
          </TouchableOpacity>
        }
      />

      {/* Tabs */}
      <View style={styles.tabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['active', 'available', 'pending', 'completed'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
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
        {campaigns.length > 0 ? (
          <View style={styles.campaignsList}>
            {campaigns.map(renderCampaignCard)}
          </View>
        ) : (
          renderEmptyState()
        )}
      </ScrollView>

      {/* Campaign Details Modal */}
      <Modal
        visible={!!selectedCampaign}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedCampaign(null)}
      >
        {selectedCampaign && (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Campaign Details</Text>
              <TouchableOpacity onPress={() => setSelectedCampaign(null)}>
                <X size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalRestaurant}>{selectedCampaign.restaurant_name}</Text>
              <Text style={styles.modalCampaignTitle}>{selectedCampaign.title}</Text>
              
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Description</Text>
                <Text style={styles.modalText}>{selectedCampaign.description}</Text>
              </View>
              
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Requirements</Text>
                {selectedCampaign.requirements.map((req, index) => (
                  <View key={index} style={styles.modalListItem}>
                    <Check size={16} color="#10B981" />
                    <Text style={styles.modalListText}>{req}</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Deliverables</Text>
                {selectedCampaign.deliverables.map((del, index) => (
                  <View key={index} style={styles.modalListItem}>
                    <Target size={16} color="#737373" />
                    <Text style={styles.modalListText}>{del}</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.modalMetrics}>
                <View style={styles.modalMetricItem}>
                  <DollarSign size={20} color="#10B981" />
                  <Text style={styles.modalMetricValue}>${selectedCampaign.payout_per_creator}</Text>
                  <Text style={styles.modalMetricLabel}>Payout</Text>
                </View>
                <View style={styles.modalMetricItem}>
                  <Calendar size={20} color="#F59E0B" />
                  <Text style={styles.modalMetricValue}>
                    {Math.ceil((selectedCampaign.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                  </Text>
                  <Text style={styles.modalMetricLabel}>Deadline</Text>
                </View>
                <View style={styles.modalMetricItem}>
                  <MapPin size={20} color="#3B82F6" />
                  <Text style={styles.modalMetricValue}>{selectedCampaign.location}</Text>
                  <Text style={styles.modalMetricLabel}>Location</Text>
                </View>
              </View>
              
              {activeTab === 'available' && (
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={() => {
                    setShowApplicationModal(true);
                  }}
                >
                  <Text style={styles.applyButtonText}>Apply to Campaign</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </SafeAreaView>
        )}
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
    padding: 8,
  },
  tabs: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  tabActive: {
    backgroundColor: '#10B981',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#737373',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  campaignsList: {
    padding: 16,
    gap: 12,
  },
  campaignCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 12,
  },
  campaignHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  restaurantImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  campaignInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 12,
    color: '#737373',
    marginBottom: 2,
  },
  campaignTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  campaignMeta: {
    flexDirection: 'row',
    gap: 12,
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
  },
  payoutAmount: {
    fontSize: 20,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deliverablesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  deliverablesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  deliverableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    marginRight: 8,
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
    paddingVertical: 64,
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
});