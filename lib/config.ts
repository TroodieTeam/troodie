import Constants from 'expo-constants';

interface Config {
  supabaseUrl: string;
  supabaseAnonKey: string;
  googlePlacesApiKey: string;
  buildProfile: string;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  stripePublishableKey: string;
  stripeSecretKey: string;
}

const config: Config = {
  supabaseUrl: Constants.expoConfig?.extra?.supabaseUrl || '',
  supabaseAnonKey: Constants.expoConfig?.extra?.supabaseAnonKey || '',
  googlePlacesApiKey: Constants.expoConfig?.extra?.googlePlacesApiKey || '',
  buildProfile: Constants.expoConfig?.extra?.buildProfile || 'development',
  cloudinaryCloudName: Constants.expoConfig?.extra?.cloudinaryCloudName || process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: Constants.expoConfig?.extra?.cloudinaryApiKey || process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: Constants.expoConfig?.extra?.cloudinaryApiSecret || process.env.CLOUDINARY_API_SECRET || '',
  stripePublishableKey: Constants.expoConfig?.extra?.stripePublishableKey || process.env.STRIPE_PUBLISHABLE_KEY || '',
  stripeSecretKey: Constants.expoConfig?.extra?.stripeSecretKey || process.env.STRIPE_SECRET_KEY || '',
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
