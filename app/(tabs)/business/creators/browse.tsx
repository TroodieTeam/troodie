import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft,
  Search,
  Filter,
  MapPin,
  Star,
  Users,
  Camera,
  Video,
  Heart,
  MessageCircle,
} from 'lucide-react-native';
import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Creator {
  id: string;
  username: string;
  name: string;
  avatar_url: string;
  bio: string;
  location: string;
  follower_count: number;
  engagement_rate: number;
  avg_likes: number;
  avg_comments: number;
  content_types: string[];
  rating: number;
  completed_campaigns: number;
  price_range: string;
  is_verified: boolean;
  recent_posts: Post[];
}

interface Post {
  id: string;
  image_url: string;
  type: 'photo' | 'video';
  likes: number;
  comments: number;
}

const CONTENT_TYPE_FILTERS = [
  'All',
  'Food Photography',
  'Video Reviews',
  'Reels & Stories',
  'Blog Content',
  'Live Streaming',
];

const LOCATION_FILTERS = [
  'All Locations',
  'New York',
  'Los Angeles',
  'Chicago',
  'Miami',
  'Austin',
];

const BUDGET_RANGES = [
  'Any Budget',
  '$50 - $200',
  '$200 - $500',
  '$500 - $1,000',
  '$1,000+',
];

