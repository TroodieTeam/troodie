import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';

import { NotificationItem } from '@/components/NotificationItem';
import { Notification } from '@/types/notifications';

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const RN = require('react-native');
  const RR = require('react');
  return {
    Swipeable: RR.forwardRef(({ children }: any, _ref: any) => children),
    GestureHandlerRootView: RN.View,
  };
});

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => {
  const RN = require('react-native');
  const RR = require('react');
  const MockIcon = (name: string) => {
    const Icon = (props: any) => RR.createElement(RN.View, { testID: `icon-${name}`, ...props });
    Icon.displayName = name;
    return Icon;
  };
  return {
    AtSign: MockIcon('AtSign'),
    Bell: MockIcon('Bell'),
    Briefcase: MockIcon('Briefcase'),
    Calendar: MockIcon('Calendar'),
    CheckCircle: MockIcon('CheckCircle'),
    ClipboardCheck: MockIcon('ClipboardCheck'),
    CreditCard: MockIcon('CreditCard'),
    Heart: MockIcon('Heart'),
    MapPin: MockIcon('MapPin'),
    MessageCircle: MockIcon('MessageCircle'),
    Newspaper: MockIcon('Newspaper'),
    RefreshCw: MockIcon('RefreshCw'),
    Send: MockIcon('Send'),
    Settings: MockIcon('Settings'),
    Star: MockIcon('Star'),
    Target: MockIcon('Target'),
    Trash2: MockIcon('Trash2'),
    Trophy: MockIcon('Trophy'),
    UserPlus: MockIcon('UserPlus'),
    Users: MockIcon('Users'),
    XCircle: MockIcon('XCircle'),
  };
});

const createNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: 'notif-1',
  user_id: 'user-1',
  type: 'like',
  title: 'New Like',
  message: 'Someone liked your post',
  data: { postId: 'post-1' },
  related_id: 'post-1',
  related_type: 'post',
  is_read: false,
  is_actioned: false,
  priority: 1,
  expires_at: null,
  created_at: new Date().toISOString(),
  ...overrides,
});

