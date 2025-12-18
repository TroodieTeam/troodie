/**
 * Edit Creator Profile Screen
 * 
 * Allows creators to edit their profile including:
 * - Display name
 * - Bio
 * - Location
 * - Specialties
 * - Open to Collabs toggle
 */

import { ImageViewer } from '@/components/ImageViewer';
import { VideoThumbnail } from '@/components/VideoThumbnail';
import { VideoViewer } from '@/components/VideoViewer';
import { DS } from '@/components/design-system/tokens';
import { MAJOR_CITIES } from '@/constants/majorCities';
import { useAuth } from '@/contexts/AuthContext';
import { useCreatorProfile } from '@/hooks/useCreatorProfileId';
import { supabase } from '@/lib/supabase';
import {
  updateCreatorProfile
} from '@/services/creatorDiscoveryService';
import { addPortfolioItems } from '@/services/creatorUpgradeService';
import { ImageUploadServiceV2 } from '@/services/imageUploadServiceV2';
import {
  PortfolioImage as PortfolioImageType,
  uploadAllPortfolioImages,
  UploadProgress,
} from '@/services/portfolioImageService';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, ChevronDown, Lightbulb, Play, Plus, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EditCreatorProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile: creatorProfile, loading: profileLoading } = useCreatorProfile();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [openToCollabs, setOpenToCollabs] = useState(true);
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'busy' | 'not_accepting'>('available');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // CM-15: Portfolio management
  const [portfolioItems, setPortfolioItems] = useState<Array<{ 
    id: string; 
    image_url?: string; 
    video_url?: string; 
    media_type: string;
    thumbnail_url?: string;
  }>>([]);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  
  // Viewer state
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [videoViewerVisible, setVideoViewerVisible] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  useEffect(() => {
    if (creatorProfile) {
      setDisplayName(creatorProfile.display_name || '');
      setBio(creatorProfile.bio || '');
      setLocation(creatorProfile.location || '');
      setProfileImageUrl(creatorProfile.avatar_url || null);
      setOpenToCollabs(creatorProfile.open_to_collabs ?? true);
      setAvailabilityStatus((creatorProfile.availability_status as 'available' | 'busy' | 'not_accepting') || 'available');
      
      // CM-15: Load portfolio items
      if (creatorProfile.id) {
        loadPortfolioItems();
      }
    }
  }, [creatorProfile]);

  // CM-15: Load portfolio items
  const loadPortfolioItems = async () => {
    if (!creatorProfile?.id) return;
    try {
      console.log('[EditCreatorProfileScreen] Loading portfolio items for profile:', creatorProfile.id);
      
      // First try with video columns (if migration applied)
      const { data: videoData, error: videoError } = await supabase
        .from('creator_portfolio_items')
        .select('id, image_url, video_url, media_type, thumbnail_url, display_order')
        .eq('creator_profile_id', creatorProfile.id)
        .order('display_order');
      
      // If video columns don't exist, fall back to base schema
      if (videoError?.message?.includes('video_url') || videoError?.message?.includes('thumbnail_url') || videoError?.message?.includes('media_type')) {
        console.log('[EditCreatorProfileScreen] Video columns not available, using base schema');
        const { data: baseData, error: baseError } = await supabase
          .from('creator_portfolio_items')
          .select('id, image_url, display_order')
          .eq('creator_profile_id', creatorProfile.id)
          .order('display_order');
        
        if (baseError) {
          console.error('[EditCreatorProfileScreen] Portfolio query error:', baseError);
          return;
        }
        
        if (baseData) {
          setPortfolioItems(baseData.map(item => ({
            id: item.id,
            image_url: item.image_url || undefined,
            video_url: undefined,
            media_type: 'image',
            thumbnail_url: undefined,
          })));
          console.log('[EditCreatorProfileScreen] Portfolio items set (base schema):', baseData.length);
        }
        return;
      }
      
      if (videoError) {
        console.error('[EditCreatorProfileScreen] Portfolio query error:', videoError);
        return;
      }
      
      // Video columns exist, use full data
      if (videoData) {
        setPortfolioItems(videoData.map(item => ({
          id: item.id,
          image_url: item.image_url || undefined,
          video_url: (item as any).video_url || undefined,
          media_type: (item as any).media_type || 'image',
          thumbnail_url: (item as any).thumbnail_url || undefined,
        })));
        console.log('[EditCreatorProfileScreen] Portfolio items set (with video support):', videoData.length);
      }
    } catch (error) {
      console.error('[EditCreatorProfileScreen] Error loading portfolio items:', error);
    }
  };

  // CM-15: Add portfolio item (matches onboarding flow)
  const handleAddPortfolioItem = async () => {
    if (!creatorProfile?.id || !user?.id) return;
    
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library access.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All, // Allow both images and videos
        allowsMultipleSelection: true,
        selectionLimit: 10 - portfolioItems.length, // Max 10 items total
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setUploadingPortfolio(true);
      
      // Convert to PortfolioImage format (same as onboarding)
      const newMedia: PortfolioImageType[] = result.assets.map(asset => ({
        id: `portfolio-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        uri: asset.uri,
        caption: '',
        mediaType: asset.type === 'video' ? 'video' as const : 'image' as const,
        duration: asset.duration ?? undefined,
      }));

      // Upload all media (same flow as onboarding)
      const uploadedMedia = await uploadAllPortfolioImages(
        user.id,
        newMedia,
        setUploadProgress
      );

      // Filter successful uploads
      const successfulUploads = uploadedMedia.filter(
        (media): media is NonNullable<typeof media> => 
          media !== null && 
          media !== undefined && 
          media.url !== undefined && 
          media.url !== null &&
          media.url.length > 0
      );

      if (successfulUploads.length === 0) {
        throw new Error('No items uploaded successfully');
      }

      // Add to database using same RPC function as onboarding
      const portfolioResult = await addPortfolioItems(
        creatorProfile.id,
        successfulUploads.map((media, index) => ({
          imageUrl: media.mediaType === 'image' ? media.url : undefined,
          videoUrl: media.mediaType === 'video' ? media.url : undefined,
          thumbnailUrl: media.thumbnailUrl,
          mediaType: media.mediaType || 'image',
          caption: media.caption,
          displayOrder: portfolioItems.length + index,
          isFeatured: false,
        }))
      );

      if (!portfolioResult.success) {
        throw new Error(portfolioResult.error || 'Failed to save portfolio items');
      }

      // Reload portfolio items
      await loadPortfolioItems();
      setHasChanges(true);
      
      Alert.alert('Success', `Added ${successfulUploads.length} item(s) to your portfolio.`);
    } catch (error: any) {
      console.error('[EditCreatorProfileScreen] Error adding portfolio item:', error);
      Alert.alert('Error', error.message || 'Failed to add portfolio item.');
    } finally {
      setUploadingPortfolio(false);
      setUploadProgress([]);
    }
  };

  // CM-15: Remove portfolio item
  const handleRemovePortfolioItem = async (itemId: string) => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this portfolio image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('creator_portfolio_items')
                .delete()
                .eq('id', itemId);

              if (error) throw error;

              setPortfolioItems(portfolioItems.filter(p => p.id !== itemId));
              setHasChanges(true);
            } catch (error: any) {
              Alert.alert('Error', 'Failed to remove image');
            }
          },
        },
      ]
    );
  };

  // CM-15: Calculate profile completeness
  const calculateCompleteness = () => {
    const checks = [
      { field: 'displayName', label: 'Display name' },
      { field: 'bio', label: 'Bio' },
      { field: 'location', label: 'Location' },
      { field: 'portfolioItems', label: 'Portfolio images', isArray: true, min: 3 },
    ];

    const missing: string[] = [];
    let completed = 0;

    for (const check of checks) {
      const value = check.field === 'displayName' ? displayName :
                   check.field === 'bio' ? bio :
                   check.field === 'location' ? location :
                   check.field === 'portfolioItems' ? portfolioItems : null;

      if (check.isArray) {
        if (Array.isArray(value) && value.length >= (check.min || 1)) {
          completed++;
        } else {
          missing.push(check.label);
        }
      } else {
        if (value && String(value).trim()) {
          completed++;
        } else {
          missing.push(check.label);
        }
      }
    }

    return {
      percentage: Math.round((completed / checks.length) * 100),
      missingItems: missing,
    };
  };

  const handleProfileImageChange = async () => {
    if (!user?.id || !creatorProfile?.id) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library access.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      setUploadingProfileImage(true);
      const imageUri = result.assets[0].uri;

      // Upload profile image
      const publicUrl = await ImageUploadServiceV2.uploadProfileImage(user.id, imageUri);

      // Update local state immediately
      setProfileImageUrl(publicUrl);
      setHasChanges(true);

      // Update in database
      const updateResult = await updateCreatorProfile(creatorProfile.id, {
        avatarUrl: publicUrl,
      });

      if (!updateResult.success) {
        // Revert on error
        setProfileImageUrl(creatorProfile.avatar_url || null);
        Alert.alert('Error', updateResult.error || 'Failed to update profile image');
      }
    } catch (error: any) {
      console.error('[EditCreatorProfileScreen] Error updating profile image:', error);
      Alert.alert('Error', error.message || 'Failed to update profile image');
      // Revert on error
      setProfileImageUrl(creatorProfile?.avatar_url || null);
    } finally {
      setUploadingProfileImage(false);
    }
  };

  const handleSave = async () => {
    if (!creatorProfile?.id) return;

    setSaving(true);
    const result = await updateCreatorProfile(creatorProfile.id, {
      displayName: displayName || undefined,
      bio: bio || undefined,
      location: location || undefined,
      openToCollabs: openToCollabs,
      availabilityStatus: availabilityStatus,
      avatarUrl: profileImageUrl || undefined,
    });

    if (result.success) {
      Alert.alert('Success', 'Profile updated!', [{ text: 'OK', onPress: () => router.push('/(tabs)/more') }]);
    } else {
      Alert.alert('Error', result.error || 'Failed to update profile');
    }
    setSaving(false);
  };

  const handleBack = () => {
    if (hasChanges) {
      Alert.alert('Discard Changes?', 'You have unsaved changes.', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.push('/(tabs)/more') },
      ]);
    } else {
      router.push('/(tabs)/more');
    }
  };


  useEffect(() => {
    console.log('[EditCreatorProfileScreen] Profile state:', {
      loading: profileLoading,
      hasProfile: !!creatorProfile,
      profileId: creatorProfile?.id,
      userId: user?.id,
    });
  }, [profileLoading, creatorProfile, user]);

  if (profileLoading) {
    console.log('[EditCreatorProfileScreen] Showing loading state');
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={DS.colors.primary} />
      </SafeAreaView>
    );
  }

  if (!creatorProfile) {
    console.warn('[EditCreatorProfileScreen] No creator profile found:', {
      userId: user?.id,
      userEmail: user?.email,
      accountType: user?.user_metadata?.account_type,
    });
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
        <View style={{ padding: 16 }}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/more')}>
            <X size={24} color={DS.colors.text} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 16, color: DS.colors.textLight }}>Creator profile not found</Text>
          <Text style={{ fontSize: 12, color: DS.colors.textLight, marginTop: 8, textAlign: 'center' }}>
            Your account is set as creator, but no creator profile exists.{'\n'}
            Please complete creator onboarding first.
          </Text>
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
        <TouchableOpacity onPress={handleBack}>
          <X size={24} color={DS.colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '600', color: DS.colors.text }}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !hasChanges}
          style={{
            paddingHorizontal: hasChanges ? 20 : 16,
            paddingVertical: hasChanges ? 10 : 8,
            borderRadius: 8,
            backgroundColor: hasChanges ? '#FFAD27' : DS.colors.border,
            opacity: saving ? 0.6 : 1,
            minWidth: hasChanges ? 80 : 60,
            alignItems: 'center',
            shadowColor: hasChanges ? '#FFAD27' : 'transparent',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: hasChanges ? 0.3 : 0,
            shadowRadius: 4,
            elevation: hasChanges ? 4 : 0,
          }}
        >
          <Text style={{ 
            color: hasChanges ? '#171717' : DS.colors.textLight, 
            fontWeight: hasChanges ? '700' : '600',
            fontSize: hasChanges ? 15 : 14,
          }}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ 
          padding: 16,
          paddingBottom: hasChanges ? 100 : 16, // Extra padding when floating button is visible
        }}
      >
        {/* Profile Image */}
        <View style={{ marginBottom: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginBottom: 12, alignSelf: 'flex-start' }}>Profile Image</Text>
          <TouchableOpacity
            onPress={handleProfileImageChange}
            disabled={uploadingProfileImage}
            style={{ position: 'relative' }}
          >
            {profileImageUrl ? (
              <Image
                source={{ uri: profileImageUrl }}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: DS.colors.border,
                }}
              />
            ) : (
              <View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: DS.colors.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 48, fontWeight: '600', color: 'white' }}>
                  {displayName[0]?.toUpperCase() || 'C'}
                </Text>
              </View>
            )}
            {uploadingProfileImage && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: 60,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <ActivityIndicator size="large" color="white" />
              </View>
            )}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: DS.colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 3,
                borderColor: '#FFFFFF',
              }}
            >
              <Camera size={18} color="white" />
            </View>
          </TouchableOpacity>
          <Text style={{ fontSize: 13, color: DS.colors.textLight, marginTop: 8, textAlign: 'center' }}>
            Tap to change your profile image
          </Text>
        </View>

        {/* CM-15: Profile Completeness Indicator */}
        {(() => {
          const { percentage, missingItems } = calculateCompleteness();
          return (
            <View style={{
              backgroundColor: DS.colors.backgroundWhite,
              padding: 16,
              marginBottom: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: DS.colors.border,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: DS.colors.text }}>Profile Completeness</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: DS.colors.primary }}>{percentage}%</Text>
              </View>
              <View style={{
                height: 8,
                backgroundColor: DS.colors.border,
                borderRadius: 4,
                overflow: 'hidden',
                marginBottom: 8,
              }}>
                <View style={{
                  height: '100%',
                  backgroundColor: DS.colors.primary,
                  borderRadius: 4,
                  width: `${percentage}%`,
                }} />
              </View>
              {missingItems.length > 0 && (
                <Text style={{ fontSize: 12, color: DS.colors.textLight, marginTop: 4 }}>
                  Add {missingItems.slice(0, 2).join(' and ')} to improve visibility
                </Text>
              )}
            </View>
          );
        })()}

        {/* CM-15: Profile Tips */}
        <View style={{
          backgroundColor: '#FFFBEB',
          padding: 16,
          borderRadius: 12,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: '#FDE68A',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Lightbulb size={20} color="#92400E" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#92400E' }}>Profile Tips</Text>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, color: '#78350F', lineHeight: 18 }}>• Add a bio that describes your content style</Text>
            <Text style={{ fontSize: 13, color: '#78350F', lineHeight: 18 }}>• Include 3+ portfolio images showing your best work</Text>
            <Text style={{ fontSize: 13, color: '#78350F', lineHeight: 18 }}>• Set your location to appear in local searches</Text>
          </View>
        </View>

        {/* Display Name */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginBottom: 8 }}>Display Name</Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: DS.colors.border,
              borderRadius: 12,
              padding: 12,
              fontSize: 14,
              color: DS.colors.text,
              backgroundColor: DS.colors.backgroundWhite,
            }}
            value={displayName}
            onChangeText={(text) => {
              setDisplayName(text);
              setHasChanges(true);
            }}
            placeholder="Your display name"
            placeholderTextColor={DS.colors.textLight}
          />
        </View>

        {/* Bio */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginBottom: 8 }}>Bio</Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: DS.colors.border,
              borderRadius: 12,
              padding: 12,
              fontSize: 14,
              color: DS.colors.text,
              backgroundColor: DS.colors.backgroundWhite,
              minHeight: 100,
              textAlignVertical: 'top',
            }}
            value={bio}
            onChangeText={(text) => {
              setBio(text);
              setHasChanges(true);
            }}
            multiline
            numberOfLines={4}
            placeholder="Tell restaurants about yourself..."
            placeholderTextColor={DS.colors.textLight}
          />
        </View>

        {/* Location */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginBottom: 8 }}>Location</Text>
          <TouchableOpacity
            style={{
              borderWidth: 1,
              borderColor: DS.colors.border,
              borderRadius: 12,
              padding: 12,
              fontSize: 14,
              backgroundColor: DS.colors.backgroundWhite,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            onPress={() => setShowLocationPicker(true)}
          >
            <Text style={{ 
              fontSize: 14, 
              color: location ? DS.colors.text : DS.colors.textLight,
              flex: 1,
            }}>
              {location || 'Select your city...'}
            </Text>
            <ChevronDown size={20} color={DS.colors.textLight} />
          </TouchableOpacity>
        </View>


        {/* Open to Collabs */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 16,
            backgroundColor: DS.colors.backgroundWhite,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: DS.colors.border,
            marginBottom: 24,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginBottom: 4 }}>
              Open to Collaborations
            </Text>
            <Text style={{ fontSize: 13, color: DS.colors.textLight }}>
              When enabled, restaurants can discover and invite you to campaigns
            </Text>
          </View>
          <Switch
            value={openToCollabs}
            onValueChange={(value) => {
              setOpenToCollabs(value);
              setHasChanges(true);
            }}
            trackColor={{ false: DS.colors.border, true: DS.colors.primary + '80' }}
            thumbColor={openToCollabs ? DS.colors.primary : '#f4f3f4'}
          />
        </View>

        {/* Availability Status */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginBottom: 4 }}>
            Availability
          </Text>
          <Text style={{ fontSize: 13, color: DS.colors.textLight, marginBottom: 12 }}>
            Let restaurants know if you're available for new campaigns
          </Text>

          <View style={{ gap: 12 }}>
            <TouchableOpacity
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: DS.colors.border,
                  backgroundColor: DS.colors.backgroundWhite,
                  gap: 12,
                },
                availabilityStatus === 'available' && {
                  borderColor: DS.colors.primary,
                  backgroundColor: '#FFFBEB',
                },
              ]}
              onPress={() => {
                setAvailabilityStatus('available');
                setHasChanges(true);
              }}
            >
              <View
                style={[
                  {
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: DS.colors.border,
                    marginTop: 2,
                  },
                  availabilityStatus === 'available' && {
                    borderColor: DS.colors.primary,
                    backgroundColor: DS.colors.primary,
                  },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: DS.colors.text, marginBottom: 2 }}>
                  Available
                </Text>
                <Text style={{ fontSize: 13, color: DS.colors.textLight }}>
                  Actively looking for campaigns
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: DS.colors.border,
                  backgroundColor: DS.colors.backgroundWhite,
                  gap: 12,
                },
                availabilityStatus === 'busy' && {
                  borderColor: DS.colors.primary,
                  backgroundColor: '#FFFBEB',
                },
              ]}
              onPress={() => {
                setAvailabilityStatus('busy');
                setHasChanges(true);
              }}
            >
              <View
                style={[
                  {
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: DS.colors.border,
                    marginTop: 2,
                  },
                  availabilityStatus === 'busy' && {
                    borderColor: DS.colors.primary,
                    backgroundColor: DS.colors.primary,
                  },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: DS.colors.text, marginBottom: 2 }}>
                  Busy
                </Text>
                <Text style={{ fontSize: 13, color: DS.colors.textLight }}>
                  Visible but may not respond quickly
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: DS.colors.border,
                  backgroundColor: DS.colors.backgroundWhite,
                  gap: 12,
                },
                availabilityStatus === 'not_accepting' && {
                  borderColor: DS.colors.primary,
                  backgroundColor: '#FFFBEB',
                },
              ]}
              onPress={() => {
                setAvailabilityStatus('not_accepting');
                setHasChanges(true);
              }}
            >
              <View
                style={[
                  {
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: DS.colors.border,
                    marginTop: 2,
                  },
                  availabilityStatus === 'not_accepting' && {
                    borderColor: DS.colors.primary,
                    backgroundColor: DS.colors.primary,
                  },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: DS.colors.text, marginBottom: 2 }}>
                  Not Accepting
                </Text>
                <Text style={{ fontSize: 13, color: DS.colors.textLight }}>
                  Hidden from browse, won't receive invites
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* CM-15: Portfolio Management Section */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text }}>Portfolio</Text>
            <Text style={{ fontSize: 13, color: DS.colors.textLight }}>{portfolioItems.length}/10 items</Text>
          </View>
          <Text style={{ fontSize: 13, color: DS.colors.textLight, marginBottom: 12 }}>
            Showcase your best food content to attract restaurants
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {portfolioItems.map((item) => {
              // Apply same intelligent detection logic as creatorDiscoveryService.ts
              // Videos might be stored in video_url OR image_url (Cloudinary videos)
              let videoUrl: string | undefined = undefined;
              let imageUrl: string | undefined = undefined;
              
              if (item.media_type === 'video') {
                // For videos, check both video_url and image_url (Cloudinary stores videos in image_url)
                videoUrl = item.video_url || item.image_url;
                
                // If video is in image_url (Cloudinary), reconstruct the video URL
                if (!item.video_url && item.image_url) {
                  const url = item.image_url.toLowerCase();
                  const isCloudinaryVideo = url.includes('/video/upload/');
                  
                  if (isCloudinaryVideo) {
                    try {
                      // Cloudinary URL structure: .../video/upload/{transformations}/v{version}/{public_id}.{ext}
                      // To get base video: .../video/upload/v{version}/{public_id}.mp4
                      const urlObj = new URL(item.image_url);
                      const pathParts = urlObj.pathname.split('/');
                      const uploadIndex = pathParts.findIndex(p => p === 'upload');
                      
                      if (uploadIndex >= 0) {
                        // Find version and filename
                        const versionIndex = pathParts.findIndex((p, i) => 
                          i > uploadIndex && /^v\d+$/.test(p)
                        );
                        
                        if (versionIndex >= 0 && versionIndex < pathParts.length - 1) {
                          // Reconstruct: /video/upload/v{version}/{filename}.mp4
                          const version = pathParts[versionIndex];
                          const fileName = pathParts[versionIndex + 1].replace(/\.(jpg|jpeg|png|gif)$/i, '.mp4');
                          const basePath = pathParts.slice(0, uploadIndex + 1).join('/');
                          videoUrl = `${urlObj.origin}${basePath}/${version}/${fileName}`;
                        } else {
                          // Fallback: simple replacement
                          videoUrl = item.image_url.replace(/\.(jpg|jpeg|png|gif)$/i, '.mp4');
                        }
                      } else {
                        // Fallback: simple replacement
                        videoUrl = item.image_url.replace(/\.(jpg|jpeg|png|gif)$/i, '.mp4');
                      }
                    } catch (e) {
                      // If URL parsing fails, try simple replacement
                      console.warn('[EditCreatorProfileScreen] Failed to parse Cloudinary video URL:', e);
                      videoUrl = item.image_url.replace(/\.(jpg|jpeg|png|gif)$/i, '.mp4');
                    }
                  } else {
                    // Not Cloudinary, use image_url as-is (might be direct video URL)
                    videoUrl = item.image_url;
                  }
                }
              } else {
                // For images, use image_url or thumbnail_url
                imageUrl = item.image_url || item.thumbnail_url;
              }
              
              return (
                <TouchableOpacity
                  key={item.id}
                  style={{ width: '31%', aspectRatio: 1, borderRadius: 8, overflow: 'hidden', position: 'relative' }}
                  onPress={() => {
                    if (item.media_type === 'video' && videoUrl) {
                      // Open video viewer
                      const videoUrls = portfolioItems
                        .filter(i => {
                          if (i.media_type !== 'video') return false;
                          return i.video_url || i.image_url;
                        })
                        .map(i => i.video_url || i.image_url!)
                        .filter(Boolean);
                      const videoIndex = videoUrls.findIndex(url => url === videoUrl);
                      setViewerInitialIndex(Math.max(0, videoIndex));
                      setVideoViewerVisible(true);
                    } else if (imageUrl) {
                      // Open image viewer
                      const imageUrls = portfolioItems
                        .filter(i => i.media_type === 'image' && (i.image_url || i.thumbnail_url))
                        .map(i => i.image_url || i.thumbnail_url!)
                        .filter(Boolean);
                      const imageIndex = imageUrls.findIndex(url => url === imageUrl);
                      setViewerInitialIndex(Math.max(0, imageIndex));
                      setImageViewerVisible(true);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  {item.media_type === 'video' && videoUrl ? (
                    <VideoThumbnail
                      videoUri={videoUrl}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <View style={{ width: '100%', height: '100%', backgroundColor: DS.colors.border }} />
                  )}
                  {item.media_type === 'video' && (
                    <View style={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      borderRadius: 12,
                      padding: 4,
                    }}>
                      <Play size={16} color="white" />
                    </View>
                  )}
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      borderRadius: 12,
                      padding: 4,
                    }}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleRemovePortfolioItem(item.id);
                    }}
                  >
                    <X size={16} color="white" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}

            {portfolioItems.length < 10 && (
              <TouchableOpacity
                style={{
                  width: '31%',
                  aspectRatio: 1,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: DS.colors.border,
                  borderStyle: 'dashed',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: DS.colors.background,
                }}
                onPress={handleAddPortfolioItem}
                disabled={uploadingPortfolio}
              >
                {uploadingPortfolio ? (
                  <ActivityIndicator size="small" color={DS.colors.primary} />
                ) : (
                  <>
                    <Plus size={24} color={DS.colors.primary} />
                    <Text style={{ fontSize: 11, color: DS.colors.primary, marginTop: 4 }}>Add Image</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Image Viewer */}
      <ImageViewer
        visible={imageViewerVisible}
        images={portfolioItems
          .filter(item => item.media_type === 'image' && (item.image_url || item.thumbnail_url))
          .map(item => item.image_url || item.thumbnail_url!)
          .filter(Boolean) as string[]}
        initialIndex={viewerInitialIndex}
        onClose={() => setImageViewerVisible(false)}
      />

      {/* Video Viewer */}
      <VideoViewer
        visible={videoViewerVisible}
        videos={portfolioItems
          .filter(item => item.media_type === 'video' && (item.video_url || item.image_url))
          .map(item => {
            // Apply same Cloudinary URL reconstruction logic
            if (item.video_url) return item.video_url;
            if (!item.image_url) return '';
            
            const url = item.image_url.toLowerCase();
            const isCloudinaryVideo = url.includes('/video/upload/');
            
            if (isCloudinaryVideo) {
              try {
                const urlObj = new URL(item.image_url);
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
                    return `${urlObj.origin}${basePath}/${version}/${fileName}`;
                  }
                }
                return item.image_url.replace(/\.(jpg|jpeg|png|gif)$/i, '.mp4');
              } catch (e) {
                return item.image_url.replace(/\.(jpg|jpeg|png|gif)$/i, '.mp4');
              }
            }
            return item.image_url;
          })
          .filter(Boolean) as string[]}
        initialIndex={viewerInitialIndex}
        onClose={() => setVideoViewerVisible(false)}
      />

      {/* Location Picker Modal */}
      <Modal
        visible={showLocationPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        }}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setShowLocationPicker(false)}
          />
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '80%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E5E5',
            }}>
              <Text style={{ 
                fontSize: 18, 
                fontWeight: '600', 
                color: '#171717',
                fontFamily: 'Inter_600SemiBold',
              }}>
                Select City
              </Text>
              <TouchableOpacity 
                onPress={() => setShowLocationPicker(false)}
                style={{ padding: 4 }}
              >
                <X size={24} color="#171717" />
              </TouchableOpacity>
            </View>

            {/* City List */}
            <ScrollView 
              style={{ maxHeight: 500 }}
              showsVerticalScrollIndicator={true}
            >
              {MAJOR_CITIES.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F0F0F0',
                    backgroundColor: location === city ? '#FFAD2720' : '#FFFFFF',
                  }}
                  onPress={() => {
                    setLocation(city);
                    setHasChanges(true);
                    setShowLocationPicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ 
                    fontSize: 16, 
                    color: '#171717',
                    fontWeight: location === city ? '600' : '400',
                    fontFamily: location === city ? 'Inter_600SemiBold' : 'Inter_400Regular',
                  }}>
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

