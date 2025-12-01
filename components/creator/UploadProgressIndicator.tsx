/**
 * Upload Progress Indicator Component
 * Task: CM-2 - Fix Portfolio Image Upload to Cloud Storage
 *
 * Displays upload progress for multiple portfolio images with
 * individual status indicators and overall progress bar.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Check, X, Image as ImageIcon } from 'lucide-react-native';
import {
  UploadProgress,
  calculateOverallProgress,
} from '@/services/portfolioImageService';

interface UploadProgressIndicatorProps {
  progress: UploadProgress[];
  title?: string;
}

export function UploadProgressIndicator({
  progress,
  title = 'Uploading Images...',
}: UploadProgressIndicatorProps) {
  const overallProgress = calculateOverallProgress(progress);
  const completedCount = progress.filter((p) => p.status === 'complete').length;
  const errorCount = progress.filter((p) => p.status === 'error').length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {/* Overall Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View
            style={[styles.progressBarFill, { width: `${overallProgress}%` }]}
          />
        </View>
        <Text style={styles.progressText}>{overallProgress}%</Text>
      </View>

      {/* Summary */}
      <Text style={styles.summary}>
        {completedCount} of {progress.length} uploaded
        {errorCount > 0 && ` (${errorCount} failed)`}
      </Text>

      {/* Individual Image Progress */}
      <View style={styles.imageList}>
        {progress.map((item, index) => (
          <View key={item.imageId} style={styles.imageRow}>
            <View style={styles.imageInfo}>
              <ImageIcon size={16} color="#737373" />
              <Text style={styles.imageLabel}>Image {index + 1}</Text>
            </View>

            <View style={styles.statusContainer}>
              {item.status === 'pending' && (
                <View style={styles.statusPending}>
                  <Text style={styles.statusText}>Waiting</Text>
                </View>
              )}

              {item.status === 'processing' && (
                <View style={styles.statusProcessing}>
                  <ActivityIndicator size="small" color="#FFAD27" />
                  <Text style={[styles.statusText, styles.processingText]}>
                    Processing
                  </Text>
                </View>
              )}

              {item.status === 'uploading' && (
                <View style={styles.statusUploading}>
                  <ActivityIndicator size="small" color="#FFAD27" />
                  <Text style={[styles.statusText, styles.uploadingText]}>
                    {item.progress}%
                  </Text>
                </View>
              )}

              {item.status === 'complete' && (
                <View style={styles.statusComplete}>
                  <Check size={16} color="#22C55E" />
                  <Text style={[styles.statusText, styles.completeText]}>
                    Done
                  </Text>
                </View>
              )}

              {item.status === 'error' && (
                <View style={styles.statusError}>
                  <X size={16} color="#EF4444" />
                  <Text style={[styles.statusText, styles.errorText]}>
                    Failed
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Error Details */}
      {errorCount > 0 && (
        <View style={styles.errorDetails}>
          <Text style={styles.errorTitle}>Upload Errors:</Text>
          {progress
            .filter((p) => p.status === 'error')
            .map((p, i) => (
              <Text key={i} style={styles.errorMessage}>
                • {p.error || 'Unknown error'}
              </Text>
            ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 16,
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 12,
    textAlign: 'center',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFAD27',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
    minWidth: 40,
    textAlign: 'right',
  },
  summary: {
    fontSize: 13,
    color: '#737373',
    textAlign: 'center',
    marginBottom: 16,
  },
  imageList: {
    gap: 8,
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
  },
  imageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imageLabel: {
    fontSize: 14,
    color: '#525252',
  },
  statusContainer: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  statusPending: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusProcessing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusUploading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusComplete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 13,
    color: '#737373',
  },
  processingText: {
    color: '#FFAD27',
  },
  uploadingText: {
    color: '#FFAD27',
    fontWeight: '500',
  },
  completeText: {
    color: '#22C55E',
    fontWeight: '500',
  },
  errorText: {
    color: '#EF4444',
    fontWeight: '500',
  },
  errorDetails: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#DC2626',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 12,
    color: '#7F1D1D',
  },
});

export default UploadProgressIndicator;
