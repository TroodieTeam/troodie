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
   */
  async signUpWithEmail(email: string): Promise<OtpResponse> {
    try {
      // First, try to send OTP for existing user
      const { data: existingOtp, error: existingError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: undefined,
        },
      })
      
      if (!existingError) {
        return {
          success: true,
          messageId: existingOtp?.messageId,
        }
      }
      
      // User doesn't exist, create them manually using our function
      const { data: createResult, error: createError } = await supabase.rpc('create_new_user', {
        user_email: email
      })
      
      if (createError) {
        return {
          success: false,
          error: 'Unable to create account. Please try again.',
        }
      }
      
      // Account created, now try to send OTP
      const { data: newUserOtp, error: newUserOtpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false, // User already exists
          emailRedirectTo: undefined,
        },
      })
      
      if (newUserOtpError) {
        // Account exists but OTP failed - return success anyway, they can use sign in
        return {
          success: true,
          messageId: 'ACCOUNT_CREATED_NO_OTP', // Flag to show "Please sign in" message
        }
      }
      
      // Both account creation and OTP sending succeeded
      return {
        success: true,
        messageId: newUserOtp?.messageId,
      }
    } catch (error) {
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
      console.log('[AuthService] Attempting to sign in user with email:', email)
      
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: undefined,
        },
      })
      
      if (error) {
        console.error('[AuthService] Sign in OTP error:', error)
        
        // If user not found, they might need to sign up
        if (error.message?.includes('not found') || error.message?.includes('not exist')) {
          return {
            success: false,
            error: 'No account found with this email. Please sign up first.',
          }
        }
        
        // If OTP is disabled, suggest alternative
        if (error.message?.includes('Signups not allowed for otp')) {
          return {
            success: false,
            error: 'Email verification is temporarily unavailable. Please try again later.',
          }
        }
        
        return {
          success: false,
          error: this.getErrorMessage(error),
        }
      }
      
      console.log('[AuthService] Sign in OTP sent successfully, messageId:', data?.messageId)
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
        console.log('[AuthService] Ensuring user profile exists...')
        
        // Check if profile exists
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from('users')
          .select('id')
          .eq('id', data.user.id)
          .single()
        
        if (profileCheckError && profileCheckError.code === 'PGRST116') {
          // Profile doesn't exist, create it
          console.log('[AuthService] Creating user profile after verification...')
          const { error: createError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
          
          if (createError) {
            console.error('[AuthService] Failed to create profile after verification:', createError)
            
            // Try using the function as fallback
            const { error: funcError } = await supabase.rpc('create_user_profile', {
              user_id: data.user.id,
              user_email: email
            })
            
            if (funcError) {
              console.error('[AuthService] Function fallback also failed:', funcError)
            } else {
              console.log('[AuthService] Profile created via function fallback')
            }
          } else {
            console.log('[AuthService] User profile created successfully after verification')
          }
        } else if (!profileCheckError) {
          console.log('[AuthService] User profile already exists')
        } else {
          console.error('[AuthService] Error checking profile existence:', profileCheckError)
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
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: type === 'signup',
          emailRedirectTo: undefined,
        },
      })
      
      if (error) {
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
    // Handle rate limiting
    if (error.message?.includes('rate limit') || error.message?.includes('too many requests')) {
      return 'Too many attempts. Please wait a moment before trying again.'
    }
    
    // Handle invalid OTP
    if (error.message?.includes('invalid') && error.message?.includes('otp')) {
      return 'Invalid verification code. Please check and try again.'
    }
    
    // Handle expired OTP
    if (error.message?.includes('expired')) {
      return 'Verification code has expired. Please request a new one.'
    }
    
    // Handle user not found
    if (error.message?.includes('user not found') || error.message?.includes('not exist')) {
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
}