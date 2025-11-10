'use client';

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { adminReviewService } from '@/services/adminReviewService';
import ReviewFilters from '@/components/admin/ReviewFilters';
import ReviewQueueItem from '@/components/admin/ReviewQueueItem';
import ReviewStats from '@/components/admin/ReviewStats';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function AdminReviewsPage() {
  const [filters, setFilters] = useState({
    type: 'all' as 'all' | 'restaurant_claim' | 'creator_application',
    status: 'pending',
    priority: 'all',
    dateRange: 'all'
  });

  const [data, setData] = useState<any>({ items: [], total: 0, page: 1, total_pages: 0 });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await adminReviewService.getPendingReviews({
        type: filters.type,
        page: data.page,
        limit: 20,
        sort_by: 'submitted_at',
        order: 'desc'
      });
      setData(response);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch reviews');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [filters]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const handleSelectAll = () => {
    if (selectedItems.length === data.items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(data.items.map((item: any) => item.id));
    }
  };

  const handleBulkApprove = async () => {
    Alert.alert(
      'Confirm Bulk Approval',
      `Approve ${selectedItems.length} selected items?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve All',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              // Group by type for bulk operations
              const claimIds = selectedItems.filter(id =>
                data.items.find((item: any) => item.id === id)?.type === 'restaurant_claim'
              );
              const appIds = selectedItems.filter(id =>
                data.items.find((item: any) => item.id === id)?.type === 'creator_application'
              );

              if (claimIds.length > 0) {
                await adminReviewService.bulkApprove(claimIds, 'restaurant_claim');
              }
              if (appIds.length > 0) {
                await adminReviewService.bulkApprove(appIds, 'creator_application');
              }

              Alert.alert('Success', 'Items approved successfully');
              setSelectedItems([]);
              fetchReviews();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to approve items');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleBulkReject = () => {
    router.push({
      pathname: '/admin/reviews/bulk-reject',
      params: { ids: selectedItems.join(','), type: filters.type }
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Review Queue</Text>
        <Text style={styles.subtitle}>Review and process pending submissions</Text>
      </View>

      {/* Stats */}
      <ReviewStats />

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <ReviewFilters filters={filters} onFilterChange={setFilters} />
      </ScrollView>

      {/* Bulk Actions Bar */}
      {selectedItems.length > 0 && (
        <View style={styles.bulkActionsBar}>
          <Text style={styles.bulkText}>{selectedItems.length} selected</Text>
          <View style={styles.bulkActions}>
            <TouchableOpacity
              style={[styles.bulkButton, styles.approveButton]}
              onPress={handleBulkApprove}
            >
              <Text style={styles.bulkButtonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkButton, styles.rejectButton]}
              onPress={handleBulkReject}
            >
              <Text style={styles.bulkButtonText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedItems([])}
              style={styles.clearButton}
            >
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Queue Header */}
      <View style={styles.queueHeader}>
        <TouchableOpacity onPress={handleSelectAll} style={styles.selectAll}>
          <Ionicons
            name={selectedItems.length === data.items.length ? "checkbox" : "square-outline"}
            size={20}
            color="#FFAD27"
          />
          <Text style={styles.selectAllText}>
            {data.items.length} pending items
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRefresh}>
          <Ionicons name="refresh" size={20} color="#FFAD27" />
        </TouchableOpacity>
      </View>

      {/* Queue Items */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading && data.items.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : data.items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No pending reviews</Text>
            <Text style={styles.emptySubtext}>All caught up!</Text>
          </View>
        ) : (
          data.items.map((item: any) => (
            <ReviewQueueItem
              key={item.id}
              item={item}
              selected={selectedItems.includes(item.id)}
              expanded={expandedItem === item.id}
              onSelect={(selected) => {
                if (selected) {
                  setSelectedItems([...selectedItems, item.id]);
                } else {
                  setSelectedItems(selectedItems.filter(id => id !== item.id));
                }
              }}
              onExpand={() => {
                setExpandedItem(expandedItem === item.id ? null : item.id);
              }}
              onRefresh={fetchReviews}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  bulkActionsBar: {
    backgroundColor: '#FFFAF2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FFAD27',
  },
  bulkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  bulkActions: {
    flexDirection: 'row',
    gap: 10,
  },
  bulkButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  bulkButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  clearButton: {
    padding: 8,
  },
  queueHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});