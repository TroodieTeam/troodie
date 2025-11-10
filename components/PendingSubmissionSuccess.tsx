import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface PendingSubmissionSuccessProps {
  type: 'restaurant_claim' | 'creator_application';
  submissionId: string;
  estimatedReviewTime?: string;
}

export default function PendingSubmissionSuccess({
  type,
  submissionId,
  estimatedReviewTime = '24-48 hours'
}: PendingSubmissionSuccessProps) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="time-outline" size={48} color="#FFAD27" />
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {type === 'restaurant_claim'
            ? 'Claim Submitted Successfully!'
            : 'Application Submitted Successfully!'}
        </Text>

        {/* Status Badge */}
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Pending Review</Text>
        </View>

        {/* Description */}
        <Text style={styles.description}>
          Your submission has been received and is currently under review by our team.
          We'll notify you once a decision has been made.
        </Text>

        {/* Timeline Info */}
        <View style={styles.timelineCard}>
          <Ionicons name="hourglass-outline" size={20} color="#4A90E2" />
          <Text style={styles.timelineText}>
            Estimated review time: {estimatedReviewTime}
          </Text>
        </View>

        {/* What's Next */}
        <View style={styles.nextStepsCard}>
          <Text style={styles.nextStepsTitle}>What happens next?</Text>
          <View style={styles.stepItem}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.stepText}>Our team will review your submission</Text>
          </View>
          <View style={styles.stepItem}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.stepText}>You'll receive an email notification with the decision</Text>
          </View>
          <View style={styles.stepItem}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.stepText}>
              {type === 'restaurant_claim'
                ? 'Once approved, you can manage your restaurant'
                : 'Once approved, you can access creator features'}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push(`/my-submissions/${submissionId}`)}
          >
            <Text style={styles.primaryButtonText}>Track Status</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/')}
          >
            <Text style={styles.secondaryButtonText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFFAF2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFAF2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFAD27',
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFAD27',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  timelineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
  },
  timelineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
    marginLeft: 12,
  },
  nextStepsCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#FFAD27',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    color: '#666',
  },
});