/**
 * Browse Creators Screen
 * 
 * Restaurant owners can browse and filter creators to invite to campaigns.
 * Matches design spec 1:1.
 */

import InviteCreatorModal from '@/components/business/InviteCreatorModal';
import { EmptyState } from '@/components/design-system';
import { DS } from '@/components/design-system/tokens';
import { VideoThumbnail } from '@/components/VideoThumbnail';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { CreatorFilters, formatFollowers, getCreators, getCitiesWithCreators } from '@/services/creatorDiscoveryService';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronDown, Clock, Filter, MapPin, Play, Search, Star, Users, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
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
  rating: number | null;
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
  const [loadingCreators, setLoadingCreators] = useState(false);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [filteredCreators, setFilteredCreators] = useState<Creator[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);

  // TRO-145: Applied filter state (what's actually being used for search)
  const [appliedFollowerBucket, setAppliedFollowerBucket] = useState<'under5k' | '5k-20k' | '20kplus' | null>(null);
  const [appliedCompensation, setAppliedCompensation] = useState<string[]>([]);
  const [appliedSortBy, setAppliedSortBy] = useState<'recentlyActive' | 'followersHigh' | 'followersLow' | null>(null);
  const [appliedCityFilter, setAppliedCityFilter] = useState<string>('');

  // Local filter state (what user is selecting before applying)
  const [localFollowerBucket, setLocalFollowerBucket] = useState<'under5k' | '5k-20k' | '20kplus' | null>(null);
  const [localCompensation, setLocalCompensation] = useState<string[]>([]);
  const [localSortBy, setLocalSortBy] = useState<'recentlyActive' | 'followersHigh' | 'followersLow' | null>(null);
  const [localCityFilter, setLocalCityFilter] = useState<string>('');

  // City dropdown state
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  // Load creators when applied filters change
  // Convert array to string for stable comparison to avoid infinite loops
  const appliedCompensationKey = JSON.stringify(appliedCompensation.sort());
  
  useEffect(() => {
    loadCreators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFollowerBucket, appliedCompensationKey, appliedSortBy, appliedCityFilter]);

  // Load available cities on mount
  useEffect(() => {
    loadAvailableCities();
  }, []);

  // Load available cities
  const loadAvailableCities = async () => {
    setLoadingCities(true);
    const { data, error } = await getCitiesWithCreators();
    if (!error && data) {
      setAvailableCities(data);
    }
    setLoadingCities(false);
  };

  // TRO-145: Check if any filters are active (applied filters)
  const hasActiveFilters = appliedFollowerBucket !== null || appliedCompensation.length > 0 || appliedSortBy !== null || appliedCityFilter !== '';

  // Check if local filters differ from applied filters
  const hasUnsavedFilters = 
    localFollowerBucket !== appliedFollowerBucket ||
    JSON.stringify(localCompensation.sort()) !== JSON.stringify(appliedCompensation.sort()) ||
    localSortBy !== appliedSortBy ||
    localCityFilter !== appliedCityFilter;

  // TRO-145: Apply filters (copy local to applied)
  const applyFilters = () => {
    setAppliedFollowerBucket(localFollowerBucket);
    setAppliedCompensation([...localCompensation]);
    setAppliedSortBy(localSortBy);
    setAppliedCityFilter(localCityFilter);
    setShowFilters(false); // Close filter modal after applying
  };

  // TRO-145: Clear all filters
  const clearFilters = () => {
    setLocalFollowerBucket(null);
    setLocalCompensation([]);
    setLocalSortBy(null);
    setLocalCityFilter('');
    setAppliedFollowerBucket(null);
    setAppliedCompensation([]);
    setAppliedSortBy(null);
    setAppliedCityFilter('');
    setSearchQuery('');
  };

  const loadCreators = async () => {
    try {
      // Only show FlatList spinner if we already have creators (filter change)
      // Otherwise show full screen spinner (initial load)
      if (creators.length > 0) {
        setLoadingCreators(true);
      } else {
        setLoading(true);
      }

      // TRO-145: Build filter object from applied filters
      const filters: CreatorFilters = {};
      if (appliedCityFilter) filters.city = appliedCityFilter;
      if (appliedFollowerBucket) filters.followerBucket = appliedFollowerBucket;
      if (appliedCompensation.length > 0) filters.preferredCompensation = appliedCompensation;
      if (appliedSortBy) filters.sortBy = appliedSortBy;

      console.log('[BrowseCreators] Loading creators with filters:', filters);
      const { data, error } = await getCreators(filters, 50, 0);
      
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

          // Use Instagram or TikTok engagement as fallback when Troodie engagement is 0
          const bestEngagementRate =
            (creator.instagramEngagementRate && creator.instagramEngagementRate > 0)
              ? creator.instagramEngagementRate
              : (creator.tiktokEngagementRate && creator.tiktokEngagementRate > 0)
                ? creator.tiktokEngagementRate
                : creator.engagementRate;

          return {
            id: creator.id,
            userId: creator.userId,
            displayName: creator.displayName,
            username: userData?.username ? `@${userData.username}` : '@creator',
            avatarUrl: creator.avatarUrl,
            bio: creator.bio,
            location: creator.location,
            totalFollowers: creator.totalFollowers,
            engagementRate: bestEngagementRate,
            openToCollabs: creator.openToCollabs,
            availabilityStatus: creator.availabilityStatus || 'available', // CM-11
            specialties: creator.specialties,
            rating: rating,
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
      setLoadingCreators(false);
    }
  };

  const applySearchFilter = () => {
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

  useEffect(() => {
    applySearchFilter();
  }, [searchQuery, creators]);

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
            <Star size={14} color={creator.rating ? "#FFB800" : "#D1D5DB"} fill={creator.rating ? "#FFB800" : "#D1D5DB"} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: DS.colors.text, marginLeft: 4 }}>
              {creator.rating ? creator.rating.toFixed(1) : '—'}
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
            {creator.portfolioItems.slice(0, 4).map((item) => {
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
        <TouchableOpacity onPress={() => {
          // Sync local filters with applied filters when opening
          if (!showFilters) {
            setLocalFollowerBucket(appliedFollowerBucket);
            setLocalCompensation([...appliedCompensation]);
            setLocalSortBy(appliedSortBy);
            setLocalCityFilter(appliedCityFilter);
          }
          setShowFilters(!showFilters);
        }}>
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

      {/* TRO-145: Filter Section */}
      {showFilters && (
        <View style={{ backgroundColor: DS.colors.backgroundWhite, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: DS.colors.border }}>
          {/* Sort Options */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: DS.colors.text, marginBottom: 8 }}>Sort by</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { value: null, label: 'Default' },
                { value: 'recentlyActive' as const, label: 'Recently Active' },
                { value: 'followersHigh' as const, label: 'Followers (High)' },
                { value: 'followersLow' as const, label: 'Followers (Low)' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value || 'default'}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: localSortBy === option.value ? DS.colors.primary : DS.colors.border,
                    backgroundColor: localSortBy === option.value ? '#FFFBEB' : 'transparent',
                  }}
                  onPress={() => setLocalSortBy(option.value)}
                >
                  <Text style={{
                    fontSize: 13,
                    color: localSortBy === option.value ? DS.colors.primary : DS.colors.text,
                    fontWeight: localSortBy === option.value ? '600' : '400',
                  }}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Follower Buckets */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: DS.colors.text, marginBottom: 8 }}>Follower Count</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { value: null, label: 'All' },
                { value: 'under5k' as const, label: 'Under 5K' },
                { value: '5k-20k' as const, label: '5K - 20K' },
                { value: '20kplus' as const, label: '20K+' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value || 'all'}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: localFollowerBucket === option.value ? DS.colors.primary : DS.colors.border,
                    backgroundColor: localFollowerBucket === option.value ? '#FFFBEB' : 'transparent',
                  }}
                  onPress={() => setLocalFollowerBucket(option.value)}
                >
                  <Text style={{
                    fontSize: 13,
                    color: localFollowerBucket === option.value ? DS.colors.primary : DS.colors.text,
                    fontWeight: localFollowerBucket === option.value ? '600' : '400',
                  }}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Compensation Preferences */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: DS.colors.text, marginBottom: 8 }}>Compensation</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { value: 'free', label: 'Free' },
                { value: 'compensated_meals', label: 'Comp Meals' },
                { value: 'pay_under_150', label: 'Under $150' },
                { value: 'pay_150_500', label: '$150-500' },
                { value: 'pay_over_500', label: '$500+' },
              ].map((option) => {
                const isSelected = localCompensation.includes(option.value);
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: isSelected ? DS.colors.primary : DS.colors.border,
                      backgroundColor: isSelected ? '#FFFBEB' : 'transparent',
                    }}
                    onPress={() => {
                      if (isSelected) {
                        setLocalCompensation(localCompensation.filter(v => v !== option.value));
                      } else {
                        setLocalCompensation([...localCompensation, option.value]);
                      }
                    }}
                  >
                    <Text style={{
                      fontSize: 13,
                      color: isSelected ? DS.colors.primary : DS.colors.text,
                      fontWeight: isSelected ? '600' : '400',
                    }}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* City Filter */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: DS.colors.text, marginBottom: 8 }}>City</Text>
            <TouchableOpacity
              onPress={() => setShowCityPicker(true)}
              style={{
                borderWidth: 1,
                borderColor: DS.colors.border,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: DS.colors.background,
              }}
            >
              <Text style={{
                fontSize: 14,
                color: localCityFilter ? DS.colors.text : DS.colors.textLight,
              }}>
                {localCityFilter || 'Select city...'}
              </Text>
              <ChevronDown size={18} color={DS.colors.textLight} />
            </TouchableOpacity>
          </View>

          {/* Apply Filters Button */}
          {hasUnsavedFilters && (
            <TouchableOpacity
              onPress={applyFilters}
              style={{
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                backgroundColor: DS.colors.primaryOrange,
                marginBottom: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              activeOpacity={0.8}
            >
              <Text style={{ 
                fontSize: 16, 
                color: '#FFFFFF', 
                fontWeight: '700',
                letterSpacing: 0.2,
              }}>
                Apply Filters
              </Text>
            </TouchableOpacity>
          )}

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <TouchableOpacity
              onPress={clearFilters}
              style={{
                paddingVertical: 10,
                alignItems: 'center',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: DS.colors.border,
              }}
            >
              <Text style={{ fontSize: 14, color: DS.colors.textLight, fontWeight: '500' }}>Clear All Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Results Count */}
      <View style={{ padding: 12, backgroundColor: DS.colors.background }}>
        <Text style={{ fontSize: 12, color: DS.colors.textLight, textAlign: 'center' }}>
          {filteredCreators.length} creator{filteredCreators.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* Creators List */}
      {loadingCreators ? (
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          paddingVertical: 60,
        }}>
          <ActivityIndicator size="large" color={DS.colors.primaryOrange} />
          <Text style={{ 
            marginTop: 16, 
            fontSize: 14, 
            color: DS.colors.textLight,
          }}>
            Loading creators...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCreators}
          keyExtractor={(item) => item.id}
          renderItem={renderCreatorCard}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
          scrollEnabled={!showCityPicker}
          ListEmptyComponent={
            <EmptyState
              type="custom"
              icon={Users}
              title="No Creators Found"
              message={
                searchQuery
                  ? "Try adjusting your filters or check back later for new creators."
                  : "No creators are currently available. Check back later for new creators."
              }
              actionLabel={searchQuery ? "Clear Search" : undefined}
              onAction={searchQuery ? () => setSearchQuery('') : undefined}
            />
          }
        />
      )}

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

      {/* City Picker Modal - Matching InviteCreatorModal Pattern */}
      <Modal
        visible={showCityPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCityPicker(false)}
        statusBarTranslucent={true}
      >
        <View style={{
          flex: 1,
          backgroundColor: DS.colors.overlay,
          justifyContent: 'flex-end',
        }}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFillObject} 
            activeOpacity={1} 
            onPress={() => setShowCityPicker(false)}
          />
          <SafeAreaView edges={['bottom']} style={{ maxHeight: '90%', width: '100%' }} pointerEvents="box-none">
            <View style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: DS.borderRadius.xl,
              borderTopRightRadius: DS.borderRadius.xl,
              height: '100%',
              flexDirection: 'column',
              ...DS.shadows.lg,
            }} onStartShouldSetResponder={() => true}>
              {/* Drag Handle */}
              <View style={{
                width: 40,
                height: 4,
                backgroundColor: DS.colors.border,
                borderRadius: 2,
                alignSelf: 'center',
                marginTop: DS.spacing.sm,
                marginBottom: DS.spacing.xs,
              }} />
              
              {/* Header */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: DS.spacing.lg,
                paddingTop: DS.spacing.xl,
                borderBottomWidth: 1,
                borderBottomColor: DS.colors.border,
                backgroundColor: '#FFFFFF',
              }}>
                <Text style={{
                  ...DS.typography.h2,
                  color: DS.colors.textDark,
                  flex: 1,
                  marginRight: DS.spacing.md,
                }}>
                  Select City
                </Text>
                <TouchableOpacity
                  onPress={() => setShowCityPicker(false)}
                  style={{ padding: DS.spacing.xs }}
                >
                  <X size={24} color={DS.colors.textDark} />
                </TouchableOpacity>
              </View>

              {/* City List */}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: DS.spacing.lg }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Clear selection option */}
                <TouchableOpacity
                  style={{
                    paddingHorizontal: DS.spacing.lg,
                    paddingVertical: DS.spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: DS.colors.borderLight,
                    backgroundColor: !localCityFilter 
                      ? '#FFFBEB' 
                      : DS.colors.surfaceLight,
                  }}
                  onPress={() => {
                    setLocalCityFilter('');
                    setShowCityPicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{
                      ...DS.typography.h3,
                      color: DS.colors.textDark,
                      fontWeight: !localCityFilter ? '600' : '500',
                    }}>
                      All Cities
                    </Text>
                    {!localCityFilter && (
                      <View style={{
                        marginLeft: 8,
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: DS.colors.primaryOrange,
                      }} />
                    )}
                  </View>
                </TouchableOpacity>

                {loadingCities ? (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={DS.colors.primaryOrange} />
                    <Text style={{
                      marginTop: DS.spacing.sm,
                      ...DS.typography.body,
                      color: DS.colors.textGray,
                    }}>
                      Loading cities...
                    </Text>
                  </View>
                ) : availableCities.length === 0 ? (
                  <View style={{ padding: DS.spacing.xxl, alignItems: 'center' }}>
                    <Text style={{
                      ...DS.typography.h3,
                      color: DS.colors.textDark,
                      marginBottom: DS.spacing.xs,
                    }}>
                      No cities available
                    </Text>
                    <Text style={{
                      ...DS.typography.body,
                      color: DS.colors.textGray,
                      textAlign: 'center',
                    }}>
                      Check back later for new creators
                    </Text>
                  </View>
                ) : (
                  availableCities.map((city, index) => (
                    <TouchableOpacity
                      key={city}
                      style={{
                        paddingHorizontal: DS.spacing.lg,
                        paddingVertical: DS.spacing.md,
                        borderBottomWidth: index === availableCities.length - 1 ? 0 : 1,
                        borderBottomColor: DS.colors.borderLight,
                        backgroundColor: localCityFilter === city
                          ? '#FFFBEB'
                          : DS.colors.surface,
                      }}
                      onPress={() => {
                        setLocalCityFilter(city);
                        setShowCityPicker(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MapPin
                          size={18}
                          color={
                            localCityFilter === city
                              ? DS.colors.primaryOrange
                              : DS.colors.textGray
                          }
                          style={{ marginRight: 12 }}
                        />
                        <Text style={{
                          ...DS.typography.h3,
                          color: DS.colors.textDark,
                          fontWeight: localCityFilter === city ? '600' : '400',
                        }}>
                          {city}
                        </Text>
                        {localCityFilter === city && (
                          <View style={{
                            marginLeft: 'auto',
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: DS.colors.primaryOrange,
                          }} />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
