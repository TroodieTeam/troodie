import { DS } from '@/components/design-system/tokens';
import { CampaignApplication } from '@/types/campaign';
import { useRouter } from 'expo-router';
import { ChevronRight, Instagram, MapPin, Star, TrendingUp, Users } from 'lucide-react-native';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

interface ApplicationsListProps {
  applications: CampaignApplication[];
  onAction: (applicationId: string, action: 'accepted' | 'rejected') => void;
  onOpenRating: (applicationId: string) => void;
}

export const ApplicationsList: React.FC<ApplicationsListProps> = ({ applications, onAction, onOpenRating }) => {
  const router = useRouter();

  return (
    <View testID="applications-list" style={{ gap: DS.spacing.md }}>
      {applications.length === 0 ? (
        <View style={{ alignItems: 'center', padding: DS.spacing.xxl }}>
          <Users size={48} color={DS.colors.textLight} />
          <Text style={{ ...DS.typography.h3, marginTop: DS.spacing.md, color: DS.colors.textGray }}>No Applications Yet</Text>
        </View>
      ) : (
        applications.map((app) => {
          const cp = app.creator_profiles;
          const userData = cp.users;

          // Fallback chain: display_name (if not "Creator") → users.name → users.username → "Unknown Creator"
          const isDefaultName = !cp.display_name || cp.display_name === 'Creator' || cp.display_name === 'Unknown Creator';
          const creatorName = isDefaultName
            ? (userData?.name || userData?.username || 'Unknown Creator')
            : cp.display_name;

          const creatorUsername = userData?.username || '';
          const showUsername = creatorUsername && creatorName !== creatorUsername;

          // Prefer user avatar over creator_profiles avatar
          const avatarUrl = userData?.avatar_url || cp.avatar_url;
          const engagementRate = cp.troodie_engagement_rate ? parseFloat(String(cp.troodie_engagement_rate)) : null;

          return (
          <View key={app.id} testID={`application-card-${app.id}`} style={{
            backgroundColor: DS.colors.surface,
            borderRadius: DS.borderRadius.lg,
            borderWidth: 1,
            borderColor: DS.colors.border,
            overflow: 'hidden',
            ...DS.shadows.sm,
          }}>
            {/* Tappable creator header → navigates to profile */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push(`/creator/${cp.id}`)}
              style={{ padding: DS.spacing.lg, paddingBottom: DS.spacing.md }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* Avatar */}
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={{ width: 52, height: 52, borderRadius: 26, marginRight: DS.spacing.md, backgroundColor: DS.colors.surfaceLight }}
                  />
                ) : (
                  <View style={{
                    width: 52, height: 52, borderRadius: 26, marginRight: DS.spacing.md,
                    backgroundColor: DS.colors.primaryOrange, justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: 'white' }}>
                      {creatorName[0]?.toUpperCase() || '?'}
                    </Text>
                  </View>
                )}

                {/* Name + username + location */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                    <Text style={{ ...DS.typography.h3, color: DS.colors.textDark, flex: 1 }} numberOfLines={1}>
                      {creatorName}
                    </Text>
                    <ChevronRight size={18} color={DS.colors.textLight} />
                  </View>
                  {showUsername ? (
                    <Text style={{ ...DS.typography.caption, color: DS.colors.textGray, marginBottom: 2 }}>@{creatorUsername}</Text>
                  ) : null}
                  {cp.location ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MapPin size={12} color={DS.colors.textLight} />
                      <Text style={{ ...DS.typography.caption, color: DS.colors.textGray, marginLeft: 3 }} numberOfLines={1}>{cp.location}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Stats row */}
              <View style={{
                flexDirection: 'row',
                marginTop: DS.spacing.md,
                paddingTop: DS.spacing.sm,
                borderTopWidth: 1,
                borderTopColor: DS.colors.borderLight,
                gap: DS.spacing.lg,
              }}>
                {engagementRate !== null && engagementRate > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TrendingUp size={13} color={DS.colors.textLight} />
                    <Text style={{ ...DS.typography.caption, fontWeight: '600', color: DS.colors.textDark, marginLeft: 4 }}>
                      {engagementRate.toFixed(1)}%
                    </Text>
                    <Text style={{ ...DS.typography.caption, color: DS.colors.textGray, marginLeft: 2 }}>engagement</Text>
                  </View>
                ) : null}
                {cp.instagram_handle ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Instagram size={13} color="#E4405F" />
                    <Text style={{ ...DS.typography.caption, color: DS.colors.textGray, marginLeft: 4 }} numberOfLines={1}>
                      {cp.instagram_handle}
                    </Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>

            {/* Status badge */}
            <View style={{
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              paddingHorizontal: DS.spacing.lg, paddingBottom: DS.spacing.sm,
            }}>
              <View style={{
                backgroundColor: app.status === 'pending' ? '#FEF3C7' : app.status === 'accepted' ? '#DCFCE7' : app.status === 'rejected' ? '#FEE2E2' : '#F3F4F6',
                paddingHorizontal: 10, paddingVertical: 3, borderRadius: DS.borderRadius.full,
              }}>
                <Text style={{
                  ...DS.typography.caption, fontWeight: '700', textTransform: 'uppercase',
                  color: app.status === 'pending' ? '#D97706' : app.status === 'accepted' ? '#16A34A' : app.status === 'rejected' ? '#DC2626' : DS.colors.textGray,
                }}>
                  {app.status}
                </Text>
              </View>
              <Text style={{ ...DS.typography.caption, color: DS.colors.textLight }}>
                {new Date(app.applied_at).toLocaleDateString()}
              </Text>
            </View>

            {/* Cover letter */}
            {app.cover_letter ? (
              <View style={{ backgroundColor: DS.colors.surfaceLight, padding: DS.spacing.md, marginHorizontal: DS.spacing.lg, borderRadius: DS.borderRadius.md, marginBottom: DS.spacing.md }}>
                <Text style={{ ...DS.typography.caption, color: DS.colors.textGray, marginBottom: 4 }}>Cover Letter</Text>
                <Text style={{ ...DS.typography.body, color: DS.colors.textDark }} numberOfLines={4}>"{app.cover_letter}"</Text>
              </View>
            ) : null}

            {/* Action buttons */}
            <View style={{ paddingHorizontal: DS.spacing.lg, paddingBottom: DS.spacing.lg }}>
              {app.status === 'pending' && (
                <View style={{ flexDirection: 'row', gap: DS.spacing.md }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: DS.colors.surface, borderWidth: 1, borderColor: DS.colors.error, padding: DS.spacing.sm, borderRadius: DS.borderRadius.md, alignItems: 'center' }}
                    onPress={() => onAction(app.id, 'rejected')}
                  >
                    <Text testID="reject-button" style={{ ...DS.typography.button, color: DS.colors.error }}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: DS.colors.success, padding: DS.spacing.sm, borderRadius: DS.borderRadius.md, alignItems: 'center' }}
                    onPress={() => onAction(app.id, 'accepted')}
                  >
                    <Text testID="accept-button" style={{ ...DS.typography.button, color: 'white' }}>Accept</Text>
                  </TouchableOpacity>
                </View>
              )}

              {app.status === 'accepted' && !app.rating && (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: DS.spacing.sm, backgroundColor: '#FFF7ED', borderRadius: DS.borderRadius.md, borderWidth: 1, borderColor: '#FFEDD5' }}
                  onPress={() => onOpenRating(app.id)}
                >
                  <Star size={16} color={DS.colors.primaryOrange} fill={DS.colors.primaryOrange} style={{ marginRight: 8 }} />
                  <Text style={{ ...DS.typography.button, color: DS.colors.primaryOrange }}>Rate Creator</Text>
                </TouchableOpacity>
              )}

              {app.rating ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: app.status === 'accepted' && !app.rating ? DS.spacing.xs : 0 }}>
                  <Star size={16} color={DS.colors.primaryOrange} fill={DS.colors.primaryOrange} style={{ marginRight: 6 }} />
                  <Text style={{ ...DS.typography.body, fontWeight: '600', color: DS.colors.textDark }}>Rated {app.rating}/5</Text>
                </View>
              ) : null}
            </View>
          </View>
          );
        })
      )}
    </View>
  );
};
