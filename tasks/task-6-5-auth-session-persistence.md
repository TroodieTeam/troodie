# Task 6.5: Fix Authentication Session Persistence

## Overview
Users are losing their authentication state when the app is refreshed or reopened, despite having a valid Supabase session. This is a critical bug that affects core user experience.

## Problem Description
- **Issue**: Users must re-login after app refresh/reload even when they have a valid session
- **Impact**: Poor user experience, users lose their login state unexpectedly
- **Frequency**: 100% of the time on app refresh/reload
- **Environment**: Development and likely production

## Current Behavior
1. User logs in successfully
2. User refreshes app or closes/reopens app
3. `supabase.auth.getSession()` returns `null` instead of the valid session
4. User is logged out and must re-authenticate

## Expected Behavior
1. User logs in successfully
2. User refreshes app or closes/reopens app
3. `supabase.auth.getSession()` returns the valid session
4. User remains logged in

## Technical Investigation

### Logs Analysis
```
// First launch (after login)
[AuthContext] getSession() result: { ...valid session object... }
[AuthContext] onAuthStateChange: INITIAL_SESSION { ...valid session object... }

// After refresh/reload
[AuthContext] getSession() result: null
[AuthContext] onAuthStateChange: INITIAL_SESSION null
```

### Supabase Configuration
- ✅ AsyncStorage is properly configured
- ✅ `persistSession: true` is set
- ✅ `autoRefreshToken: true` is set
- ✅ Supabase client is a singleton

### Potential Root Causes
1. **AsyncStorage Issues**: Storage might be cleared or not persisting properly
2. **Development Environment**: Expo Go or development tools clearing storage
3. **Session Expiry**: Session might be expiring faster than expected
4. **Storage Key Conflicts**: Multiple Supabase instances using different storage keys

## Acceptance Criteria
- [ ] User remains logged in after app refresh
- [ ] User remains logged in after app close/reopen
- [ ] Session persists across app restarts
- [ ] No regression in existing authentication flows
- [ ] Proper error handling for edge cases

## Implementation Plan

### Phase 1: Debugging & Investigation (0.5 days)
- [ ] Add detailed logging to track session lifecycle
- [ ] Check AsyncStorage contents directly
- [ ] Verify Supabase client instantiation
- [ ] Test on different environments (Expo Go, device, simulator)

### Phase 2: Root Cause Analysis (0.5 days)
- [ ] Identify exact cause of session loss
- [ ] Check for storage key conflicts
- [ ] Verify session expiry timing
- [ ] Test with different storage backends

### Phase 3: Fix Implementation (1 day)
- [ ] Implement the identified fix
- [ ] Add proper error handling
- [ ] Add fallback mechanisms
- [ ] Test across different scenarios

## Testing Scenarios
- [ ] Fresh login → refresh → should stay logged in
- [ ] Fresh login → close app → reopen → should stay logged in
- [ ] Fresh login → background app → foreground → should stay logged in
- [ ] Long session → refresh → should stay logged in
- [ ] Multiple app restarts → should stay logged in

## Dependencies
- Supabase client configuration
- AsyncStorage implementation
- React Native environment setup

## Risk Assessment
- **High Risk**: Core authentication functionality
- **Impact**: All users affected
- **Mitigation**: Thorough testing across environments

## Definition of Done
- [ ] All test scenarios pass
- [ ] No console errors related to session persistence
- [ ] Session properly restored on app restart
- [ ] Code reviewed and approved
- [ ] Tested on both iOS and Android
- [ ] Tested in development and production builds

## Notes
- Session expiry is set to 1 hour (3600 seconds)
- AsyncStorage is properly configured in `lib/supabase.ts`
- Issue appears to be storage-related rather than authentication logic

## Related Files
- `contexts/AuthContext.tsx` - Authentication state management
- `lib/supabase.ts` - Supabase client configuration
- `app/_layout.tsx` - App initialization

## Priority
**Critical** - This affects core user experience and should be fixed immediately.

## Estimate
**2 days** - Includes investigation, root cause analysis, and fix implementation. 