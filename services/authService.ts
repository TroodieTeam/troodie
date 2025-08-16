import { supabase } from '@/lib/supabase'
import { AuthError, Session } from '@supabase/supabase-js'

export interface AuthResponse {
  success: boolean
  error?: string
  session?: Session | null
}

export interface OtpResponse {
  success: boolean
  error?: string
  messageId?: string | null
}

export const authService = {
  /**
   * Sign up a new user with email OTP
   * According to Supabase docs, signInWithOtp will create user if doesn't exist
   */
  async signUpWithEmail(email: string): Promise<OtpResponse> {
    try {
      // Special case for App Review account
      if (email.toLowerCase() === 'review@troodieapp.com') {
        console.log('[AuthService] App Review account detected in signup, OTP will be bypassed with code 000000')
        // Don't call Supabase to avoid signup restrictions
        return {
          success: true,
          messageId: null,
        }
      }
      
      // Use signInWithOtp which will create the user automatically
      // Don't check users table first as it might not have the profile yet
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Allow user creation for signup
          shouldCreateUser: true,
          emailRedirectTo: undefined,
        },
      })
      
      if (error) {
        console.error('[AuthService] Sign up OTP error:', error)
        
        // If user already exists (will get a specific error)
        if (error.message?.includes('User already registered') || 
            error.message?.includes('already been registered')) {
          return {
            success: false,
            error: 'An account with this email already exists. Please sign in instead.',
          }
        }
        
        // If signups are disabled
        if (error.message?.includes('Signups not allowed')) {
          return {
            success: false,
            error: 'Sign ups are temporarily disabled. Please contact support.',
          }
        }
        
        
        return {
          success: false,
          error: this.getErrorMessage(error),
        }
      }
      
      
      return {
        success: true,
        messageId: data?.messageId,
      }
    } catch (error) {
      console.error('[AuthService] Unexpected sign up error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
      }
    }
  },

  /**
   * Sign in an existing user with email OTP
   */
  async signInWithEmail(email: string): Promise<OtpResponse> {
    try {
      // Special case for App Review account
      if (email.toLowerCase() === 'review@troodieapp.com') {
        console.log('[AuthService] App Review account detected, OTP will be bypassed with code 000000')
        // Do not call Supabase in review flow to avoid signup restrictions
        return {
          success: true,
          messageId: null,
        }
      }
      
      // Use signInWithOtp with shouldCreateUser: false for login
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false, // Prevent creating new users on login
          emailRedirectTo: undefined,
        },
      })
      
      if (error) {
        console.error('[AuthService] Sign in OTP error:', error)
        
        // Handle user not found
        if (error.message?.includes('User not found') || 
            error.message?.includes('not registered') ||
            error.status === 400) {
          return {
            success: false,
            error: 'No account found with this email. Please sign up first.',
          }
        }

        // Some Supabase configurations return this when the user doesn't exist and signups are disabled
        if (error.message?.includes('Signups not allowed')) {
          return {
            success: false,
            error: 'No account found with this email.',
          }
        }
        
        return {
          success: false,
          error: this.getErrorMessage(error),
        }
      }
      
      return {
        success: true,
        messageId: data?.messageId,
      }
    } catch (error) {
      console.error('[AuthService] Unexpected sign in error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
      }
    }
  },

  /**
   * Verify the OTP sent to the user's email
   */
  async verifyOtp(email: string, token: string): Promise<AuthResponse> {
    try {
      // Special handling for App Store Review account with password auth
      if (email.toLowerCase() === 'review@troodieapp.com' && token === '000000') {
        console.log('[AuthService] App Review account detected, using password authentication')
        
        try {
          // Use password authentication for the review account
          // Password: ReviewPass000000
          const { data, error } = await supabase.auth.signInWithPassword({
            email: 'review@troodieapp.com',
            password: 'ReviewPass000000'
          })
          
          if (error) {
            console.error('[AuthService] Password auth error:', error)
            
            // If password auth fails, try setting it up first
            if (error.message?.includes('Invalid login credentials')) {
              return {
                success: false,
                error: 'Review account not configured. Please run setup-review-password function.',
              }
            }
            
            return {
              success: false,
              error: this.getErrorMessage(error),
            }
          }
          
          if (!data.session) {
            console.error('[AuthService] No session returned from password auth')
            return {
              success: false,
              error: 'Authentication failed. No session created.',
            }
          }
          
          console.log('[AuthService] Review account authenticated successfully with password')
          
          // Return the real session from password auth
          return {
            success: true,
            session: data.session,
          }
        } catch (err) {
          console.error('[AuthService] Error in review account password auth:', err)
          return {
            success: false,
            error: 'Review account authentication failed',
          }
        }
      }
      
      // Normal OTP verification flow
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      })
      
      if (error) {
        console.error('[AuthService] OTP verification error:', error)
        return {
          success: false,
          error: this.getErrorMessage(error),
        }
      }
      
      if (!data.session) {
        console.error('[AuthService] No session returned from OTP verification')
        return {
          success: false,
          error: 'Verification failed. Please try again.',
        }
      }
      
      // After successful verification, ensure user profile exists
      if (data.user) {
        
        // Use the ensure_user_profile function to handle this properly
        const { error: profileError } = await supabase.rpc('ensure_user_profile', {
          p_user_id: data.user.id,
          p_email: email
        })
        
        if (profileError) {
          console.error('[AuthService] Error ensuring profile exists:', profileError)
          // Don't fail the login, profile creation is not critical
        } else {
        }
      }
      
      return {
        success: true,
        session: data.session,
      }
    } catch (error) {
      console.error('[AuthService] Unexpected error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
      }
    }
  },

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error),
        }
      }
      
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to sign out. Please try again.',
      }
    }
  },

  /**
   * Get the current session
   */
  async getSession(): Promise<Session | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
        return null
      }
      
      return session
    } catch (error) {
      console.error('Unexpected error getting session:', error)
      return null
    }
  },

  /**
   * Update user email (requires re-authentication)
   */
  async updateEmail(newEmail: string): Promise<OtpResponse> {
    try {
      const { data, error } = await supabase.auth.updateUser({
        email: newEmail,
      })
      
      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error),
        }
      }
      
      // This will send a verification email to the new address
      return {
        success: true,
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update email. Please try again.',
      }
    }
  },

  /**
   * Resend OTP to the user's email
   */
  async resendOtp(email: string, type: 'signup' | 'login' = 'login'): Promise<OtpResponse> {
    try {
      // Short-circuit for App Review account to avoid calling Supabase
      if (email.toLowerCase() === 'review@troodieapp.com') {
        return {
          success: true,
          messageId: null,
        }
      }
      
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // For signup, allow user creation; for login, don't
          shouldCreateUser: type === 'signup',
          emailRedirectTo: undefined,
        },
      })
      
      if (error) {
        console.error('[AuthService] Resend OTP error:', error)
        
        // Handle rate limiting specifically
        if (error.message?.includes('rate limit') || error.status === 429) {
          const match = error.message.match(/(\d+) seconds?/);
          const seconds = match ? match[1] : '60';
          return {
            success: false,
            error: `Please wait ${seconds} seconds before requesting another code.`,
          }
        }
        
        return {
          success: false,
          error: this.getErrorMessage(error),
        }
      }
      
      return {
        success: true,
        messageId: data?.messageId,
      }
    } catch (error) {
      console.error('[AuthService] Unexpected resend error:', error)
      return {
        success: false,
        error: 'Failed to resend code. Please try again.',
      }
    }
  },

  /**
   * Convert Supabase auth errors to user-friendly messages
   */
  getErrorMessage(error: AuthError): string {
    // Handle rate limiting (OTP can only be requested once every 60 seconds)
    if (error.message?.includes('rate limit') || 
        error.message?.includes('too many requests') ||
        error.status === 429) {
      const match = error.message?.match(/(\d+) seconds?/);
      const seconds = match ? match[1] : '60';
      return `Please wait ${seconds} seconds before requesting another code.`
    }
    
    // Handle invalid OTP
    if (error.message?.includes('invalid') && error.message?.includes('otp')) {
      return 'Invalid verification code. Please check and try again.'
    }
    
    // Handle expired OTP (expires after 1 hour by default)
    if (error.message?.includes('expired')) {
      return 'Verification code has expired. Please request a new one.'
    }
    
    // Handle user not found/not registered
    if (error.message?.includes('User not found') || 
        error.message?.includes('not registered') ||
        error.message?.includes('not exist')) {
      return 'No account found with this email. Please sign up first.'
    }
    
    // Handle network errors
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return 'Network error. Please check your connection and try again.'
    }
    
    // Handle invalid email
    if (error.message?.includes('email') && error.message?.includes('invalid')) {
      return 'Please enter a valid email address.'
    }
    
    // Default error message
    return error.message || 'An error occurred. Please try again.'
  },

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  /**
   * Check if we should show rate limit warning
   */
  shouldShowRateLimit(lastRequestTime: number | null): { limited: boolean; secondsRemaining: number } {
    if (!lastRequestTime) {
      return { limited: false, secondsRemaining: 0 }
    }
    
    const RATE_LIMIT_SECONDS = 60
    const now = Date.now()
    const timeSinceLastRequest = (now - lastRequestTime) / 1000
    
    if (timeSinceLastRequest < RATE_LIMIT_SECONDS) {
      return {
        limited: true,
        secondsRemaining: Math.ceil(RATE_LIMIT_SECONDS - timeSinceLastRequest),
      }
    }
    
    return { limited: false, secondsRemaining: 0 }
  },

  /**
   * Get the current user ID
   */
  async getCurrentUserId(): Promise<string | null> {
    try {
      const session = await this.getSession()
      return session?.user?.id || null
    } catch (error) {
      console.error('Error getting current user ID:', error)
      return null
    }
  },
}