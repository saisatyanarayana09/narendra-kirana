import * as Updates from 'expo-updates';

export interface OtaCheckResult {
  isAvailable: boolean;
  isDownloaded: boolean;
  error?: string;
}

/**
 * Check and download an OTA update silently in the background.
 * This runs completely non-blocking: no spinners, no alerts.
 */
export async function checkAndDownloadOtaUpdateSilently(): Promise<OtaCheckResult> {
  if (__DEV__ || !Updates.isEnabled) {
    return { isAvailable: false, isDownloaded: false };
  }

  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      return { isAvailable: true, isDownloaded: true };
    }
    return { isAvailable: false, isDownloaded: false };
  } catch (err: any) {
    // Network errors or offline states are swallowed silently
    return {
      isAvailable: false,
      isDownloaded: false,
      error: err?.message || 'Failed to check OTA update',
    };
  }
}

/**
 * Apply the downloaded OTA update by reloading the JS bundle immediately.
 */
export async function applyOtaUpdate(): Promise<void> {
  if (__DEV__ || !Updates.isEnabled) return;
  try {
    await Updates.reloadAsync();
  } catch (err) {
    console.warn('[otaService] Failed to reload update:', err);
  }
}

/**
 * Get current OTA update information for debugging/settings.
 */
export function getOtaUpdateInfo() {
  return {
    isEnabled: Updates.isEnabled,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    updateId: Updates.updateId || null,
    channel: Updates.channel || null,
    runtimeVersion: Updates.runtimeVersion || null,
    manifest: Updates.manifest || null,
  };
}
