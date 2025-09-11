import Constants from 'expo-constants';

interface Config {
  supabaseUrl: string;
  supabaseAnonKey: string;
  googlePlacesApiKey: string;
  buildProfile: string;
}

const config: Config = {
  supabaseUrl: Constants.expoConfig?.extra?.supabaseUrl || '',
  supabaseAnonKey: Constants.expoConfig?.extra?.supabaseAnonKey || '',
  googlePlacesApiKey: Constants.expoConfig?.extra?.googlePlacesApiKey || '',
  buildProfile: Constants.expoConfig?.extra?.buildProfile || 'development',
};

// Validate that required variables are present
if (!config.supabaseUrl || !config.supabaseAnonKey) {
  throw new Error(
    'Missing required Supabase configuration. Please check your environment variables.'
  );
}

// Optional: Log current environment for debugging (only in development)
if (__DEV__) {
  console.log(`🔧 Config loaded for: ${config.buildProfile} environment`);
  console.log(`📦 Supabase URL: ${config.supabaseUrl}`);
}

export default config;
