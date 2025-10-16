import { supabase } from '@/lib/supabase'
import { mockUser, mockRestaurant, mockBoard, mockCommunity } from './mockFactories'

/**
 * Setup for integration tests that need real database access
 * NOTE: These tests should use a test/staging database, not production
 */

export interface TestResources {
  users: any[]
  restaurants: any[]
  boards: any[]
  communities: any[]
  cleanupFns: Array<() => Promise<void>>
}

export const setupIntegrationTest = async (): Promise<TestResources> => {
  const resources: TestResources = {
    users: [],
    restaurants: [],
    boards: [],
    communities: [],
    cleanupFns: [],
  }

  return resources
}

export const createTestUser = async (overrides?: Partial<any>) => {
  const user = mockUser(overrides)

  const { data, error } = await supabase.from('users').insert(user).select().single()

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`)
  }

  return data
}

export const createTestRestaurant = async (overrides?: Partial<any>) => {
  const restaurant = mockRestaurant(overrides)

  const { data, error } = await supabase.from('restaurants').insert(restaurant).select().single()

  if (error) {
    throw new Error(`Failed to create test restaurant: ${error.message}`)
  }

  return data
}

export const createTestBoard = async (userId: string, overrides?: Partial<any>) => {
  const board = mockBoard({ owner_id: userId, ...overrides })

  const { data, error } = await supabase.from('boards').insert(board).select().single()

  if (error) {
    throw new Error(`Failed to create test board: ${error.message}`)
  }

  return data
}

export const createTestCommunity = async (adminId: string, overrides?: Partial<any>) => {
  const community = mockCommunity({ admin_id: adminId, ...overrides })

  const { data, error } = await supabase.from('communities').insert(community).select().single()

  if (error) {
    throw new Error(`Failed to create test community: ${error.message}`)
  }

  return data
}

export const cleanupIntegrationTest = async (resources: TestResources) => {
  // Run all cleanup functions
  for (const cleanupFn of resources.cleanupFns) {
    try {
      await cleanupFn()
    } catch (error) {
      console.error('Cleanup error:', error)
    }
  }

  // Delete created resources in reverse order (to handle foreign keys)
  if (resources.communities.length > 0) {
    const ids = resources.communities.map((c) => c.id)
    await supabase.from('communities').delete().in('id', ids)
  }

  if (resources.boards.length > 0) {
    const ids = resources.boards.map((b) => b.id)
    await supabase.from('boards').delete().in('id', ids)
  }

  if (resources.restaurants.length > 0) {
    const ids = resources.restaurants.map((r) => r.id)
    await supabase.from('restaurants').delete().in('id', ids)
  }

  if (resources.users.length > 0) {
    const ids = resources.users.map((u) => u.id)
    await supabase.from('users').delete().in('id', ids)
  }
}

/**
 * Helper to register a cleanup function
 */
export const registerCleanup = (resources: TestResources, cleanupFn: () => Promise<void>) => {
  resources.cleanupFns.push(cleanupFn)
}
