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

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Check, Clock, Plus, Lightbulb, Play } from 'lucide-react-native';
import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { useCreatorProfile } from '@/hooks/useCreatorProfileId';
import {
  updateCreatorProfile,
  toggleOpenToCollabs,
  CreatorProfile,
} from '@/services/creatorDiscoveryService';
import { uploadPortfolioImage } from '@/services/portfolioImageService';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';

export default function EditCreatorProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { creatorProfile, loading: profileLoading } = useCreatorProfile();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [newSpecialty, setNewSpecialty] = useState('');
  const [openToCollabs, setOpenToCollabs] = useState(true);
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'busy' | 'not_accepting'>('available');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // CM-15: Portfolio management
  const [portfolioItems, setPortfolioItems] = useState<Array<{ id: string; media_url: string; media_type: string }>>([]);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);

  useEffect(() => {
    if (creatorProfile) {
      setDisplayName(creatorProfile.display_name || '');
      setBio(creatorProfile.bio || '');
      setLocation(creatorProfile.location || '');
      setSpecialties(creatorProfile.specialties || []);
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
      const { data } = await supabase
        .from('creator_portfolio_items')
        .select('id, media_url, video_url, media_type, display_order')
        .eq('creator_profile_id', creatorProfile.id)
        .order('display_order');
      
      if (data) {
        setPortfolioItems(data.map(item => ({
          id: item.id,
          media_url: item.media_url || item.video_url || '',
          media_type: item.media_type || 'image',
        })));
      }
    } catch (error) {
      console.error('Error loading portfolio items:', error);
    }
  };

  // CM-15: Add portfolio item
  const handleAddPortfolioItem = async () => {
    if (!creatorProfile?.id || !user?.id) return;
    
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

      setUploadingPortfolio(true);
      const imageId = `portfolio-${Date.now()}`;
      
      // Upload to storage
      const uploadResult = await uploadPortfolioImage(
        user.id,
        result.assets[0].uri,
        imageId
      );

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      // Add to database
      const { data, error } = await supabase
        .from('creator_portfolio_items')
        .insert({
          creator_profile_id: creatorProfile.id,
          media_url: uploadResult.url,
          media_type: 'image',
          display_order: portfolioItems.length,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setPortfolioItems([...portfolioItems, {
          id: data.id,
          media_url: data.media_url || data.video_url || '',
          media_type: data.media_type || 'image',
        }]);
        setHasChanges(true);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload image');
    } finally {
      setUploadingPortfolio(false);
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
      { field: 'specialties', label: 'Specialties', isArray: true },
      { field: 'portfolioItems', label: 'Portfolio images', isArray: true, min: 3 },
    ];

    const missing: string[] = [];
    let completed = 0;

    for (const check of checks) {
      const value = check.field === 'displayName' ? displayName :
                   check.field === 'bio' ? bio :
                   check.field === 'location' ? location :
                   check.field === 'specialties' ? specialties :
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

  const handleSave = async () => {
    if (!creatorProfile?.id) return;

    setSaving(true);
    const result = await updateCreatorProfile(creatorProfile.id, {
      displayName: displayName || undefined,
      bio: bio || undefined,
      location: location || undefined,
      specialties: specialties,
      openToCollabs: openToCollabs,
      availabilityStatus: availabilityStatus,
    });

    if (result.success) {
      Alert.alert('Success', 'Profile updated!', [{ text: 'OK', onPress: () => router.back() }]);
    } else {
      Alert.alert('Error', result.error || 'Failed to update profile');
    }
    setSaving(false);
  };

  const handleBack = () => {
    if (hasChanges) {
      Alert.alert('Discard Changes?', 'You have unsaved changes.', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  const addSpecialty = () => {
    if (newSpecialty.trim() && !specialties.includes(newSpecialty.trim())) {
      setSpecialties([...specialties, newSpecialty.trim()]);
      setNewSpecialty('');
      setHasChanges(true);
    }
  };

  const removeSpecialty = (index: number) => {
    setSpecialties(specialties.filter((_, i) => i !== index));
    setHasChanges(true);
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
          <TouchableOpacity onPress={() => router.back()}>
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
          disabled={saving}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: hasChanges ? DS.colors.primary : DS.colors.border,
          }}
        >
          <Text style={{ color: hasChanges ? 'white' : DS.colors.textLight, fontWeight: '600' }}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
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
            <Text style={{ fontSize: 13, color: '#78350F', lineHeight: 18 }}>• Add specialties that match your food content</Text>
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
            value={location}
            onChangeText={(text) => {
              setLocation(text);
              setHasChanges(true);
            }}
            placeholder="City, State (e.g., Charlotte, NC)"
            placeholderTextColor={DS.colors.textLight}
          />
        </View>

        {/* Specialties */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginBottom: 8 }}>Specialties</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <TextInput
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: DS.colors.border,
                borderRadius: 12,
                padding: 12,
                fontSize: 14,
                color: DS.colors.text,
                backgroundColor: DS.colors.backgroundWhite,
              }}
              value={newSpecialty}
              onChangeText={setNewSpecialty}
              placeholder="Add specialty..."
              placeholderTextColor={DS.colors.textLight}
              onSubmitEditing={addSpecialty}
            />
            <TouchableOpacity
              onPress={addSpecialty}
              style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: DS.colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Check size={20} color="white" />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {specialties.map((specialty, index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: DS.colors.primary + '20',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                }}
              >
                <Text style={{ fontSize: 13, color: DS.colors.text, marginRight: 8 }}>{specialty}</Text>
                <TouchableOpacity
                  onPress={() => removeSpecialty(index)}
                  style={{ marginLeft: 4 }}
                >
                  <X size={14} color={DS.colors.textLight} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
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
            <Text style={{ fontSize: 13, color: DS.colors.textLight }}>{portfolioItems.length}/10 images</Text>
          </View>
          <Text style={{ fontSize: 13, color: DS.colors.textLight, marginBottom: 12 }}>
            Showcase your best food content to attract restaurants
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {portfolioItems.map((item) => (
              <View key={item.id} style={{ width: '31%', aspectRatio: 1, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                <Image source={{ uri: item.media_url }} style={{ width: '100%', height: '100%' }} />
                {item.media_type === 'video' && (
                  <View style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
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
                  onPress={() => handleRemovePortfolioItem(item.id)}
                >
                  <X size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}

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
    </SafeAreaView>
  );
}

