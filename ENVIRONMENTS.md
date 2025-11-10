# Environment Configuration Guide

This document explains how Troodie manages different environments and build profiles.

## Environment Files

Troodie uses multiple environment files for different deployment targets:

### `.env.development`
- **Used for**: Local development and testing
- **Supabase**: Development project
- **Build Profile**: `development`

### `.env.staging` 
- **Used for**: TestFlight builds and stakeholder testing
- **Supabase**: Staging project (`troodie-staging`)
- **Build Profile**: `staging`

### `.env.production`
- **Used for**: Production App Store builds
- **Supabase**: Production project
- **Build Profile**: `production`

## EAS Build Profiles

The app uses EAS build profiles to select the appropriate environment:

### `development` Profile
```json
{
  "development": {
    "env": {
      "EAS_BUILD_PROFILE": "development"
    }
  }
}
```

### `staging` Profile
```json
{
  "staging": {
    "distribution": "internal",
    "env": {
      "EAS_BUILD_PROFILE": "staging"
    }
  }
}
```

### `production` Profile
```json
{
  "production": {
    "distribution": "store",
    "env": {
      "EAS_BUILD_PROFILE": "production"
    }
  }
}
```

## Environment Loading Logic

The `app.config.js` file loads environment variables based on `EAS_BUILD_PROFILE`:

```javascript
// Load environment variables based on build profile
const buildProfile = process.env.EAS_BUILD_PROFILE || 'development';
const envFile = `.env.${buildProfile}`;

// Load the appropriate .env file
require('dotenv').config({ path: envFile });
```

## Supabase Configuration

Each environment uses different Supabase projects:

| Environment | Supabase Project | Purpose |
|-------------|------------------|---------|
| Development | `troodie-development` | Local development, testing |
| Staging | `troodie-staging` | TestFlight builds, stakeholder testing |
| Production | `troodie-production` | Live App Store builds |

## Environment Variables

Each `.env.*` file should contain:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Expo Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Build Profile (automatically set by EAS)
EAS_BUILD_PROFILE=staging
```

## Build Commands

### Development Build
```bash
eas build --platform ios --profile development
```

### Staging Build (TestFlight)
```bash
eas build --platform ios --profile staging
```

### Production Build (App Store)
```bash
eas build --platform ios --profile production
```

## Migration Strategy

When deploying to different environments:

1. **Development**: Use local migrations and test data
2. **Staging**: Apply production migrations, seed realistic data
3. **Production**: Apply migrations carefully, preserve existing data

## Best Practices

1. **Never commit** `.env.*` files to version control
2. **Use staging** for stakeholder testing before production
3. **Test migrations** on staging before production
4. **Keep environment variables** synchronized across environments
5. **Document changes** in environment configuration

## Troubleshooting

### Build Profile Not Found
- Check `eas.json` has the correct profile name
- Verify `EAS_BUILD_PROFILE` is set correctly

### Wrong Supabase Project
- Verify the correct `.env.*` file is being loaded
- Check `app.config.js` environment loading logic

### Migration Issues
- Test migrations on staging first
- Use the step-by-step migration approach
- Verify RLS policies are applied correctly

