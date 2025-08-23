import * as Linking from 'expo-linking';

const prefix = Linking.createURL('/');

export const linking = {
  prefixes: [prefix, 'troodie://'],
  config: {
    screens: {
      '(tabs)': {
        screens: {
          index: '',
          explore: 'explore',
          activity: 'activity',
          profile: 'profile',
        },
      },
      'restaurant/[id]': 'restaurant/:id',
      'user/[id]': 'user/:id',
      'posts/[id]': 'posts/:id',
      'boards/[id]': 'boards/:id',
      'user/[id]/following': 'user/:id/following',
      'user/[id]/followers': 'user/:id/followers',
      'settings/blocked-users': 'settings/blocked-users',
      'settings/privacy': 'settings/privacy',
      'find-friends': 'find-friends',
      'quick-saves': 'quick-saves',
      '+not-found': '*',
    },
  },
};

export const parseDeepLink = (url: string) => {
  const { hostname, path, queryParams } = Linking.parse(url);
  
  // Handle different URL formats
  if (path) {
    // Remove leading slash and handle --/ prefix (Expo dev URLs)
    let cleanPath = path;
    if (cleanPath.includes('--/')) {
      cleanPath = cleanPath.split('--/')[1];
    }
    cleanPath = cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath;
    
    return {
      path: cleanPath,
      params: queryParams,
    };
  }
  
  return null;
};