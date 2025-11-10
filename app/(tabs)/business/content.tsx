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
  Filter,
  Grid,
  List,
  Calendar,
  Heart,
  MessageCircle,
  Share,
  Download,
  Play,
  Camera,
  Video,
  Star,
} from 'lucide-react-native';
import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface ContentItem {
  id: string;
  campaign_id: string;
  campaign_title: string;
  creator: {
    id: string;
    name: string;
    username: string;
    avatar_url: string;
  };
  type: 'image' | 'video';
  url: string;
  thumbnail_url?: string;
  caption: string;
  tags: string[];
  created_at: string;
  posted_at?: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  performance_score: number;
  status: 'draft' | 'posted' | 'archived';
  is_approved: boolean;
}

const FILTER_OPTIONS = [
  { key: 'all', label: 'All Content' },
  { key: 'images', label: 'Photos' },
  { key: 'videos', label: 'Videos' },
  { key: 'high_performing', label: 'Top Performing' },
];

const PLATFORM_FILTERS = [
  { key: 'all', label: 'All Platforms' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'youtube', label: 'YouTube' },
];

const STATUS_FILTERS = [
  { key: 'all', label: 'All Status' },
  { key: 'draft', label: 'Drafts' },
  { key: 'posted', label: 'Posted' },
  { key: 'archived', label: 'Archived' },
];

