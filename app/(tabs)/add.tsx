import { designTokens } from '@/constants/designTokens';
import { AddOption, ProgressCard } from '@/types/add-flow';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  Camera,
  FolderPlus,
  Search,
  UserPlus,
  Users2,
  Sparkles
} from 'lucide-react-native';
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function AddScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const addOptions: AddOption[] = [
    {
      id: 'post',
      title: 'Create a Post',
      description: 'Share your restaurant experience',
      icon: Camera,
      color: designTokens.colors.primaryOrange,
      navigateTo: '/add/create-post'
    },
    {
      id: 'board',
      title: 'Create a Board',
      description: 'Curate a themed collection',
      icon: FolderPlus,
      color: '#3B82F6',
      navigateTo: '/add/create-board'
    },
  ];

  const progressCard: ProgressCard = {
    title: 'Keep creating!',
    description: 'You\'ve created 1 board this week. Create one more to unlock achievements.',
    progress: {
      current: 1,
      target: 2,
      unit: 'boards'
    },
    reward: '+50 points',
    cta: 'Create Another Board'
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Add Content</Text>
      <Text style={styles.subtitle}>What would you like to add?</Text>
    </View>
  );

  const renderPrimaryActions = () => (
    <View style={styles.primaryActions}>
      {addOptions.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={[
            styles.optionCard,
            option.beta && styles.optionCardBeta
          ]}
          onPress={() => router.push(option.navigateTo as any)}
          activeOpacity={0.8}
        >
          <View style={styles.optionContent}>
            <View style={[styles.optionIcon, { backgroundColor: option.color }]}>
              <option.icon size={20} color={designTokens.colors.white} />
            </View>
            
            <View style={styles.optionTextContent}>
              <View style={styles.optionHeader}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                {option.beta && (
                  <View style={styles.betaBadge}>
                    <Text style={styles.betaText}>Beta</Text>
                  </View>
                )}
              </View>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            
            <View style={styles.optionIndicator} />
          </View>
        </TouchableOpacity>
      ))}

    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/explore')}>
          <Search size={16} color={designTokens.colors.textMedium} />
          <Text style={styles.quickActionText}>Search Places</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/explore')}>
          <UserPlus size={16} color={designTokens.colors.textMedium} />
          <Text style={styles.quickActionText}>Find Friends</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderJoinCommunityCTA = () => {
    // Show different content based on authentication status
    const isAuthenticated = !!user;
    
    return (
      <View style={styles.communitySection}>
        <View style={styles.communityCTA}>
          <View style={styles.communityIcon}>
            <Users2 size={32} color={designTokens.colors.primaryOrange} />
          </View>
          
          <View style={styles.communityContent}>
            <View style={styles.communityHeader}>
              <Text style={styles.communityTitle}>
                {isAuthenticated ? 'Explore the Community' : 'Join the Troodie Community'}
              </Text>
              <View style={styles.communityBadge}>
                <Sparkles size={12} color="#FFB800" />
                <Text style={styles.communityBadgeText}>New</Text>
              </View>
            </View>
            
            <Text style={styles.communityDescription}>
              Connect with fellow food lovers, share recommendations, and discover hidden gems together.
            </Text>
            
            <View style={styles.communityBenefits}>
              <View style={styles.benefitItem}>
                <View style={styles.benefitDot} />
                <Text style={styles.benefitText}>Follow friends and foodies</Text>
              </View>
              <View style={styles.benefitItem}>
                <View style={styles.benefitDot} />
                <Text style={styles.benefitText}>Share your favorite spots</Text>
              </View>
              <View style={styles.benefitItem}>
                <View style={styles.benefitDot} />
                <Text style={styles.benefitText}>Get personalized recommendations</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.communityButton} 
              onPress={() => {
                if (isAuthenticated) {
                  router.push('/explore');
                } else {
                  router.push('/onboarding');
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.communityButtonText}>
                {isAuthenticated ? 'Explore Community' : 'Join Now'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderProgressGamification = () => (
    <View style={styles.progressCard}>
      <View style={styles.progressContent}>
        <Text style={styles.progressTitle}>{progressCard.title}</Text>
        <Text style={styles.progressDescription}>{progressCard.description}</Text>
        <TouchableOpacity style={styles.progressCTA} onPress={() => router.push('/add/create-board' as any)}>
          <Text style={styles.progressCTAText}>{progressCard.cta}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderPrimaryActions()}
        {renderQuickActions()}
        {renderJoinCommunityCTA()}
        {renderProgressGamification()}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.white,
  },
  header: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingTop: designTokens.spacing.lg,
    paddingBottom: designTokens.spacing.xl,
    marginBottom: designTokens.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
    alignItems: 'center',
  },
  title: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.colors.textDark,
    marginBottom: 4,
  },
  subtitle: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textMedium,
  },
  primaryActions: {
    paddingHorizontal: designTokens.spacing.lg,
    gap: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.xxl,
  },
  optionCard: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing.lg,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    ...designTokens.shadows.card,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.md,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: designTokens.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextContent: {
    flex: 1,
  },
  optionTitle: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: 2,
  },
  optionDescription: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
  },
  optionIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: designTokens.colors.primaryOrange,
  },
  section: {
    paddingHorizontal: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.xxl,
  },
  sectionTitle: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.lg,
  },
  quickActions: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    padding: designTokens.spacing.md,
    alignItems: 'center',
    gap: designTokens.spacing.sm,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    ...designTokens.shadows.card,
  },
  quickActionText: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
  },
  progressCard: {
    marginHorizontal: designTokens.spacing.lg,
    backgroundColor: designTokens.colors.primaryOrange + '0D',
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.xxl,
    borderWidth: 1,
    borderColor: designTokens.colors.primaryOrange + '33',
    ...designTokens.shadows.card,
  },
  progressContent: {
    alignItems: 'center',
  },
  progressTitle: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.sm,
  },
  progressDescription: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
    marginBottom: designTokens.spacing.lg,
    textAlign: 'center',
    lineHeight: 18,
  },
  progressCTA: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.sm,
  },
  progressCTAText: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
  bottomPadding: {
    height: 100,
  },
  optionCardBeta: {
    borderColor: designTokens.colors.primaryOrange + '33',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  betaBadge: {
    marginLeft: 8,
    backgroundColor: designTokens.colors.primaryOrange + '1A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  betaText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.primaryOrange,
  },
  betaNotice: {
    marginTop: designTokens.spacing.lg,
    padding: designTokens.spacing.lg,
    backgroundColor: designTokens.colors.backgroundLight,
    borderRadius: designTokens.borderRadius.lg,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
  },
  betaNoticeTitle: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.xs,
  },
  betaNoticeText: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
    lineHeight: 18,
  },
  communitySection: {
    paddingHorizontal: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.xxl,
  },
  communityCTA: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing.xl,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    ...designTokens.shadows.card,
    flexDirection: 'row',
    gap: designTokens.spacing.lg,
  },
  communityIcon: {
    width: 56,
    height: 56,
    borderRadius: designTokens.borderRadius.full,
    backgroundColor: designTokens.colors.primaryOrange + '1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  communityContent: {
    flex: 1,
  },
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.sm,
  },
  communityTitle: {
    ...designTokens.typography.cardTitle,
    color: designTokens.colors.textDark,
  },
  communityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFB800' + '1A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: designTokens.borderRadius.full,
  },
  communityBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFB800',
  },
  communityDescription: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textMedium,
    marginBottom: designTokens.spacing.lg,
    lineHeight: 20,
  },
  communityBenefits: {
    gap: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.lg,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
  },
  benefitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: designTokens.colors.primaryOrange,
  },
  benefitText: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textDark,
  },
  communityButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingVertical: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.xl,
    borderRadius: designTokens.borderRadius.md,
    alignItems: 'center',
  },
  communityButtonText: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
});