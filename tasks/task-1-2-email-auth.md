# Task 1.2: Supabase Email OTP Authentication System Implementation

**Epic:** Backend Infrastructure & Database Setup  
**Priority:** Critical  
**Estimate:** 2 days  
**Status:** 🔴 Not Started

## Overview
Implement email-based authentication using Supabase's One-Time Password (OTP) system to provide secure, passwordless login functionality for the Troodie app.

## Business Value
- Simplified user onboarding without password management
- Improved security by reducing password-related vulnerabilities
- Better user experience with passwordless authentication
- No external SMS service dependencies or costs

## Dependencies
- Task 1.1: Supabase Backend Setup (must be completed first)

## Blocks
- Task 2.1: Charlotte Restaurant Seeding
- Task 3.1: Restaurant Save Functionality

---

## Acceptance Criteria

```gherkin
Feature: Supabase Email Authentication with One-Time Passwords
  As a user
  I want to authenticate using my email address via Supabase OTP
  So that I can securely access the app without passwords

Background:
  Given Supabase email authentication is enabled by default
  And the Magic Link email template is modified to include {{ .Token }} variable
  And rate limiting is set to 60 seconds between OTP requests
  And OTPs expire after 1 hour
  And CAPTCHA protection is enabled for production

Scenario: Email Registration with OTP
  Given I am on the signup screen
  When I enter a valid email address "user@example.com"
  And I tap "Send Code"
  Then the system should call supabase.auth.signInWithOtp() with:
    | Parameter | Value |
    | email | "user@example.com" |
    | options.shouldCreateUser | true |
  And I should receive an email with a 6-digit OTP within 30 seconds
  And I should be navigated to the verification screen
  And the response should be:
    ```json
    {
      "data": {
        "user": null,
        "session": null
      },
      "error": null
    }
    ```

Scenario: Valid Email OTP Verification
  Given I have received a verification code "123456" in my email
  And I am on the verification screen
  When I enter the correct 6-digit OTP
  And I tap "Verify"
  Then the system should call supabase.auth.verifyOtp() with:
    | Parameter | Value |
    | email | "user@example.com" |
    | token | "123456" |
    | type | "email" |
  And I should receive a valid session response:
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "token_type": "bearer",
      "expires_in": 3600,
      "refresh_token": "LSp8LglPPvf0DxGMSj-vaQ",
      "user": {...}
    }
    ```
  And I should be navigated to the onboarding flow

Scenario: Invalid Email OTP Verification
  Given I have received a verification code in my email
  When I enter an incorrect OTP "999999"
  And I tap "Verify"
  Then I should see an error message "Invalid verification code"
  And I should remain on the verification screen
  And I should be able to request a new code

Scenario: OTP Expiration Handling
  Given I have received a verification code
  When 1 hour has passed since receiving the code
  And I try to verify with the original code
  Then I should see an error message "Verification code has expired"
  And I should be prompted to request a new code

Scenario: Rate Limiting Protection
  Given I have already requested an OTP
  When I try to request another OTP within 60 seconds
  Then I should see an error message "Please wait before requesting another code"
  And the "Send Code" button should be disabled
  And I should see a countdown timer showing remaining wait time

Scenario: Existing User Login
  Given I am an existing user with email "existing@example.com"
  When I request an OTP for login
  Then the system should send an OTP without creating a new account
  And I should be able to verify and access my existing profile
  And my previous data should be preserved

Scenario: Prevent Auto-Signup for Login Flow
  Given I am on the login screen (not signup)
  When I enter an email that doesn't exist "nonexistent@example.com"
  And I call signInWithOtp with shouldCreateUser: false
  Then I should receive an error indicating the email doesn't exist
  And no new account should be created
  And I should be prompted to sign up instead

Scenario: Authentication Session Persistence
  Given I have successfully authenticated with email OTP
  When I close and reopen the app
  Then my session should be automatically restored
  And I should be taken directly to the main app
  And the access token should be valid for API requests

Scenario: Email Template Configuration
  Given the email OTP feature is configured
  When a user requests an OTP
  Then the email template should include:
    | Element | Content |
    | Subject | "Your Troodie verification code" |
    | Header | "One time login code" |
    | Code Display | "Please enter this code: {{ .Token }}" |
    | Expiry Notice | "This code expires in 1 hour" |
    | Branding | Troodie logo and styling |

Scenario: Email Validation and Error Handling
  Given various email input scenarios
  When I enter different email formats
  Then the system should handle validation:
    | Email Input | Validation Result |
    | "valid@example.com" | Accepted, OTP sent |
    | "invalid-email" | Error: "Please enter a valid email" |
    | "" | Error: "Email is required" |
    | "test@" | Error: "Please enter a valid email" |
    | "user@domain" | Error: "Please enter a valid email" |

