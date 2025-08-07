import { communityService } from '@/services/communityService';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('CommunityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear service cache before each test
    communityService.clearAllCache();
  });

  describe('joinCommunity', () => {
    const userId = 'test-user-id';
    const communityId = 'test-community-id';

    it('should successfully join a community when not already a member', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await communityService.joinCommunity(userId, communityId);

      expect(result).toEqual({ success: true });
      expect(mockFrom.insert).toHaveBeenCalledWith({
        user_id: userId,
        community_id: communityId,
        role: 'member',
        status: 'active',
      });
    });

    it('should return success when already an active member', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { id: 'member-id', status: 'active' }, 
          error: null 
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await communityService.joinCommunity(userId, communityId);

      expect(result).toEqual({ success: true });
    });

    it('should reactivate membership when previously declined', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { id: 'member-id', status: 'declined' }, 
          error: null 
        }),
        update: jest.fn().mockResolvedValue({ error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await communityService.joinCommunity(userId, communityId);

      expect(result).toEqual({ success: true });
      expect(mockFrom.update).toHaveBeenCalledWith({
        status: 'active',
        joined_at: expect.any(String),
      });
    });

    it('should handle duplicate key error gracefully', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { code: '23505', message: 'Duplicate key' } 
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await communityService.joinCommunity(userId, communityId);

      expect(result).toEqual({ success: true });
    });

    it('should return error for other database errors', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { code: 'OTHER_ERROR', message: 'Database error' } 
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await communityService.joinCommunity(userId, communityId);

      expect(result).toEqual({ 
        success: false, 
        error: 'Failed to join community' 
      });
    });
  });

  describe('leaveCommunity', () => {
    const userId = 'test-user-id';
    const communityId = 'test-community-id';

    it('should successfully leave a community as a member', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { role: 'member' }, 
          error: null 
        }),
        delete: jest.fn().mockReturnThis(),
      };

      // Setup chain for delete operation
      const deleteChain = {
        eq: jest.fn().mockReturnThis(),
      };
      deleteChain.eq.mockResolvedValue({ error: null });
      mockFrom.delete.mockReturnValue(deleteChain);

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await communityService.leaveCommunity(userId, communityId);

      expect(result).toEqual({ success: true });
    });

    it('should return success when not a member', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { code: 'PGRST116', message: 'No rows found' } 
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await communityService.leaveCommunity(userId, communityId);

      expect(result).toEqual({ success: true });
    });

    it('should prevent owners from leaving their community', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { role: 'owner' }, 
          error: null 
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await communityService.leaveCommunity(userId, communityId);

      expect(result).toEqual({ 
        success: false, 
        error: 'Owners cannot leave their own community' 
      });
    });

    it('should handle database errors', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { role: 'member' }, 
          error: null 
        }),
        delete: jest.fn().mockReturnThis(),
      };

      const deleteChain = {
        eq: jest.fn().mockReturnThis(),
      };
      deleteChain.eq.mockResolvedValue({ 
        error: { message: 'Database error' } 
      });
      mockFrom.delete.mockReturnValue(deleteChain);

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await communityService.leaveCommunity(userId, communityId);

      expect(result).toEqual({ 
        success: false, 
        error: 'Failed to leave community' 
      });
    });
  });

  describe('createCommunity', () => {
    const userId = 'test-user-id';
    const formData = {
      name: 'Test Community',
      description: 'A test community',
      location: 'Test City',
      type: 'public' as const,
      is_event_based: false,
    };

    it('should successfully create a community and add owner', async () => {
      const mockCommunity = {
        id: 'new-community-id',
        ...formData,
        admin_id: userId,
        member_count: 1,
      };

      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: mockCommunity, 
          error: null 
        }),
      };

      // First call for creating community
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockFrom)
        // Second call for adding owner as member
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ error: null }),
        });

      const result = await communityService.createCommunity(userId, formData);

      expect(result).toEqual({ 
        community: mockCommunity, 
        error: null 
      });
    });

    it('should return community even if adding owner fails', async () => {
      const mockCommunity = {
        id: 'new-community-id',
        ...formData,
        admin_id: userId,
        member_count: 1,
      };

      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: mockCommunity, 
          error: null 
        }),
      };

      // First call for creating community
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockFrom)
        // Second call for adding owner as member fails
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ 
            error: { message: 'Failed to add owner' } 
          }),
        });

      const result = await communityService.createCommunity(userId, formData);

      expect(result).toEqual({ 
        community: mockCommunity, 
        error: null 
      });
    });

    it('should handle community creation failure', async () => {
      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Creation failed' } 
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await communityService.createCommunity(userId, formData);

      expect(result).toEqual({ 
        community: null, 
        error: 'Failed to create community' 
      });
    });
  });

  describe('deleteCommunity', () => {
    const communityId = 'test-community-id';

    it('should successfully delete a community', async () => {
      const mockFrom = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await communityService.deleteCommunity(communityId);

      expect(result).toEqual({ success: true });
      expect(mockFrom.delete).toHaveBeenCalled();
    });

    it('should handle deletion errors', async () => {
      const mockFrom = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ 
          error: { message: 'Delete failed' } 
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await communityService.deleteCommunity(communityId);

      expect(result).toEqual({ 
        success: false, 
        error: 'Failed to delete community' 
      });
    });
  });
});