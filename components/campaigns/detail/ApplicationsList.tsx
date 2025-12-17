import { DS } from '@/components/design-system/tokens';
import { CampaignApplication } from '@/types/campaign';
import { Star, Users } from 'lucide-react-native';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

interface ApplicationsListProps {
  applications: CampaignApplication[];
  onAction: (applicationId: string, action: 'accepted' | 'rejected') => void;
  onOpenRating: (applicationId: string) => void;
}

export const ApplicationsList: React.FC<ApplicationsListProps> = ({ applications, onAction, onOpenRating }) => {
  return (
    <View style={{ gap: DS.spacing.md }}>
      {applications.length === 0 ? (
        <View style={{ alignItems: 'center', padding: DS.spacing.xxl }}>
          <Users size={48} color={DS.colors.textLight} />
          <Text style={{ ...DS.typography.h3, marginTop: DS.spacing.md, color: DS.colors.textGray }}>No Applications Yet</Text>
        </View>
      ) : (
        applications.map((app) => (
          <View key={app.id} style={{
            backgroundColor: DS.colors.surface,
            borderRadius: DS.borderRadius.lg,
            padding: DS.spacing.lg,
            borderWidth: 1,
            borderColor: DS.colors.border,
            ...DS.shadows.sm
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: DS.spacing.md }}>
              <Image 
                source={{ uri: app.creator_profiles.avatar_url }} 
                style={{ width: 48, height: 48, borderRadius: DS.borderRadius.full, marginRight: DS.spacing.md, backgroundColor: DS.colors.surfaceLight }} 
              />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ ...DS.typography.h3, color: DS.colors.textDark }}>{app.creator_profiles.display_name}</Text>
                  <View style={{ 
                    backgroundColor: app.status === 'pending' ? '#FEF3C7' : app.status === 'accepted' ? '#DCFCE7' : '#F3F4F6',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: DS.borderRadius.full
                  }}>
                    <Text style={{ ...DS.typography.caption, fontWeight: '700', color: app.status === 'pending' ? '#D97706' : app.status === 'accepted' ? '#16A34A' : DS.colors.textGray, textTransform: 'uppercase' }}>
                      {app.status}
                    </Text>
                  </View>
                </View>
                <Text style={{ ...DS.typography.body, color: DS.colors.textGray }}>{app.creator_profiles.followers_count.toLocaleString()} followers</Text>
              </View>
            </View>

            {app.cover_letter && (
              <View style={{ backgroundColor: DS.colors.surfaceLight, padding: DS.spacing.md, borderRadius: DS.borderRadius.md, marginBottom: DS.spacing.md }}>
                <Text style={{ ...DS.typography.caption, color: DS.colors.textGray, marginBottom: 4 }}>Cover Letter</Text>
                <Text style={{ ...DS.typography.body, color: DS.colors.textDark }}>"{app.cover_letter}"</Text>
              </View>
            )}

            {app.status === 'pending' && (
              <View style={{ flexDirection: 'row', gap: DS.spacing.md }}>
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: DS.colors.surface, borderWidth: 1, borderColor: DS.colors.error, padding: DS.spacing.sm, borderRadius: DS.borderRadius.md, alignItems: 'center' }}
                  onPress={() => onAction(app.id, 'rejected')}
                >
                  <Text style={{ ...DS.typography.button, color: DS.colors.error }}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: DS.colors.success, padding: DS.spacing.sm, borderRadius: DS.borderRadius.md, alignItems: 'center' }}
                  onPress={() => onAction(app.id, 'accepted')}
                >
                  <Text style={{ ...DS.typography.button, color: 'white' }}>Accept</Text>
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
            
            {app.rating && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: DS.spacing.xs }}>
                <Star size={16} color={DS.colors.primaryOrange} fill={DS.colors.primaryOrange} style={{ marginRight: 6 }} />
                <Text style={{ ...DS.typography.body, fontWeight: '600', color: DS.colors.textDark }}>Rated {app.rating}/5</Text>
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );
};
