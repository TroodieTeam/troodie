import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

const IOS_STORE_URL = 'https://apps.apple.com/us/app/troodie/id6746138280';
const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.troodie.troodie.com';
const ITUNES_LOOKUP_URL = 'https://itunes.apple.com/lookup?bundleId=com.troodie.troodie.com&country=us';

class AppUpdateService {
  /**
   * Compare two semver version strings.
   * Returns true if remote > local.
   */
  private isNewerVersion(local: string, remote: string): boolean {
    const localParts = local.split('.').map(Number);
    const remoteParts = remote.split('.').map(Number);
    const len = Math.max(localParts.length, remoteParts.length);

    for (let i = 0; i < len; i++) {
      const l = localParts[i] || 0;
      const r = remoteParts[i] || 0;
      if (r > l) return true;
      if (r < l) return false;
    }

    return false;
  }

  /**
   * Fetch the latest version from the App Store (iOS only for now).
   * Returns the version string or null on failure.
   */
  async getLatestVersion(): Promise<string | null> {
    try {
      if (Platform.OS !== 'ios') return null;

      const response = await fetch(ITUNES_LOOKUP_URL);
      const json = await response.json();

      if (json.resultCount > 0 && json.results[0]?.version) {
        return json.results[0].version as string;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if an update is available.
   * Returns the latest version string if an update is available, null otherwise.
   */
  async isUpdateAvailable(): Promise<string | null> {
    try {
      const currentVersion = Constants.expoConfig?.version;
      if (!currentVersion) return null;

      const latestVersion = await this.getLatestVersion();
      if (!latestVersion) return null;

      if (this.isNewerVersion(currentVersion, latestVersion)) {
        return latestVersion;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Open the appropriate app store for the current platform.
   */
  async openStore(): Promise<void> {
    try {
      const url = Platform.OS === 'ios' ? IOS_STORE_URL : ANDROID_STORE_URL;
      await Linking.openURL(url);
    } catch {
      // Fail silently
    }
  }
}

export const appUpdateService = new AppUpdateService();
