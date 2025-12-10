import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { User, Crown } from 'lucide-react-native';
import { DS } from '@/components/design-system/tokens';
import { useRouter } from 'expo-router';

interface TopSaver {
  id: string;
  username: string;
  avatarUrl: string | null;
  isCreator: boolean;
  saveCount: number;
}

interface TopSaversListProps {
  savers: TopSaver[];
}

export function TopSaversList({ savers }: TopSaversListProps) {
  const router = useRouter();

  if (!savers || savers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No savers yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {savers.map((saver, index) => (
        <TouchableOpacity
          key={saver.id}
          style={styles.saverRow}
          onPress={() => router.push(`/user/${saver.id}`)}
        >
          <View style={styles.rankContainer}>
            {index === 0 ? (
              <Crown size={16} color="#FFAD27" />
            ) : (
              <Text style={styles.rank}>#{index + 1}</Text>
            )}
          </View>
          {saver.avatarUrl ? (
            <Image source={{ uri: saver.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <User size={20} color={DS.colors.textLight} />
            </View>
          )}
          <View style={styles.saverInfo}>
            <View style={styles.saverHeader}>
              <Text style={styles.username}>{saver.username}</Text>
              {saver.isCreator && (
                <View style={styles.creatorBadge}>
                  <Text style={styles.creatorBadgeText}>Creator</Text>
                </View>
              )}
            </View>
            <Text style={styles.saveCount}>{saver.saveCount} saves</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: DS.colors.backgroundWhite,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: DS.colors.border,
  },
  saverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.border,
  },
  rankContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  rank: {
    fontSize: 14,
    fontWeight: '600',
    color: DS.colors.textLight,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  saverInfo: {
    flex: 1,
  },
  saverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.colors.text,
    marginRight: 8,
  },
  creatorBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  creatorBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
  },
  saveCount: {
    fontSize: 13,
    color: DS.colors.textLight,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: DS.colors.textLight,
  },
});

