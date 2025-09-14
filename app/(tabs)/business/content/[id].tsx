import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Share,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft,
  Heart,
  MessageCircle,
  Share as ShareIcon,
  Download,
  ExternalLink,
  Calendar,
  Star,
  TrendingUp,
  Users,
  Eye,
  Play,
  Camera,
  Instagram,
  Youtube,
  CheckCircle,
  Archive,
} from 'lucide-react-native';
import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const { width: screenWidth } = Dimensions.get('window');

interface ContentDetail {
  id: string;
  campaign: {
    id: string;
    title: string;
    description: string;
  };
  creator: {
    id: string;
    name: string;
    username: string;
    avatar_url: string;
    follower_count: number;
    social_links: {
      instagram?: string;
      youtube?: string;
      tiktok?: string;
    };
  };
  type: 'image' | 'video';
  url: string;
  thumbnail_url?: string;
  caption: string;
  hashtags: string[];
  mentions: string[];
  created_at: string;
  posted_at?: string;
  scheduled_at?: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  platform_post_id?: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    reach: number;
    impressions: number;
  };
  performance_metrics: {
    engagement_rate: number;
    ctr: number;
    saves_rate: number;
    comments_rate: number;
  };
  performance_score: number;
  status: 'draft' | 'posted' | 'archived';
  is_approved: boolean;
  approval_notes?: string;
  location?: string;
  tags: string[];
}

