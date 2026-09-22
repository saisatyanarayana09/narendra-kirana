import * as Updates from "expo-updates";

export interface OtaState {
  isChecking: boolean;
  isDownloading: boolean;
  isUpdateAvailable: boolean;
  isUpdatePending: boolean; // Downloaded and ready to apply
  error?: string;
}

let currentState: OtaState = {
  isChecking: false,
  isDownloading: false,
  isUpdateAvailable: false,
  isUpdatePending: false,
};

const listeners = new Set<(state: OtaState) => void>();

function updateState(partial: Partial<OtaState>) {
  currentState = { ...currentState, ...partial };
  listeners.forEach((listener) => {
    try {
      listener(currentState);
    } catch {
      // Ignore listener error
    }
  });
}

export function getOtaState(): OtaState {
  return currentState;
}

export function subscribeOtaState(
  listener: (state: OtaState) => void,
): () => void {
  listeners.add(listener);
  listener(currentState);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Startup check with quick timeout (default 2000ms).
 * - If update available and fast: downloads and reloads app immediately.
 * - If check takes > maxWaitMs (slow network): immediately returns false so user can shop,
 *   then continues downloading silently in background and notifies listeners when ready.
 */
export async function runStartupOtaFlow(): Promise<{
  shouldBlockAndReload: boolean;
}> {
  if (__DEV__ || !Updates.isEnabled) {
    return { shouldBlockAndReload: false };
  }

  try {
    updateState({ isChecking: true });

    // Set a hard 10-second timeout just in case network hangs
    const checkPromise = Updates.checkForUpdateAsync();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Check timeout")), 10000),
    );

    const result = (await Promise.race([
      checkPromise,
      timeoutPromise,
    ])) as Updates.UpdateCheckResult;
    updateState({ isChecking: false });

    if (result.isAvailable) {
      updateState({ isUpdateAvailable: true, isDownloading: true });

      const fetchPromise = Updates.fetchUpdateAsync();
      const fetchTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Download timeout")), 30000),
      );

      await Promise.race([fetchPromise, fetchTimeout]);
      updateState({ isDownloading: false, isUpdatePending: true });

      // Automatically reload straight into the newly downloaded version
      await Updates.reloadAsync();
      return { shouldBlockAndReload: true };
    }
  } catch (err: any) {
    console.warn("[OTA] Startup check/fetch failed or timed out:", err);
    updateState({
      isChecking: false,
      isDownloading: false,
      error: err?.message,
    });
  }

  return { shouldBlockAndReload: false };
}

/**
 * Background silent check used during runtime.
 */
export async function checkAndDownloadOtaSilently(): Promise<boolean> {
  if (__DEV__ || !Updates.isEnabled) return false;
  if (
    currentState.isChecking ||
    currentState.isDownloading ||
    currentState.isUpdatePending
  ) {
    return currentState.isUpdatePending;
  }

  try {
    updateState({ isChecking: true });
    const update = await Updates.checkForUpdateAsync();
    updateState({ isChecking: false });

    if (update.isAvailable) {
      updateState({ isUpdateAvailable: true, isDownloading: true });
      await Updates.fetchUpdateAsync();
      updateState({ isDownloading: false, isUpdatePending: true });
      return true;
    }
  } catch (err: any) {
    updateState({
      isChecking: false,
      isDownloading: false,
      error: err?.message,
    });
  }

  return false;
}

export const checkAndDownloadOtaUpdateSilently = checkAndDownloadOtaSilently;

/**
 * Apply the downloaded OTA update by reloading the JS bundle.
 */
export async function applyOtaUpdate(): Promise<void> {
  if (__DEV__ || !Updates.isEnabled) return;
  try {
    await Updates.reloadAsync();
  } catch (err) {
    console.warn("[OTA] Failed to reload:", err);
  }
}

/**
 * Get current OTA update information for settings/diagnostics.
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
