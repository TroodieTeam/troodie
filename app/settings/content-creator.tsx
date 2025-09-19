import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, Edit3, Award, CheckCircle } from 'lucide-react-native';
import { designTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { profileService } from '@/services/profileService';
import { ToastService } from '@/services/toastService';
import { supabase } from '@/lib/supabase';

export default function ContentCreatorSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const profileData = await profileService.getProfile(user.id);
      setProfile(profileData);
      setIsCreator(profileData?.is_creator || false);
    } catch (error) {
      console.error('Error loading profile:', error);
      ToastService.showError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCreator = async (value: boolean) => {
    if (saving) return;

    setSaving(true);
    try {
      // Update the profile in database
      const { error } = await supabase
        .from('users')
        .update({ is_creator: value })
        .eq('id', user?.id);

      if (error) throw error;

      setIsCreator(value);

      // Show success message
      if (value) {
        ToastService.showSuccess('You are now identified as a content creator! 🎉');
      } else {
        ToastService.showSuccess('Content creator status removed');
      }

      // Reload profile to ensure sync
      await loadProfile();
    } catch (error) {
      console.error('Error updating creator status:', error);
      ToastService.showError('Failed to update creator status');
      // Revert the toggle
      setIsCreator(!value);
    } finally {
      setSaving(false);
    }
  };

  const benefits = [
    {
      icon: CheckCircle,
      title: 'Creator Badge',
      description: 'Special badge on your profile and posts',
    },
    {
      icon: Camera,
      title: 'Content Priority',
      description: 'Your posts get better visibility',
    },
    {
      icon: Award,
      title: 'Creator Insights',
      description: 'Access to analytics and engagement metrics',
    },
    {
      icon: Edit3,
      title: 'Professional Tools',
      description: 'Enhanced content creation features',
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={designTokens.colors.primaryOrange} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={designTokens.colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Content Creator</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Creator Toggle Section */}
        <View style={styles.toggleSection}>
          <View style={styles.toggleCard}>
            <View style={styles.toggleHeader}>
              <View>
                <Text style={styles.toggleTitle}>I'm a Content Creator</Text>
                <Text style={styles.toggleDescription}>
                  Enable this if you create original food content
                </Text>
              </View>
              <Switch
                value={isCreator}
                onValueChange={handleToggleCreator}
                trackColor={{ false: '#E5E5E5', true: designTokens.colors.primaryOrange }}
                thumbColor="#FFFFFF"
                disabled={saving}
              />
            </View>

            {isCreator && (
              <View style={styles.statusBadge}>
                <CheckCircle size={16} color="#10B981" />
                <Text style={styles.statusText}>You're identified as a content creator</Text>
              </View>
            )}
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Content Creators</Text>
          <View style={styles.card}>
            <Text style={styles.aboutText}>
              Content creators on TROODIE are food enthusiasts, bloggers, photographers,
              and influencers who share their culinary experiences and discoveries with
              our community.
            </Text>
            <Text style={[styles.aboutText, { marginTop: 12 }]}>
              By identifying yourself as a content creator, you help other users recognize
              authentic voices and original content across the platform.
            </Text>
          </View>
        </View>

        {/* Benefits Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Creator Benefits</Text>
          {benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitCard}>
              <View style={styles.benefitIcon}>
                <benefit.icon size={20} color={designTokens.colors.primaryOrange} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDescription}>{benefit.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Guidelines Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Creator Guidelines</Text>
          <View style={styles.card}>
            <Text style={styles.guidelineText}>• Share authentic, original content</Text>
            <Text style={styles.guidelineText}>• Engage respectfully with the community</Text>
            <Text style={styles.guidelineText}>• Provide honest reviews and recommendations</Text>
            <Text style={styles.guidelineText}>• Help others discover great food experiences</Text>
          </View>
        </View>

        {/* Stats Section (if creator) */}
        {isCreator && profile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Creator Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{profile.reviews_count || 0}</Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{profile.followers_count || 0}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{profile.saves_count || 0}</Text>
                <Text style={styles.statLabel}>Saves</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.backgroundLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: designTokens.spacing.md,
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    backgroundColor: designTokens.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  backButton: {
    padding: designTokens.spacing.sm,
  },
  headerTitle: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.colors.textDark,
  },
  headerSpacer: {
    width: 40,
  },
  toggleSection: {
    padding: designTokens.spacing.lg,
  },
  toggleCard: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleTitle: {
    ...designTokens.typography.cardTitle,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: 4,
  },
  toggleDescription: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textMedium,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.md,
    marginTop: designTokens.spacing.md,
    gap: 8,
  },
  statusText: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_500Medium',
    color: '#065F46',
  },
  section: {
    paddingHorizontal: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.xl,
  },
  sectionTitle: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.md,
  },
  card: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  aboutText: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
    lineHeight: 20,
  },
  benefitCard: {
    flexDirection: 'row',
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designTokens.spacing.md,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: 2,
  },
  benefitDescription: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
  },
  guidelineText: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    ...designTokens.typography.screenTitle,
    fontFamily: 'Inter_700Bold',
    color: designTokens.colors.primaryOrange,
  },
  statLabel: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
    marginTop: 4,
  },
});