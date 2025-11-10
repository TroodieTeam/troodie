import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { adminReviewService } from '@/services/adminReviewService';
import { Ionicons } from '@expo/vector-icons';

export default function ReviewStats() {
  const [stats, setStats] = useState({
    pendingTotal: 0,
    pendingClaims: 0,
    pendingApplications: 0,
    todayProcessed: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [allPending, claims, applications] = await Promise.all([
        adminReviewService.getPendingReviews({ type: 'all', limit: 1 }),
        adminReviewService.getPendingReviews({ type: 'restaurant_claim', limit: 1 }),
        adminReviewService.getPendingReviews({ type: 'creator_application', limit: 1 })
      ]);

      setStats({
        pendingTotal: allPending.total,
        pendingClaims: claims.total,
        pendingApplications: applications.total,
        todayProcessed: 0 // Would need to implement this with review logs
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statCard}>
        <View style={[styles.iconContainer, { backgroundColor: '#FFFAF2' }]}>
          <Ionicons name="time-outline" size={24} color="#FFAD27" />
        </View>
        <Text style={styles.statValue}>{stats.pendingTotal}</Text>
        <Text style={styles.statLabel}>Pending Total</Text>
      </View>

      <View style={styles.statCard}>
        <View style={[styles.iconContainer, { backgroundColor: '#FFE5E5' }]}>
          <Ionicons name="business-outline" size={24} color="#FF6B6B" />
        </View>
        <Text style={styles.statValue}>{stats.pendingClaims}</Text>
        <Text style={styles.statLabel}>Restaurant Claims</Text>
      </View>

      <View style={styles.statCard}>
        <View style={[styles.iconContainer, { backgroundColor: '#E5F9F6' }]}>
          <Ionicons name="person-outline" size={24} color="#4ECDC4" />
        </View>
        <Text style={styles.statValue}>{stats.pendingApplications}</Text>
        <Text style={styles.statLabel}>Creator Apps</Text>
      </View>

      <View style={styles.statCard}>
        <View style={[styles.iconContainer, { backgroundColor: '#E5F5E5' }]}>
          <Ionicons name="checkmark-circle-outline" size={24} color="#4CAF50" />
        </View>
        <Text style={styles.statValue}>{stats.todayProcessed}</Text>
        <Text style={styles.statLabel}>Today Processed</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
});