export default function BrowseCreators() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [filteredCreators, setFilteredCreators] = useState<Creator[]>([]);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContentType, setSelectedContentType] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [selectedBudget, setSelectedBudget] = useState('Any Budget');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'followers' | 'engagement' | 'price'>('rating');

  useEffect(() => {
    loadCreators();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedContentType, selectedLocation, selectedBudget, sortBy, creators]);

  const loadCreators = async () => {
    try {
      // Mock data for creators since we don't have this in our schema yet
      const mockCreators: Creator[] = [
        {
          id: '1',
          username: '@foodie_sarah',
          name: 'Sarah Johnson',
          avatar_url: 'https://via.placeholder.com/80',
          bio: 'NYC food enthusiast sharing the best eats around the city. Love trying new cuisines!',
          location: 'New York, NY',
          follower_count: 12500,
          engagement_rate: 4.8,
          avg_likes: 350,
          avg_comments: 25,
          content_types: ['Food Photography', 'Reels & Stories'],
          rating: 4.9,
          completed_campaigns: 15,
          price_range: '$200 - $500',
          is_verified: true,
          recent_posts: [
            { id: '1a', image_url: 'https://via.placeholder.com/150', type: 'photo', likes: 420, comments: 32 },
            { id: '1b', image_url: 'https://via.placeholder.com/150', type: 'video', likes: 680, comments: 45 },
            { id: '1c', image_url: 'https://via.placeholder.com/150', type: 'photo', likes: 290, comments: 18 },
          ],
        },
        {
          id: '2',
          username: '@tastemaker_mike',
          name: 'Mike Chen',
          avatar_url: 'https://via.placeholder.com/80',
          bio: 'Food critic and content creator. Specializing in authentic Asian cuisine reviews.',
          location: 'Los Angeles, CA',
          follower_count: 8900,
          engagement_rate: 5.2,
          avg_likes: 280,
          avg_comments: 35,
          content_types: ['Video Reviews', 'Blog Content'],
          rating: 4.7,
          completed_campaigns: 22,
          price_range: '$500 - $1,000',
          is_verified: false,
          recent_posts: [
            { id: '2a', image_url: 'https://via.placeholder.com/150', type: 'video', likes: 520, comments: 28 },
            { id: '2b', image_url: 'https://via.placeholder.com/150', type: 'photo', likes: 340, comments: 19 },
            { id: '2c', image_url: 'https://via.placeholder.com/150', type: 'video', likes: 680, comments: 52 },
          ],
        },
        {
          id: '3',
          username: '@chicago_eats',
          name: 'Emma Rodriguez',
          avatar_url: 'https://via.placeholder.com/80',
          bio: 'Chicago local discovering hidden gems and sharing food adventures with my community.',
          location: 'Chicago, IL',
          follower_count: 15700,
          engagement_rate: 4.5,
          avg_likes: 425,
          avg_comments: 40,
          content_types: ['Food Photography', 'Live Streaming'],
          rating: 4.8,
          completed_campaigns: 8,
          price_range: '$200 - $500',
          is_verified: true,
          recent_posts: [
            { id: '3a', image_url: 'https://via.placeholder.com/150', type: 'photo', likes: 390, comments: 22 },
            { id: '3b', image_url: 'https://via.placeholder.com/150', type: 'photo', likes: 460, comments: 35 },
            { id: '3c', image_url: 'https://via.placeholder.com/150', type: 'video', likes: 720, comments: 58 },
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

    // Content type filter
    if (selectedContentType !== 'All') {
      filtered = filtered.filter(creator => 
        creator.content_types.includes(selectedContentType)
      );
    }

    // Location filter
    if (selectedLocation !== 'All Locations') {
      filtered = filtered.filter(creator => 
        creator.location.includes(selectedLocation)
      );
    }

    // Budget filter
    if (selectedBudget !== 'Any Budget') {
      filtered = filtered.filter(creator => 
        creator.price_range === selectedBudget
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'followers':
          return b.follower_count - a.follower_count;
        case 'engagement':
          return b.engagement_rate - a.engagement_rate;
        case 'price':
          // Simple price comparison based on range
          const priceOrder = ['$50 - $200', '$200 - $500', '$500 - $1,000', '$1,000+'];
          return priceOrder.indexOf(a.price_range) - priceOrder.indexOf(b.price_range);
        default:
          return 0;
      }
    });

    setFilteredCreators(filtered);
  };

  const handleContactCreator = (creatorId: string) => {
    Alert.alert(
      'Contact Creator',
      'Would you like to send a campaign invitation?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send Invitation', onPress: () => console.log('Send invitation to', creatorId) },
      ]
    );
  };

  const renderCreatorCard = ({ item: creator }: { item: Creator }) => (
    <View style={{
      backgroundColor: DS.colors.backgroundWhite,
      marginHorizontal: DS.spacing.md,
      marginBottom: DS.spacing.md,
      borderRadius: DS.borderRadius.md,
      overflow: 'hidden',
    }}>
      {/* Creator Header */}
      <View style={{ padding: DS.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Image
            source={{ uri: creator.avatar_url }}
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: DS.colors.border,
            }}
          />
          
          <View style={{ flex: 1, marginLeft: DS.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: DS.colors.text,
              }}>{creator.name}</Text>
              {creator.is_verified && (
                <View style={{
                  backgroundColor: '#10B981',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                  marginLeft: 6,
                }}>
                  <Text style={{ color: 'white', fontSize: 8, fontWeight: '600' }}>VERIFIED</Text>
                </View>
              )}
            </View>
            
            <Text style={{
              fontSize: 14,
              color: DS.colors.textLight,
              marginBottom: 2,
            }}>{creator.username}</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <MapPin size={12} color={DS.colors.textLight} />
              <Text style={{
                fontSize: 12,
                color: DS.colors.textLight,
                marginLeft: 4,
              }}>{creator.location}</Text>
            </View>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Star size={14} color="#FFB800" fill="#FFB800" />
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: DS.colors.text,
                marginLeft: 4,
              }}>{creator.rating}</Text>
            </View>
            <Text style={{
              fontSize: 12,
              color: DS.colors.textLight,
            }}>{creator.completed_campaigns} campaigns</Text>
          </View>
        </View>

        <Text style={{
          fontSize: 14,
          color: DS.colors.text,
          marginTop: DS.spacing.sm,
          lineHeight: 18,
        }}>{creator.bio}</Text>

        {/* Stats */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginTop: DS.spacing.md,
          paddingTop: DS.spacing.md,
          borderTopWidth: 1,
          borderTopColor: DS.colors.border,
        }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text }}>
              {creator.follower_count.toLocaleString()}
            </Text>
            <Text style={{ fontSize: 12, color: DS.colors.textLight }}>Followers</Text>
          </View>
          
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text }}>
              {creator.engagement_rate}%
            </Text>
            <Text style={{ fontSize: 12, color: DS.colors.textLight }}>Engagement</Text>
          </View>
          
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text }}>
              {creator.price_range}
            </Text>
            <Text style={{ fontSize: 12, color: DS.colors.textLight }}>Rate</Text>
          </View>
        </View>

        {/* Content Types */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: DS.spacing.sm, gap: 6 }}>
          {creator.content_types.map((type) => (
            <View key={type} style={{
              backgroundColor: DS.colors.primary + '20',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
            }}>
              <Text style={{ fontSize: 10, color: DS.colors.primary }}>{type}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Recent Posts Preview */}
      <View style={{ paddingHorizontal: DS.spacing.md, paddingBottom: DS.spacing.sm }}>
        <Text style={{
          fontSize: 14,
          fontWeight: '500',
          color: DS.colors.text,
          marginBottom: DS.spacing.xs,
        }}>Recent Posts</Text>
        
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {creator.recent_posts.slice(0, 3).map((post) => (
            <View key={post.id} style={{ position: 'relative' }}>
              <Image
                source={{ uri: post.image_url }}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 8,
                  backgroundColor: DS.colors.border,
                }}
              />
              {post.type === 'video' && (
                <View style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  borderRadius: 12,
                  padding: 2,
                }}>
                  <Video size={12} color="white" />
                </View>
              )}
              
              <View style={{
                position: 'absolute',
                bottom: 4,
                left: 4,
                flexDirection: 'row',
                gap: 4,
              }}>
                <View style={{
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  borderRadius: 8,
                  paddingHorizontal: 4,
                  paddingVertical: 2,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                  <Heart size={8} color="white" />
                  <Text style={{ fontSize: 8, color: 'white', marginLeft: 2 }}>
                    {post.likes}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Contact Button */}
      <TouchableOpacity
        onPress={() => handleContactCreator(creator.id)}
        style={{
          backgroundColor: DS.colors.primary,
          margin: DS.spacing.md,
          marginTop: 0,
          padding: DS.spacing.sm,
          borderRadius: DS.borderRadius.sm,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
          Contact Creator
        </Text>
      </TouchableOpacity>
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
        }}>Browse Creators</Text>
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
          <Filter size={24} color={DS.colors.text} />
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

      {/* Filters */}
      {showFilters && (
        <View style={{
          backgroundColor: DS.colors.backgroundWhite,
          padding: DS.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: DS.colors.border,
        }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {/* Content Type Filter */}
            <View style={{ marginRight: DS.spacing.md }}>
              <Text style={{ fontSize: 12, color: DS.colors.textLight, marginBottom: 4 }}>
                Content Type
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {CONTENT_TYPE_FILTERS.map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setSelectedContentType(type)}
                    style={{
                      paddingHorizontal: DS.spacing.sm,
                      paddingVertical: DS.spacing.xs,
                      borderRadius: DS.borderRadius.xs,
                      backgroundColor: selectedContentType === type ? DS.colors.primary : DS.colors.background,
                    }}
                  >
                    <Text style={{
                      fontSize: 12,
                      color: selectedContentType === type ? 'white' : DS.colors.text,
                    }}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Sort By */}
            <View>
              <Text style={{ fontSize: 12, color: DS.colors.textLight, marginBottom: 4 }}>
                Sort By
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { key: 'rating', label: 'Rating' },
                  { key: 'followers', label: 'Followers' },
                  { key: 'engagement', label: 'Engagement' },
                  { key: 'price', label: 'Price' },
                ].map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setSortBy(key as any)}
                    style={{
                      paddingHorizontal: DS.spacing.sm,
                      paddingVertical: DS.spacing.xs,
                      borderRadius: DS.borderRadius.xs,
                      backgroundColor: sortBy === key ? DS.colors.primary : DS.colors.background,
                    }}
                  >
                    <Text style={{
                      fontSize: 12,
                      color: sortBy === key ? 'white' : DS.colors.text,
                    }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Results Count */}
      <View style={{ padding: DS.spacing.sm, backgroundColor: DS.colors.background }}>
        <Text style={{ fontSize: 12, color: DS.colors.textLight, textAlign: 'center' }}>
          {filteredCreators.length} creator{filteredCreators.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* Creators List */}
      <FlatList
        data={filteredCreators}
        keyExtractor={(item) => item.id}
        renderItem={renderCreatorCard}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: DS.spacing.lg }}
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
            }}>Try adjusting your search filters</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}