# Create Admin Review Queue UI

- Epic: PS (Pending State)
- Priority: Critical
- Estimate: 2 days
- Status: 🟡 Needs Review
- Assignee: -
- Dependencies: PS-006

## Overview
Build the admin dashboard interface for reviewing pending restaurant claims and creator applications, with filtering, sorting, and bulk actions.

## Business Value
- Streamlined review process for admin efficiency
- Reduced review turnaround time
- Better oversight of pending submissions
- Improved admin productivity

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Admin Review Queue Dashboard
  As an admin
  I want a dashboard to review pending items
  So that I can efficiently process submissions

  Scenario: View pending items
    Given I am on the admin review dashboard
    When the page loads
    Then I should see all pending claims and applications
    And they should be sorted by submission date
    And show key information for quick review

  Scenario: Filter review queue
    Given I am viewing the review queue
    When I apply filters (type, date range, priority)
    Then only matching items should be displayed
    And the filter state should persist

  Scenario: Review item details
    Given I am viewing the queue
    When I click on an item
    Then I should see full submission details
    And review action buttons
    And any previous review history

  Scenario: Bulk selection
    Given multiple pending items
    When I select multiple items
    Then I should see bulk action options
    And be able to approve/reject selected items
```

## Technical Implementation

**IMPORTANT:** All UI components must follow the design system and patterns defined in `docs/v1_component_reference.html`. Review this file thoroughly before implementing any UI elements to ensure consistency with the existing Troodie design language, including:
- Color schemes and theming
- Typography and spacing
- Button styles and states
- Card layouts and shadows
- Form input patterns
- Modal and overlay behaviors
- Loading and empty states

### Component Structure

1. **Review Queue Dashboard**:
```tsx
// app/admin/reviews/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { ReviewQueue } from '@/components/admin/ReviewQueue';
import { ReviewFilters } from '@/components/admin/ReviewFilters';
import { ReviewStats } from '@/components/admin/ReviewStats';
import { useReviewQueue } from '@/hooks/useReviewQueue';

export default function AdminReviewsPage() {
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'pending',
    priority: 'all',
    dateRange: 'all'
  });

  const { data, loading, refetch } = useReviewQueue(filters);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Review Queue</h1>
        <p className="text-gray-600">Review and process pending submissions</p>
      </div>

      <ReviewStats />

      <div className="grid grid-cols-12 gap-6 mt-8">
        <div className="col-span-3">
          <ReviewFilters
            filters={filters}
            onFilterChange={setFilters}
          />
        </div>

        <div className="col-span-9">
          <ReviewQueue
            items={data?.items || []}
            loading={loading}
            onRefresh={refetch}
          />
        </div>
      </div>
    </div>
  );
}
```

2. **Review Queue Component**:
```tsx
// components/admin/ReviewQueue.tsx
interface ReviewQueueProps {
  items: ReviewItem[];
  loading: boolean;
  onRefresh: () => void;
}

export function ReviewQueue({ items, loading, onRefresh }: ReviewQueueProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.id));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Bulk Actions Bar */}
      {selectedItems.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedItems.length}
          onApprove={() => handleBulkAction('approve')}
          onReject={() => handleBulkAction('reject')}
          onClear={() => setSelectedItems([])}
        />
      )}

      {/* Queue Header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <input
              type="checkbox"
              checked={selectedItems.length === items.length}
              onChange={handleSelectAll}
              className="rounded"
            />
            <span className="text-sm text-gray-600">
              {items.length} pending items
            </span>
          </div>
          <button
            onClick={onRefresh}
            className="text-blue-600 hover:text-blue-800"
          >
            <RefreshIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Queue Items */}
      <div className="divide-y">
        {loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState message="No pending reviews" />
        ) : (
          items.map(item => (
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
            />
          ))
        )}
      </div>
    </div>
  );
}
```

3. **Review Queue Item**:
```tsx
// components/admin/ReviewQueueItem.tsx
interface ReviewQueueItemProps {
  item: ReviewItem;
  selected: boolean;
  expanded: boolean;
  onSelect: (selected: boolean) => void;
  onExpand: () => void;
}

