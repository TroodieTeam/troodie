import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft,
  Search,
  Plus,
  Star,
  Users,
  MessageCircle,
  Calendar,
  TrendingUp,
  Filter,
  UserCheck,
  UserX,
  Eye,
  Award,
} from 'lucide-react-native';
import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Creator {
  id: string;
  name: string;
  username: string;
  avatar_url: string;
  bio: string;
  follower_count: number;
  rating: number;
  collaboration_status: 'active' | 'past' | 'blacklisted' | 'favorite';
  total_campaigns: number;
  successful_campaigns: number;
  total_content: number;
  avg_performance_score: number;
  last_campaign_date: string;
  engagement_rate: number;
  response_rate: number;
  on_time_delivery_rate: number;
  platforms: string[];
  content_types: string[];
  recent_work: {
    campaign_title: string;
    performance_score: number;
    date: string;
  }[];
}

const STATUS_FILTERS = [
  { key: 'all', label: 'All Creators', color: DS.colors.text },
  { key: 'active', label: 'Active', color: '#10B981' },
  { key: 'past', label: 'Past', color: '#6B7280' },
  { key: 'favorite', label: 'Favorites', color: '#F59E0B' },
  { key: 'blacklisted', label: 'Blacklisted', color: '#EF4444' },
];

export default function CreatorsManagement() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [filteredCreators, setFilteredCreators] = useState<Creator[]>([]);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'rating' | 'performance' | 'campaigns' | 'recent'>('rating');

  useEffect(() => {
    loadCreators();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedStatus, sortBy, creators]);

  const loadCreators = async () => {
    try {
      // Mock data for creators management
      const mockCreators: Creator[] = [
        {
          id: '1',
          name: 'Sarah Johnson',
          username: '@foodie_sarah',
          avatar_url: 'https://via.placeholder.com/60',
          bio: 'NYC food enthusiast sharing the best eats around the city',
          follower_count: 12500,
          rating: 4.9,
          collaboration_status: 'active',
          total_campaigns: 5,
          successful_campaigns: 5,
          total_content: 23,
          avg_performance_score: 9.1,
          last_campaign_date: '2024-01-15T00:00:00Z',
          engagement_rate: 12.8,
          response_rate: 98,
          on_time_delivery_rate: 100,
          platforms: ['Instagram', 'TikTok'],
          content_types: ['Photos', 'Reels', 'Stories'],
          recent_work: [
            { campaign_title: 'Summer Menu Launch', performance_score: 9.2, date: '2024-01-15' },
            { campaign_title: 'Weekend Brunch Special', performance_score: 8.9, date: '2024-01-08' },
            { campaign_title: 'Holiday Desserts', performance_score: 9.4, date: '2023-12-20' },
          ],
        },
        {
          id: '2',
          name: 'Mike Chen',
          username: '@tastemaker_mike',
          avatar_url: 'https://via.placeholder.com/60',
          bio: 'Food critic and content creator specializing in authentic cuisine',
          follower_count: 8900,
          rating: 4.7,
          collaboration_status: 'past',
          total_campaigns: 3,
          successful_campaigns: 2,
          total_content: 12,
          avg_performance_score: 8.3,
          last_campaign_date: '2023-12-10T00:00:00Z',
          engagement_rate: 15.2,
          response_rate: 85,
          on_time_delivery_rate: 85,
          platforms: ['YouTube', 'Instagram'],
          content_types: ['Video Reviews', 'Long-form Content'],
          recent_work: [
            { campaign_title: 'Authentic Asian Flavors', performance_score: 8.1, date: '2023-12-10' },
            { campaign_title: 'Chef\'s Table Experience', performance_score: 8.7, date: '2023-11-22' },
          ],
        },
        {
          id: '3',
          name: 'Emma Rodriguez',
          username: '@chicago_eats',
          avatar_url: 'https://via.placeholder.com/60',
          bio: 'Chicago local discovering hidden gems and food adventures',
          follower_count: 15700,
          rating: 4.8,
          collaboration_status: 'favorite',
          total_campaigns: 8,
          successful_campaigns: 7,
          total_content: 34,
          avg_performance_score: 8.9,
          last_campaign_date: '2024-01-12T00:00:00Z',
          engagement_rate: 11.5,
          response_rate: 95,
          on_time_delivery_rate: 92,
          platforms: ['Instagram', 'YouTube', 'TikTok'],
          content_types: ['Photos', 'Video Reviews', 'Live Streams'],
          recent_work: [
            { campaign_title: 'Chicago Deep Dish Tour', performance_score: 9.1, date: '2024-01-12' },
            { campaign_title: 'Local Coffee Spots', performance_score: 8.8, date: '2024-01-05' },
            { campaign_title: 'Brunch Hotspots', performance_score: 8.7, date: '2023-12-28' },
          ],
        },
        {
          id: '4',
          name: 'David Park',
          username: '@drinks_with_david',
          avatar_url: 'https://via.placeholder.com/60',
          bio: 'Cocktail enthusiast and nightlife photographer',
          follower_count: 6800,
          rating: 3.2,
          collaboration_status: 'blacklisted',
          total_campaigns: 2,
          successful_campaigns: 0,
          total_content: 4,
          avg_performance_score: 4.1,
          last_campaign_date: '2023-11-15T00:00:00Z',
          engagement_rate: 6.3,
          response_rate: 45,
          on_time_delivery_rate: 25,
          platforms: ['Instagram'],
          content_types: ['Photos'],
          recent_work: [
            { campaign_title: 'Happy Hour Special', performance_score: 4.1, date: '2023-11-15' },
          ],
        },
      ];

      setCreators(mockCreators);
    } catch (error) {
      console.error('Failed to load creators:', error);
      Alert.alert('Error', 'Failed to load creators');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...creators];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(creator => 
        creator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        creator.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        creator.bio.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(creator => creator.collaboration_status === selectedStatus);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'performance':
          return b.avg_performance_score - a.avg_performance_score;
        case 'campaigns':
          return b.total_campaigns - a.total_campaigns;
        case 'recent':
          return new Date(b.last_campaign_date).getTime() - new Date(a.last_campaign_date).getTime();
        default:
          return 0;
      }
    });

    setFilteredCreators(filtered);
  };

  const handleCreatorAction = (creatorId: string, action: 'favorite' | 'blacklist' | 'remove_blacklist' | 'contact' | 'view_work') => {
    const creator = creators.find(c => c.id === creatorId);
    if (!creator) return;

    switch (action) {
      case 'favorite':
        Alert.alert(
          'Add to Favorites',
          `Add ${creator.name} to your favorite creators?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Add to Favorites', 
              onPress: () => {
                const updatedCreators = creators.map(c =>
                  c.id === creatorId ? { ...c, collaboration_status: 'favorite' as const } : c
                );
                setCreators(updatedCreators);
              }
            },
          ]
        );
        break;
      case 'blacklist':
        Alert.alert(
          'Blacklist Creator',
          `This will prevent ${creator.name} from applying to your campaigns. This action can be undone later.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Blacklist', 
              style: 'destructive',
              onPress: () => {
                const updatedCreators = creators.map(c =>
                  c.id === creatorId ? { ...c, collaboration_status: 'blacklisted' as const } : c
                );
                setCreators(updatedCreators);
              }
            },
          ]
        );
        break;
      case 'remove_blacklist':
        const updatedCreators = creators.map(c =>
          c.id === creatorId ? { ...c, collaboration_status: 'past' as const } : c
        );
        setCreators(updatedCreators);
        Alert.alert('Success', 'Creator removed from blacklist');
        break;
      case 'contact':
        Alert.alert('Contact Creator', 'Opening direct message...');
        break;
      case 'view_work':
        Alert.alert('View Work', 'Opening creator portfolio...');
        break;
    }
  };

  const getStatusColor = (status: string) => {
    const statusFilter = STATUS_FILTERS.find(f => f.key === status);
    return statusFilter?.color || DS.colors.textLight;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <UserCheck size={14} color="#10B981" />;
      case 'past': return <Users size={14} color="#6B7280" />;
      case 'favorite': return <Award size={14} color="#F59E0B" />;
      case 'blacklisted': return <UserX size={14} color="#EF4444" />;
      default: return null;
    }
  };

  const renderCreator = ({ item: creator }: { item: Creator }) => (
    <View style={{
      backgroundColor: DS.colors.backgroundWhite,
      marginHorizontal: DS.spacing.md,
      marginBottom: DS.spacing.md,
      borderRadius: DS.borderRadius.md,
      padding: DS.spacing.md,
      borderLeftWidth: 4,
      borderLeftColor: getStatusColor(creator.collaboration_status),
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: DS.spacing.sm }}>
        <Image
          source={{ uri: creator.avatar_url }}
          style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: DS.colors.border,
          }}
        />
        
        <View style={{ flex: 1, marginLeft: DS.spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text }}>
              {creator.name}
            </Text>
            {creator.collaboration_status === 'favorite' && (
              <Award size={14} color="#F59E0B" style={{ marginLeft: 4 }} />
            )}
          </View>
          
          <Text style={{ fontSize: 12, color: DS.colors.textLight, marginBottom: 4 }}>
            {creator.username} • {creator.follower_count.toLocaleString()} followers
          </Text>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {getStatusIcon(creator.collaboration_status)}
            <Text style={{
              fontSize: 10,
              color: getStatusColor(creator.collaboration_status),
              marginLeft: 4,
              textTransform: 'capitalize',
            }}>
              {creator.collaboration_status === 'blacklisted' ? 'Blacklisted' : creator.collaboration_status}
            </Text>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Star size={14} color="#FFB800" fill="#FFB800" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: DS.colors.text, marginLeft: 2 }}>
              {creator.rating}
            </Text>
          </View>
          <Text style={{ fontSize: 10, color: DS.colors.textLight }}>
            {creator.total_campaigns} campaigns
          </Text>
        </View>
      </View>

      <Text style={{
        fontSize: 12,
        color: DS.colors.text,
        lineHeight: 16,
        marginBottom: DS.spacing.sm,
      }} numberOfLines={2}>
        {creator.bio}
      </Text>

      {/* Performance Metrics */}
      <View style={{
        backgroundColor: DS.colors.background,
        padding: DS.spacing.sm,
        borderRadius: DS.borderRadius.sm,
        marginBottom: DS.spacing.sm,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: DS.colors.text }}>
              {creator.avg_performance_score}
            </Text>
            <Text style={{ fontSize: 9, color: DS.colors.textLight }}>Avg Score</Text>
          </View>
          
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: DS.colors.text }}>
              {creator.engagement_rate}%
            </Text>
            <Text style={{ fontSize: 9, color: DS.colors.textLight }}>Engagement</Text>
          </View>
          
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: DS.colors.text }}>
              {creator.on_time_delivery_rate}%
            </Text>
            <Text style={{ fontSize: 9, color: DS.colors.textLight }}>On Time</Text>
          </View>
          
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: DS.colors.text }}>
              {creator.response_rate}%
            </Text>
            <Text style={{ fontSize: 9, color: DS.colors.textLight }}>Response</Text>
          </View>
        </View>
      </View>

      {/* Platforms & Content Types */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: DS.spacing.sm }}>
        {creator.platforms.map((platform) => (
          <View key={platform} style={{
            backgroundColor: DS.colors.primary + '20',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 8,
          }}>
            <Text style={{ fontSize: 8, color: DS.colors.primary }}>{platform}</Text>
          </View>
        ))}
        {creator.content_types.slice(0, 2).map((type) => (
          <View key={type} style={{
            backgroundColor: DS.colors.background,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: DS.colors.border,
          }}>
            <Text style={{ fontSize: 8, color: DS.colors.textLight }}>{type}</Text>
          </View>
        ))}
      </View>

      {/* Recent Work */}
      {creator.recent_work.length > 0 && (
        <View style={{ marginBottom: DS.spacing.sm }}>
          <Text style={{ fontSize: 10, color: DS.colors.textLight, marginBottom: 4 }}>
            Recent Work
          </Text>
          {creator.recent_work.slice(0, 2).map((work, index) => (
            <View key={index} style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: DS.colors.background,
              padding: DS.spacing.xs,
              borderRadius: 4,
              marginBottom: 2,
            }}>
              <Text style={{ fontSize: 9, color: DS.colors.text, flex: 1 }} numberOfLines={1}>
                {work.campaign_title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 9, color: DS.colors.textLight }}>
                  ⭐ {work.performance_score}
                </Text>
                <Text style={{ fontSize: 8, color: DS.colors.textLight }}>
                  {new Date(work.date).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', gap: DS.spacing.xs }}>
        <TouchableOpacity
          onPress={() => handleCreatorAction(creator.id, 'view_work')}
          style={{
            flex: 1,
            backgroundColor: DS.colors.background,
            padding: DS.spacing.xs,
            borderRadius: DS.borderRadius.sm,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Eye size={12} color={DS.colors.text} />
          <Text style={{ fontSize: 10, color: DS.colors.text, marginLeft: 4 }}>
            View Work
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleCreatorAction(creator.id, 'contact')}
          style={{
            flex: 1,
            backgroundColor: DS.colors.primary,
            padding: DS.spacing.xs,
            borderRadius: DS.borderRadius.sm,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MessageCircle size={12} color="white" />
          <Text style={{ fontSize: 10, color: 'white', marginLeft: 4 }}>
            Contact
          </Text>
        </TouchableOpacity>

        {creator.collaboration_status === 'blacklisted' ? (
          <TouchableOpacity
            onPress={() => handleCreatorAction(creator.id, 'remove_blacklist')}
            style={{
              flex: 1,
              backgroundColor: '#10B981',
              padding: DS.spacing.xs,
              borderRadius: DS.borderRadius.sm,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 10, color: 'white' }}>Unblock</Text>
          </TouchableOpacity>
        ) : creator.collaboration_status === 'favorite' ? (
          <TouchableOpacity
            onPress={() => handleCreatorAction(creator.id, 'blacklist')}
            style={{
              flex: 1,
              backgroundColor: '#FEE2E2',
              padding: DS.spacing.xs,
              borderRadius: DS.borderRadius.sm,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 10, color: '#DC2626' }}>Block</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', gap: DS.spacing.xs, flex: 1 }}>
            <TouchableOpacity
              onPress={() => handleCreatorAction(creator.id, 'favorite')}
              style={{
                flex: 1,
                backgroundColor: '#FEF3C7',
                padding: DS.spacing.xs,
                borderRadius: DS.borderRadius.sm,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 9, color: '#F59E0B' }}>★</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleCreatorAction(creator.id, 'blacklist')}
              style={{
                flex: 1,
                backgroundColor: '#FEE2E2',
                padding: DS.spacing.xs,
                borderRadius: DS.borderRadius.sm,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 9, color: '#DC2626' }}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={DS.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: DS.spacing.md,
        backgroundColor: DS.colors.backgroundWhite,
        borderBottomWidth: 1,
        borderBottomColor: DS.colors.border,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={DS.colors.text} />
        </TouchableOpacity>
        <Text style={{
          fontSize: 17,
          fontWeight: '600',
          color: DS.colors.text,
        }}>Creators</Text>
        <TouchableOpacity onPress={() => router.push('/business/creators/browse')}>
          <Plus size={24} color={DS.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={{
        padding: DS.spacing.md,
        backgroundColor: DS.colors.backgroundWhite,
        borderBottomWidth: 1,
        borderBottomColor: DS.colors.border,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: DS.colors.background,
          borderRadius: DS.borderRadius.sm,
          paddingHorizontal: DS.spacing.sm,
        }}>
          <Search size={18} color={DS.colors.textLight} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search creators..."
            style={{
              flex: 1,
              padding: DS.spacing.sm,
              fontSize: 14,
              color: DS.colors.text,
            }}
          />
        </View>
      </View>

      {/* Status Filter Tabs */}
      <View style={{
        backgroundColor: DS.colors.backgroundWhite,
        borderBottomWidth: 1,
        borderBottomColor: DS.colors.border,
      }}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: DS.spacing.md }}
        >
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              onPress={() => setSelectedStatus(filter.key)}
              style={{
                paddingHorizontal: DS.spacing.md,
                paddingVertical: DS.spacing.sm,
                marginRight: DS.spacing.sm,
                borderBottomWidth: 2,
                borderBottomColor: selectedStatus === filter.key ? DS.colors.primary : 'transparent',
              }}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: selectedStatus === filter.key ? '600' : '400',
                color: selectedStatus === filter.key ? DS.colors.primary : DS.colors.text,
              }}>
                {filter.label} ({filteredCreators.length})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sort Options */}
      <View style={{
        backgroundColor: DS.colors.background,
        paddingHorizontal: DS.spacing.md,
        paddingVertical: DS.spacing.sm,
      }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Text style={{ fontSize: 12, color: DS.colors.textLight, marginRight: DS.spacing.sm, alignSelf: 'center' }}>
            Sort by:
          </Text>
          {[
            { key: 'rating', label: 'Rating' },
            { key: 'performance', label: 'Performance' },
            { key: 'campaigns', label: 'Campaigns' },
            { key: 'recent', label: 'Recent' },
          ].map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              onPress={() => setSortBy(key as any)}
              style={{
                paddingHorizontal: DS.spacing.sm,
                paddingVertical: DS.spacing.xs,
                borderRadius: DS.borderRadius.xs,
                backgroundColor: sortBy === key ? DS.colors.primary : 'transparent',
                marginRight: DS.spacing.xs,
              }}
            >
              <Text style={{
                fontSize: 10,
                color: sortBy === key ? 'white' : DS.colors.textLight,
              }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Creators List */}
      <FlatList
        data={filteredCreators}
        keyExtractor={(item) => item.id}
        renderItem={renderCreator}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: DS.spacing.sm }}
        ListEmptyComponent={
          <View style={{ padding: DS.spacing.xl, alignItems: 'center' }}>
            <Users size={48} color={DS.colors.textLight} />
            <Text style={{
              fontSize: 16,
              fontWeight: '500',
              color: DS.colors.text,
              textAlign: 'center',
              marginTop: DS.spacing.sm,
            }}>No creators found</Text>
            <Text style={{
              fontSize: 14,
              color: DS.colors.textLight,
              textAlign: 'center',
              marginTop: DS.spacing.xs,
              marginBottom: DS.spacing.md,
            }}>
              {selectedStatus === 'all' 
                ? 'Start by creating campaigns to attract creators'
                : `No ${selectedStatus} creators at the moment`
              }
            </Text>
            
            <TouchableOpacity
              onPress={() => router.push('/business/creators/browse')}
              style={{
                backgroundColor: DS.colors.primary,
                paddingHorizontal: DS.spacing.md,
                paddingVertical: DS.spacing.sm,
                borderRadius: DS.borderRadius.sm,
              }}
            >
              <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                Browse Creators
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}