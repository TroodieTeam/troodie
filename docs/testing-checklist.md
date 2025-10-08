# Troodie Testing & Validation Checklist

A comprehensive checklist to ensure code quality and functionality before committing changes.

## 🔍 Pre-Development Checklist

### Planning Phase
- [ ] **Requirements Clear**: All acceptance criteria defined
- [ ] **Files Identified**: Know which files need modification
- [ ] **Database Schema**: Reviewed relevant tables and relationships
- [ ] **Patterns Studied**: Identified similar code to follow
- [ ] **Dependencies**: Checked if new packages needed
- [ ] **Edge Cases**: Listed potential failure scenarios
- [ ] **Performance**: Considered impact on app performance
- [ ] **Security**: Identified sensitive data handling needs

### Environment Setup
- [ ] **Branch Created**: Working on feature branch, not main
- [ ] **Environment Variables**: All required vars set in `.env.local`
- [ ] **Database Synced**: Latest migrations applied
- [ ] **Dependencies Installed**: `npm install` run recently
- [ ] **Simulator Ready**: iOS/Android simulator running

## ✅ During Development Checklist

### Code Quality
- [ ] **TypeScript Types**: All variables and functions typed
- [ ] **No `any` Types**: Avoided using `any` except absolutely necessary
- [ ] **Naming Conventions**: Following project standards
  - [ ] Components: PascalCase
  - [ ] Functions: camelCase
  - [ ] Constants: UPPER_SNAKE_CASE
  - [ ] Files: Consistent with existing patterns

### Pattern Compliance
- [ ] **Component Structure**: Following standard component pattern
- [ ] **Service Pattern**: Using try/catch with error handling
- [ ] **Hooks Usage**: Custom hooks in `hooks/` folder
- [ ] **Image Handling**: Using ImageUploadServiceV2
- [ ] **Navigation**: Using Expo Router's `router.push()`
- [ ] **Error Messages**: User-friendly, not technical

### React Native Specific
- [ ] **Platform Checks**: iOS/Android differences handled
- [ ] **Safe Area**: Using SafeAreaView where needed
- [ ] **Keyboard Handling**: KeyboardAvoidingView for forms
- [ ] **Permissions**: Requested before accessing camera/gallery
- [ ] **Loading States**: Shown during async operations
- [ ] **Error Boundaries**: Added for critical flows

### Supabase Integration
- [ ] **RLS Policies**: Checked table has proper policies
- [ ] **Auth Check**: Verified user is authenticated where needed
- [ ] **Error Handling**: Catching Supabase-specific errors
- [ ] **Real-time**: Unsubscribing from channels on cleanup
- [ ] **Query Optimization**: Using select() to limit fields
- [ ] **Pagination**: Implemented for large datasets

## 🧪 Testing Checklist

### Type Checking
```bash
npm run typecheck
```
- [ ] **No Errors**: All TypeScript errors resolved
- [ ] **Imports Valid**: All imports resolve correctly
- [ ] **Types Exported**: Interfaces/types exported where needed

### Linting
```bash
npm run lint
```
- [ ] **No Errors**: ESLint passes without errors
- [ ] **No Warnings**: Or justified if unavoidable
- [ ] **Console Logs**: Removed or converted to proper logging
- [ ] **Unused Variables**: Cleaned up
- [ ] **Unused Imports**: Removed

### Manual Testing - iOS
```bash
npx expo start --ios
```
- [ ] **Feature Works**: Primary functionality operates correctly
- [ ] **Navigation**: Can navigate to/from feature
- [ ] **Orientation**: Works in portrait (and landscape if needed)
- [ ] **Gestures**: Swipes, taps work as expected
- [ ] **Keyboard**: Dismisses properly, doesn't cover inputs
- [ ] **Safe Area**: Content not cut off by notch

### Manual Testing - Android
```bash
npx expo start --android
```
- [ ] **Feature Works**: Primary functionality operates correctly
- [ ] **Back Button**: Android back button handled properly
- [ ] **Permissions**: Properly requested and handled
- [ ] **Different Screens**: Tested on different screen sizes
- [ ] **Performance**: No noticeable lag or jank

### Data Flow Testing
- [ ] **Create**: Can create new records
- [ ] **Read**: Data displays correctly
- [ ] **Update**: Can modify existing records
- [ ] **Delete**: Can remove records (if applicable)
- [ ] **Refresh**: Pull-to-refresh works
- [ ] **Cache**: Data persists appropriately
- [ ] **Offline**: Handles no network gracefully

### Edge Cases
- [ ] **Empty State**: Shows appropriate message/UI
- [ ] **Error State**: Errors display user-friendly messages
- [ ] **Loading State**: Loading indicators show
- [ ] **Network Failure**: Handles offline/timeout
- [ ] **Invalid Input**: Form validation works
- [ ] **Rapid Actions**: No duplicate submissions
- [ ] **Large Data**: Handles many items efficiently
- [ ] **Permissions Denied**: Graceful handling