Scenario: Email Delivery and Spam Prevention
  Given OTP emails are being sent
  When users request verification codes
  Then emails should be delivered successfully with:
    | Requirement | Implementation |
    | SPF/DKIM configured | Prevent spam filtering |
    | From address verified | Use verified sender |
    | Reasonable rate limits | Prevent abuse |
    | Clear subject lines | Avoid spam triggers |

Scenario: Network Error Handling
  Given network connectivity issues may occur
  When authentication requests fail due to network problems
  Then I should see appropriate error messages:
    | Error Condition | User Message |
    | No internet connection | "Check your internet connection" |
    | Supabase service down | "Service temporarily unavailable" |
    | Timeout during request | "Request timed out. Please try again" |
  And I should have options to retry the operation

Scenario: Multiple Device Support
  Given I am logged in on one device
  When I log in with the same email on another device
  Then both sessions should remain valid
  And I should be able to use the app on both devices
  And logging out on one device should not affect the other

Scenario: Email Change for Existing Users
  Given I am an authenticated user with email "old@example.com"
  When I want to update my email to "new@example.com"
  Then I should be able to request an OTP for the new email
  And verify the change with the OTP
  And my account should be updated with the new email address
  And I should remain logged in after the change
```

---

## Technical Implementation

### Authentication Service
```typescript
// services/authService.ts
import { supabase } from '@/lib/supabase'

export const authService = {
  async signUpWithEmail(email: string) {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    })
    
    if (error) throw error
    return data
  },

  async signInWithEmail(email: string) {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    })
    
    if (error) throw error
    return data
  },

  async verifyOtp(email: string, token: string) {
    const {
      data: { session },
      error,
    } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })

    if (error) throw error
    return session
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session
  },
}
```

### Authentication Context
```typescript
// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { authService } from '@/services/authService'

type AuthContextType = {
  user: User | null
  session: Session | null
  signUpWithEmail: (email: string) => Promise<void>
  signInWithEmail: (email: string) => Promise<void>
  verifyOtp: (email: string, token: string) => Promise<void>
  signOut: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    authService.getSession().then((session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUpWithEmail = async (email: string) => {
    await authService.signUpWithEmail(email)
  }

  const signInWithEmail = async (email: string) => {
    await authService.signInWithEmail(email)
  }

  const verifyOtp = async (email: string, token: string) => {
    await authService.verifyOtp(email, token)
  }

  const signOut = async () => {
    await authService.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      signUpWithEmail,
      signInWithEmail,
      verifyOtp,
      signOut,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

### Email Template Configuration
```html
<!-- Email Template for OTP -->
<h2>Welcome to Troodie!</h2>
<p>Your verification code is:</p>
<h1 style="font-size: 32px; color: #FFAD27; text-align: center; letter-spacing: 4px;">
  {{ .Token }}
</h1>
<p>This code will expire in 1 hour.</p>
<p>If you didn't request this code, please ignore this email.</p>
```

### Screen Implementation Updates
```typescript
// app/onboarding/signup.tsx
import { useAuth } from '@/contexts/AuthContext'

export default function SignupScreen() {
  const { signUpWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSendOtp = async () => {
    setLoading(true)
    try {
      await signUpWithEmail(email)
      router.push('/onboarding/verify')
    } catch (error) {
      console.error('Signup error:', error)
      // Show error message
    } finally {
      setLoading(false)
    }
  }

  // UI implementation...
}

// app/onboarding/verify.tsx
export default function VerifyScreen() {
  const { verifyOtp } = useAuth()
  const [otp, setOtp] = useState('')
  const [email] = useState('') // From navigation params

  const handleVerifyOtp = async () => {
    try {
      await verifyOtp(email, otp)
      router.push('/onboarding/quiz')
    } catch (error) {
      console.error('Verification error:', error)
      // Show error message
    }
  }

  // UI implementation...
}
```

---

## Definition of Done

- [ ] Supabase email authentication is configured
- [ ] Email OTP template is customized with Troodie branding
- [ ] Authentication service is implemented with proper error handling
- [ ] Authentication context provides session management
- [ ] Signup screen is updated to use email OTP
- [ ] Verify screen is updated to handle OTP verification
- [ ] Login screen is implemented for existing users
- [ ] Rate limiting prevents abuse
- [ ] Session persistence works across app restarts
- [ ] Email validation prevents invalid inputs
- [ ] Error messages are user-friendly and actionable
- [ ] All Gherkin scenarios pass
- [ ] Authentication flow is tested end-to-end
- [ ] Documentation is updated

---

## Resources

- [Supabase Email Authentication Documentation](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Supabase React Native Documentation](https://supabase.com/docs/reference/javascript/auth-signinwithotp)
- [Task 1.1: Supabase Backend Setup](./task-1-1-supabase-setup.md)

---

## Notes

- Email authentication is simpler than phone authentication (no SMS service setup)
- No additional costs for email delivery vs SMS
- Easier international support compared to phone numbers
- Can be implemented immediately without external service dependencies
- Phone authentication can be added later as an additional option
- Consider implementing "remember this device" functionality for better UX 