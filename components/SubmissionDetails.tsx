import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SubmissionDetailsProps {
  type: 'restaurant_claim' | 'creator_application';
  details: any;
  status: string;
}

export default function SubmissionDetails({ type, details, status }: SubmissionDetailsProps) {
  if (type === 'restaurant_claim') {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Submission Details</Text>

        <View style={styles.detailRow}>
          <Ionicons name="business-outline" size={16} color="#666" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Restaurant Name</Text>
            <Text style={styles.detailValue}>{details.restaurant_name || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Address</Text>
            <Text style={styles.detailValue}>{details.restaurant_address || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="document-text-outline" size={16} color="#666" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Proof Type</Text>
            <Text style={styles.detailValue}>{details.ownership_proof_type || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="mail-outline" size={16} color="#666" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Business Email</Text>
            <Text style={styles.detailValue}>{details.business_email || 'N/A'}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Application Details</Text>

      <View style={styles.detailRow}>
        <Ionicons name="people-outline" size={16} color="#666" />
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Follower Count</Text>
          <Text style={styles.detailValue}>
            {details.follower_count?.toLocaleString() || 'N/A'}
          </Text>
        </View>
      </View>

      {details.platforms && details.platforms.length > 0 && (
        <View style={styles.detailRow}>
          <Ionicons name="share-social-outline" size={16} color="#666" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Platforms</Text>
            <Text style={styles.detailValue}>{details.platforms.join(', ')}</Text>
          </View>
        </View>
      )}

      {details.bio && (
        <View style={styles.detailRow}>
          <Ionicons name="information-circle-outline" size={16} color="#666" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Bio</Text>
            <Text style={styles.detailValue}>{details.bio}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
  },
});