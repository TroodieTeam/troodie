import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { designTokens } from '@/constants/designTokens';

interface ExternalContentPreviewProps {
  source?: string;
  url?: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  author?: string;
  compact?: boolean;
}

export const ExternalContentPreview: React.FC<ExternalContentPreviewProps> = ({
  source,
  url,
  title,
  description,
  thumbnail,
  author,
  compact = false
}) => {
  const getSourceIcon = (source?: string) => {
    switch (source) {
      case 'tiktok':
        return { name: 'logo-tiktok' as const, color: '#000000' };
      case 'instagram':
        return { name: 'logo-instagram' as const, color: '#E4405F' };
      case 'youtube':
        return { name: 'logo-youtube' as const, color: '#FF0000' };
      case 'twitter':
        return { name: 'logo-twitter' as const, color: '#1DA1F2' };
      default:
        return { name: 'link' as const, color: '#666666' };
    }
  };

  const handlePress = () => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const sourceIcon = getSourceIcon(source);

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactContainer} onPress={handlePress}>
        <View style={styles.compactIconContainer}>
          <Ionicons name={sourceIcon.name} size={20} color={sourceIcon.color} />
        </View>
        <View style={styles.compactContent}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {title || 'External content'}
          </Text>
          <View style={styles.sourceRow}>
            <Text style={styles.compactSource}>{source || 'link'}</Text>
            {author && <Text style={styles.compactAuthor}> • {author}</Text>}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#999" />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      {thumbnail && (
        <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
      )}
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.sourceInfo}>
            <Ionicons name={sourceIcon.name} size={20} color={sourceIcon.color} />
            <Text style={styles.source}>{source || 'External'}</Text>
          </View>
          <Ionicons name="open-outline" size={16} color="#666" />
        </View>
        
        {title && (
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        )}
        
        {description && (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        )}
        
        {author && (
          <Text style={styles.author}>
            by {author}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.colors.backgroundLight,
    borderRadius: designTokens.borderRadius.md,
    overflow: 'hidden',
    marginTop: designTokens.spacing.sm,
  },
  thumbnail: {
    width: '100%',
    height: 180,
    backgroundColor: '#E0E0E0',
  },
  content: {
    padding: designTokens.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: designTokens.spacing.sm,
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  source: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textMedium,
    textTransform: 'capitalize',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.xs,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    lineHeight: 20,
    marginBottom: designTokens.spacing.sm,
  },
  author: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textLight,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.backgroundLight,
    borderRadius: designTokens.borderRadius.sm,
    padding: designTokens.spacing.sm,
    marginTop: designTokens.spacing.xs,
    gap: designTokens.spacing.sm,
  },
  compactIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: designTokens.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactSource: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    textTransform: 'capitalize',
  },
  compactAuthor: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textLight,
  },
});