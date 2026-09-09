import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { useTheme, ThemeMode } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { triggerHaptic, getVibrationEnabled, setVibrationEnabled } from '../../utils/haptics';
import { APP_VERSION } from '../../constants/config';
import { storeApi } from '../../api/store';
import {
  checkAppVersion,
  downloadAndInstallApk,
  installDownloadedApk,
  UpdateCheckResult,
  DownloadProgressInfo,
  DEFAULT_APK_URL,
} from '../../services/updateService';

export function AppSettingsScreen({ navigation }: { navigation: AppNavigationProp }) {
  const { colors, themeMode, toggleThemeMode, isDark } = useTheme();
  const { t } = useLanguage();
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [vibrationOn, setVibrationOn] = useState(() => getVibrationEnabled());
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateProgressText, setUpdateProgressText] = useState('');
  const [downloadedUpdateUri, setDownloadedUpdateUri] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const handleToggleVibration = async () => {
    const nextVal = !vibrationOn;
    setVibrationOn(nextVal);
    await setVibrationEnabled(nextVal);
  };

  const handleCheckUpdates = async () => {
    if (checkingUpdates || isDownloadingUpdate) return;
    triggerHaptic('light');
    setCheckingUpdates(true);
    setUpdateError(null);

    try {
      const settings = await storeApi.getSettings();
      const result = checkAppVersion(settings);

      if (result.hasUpdate) {
        triggerHaptic('success');
        setUpdateInfo(result);
      } else {
        triggerHaptic('success');
        setUpdateInfo(null);
        Alert.alert(
          t('upToDate') || 'Up to Date',
          `Narendra Kirana v${APP_VERSION} is currently the latest version. Checked just now.`,
          [{ text: 'OK' }]
        );
      }
    } catch {
      triggerHaptic('error');
      Alert.alert(
        'Check Failed',
        'Could not connect to update server. Please check your internet connection.',
        [{ text: 'OK' }]
      );
    } finally {
      setCheckingUpdates(false);
    }
  };

  const handleStartInAppUpdate = async () => {
    if (!updateInfo) return;

    if (downloadedUpdateUri) {
      try {
        await installDownloadedApk(downloadedUpdateUri);
      } catch {
        Alert.alert('Notice', 'Could not open package installer. Please check app permissions or download via browser.');
      }
      return;
    }

    triggerHaptic('medium');
    setIsDownloadingUpdate(true);
    setUpdateProgress(0);
    setUpdateProgressText('Connecting...');
    setUpdateError(null);

    const res = await downloadAndInstallApk(updateInfo.updateUrl, (info: DownloadProgressInfo) => {
      setUpdateProgress(info.percent);
      setUpdateProgressText(info.progressText);
    });

    setIsDownloadingUpdate(false);

    if (res.success && res.uri) {
      triggerHaptic('success');
      setDownloadedUpdateUri(res.uri);
      setUpdateProgressText('Download completed. Tap to install.');
    } else if (!res.success) {
      triggerHaptic('error');
      setUpdateError(res.error || 'Failed to download update.');
    }
  };

  const appearanceOptions: { mode: ThemeMode; label: string; icon: keyof typeof Feather.glyphMap; desc: string }[] = [
    {
      mode: 'light',
      label: t('light'),
      icon: 'sun',
      desc: 'Clean & bright appearance',
    },
    {
      mode: 'dark',
      label: t('dark'),
      icon: 'moon',
      desc: 'Easy on the eyes at night',
    },
    {
      mode: 'system',
      label: t('system'),
      icon: 'smartphone',
      desc: 'Matches device system settings',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            triggerHaptic('light');
            navigation.goBack();
          }}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color={colors.primary} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>{t('back')}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: 20 }]}>
          {t('appSettings')}
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {t('appearanceHint')}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Section 1: Appearance */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Feather name="sun" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 16 }]}>
              {t('appearance')}
            </Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            {t('appearanceHint')}
          </Text>

          <View style={styles.optionsContainer}>
            {appearanceOptions.map((item) => {
              const isSelected = themeMode === item.mode;
              return (
                <TouchableOpacity
                  key={item.mode}
                  style={[
                    styles.radioCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => {
                    triggerHaptic('selection');
                    toggleThemeMode(item.mode);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={styles.radioCardLeft}>
                    <View
                      style={[
                        styles.iconBadge,
                        {
                          backgroundColor: isSelected ? colors.primaryLight : (colors.background),
                        },
                      ]}
                    >
                      <Feather
                        name={item.icon}
                        size={18}
                        color={isSelected ? colors.primaryDark : colors.textSecondary}
                      />
                    </View>
                    <View style={styles.cardTextCol}>
                      <Text
                        style={[
                          styles.optionTitle,
                          {
                            color: isSelected ? colors.primaryDark : colors.text,
                            fontSize: 15,
                            fontWeight: isSelected ? '800' : '600',
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                        {item.desc}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                      },
                    ]}
                  >
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 2: Vibration / Haptic Feedback */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Feather name="activity" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 16 }]}>
              Haptic Feedback & Vibration
            </Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Vibrate on button clicks, cart updates, and order confirmations
          </Text>

          <TouchableOpacity
            style={[
              styles.vibrationCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={handleToggleVibration}
            activeOpacity={0.8}
          >
            <View style={styles.vibrationCardLeft}>
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: vibrationOn ? colors.primaryLight : colors.background,
                  },
                ]}
              >
                <Feather
                  name={vibrationOn ? 'smartphone' : 'volume-x'}
                  size={18}
                  color={vibrationOn ? colors.primaryDark : colors.textSecondary}
                />
              </View>
              <View style={styles.cardTextCol}>
                <Text style={[styles.optionTitle, { color: colors.text, fontSize: 15, fontWeight: '700' }]}>
                  {vibrationOn ? 'Vibration On' : 'Vibration Off'}
                </Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                  {vibrationOn ? 'Haptic ticks enabled across the app' : 'Muted vibration and silent feedback'}
                </Text>
              </View>
            </View>

            {/* Switch Capsule Toggle */}
            <View
              style={[
                styles.switchTrack,
                {
                  backgroundColor: vibrationOn ? colors.primary : colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.switchThumb,
                  vibrationOn ? styles.switchThumbOn : styles.switchThumbOff,
                ]}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 3 (Mobile only): App Version */}
        <View
          style={[
            styles.versionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.versionRow}>
            <View style={styles.versionIconWrap}>
              <Feather name="info" size={18} color={colors.primary} />
            </View>
            <View style={styles.versionInfoCol}>
              <Text style={[styles.versionLabel, { color: colors.textSecondary }]}>
                {t('appVersion')}
              </Text>
              <Text
                style={[
                  styles.versionValue,
                  { color: colors.text, fontSize: 15 },
                ]}
              >
                Narendra Kirana v{APP_VERSION}
              </Text>
            </View>
          </View>
        </View>

        {/* In-App Update Available Card */}
        {Boolean(updateInfo?.hasUpdate) && (
          <View
            style={[
              styles.updateCard,
              {
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5',
                borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
              },
            ]}
          >
            <View style={styles.updateCardHeader}>
              <View style={[styles.updateBadge, { backgroundColor: colors.primary }]}>
                <Feather name="zap" size={12} color="#FFFFFF" />
                <Text style={styles.updateBadgeText}>NEW UPDATE</Text>
              </View>
              <Text style={[styles.updateVersionHeading, { color: colors.text }]}>
                v{updateInfo?.targetVersion} Available
              </Text>
            </View>

            <Text style={[styles.updateCardMessage, { color: colors.textSecondary }]}>
              {updateInfo?.updateMessage}
            </Text>

            {/* Progress Bar while downloading */}
            {isDownloadingUpdate && (
              <View style={[styles.inAppProgressWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.inAppProgressRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.inAppProgressLabel, { color: colors.text }]}>Downloading Update...</Text>
                  </View>
                  <Text style={[styles.inAppProgressPct, { color: colors.primary }]}>{updateProgress}%</Text>
                </View>
                <View style={[styles.progressBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${updateProgress}%`, backgroundColor: colors.primary },
                    ]}
                  />
                </View>
                <View style={styles.inAppProgressRow}>
                  <Text style={[styles.progressBytesText, { color: colors.textSecondary }]}>
                    {updateProgressText || 'Downloading APK...'}
                  </Text>
                  <Text style={[styles.progressBytesText, { color: colors.textSecondary }]}>1-Tap Updater</Text>
                </View>
              </View>
            )}

            {/* Downloaded and ready */}
            {Boolean(downloadedUpdateUri) && !isDownloadingUpdate && (
              <View style={[styles.readyCardSmall, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5' }]}>
                <Feather name="check-circle" size={16} color="#059669" />
                <Text style={[styles.readyCardSmallText, { color: isDark ? '#34D399' : '#047857' }]}>
                  Update package downloaded & ready to install!
                </Text>
              </View>
            )}

            {/* Download Error */}
            {Boolean(updateError) && !isDownloadingUpdate && (
              <View style={[styles.errorCardSmall, { backgroundColor: '#FEF2F2' }]}>
                <Feather name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorCardSmallText}>{updateError}</Text>
              </View>
            )}

            {/* 1-Tap Action Button */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: colors.primary },
                isDownloadingUpdate && { opacity: 0.8 },
              ]}
              onPress={handleStartInAppUpdate}
              disabled={isDownloadingUpdate}
              activeOpacity={0.85}
            >
              {isDownloadingUpdate ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Downloading ({updateProgress}%)...</Text>
                </>
              ) : downloadedUpdateUri ? (
                <>
                  <Feather name="package" size={16} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Install Downloaded Update</Text>
                </>
              ) : (
                <>
                  <Feather name="download" size={16} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>1-Tap In-App Update</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.browserLinkBtnSmall}
              onPress={() => Linking.openURL(updateInfo?.updateUrl || DEFAULT_APK_URL)}
              activeOpacity={0.7}
            >
              <Text style={[styles.browserLinkBtnSmallText, { color: colors.primary }]}>
                Download via Browser instead
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Section 4 (Mobile only): Check for Updates */}
        <View style={styles.updateSection}>
          <TouchableOpacity
            style={[
              styles.updateButton,
              { backgroundColor: updateInfo?.hasUpdate ? colors.surface : colors.primary },
              updateInfo?.hasUpdate && { borderWidth: 1, borderColor: colors.border },
              checkingUpdates && { opacity: 0.8 },
            ]}
            onPress={handleCheckUpdates}
            disabled={checkingUpdates || isDownloadingUpdate}
            activeOpacity={0.8}
          >
            {checkingUpdates ? (
              <View style={styles.buttonInnerRow}>
                <ActivityIndicator size="small" color={updateInfo?.hasUpdate ? colors.text : '#FFFFFF'} />
                <Text style={[styles.updateButtonText, updateInfo?.hasUpdate && { color: colors.text }]}>
                  {t('checkingUpdates')}
                </Text>
              </View>
            ) : (
              <View style={styles.buttonInnerRow}>
                <Feather name="refresh-cw" size={16} color={updateInfo?.hasUpdate ? colors.text : '#FFFFFF'} />
                <Text style={[styles.updateButtonText, updateInfo?.hasUpdate && { color: colors.text }]}>
                  {updateInfo?.hasUpdate ? 'Check Again' : t('checkForUpdates')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  section: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontWeight: '800',
  },
  sectionDesc: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: -4,
  },
  optionsContainer: {
    gap: 10,
    marginTop: 4,
  },
  radioCard: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  radioCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTextCol: {
    flex: 1,
  },
  optionTitle: {
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 12,
    fontWeight: '500',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  previewCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 4,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  previewTitle: {
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewBodyText: {
    lineHeight: 20,
    fontWeight: '500',
  },
  versionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vibrationCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
    marginTop: 4,
  },
  vibrationCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2.5,
    elevation: 2,
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  switchThumbOff: {
    alignSelf: 'flex-start',
  },
  versionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  versionInfoCol: {
    flex: 1,
  },
  versionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  versionValue: {
    fontWeight: '800',
    marginTop: 2,
  },
  updateSection: {
    marginTop: 4,
  },
  updateButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  updateCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  updateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  updateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  updateBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  updateVersionHeading: {
    fontSize: 16,
    fontWeight: '800',
  },
  updateCardMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  inAppProgressWrap: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  inAppProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inAppProgressLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  inAppProgressPct: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 8,
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressBytesText: {
    fontSize: 11,
    fontWeight: '600',
  },
  readyCardSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
  },
  readyCardSmallText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  errorCardSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorCardSmallText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
    flex: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  browserLinkBtnSmall: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  browserLinkBtnSmallText: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