### Authentication Testing
- [ ] **Logged Out**: Redirects to auth when needed
- [ ] **Session Expired**: Handles expired sessions
- [ ] **Wrong Permissions**: Shows appropriate errors
- [ ] **Profile Data**: Uses correct user context

## 📊 Performance Checklist

### Images
- [ ] **Optimized**: Images resized before upload (max 800px)
- [ ] **Lazy Loading**: Images load as needed
- [ ] **Placeholders**: Shown while loading
- [ ] **Error Handling**: Broken images handled

### Lists & Data
- [ ] **Pagination**: Large lists paginated
- [ ] **Virtualization**: FlatList for long lists
- [ ] **Memoization**: Used where appropriate
- [ ] **Debouncing**: Search/filter inputs debounced

### Network
- [ ] **Request Batching**: Multiple requests combined
- [ ] **Caching**: Frequently used data cached
- [ ] **Optimistic Updates**: UI updates before server confirms
- [ ] **Request Cancellation**: Cancelled when component unmounts

## 🔒 Security Checklist

### Data Protection
- [ ] **No Secrets**: No API keys or secrets in code
- [ ] **Input Sanitization**: User input sanitized
- [ ] **SQL Injection**: Using parameterized queries
- [ ] **XSS Prevention**: Content properly escaped
- [ ] **File Validation**: Upload types/sizes checked

### Authentication & Authorization
- [ ] **Auth Required**: Protected routes check authentication
- [ ] **Permission Checks**: User permissions verified
- [ ] **Data Scoping**: Users only see their data
- [ ] **Session Management**: Tokens handled securely

### Privacy
- [ ] **PII Protection**: Sensitive data not logged
- [ ] **Data Minimization**: Only request needed data
- [ ] **Consent**: User consent for data operations
- [ ] **Encryption**: Sensitive data encrypted

## 🚀 Pre-Commit Checklist

### Code Review
- [ ] **Self-Review**: Reviewed own changes
- [ ] **CRUD Complete**: All operations work
- [ ] **Comments**: Added for complex logic
- [ ] **TODOs**: Addressed or documented
- [ ] **Debug Code**: Removed all debug statements

### Documentation
- [ ] **README Updated**: If setup changed
- [ ] **API Docs**: New endpoints documented
- [ ] **Type Docs**: Complex types documented
- [ ] **Migration Notes**: Database changes documented

### Final Checks
```bash
# Run all checks
npm run typecheck && npm run lint && npm test
```
- [ ] **All Passing**: No errors in any check
- [ ] **Build Works**: `npx expo prebuild --clean` succeeds
- [ ] **No Conflicts**: Merged latest from main
- [ ] **Commit Message**: Clear and descriptive

## 🔄 Post-Deployment Checklist

### Monitoring
- [ ] **Error Tracking**: Check for new errors
- [ ] **Performance**: Monitor load times
- [ ] **User Feedback**: Watch for issues
- [ ] **Database**: Check query performance

### Rollback Ready
- [ ] **Rollback Plan**: Know how to revert
- [ ] **Database Backup**: Recent backup exists
- [ ] **Feature Flag**: Can disable if needed
- [ ] **Communication**: Team aware of changes

## 📝 Quick Command Reference

```bash
# Development
npx expo start --clear          # Clear cache and start
npx expo start --ios           # iOS simulator
npx expo start --android       # Android emulator

# Validation
npm run typecheck              # TypeScript check
npm run lint                   # ESLint check
npm run lint:fix              # Fix lint issues
npm test                      # Run tests

# Database
npx supabase db reset         # Reset local DB
npx supabase gen types typescript --local > types/supabase.ts

# Build
npx expo prebuild --clean     # Clean and prebuild
eas build --profile preview  # Build preview
```

## 🚨 Common Issues to Check

1. **Memory Leaks**: Cleanup in useEffect
2. **Race Conditions**: Async operations cancelled
3. **Infinite Loops**: Dependencies in useEffect correct
4. **State Updates**: Not updating unmounted components
5. **Navigation**: Stack doesn't grow infinitely
6. **Timers**: Cleared on unmount
7. **Listeners**: Removed on cleanup
8. **Subscriptions**: Unsubscribed properly

## ✨ Best Practices Reminders

- **Small Commits**: One feature per commit
- **Test Early**: Don't wait until end
- **Ask Questions**: When unsure about approach
- **Performance First**: Consider impact early
- **User Experience**: Think like a user
- **Code Reuse**: Extract common patterns
- **Future Proof**: Consider maintenance

---

**Remember**: This checklist is comprehensive - not every item applies to every change. Use judgment to determine which checks are relevant for your specific task.