export default function ContentGallery() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([]);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadContent();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedFilter, selectedPlatform, selectedStatus, content]);

  const loadContent = async () => {
    try {
      // Mock data for content gallery
      const mockContent: ContentItem[] = [
        {
          id: '1',
          campaign_id: 'camp-1',
          campaign_title: 'Summer Menu Launch',
          creator: {
            id: 'creator-1',
            name: 'Sarah Johnson',
            username: '@foodie_sarah',
            avatar_url: 'https://via.placeholder.com/40',
          },
          type: 'image',
          url: 'https://via.placeholder.com/400x400',
          caption: 'Absolutely obsessed with this summer pasta! The burst cherry tomatoes and fresh basil make every bite incredible 🍅✨ #SummerMenu #TroodiePartner',
          tags: ['summer', 'pasta', 'fresh', 'italian'],
          created_at: '2024-01-15T12:00:00Z',
          posted_at: '2024-01-16T18:00:00Z',
          platform: 'instagram',
          engagement: {
            likes: 1247,
            comments: 89,
            shares: 34,
            saves: 156,
          },
          performance_score: 9.2,
          status: 'posted',
          is_approved: true,
        },
        {
          id: '2',
          campaign_id: 'camp-1',
          campaign_title: 'Summer Menu Launch',
          creator: {
            id: 'creator-1',
            name: 'Sarah Johnson',
            username: '@foodie_sarah',
            avatar_url: 'https://via.placeholder.com/40',
          },
          type: 'video',
          url: 'https://via.placeholder.com/400x400',
          thumbnail_url: 'https://via.placeholder.com/400x400',
          caption: 'Take a bite with me! This summer salad is everything 🥗 Watch till the end for my honest review!',
          tags: ['review', 'salad', 'healthy', 'summer'],
          created_at: '2024-01-14T15:30:00Z',
          posted_at: '2024-01-15T20:00:00Z',
          platform: 'tiktok',
          engagement: {
            likes: 2834,
            comments: 198,
            shares: 89,
            saves: 267,
          },
          performance_score: 8.7,
          status: 'posted',
          is_approved: true,
        },
        {
          id: '3',
          campaign_id: 'camp-2',
          campaign_title: 'Weekend Brunch Special',
          creator: {
            id: 'creator-3',
            name: 'Emma Rodriguez',
            username: '@chicago_eats',
            avatar_url: 'https://via.placeholder.com/40',
          },
          type: 'image',
          url: 'https://via.placeholder.com/400x400',
          caption: 'Sunday brunch done right! This avocado toast with poached egg is pure perfection 🥑🍳',
          tags: ['brunch', 'avocado', 'eggs', 'weekend'],
          created_at: '2024-01-13T10:15:00Z',
          posted_at: '2024-01-14T11:00:00Z',
          platform: 'instagram',
          engagement: {
            likes: 892,
            comments: 45,
            shares: 23,
            saves: 78,
          },
          performance_score: 7.8,
          status: 'posted',
          is_approved: true,
        },
        {
          id: '4',
          campaign_id: 'camp-1',
          campaign_title: 'Summer Menu Launch',
          creator: {
            id: 'creator-2',
            name: 'Mike Chen',
            username: '@tastemaker_mike',
            avatar_url: 'https://via.placeholder.com/40',
          },
          type: 'video',
          url: 'https://via.placeholder.com/400x400',
          thumbnail_url: 'https://via.placeholder.com/400x400',
          caption: 'Full summer menu review! Every dish was incredible - here are my top picks 🌟',
          tags: ['review', 'menu', 'summer', 'recommendations'],
          created_at: '2024-01-12T14:20:00Z',
          platform: 'youtube',
          engagement: {
            likes: 456,
            comments: 67,
            shares: 12,
            saves: 89,
          },
          performance_score: 8.1,
          status: 'draft',
          is_approved: false,
        },
      ];

      setContent(mockContent);
    } catch (error) {
      console.error('Failed to load content:', error);
      Alert.alert('Error', 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...content];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(item => 
        item.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.campaign_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.creator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Content type filter
    if (selectedFilter === 'images') {
      filtered = filtered.filter(item => item.type === 'image');
    } else if (selectedFilter === 'videos') {
      filtered = filtered.filter(item => item.type === 'video');
    } else if (selectedFilter === 'high_performing') {
      filtered = filtered.filter(item => item.performance_score >= 8.0);
    }

    // Platform filter
    if (selectedPlatform !== 'all') {
      filtered = filtered.filter(item => item.platform === selectedPlatform);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item => item.status === selectedStatus);
    }

    // Sort by performance score and date
    filtered.sort((a, b) => {
      if (a.performance_score !== b.performance_score) {
        return b.performance_score - a.performance_score;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setFilteredContent(filtered);
  };

  const handleContentAction = (contentId: string, action: 'approve' | 'archive' | 'download') => {
    const contentItem = content.find(item => item.id === contentId);
    if (!contentItem) return;

    switch (action) {
      case 'approve':
        Alert.alert(
          'Approve Content',
          'This will mark the content as approved for posting.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Approve', 
              onPress: () => {
                const updatedContent = content.map(item =>
                  item.id === contentId ? { ...item, is_approved: true } : item
                );
                setContent(updatedContent);
              }
            },
          ]
        );
        break;
      case 'archive':
        Alert.alert(
          'Archive Content',
          'This will move the content to archived status.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Archive', 
              style: 'destructive',
              onPress: () => {
                const updatedContent = content.map(item =>
                  item.id === contentId ? { ...item, status: 'archived' as const } : item
                );
                setContent(updatedContent);
              }
            },
          ]
        );
        break;
      case 'download':
        Alert.alert('Download', 'Content download initiated');
        break;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return '📸';
      case 'tiktok': return '🎵';
      case 'youtube': return '📹';
      default: return '📱';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posted': return '#10B981';
      case 'draft': return '#F59E0B';
      case 'archived': return '#6B7280';
      default: return DS.colors.textLight;
    }
  };

  const renderGridItem = ({ item }: { item: ContentItem }) => (
    <TouchableOpacity
      onPress={() => router.push(`/business/content/${item.id}`)}
      style={{
        width: '48%',
        marginBottom: DS.spacing.md,
        backgroundColor: DS.colors.backgroundWhite,
        borderRadius: DS.borderRadius.md,
        overflow: 'hidden',
      }}
    >
      <View style={{ position: 'relative' }}>
        <Image
          source={{ uri: item.thumbnail_url || item.url }}
          style={{
            width: '100%',
            height: 180,
            backgroundColor: DS.colors.border,
          }}
        />
        
        {/* Type indicator */}
        <View style={{
          position: 'absolute',
          top: 8,
          right: 8,
          backgroundColor: 'rgba(0,0,0,0.6)',
          borderRadius: 12,
          padding: 4,
        }}>
          {item.type === 'video' ? (
            <Play size={12} color="white" />
          ) : (
            <Camera size={12} color="white" />
          )}
        </View>

        {/* Platform indicator */}
        <View style={{
          position: 'absolute',
          top: 8,
          left: 8,
          backgroundColor: 'rgba(0,0,0,0.6)',
          borderRadius: 12,
          paddingHorizontal: 6,
          paddingVertical: 2,
        }}>
          <Text style={{ fontSize: 10 }}>{getPlatformIcon(item.platform)}</Text>
        </View>

        {/* Performance score */}
        <View style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          backgroundColor: 'rgba(0,0,0,0.6)',
          borderRadius: 8,
          paddingHorizontal: 4,
          paddingVertical: 2,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <Star size={8} color="#FFB800" fill="#FFB800" />
          <Text style={{ fontSize: 8, color: 'white', marginLeft: 2 }}>
            {item.performance_score}
          </Text>
        </View>
      </View>

      <View style={{ padding: DS.spacing.sm }}>
        <Text style={{
          fontSize: 12,
          fontWeight: '500',
          color: DS.colors.text,
          marginBottom: 2,
        }} numberOfLines={1}>
          {item.campaign_title}
        </Text>
        
        <Text style={{
          fontSize: 10,
          color: DS.colors.textLight,
          marginBottom: 4,
        }} numberOfLines={2}>
          {item.caption}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{
            fontSize: 10,
            color: DS.colors.textLight,
          }}>
            {item.creator.username}
          </Text>
          
          <View style={{
            backgroundColor: getStatusColor(item.status) + '20',
            paddingHorizontal: 4,
            paddingVertical: 2,
            borderRadius: 4,
          }}>
            <Text style={{
              fontSize: 8,
              color: getStatusColor(item.status),
              textTransform: 'capitalize',
            }}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: DS.spacing.xs,
        }}>
          <Text style={{ fontSize: 8, color: DS.colors.textLight }}>
            ❤️ {item.engagement.likes}
          </Text>
          <Text style={{ fontSize: 8, color: DS.colors.textLight }}>
            💬 {item.engagement.comments}
          </Text>
          <Text style={{ fontSize: 8, color: DS.colors.textLight }}>
            📤 {item.engagement.shares}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderListItem = ({ item }: { item: ContentItem }) => (
    <TouchableOpacity
      onPress={() => router.push(`/business/content/${item.id}`)}
      style={{
        backgroundColor: DS.colors.backgroundWhite,
        marginHorizontal: DS.spacing.md,
        marginBottom: DS.spacing.sm,
        borderRadius: DS.borderRadius.md,
        overflow: 'hidden',
        flexDirection: 'row',
      }}
    >
      <View style={{ position: 'relative' }}>
        <Image
          source={{ uri: item.thumbnail_url || item.url }}
          style={{
            width: 100,
            height: 80,
            backgroundColor: DS.colors.border,
          }}
        />
        
        {item.type === 'video' && (
          <View style={{
            position: 'absolute',
            top: 4,
            right: 4,
            backgroundColor: 'rgba(0,0,0,0.6)',
            borderRadius: 8,
            padding: 2,
          }}>
            <Play size={10} color="white" />
          </View>
        )}
      </View>

      <View style={{ flex: 1, padding: DS.spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <Text style={{
            fontSize: 12,
            fontWeight: '500',
            color: DS.colors.primary,
            flex: 1,
          }} numberOfLines={1}>
            {item.campaign_title}
          </Text>
          
          <Text style={{ fontSize: 8 }}>{getPlatformIcon(item.platform)}</Text>
        </View>

        <Text style={{
          fontSize: 11,
          color: DS.colors.text,
          marginBottom: 4,
        }} numberOfLines={2}>
          {item.caption}
        </Text>

        <Text style={{
          fontSize: 10,
          color: DS.colors.textLight,
          marginBottom: 4,
        }}>
          by {item.creator.username}
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Text style={{ fontSize: 8, color: DS.colors.textLight }}>
              ❤️ {item.engagement.likes}
            </Text>
            <Text style={{ fontSize: 8, color: DS.colors.textLight }}>
              💬 {item.engagement.comments}
            </Text>
            <Text style={{ fontSize: 8, color: DS.colors.textLight }}>
              ⭐ {item.performance_score}
            </Text>
          </View>
          
          <View style={{
            backgroundColor: getStatusColor(item.status) + '20',
            paddingHorizontal: 4,
            paddingVertical: 1,
            borderRadius: 4,
          }}>
            <Text style={{
              fontSize: 8,
              color: getStatusColor(item.status),
              textTransform: 'capitalize',
            }}>
              {item.status}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
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
        }}>Content Gallery</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
            <Filter size={24} color={DS.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            {viewMode === 'grid' ? (
              <List size={24} color={DS.colors.text} />
            ) : (
              <Grid size={24} color={DS.colors.text} />
            )}
          </TouchableOpacity>
        </View>
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
            placeholder="Search content..."
            style={{
              flex: 1,
              padding: DS.spacing.sm,
              fontSize: 14,
              color: DS.colors.text,
            }}
          />
        </View>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={{
          backgroundColor: DS.colors.backgroundWhite,
          padding: DS.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: DS.colors.border,
        }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: DS.spacing.md }}>
              {/* Content Type */}
              <View>
                <Text style={{ fontSize: 10, color: DS.colors.textLight, marginBottom: 4 }}>
                  Type
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {FILTER_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      onPress={() => setSelectedFilter(option.key)}
                      style={{
                        paddingHorizontal: DS.spacing.sm,
                        paddingVertical: DS.spacing.xs,
                        borderRadius: DS.borderRadius.xs,
                        backgroundColor: selectedFilter === option.key ? DS.colors.primary : DS.colors.background,
                      }}
                    >
                      <Text style={{
                        fontSize: 10,
                        color: selectedFilter === option.key ? 'white' : DS.colors.text,
                      }}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Platform */}
              <View>
                <Text style={{ fontSize: 10, color: DS.colors.textLight, marginBottom: 4 }}>
                  Platform
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {PLATFORM_FILTERS.map((platform) => (
                    <TouchableOpacity
                      key={platform.key}
                      onPress={() => setSelectedPlatform(platform.key)}
                      style={{
                        paddingHorizontal: DS.spacing.sm,
                        paddingVertical: DS.spacing.xs,
                        borderRadius: DS.borderRadius.xs,
                        backgroundColor: selectedPlatform === platform.key ? DS.colors.primary : DS.colors.background,
                      }}
                    >
                      <Text style={{
                        fontSize: 10,
                        color: selectedPlatform === platform.key ? 'white' : DS.colors.text,
                      }}>{platform.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Status */}
              <View>
                <Text style={{ fontSize: 10, color: DS.colors.textLight, marginBottom: 4 }}>
                  Status
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {STATUS_FILTERS.map((status) => (
                    <TouchableOpacity
                      key={status.key}
                      onPress={() => setSelectedStatus(status.key)}
                      style={{
                        paddingHorizontal: DS.spacing.sm,
                        paddingVertical: DS.spacing.xs,
                        borderRadius: DS.borderRadius.xs,
                        backgroundColor: selectedStatus === status.key ? DS.colors.primary : DS.colors.background,
                      }}
                    >
                      <Text style={{
                        fontSize: 10,
                        color: selectedStatus === status.key ? 'white' : DS.colors.text,
                      }}>{status.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Results Count */}
      <View style={{ padding: DS.spacing.sm, backgroundColor: DS.colors.background }}>
        <Text style={{ fontSize: 12, color: DS.colors.textLight, textAlign: 'center' }}>
          {filteredContent.length} content item{filteredContent.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* Content List */}
      <FlatList
        data={filteredContent}
        keyExtractor={(item) => item.id}
        renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode} // Force re-render when view mode changes
        columnWrapperStyle={viewMode === 'grid' ? { justifyContent: 'space-between', paddingHorizontal: DS.spacing.md } : undefined}
        contentContainerStyle={{ 
          padding: viewMode === 'grid' ? DS.spacing.sm : 0,
          paddingBottom: DS.spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ padding: DS.spacing.xl, alignItems: 'center' }}>
            <Camera size={48} color={DS.colors.textLight} />
            <Text style={{
              fontSize: 16,
              fontWeight: '500',
              color: DS.colors.text,
              textAlign: 'center',
              marginTop: DS.spacing.sm,
            }}>No content found</Text>
            <Text style={{
              fontSize: 14,
              color: DS.colors.textLight,
              textAlign: 'center',
              marginTop: DS.spacing.xs,
            }}>Try adjusting your search filters or create a campaign to start collecting content</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}