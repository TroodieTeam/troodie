import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Users, TrendingUp } from 'lucide-react-native';
import { DS } from '@/components/design-system/tokens';
import type { CreatorProfile } from '@/services/creatorDiscoveryService';
import { formatFollowers } from '@/services/creatorDiscoveryService';

interface CreatorCardProps {
  creator: CreatorProfile;
  onPress: () => void;
}

export function CreatorCard({ creator, onPress }: CreatorCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Sample Post Preview */}
      {creator.samplePosts[0] && (
        <Image source={{ uri: creator.samplePosts[0].imageUrl }} style={styles.samplePost} />
      )}

      {/* Profile Info Overlay */}
      <View style={styles.overlay}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {creator.avatarUrl ? (
            <Image source={{ uri: creator.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{creator.displayName[0]?.toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* Open to Collabs Badge */}
        {creator.openToCollabs && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Open to Collabs</Text>
          </View>
        )}

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {creator.displayName}
          </Text>
          {creator.location && (
            <Text style={styles.location} numberOfLines={1}>
              {creator.location}
            </Text>
          )}

          {/* Metrics */}
          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Users size={12} color={DS.colors.textLight} />
              <Text style={styles.metricText}>{formatFollowers(creator.totalFollowers)}</Text>
            </View>
            <View style={styles.metric}>
              <TrendingUp size={12} color={DS.colors.textLight} />
              <Text style={styles.metricText}>{creator.engagementRate.toFixed(1)}%</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: DS.colors.backgroundWhite,
    borderWidth: 1,
    borderColor: DS.colors.border,
    minHeight: 200,
  },
  samplePost: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  overlay: {
    padding: 12,
    backgroundColor: DS.colors.backgroundWhite,
  },
  avatarContainer: {
    position: 'absolute',
    top: -20,
    left: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: DS.colors.backgroundWhite,
  },
  avatarPlaceholder: {
    backgroundColor: DS.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    alignSelf: 'flex-end',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
  },
  info: {
    marginTop: 24,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.colors.text,
    marginBottom: 4,
  },
  location: {
    fontSize: 12,
    color: DS.colors.textLight,
    marginBottom: 8,
  },
  metrics: {
    flexDirection: 'row',
    gap: 12,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 12,
    color: DS.colors.textLight,
  },
});

