import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    ArrowLeft,
    Clock,
    DollarSign,
    Edit,
    Pause,
    Play,
    Target,
    Users,
    XCircle
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface CampaignDetail {
  id: string;
  name: string;
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

export default function CampaignDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [content, setContent] = useState<Content[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'applications' | 'content'>('overview');

  useEffect(() => {
    if (id) {
      loadCampaignData();
    }
  }, [id]);

  const loadCampaignData = async () => {
    try {
      console.log('[CampaignDetails] loadCampaignData called');
      console.log('[CampaignDetails] User ID:', user?.id);
      console.log('[CampaignDetails] User email:', user?.email);
      console.log('[CampaignDetails] Campaign ID:', id);
      
      if (!user?.id || !id) {
        console.log('[CampaignDetails] Missing user ID or campaign ID, returning');
        return;
      }

      // Check if user is admin
      const ADMIN_USER_IDS = [
        'b08d9600-358d-4be9-9552-4607d9f50227',
        '31744191-f7c0-44a4-8673-10b34ccbb87f',
        'a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599' // kouame@troodieapp.com
      ];
      const isAdmin = ADMIN_USER_IDS.includes(user.id);
      console.log('[CampaignDetails] Is admin:', isAdmin);

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
        console.log('[CampaignDetails] Filtering by owner_id:', user.id);
        query = query.eq('owner_id', user.id);
      } else {
        console.log('[CampaignDetails] Admin user - fetching campaign without owner filter');
      }

      const { data: campaignData, error: campaignError } = await query.single();

      if (campaignError) {
        console.error('[CampaignDetails] Error fetching campaign:', campaignError);
        throw campaignError;
      }
      
      console.log('[CampaignDetails] Campaign data:', campaignData);

      setCampaign({
        ...campaignData,
        restaurant: campaignData.restaurants,
      });

      // Load applications
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

      if (appsError) throw appsError;
      setApplications(applicationsData || []);

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
      const { error } = await supabase
        .from('campaign_applications')
        .update({ 
          status: action,
          reviewed_at: new Date().toISOString(),
          reviewer_id: user?.id
        })
        .eq('id', applicationId);

      if (error) throw error;
      
      Alert.alert('Success', `Application ${action}`);
      loadCampaignData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update application');
    }
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
          <ActivityIndicator size="large" color={DS.colors.primary} />
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
            onPress={() => router.push(`/business/campaigns/edit/${id}`)}
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
        {/* Hero Section */}
        <View style={{
          backgroundColor: '#FFFFFF',
          marginHorizontal: 20,
          marginTop: 16,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#E8E8E8',
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.04,
          shadowRadius: 12,
          elevation: 4,
        }}>
          {/* Campaign Header */}
          <View style={{ padding: 16 }}>
            <View style={{ marginBottom: 12 }}>
              <Text style={{
                fontSize: 20,
                fontWeight: '700',
                color: '#262626',
                letterSpacing: -0.5,
                marginBottom: 8,
              }}>{campaign.title || campaign.name}</Text>
              
              <View style={{
                backgroundColor: getStatusColor(campaign.status),
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                alignSelf: 'flex-start',
              }}>
                <Text style={{
                  color: 'white',
                  fontSize: 11,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>{campaign.status}</Text>
              </View>
            </View>

            <Text style={{
              fontSize: 14,
              color: '#8C8C8C',
              lineHeight: 20,
              marginBottom: 16,
            }}>{campaign.description}</Text>

            {/* Stats Grid */}
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F7F7F7',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                flex: 1,
                minWidth: '45%',
              }}>
                <DollarSign size={16} color="#8C8C8C" />
                <Text style={{ marginLeft: 6, fontSize: 13, color: '#262626', fontWeight: '500' }}>
                  ${(campaign.spent_amount_cents / 100).toFixed(0)} / ${(campaign.budget_cents / 100).toFixed(0)}
                </Text>
              </View>
              
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F7F7F7',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                flex: 1,
                minWidth: '45%',
              }}>
                <Users size={16} color="#8C8C8C" />
                <Text style={{ marginLeft: 6, fontSize: 13, color: '#262626', fontWeight: '500' }}>
                  {campaign.selected_creators_count} / {campaign.max_creators} creators
                </Text>
              </View>
              
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F7F7F7',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                flex: 1,
                minWidth: '45%',
              }}>
                <Clock size={16} color="#8C8C8C" />
                <Text style={{ marginLeft: 6, fontSize: 13, color: '#262626', fontWeight: '500' }}>
                  {getDaysRemaining()} days left
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Modern Tab Navigation */}
        <View style={{
          marginHorizontal: 20,
          marginTop: 16,
          backgroundColor: '#F7F7F7',
          borderRadius: 12,
          padding: 4,
          borderWidth: 1,
          borderColor: '#E8E8E8',
        }}>
          <View style={{ flexDirection: 'row' }}>
            {['overview', 'applications', 'content'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  alignItems: 'center',
                  borderRadius: 8,
                  backgroundColor: activeTab === tab ? '#FFFFFF' : 'transparent',
                  shadowColor: activeTab === tab ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: activeTab === tab ? 2 : 0,
                }}
                onPress={() => setActiveTab(tab as any)}
              >
                <Text style={{
                  fontSize: 13,
                  fontWeight: activeTab === tab ? '600' : '500',
                  color: activeTab === tab ? '#262626' : '#8C8C8C',
                  textTransform: 'capitalize',
                  letterSpacing: -0.2,
                }}>
                  {tab}
                  {tab === 'applications' && applications.filter(a => a.status === 'pending').length > 0 && (
                    <Text style={{ color: '#DC2626', fontWeight: '600' }}> ({applications.filter(a => a.status === 'pending').length})</Text>
                  )}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            {/* Metrics Cards */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                padding: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#E8E8E8',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 2,
              }}>
                <Text style={{ fontSize: 12, color: '#8C8C8C', marginBottom: 8, fontWeight: '500' }}>Budget Used</Text>
                <Text style={{ fontSize: 24, fontWeight: '700', color: '#262626', marginBottom: 8 }}>
                  {Math.round((campaign.spent_amount_cents / campaign.budget_cents) * 100)}%
                </Text>
                <View style={{
                  height: 6,
                  backgroundColor: '#F7F7F7',
                  borderRadius: 3,
                }}>
                  <View style={{
                    height: 6,
                    backgroundColor: '#FFAD27',
                    borderRadius: 3,
                    width: `${(campaign.spent_amount_cents / campaign.budget_cents) * 100}%`,
                  }} />
                </View>
              </View>

              <View style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                padding: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#E8E8E8',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 2,
              }}>
                <Text style={{ fontSize: 12, color: '#8C8C8C', marginBottom: 8, fontWeight: '500' }}>Deliverables</Text>
                <Text style={{ fontSize: 24, fontWeight: '700', color: '#262626', marginBottom: 8 }}>
                  {campaign.delivered_content_count} / {campaign.total_deliverables}
                </Text>
                <View style={{
                  height: 6,
                  backgroundColor: '#F7F7F7',
                  borderRadius: 3,
                }}>
                  <View style={{
                    height: 6,
                    backgroundColor: '#10B981',
                    borderRadius: 3,
                    width: `${(campaign.delivered_content_count / (campaign.total_deliverables || 1)) * 100}%`,
                  }} />
                </View>
              </View>
            </View>

            {/* Campaign Details Card */}
            <View style={{
              backgroundColor: '#FFFFFF',
              padding: 16,
              borderRadius: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#E8E8E8',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
            }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#262626', marginBottom: 16 }}>
                Campaign Details
              </Text>
              
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: '#8C8C8C', marginBottom: 4, fontWeight: '500' }}>Duration</Text>
                <Text style={{ fontSize: 14, color: '#262626', fontWeight: '500' }}>
                  {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                </Text>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: '#8C8C8C', marginBottom: 4, fontWeight: '500' }}>Restaurant</Text>
                <Text style={{ fontSize: 14, color: '#262626', fontWeight: '500' }}>{campaign.restaurant?.name}</Text>
              </View>

              <View>
                <Text style={{ fontSize: 12, color: '#8C8C8C', marginBottom: 4, fontWeight: '500' }}>Created</Text>
                <Text style={{ fontSize: 14, color: '#262626', fontWeight: '500' }}>
                  {new Date(campaign.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {/* Modern Action Buttons */}
            {campaign.status === 'active' && (
              <View style={{ gap: 12 }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#E8E8E8',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                  onPress={() => handleStatusChange('pending')}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Pause size={18} color="#F59E0B" />
                    <Text style={{ color: '#F59E0B', fontWeight: '600', marginLeft: 8, fontSize: 14 }}>
                      Pause Campaign
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#E8E8E8',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    elevation: 2,
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
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <XCircle size={18} color="#DC2626" />
                    <Text style={{ color: '#DC2626', fontWeight: '600', marginLeft: 8, fontSize: 14 }}>
                      End Campaign
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {campaign.status === 'pending' && (
              <TouchableOpacity
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#E8E8E8',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                }}
                onPress={() => handleStatusChange('active')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Play size={18} color="#10B981" />
                  <Text style={{ color: '#10B981', fontWeight: '600', marginLeft: 8, fontSize: 14 }}>
                    Resume Campaign
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

        {activeTab === 'applications' && (
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            {applications.length === 0 ? (
              <View style={{
                backgroundColor: '#FFFFFF',
                padding: 32,
                borderRadius: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#E8E8E8',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.04,
                shadowRadius: 12,
                elevation: 4,
              }}>
                <View style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: '#F7F7F7',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <Users size={32} color="#8C8C8C" />
                </View>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: '#262626',
                  marginBottom: 8,
                  textAlign: 'center',
                }}>No Applications Yet</Text>
                <Text style={{
                  fontSize: 14,
                  color: '#8C8C8C',
                  textAlign: 'center',
                  lineHeight: 20,
                }}>Creators will apply once your campaign is active</Text>
              </View>
            ) : (
              applications.map((application) => (
                <View
                  key={application.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#E8E8E8',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <Image
                      source={{ uri: application.creator_profiles.avatar_url || 'https://via.placeholder.com/50' }}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        marginRight: 12,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#262626' }}>
                          {application.creator_profiles.display_name}
                        </Text>
                        <View style={{
                          backgroundColor: application.status === 'accepted' ? '#10B981' : 
                                         application.status === 'rejected' ? '#DC2626' : '#F59E0B',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                          marginLeft: 8,
                        }}>
                          <Text style={{ color: 'white', fontSize: 10, fontWeight: '600', textTransform: 'uppercase' }}>
                            {application.status}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, color: '#8C8C8C', marginBottom: 8 }}>
                        {application.creator_profiles.followers_count.toLocaleString()} followers
                      </Text>
                      <Text style={{ fontSize: 14, color: '#262626', marginBottom: 8, fontWeight: '500' }}>
                        ${(application.proposed_rate_cents / 100).toFixed(0)} • {application.proposed_deliverables}
                      </Text>
                      <Text style={{ fontSize: 13, color: '#8C8C8C', fontStyle: 'italic', lineHeight: 18 }}>
                        "{application.cover_letter}"
                      </Text>
                      
                      {application.status === 'pending' && (
                        <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              backgroundColor: '#10B981',
                              padding: 12,
                              borderRadius: 8,
                              alignItems: 'center',
                            }}
                            onPress={() => handleApplicationAction(application.id, 'accepted')}
                          >
                            <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              backgroundColor: '#DC2626',
                              padding: 12,
                              borderRadius: 8,
                              alignItems: 'center',
                            }}
                            onPress={() => handleApplicationAction(application.id, 'rejected')}
                          >
                            <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Reject</Text>
                          </TouchableOpacity>
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
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            {content.length === 0 ? (
              <View style={{
                backgroundColor: '#FFFFFF',
                padding: 32,
                borderRadius: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#E8E8E8',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.04,
                shadowRadius: 12,
                elevation: 4,
              }}>
                <View style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: '#F7F7F7',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <Target size={32} color="#8C8C8C" />
                </View>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: '#262626',
                  marginBottom: 8,
                  textAlign: 'center',
                }}>No Content Yet</Text>
                <Text style={{
                  fontSize: 14,
                  color: '#8C8C8C',
                  textAlign: 'center',
                  lineHeight: 20,
                }}>Content will appear here as creators deliver</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {content.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={{
                      width: '47%',
                    }}
                  >
                    <View style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 12,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: '#E8E8E8',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.04,
                      shadowRadius: 8,
                      elevation: 2,
                    }}>
                      <Image
                        source={{ uri: item.thumbnail_url }}
                        style={{
                          width: '100%',
                          height: 120,
                          backgroundColor: '#F7F7F7',
                        }}
                      />
                      <View style={{ padding: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                          <Image
                            source={{ uri: item.creator_profiles.avatar_url || 'https://via.placeholder.com/20' }}
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              marginRight: 6,
                            }}
                          />
                          <Text style={{ fontSize: 12, color: '#262626', flex: 1, fontWeight: '500' }} numberOfLines={1}>
                            {item.creator_profiles.display_name}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: '#8C8C8C' }}>
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
      </ScrollView>
    </SafeAreaView>
  );
}