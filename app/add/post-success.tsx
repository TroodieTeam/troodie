import { designTokens } from '@/constants/designTokens';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function PostSuccessScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const handleViewPost = () => {
    if (id) {
      router.push({
        pathname: '/posts/[id]',
        params: { id }
      });
    }
  };

  const handleCreateAnother = () => {
    router.push('/add/create-post');
  };

  const handleGoHome = () => {
    router.push('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconBackground}>
            <Ionicons name="checkmark" size={48} color={designTokens.colors.white} />
          </View>
        </View>

        {/* Success Message */}
        <Text style={styles.title}>Post Published!</Text>
        <Text style={styles.subtitle}>
          Your post has been successfully published and is now visible to your network.
        </Text>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="eye" size={20} color={designTokens.colors.primaryOrange} />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Views</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="heart" size={20} color={designTokens.colors.primaryOrange} />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="chatbubble" size={20} color={designTokens.colors.primaryOrange} />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Comments</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleViewPost}>
            <Ionicons name="eye" size={20} color={designTokens.colors.white} />
            <Text style={styles.primaryButtonText}>View Post</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleCreateAnother}>
            <Ionicons name="add" size={20} color={designTokens.colors.primaryOrange} />
            <Text style={styles.secondaryButtonText}>Create Another</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tertiaryButton} onPress={handleGoHome}>
            <Text style={styles.tertiaryButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Tips for better engagement:</Text>
          <View style={styles.tipItem}>
            <Ionicons name="bulb" size={16} color={designTokens.colors.primaryOrange} />
            <Text style={styles.tipText}>Add detailed captions to your posts</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="bulb" size={16} color={designTokens.colors.primaryOrange} />
            <Text style={styles.tipText}>Use relevant tags to increase discoverability</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="bulb" size={16} color={designTokens.colors.primaryOrange} />
            <Text style={styles.tipText}>Engage with other users' posts</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: designTokens.spacing.lg,
  },
  iconContainer: {
    marginBottom: designTokens.spacing.xl,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: designTokens.colors.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...designTokens.typography.screenTitle,
    color: designTokens.colors.textDark,
    textAlign: 'center',
    marginBottom: designTokens.spacing.sm,
  },
  subtitle: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
    textAlign: 'center',
    marginBottom: designTokens.spacing.xl,
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: designTokens.spacing.xl,
    paddingHorizontal: designTokens.spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    ...designTokens.typography.screenTitle,
    color: designTokens.colors.textDark,
    marginTop: designTokens.spacing.xs,
  },
  statLabel: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
    marginTop: designTokens.spacing.xs,
  },
  actionsContainer: {
    width: '100%',
    gap: designTokens.spacing.md,
    marginBottom: designTokens.spacing.xl,
  },
  primaryButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.md,
    gap: designTokens.spacing.sm,
  },
  primaryButtonText: {
    ...designTokens.typography.bodyRegular,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
  secondaryButton: {
    backgroundColor: designTokens.colors.white,
    borderWidth: 1,
    borderColor: designTokens.colors.primaryOrange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.md,
    gap: designTokens.spacing.sm,
  },
  secondaryButtonText: {
    ...designTokens.typography.bodyRegular,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.primaryOrange,
  },
  tertiaryButton: {
    alignItems: 'center',
    paddingVertical: designTokens.spacing.md,
  },
  tertiaryButtonText: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
  },
  tipsContainer: {
    width: '100%',
    backgroundColor: designTokens.colors.backgroundGray,
    padding: designTokens.spacing.lg,
    borderRadius: designTokens.borderRadius.md,
  },
  tipsTitle: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textDark,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: designTokens.spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designTokens.spacing.sm,
    gap: designTokens.spacing.sm,
  },
  tipText: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
    flex: 1,
  },
}); 