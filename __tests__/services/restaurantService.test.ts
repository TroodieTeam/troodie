import { restaurantService } from '@/services/restaurantService';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('RestaurantService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTopRatedRestaurants', () => {
    it('should fetch top rated restaurants for a specific city', async () => {
      const mockRestaurants = [
        { id: '1', name: 'Restaurant 1', city: 'Charlotte', google_rating: 4.5 },
        { id: '2', name: 'Restaurant 2', city: 'Charlotte', google_rating: 4.8 },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockRestaurants, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await restaurantService.getTopRatedRestaurants('Charlotte');

      expect(supabase.from).toHaveBeenCalledWith('restaurants');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.not).toHaveBeenCalledWith('google_rating', 'is', null);
      expect(mockQuery.order).toHaveBeenCalledWith('google_rating', { ascending: false });
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(mockQuery.eq).toHaveBeenCalledWith('city', 'Charlotte');
      expect(result).toEqual(mockRestaurants);
    });

    it('should return fallback restaurants when city has no restaurants', async () => {
      const fallbackRestaurants = [
        { id: '3', name: 'Restaurant 3', city: 'Charlotte', google_rating: 4.2 },
      ];

      const mockEmptyQuery = {
        select: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      const mockFallbackQuery = {
        select: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: fallbackRestaurants, error: null }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockEmptyQuery)
        .mockReturnValueOnce(mockFallbackQuery);

      const result = await restaurantService.getTopRatedRestaurants('New York');

      expect(result).toEqual(fallbackRestaurants);
      expect(supabase.from).toHaveBeenCalledTimes(2);
    });

    it('should handle errors gracefully', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await restaurantService.getTopRatedRestaurants('Charlotte');

      expect(result).toEqual([]);
    });
  });

  describe('getAvailableCities', () => {
    it('should fetch unique cities from restaurants', async () => {
      const mockCityData = [
        { city: 'Charlotte' },
        { city: 'Charlotte' },
        { city: 'New York' },
        { city: 'Los Angeles' },
        { city: 'New York' },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockCityData, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await restaurantService.getAvailableCities();

      expect(supabase.from).toHaveBeenCalledWith('restaurants');
      expect(mockQuery.select).toHaveBeenCalledWith('city');
      expect(mockQuery.not).toHaveBeenCalledWith('city', 'is', null);
      expect(mockQuery.order).toHaveBeenCalledWith('city');
      expect(result).toEqual(['Charlotte', 'New York', 'Los Angeles']);
    });

    it('should return default cities on error', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await restaurantService.getAvailableCities();

      expect(result).toEqual(['Charlotte', 'New York', 'Los Angeles', 'Chicago']);
    });

    it('should handle null city values', async () => {
      const mockCityData = [
        { city: 'Charlotte' },
        { city: null },
        { city: 'New York' },
        { city: undefined },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockCityData, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await restaurantService.getAvailableCities();

      expect(result).toEqual(['Charlotte', 'New York']);
    });
  });
});