export function ReviewQueueItem({
  item,
  selected,
  expanded,
  onSelect,
  onExpand
}: ReviewQueueItemProps) {
  const [showReviewModal, setShowReviewModal] = useState(false);

  return (
    <>
      <div className="px-6 py-4 hover:bg-gray-50">
        <div className="flex items-start space-x-4">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
            className="mt-1 rounded"
          />

          <div className="flex-1">
            {/* Item Summary */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <TypeBadge type={item.type} />
                  <PriorityBadge priority={item.priority} />
                  <span className="text-sm text-gray-500">
                    {formatTimeAgo(item.submitted_at)}
                  </span>
                </div>

                <h3 className="mt-1 font-medium">
                  {item.type === 'restaurant_claim'
                    ? item.details.restaurant_name
                    : `Creator: ${item.user_name}`}
                </h3>

                <p className="text-sm text-gray-600 mt-1">
                  Submitted by: {item.user_name} ({item.user_email})
                </p>

                {/* Quick Info */}
                <div className="mt-2 flex items-center space-x-4 text-sm">
                  {item.type === 'restaurant_claim' ? (
                    <>
                      <span>Proof: {item.details.ownership_proof_type}</span>
                      <span>Business Email: {item.details.business_email}</span>
                    </>
                  ) : (
                    <>
                      <span>{item.details.follower_count.toLocaleString()} followers</span>
                      <span>Platforms: {item.details.platforms.join(', ')}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={onExpand}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                </button>
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Review
                </button>
              </div>
            </div>

            {/* Expanded Details */}
            {expanded && (
              <ReviewItemDetails
                item={item}
                onApprove={() => handleApprove(item.id)}
                onReject={() => handleReject(item.id)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <ReviewModal
          item={item}
          onClose={() => setShowReviewModal(false)}
          onComplete={() => {
            setShowReviewModal(false);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
```

4. **Review Modal**:
```tsx
// components/admin/ReviewModal.tsx
export function ReviewModal({ item, onClose, onComplete }) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (action === 'reject' && !rejectionReason) {
      toast.error('Rejection reason is required');
      return;
    }

    setLoading(true);

    try {
      if (action === 'approve') {
        await approveReview(item.id, { review_notes: reviewNotes });
        toast.success('Item approved successfully');
      } else {
        await rejectReview(item.id, {
          rejection_reason: rejectionReason,
          review_notes: reviewNotes
        });
        toast.success('Item rejected successfully');
      }
      onComplete();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} size="lg">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Review Submission</h2>

        {/* Full Details Display */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <ReviewFullDetails item={item} />
        </div>

        {/* Review Actions */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Action</label>
            <div className="flex space-x-4">
              <button
                onClick={() => setAction('approve')}
                className={`px-4 py-2 rounded ${
                  action === 'approve'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Approve
              </button>
              <button
                onClick={() => setAction('reject')}
                className={`px-4 py-2 rounded ${
                  action === 'reject'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Reject
              </button>
            </div>
          </div>

          {action === 'reject' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Rejection Reason *
              </label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select a reason</option>
                <option value="Insufficient proof of ownership">
                  Insufficient proof of ownership
                </option>
                <option value="Information doesn't match records">
                  Information doesn't match records
                </option>
                <option value="Duplicate claim">Duplicate claim</option>
                <option value="Insufficient followers">Insufficient followers</option>
                <option value="Content quality below standards">
                  Content quality below standards
                </option>
                <option value="Other">Other (specify in notes)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Internal Notes (Optional)
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={3}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Add any internal notes about this review..."
            />
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!action || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

## Definition of Done
- [ ] Review queue dashboard implemented
- [ ] Filtering and sorting functional
- [ ] Item details expandable
- [ ] Bulk selection working
- [ ] Review modal complete
- [ ] Quick actions available
- [ ] Real-time updates via subscription
- [ ] Responsive design
- [ ] Loading states implemented
- [ ] Error handling complete

## Notes
- Consider adding keyboard shortcuts for quick review
- May want to add review templates for common scenarios
- Future: Add AI-assisted review suggestions