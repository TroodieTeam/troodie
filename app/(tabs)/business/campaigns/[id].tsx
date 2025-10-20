import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    ArrowLeft,
    Clock,
    DollarSign,
    Edit,
    Target,
    Users
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
  reviewed_at?: string;
  reviewer_id?: string;
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
      
      // Update the local applications state immediately for better UX
      setApplications(prev => prev.map(app => 
        app.id === applicationId 
          ? { ...app, status: action, reviewed_at: new Date().toISOString(), reviewer_id: user?.id }
          : app
      ));
      
      Alert.alert('Success', `Application ${action}`);
      
      // Refresh campaign data to update counts
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
        <View style={{
          marginHorizontal: 20,
          marginTop: 12,
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: '#E8E8E8',
        }}>
          {['overview', 'applications', 'content'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={{
                flex: 1,
                paddingVertical: 12,
                alignItems: 'center',
                borderBottomWidth: 2,
                borderBottomColor: activeTab === tab ? '#FFAD27' : 'transparent',
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
              </Text>
            </TouchableOpacity>
          ))}
        </View>

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
      </ScrollView>
    </SafeAreaView>
  );
}