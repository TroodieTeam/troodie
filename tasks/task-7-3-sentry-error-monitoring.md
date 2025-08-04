# Task 7.3: Implement Sentry for Error Monitoring

## Epic: Performance and Polish
**Priority:** High  
**Estimate:** 3 days  
**Status:** 🔴 Not Started  
**Assignee:** -  
**Dependencies:** None  

---

## Overview

Integrate Sentry into our React Native (Expo) application to provide robust, real-time error tracking and performance monitoring. This will enable proactive identification, detailed analysis, and efficient resolution of user-experienced issues, significantly improving application stability and debugging workflows.

## Business Value

- **Proactive Issue Detection**: Catch errors before they impact user experience
- **Faster Debugging**: Detailed stack traces and context reduce time-to-resolution
- **Performance Insights**: Monitor app performance and identify bottlenecks
- **User Experience**: Reduce crashes and improve app stability
- **Data-Driven Decisions**: Error patterns help prioritize development efforts

## Dependencies

- None (can be implemented independently)

## Blocks

- Enhanced error tracking for all future features
- Performance monitoring capabilities
- Production debugging workflows

---

## Acceptance Criteria

### Feature: Sentry SDK Integration
As a developer
I want comprehensive error monitoring and performance tracking
So that I can proactively identify and resolve issues

**Scenario: Unhandled Exception Reporting**
```
Given the app encounters an unhandled JavaScript exception
When the error occurs in any part of the application
Then the error is automatically captured and sent to Sentry
And the error includes stack trace and user context
And the error appears in the Sentry dashboard within 30 seconds
```

**Scenario: Promise Rejection Handling**
```
Given a promise rejection occurs in the application
When the rejection is not caught by local error handling
Then the rejection is automatically reported to Sentry
And the error includes the promise context and stack trace
```

**Scenario: User Context Attachment**
```
Given a user is logged into the application
When an error occurs
Then the error report includes the user ID and profile information
And the error report includes device information and app version
```

**Scenario: Custom Error Reporting**
```
Given a developer wants to report a specific error condition
When they call Sentry.captureException() or Sentry.captureMessage()
Then the error is sent to Sentry with custom context
And the error includes any additional breadcrumbs or tags
```

**Scenario: Performance Monitoring**
```
Given the app performs various operations
When performance metrics are collected
Then app start time is tracked and reported
And route transition times are monitored
And slow operations are identified and reported
```

**Scenario: Environment-Specific Configuration**
```
Given the app runs in different environments
When errors occur in development, staging, or production
Then errors are sent to the appropriate Sentry project
And source maps are correctly uploaded for each environment
```

---

## Technical Implementation

### 1. Install Sentry Dependencies

```bash
npx expo install @sentry/react-native
npx expo install @sentry/react-native-expo
```

### 2. Configure Sentry in app.config.js

```javascript
import 'dotenv/config';

export default {
  expo: {
    // ... existing config
    plugins: [
      // ... existing plugins
      [
        "@sentry/react-native-expo",
        {
          organization: "your-org-slug",
          project: "troodie",
          // Environment-specific DSNs
          dsn: process.env.SENTRY_DSN,
          // Enable performance monitoring
          enableAutoPerformanceTracking: true,
          // Enable debug mode in development
          debug: process.env.NODE_ENV === 'development',
          // Configure release tracking
          release: process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0",
          // Environment configuration
          environment: process.env.NODE_ENV || 'development'
        }
      ]
    ],
    extra: {
      // ... existing extra config
      sentry: {
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development'
      }
    }
  }
};
```

### 3. Initialize Sentry in App Entry Point

```typescript
// app/_layout.tsx
import * as Sentry from '@sentry/react-native';
import { useEffect } from 'react';
import Constants from 'expo-constants';

export default function RootLayout() {
  useEffect(() => {
    // Initialize Sentry
    Sentry.init({
      dsn: Constants.expoConfig?.extra?.sentry?.dsn,
      environment: Constants.expoConfig?.extra?.sentry?.environment,
      debug: __DEV__,
      enableAutoPerformanceTracking: true,
      enableAutoSessionTracking: true,
      // Configure beforeSend to filter sensitive data
      beforeSend(event) {
        // Remove sensitive information
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
        }
        return event;
      },
      // Configure breadcrumbs
      beforeBreadcrumb(breadcrumb) {
        // Filter out sensitive navigation events
        if (breadcrumb.category === 'navigation' && breadcrumb.data?.url?.includes('password')) {
          return null;
        }
        return breadcrumb;
      }
    });
  }, []);

  // ... rest of layout component
}
```

### 4. Create Sentry Service

