import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Lock, Globe, MapPin, Calendar } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { Board } from '@/types/board';

interface BoardCardProps {
  board: Board;
  onPress?: () => void;
}

export const BoardCard: React.FC<BoardCardProps> = ({ board, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {board.cover_image_url ? (
        <Image source={{ uri: board.cover_image_url }} style={styles.coverImage} />
      ) : (
        <View style={styles.placeholderImage}>
          <Text style={styles.placeholderEmoji}>📋</Text>
        </View>
      )}
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{board.title}</Text>
          <View style={styles.privacyBadge}>
            {(board.is_private || board.type === 'private') ? (
              <Lock size={14} color="#666" />
            ) : (
              <Globe size={14} color="#666" />
            )}
          </View>
        </View>
        
        {board.description && (
          <Text style={styles.description} numberOfLines={2}>
            {board.description}
          </Text>
        )}
        
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaCount}>{board.restaurant_count || 0}</Text>
            <Text style={styles.metaLabel}>restaurants</Text>
          </View>
          
          {board.location && (
            <View style={styles.metaItem}>
              <MapPin size={12} color="#999" />
              <Text style={styles.metaLabel}>{board.location}</Text>
            </View>
          )}
          
          {board.category && (
            <View style={styles.metaItem}>
              <Text style={styles.categoryLabel}>{board.category}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  coverImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#F0F0F0',
  },
  placeholderImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 40,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    flex: 1,
  },
  privacyBadge: {
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaCount: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.primary,
  },
  metaLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#999',
  },
  categoryLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
});