export default function ContentDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<ContentDetail | null>(null);

  useEffect(() => {
    loadContentDetail();
  }, [id]);

  const loadContentDetail = async () => {
    try {
      // Mock data for detailed content view
      const mockContent: ContentDetail = {
        id: id as string,
        campaign: {
          id: 'camp-1',
          title: 'Summer Menu Launch Campaign',
          description: 'Showcase our new summer menu featuring fresh, seasonal ingredients',
        },
        creator: {
          id: 'creator-1',
          name: 'Sarah Johnson',
          username: '@foodie_sarah',
          avatar_url: 'https://via.placeholder.com/60',
          follower_count: 12500,
          social_links: {
            instagram: 'https://instagram.com/foodie_sarah',
            youtube: 'https://youtube.com/foodiesarah',
          },
        },
        type: 'image',
        url: 'https://via.placeholder.com/400x400',
        caption: 'Absolutely obsessed with this summer pasta! The burst cherry tomatoes and fresh basil make every bite incredible. The combination of flavors is just perfect for the season 🍅✨\n\nThe ambiance here is amazing too - perfect for a summer evening dinner. Can\'t wait to come back and try more from their seasonal menu!',
        hashtags: ['#SummerMenu', '#TroodiePartner', '#FreshPasta', '#LocalEats', '#SeasonalDining', '#FoodieLife'],
        mentions: ['@restaurantname', '@troodie'],
        created_at: '2024-01-15T12:00:00Z',
        posted_at: '2024-01-16T18:00:00Z',
        platform: 'instagram',
        platform_post_id: 'C1234567890',
        engagement: {
          likes: 1247,
          comments: 89,
          shares: 34,
          saves: 156,
          reach: 8945,
          impressions: 12340,
        },
        performance_metrics: {
          engagement_rate: 12.8,
          ctr: 3.2,
          saves_rate: 1.8,
          comments_rate: 1.1,
        },
        performance_score: 9.2,
        status: 'posted',
        is_approved: true,
        location: 'New York, NY',
        tags: ['summer', 'pasta', 'italian', 'fresh', 'seasonal'],
      };

      setContent(mockContent);
    } catch (error) {
      console.error('Failed to load content detail:', error);
      Alert.alert('Error', 'Failed to load content details');
    } finally {
      setLoading(false);
    }
  };

  const handleContentAction = async (action: 'approve' | 'archive' | 'download' | 'share') => {
    if (!content) return;

    switch (action) {
      case 'approve':
        Alert.alert(
          'Approve Content',
          'This will mark the content as approved.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Approve', 
              onPress: () => {
                setContent({ ...content, is_approved: true });
                Alert.alert('Success', 'Content approved successfully');
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
                setContent({ ...content, status: 'archived' });
                Alert.alert('Success', 'Content archived successfully');
              }
            },
          ]
        );
        break;
      case 'download':
        Alert.alert('Download', 'Content download initiated. High-resolution version will be saved to your device.');
        break;
      case 'share':
        try {
          await Share.share({
            message: `Check out this great content from ${content.creator.name}: ${content.caption}`,
            url: content.url,
          });
        } catch (error) {
          console.error('Error sharing:', error);
        }
        break;
    }
  };

  const openPlatformPost = () => {
    if (!content?.platform_post_id) return;
    
    let url = '';
    switch (content.platform) {
      case 'instagram':
        url = `https://instagram.com/p/${content.platform_post_id}`;
        break;
      case 'youtube':
        url = `https://youtube.com/watch?v=${content.platform_post_id}`;
        break;
      case 'tiktok':
        url = `https://tiktok.com/@${content.creator.username.replace('@', '')}/video/${content.platform_post_id}`;
        break;
    }
    
    if (url) {
      Linking.openURL(url);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return <Instagram size={16} color="#E4405F" />;
      case 'youtube': return <Youtube size={16} color="#FF0000" />;
      case 'tiktok': return <Text style={{ fontSize: 12 }}>🎵</Text>;
      default: return <Text style={{ fontSize: 12 }}>📱</Text>;
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

  const getPerformanceColor = (score: number) => {
    if (score >= 8.5) return '#10B981'; // Excellent
    if (score >= 7.0) return '#F59E0B'; // Good
    return '#EF4444'; // Needs improvement
  };

  if (loading || !content) {
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
        }}>Content Details</Text>
        <TouchableOpacity onPress={() => handleContentAction('share')}>
          <ShareIcon size={24} color={DS.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Main Content */}
        <View style={{
          backgroundColor: DS.colors.backgroundWhite,
          margin: DS.spacing.md,
          borderRadius: DS.borderRadius.md,
          overflow: 'hidden',
        }}>
          {/* Media */}
          <View style={{ position: 'relative' }}>
            <Image
              source={{ uri: content.url }}
              style={{
                width: '100%',
                height: screenWidth - (DS.spacing.md * 2),
                backgroundColor: DS.colors.border,
              }}
            />
            
            {/* Media Type Indicator */}
            <View style={{
              position: 'absolute',
              top: DS.spacing.sm,
              right: DS.spacing.sm,
              backgroundColor: 'rgba(0,0,0,0.6)',
              borderRadius: 16,
              padding: DS.spacing.xs,
            }}>
              {content.type === 'video' ? (
                <Play size={16} color="white" />
              ) : (
                <Camera size={16} color="white" />
              )}
            </View>

            {/* Platform & Status */}
            <View style={{
              position: 'absolute',
              top: DS.spacing.sm,
              left: DS.spacing.sm,
              flexDirection: 'row',
              gap: DS.spacing.xs,
            }}>
              {/* Platform */}
              <View style={{
                backgroundColor: 'rgba(0,0,0,0.6)',
                borderRadius: 16,
                paddingHorizontal: DS.spacing.xs,
                paddingVertical: 4,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                {getPlatformIcon(content.platform)}
                <Text style={{ 
                  fontSize: 10, 
                  color: 'white', 
                  marginLeft: 4,
                  textTransform: 'capitalize',
                }}>
                  {content.platform}
                </Text>
              </View>

              {/* Status */}
              <View style={{
                backgroundColor: getStatusColor(content.status) + '20',
                borderRadius: 12,
                paddingHorizontal: DS.spacing.xs,
                paddingVertical: 4,
              }}>
                <Text style={{
                  fontSize: 10,
                  color: getStatusColor(content.status),
                  textTransform: 'capitalize',
                }}>
                  {content.status}
                </Text>
              </View>
            </View>

            {/* Performance Score */}
            <View style={{
              position: 'absolute',
              bottom: DS.spacing.sm,
              right: DS.spacing.sm,
              backgroundColor: 'rgba(0,0,0,0.8)',
              borderRadius: 20,
              paddingHorizontal: DS.spacing.sm,
              paddingVertical: DS.spacing.xs,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Star size={14} color="#FFB800" fill="#FFB800" />
              <Text style={{ 
                fontSize: 12, 
                color: 'white', 
                marginLeft: 4, 
                fontWeight: '600' 
              }}>
                {content.performance_score}
              </Text>
            </View>
          </View>

          {/* Content Info */}
          <View style={{ padding: DS.spacing.md }}>
            {/* Creator Info */}
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginBottom: DS.spacing.sm 
            }}>
              <Image
                source={{ uri: content.creator.avatar_url }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: DS.colors.border,
                }}
              />
              
              <View style={{ flex: 1, marginLeft: DS.spacing.sm }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: DS.colors.text }}>
                  {content.creator.name}
                </Text>
                <Text style={{ fontSize: 12, color: DS.colors.textLight }}>
                  {content.creator.username} • {content.creator.follower_count.toLocaleString()} followers
                </Text>
              </View>

              <TouchableOpacity
                onPress={openPlatformPost}
                style={{
                  backgroundColor: DS.colors.background,
                  padding: DS.spacing.xs,
                  borderRadius: DS.borderRadius.sm,
                }}
              >
                <ExternalLink size={16} color={DS.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Campaign Info */}
            <View style={{
              backgroundColor: DS.colors.background,
              padding: DS.spacing.sm,
              borderRadius: DS.borderRadius.sm,
              marginBottom: DS.spacing.sm,
            }}>
              <Text style={{ fontSize: 12, color: DS.colors.textLight }}>Campaign</Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: DS.colors.primary }}>
                {content.campaign.title}
              </Text>
            </View>

            {/* Caption */}
            <Text style={{
              fontSize: 14,
              color: DS.colors.text,
              lineHeight: 20,
              marginBottom: DS.spacing.sm,
            }}>{content.caption}</Text>

            {/* Hashtags */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: DS.spacing.sm }}>
              {content.hashtags.map((hashtag) => (
                <Text key={hashtag} style={{
                  fontSize: 12,
                  color: DS.colors.primary,
                }}>
                  {hashtag}
                </Text>
              ))}
            </View>

            {/* Location & Date */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between',
              marginBottom: DS.spacing.md 
            }}>
              {content.location && (
                <Text style={{ fontSize: 12, color: DS.colors.textLight }}>
                  📍 {content.location}
                </Text>
              )}
              <Text style={{ fontSize: 12, color: DS.colors.textLight }}>
                {content.posted_at 
                  ? `Posted ${new Date(content.posted_at).toLocaleDateString()}`
                  : `Created ${new Date(content.created_at).toLocaleDateString()}`
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Engagement Stats */}
        <View style={{
          backgroundColor: DS.colors.backgroundWhite,
          marginHorizontal: DS.spacing.md,
          marginBottom: DS.spacing.md,
          padding: DS.spacing.md,
          borderRadius: DS.borderRadius.md,
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: DS.colors.text,
            marginBottom: DS.spacing.md,
          }}>Engagement Analytics</Text>

          {/* Main Metrics */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            marginBottom: DS.spacing.md,
          }}>
            <View style={{ alignItems: 'center' }}>
              <Heart size={18} color="#EF4444" />
              <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginTop: 4 }}>
                {content.engagement.likes.toLocaleString()}
              </Text>
              <Text style={{ fontSize: 10, color: DS.colors.textLight }}>Likes</Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <MessageCircle size={18} color="#3B82F6" />
              <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginTop: 4 }}>
                {content.engagement.comments}
              </Text>
              <Text style={{ fontSize: 10, color: DS.colors.textLight }}>Comments</Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <ShareIcon size={18} color="#10B981" />
              <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginTop: 4 }}>
                {content.engagement.shares}
              </Text>
              <Text style={{ fontSize: 10, color: DS.colors.textLight }}>Shares</Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <Archive size={18} color="#F59E0B" />
              <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginTop: 4 }}>
                {content.engagement.saves}
              </Text>
              <Text style={{ fontSize: 10, color: DS.colors.textLight }}>Saves</Text>
            </View>
          </View>

          {/* Advanced Metrics */}
          <View style={{
            backgroundColor: DS.colors.background,
            padding: DS.spacing.sm,
            borderRadius: DS.borderRadius.sm,
          }}>
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              marginBottom: DS.spacing.xs 
            }}>
              <Text style={{ fontSize: 12, color: DS.colors.textLight }}>Reach</Text>
              <Text style={{ fontSize: 12, fontWeight: '500', color: DS.colors.text }}>
                {content.engagement.reach.toLocaleString()}
              </Text>
            </View>
            
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              marginBottom: DS.spacing.xs 
            }}>
              <Text style={{ fontSize: 12, color: DS.colors.textLight }}>Impressions</Text>
              <Text style={{ fontSize: 12, fontWeight: '500', color: DS.colors.text }}>
                {content.engagement.impressions.toLocaleString()}
              </Text>
            </View>
            
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              marginBottom: DS.spacing.xs 
            }}>
              <Text style={{ fontSize: 12, color: DS.colors.textLight }}>Engagement Rate</Text>
              <Text style={{ fontSize: 12, fontWeight: '500', color: DS.colors.text }}>
                {content.performance_metrics.engagement_rate}%
              </Text>
            </View>
            
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between' 
            }}>
              <Text style={{ fontSize: 12, color: DS.colors.textLight }}>Saves Rate</Text>
              <Text style={{ fontSize: 12, fontWeight: '500', color: DS.colors.text }}>
                {content.performance_metrics.saves_rate}%
              </Text>
            </View>
          </View>
        </View>

        {/* Performance Score */}
        <View style={{
          backgroundColor: DS.colors.backgroundWhite,
          marginHorizontal: DS.spacing.md,
          marginBottom: DS.spacing.md,
          padding: DS.spacing.md,
          borderRadius: DS.borderRadius.md,
        }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: DS.spacing.sm,
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: DS.colors.text,
            }}>Performance Score</Text>
            
            <View style={{
              backgroundColor: getPerformanceColor(content.performance_score) + '20',
              paddingHorizontal: DS.spacing.sm,
              paddingVertical: DS.spacing.xs,
              borderRadius: DS.borderRadius.sm,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <TrendingUp size={14} color={getPerformanceColor(content.performance_score)} />
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: getPerformanceColor(content.performance_score),
                marginLeft: 4,
              }}>
                {content.performance_score}/10
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 12, color: DS.colors.textLight, lineHeight: 16 }}>
            {content.performance_score >= 8.5 
              ? 'Excellent performance! This content is resonating well with the audience.'
              : content.performance_score >= 7.0
              ? 'Good performance with room for improvement in engagement.'
              : 'Consider optimizing posting time or content style for better performance.'
            }
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={{
          backgroundColor: DS.colors.backgroundWhite,
          marginHorizontal: DS.spacing.md,
          marginBottom: DS.spacing.lg,
          padding: DS.spacing.md,
          borderRadius: DS.borderRadius.md,
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: DS.colors.text,
            marginBottom: DS.spacing.md,
          }}>Actions</Text>

          <View style={{ flexDirection: 'row', gap: DS.spacing.sm, marginBottom: DS.spacing.sm }}>
            <TouchableOpacity
              onPress={() => handleContentAction('download')}
              style={{
                flex: 1,
                backgroundColor: DS.colors.background,
                padding: DS.spacing.sm,
                borderRadius: DS.borderRadius.sm,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Download size={16} color={DS.colors.text} />
              <Text style={{ 
                color: DS.colors.text, 
                fontSize: 12, 
                fontWeight: '500', 
                marginLeft: 4 
              }}>
                Download
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleContentAction('share')}
              style={{
                flex: 1,
                backgroundColor: DS.colors.background,
                padding: DS.spacing.sm,
                borderRadius: DS.borderRadius.sm,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShareIcon size={16} color={DS.colors.text} />
              <Text style={{ 
                color: DS.colors.text, 
                fontSize: 12, 
                fontWeight: '500', 
                marginLeft: 4 
              }}>
                Share
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: DS.spacing.sm }}>
            {!content.is_approved && (
              <TouchableOpacity
                onPress={() => handleContentAction('approve')}
                style={{
                  flex: 1,
                  backgroundColor: '#10B981',
                  padding: DS.spacing.sm,
                  borderRadius: DS.borderRadius.sm,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle size={16} color="white" />
                <Text style={{ 
                  color: 'white', 
                  fontSize: 12, 
                  fontWeight: '600', 
                  marginLeft: 4 
                }}>
                  Approve
                </Text>
              </TouchableOpacity>
            )}

            {content.status !== 'archived' && (
              <TouchableOpacity
                onPress={() => handleContentAction('archive')}
                style={{
                  flex: content.is_approved ? 1 : 1,
                  backgroundColor: '#FEE2E2',
                  padding: DS.spacing.sm,
                  borderRadius: DS.borderRadius.sm,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Archive size={16} color="#DC2626" />
                <Text style={{ 
                  color: '#DC2626', 
                  fontSize: 12, 
                  fontWeight: '600', 
                  marginLeft: 4 
                }}>
                  Archive
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}