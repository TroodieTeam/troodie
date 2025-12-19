/**
 * Browse Creators Screen
 * 
 * Restaurant owners can browse and filter creators to invite to campaigns.
 * Matches design spec 1:1.
 */

import InviteCreatorModal from '@/components/business/InviteCreatorModal';
import { EmptyState } from '@/components/common/EmptyState';
import { DS } from '@/components/design-system/tokens';
import { VideoThumbnail } from '@/components/VideoThumbnail';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatFollowers, getCreators } from '@/services/creatorDiscoveryService';
import { useRouter } from 'expo-router';
import { ArrowLeft, Clock, Filter, MapPin, Play, Search, Star, Users } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Creator {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  totalFollowers: number;
  engagementRate: number;
  openToCollabs: boolean;
  availabilityStatus?: 'available' | 'busy' | 'not_accepting'; // CM-11
  specialties: string[];
  rating: number;
  completedCampaigns: number;
  priceRange: string;
  isVerified: boolean;
  portfolioItems: Array<{
    id: string;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    thumbnailUrl?: string;
  }>;
}

export default function BrowseCreators() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [filteredCreators, setFilteredCreators] = useState<Creator[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);

  useEffect(() => {
    loadCreators();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, creators]);

  const loadCreators = async () => {
    try {
      setLoading(true);
      console.log('[BrowseCreators] Loading creators...');
      const { data, error } = await getCreators({}, 50, 0);
      
      if (error) {
        console.error('[BrowseCreators] Error loading creators:', error);
        return;
      }

      console.log('[BrowseCreators] Received creators from service:', {
        count: data?.length || 0,
        displayNames: data?.map((c) => c.displayName) || [],
      });
      
      // Transform and enrich creator data
      const enrichedCreators = await Promise.all(
        (data || []).map(async (creator) => {
          // Get rating and campaign count
          const { data: applications } = await supabase
            .from('campaign_applications')
            .select('id, status, rating')
            .eq('creator_id', creator.id)
            .in('status', ['accepted', 'completed']);

          const completedCampaigns = applications?.filter(a => a.status === 'accepted').length || 0;
          
          // Calculate actual rating from completed campaigns (CM-16)
          const ratings = applications?.filter(a => a.status === 'accepted' && a.rating).map(a => a.rating) || [];
          const rating = ratings.length > 0
            ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10
            : null;

          // Get portfolio items (replace recent posts)
          let portfolioItems: any[] = [];
          try {
            // Try with video columns first
            const { data: videoPortfolio, error: videoError } = await supabase
              .from('creator_portfolio_items')
              .select('id, image_url, video_url, media_type, thumbnail_url, display_order')
              .eq('creator_profile_id', creator.id)
              .order('display_order')
              .limit(6);
            
            // If video columns don't exist, fall back to base schema
            if (videoError?.message?.includes('video_url') || videoError?.message?.includes('thumbnail_url') || videoError?.message?.includes('media_type')) {
              const { data: basePortfolio } = await supabase
                .from('creator_portfolio_items')
                .select('id, image_url, display_order')
                .eq('creator_profile_id', creator.id)
                .order('display_order')
                .limit(6);
              
              // Apply same Cloudinary detection logic as getCreatorProfile
              portfolioItems = (basePortfolio || []).map((item: any) => {
                const imageUrl = item.image_url || '';
                
                // Detect media type from URL structure (same as getCreatorProfile)
                let detectedMediaType: 'image' | 'video' = 'image';
                let finalMediaUrl = imageUrl;
                
                const url = imageUrl.toLowerCase();
                const isCloudinaryVideo = url.includes('/video/upload/');
                
                if (
                  isCloudinaryVideo ||
                  url.includes('.mp4') ||
                  url.includes('.mov') ||
                  url.includes('.avi') ||
                  url.includes('.webm') ||
                  url.includes('.mkv') ||
                  (url.includes('video') && !url.includes('thumbnail'))
                ) {
                  detectedMediaType = 'video';
                  
                  // Extract proper video URL from Cloudinary (same logic as getCreatorProfile)
                  if (isCloudinaryVideo) {
                    try {
                      const urlObj = new URL(imageUrl);
                      const pathParts = urlObj.pathname.split('/');
                      const uploadIndex = pathParts.findIndex(p => p === 'upload');
                      
                      if (uploadIndex >= 0) {
                        const versionIndex = pathParts.findIndex((p, i) => 
                          i > uploadIndex && /^v\d+$/.test(p)
                        );
                        
                        if (versionIndex >= 0 && versionIndex < pathParts.length - 1) {
                          const version = pathParts[versionIndex];
                          const fileName = pathParts[versionIndex + 1].replace(/\.(jpg|jpeg|png|gif)$/i, '.mp4');
                          const basePath = pathParts.slice(0, uploadIndex + 1).join('/');
                          finalMediaUrl = `${urlObj.origin}${basePath}/${version}/${fileName}`;
                        } else {
                          finalMediaUrl = imageUrl.replace(/\.(jpg|jpeg|png|gif)$/i, '.mp4');
                        }
                      } else {
                        finalMediaUrl = imageUrl.replace(/\.(jpg|jpeg|png|gif)$/i, '.mp4');
                      }
                    } catch (e) {
                      console.warn('[BrowseCreators] Failed to parse Cloudinary video URL:', e);
                      finalMediaUrl = imageUrl.replace(/\.(jpg|jpeg|png|gif)$/i, '.mp4');
                    }
                  }
                }
                
                const mappedItem = {
                  id: item.id,
                  mediaUrl: finalMediaUrl,
                  mediaType: detectedMediaType,
                  thumbnailUrl: detectedMediaType === 'video' ? imageUrl : undefined,
                };
                
                // Strategic logging for base schema video detection
                if (detectedMediaType === 'video') {
                  console.log('[BrowseCreators] Base schema - detected video:', {
                    itemId: item.id,
                    originalImageUrl: imageUrl,
                    detectedMediaType,
                    finalMediaUrl,
                    thumbnailUrl: mappedItem.thumbnailUrl,
                  });
                }
                
                return mappedItem;
              });
            } else if (!videoError && videoPortfolio) {
              portfolioItems = (videoPortfolio || []).map((item: any) => {
                const videoUrl = item.video_url || '';
                const imageUrl = item.image_url || '';
                
                // Detect media type intelligently (same logic as getCreatorProfile)
                let detectedMediaType: 'image' | 'video' = 'image';
                let finalMediaUrl = videoUrl || imageUrl;
                
                if (videoUrl) {
                  detectedMediaType = 'video';
                  finalMediaUrl = videoUrl;
                } else if (item.media_type) {
                  detectedMediaType = item.media_type as 'image' | 'video';
                } else {
                  // Detect from URL structure
                  const url = imageUrl.toLowerCase();
                  const isCloudinaryVideo = url.includes('/video/upload/');
                  
                  if (
                    isCloudinaryVideo ||
                    url.includes('.mp4') ||
                    url.includes('.mov') ||
                    url.includes('.avi') ||
                    url.includes('.webm') ||
                    url.includes('.mkv') ||
                    (url.includes('video') && !url.includes('thumbnail'))
                  ) {
                    detectedMediaType = 'video';
                    
                    // Extract proper video URL from Cloudinary
                    if (isCloudinaryVideo) {
                      try {
                        const urlObj = new URL(imageUrl);
                        const pathParts = urlObj.pathname.split('/');
                        const uploadIndex = pathParts.findIndex(p => p === 'upload');
                        
                        if (uploadIndex >= 0) {
                          const versionIndex = pathParts.findIndex((p, i) => 
                            i > uploadIndex && /^v\d+$/.test(p)
                          );
                          
                          if (versionIndex >= 0 && versionIndex < pathParts.length - 1) {
                            const version = pathParts[versionIndex];
                            const fileName = pathParts[versionIndex + 1].replace(/\.(jpg|jpeg|png|gif)$/i, '.mp4');
                            const basePath = pathParts.slice(0, uploadIndex + 1).join('/');
                            finalMediaUrl = `${urlObj.origin}${basePath}/${version}/${fileName}`;
                          } else {
                            finalMediaUrl = imageUrl.replace(/\.(jpg|jpeg|png|gif)$/i, '.mp4');
                          }
                        }
                      } catch (e) {
                        finalMediaUrl = imageUrl.replace(/\.(jpg|jpeg|png|gif)$/i, '.mp4');
                      }
                    }
                  }
                }
                
                const mappedItem = {
                  id: item.id,
                  mediaUrl: finalMediaUrl,
                  mediaType: detectedMediaType,
                  thumbnailUrl: item.thumbnail_url || (detectedMediaType === 'video' && imageUrl && !videoUrl ? imageUrl : undefined),
                };
                
                // Strategic logging for portfolio item mapping
                if (detectedMediaType === 'video') {
                  console.log('[BrowseCreators] Mapped video portfolio item:', {
                    itemId: item.id,
                    originalVideoUrl: videoUrl,
                    originalImageUrl: imageUrl,
                    originalMediaType: item.media_type,
                    detectedMediaType,
                    finalMediaUrl,
                    thumbnailUrl: mappedItem.thumbnailUrl,
                    hasFinalMediaUrl: !!finalMediaUrl,
                  });
                }
                
                return mappedItem;
              });
            }
          } catch (err) {
            console.error('[BrowseCreators] Error loading portfolio:', err);
          }

          // Get username from user
          const { data: userData } = await supabase
            .from('users')
            .select('username')
            .eq('id', creator.userId)
            .single();

          // Determine price range based on followers
          let priceRange = '$200 - $500';
          if (creator.totalFollowers >= 50000) {
            priceRange = '$1,000+';
          } else if (creator.totalFollowers >= 10000) {
            priceRange = '$500 - $1,000';
          } else if (creator.totalFollowers < 5000) {
            priceRange = '$50 - $200';
          }

          return {
            id: creator.id,
            userId: creator.userId,
            displayName: creator.displayName,
            username: userData?.username ? `@${userData.username}` : '@creator',
            avatarUrl: creator.avatarUrl,
            bio: creator.bio,
            location: creator.location,
            totalFollowers: creator.totalFollowers,
            engagementRate: creator.engagementRate,
            openToCollabs: creator.openToCollabs,
            availabilityStatus: creator.availabilityStatus || 'available', // CM-11
            specialties: creator.specialties,
            rating: rating || 4.5,
            completedCampaigns: completedCampaigns || Math.floor(Math.random() * 20),
            priceRange,
            isVerified: completedCampaigns >= 5, // Verified if 5+ campaigns
            portfolioItems: portfolioItems.filter((p: any) => p.mediaUrl), // Filter out items without media
          };
        })
      );

      console.log('[BrowseCreators] Enriched creators:', {
        count: enrichedCreators.length,
        displayNames: enrichedCreators.map((c) => c.displayName),
        usernames: enrichedCreators.map((c) => c.username),
      });

      // Verify no business accounts are included
      const creatorUserIds = enrichedCreators.map((c) => c.userId);
      const { data: userAccounts } = await supabase
        .from('users')
        .select('id, email, account_type')
        .in('id', creatorUserIds);

      if (userAccounts) {
        const accountTypeMap = new Map(userAccounts.map((u: any) => [u.id, u]));
        const accountTypeCheck = enrichedCreators.map((c) => {
          const user = accountTypeMap.get(c.userId);
          return {
            displayName: c.displayName,
            email: user?.email || 'unknown',
            account_type: user?.account_type || 'MISSING',
          };
        });

        console.log('[BrowseCreators] Final account type verification:', {
          total: accountTypeCheck.length,
          creators: accountTypeCheck.filter((a) => a.account_type === 'creator').length,
          businesses: accountTypeCheck.filter((a) => a.account_type === 'business').length,
          details: accountTypeCheck,
        });

        const businessAccounts = accountTypeCheck.filter((a) => a.account_type === 'business');
        if (businessAccounts.length > 0) {
          console.error('[BrowseCreators] ❌ ERROR: Business accounts found in creator list:', businessAccounts);
        } else {
          console.log('[BrowseCreators] ✅ SUCCESS: All accounts are creator type');
        }
      }

      setCreators(enrichedCreators);
      setFilteredCreators(enrichedCreators);
    } catch (error) {
      console.error('[BrowseCreators] Failed to load creators:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...creators];

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (creator) =>
          creator.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          creator.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          creator.bio?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCreators(filtered);
  };

  const handleInviteCreator = (creator: Creator) => {
    setSelectedCreator(creator);
    setInviteModalVisible(true);
  };

  const renderCreatorCard = ({ item: creator }: { item: Creator }) => (
    <TouchableOpacity
      onPress={() => router.push(`/creator/${creator.id}`)}
      activeOpacity={0.9}
      style={{
        backgroundColor: DS.colors.backgroundWhite,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: DS.colors.border,
      }}
    >
      {/* Creator Header */}
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        {/* Avatar */}
        <View style={{ marginRight: 12 }}>
          {creator.avatarUrl ? (
            <Image
              source={{ uri: creator.avatarUrl }}
              style={{ width: 60, height: 60, borderRadius: 30 }}
            />
          ) : (
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: DS.colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 24, fontWeight: '600', color: 'white' }}>
                {creator.displayName[0]?.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Name and Info */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginRight: 6 }}>
              {creator.displayName}
            </Text>
            {creator.isVerified && (
              <View
                style={{
                  backgroundColor: '#10B981',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text style={{ color: 'white', fontSize: 9, fontWeight: '700' }}>VERIFIED</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 14, color: DS.colors.textLight, marginBottom: 4 }}>
            {creator.username}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MapPin size={12} color={DS.colors.textLight} />
            <Text style={{ fontSize: 12, color: DS.colors.textLight, marginLeft: 4 }}>
              {creator.location || 'Location not set'}
            </Text>
          </View>
          {/* Availability Badge - CM-11 */}
          {(() => {
            return null;
          })()}
          {creator.availabilityStatus === 'busy' && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FEF3C7',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                alignSelf: 'flex-start',
                marginTop: 6,
                gap: 4,
              }}
            >
              <Clock size={12} color="#92400E" />
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#92400E' }}>Busy</Text>
            </View>
          )}
          {creator.availabilityStatus === 'not_accepting' && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FEE2E2',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                alignSelf: 'flex-start',
                marginTop: 6,
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#DC2626' }}>Not Accepting</Text>
            </View>
          )}
        </View>

        {/* Rating and Campaigns */}
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Star size={14} color="#FFB800" fill="#FFB800" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: DS.colors.text, marginLeft: 4 }}>
              {creator.rating.toFixed(1)}
            </Text>
          </View>
          {/* <Text style={{ fontSize: 12, color: DS.colors.textLight }}>
            {creator.completedCampaigns} campaigns
          </Text> */}
        </View>
      </View>

      {/* Bio */}
      {creator.bio && (
        <Text style={{ fontSize: 14, color: DS.colors.text, marginBottom: 12, lineHeight: 20 }}>
          {creator.bio}
        </Text>
      )}

      {/* Metrics */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: DS.colors.border,
        }}
      >
        <Text style={{ fontSize: 14, color: DS.colors.text }}>
          {formatFollowers(creator.totalFollowers)} Followers
        </Text>
        <Text style={{ fontSize: 14, color: DS.colors.text }}>
          {creator.engagementRate.toFixed(1)}% Engagement
        </Text>
        {/* <Text style={{ fontSize: 14, color: DS.colors.text }}>{creator.priceRange} Rate</Text> */}
      </View>

      {/* Portfolio */}
      {creator.portfolioItems && creator.portfolioItems.length > 0 ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: DS.colors.text, marginBottom: 8 }}>
            Portfolio
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {creator.portfolioItems.slice(0, 6).map((item) => {
              // For videos, use the actual video URL (mediaUrl contains the video URL from creatorDiscoveryService)
              // For images, use mediaUrl directly
              const videoUrl = item.mediaType === 'video' ? item.mediaUrl : null;
              const imageUrl = item.mediaType === 'image' ? item.mediaUrl : null;
              
              // Strategic logging for video thumbnail debugging
              if (item.mediaType === 'video') {
                console.log('[BrowseCreators] Video portfolio item:', {
                  creatorId: creator.id,
                  creatorName: creator.displayName,
                  itemId: item.id,
                  mediaType: item.mediaType,
                  mediaUrl: item.mediaUrl,
                  thumbnailUrl: item.thumbnailUrl,
                  videoUrl,
                  hasVideoUrl: !!videoUrl,
                  willRenderVideoThumbnail: item.mediaType === 'video' && !!videoUrl,
                });
              }
              
              return (
                <View key={item.id} style={{ position: 'relative', width: 80, height: 80 }}>
                  {item.mediaType === 'video' && videoUrl ? (
                    <VideoThumbnail
                      videoUri={videoUrl}
                      style={{ width: 80, height: 80, borderRadius: 8 }}
                      resizeMode="cover"
                    />
                  ) : imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={{ width: 80, height: 80, borderRadius: 8 }}
                    />
                  ) : (
                    <View style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: DS.colors.border }} />
                  )}
                  {item.mediaType === 'video' && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 4,
                        left: 4,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        borderRadius: 12,
                        padding: 4,
                      }}
                    >
                      <Play size={12} color="white" />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: DS.colors.text, marginBottom: 8 }}>
            Portfolio
          </Text>
          <Text style={{ fontSize: 12, color: DS.colors.textLight, fontStyle: 'italic' }}>
            No portfolio items yet
          </Text>
        </View>
      )}

      {/* Invite Button */}
      <TouchableOpacity
        onPress={() => handleInviteCreator(creator)}
        activeOpacity={0.8}
        style={{
          backgroundColor: DS.colors.primaryOrange,
          paddingVertical: DS.spacing.md,
          borderRadius: DS.borderRadius.md,
          alignItems: 'center',
          justifyContent: 'center',
          ...DS.shadows.sm,
        }}
      >
        <Text style={{ 
          fontSize: DS.typography.button.fontSize, 
          fontWeight: DS.typography.button.fontWeight, 
          color: DS.colors.textWhite,
          letterSpacing: DS.typography.button.letterSpacing,
        }}>
          Invite to Campaign
        </Text>
      </TouchableOpacity>
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
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
          backgroundColor: DS.colors.backgroundWhite,
          borderBottomWidth: 1,
          borderBottomColor: DS.colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.push('/(tabs)/more')}>
          <ArrowLeft size={24} color={DS.colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: DS.colors.text }}>
          Browse Creators
        </Text>
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
          <Filter size={24} color={DS.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View
        style={{
          padding: 16,
          backgroundColor: DS.colors.backgroundWhite,
          borderBottomWidth: 1,
          borderBottomColor: DS.colors.border,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: DS.colors.background,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Search size={18} color={DS.colors.textLight} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search creators..."
            placeholderTextColor={DS.colors.textLight}
            style={{
              flex: 1,
              marginLeft: 8,
              fontSize: 14,
              color: DS.colors.text,
            }}
          />
        </View>
      </View>

      {/* Results Count */}
      <View style={{ padding: 12, backgroundColor: DS.colors.background }}>
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
        contentContainerStyle={{ paddingBottom: 16 }}
        ListEmptyComponent={
          <EmptyState
            icon={Users}
            title="No Creators Found"
            message={
              searchQuery
                ? "Try adjusting your filters or check back later for new creators."
                : "No creators are currently available. Check back later for new creators."
            }
            ctaLabel={searchQuery ? "Clear Search" : undefined}
            onCtaPress={searchQuery ? () => setSearchQuery('') : undefined}
          />
        }
      />

      {/* Invite Modal */}
      {selectedCreator && (
        <InviteCreatorModal
          creatorId={selectedCreator.id}
          creatorName={selectedCreator.displayName}
          creatorAvatar={selectedCreator.avatarUrl || undefined}
          visible={inviteModalVisible}
          onClose={() => {
            setInviteModalVisible(false);
            setSelectedCreator(null);
          }}
          onSuccess={() => {
            // Optionally refresh the list or show success message
          }}
        />
      )}
    </SafeAreaView>
  );
}
