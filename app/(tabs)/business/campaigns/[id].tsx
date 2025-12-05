import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getInvitationsForCampaign, withdrawInvitation, type CampaignInvitation } from '@/services/campaignInvitationService';
import { canRateApplication, rateCreator } from '@/services/ratingService';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Clock,
  DollarSign,
  Edit,
  ExternalLink,
  Mail,
  Star,
  Target,
  Users,
  X
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface CampaignDetail {
  id: string;
  name: string;
  title?: string;
  description: string;
  status: string;
  budget_cents: number;
  spent_amount_cents: number;
  start_date: string;
  end_date: string;
  max_creators: number;
  selected_creators_count: number;
  total_deliverables: number;
  delivered_content_count: number;
  created_at: string;
  restaurant: {
    id: string;
    name: string;
    cover_photo_url: string;
  };
}

interface Application {
  id: string;
  creator_profiles: {
    id: string;
    display_name: string;
    avatar_url: string;
    followers_count: number;
    specialties: string[];
  };
  status: string;
  proposed_rate_cents: number;
  proposed_deliverables: string;
  cover_letter: string;
  applied_at: string;
  reviewed_at?: string;
  reviewer_id?: string;
  rating?: number;
  rating_comment?: string;
  rated_at?: string;
}

interface Content {
  id: string;
  creator_profiles: {
    display_name: string;
    avatar_url: string;
  };
  thumbnail_url: string;
  content_type: string;
  caption: string;
  views: number;
  likes: number;
  posted_at: string;
}

interface Deliverable {
  id: string;
  campaign_application_id: string;
  creator_id: string;
  platform: string;
  platform_post_url: string;
  caption: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'needs_revision';
  submitted_at: string;
  reviewed_at?: string;
  reviewer_id?: string;
  restaurant_feedback?: string;
  auto_approved: boolean;
  creator_profiles: {
    display_name: string;
    avatar_url: string;
  };
}