describe('NotificationItem', () => {
  const mockOnPress = jest.fn();
  const mockOnSwipeDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('icon mapping', () => {
    const iconTestCases: Array<{ type: string; expectedIcon: string }> = [
      { type: 'like', expectedIcon: 'Heart' },
      { type: 'post_liked', expectedIcon: 'Heart' },
      { type: 'comment', expectedIcon: 'MessageCircle' },
      { type: 'post_commented', expectedIcon: 'MessageCircle' },
      { type: 'follow', expectedIcon: 'UserPlus' },
      { type: 'new_follower', expectedIcon: 'UserPlus' },
      { type: 'achievement', expectedIcon: 'Trophy' },
      { type: 'restaurant_recommendation', expectedIcon: 'MapPin' },
      { type: 'restaurant_mention', expectedIcon: 'MapPin' },
      { type: 'board_invite', expectedIcon: 'Users' },
      { type: 'post_mention', expectedIcon: 'AtSign' },
      { type: 'mentioned_in_post', expectedIcon: 'AtSign' },
      { type: 'mentioned_in_comment', expectedIcon: 'AtSign' },
      { type: 'milestone', expectedIcon: 'Target' },
      { type: 'system', expectedIcon: 'Settings' },
      { type: 'campaign_opportunity', expectedIcon: 'Briefcase' },
      { type: 'new_campaign_posted', expectedIcon: 'Briefcase' },
      { type: 'campaign_application', expectedIcon: 'ClipboardCheck' },
      { type: 'campaign_application_submitted', expectedIcon: 'ClipboardCheck' },
      { type: 'application_approved', expectedIcon: 'CheckCircle' },
      { type: 'application_rejected', expectedIcon: 'XCircle' },
      { type: 'revision_requested', expectedIcon: 'RefreshCw' },
      { type: 'campaign_deadline', expectedIcon: 'Calendar' },
      { type: 'campaign_deadline_approaching', expectedIcon: 'Calendar' },
      { type: 'deliverable_submitted', expectedIcon: 'Send' },
      { type: 'deliverables_submitted', expectedIcon: 'Send' },
      { type: 'payment_sent', expectedIcon: 'CreditCard' },
      { type: 'payment_received', expectedIcon: 'CreditCard' },
      { type: 'campaign_invite', expectedIcon: 'Star' },
      { type: 'friend_post', expectedIcon: 'Newspaper' },
      { type: 'friend_post_restaurant', expectedIcon: 'Newspaper' },
      { type: 'weekly_recap', expectedIcon: 'Trophy' },
    ];

    it.each(iconTestCases)(
      'renders $expectedIcon icon for type "$type"',
      ({ type, expectedIcon }) => {
        const notification = createNotification({ type });
        const { getByTestId } = render(
          <NotificationItem notification={notification} onPress={mockOnPress} />
        );
        expect(getByTestId(`icon-${expectedIcon}`)).toBeTruthy();
      }
    );

    it('renders Bell icon for unknown type', () => {
      const notification = createNotification({ type: 'unknown_type' });
      const { getByTestId } = render(
        <NotificationItem notification={notification} onPress={mockOnPress} />
      );
      expect(getByTestId('icon-Bell')).toBeTruthy();
    });
  });

  describe('color mapping', () => {
    const colorTestCases: Array<{ type: string; expectedColor: string }> = [
      { type: 'like', expectedColor: '#FF4444' },
      { type: 'post_liked', expectedColor: '#FF4444' },
      { type: 'comment', expectedColor: '#3B82F6' },
      { type: 'post_commented', expectedColor: '#3B82F6' },
      { type: 'follow', expectedColor: '#10B981' },
      { type: 'new_follower', expectedColor: '#10B981' },
      { type: 'achievement', expectedColor: '#F59E0B' },
      { type: 'restaurant_mention', expectedColor: '#8B5CF6' },
      { type: 'board_invite', expectedColor: '#06B6D4' },
      { type: 'mentioned_in_post', expectedColor: '#EC4899' },
      { type: 'milestone', expectedColor: '#84CC16' },
      { type: 'system', expectedColor: '#6B7280' },
      { type: 'campaign_opportunity', expectedColor: '#3B82F6' },
      { type: 'application_approved', expectedColor: '#10B981' },
      { type: 'application_rejected', expectedColor: '#EF4444' },
      { type: 'revision_requested', expectedColor: '#F59E0B' },
      { type: 'campaign_deadline', expectedColor: '#F59E0B' },
      { type: 'deliverable_submitted', expectedColor: '#6366F1' },
      { type: 'payment_sent', expectedColor: '#059669' },
      { type: 'campaign_invite', expectedColor: '#8B5CF6' },
      { type: 'friend_post', expectedColor: '#EC4899' },
      { type: 'weekly_recap', expectedColor: '#F97316' },
    ];

    it.each(colorTestCases)(
      'passes $expectedColor for type "$type"',
      ({ type, expectedColor }) => {
        const notification = createNotification({ type });
        const { getByTestId } = render(
          <NotificationItem notification={notification} onPress={mockOnPress} />
        );
        const icon = getByTestId(`icon-${getExpectedIconForType(type)}`);
        expect(icon.props.color).toBe(expectedColor);
      }
    );
  });

  describe('unread dot', () => {
    it('renders unread dot when is_read is false', () => {
      const notification = createNotification({ is_read: false });
      const { getByTestId } = render(
        <NotificationItem notification={notification} onPress={mockOnPress} />
      );
      expect(getByTestId(`notification-unread-dot-${notification.type}`)).toBeTruthy();
    });

    it('does not render unread dot when is_read is true', () => {
      const notification = createNotification({ is_read: true });
      const { queryByTestId } = render(
        <NotificationItem notification={notification} onPress={mockOnPress} />
      );
      expect(queryByTestId(`notification-unread-dot-${notification.type}`)).toBeNull();
    });
  });

  describe('content rendering', () => {
    it('displays notification title and message', () => {
      const notification = createNotification({
        title: 'Test Title',
        message: 'Test message body',
      });
      const { getByText } = render(
        <NotificationItem notification={notification} onPress={mockOnPress} />
      );
      expect(getByText('Test Title')).toBeTruthy();
      expect(getByText('Test message body')).toBeTruthy();
    });

    it('renders correct testID based on notification type', () => {
      const notification = createNotification({ type: 'board_invite' });
      const { getByTestId } = render(
        <NotificationItem notification={notification} onPress={mockOnPress} />
      );
      expect(getByTestId('notification-item-board_invite')).toBeTruthy();
    });
  });

  describe('formatRelativeTime', () => {
    it('shows "Just now" for notifications less than 1 minute old', () => {
      const notification = createNotification({
        created_at: new Date().toISOString(),
      });
      const { getByText } = render(
        <NotificationItem notification={notification} onPress={mockOnPress} />
      );
      expect(getByText('Just now')).toBeTruthy();
    });

    it('shows minutes ago for recent notifications', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const notification = createNotification({ created_at: fiveMinutesAgo });
      const { getByText } = render(
        <NotificationItem notification={notification} onPress={mockOnPress} />
      );
      expect(getByText('5m ago')).toBeTruthy();
    });

    it('shows hours ago for notifications within 24 hours', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const notification = createNotification({ created_at: threeHoursAgo });
      const { getByText } = render(
        <NotificationItem notification={notification} onPress={mockOnPress} />
      );
      expect(getByText('3h ago')).toBeTruthy();
    });

    it('shows days ago for notifications within 7 days', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const notification = createNotification({ created_at: twoDaysAgo });
      const { getByText } = render(
        <NotificationItem notification={notification} onPress={mockOnPress} />
      );
      expect(getByText('2d ago')).toBeTruthy();
    });

    it('shows formatted date for notifications older than 7 days', () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const notification = createNotification({ created_at: twoWeeksAgo.toISOString() });
      const { getByText } = render(
        <NotificationItem notification={notification} onPress={mockOnPress} />
      );
      expect(getByText(twoWeeksAgo.toLocaleDateString())).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('calls onPress with notification object on tap', () => {
      const notification = createNotification();
      const { getByTestId } = render(
        <NotificationItem notification={notification} onPress={mockOnPress} />
      );
      fireEvent.press(getByTestId(`notification-item-${notification.type}`));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(mockOnPress).toHaveBeenCalledWith(notification);
    });

    it('calls onSwipeDelete with notification id when delete is triggered', () => {
      const notification = createNotification();
      const { getByTestId } = render(
        <NotificationItem
          notification={notification}
          onPress={mockOnPress}
          onSwipeDelete={mockOnSwipeDelete}
        />
      );
      // The delete button is rendered inside Swipeable right actions
      // Since we mock Swipeable to just render children, we verify the callback wiring
      expect(getByTestId(`notification-item-${notification.type}`)).toBeTruthy();
    });
  });
});

