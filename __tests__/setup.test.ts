import { mockUser, mockRestaurant, mockPost } from './helpers/mockFactories'
import { createMockSupabaseClient, mockSupabaseSuccess, mockSupabaseError } from './helpers/supabaseMocks'
import { UserBuilder, RestaurantBuilder, PostBuilder, BoardBuilder } from './helpers/testBuilders'

describe('Test Infrastructure Setup', () => {
  describe('Jest Configuration', () => {
    it('should have Jest configured correctly', () => {
      expect(true).toBe(true)
    })

    it('should support async/await', async () => {
      const promise = Promise.resolve('test')
      await expect(promise).resolves.toBe('test')
    })

    it('should have proper timeout configured', () => {
      expect(jest.getTimerCount).toBeDefined()
    })
  })

  describe('Mock Factories', () => {
    it('should generate valid user mocks', () => {
      const user = mockUser()

      expect(user).toHaveProperty('id')
      expect(user).toHaveProperty('username')
      expect(user).toHaveProperty('email')
      expect(user).toHaveProperty('account_type')
      expect(user.account_type).toBe('consumer')
    })

    it('should generate valid restaurant mocks', () => {
      const restaurant = mockRestaurant()

      expect(restaurant).toHaveProperty('id')
      expect(restaurant).toHaveProperty('name')
      expect(restaurant).toHaveProperty('city')
      expect(restaurant.city).toBe('Charlotte')
    })

    it('should generate valid post mocks', () => {
      const post = mockPost()

      expect(post).toHaveProperty('id')
      expect(post).toHaveProperty('user_id')
      expect(post).toHaveProperty('content')
      expect(post).toHaveProperty('post_type')
    })

    it('should allow overrides in mock factories', () => {
      const user = mockUser({ username: 'testuser', account_type: 'creator' })

      expect(user.username).toBe('testuser')
      expect(user.account_type).toBe('creator')
    })
  })

  describe('Supabase Mocks', () => {
    it('should create mock Supabase client', () => {
      const client = createMockSupabaseClient()

      expect(client.from).toBeDefined()
      expect(client.auth).toBeDefined()
      expect(client.storage).toBeDefined()
    })

    it('should create mock Supabase queries', () => {
      const client = createMockSupabaseClient()
      const query = client.from('users')

      expect(query.select).toBeDefined()
      expect(query.insert).toBeDefined()
      expect(query.update).toBeDefined()
      expect(query.delete).toBeDefined()
      expect(query.eq).toBeDefined()
    })

    it('should create success responses', () => {
      const response = mockSupabaseSuccess({ id: '123', name: 'test' })

      expect(response.data).toEqual({ id: '123', name: 'test' })
      expect(response.error).toBeNull()
    })

    it('should create error responses', () => {
      const response = mockSupabaseError('Test error', 'TEST_CODE')

      expect(response.data).toBeNull()
      expect(response.error).toBeDefined()
      expect(response.error?.message).toBe('Test error')
      expect(response.error?.code).toBe('TEST_CODE')
    })
  })

  describe('Test Builders', () => {
    it('should build users with UserBuilder', () => {
      const user = new UserBuilder()
        .withUsername('testuser')
        .withEmail('test@example.com')
        .asCreator()
        .build()

      expect(user.username).toBe('testuser')
      expect(user.email).toBe('test@example.com')
      expect(user.account_type).toBe('creator')
      expect(user.is_verified).toBe(true)
    })

    it('should build restaurants with RestaurantBuilder', () => {
      const restaurant = new RestaurantBuilder()
        .withName('Test Restaurant')
        .inCity('New York', 'NY')
        .withRating(4.5)
        .build()

      expect(restaurant.name).toBe('Test Restaurant')
      expect(restaurant.city).toBe('New York')
      expect(restaurant.state).toBe('NY')
      expect(restaurant.google_rating).toBe(4.5)
    })

    it('should build posts with PostBuilder', () => {
      const userId = 'user-123'
      const restaurantId = 'rest-456'

      const post = new PostBuilder()
        .byUser(userId)
        .forRestaurant(restaurantId)
        .withContent('Great food!')
        .build()

      expect(post.user_id).toBe(userId)
      expect(post.restaurant_id).toBe(restaurantId)
      expect(post.content).toBe('Great food!')
      expect(post.post_type).toBe('review')
    })

    it('should build boards with BoardBuilder', () => {
      const board = new BoardBuilder()
        .ownedBy('user-123')
        .named('My Favorites')
        .asPrivate()
        .build()

      expect(board.owner_id).toBe('user-123')
      expect(board.name).toBe('My Favorites')
      expect(board.type).toBe('private')
      expect(board.is_public).toBe(false)
    })
  })

  describe('Custom Matchers', () => {
    it('should have toBeValidUser matcher', () => {
      const user = mockUser()
      expect(user).toBeValidUser()
    })

    it('should have toBeValidRestaurant matcher', () => {
      const restaurant = mockRestaurant()
      expect(restaurant).toBeValidRestaurant()
    })

    it('should have toHaveSupabaseSuccessResponse matcher', () => {
      const response = mockSupabaseSuccess({ id: '123' })
      expect(response).toHaveSupabaseSuccessResponse()
    })

    it('should have toHaveSupabaseErrorResponse matcher', () => {
      const response = mockSupabaseError('Error')
      expect(response).toHaveSupabaseErrorResponse()
    })

    it('should have toBeValidUUID matcher', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000'
      expect(uuid).toBeValidUUID()
    })
  })

  describe('Module Imports', () => {
    it('should have testing library matchers available', () => {
      // If this test runs, the testing library was imported successfully in jest.setup.js
      expect(expect).toBeDefined()
      expect(expect().toBeOnTheScreen).toBeDefined()
    })

    it('should import faker', () => {
      const { faker } = require('@faker-js/faker')
      expect(faker).toBeDefined()
      expect(faker.string.uuid()).toBeTruthy()
    })
  })
})
