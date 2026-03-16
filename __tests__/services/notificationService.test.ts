import { NotificationService } from '@/services/notificationService';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationService();
  });

  const mockNotification = {
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
    created_at: '2026-03-13T00:00:00Z',
  };

  describe('getUserNotifications', () => {
    it('should return sorted notifications with default pagination', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockNotification],
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await service.getUserNotifications('user-1');

      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(mockFrom.select).toHaveBeenCalledWith('*');
      expect(mockFrom.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockFrom.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockFrom.range).toHaveBeenCalledWith(0, 49);
      expect(result).toEqual([mockNotification]);
    });

    it('should apply custom limit and offset', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await service.getUserNotifications('user-1', 20, 40);

      expect(mockFrom.range).toHaveBeenCalledWith(40, 59);
    });

    it('should return empty array when data is null', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await service.getUserNotifications('user-1');

      expect(result).toEqual([]);
    });

    it('should throw on error', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(service.getUserNotifications('user-1')).rejects.toThrow(
        'Failed to fetch notifications: Database error'
      );
    });
  });

  describe('markAsRead', () => {
    it('should update single notification as read', async () => {
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await service.markAsRead('notif-1');

      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(mockFrom.update).toHaveBeenCalledWith({ is_read: true });
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'notif-1');
    });

    it('should throw on error', async () => {
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Update failed' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(service.markAsRead('notif-1')).rejects.toThrow(
        'Failed to mark notification as read: Update failed'
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread notifications for user', async () => {
      const eqMock = jest.fn();
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: eqMock,
      };

      // First .eq('user_id', ...) returns this for chaining
      eqMock.mockReturnValueOnce(mockFrom);
      // Second .eq('is_read', false) resolves
      eqMock.mockResolvedValueOnce({ error: null });

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await service.markAllAsRead('user-1');

      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(mockFrom.update).toHaveBeenCalledWith({ is_read: true });
      expect(eqMock).toHaveBeenCalledWith('user_id', 'user-1');
      expect(eqMock).toHaveBeenCalledWith('is_read', false);
    });

    it('should throw on error', async () => {
      const eqMock = jest.fn();
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: eqMock,
      };

      eqMock.mockReturnValueOnce(mockFrom);
      eqMock.mockResolvedValueOnce({
        error: { message: 'Bulk update failed' },
      });

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(service.markAllAsRead('user-1')).rejects.toThrow(
        'Failed to mark all notifications as read: Bulk update failed'
      );
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification by id', async () => {
      const mockFrom = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await service.deleteNotification('notif-1');

      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(mockFrom.delete).toHaveBeenCalled();
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'notif-1');
    });

    it('should throw on error', async () => {
      const mockFrom = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Delete failed' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(service.deleteNotification('notif-1')).rejects.toThrow(
        'Failed to delete notification: Delete failed'
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count from rpc', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: 5,
        error: null,
      });

      const count = await service.getUnreadCount('user-1');

      expect(supabase.rpc).toHaveBeenCalledWith('get_unread_notification_count', {
        user_uuid: 'user-1',
      });
      expect(count).toBe(5);
    });

    it('should return 0 when data is null', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      const count = await service.getUnreadCount('user-1');

      expect(count).toBe(0);
    });

    it('should throw on error', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      });

      await expect(service.getUnreadCount('user-1')).rejects.toThrow(
        'Failed to get unread count: RPC failed'
      );
    });
  });
});
