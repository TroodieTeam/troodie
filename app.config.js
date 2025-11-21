const fs = require('fs');
const dotenv = require('dotenv');

// Helper to load an env file with logging
const loadEnvFile = (envFile) => {
  if (fs.existsSync(envFile)) {
    try {
      const fileContents = fs.readFileSync(envFile);
      const parsed = dotenv.parse(fileContents);
      Object.entries(parsed).forEach(([key, value]) => {
        process.env[key] = value;
      });
      console.log(
        `[app.config] Loaded ${Object.keys(parsed).length} variables from ${envFile}`
      );
      return true;
    } catch (error) {
      console.warn(`[app.config] Failed to load ${envFile}:`, error);
      return false;
    }
  }

  console.warn(`[app.config] Environment file not found: ${envFile}`);
  return false;
};

// Determine which environment file to load
// Note: We load dotenv manually here instead of using 'dotenv/config' import
// to ensure we load the correct file based on EAS_BUILD_PROFILE
const getBuildProfile = () => {
  // EAS_BUILD_PROFILE is set automatically by EAS during builds or via npm scripts
  const profile = process.env.EAS_BUILD_PROFILE;
  const resolvedProfile = profile || 'development';

  console.log(`[app.config] Detected build profile: ${resolvedProfile}`);

  if (resolvedProfile === 'production') {
    const loaded = loadEnvFile('.env.production');
    if (!loaded) {
      console.warn('[app.config] Falling back to default .env file for production');
      loadEnvFile('.env');
    }
  } else if (resolvedProfile === 'staging') {
    const loaded = loadEnvFile('.env.staging');
    if (!loaded) {
      console.warn('[app.config] Falling back to default .env file for staging');
      loadEnvFile('.env');
    }
  } else {
    const loaded = loadEnvFile('.env.development');
    if (!loaded) {
      console.warn('[app.config] Falling back to default .env file for development');
      loadEnvFile('.env');
    }
  }

  return resolvedProfile;
};

// Load the appropriate environment
const currentProfile = getBuildProfile();

export default {
  expo: {
    name: "Troodie",
    slug: "troodie",
    version: "1.0.6",
    orientation: "portrait",
    icon: "./assets/images/troodie_icon_logo.jpg",
    scheme: "troodie",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.troodie.troodie.com",
      buildNumber: "1",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "Troodie uses your location to show nearby restaurants and recommendations.",
        NSCameraUsageDescription: "Troodie uses your camera to take photos of restaurants and food.",
        NSPhotoLibraryUsageDescription: "Troodie uses your photo library to select images for posts."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/troodie_icon_logo.jpg",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/troodie_icon_logo.jpg",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff"
        }
      ],
      "expo-font"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      googlePlacesApiKey: process.env.GOOGLE_MAPS_API_KEY,
      buildProfile: currentProfile,
      eas: {
        projectId: "68397d45-255f-4b4c-ba93-d51a044ddfb2"
      }
    }
  }
};