```typescript
// services/sentryService.ts
import * as Sentry from '@sentry/react-native';
import { AuthContext } from '../contexts/AuthContext';
import { useContext } from 'react';

export class SentryService {
  static setUserContext(user: any) {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.username,
        persona: user.persona
      });
    } else {
      Sentry.setUser(null);
    }
  }

  static setTag(key: string, value: string) {
    Sentry.setTag(key, value);
  }

  static addBreadcrumb(message: string, category: string, data?: any) {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info'
    });
  }

  static captureException(error: Error, context?: any) {
    Sentry.captureException(error, {
      contexts: {
        app: {
          version: Constants.expoConfig?.version,
          build: Constants.expoConfig?.ios?.buildNumber
        },
        ...context
      }
    });
  }

  static captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
    Sentry.captureMessage(message, level);
  }

  static startTransaction(name: string, operation: string) {
    return Sentry.startTransaction({
      name,
      op: operation
    });
  }
}

// Hook for easy Sentry integration
export const useSentry = () => {
  const { user } = useContext(AuthContext);

  useEffect(() => {
    SentryService.setUserContext(user);
  }, [user]);

  return SentryService;
};
```

### 5. Integrate with Auth Context

```typescript
// contexts/AuthContext.tsx
import { SentryService } from '../services/sentryService';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // ... existing auth logic

  useEffect(() => {
    if (user) {
      SentryService.setUserContext(user);
      SentryService.setTag('user_type', user.persona || 'unknown');
    }
  }, [user]);

  // ... rest of provider
};
```

### 6. Create Error Boundary Component

```typescript
// components/ErrorBoundary.tsx
import React from 'react';
import * as Sentry from '@sentry/react-native';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack
        }
      }
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ThemedView style={styles.container}>
          <ThemedText style={styles.title}>Something went wrong</ThemedText>
          <ThemedText style={styles.message}>
            We've encountered an unexpected error. Our team has been notified.
          </ThemedText>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <ThemedText style={styles.buttonText}>Try Again</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### 7. Environment Configuration

```bash
# .env
SENTRY_DSN=https://your-dsn@sentry.io/project-id
NODE_ENV=development

# .env.production
SENTRY_DSN=https://your-production-dsn@sentry.io/project-id
NODE_ENV=production
```

### 8. Source Map Upload Configuration

```javascript
// eas.json
{
  "build": {
    "production": {
      "env": {
        "SENTRY_DSN": "your-production-dsn",
        "SENTRY_ORG": "your-org-slug",
        "SENTRY_PROJECT": "troodie"
      }
    },
    "preview": {
      "env": {
        "SENTRY_DSN": "your-staging-dsn",
        "SENTRY_ORG": "your-org-slug",
        "SENTRY_PROJECT": "troodie-staging"
      }
    }
  }
}
```

### 9. Performance Monitoring Integration

```typescript
// hooks/usePerformanceTracking.ts
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { SentryService } from '../services/sentryService';

export const usePerformanceTracking = () => {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = router.addListener('routeChange', (route) => {
      SentryService.addBreadcrumb(
        `Navigated to ${route.name}`,
        'navigation',
        { route: route.name, params: route.params }
      );
    });

    return unsubscribe;
  }, [router]);
};
```

---

## Definition of Done

- [ ] Sentry SDK installed and configured for React Native Expo
- [ ] Environment-specific DSNs configured (dev, staging, production)
- [ ] User context automatically attached to error reports
- [ ] Custom breadcrumbs implemented for navigation and key actions
- [ ] Error boundary component created and integrated
- [ ] Performance monitoring enabled for app start and route transitions
- [ ] Source maps uploaded to Sentry for readable stack traces
- [ ] Error reporting tested in development environment
- [ ] Documentation created for error triage process
- [ ] Team trained on using Sentry dashboard
- [ ] Error filtering and alerting configured
- [ ] Privacy considerations addressed (no sensitive data in reports)

---

## Resources

- [Sentry React Native Documentation](https://docs.sentry.io/platforms/react-native/)
- [Sentry Expo Plugin Documentation](https://docs.sentry.io/platforms/react-native/guides/expo/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Sentry Source Maps Guide](https://docs.sentry.io/platforms/react-native/sourcemaps/)

---

## Notes

### Privacy Considerations
- Ensure no sensitive user data is sent to Sentry
- Filter out authentication tokens and passwords
- Consider GDPR compliance for user data

### Performance Impact
- Sentry SDK has minimal performance impact
- Network requests are batched and sent asynchronously
- Consider rate limiting for high-volume error scenarios

### Error Triage Process
1. Monitor Sentry dashboard for new errors
2. Prioritize errors by frequency and user impact
3. Use stack traces and context to reproduce issues
4. Fix issues and verify resolution
5. Update error status in Sentry

### Integration Points
- Auth context for user identification
- Navigation for route tracking
- API calls for error context
- Performance monitoring for app metrics 