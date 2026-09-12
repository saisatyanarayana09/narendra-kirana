import { Platform, Linking } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { APP_VERSION } from '../constants/config';
import { StoreSettings } from '../api/store';

export const DEFAULT_APK_URL =
  'https://github.com/saisatyanarayana09/narendra-kirana/releases/latest/download/narendra-kirana.apk';

export function isVersionOlder(currentVersion: string, targetVersion: string): boolean {
  if (!targetVersion) return false;
  const cleanCurrent = currentVersion.replace(/^[^0-9]+/, '').trim();
  const cleanTarget = targetVersion.replace(/^[^0-9]+/, '').trim();
  const cParts = cleanCurrent.split('.').map((p) => parseInt(p, 10) || 0);
  const tParts = cleanTarget.split('.').map((p) => parseInt(p, 10) || 0);
  const len = Math.max(cParts.length, tParts.length);
  for (let i = 0; i < len; i++) {
    const c = cParts[i] || 0;
    const t = tParts[i] || 0;
    if (c < t) return true;
    if (c > t) return false;
  }
  return false;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  isForced: boolean;
  currentVersion: string;
  targetVersion: string;
  updateUrl: string;
  updateMessage: string;
}

export function checkAppVersion(settings: StoreSettings | null): UpdateCheckResult {
  const currentVersion = APP_VERSION;
  const minVersion = settings?.min_mobile_version || '';
  const latestVersion = settings?.latest_mobile_version || '';

  const isMinOlder = minVersion ? isVersionOlder(currentVersion, minVersion) : false;
  const isLatestOlder = latestVersion ? isVersionOlder(currentVersion, latestVersion) : false;

  const isForced = isMinOlder && Boolean(settings?.force_app_update);
  const hasUpdate = isForced || isLatestOlder;

  const targetVersion = isForced ? minVersion : (latestVersion || minVersion || currentVersion);
  const rawUrl = settings?.app_update_url?.trim() || '';
  // Ensure we use a direct APK URL for in-app downloads, not a Play Store redirect
  const isPlayStore = rawUrl.includes('play.google.com') || rawUrl.startsWith('market://');
  const updateUrl = (rawUrl && !isPlayStore) ? rawUrl : DEFAULT_APK_URL;
  const updateMessage = settings?.app_update_message ||
    'A new and improved version of Narendra Kirana is available. Please update to continue shopping.';

  return {
    hasUpdate,
    isForced,
    currentVersion,
    targetVersion,
    updateUrl,
    updateMessage,
  };
}

let activeDownload: FileSystem.DownloadResumable | null = null;

export async function cancelApkDownload(): Promise<void> {
  if (activeDownload) {
    try {
      await activeDownload.cancelAsync();
    } catch {
      // Ignore cancellation errors
    } finally {
      activeDownload = null;
    }
  }
}

export async function installDownloadedApk(fileUri: string): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new Error('In-app APK installation is only supported on Android devices.');
  }

  const contentUri = await FileSystem.getContentUriAsync(fileUri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    type: 'application/vnd.android.package-archive',
    flags: 1 | 268435456, // FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK
  });
}

export interface DownloadProgressInfo {
  percent: number; // 0 to 100
  bytesWritten: number;
  totalBytes: number;
  progressText: string;
}

export async function downloadAndInstallApk(
  apkUrl: string,
  onProgress?: (info: DownloadProgressInfo) => void
): Promise<{ success: boolean; uri?: string; error?: string }> {
  let cleanUrl = apkUrl?.trim() || DEFAULT_APK_URL;

  // If a Play Store URL was passed, fall back to the direct APK URL so Android downloads within the app
  if (cleanUrl.includes('play.google.com') || cleanUrl.startsWith('market://')) {
    cleanUrl = DEFAULT_APK_URL;
  }

  // On non-Android (iOS/Web), redirect to external browser/store
  if (Platform.OS !== 'android') {
    await Linking.openURL(cleanUrl);
    return { success: true };
  }

  try {
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      // Fallback to browser if no cache directory
      await Linking.openURL(cleanUrl);
      return { success: true };
    }

    const localApkPath = `${cacheDir}NarendraKirana_update.apk`;

    // Remove any stale download
    try {
      const existing = await FileSystem.getInfoAsync(localApkPath);
      if (existing.exists) {
        await FileSystem.deleteAsync(localApkPath, { idempotent: true });
      }
    } catch {
      // Ignore cleanup error
    }

    // Cancel any in-flight download
    await cancelApkDownload();

    const downloadUrl = cleanUrl.includes('?')
      ? `${cleanUrl}&_t=${Date.now()}`
      : `${cleanUrl}?_t=${Date.now()}`;

    activeDownload = FileSystem.createDownloadResumable(
      downloadUrl,
      localApkPath,
      {},
      (progress) => {
        const bytesWritten = progress.totalBytesWritten;
        const totalBytes = progress.totalBytesExpectedToWrite;
        let percent = 0;
        let progressText = '';

        if (totalBytes > 0) {
          percent = Math.min(100, Math.max(0, Math.round((bytesWritten / totalBytes) * 100)));
          const mbWritten = (bytesWritten / (1024 * 1024)).toFixed(1);
          const mbTotal = (totalBytes / (1024 * 1024)).toFixed(1);
          progressText = `${mbWritten} MB / ${mbTotal} MB (${percent}%)`;
        } else {
          const mbWritten = (bytesWritten / (1024 * 1024)).toFixed(1);
          progressText = `${mbWritten} MB downloaded`;
        }

        if (onProgress) {
          onProgress({
            percent,
            bytesWritten,
            totalBytes,
            progressText,
          });
        }
      }
    );

    const result = await activeDownload.downloadAsync();
    activeDownload = null;

    if (!result || !result.uri) {
      throw new Error('Download did not return a valid file URI.');
    }

    if (result.status && result.status >= 400) {
      throw new Error(`Server returned HTTP ${result.status}. APK update file not found.`);
    }

    // Trigger installation
    await installDownloadedApk(result.uri);

    return { success: true, uri: result.uri };
  } catch (err: any) {
    activeDownload = null;
    return {
      success: false,
      error: err?.message || 'Failed to download or install update package.',
    };
  }
}
