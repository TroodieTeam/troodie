import { expect } from '@jest/globals'

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUser(): R
      toBeValidRestaurant(): R
      toHaveSupabaseSuccessResponse(): R
      toHaveSupabaseErrorResponse(): R
      toBeValidUUID(): R
    }
  }
}

expect.extend({
  toBeValidUser(received: any) {
    const pass =
      received &&
      typeof received === 'object' &&
      typeof received.id === 'string' &&
      typeof received.username === 'string' &&
      typeof received.email === 'string' &&
      ['consumer', 'creator', 'business'].includes(received.account_type)

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${JSON.stringify(received)} not to be a valid user`
          : `Expected ${JSON.stringify(received)} to be a valid user with id, username, email, and account_type`,
    }
  },

  toBeValidRestaurant(received: any) {
    const pass =
      received &&
      typeof received === 'object' &&
      typeof received.id === 'string' &&
      typeof received.name === 'string' &&
      typeof received.city === 'string'

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${JSON.stringify(received)} not to be a valid restaurant`
          : `Expected ${JSON.stringify(received)} to be a valid restaurant with id, name, and city`,
    }
  },

  toHaveSupabaseSuccessResponse(received: any) {
    const pass = received && received.data !== undefined && received.data !== null && !received.error

    return {
      pass,
      message: () =>
        pass
          ? `Expected response not to be a Supabase success response`
          : `Expected response to have data and no error, got: ${JSON.stringify(received)}`,
    }
  },

  toHaveSupabaseErrorResponse(received: any) {
    const pass = received && received.error !== null && !received.data

    return {
      pass,
      message: () =>
        pass
          ? `Expected response not to be a Supabase error response`
          : `Expected response to have error and no data, got: ${JSON.stringify(received)}`,
    }
  },

  toBeValidUUID(received: any) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const pass = typeof received === 'string' && uuidRegex.test(received)

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid UUID`
          : `Expected ${received} to be a valid UUID format`,
    }
  },
})

export {}
