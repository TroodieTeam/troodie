'use client';

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { supabase } from '@/lib/supabase';
import SubmissionCard from '@/components/SubmissionCard';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function MySubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSubmissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      // Fetch restaurant claims
      const { data: claims } = await supabase
        .from('restaurant_claims')
        .select(`
          *,
          restaurant:restaurants(name, address, cuisine_type)
        `)
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false });

      // Fetch creator applications
      const { data: applications } = await supabase
        .from('creator_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false });

      // Combine and format submissions
      const allSubmissions = [
        ...(claims || []).map(claim => ({
          id: claim.id,
          type: 'restaurant_claim' as const,
          status: claim.status,
          submitted_at: claim.submitted_at,
          reviewed_at: claim.reviewed_at,
          rejection_reason: claim.rejection_reason,
          can_resubmit: claim.can_resubmit,
          details: {
            restaurant_name: claim.restaurant?.name,
            restaurant_address: claim.restaurant?.address,
            ownership_proof_type: claim.ownership_proof_type,
            business_email: claim.email
          }
        })),
        ...(applications || []).map(app => ({
          id: app.id,
          type: 'creator_application' as const,
          status: app.status,
          submitted_at: app.submitted_at,
          reviewed_at: app.reviewed_at,
          rejection_reason: app.rejection_reason,
          can_resubmit: app.can_resubmit,
          details: {
            follower_count: app.follower_count,
            platforms: [
              app.instagram_handle && 'Instagram',
              app.tiktok_handle && 'TikTok',
              app.youtube_handle && 'YouTube',
              app.twitter_handle && 'Twitter'
            ].filter(Boolean),
            bio: app.bio
          }
        }))
      ].sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

      setSubmissions(allSubmissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSubmissions();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFAD27" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>My Submissions</Text>
          <Text style={styles.subtitle}>
            Track the status of your restaurant claims and creator applications
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#FFAD27']}
            tintColor="#FFAD27"
          />
        }
      >
        {submissions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="document-outline" size={64} color="#ccc" />
            </View>
            <Text style={styles.emptyTitle}>No submissions yet</Text>
            <Text style={styles.emptyDescription}>
              You haven't submitted any claims or applications
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => router.push('/explore')}
            >
              <Text style={styles.exploreButtonText}>Explore Opportunities</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.submissionsList}>
            {submissions.map(submission => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                onRefresh={fetchSubmissions}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  backButton: {
    marginRight: 16,
    marginTop: 4,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  exploreButton: {
    backgroundColor: '#FFAD27',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submissionsList: {
    gap: 16,
  },
});