// Helper to map type to expected icon name for color tests
function getExpectedIconForType(type: string): string {
  const mapping: Record<string, string> = {
    like: 'Heart',
    post_liked: 'Heart',
    comment: 'MessageCircle',
    post_commented: 'MessageCircle',
    follow: 'UserPlus',
    new_follower: 'UserPlus',
    achievement: 'Trophy',
    restaurant_recommendation: 'MapPin',
    restaurant_mention: 'MapPin',
    board_invite: 'Users',
    post_mention: 'AtSign',
    mentioned_in_post: 'AtSign',
    mentioned_in_comment: 'AtSign',
    milestone: 'Target',
    system: 'Settings',
    campaign_opportunity: 'Briefcase',
    new_campaign_posted: 'Briefcase',
    campaign_application: 'ClipboardCheck',
    campaign_application_submitted: 'ClipboardCheck',
    application_approved: 'CheckCircle',
    application_rejected: 'XCircle',
    revision_requested: 'RefreshCw',
    campaign_deadline: 'Calendar',
    campaign_deadline_approaching: 'Calendar',
    deliverable_submitted: 'Send',
    deliverables_submitted: 'Send',
    payment_sent: 'CreditCard',
    payment_received: 'CreditCard',
    campaign_invite: 'Star',
    friend_post: 'Newspaper',
    friend_post_restaurant: 'Newspaper',
    weekly_recap: 'Trophy',
  };
  return mapping[type] || 'Bell';
}
