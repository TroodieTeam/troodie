import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import SubmissionDetails from './SubmissionDetails';
import RejectionActions from './RejectionActions';

interface SubmissionCardProps {
  submission: {
    id: string;
    type: 'restaurant_claim' | 'creator_application';
    status: 'pending' | 'approved' | 'rejected';
    submitted_at: string;
    reviewed_at?: string;
    rejection_reason?: string;
    can_resubmit?: boolean;
    details: any;
  };
  onRefresh?: () => void;
}

export default function SubmissionCard({ submission, onRefresh }: SubmissionCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: '#FFFAF2', text: '#FFAD27', border: '#FFAD27' };
      case 'approved':
        return { bg: '#E5F5E5', text: '#4CAF50', border: '#4CAF50' };
      case 'rejected':
        return { bg: '#FFE5E5', text: '#f44336', border: '#f44336' };
      default:
        return { bg: '#f0f0f0', text: '#666', border: '#666' };
    }
  };

  const colors = getStatusColor(submission.status);

  const getStatusIcon = () => {
    switch (submission.status) {
      case 'pending':
        return 'time-outline';
      case 'approved':
        return 'checkmark-circle';
      case 'rejected':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const getStatusMessage = () => {
    if (submission.status === 'pending') {
      return (
        <View style={styles.statusMessage}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.statusMessageText}>
            Your submission is being reviewed. This typically takes 24-48 hours.
          </Text>
        </View>
      );
    }

    if (submission.status === 'approved') {
      return (
        <View style={styles.statusMessage}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={[styles.statusMessageText, { color: '#4CAF50' }]}>
            Approved on {new Date(submission.reviewed_at!).toLocaleDateString()}!
            {submission.type === 'restaurant_claim'
              ? ' You now have access to restaurant management features.'
              : ' You now have access to creator features.'}
          </Text>
        </View>
      );
    }

    if (submission.status === 'rejected') {
      return (
        <View style={styles.rejectionContainer}>
          <View style={styles.statusMessage}>
            <Ionicons name="close-circle" size={16} color="#f44336" />
            <Text style={[styles.statusMessageText, { color: '#f44336' }]}>
              Rejected on {new Date(submission.reviewed_at!).toLocaleDateString()}
            </Text>
          </View>
          {submission.rejection_reason && (
            <View style={styles.rejectionReason}>
              <Text style={styles.rejectionLabel}>Reason:</Text>
              <Text style={styles.rejectionText}>{submission.rejection_reason}</Text>
            </View>
          )}
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.statusBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Ionicons name={getStatusIcon()} size={14} color={colors.text} />
              <Text style={[styles.statusText, { color: colors.text }]}>
                {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
              </Text>
            </View>
            <Text style={styles.dateText}>
              Submitted {formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setExpanded(!expanded)}>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {submission.type === 'restaurant_claim'
            ? `Restaurant Claim: ${submission.details.restaurant_name}`
            : 'Creator Application'}
        </Text>

        {/* Status Message */}
        {getStatusMessage()}

        {/* Expanded Details */}
        {expanded && (
          <View style={styles.expandedContent}>
            <SubmissionDetails
              type={submission.type}
              details={submission.details}
              status={submission.status}
            />
          </View>
        )}

        {/* Rejection Actions */}
        {submission.status === 'rejected' && submission.can_resubmit && (
          <RejectionActions
            submissionId={submission.id}
            type={submission.type}
            canResubmit={submission.can_resubmit}
            onRefresh={onRefresh}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statusMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  statusMessageText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    lineHeight: 20,
  },
  rejectionContainer: {
    gap: 12,
  },
  rejectionReason: {
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f44336',
  },
  rejectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f44336',
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 14,
    color: '#d32f2f',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
});