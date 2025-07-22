# Expo Notifications Setup Guide (EAS Recommended)

This guide provides step-by-step instructions for setting up push notifications in the troodie app using Expo Notifications with EAS (Expo Application Services).

## Prerequisites

- Expo CLI installed
- Expo account (for push notification services)
- Physical device for testing (push notifications don't work in simulators)
- EAS CLI (recommended for production)

## Option 1: EAS Setup (Recommended)

### Step 1: Install EAS CLI
```bash
npm install -g @expo/eas-cli
```

### Step 2: Login to Expo
```bash
eas login
```

### Step 3: Configure EAS
```bash
eas build:configure
```

### Step 4: Build with Push Notifications
```bash
# For iOS
eas build --platform ios --profile development

# For Android
eas build --platform android --profile development
```

### Step 5: Test Push Notifications
```bash
# Send test notification
eas push:send --to "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]" --title "Test" --body "Hello from EAS!"

# Or use web interface: https://expo.dev/notifications
```

## Option 2: Manual Setup (Legacy)

### Step 1: Install Dependencies
```bash
npx expo install expo-notifications expo-device
```

### Step 2: Configure app.json
The app.json has been updated with the following configuration:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/images/notification-icon.png",
          "color": "#FF6B35",
          "sounds": ["./assets/sounds/notification.wav"]
        }
      ]
    ],
    "notification": {
      "icon": "./assets/images/notification-icon.png",
      "color": "#FF6B35",
      "iosDisplayInForeground": true,
      "androidMode": "default",
      "androidCollapsedTitle": "New Notification"
    }
  }
}
```

### Step 3: Environment Variables
Add your Expo project ID to your environment variables:

```bash
# .env
EXPO_PROJECT_ID=your-expo-project-id
```

## EAS Benefits

### Automatic Setup
- ✅ **No manual APNs/FCM configuration**
- ✅ **Automatic certificate management**
- ✅ **Built-in push notification service**
- ✅ **Project ID auto-detection**

### Production Ready
- ✅ **iOS App Store deployment**
- ✅ **Android Play Store deployment**
- ✅ **Automatic code signing**
- ✅ **CI/CD integration**

### Testing & Development
- ✅ **Easy testing with EAS CLI**
- ✅ **Web-based notification testing**
- ✅ **Automatic device registration**
- ✅ **Real-time debugging**

## Testing Push Notifications

### Using EAS CLI
```bash
# Send to specific token
eas push:send --to "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]" --title "Test" --body "Hello World"

# Send to all devices
eas push:send --title "App Update" --body "New version available!"
```

### Using Web Interface
1. Go to [Expo Push Tool](https://expo.dev/notifications)
2. Enter your push token
3. Send test notifications

### Using API
```bash
curl -H "Content-Type: application/json" -X POST "https://exp.host/--/api/v2/push/send" -d '{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "title":"Test",
  "body": "Hello World",
  "data": { "type": "test" }
}'
```

## Production Deployment

### iOS (App Store)
```bash
# Build for production
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

### Android (Play Store)
```bash
# Build for production
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android
```

## Database Migration

Run the notifications system migration:

```bash
npx supabase db push
```

This creates the necessary tables:
- `notifications` (updated)
- `notification_preferences`
- `push_tokens`

## Usage Examples

### Sending a Notification
```typescript
import { notificationService } from '@/services/notificationService';

// Create a notification
await notificationService.createLikeNotification(
  postOwnerId,
  likerId,
  likerName,
  restaurantName,
  postId
);

// Send push notification (EAS handles the rest)
await pushNotificationService.sendPushNotification(token, {
  title: "New Like",
  body: `${likerName} liked your post about ${restaurantName}`,
  data: { type: 'like', postId }
});
```

### Handling Notifications
```typescript
// In your app component
useEffect(() => {
  const subscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
    // Update UI, play sound, etc.
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification tapped:', response);
    // Navigate to appropriate screen
  });

  return () => {
    subscription.remove();
    responseSubscription.remove();
  };
}, []);
```

## Troubleshooting

### Common Issues

1. **"Must use physical device for Push Notifications"**
   - Push notifications only work on physical devices, not simulators

2. **"Failed to get push token"**
   - EAS automatically handles project ID detection
   - Ensure you're using a physical device
   - Verify internet connection

3. **"Permission denied"**
   - User denied notification permissions
   - Guide user to Settings > Notifications > Your App

4. **"Invalid push token"**
   - Token format should be: `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]`
   - Tokens can expire, always get a fresh token

### EAS Debug Commands
```bash
# Check EAS project status
eas project:info

# View build logs
eas build:list

# Check push notification status
eas push:list
```

## Best Practices

1. **Use EAS for Production**: EAS handles all the complex setup automatically
2. **Test on Physical Devices**: Always test push notifications on real devices
3. **Respect User Preferences**: Check notification settings before sending
4. **Rate Limiting**: Don't spam users with notifications
5. **Content Relevance**: Keep notifications relevant and actionable
6. **Localization**: Support multiple languages for notifications

## Support

For EAS-specific issues:
- [EAS Documentation](https://docs.expo.dev/eas/)
- [EAS Build Guide](https://docs.expo.dev/build/introduction/)
- [EAS Submit Guide](https://docs.expo.dev/submit/introduction/)

For Expo Notifications:
- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo Push Notifications Guide](https://docs.expo.dev/push-notifications/overview/)

For troodie-specific issues:
- Check the notifications system documentation
- Review the implemented services and hooks
- Test with the provided examples 