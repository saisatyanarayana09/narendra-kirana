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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { useTheme, ThemeMode, FontSize } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { triggerHaptic } from '../../utils/haptics';

export function AppSettingsScreen({ navigation }: { navigation: AppNavigationProp }) {
  const { colors, themeMode, fontSize, toggleThemeMode, setFontSize, fontSizeMultiplier } = useTheme();
  const { t } = useLanguage();
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  const handleCheckUpdates = () => {
    if (checkingUpdates) return;
    triggerHaptic('light');
    setCheckingUpdates(true);

    setTimeout(() => {
      setCheckingUpdates(false);
      triggerHaptic('success');
      Alert.alert(
        t('upToDate'),
        'Smart Kirana v1.0.0 is currently the latest version. Checked just now.',
        [{ text: 'OK' }]
      );
    }, 1200);
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

  const fontSizeOptions: { size: FontSize; label: string; percent: string; preview: number }[] = [
    {
      size: 'normal',
      label: t('normal'),
      percent: '100%',
      preview: 14,
    },
    {
      size: 'large',
      label: t('large'),
      percent: '112%',
      preview: 16,
    },
    {
      size: 'extra_large',
      label: t('extraLarge'),
      percent: '122%',
      preview: 18,
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
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: 20 * fontSizeMultiplier }]}>
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
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 16 * fontSizeMultiplier }]}>
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
                            fontSize: 15 * fontSizeMultiplier,
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

        {/* Section 2: Font Size */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Feather name="type" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 16 * fontSizeMultiplier }]}>
              {t('fontSize')}
            </Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            {t('fontSizeHint')}
          </Text>

          <View style={styles.optionsContainer}>
            {fontSizeOptions.map((item) => {
              const isSelected = fontSize === item.size;
              return (
                <TouchableOpacity
                  key={item.size}
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
                    setFontSize(item.size);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={styles.radioCardLeft}>
                    <View
                      style={[
                        styles.iconBadge,
                        {
                          backgroundColor: isSelected ? colors.primaryLight : colors.background,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: item.preview,
                          fontWeight: '800',
                          color: isSelected ? colors.primaryDark : colors.textSecondary,
                        }}
                      >
                        Aa
                      </Text>
                    </View>
                    <View style={styles.cardTextCol}>
                      <Text
                        style={[
                          styles.optionTitle,
                          {
                            color: isSelected ? colors.primaryDark : colors.text,
                            fontSize: 15 * fontSizeMultiplier,
                            fontWeight: isSelected ? '800' : '600',
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                        {item.percent} scale factor
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

          {/* Live Preview Card */}
          <View
            style={[
              styles.previewCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.previewHeader}>
              <Feather name="eye" size={15} color={colors.primary} />
              <Text
                style={[
                  styles.previewTitle,
                  { color: colors.primary, fontSize: 13 * fontSizeMultiplier },
                ]}
              >
                {t('previewTitle')}
              </Text>
            </View>
            <Text
              style={[
                styles.previewBodyText,
                { color: colors.text, fontSize: 14 * fontSizeMultiplier },
              ]}
            >
              {t('previewText')}
            </Text>
          </View>
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
                  { color: colors.text, fontSize: 15 * fontSizeMultiplier },
                ]}
              >
                Smart Kirana v1.0.0 (Build 1)
              </Text>
            </View>
          </View>
        </View>

        {/* Section 4 (Mobile only): Check for Updates */}
        <View style={styles.updateSection}>
          <TouchableOpacity
            style={[
              styles.updateButton,
              { backgroundColor: colors.primary },
              checkingUpdates && { opacity: 0.8 },
            ]}
            onPress={handleCheckUpdates}
            disabled={checkingUpdates}
            activeOpacity={0.8}
          >
            {checkingUpdates ? (
              <View style={styles.buttonInnerRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.updateButtonText}>{t('checkingUpdates')}</Text>
              </View>
            ) : (
              <View style={styles.buttonInnerRow}>
                <Feather name="refresh-cw" size={16} color="#FFFFFF" />
                <Text style={styles.updateButtonText}>{t('checkForUpdates')}</Text>
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
});
