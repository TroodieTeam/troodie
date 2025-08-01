import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Lock, Globe, MapPin, Calendar } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { designTokens } from '@/constants/designTokens';
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
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={1}>{board.title}</Text>
          {(board.is_private || board.type === 'private') ? (
            <Lock size={12} color={designTokens.colors.textLight} />
          ) : (
            <Globe size={12} color={designTokens.colors.textLight} />
          )}
        </View>
        
        <View style={styles.bottomRow}>
          <Text style={styles.metaText}>
            {board.restaurant_count || 0} places
          </Text>
          {board.location && (
            <>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.metaText}>{board.location}</Text>
            </>
          )}
          {board.category && (
            <>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.categoryText}>{board.category}</Text>
            </>
          )}
        </View>
        
        {board.description && (
          <Text style={styles.description} numberOfLines={1}>
            {board.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.sm,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
  },
  coverImage: {
    width: 64,
    height: 64,
    backgroundColor: designTokens.colors.backgroundGray,
  },
  placeholderImage: {
    width: 64,
    height: 64,
    backgroundColor: designTokens.colors.backgroundGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    padding: 8,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    flex: 1,
    marginRight: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  metaText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.primaryOrange,
  },
  dot: {
    fontSize: 11,
    color: designTokens.colors.textLight,
    marginHorizontal: 4,
  },
  description: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textLight,
    marginTop: 2,
  },
});