export default function CampaignDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [content, setContent] = useState<Content[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [invitations, setInvitations] = useState<CampaignInvitation[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'applications' | 'content' | 'deliverables' | 'invitations'>('overview');
  
  // Rating modal state (CM-16)
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState<string>('');
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    if (id) {
      loadCampaignData();
    }
  }, [id]);

  const loadCampaignData = async () => {
    try {
      if (!user?.id || !id) {
        return;
      }

      // Check if user is admin
      const ADMIN_USER_IDS = [
        'b08d9600-358d-4be9-9552-4607d9f50227',
        '31744191-f7c0-44a4-8673-10b34ccbb87f',
        'a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599' // kouame@troodieapp.com
      ];
      const isAdmin = ADMIN_USER_IDS.includes(user.id);

      // Load campaign details - admins can see all campaigns, regular users only their own
      let query = supabase
        .from('campaigns')
        .select(`
          *,
          restaurants (
            id,
            name,
            cover_photo_url
          )
        `)
        .eq('id', id);

      if (!isAdmin) {
        query = query.eq('owner_id', user.id);
      }

      const { data: campaignData, error: campaignError } = await query.single();

      if (campaignError) {
        throw campaignError;
      }

      setCampaign({
        ...campaignData,
        restaurant: campaignData.restaurants,
      });

      // Load applications
      console.log('[CampaignDetails] Loading applications for campaign:', id);
      const { data: applicationsData, error: appsError } = await supabase
        .from('campaign_applications')
        .select(`
          *,
          creator_profiles (
            id,
            display_name,
            avatar_url,
            followers_count,
            specialties
          )
        `)
        .eq('campaign_id', id)
        .order('applied_at', { ascending: false });
      
      // Include rating fields (CM-16)
      const applicationsWithRatings = applicationsData?.map(app => ({
        ...app,
        rating: app.rating || undefined,
        rating_comment: app.rating_comment || undefined,
        rated_at: app.rated_at || undefined,
      })) || [];

      if (appsError) {
        console.error('[CampaignDetails] Applications load error:', appsError);
        throw appsError;
      }
      
      console.log('[CampaignDetails] Applications loaded from database:', applicationsData);
      setApplications(applicationsWithRatings);

      // Load content
      const { data: contentData, error: contentError } = await supabase
        .from('portfolio_items')
        .select(`
          *,
          creator_profiles (
            display_name,
            avatar_url
          )
        `)
        .eq('campaign_id', id)
        .order('posted_at', { ascending: false });

      if (contentError) throw contentError;
      setContent(contentData || []);

      // Load deliverables
      const { data: deliverablesData, error: deliverablesError } = await supabase
        .from('campaign_deliverables')
        .select(`
          *,
          creator_profiles (
            display_name,
            avatar_url
          )
        `)
        .eq('campaign_id', id)
        .order('submitted_at', { ascending: false });

      if (deliverablesError) throw deliverablesError;
      setDeliverables(deliverablesData || []);

      // Load invitations
      const { data: invitationsData, error: invitationsError } = await getInvitationsForCampaign(id as string);
      if (invitationsError) {
        console.error('[CampaignDetails] Invitations load error:', invitationsError);
      } else {
        setInvitations(invitationsData || []);
      }

    } catch (error) {
      console.error('Failed to load campaign:', error);
      Alert.alert('Error', 'Failed to load campaign details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCampaignData();
  };

  const handleDeliverableStatusChange = async (deliverableId: string, status: string, feedback?: string) => {
    try {
      const { error } = await supabase
        .from('campaign_deliverables')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewer_id: user?.id,
          restaurant_feedback: feedback,
        })
        .eq('id', deliverableId);

      if (error) throw error;

      // Update local state
      setDeliverables(prev => prev.map(d => 
        d.id === deliverableId 
          ? { ...d, status: status as any, reviewed_at: new Date().toISOString(), reviewer_id: user?.id, restaurant_feedback: feedback }
          : d
      ));

      Alert.alert('Success', `Deliverable ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'marked for revision'}`);
    } catch (error) {
      console.error('Failed to update deliverable status:', error);
      Alert.alert('Error', 'Failed to update deliverable status');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      Alert.alert('Success', `Campaign ${newStatus}`);
      loadCampaignData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update campaign status');
    }
  };

  const handleApplicationAction = async (applicationId: string, action: 'accepted' | 'rejected') => {
    try {
      console.log('[CampaignDetails] handleApplicationAction called');
      console.log('[CampaignDetails] Application ID:', applicationId);
      console.log('[CampaignDetails] Action:', action);
      console.log('[CampaignDetails] User ID:', user?.id);
      
      const { error } = await supabase
        .from('campaign_applications')
        .update({ 
          status: action,
          reviewed_at: new Date().toISOString(),
          reviewer_id: user?.id
        })
        .eq('id', applicationId);

      if (error) {
        console.error('[CampaignDetails] Database update error:', error);
        throw error;
      }
      
      console.log('[CampaignDetails] Database update successful');
      
      // Update the local applications state immediately for better UX
      setApplications(prev => {
        console.log('[CampaignDetails] Previous applications:', prev);
        const updated = prev.map(app => 
          app.id === applicationId 
            ? { ...app, status: action, reviewed_at: new Date().toISOString(), reviewer_id: user?.id }
            : app
        );
        console.log('[CampaignDetails] Updated applications:', updated);
        return updated;
      });
      
      Alert.alert('Success', `Application ${action}`);
      
      // Refresh campaign data to update counts
      console.log('[CampaignDetails] Refreshing campaign data...');
      loadCampaignData();
    } catch (error) {
      console.error('[CampaignDetails] handleApplicationAction error:', error);
      Alert.alert('Error', 'Failed to update application');
    }
  };

  // Rating handlers (CM-16)
  const handleOpenRatingModal = async (applicationId: string) => {
    const { canRate, alreadyRated } = await canRateApplication(applicationId);
    if (!canRate) {
      if (alreadyRated) {
        Alert.alert('Already Rated', 'You have already rated this creator for this campaign.');
      } else {
        Alert.alert('Cannot Rate', 'You can only rate creators after campaign completion.');
      }
      return;
    }
    setSelectedApplicationId(applicationId);
    setRating(5);
    setRatingComment('');
    setRatingModalVisible(true);
  };

  const handleSubmitRating = async () => {
    if (!selectedApplicationId) return;
    
    setSubmittingRating(true);
    try {
      const result = await rateCreator({
        applicationId: selectedApplicationId,
        rating,
        comment: ratingComment || undefined,
      });

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to submit rating');
        return;
      }

      Alert.alert('Success', 'Rating submitted successfully');
      setRatingModalVisible(false);
      setSelectedApplicationId(null);
      setRating(5);
      setRatingComment('');
      
      // Refresh applications to show updated rating
      loadCampaignData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleWithdrawInvitation = async (invitationId: string) => {
    Alert.alert(
      'Withdraw Invitation',
      'Are you sure you want to withdraw this invitation? The creator will no longer be able to accept it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data, error } = await withdrawInvitation(invitationId);
              if (error) {
                Alert.alert('Error', error.message || 'Failed to withdraw invitation');
                return;
              }
              Alert.alert('Success', 'Invitation withdrawn successfully');
              loadCampaignData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to withdraw invitation');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'completed': return '#3B82F6';
      case 'cancelled': return '#EF4444';
      default: return DS.colors.textLight;
    }
  };

  const getDaysRemaining = () => {
    if (!campaign) return 0;
    const end = new Date(campaign.end_date);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={DS.colors.primaryOrange} />
        </View>
      </SafeAreaView>
    );
  }

  if (!campaign) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
        <View style={{ padding: DS.spacing.md }}>
          <Text>Campaign not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      {/* Modern Header */}
      <View style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottomWidth: 1,
        borderBottomColor: '#E8E8E8',
        paddingTop: 24,
        paddingBottom: 16,
        paddingHorizontal: 20,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(0, 0, 0, 0.03)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={20} color="#262626" />
          </TouchableOpacity>
          
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: '#262626',
              letterSpacing: -0.5,
            }}>Campaign Details</Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => router.push(`/business/campaigns/${id}/edit`)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(0, 0, 0, 0.03)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Edit size={18} color="#FFAD27" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        style={{ flex: 1 }}
      >
        {/* Condensed Hero Section */}
        <View style={{
          backgroundColor: '#FFFFFF',
          marginHorizontal: 20,
          marginTop: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#E8E8E8',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        }}>
          <View style={{ padding: 16 }}>
            {/* Title and Status */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#262626',
                flex: 1,
              }}>{campaign.title || campaign.name}</Text>
              
              <View style={{
                backgroundColor: getStatusColor(campaign.status),
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
              }}>
                <Text style={{
                  color: 'white',
                  fontSize: 10,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                }}>{campaign.status}</Text>
              </View>
            </View>

            {/* Key Metrics Row */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <DollarSign size={14} color="#8C8C8C" />
                <Text style={{ marginLeft: 4, fontSize: 12, color: '#262626', fontWeight: '500' }}>
                  ${(campaign.spent_amount_cents / 100).toFixed(0)}/${(campaign.budget_cents / 100).toFixed(0)}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Users size={14} color="#8C8C8C" />
                <Text style={{ marginLeft: 4, fontSize: 12, color: '#262626', fontWeight: '500' }}>
                  {campaign.selected_creators_count}/{campaign.max_creators}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Clock size={14} color="#8C8C8C" />
                <Text style={{ marginLeft: 4, fontSize: 12, color: '#262626', fontWeight: '500' }}>
                  {getDaysRemaining()}d left
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Condensed Tab Navigation */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={{
            marginHorizontal: 20,
            marginTop: 12,
          }}
          contentContainerStyle={{
            borderBottomWidth: 1,
            borderBottomColor: '#E8E8E8',
          }}
        >
          {['overview', 'applications', 'invitations', 'content', 'deliverables'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                alignItems: 'center',
                borderBottomWidth: 2,
                borderBottomColor: activeTab === tab ? '#FFAD27' : 'transparent',
                minWidth: 100,
              }}
              onPress={() => setActiveTab(tab as any)}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: activeTab === tab ? '600' : '500',
                color: activeTab === tab ? '#262626' : '#8C8C8C',
                textTransform: 'capitalize',
              }}>
                {tab}
                {tab === 'applications' && applications.filter(a => a.status === 'pending').length > 0 && (
                  <Text style={{ color: '#DC2626', fontWeight: '600' }}> ({applications.filter(a => a.status === 'pending').length})</Text>
                )}
                {tab === 'invitations' && invitations.filter(i => i.status === 'pending').length > 0 && (
                  <Text style={{ color: '#F59E0B', fontWeight: '600' }}> ({invitations.filter(i => i.status === 'pending').length})</Text>
                )}
                {tab === 'deliverables' && deliverables.filter(d => d.status === 'pending_review').length > 0 && (
                  <Text style={{ color: '#F59E0B', fontWeight: '600' }}> ({deliverables.filter(d => d.status === 'pending_review').length})</Text>
                )}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
            {/* Quick Actions - Prioritized */}
            {campaign.status === 'active' && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: '#FFAD27',
                    padding: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                  onPress={() => handleStatusChange('pending')}
                >
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Pause</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: '#DC2626',
                    padding: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    Alert.alert(
                      'End Campaign',
                      'Are you sure you want to end this campaign?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'End', style: 'destructive', onPress: () => handleStatusChange('completed') }
                      ]
                    );
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>End</Text>
                </TouchableOpacity>
              </View>
            )}

            {campaign.status === 'pending' && (
              <TouchableOpacity
                style={{
                  backgroundColor: '#10B981',
                  padding: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginBottom: 16,
                }}
                onPress={() => handleStatusChange('active')}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Resume Campaign</Text>
              </TouchableOpacity>
            )}

            {/* Condensed Campaign Info */}
            <View style={{
              backgroundColor: '#FFFFFF',
              padding: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#E8E8E8',
              marginBottom: 12,
            }}>
              <Text style={{ fontSize: 13, color: '#8C8C8C', marginBottom: 8 }}>{campaign.description}</Text>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11, color: '#8C8C8C' }}>
                  {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                </Text>
                <Text style={{ fontSize: 11, color: '#8C8C8C' }}>{campaign.restaurant?.name}</Text>
              </View>
            </View>

            {/* Compact Progress */}
            <View style={{
              backgroundColor: '#FFFFFF',
              padding: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#E8E8E8',
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: '#8C8C8C' }}>Budget Used</Text>
                <Text style={{ fontSize: 12, color: '#262626', fontWeight: '600' }}>
                  {Math.round((campaign.spent_amount_cents / campaign.budget_cents) * 100)}%
                </Text>
              </View>
              <View style={{
                height: 4,
                backgroundColor: '#F7F7F7',
                borderRadius: 2,
                marginBottom: 12,
              }}>
                <View style={{
                  height: 4,
                  backgroundColor: '#FFAD27',
                  borderRadius: 2,
                  width: `${(campaign.spent_amount_cents / campaign.budget_cents) * 100}%`,
                }} />
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#8C8C8C' }}>Deliverables</Text>
                <Text style={{ fontSize: 12, color: '#262626', fontWeight: '600' }}>
                  {campaign.delivered_content_count}/{campaign.total_deliverables}
                </Text>
              </View>
              <View style={{
                height: 4,
                backgroundColor: '#F7F7F7',
                borderRadius: 2,
                marginTop: 8,
              }}>
                <View style={{
                  height: 4,
                  backgroundColor: '#10B981',
                  borderRadius: 2,
                  width: `${(campaign.delivered_content_count / (campaign.total_deliverables || 1)) * 100}%`,
                }} />
              </View>
            </View>

          </View>
        )}

        {activeTab === 'applications' && (
          <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
            {applications.length === 0 ? (
              <View style={{
                backgroundColor: '#FFFFFF',
                padding: 24,
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#E8E8E8',
              }}>
                <Users size={32} color="#8C8C8C" />
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#262626',
                  marginTop: 12,
                  marginBottom: 4,
                }}>No Applications Yet</Text>
                <Text style={{
                  fontSize: 13,
                  color: '#8C8C8C',
                  textAlign: 'center',
                }}>Creators will apply once your campaign is active</Text>
              </View>
            ) : (
              applications.map((application) => (
                <View
                  key={application.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: '#E8E8E8',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Image
                      source={{ uri: application.creator_profiles.avatar_url || 'https://via.placeholder.com/50' }}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        marginRight: 12,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#262626' }}>
                          {application.creator_profiles.display_name}
                        </Text>
                        <View style={{
                          backgroundColor: application.status === 'accepted' ? '#10B981' : 
                                         application.status === 'rejected' ? '#DC2626' : '#F59E0B',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                        }}>
                          <Text style={{ color: 'white', fontSize: 9, fontWeight: '600', textTransform: 'uppercase' }}>
                            {application.status}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 11, color: '#8C8C8C', marginBottom: 4 }}>
                        {application.creator_profiles.followers_count.toLocaleString()} followers • ${(application.proposed_rate_cents / 100).toFixed(0)}
                      </Text>
                      
                      {application.status === 'pending' && (
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              backgroundColor: '#10B981',
                              padding: 8,
                              borderRadius: 6,
                              alignItems: 'center',
                            }}
                            onPress={() => handleApplicationAction(application.id, 'accepted')}
                          >
                            <Text style={{ color: 'white', fontWeight: '600', fontSize: 12 }}>Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              backgroundColor: '#DC2626',
                              padding: 8,
                              borderRadius: 6,
                              alignItems: 'center',
                            }}
                            onPress={() => handleApplicationAction(application.id, 'rejected')}
                          >
                            <Text style={{ color: 'white', fontWeight: '600', fontSize: 12 }}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      
                      {application.status === 'accepted' && (
                        <View style={{ marginTop: 8 }}>
                          {application.rating ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Star size={14} color="#FFAD27" fill="#FFAD27" />
                              <Text style={{ fontSize: 12, color: '#262626', fontWeight: '500' }}>
                                Rated {application.rating}/5
                              </Text>
                              {application.rating_comment && (
                                <Text style={{ fontSize: 11, color: '#8C8C8C', marginLeft: 8, flex: 1 }} numberOfLines={1}>
                                  "{application.rating_comment}"
                                </Text>
                              )}
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={{
                                backgroundColor: '#FFAD27',
                                padding: 8,
                                borderRadius: 6,
                                alignItems: 'center',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                gap: 4,
                              }}
                              onPress={() => handleOpenRatingModal(application.id)}
                            >
                              <Star size={14} color="white" />
                              <Text style={{ color: 'white', fontWeight: '600', fontSize: 12 }}>Rate Creator</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'content' && (
          <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
            {content.length === 0 ? (
              <View style={{
                backgroundColor: '#FFFFFF',
                padding: 24,
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#E8E8E8',
              }}>
                <Target size={32} color="#8C8C8C" />
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#262626',
                  marginTop: 12,
                  marginBottom: 4,
                }}>No Content Yet</Text>
                <Text style={{
                  fontSize: 13,
                  color: '#8C8C8C',
                  textAlign: 'center',
                }}>Content will appear here as creators deliver</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {content.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={{
                      width: '48%',
                    }}
                  >
                    <View style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 8,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: '#E8E8E8',
                    }}>
                      <Image
                        source={{ uri: item.thumbnail_url }}
                        style={{
                          width: '100%',
                          height: 100,
                          backgroundColor: '#F7F7F7',
                        }}
                      />
                      <View style={{ padding: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Image
                            source={{ uri: item.creator_profiles.avatar_url || 'https://via.placeholder.com/16' }}
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 8,
                              marginRight: 4,
                            }}
                          />
                          <Text style={{ fontSize: 11, color: '#262626', flex: 1, fontWeight: '500' }} numberOfLines={1}>
                            {item.creator_profiles.display_name}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 10, color: '#8C8C8C' }}>
                          {item.views} views • {item.likes} likes
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'invitations' && (
          <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
            {invitations.length === 0 ? (
              <View style={{
                backgroundColor: '#FFFFFF',
                padding: 24,
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#E8E8E8',
              }}>
                <Mail size={32} color="#8C8C8C" />
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#262626',
                  marginTop: 12,
                  marginBottom: 4,
                }}>No Invitations Yet</Text>
                <Text style={{
                  fontSize: 13,
                  color: '#8C8C8C',
                  textAlign: 'center',
                  marginBottom: 16,
                }}>Invite creators from the Browse Creators screen</Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#FFAD27',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 8,
                  }}
                  onPress={() => router.push('/business/creators/browse')}
                >
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Browse Creators</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {invitations.map((invitation) => (
                  <View
                    key={invitation.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#E8E8E8',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 8,
                      elevation: 2,
                      padding: 16,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <Image
                        source={{ uri: invitation.creator?.avatar_url || 'https://via.placeholder.com/50' }}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          marginRight: 12,
                          backgroundColor: '#F7F7F7',
                        }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 16,
                          fontWeight: '600',
                          color: '#262626',
                          marginBottom: 2,
                        }}>
                          {invitation.creator?.display_name || 'Unknown Creator'}
                        </Text>
                        {invitation.creator?.username && (
                          <Text style={{
                            fontSize: 13,
                            color: '#8C8C8C',
                          }}>
                            @{invitation.creator.username}
                          </Text>
                        )}
                      </View>
                      <View style={{
                        backgroundColor: invitation.status === 'accepted' ? '#10B981' :
                                       invitation.status === 'declined' ? '#DC2626' :
                                       invitation.status === 'withdrawn' ? '#6B7280' :
                                       invitation.status === 'expired' ? '#F59E0B' : '#F59E0B',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                      }}>
                        <Text style={{
                          color: 'white',
                          fontSize: 11,
                          fontWeight: '600',
                          textTransform: 'uppercase',
                        }}>
                          {invitation.status}
                        </Text>
                      </View>
                    </View>

                    {invitation.message && (
                      <View style={{
                        backgroundColor: '#F7F7F7',
                        padding: 12,
                        borderRadius: 8,
                        marginBottom: 12,
                      }}>
                        <Text style={{
                          fontSize: 13,
                          color: '#262626',
                          lineHeight: 18,
                        }}>
                          {invitation.message}
                        </Text>
                      </View>
                    )}

                    <View style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}>
                      <Text style={{
                        fontSize: 12,
                        color: '#8C8C8C',
                      }}>
                        Sent {new Date(invitation.invited_at).toLocaleDateString()}
                      </Text>
                      {invitation.status === 'pending' && invitation.expires_at && (
                        <Text style={{
                          fontSize: 12,
                          color: '#F59E0B',
                          fontWeight: '500',
                        }}>
                          Expires {new Date(invitation.expires_at).toLocaleDateString()}
                        </Text>
                      )}
                      {invitation.responded_at && (
                        <Text style={{
                          fontSize: 12,
                          color: '#8C8C8C',
                        }}>
                          Responded {new Date(invitation.responded_at).toLocaleDateString()}
                        </Text>
                      )}
                    </View>

                    {invitation.status === 'pending' && (
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#DC2626',
                          padding: 10,
                          borderRadius: 8,
                          alignItems: 'center',
                        }}
                        onPress={() => handleWithdrawInvitation(invitation.id)}
                      >
                        <Text style={{
                          color: 'white',
                          fontWeight: '600',
                          fontSize: 14,
                        }}>
                          Withdraw Invitation
                        </Text>
                      </TouchableOpacity>
                    )}

                    {invitation.status === 'accepted' && (
                      <View style={{
                        backgroundColor: '#F0FDF4',
                        padding: 10,
                        borderRadius: 8,
                        alignItems: 'center',
                      }}>
                        <Text style={{
                          color: '#10B981',
                          fontWeight: '600',
                          fontSize: 13,
                        }}>
                          ✓ Creator accepted this invitation
                        </Text>
                      </View>
                    )}

                    {invitation.status === 'declined' && (
                      <View style={{
                        backgroundColor: '#FEF2F2',
                        padding: 10,
                        borderRadius: 8,
                        alignItems: 'center',
                      }}>
                        <Text style={{
                          color: '#DC2626',
                          fontWeight: '600',
                          fontSize: 13,
                        }}>
                          Creator declined this invitation
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'deliverables' && (
          <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
            {deliverables.length === 0 ? (
              <View style={{
                backgroundColor: '#FFFFFF',
                padding: 24,
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#E8E8E8',
              }}>
                <Target size={32} color="#8C8C8C" />
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#262626',
                  marginTop: 12,
                  marginBottom: 4,
                }}>No Deliverables Yet</Text>
                <Text style={{
                  fontSize: 13,
                  color: '#8C8C8C',
                  textAlign: 'center',
                }}>Deliverables will appear here as creators submit content</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {deliverables.map((deliverable) => (
                  <DeliverableCard 
                    key={deliverable.id} 
                    deliverable={deliverable} 
                    onStatusChange={(status, feedback) => handleDeliverableStatusChange(deliverable.id, status, feedback)}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Rating Modal (CM-16) */}
      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 400,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#262626' }}>Rate Creator</Text>
              <TouchableOpacity onPress={() => setRatingModalVisible(false)}>
                <X size={24} color="#8C8C8C" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 14, color: '#8C8C8C', marginBottom: 16 }}>
              How would you rate this creator's performance?
            </Text>

            {/* Star Rating */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={{ padding: 4 }}
                >
                  <Star
                    size={40}
                    color="#FFAD27"
                    fill={star <= rating ? '#FFAD27' : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 14, color: '#262626', textAlign: 'center', marginBottom: 16, fontWeight: '600' }}>
              {rating} {rating === 1 ? 'star' : 'stars'}
            </Text>

            {/* Comment Input */}
            <Text style={{ fontSize: 14, color: '#262626', marginBottom: 8, fontWeight: '500' }}>
              Optional Feedback
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#E8E8E8',
                borderRadius: 8,
                padding: 12,
                minHeight: 100,
                textAlignVertical: 'top',
                fontSize: 14,
                color: '#262626',
              }}
              placeholder="Share your experience..."
              placeholderTextColor="#8C8C8C"
              value={ratingComment}
              onChangeText={setRatingComment}
              multiline
              maxLength={500}
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={{
                backgroundColor: '#FFAD27',
                padding: 14,
                borderRadius: 8,
                alignItems: 'center',
                marginTop: 20,
                opacity: submittingRating ? 0.6 : 1,
              }}
              onPress={handleSubmitRating}
              disabled={submittingRating}
            >
              {submittingRating ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>Submit Rating</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const DeliverableCard = ({ 
  deliverable, 
  onStatusChange 
}: { 
  deliverable: Deliverable; 
  onStatusChange: (status: string, feedback?: string) => void;
}) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_review': return '#F59E0B';
      case 'approved': return '#10B981';
      case 'rejected': return '#DC2626';
      case 'needs_revision': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_review': return 'Pending Review';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'needs_revision': return 'Needs Revision';
      default: return 'Unknown';
    }
  };

  const getTimeRemaining = () => {
    if (deliverable.status !== 'pending_review') return null;
    
    const submittedAt = new Date(deliverable.submitted_at);
    const deadline = new Date(submittedAt.getTime() + 72 * 60 * 60 * 1000); // 72 hours
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Overdue';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const timeRemaining = getTimeRemaining();

  return (
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E8E8E8',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    }}>
      {/* Compact Header */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        paddingBottom: deliverable.status === 'pending_review' ? 8 : 12,
      }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <Image
              source={{ uri: deliverable.creator_profiles.avatar_url || 'https://via.placeholder.com/18' }}
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                marginRight: 6,
              }}
            />
            <Text style={{
              fontSize: 13,
              fontWeight: '600',
              color: '#262626',
            }}>
              {deliverable.creator_profiles.display_name}
            </Text>
            <Text style={{
              fontSize: 10,
              color: '#8C8C8C',
              textTransform: 'uppercase',
              fontWeight: '500',
              marginLeft: 4,
            }}>
              {deliverable.platform}
            </Text>
          </View>
          
          {/* Time Remaining - Compact */}
          {timeRemaining && (
            <View style={{
              backgroundColor: timeRemaining === 'Overdue' ? '#FEE2E2' : '#FEF3C7',
              paddingHorizontal: 4,
              paddingVertical: 1,
              borderRadius: 3,
              alignSelf: 'flex-start',
            }}>
              <Text style={{
                fontSize: 9,
                fontWeight: '600',
                color: timeRemaining === 'Overdue' ? '#DC2626' : '#D97706',
              }}>
                {timeRemaining === 'Overdue' ? '⚠️ Overdue' : `⏰ ${timeRemaining}`}
              </Text>
            </View>
          )}
        </View>
        
        <View style={{
          backgroundColor: `${getStatusColor(deliverable.status)}20`,
          paddingHorizontal: 6,
          paddingVertical: 3,
          borderRadius: 4,
        }}>
          <Text style={{
            fontSize: 10,
            fontWeight: '600',
            color: getStatusColor(deliverable.status),
          }}>
            {getStatusText(deliverable.status)}
          </Text>
        </View>
      </View>

      {/* Collapsible Details */}
      {showDetails && (
        <View style={{
          paddingHorizontal: 12,
          paddingBottom: 8,
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0',
        }}>
          {/* Content */}
          {deliverable.caption && (
            <Text style={{
              fontSize: 13,
              color: '#262626',
              marginBottom: 8,
              lineHeight: 18,
            }}>
              {deliverable.caption}
            </Text>
          )}
          
          <TouchableOpacity
            style={{
              backgroundColor: '#F7F7F7',
              padding: 8,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: '#E8E8E8',
              marginBottom: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={async () => {
              try {
                const url = deliverable.platform_post_url;
                if (!url) {
                  Alert.alert('Error', 'No post URL available');
                  return;
                }

                // Check if the URL can be opened
                const canOpen = await Linking.canOpenURL(url);
                if (!canOpen) {
                  Alert.alert('Error', 'Cannot open this URL');
                  return;
                }

                // Open the URL
                await Linking.openURL(url);
              } catch (error) {
                console.error('Error opening URL:', error);
                Alert.alert('Error', 'Failed to open the post URL');
              }
            }}
          >
            <ExternalLink size={14} color="#FFAD27" style={{ marginRight: 4 }} />
            <Text style={{
              fontSize: 12,
              color: '#FFAD27',
              fontWeight: '500',
            }}>
              View Post
            </Text>
          </TouchableOpacity>

          {/* Feedback */}
          {deliverable.restaurant_feedback && (
            <View style={{
              backgroundColor: '#F0F9FF',
              padding: 8,
              borderRadius: 6,
            }}>
              <Text style={{
                fontSize: 11,
                fontWeight: '600',
                color: '#0369A1',
                marginBottom: 2,
              }}>
                Your Feedback:
              </Text>
              <Text style={{
                fontSize: 12,
                color: '#0369A1',
              }}>
                {deliverable.restaurant_feedback}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Actions - Always Visible for Pending */}
      {deliverable.status === 'pending_review' && (
        <View style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          paddingBottom: 12,
          gap: 6,
        }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#10B981',
              paddingVertical: 8,
              paddingHorizontal: 6,
              borderRadius: 6,
              alignItems: 'center',
              minHeight: 36,
            }}
            onPress={() => onStatusChange('approved')}
          >
            <Text style={{
              fontSize: 12,
              fontWeight: '600',
              color: '#FFFFFF',
              textAlign: 'center',
            }}>
              Approve
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#8B5CF6',
              paddingVertical: 8,
              paddingHorizontal: 6,
              borderRadius: 6,
              alignItems: 'center',
              minHeight: 36,
            }}
            onPress={() => {
              Alert.prompt(
                'Request Revision',
                'What changes would you like the creator to make?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Send', onPress: (feedback?: string) => onStatusChange('needs_revision', feedback || '') }
                ]
              );
            }}
          >
            <Text style={{
              fontSize: 12,
              fontWeight: '600',
              color: '#FFFFFF',
              textAlign: 'center',
            }}>
              Revision
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#DC2626',
              paddingVertical: 8,
              paddingHorizontal: 6,
              borderRadius: 6,
              alignItems: 'center',
              minHeight: 36,
            }}
            onPress={() => {
              Alert.prompt(
                'Reject Deliverable',
                'Please provide feedback for the rejection:',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Reject', onPress: (feedback?: string) => onStatusChange('rejected', feedback || '') }
                ]
              );
            }}
          >
            <Text style={{
              fontSize: 12,
              fontWeight: '600',
              color: '#FFFFFF',
              textAlign: 'center',
            }}>
              Reject
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Toggle Details Button */}
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 8,
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0',
        }}
        onPress={() => setShowDetails(!showDetails)}
      >
        <Text style={{
          fontSize: 12,
          color: '#8C8C8C',
          fontWeight: '500',
          marginRight: 4,
        }}>
          {showDetails ? 'Hide Details' : 'Show Details'}
        </Text>
        <Text style={{
          fontSize: 12,
          color: '#8C8C8C',
          transform: [{ rotate: showDetails ? '180deg' : '0deg' }],
        }}>
          ▼
        </Text>
      </TouchableOpacity>
    </View>
  );
};