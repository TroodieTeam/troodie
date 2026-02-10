import { appUpdateService } from '@/services/appUpdateService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const DISMISS_KEY_PREFIX = 'update_banner_dismissed_';

export function useUpdateBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkForUpdate = async () => {
      try {
        const version = await appUpdateService.isUpdateAvailable();
        if (!isMounted || !version) return;

        const dismissed = await AsyncStorage.getItem(`${DISMISS_KEY_PREFIX}${version}`);
        if (!isMounted) return;

        if (dismissed !== 'true') {
          setLatestVersion(version);
          setShowBanner(true);
        }
      } catch {
        // Fail silently
      }
    };

    checkForUpdate();

    return () => {
      isMounted = false;
    };
  }, []);

  const onUpdate = useCallback(() => {
    appUpdateService.openStore();
  }, []);

  const onDismiss = useCallback(async () => {
    setShowBanner(false);
    if (latestVersion) {
      try {
        await AsyncStorage.setItem(`${DISMISS_KEY_PREFIX}${latestVersion}`, 'true');
      } catch {
        // Fail silently
      }
    }
  }, [latestVersion]);

  return { showBanner, latestVersion, onUpdate, onDismiss };
}
