/**
 * Creator Profile Screen
 * 
 * Displays comprehensive creator profile including:
 * - Bio and location
 * - Social metrics (followers, engagement rate)
 * - Sample posts
 * - Availability status
 * - Specialties
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Users, TrendingUp, MapPin, Edit, Clock, XCircle, Briefcase, Star, Play } from 'lucide-react-native';
import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { getCreatorProfile, CreatorProfile } from '@/services/creatorDiscoveryService';
import { formatFollowers } from '@/services/creatorDiscoveryService';

export default function CreatorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadProfile();
    }
  }, [id]);

  const loadProfile = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await getCreatorProfile(id);
      if (data) {
        setProfile(data);
      } else {
        console.error('Error loading profile:', error);
        // Try loading by user_id if id might be a user_id
        if (error && error.includes('not found')) {
          const { data: dataByUserId, error: userIdError } = await getCreatorProfile(id, true);
          if (dataByUserId) {
            setProfile(dataByUserId);
          } else {
            console.error('Error loading profile by user_id:', userIdError);
          }
        }
      }
    } catch (err) {
      console.error('Error loading creator profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const isOwnProfile = profile?.userId === user?.id;

  // CM-14: Calculate estimated rate based on followers
  const getEstimatedRate = (followers: number): string => {
    if (followers < 5000) return '$50 - $200';
    if (followers < 10000) return '$200 - $500';
    if (followers < 50000) return '$500 - $1,000';
    return '$1,000+';
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={DS.colors.primary} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
        <View style={{ padding: 16 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={DS.colors.text} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 16, color: DS.colors.textLight }}>Creator not found</Text>
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
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={DS.colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '600', color: DS.colors.text }}>Creator Profile</Text>
        {isOwnProfile && (
          <TouchableOpacity onPress={() => router.push(`/creator/profile/edit`)}>
            <Edit size={24} color={DS.colors.primary} />
          </TouchableOpacity>
        )}
        {!isOwnProfile && <View style={{ width: 24 }} />}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Profile Header */}
        <View style={{ alignItems: 'center', padding: 24, backgroundColor: DS.colors.backgroundWhite }}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={{ width: 100, height: 100, borderRadius: 50 }} />
          ) : (
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: DS.colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 36, fontWeight: '600', color: 'white' }}>
                {profile.displayName[0]?.toUpperCase()}
              </Text>
            </View>
          )}

          <Text style={{ fontSize: 24, fontWeight: '700', color: DS.colors.text, marginTop: 16 }}>
            {profile.displayName}
          </Text>
          
          {/* CM-14: Username */}
          {profile.username && (
            <Text style={{ fontSize: 14, color: DS.colors.textLight, marginTop: 4 }}>@{profile.username}</Text>
          )}

          {profile.location && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <MapPin size={16} color={DS.colors.textLight} />
              <Text style={{ fontSize: 14, color: DS.colors.textLight, marginLeft: 4 }}>{profile.location}</Text>
            </View>
          )}

          {/* Availability Badge - CM-11 */}
          {profile.availabilityStatus === 'busy' && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FEF3C7',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 16,
                marginTop: 12,
                gap: 6,
              }}
            >
              <Clock size={12} color="#92400E" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400E' }}>Currently Busy</Text>
            </View>
          )}
          {profile.availabilityStatus === 'not_accepting' && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FEE2E2',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 16,
                marginTop: 12,
                gap: 6,
              }}
            >
              <XCircle size={12} color="#DC2626" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#DC2626' }}>Not Accepting Work</Text>
            </View>
          )}

          {/* Open to Collabs Badge */}
          {profile.openToCollabs && (
            <View
              style={{
                backgroundColor: '#FEF3C7',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                marginTop: 12,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400E' }}>Open to Collabs</Text>
            </View>
          )}

          {/* Metrics - CM-14: 4 items */}
          <View style={{ flexDirection: 'row', marginTop: 24, gap: 16, justifyContent: 'space-around', width: '100%' }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Users size={20} color={DS.colors.primary} />
              <Text style={{ fontSize: 18, fontWeight: '700', color: DS.colors.text, marginTop: 4 }}>
                {formatFollowers(profile.totalFollowers)}
              </Text>
              <Text style={{ fontSize: 12, color: DS.colors.textLight }}>Followers</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <TrendingUp size={20} color={DS.colors.primary} />
              <Text style={{ fontSize: 18, fontWeight: '700', color: DS.colors.text, marginTop: 4 }}>
                {profile.engagementRate.toFixed(1)}%
              </Text>
              <Text style={{ fontSize: 12, color: DS.colors.textLight }}>Engagement</Text>
            </View>
            {/* CM-14: Completed Campaigns */}
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Briefcase size={20} color={DS.colors.primary} />
              <Text style={{ fontSize: 18, fontWeight: '700', color: DS.colors.text, marginTop: 4 }}>
                {profile.completedCampaigns || 0}
              </Text>
              <Text style={{ fontSize: 12, color: DS.colors.textLight }}>Campaigns</Text>
            </View>
            {/* CM-14: Rating */}
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Star size={20} color={DS.colors.primary} />
              <Text style={{ fontSize: 18, fontWeight: '700', color: DS.colors.text, marginTop: 4 }}>
                {profile.avgRating ? profile.avgRating.toFixed(1) : '—'}
              </Text>
              <Text style={{ fontSize: 12, color: DS.colors.textLight }}>Rating</Text>
            </View>
          </View>

          {/* CM-14: Estimated Rate Card */}
          <View style={{
            backgroundColor: '#F0FDF4',
            padding: 16,
            marginTop: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#BBF7D0',
            width: '100%',
          }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#166534', marginBottom: 4 }}>
              Estimated Rate
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#15803D' }}>
              {getEstimatedRate(profile.totalFollowers)}
            </Text>
            <Text style={{ fontSize: 11, color: '#166534', marginTop: 4 }}>
              Based on follower count
            </Text>
          </View>
        </View>

        {/* Bio - CM-14: Empty state */}
        <View style={{ padding: 16, backgroundColor: DS.colors.backgroundWhite, marginTop: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginBottom: 8 }}>About</Text>
          {profile.bio ? (
            <Text style={{ fontSize: 14, color: DS.colors.text, lineHeight: 20 }}>{profile.bio}</Text>
          ) : (
            <Text style={{ fontSize: 14, color: DS.colors.textLight, fontStyle: 'italic' }}>No bio provided</Text>
          )}
        </View>

        {/* Specialties - CM-14: Empty state */}
        <View style={{ padding: 16, backgroundColor: DS.colors.backgroundWhite, marginTop: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginBottom: 12 }}>Specialties</Text>
          {profile.specialties && profile.specialties.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {profile.specialties.map((specialty, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: DS.colors.primary + '20',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                  }}
                >
                  <Text style={{ fontSize: 13, color: DS.colors.text }}>{specialty}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 14, color: DS.colors.textLight, fontStyle: 'italic' }}>No specialties set</Text>
          )}
        </View>

        {/* CM-14: Portfolio Section */}
        {profile.portfolioItems && profile.portfolioItems.length > 0 && (
          <View style={{ padding: 16, backgroundColor: DS.colors.backgroundWhite, marginTop: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginBottom: 12 }}>
              Portfolio
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {profile.portfolioItems.map((item) => (
                <TouchableOpacity key={item.id} style={{ width: '31%', aspectRatio: 1, position: 'relative' }}>
                  <Image source={{ uri: item.mediaUrl }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                  {item.mediaType === 'video' && (
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
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Sample Posts - CM-14: Empty state */}
        <View style={{ padding: 16, backgroundColor: DS.colors.backgroundWhite, marginTop: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginBottom: 12 }}>
            Sample Posts
          </Text>
          {profile.samplePosts && profile.samplePosts.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {profile.samplePosts.map((post) => (
                <TouchableOpacity
                  key={post.postId}
                  onPress={() => router.push(`/post/${post.postId}`)}
                  style={{ width: '31%', aspectRatio: 1 }}
                >
                  <Image source={{ uri: post.imageUrl }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 14, color: DS.colors.textLight, fontStyle: 'italic' }}>No posts yet</Text>
          )}
        </View>

        {/* CM-14: CTA Button - Placeholder for future */}
        {!isOwnProfile && (
          <View style={{
            padding: 16,
            backgroundColor: DS.colors.backgroundWhite,
            borderTopWidth: 1,
            borderTopColor: DS.colors.border,
            marginTop: 8,
          }}>
            <TouchableOpacity
              style={{
                backgroundColor: DS.colors.primary,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
              }}
              onPress={() => {
                Alert.alert('Coming Soon', 'Invite to Campaign feature coming soon!');
              }}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Invite to Campaign</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

