import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage, Language } from '../../context/LanguageContext';
import { triggerHaptic } from '../../utils/haptics';

export function LanguageScreen({ navigation }: { navigation: AppNavigationProp }) {
  const { colors } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const languageOptions: {
    code: Language;
    flag: string;
    nativeName: string;
    englishName: string;
  }[] = [
    {
      code: 'en',
      flag: '🇬🇧',
      nativeName: 'English (India)',
      englishName: 'English (India)',
    },
    {
      code: 'te',
      flag: '🇮🇳',
      nativeName: 'తెలుగు (India)',
      englishName: 'Telugu (India)',
    },
  ];

  const handleSelectLanguage = (lang: Language) => {
    triggerHaptic('selection');
    setLanguage(lang);
  };

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
          {t('languages')}
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {t('chooseLanguageSubtitle')}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('selectLanguage')}
          </Text>
        </View>

        <View style={styles.cardsList}>
          {languageOptions.map((opt) => {
            const isSelected = language === opt.code;

            return (
              <TouchableOpacity
                key={opt.code}
                style={[
                  styles.languageCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => handleSelectLanguage(opt.code)}
                activeOpacity={0.75}
              >
                <View style={styles.cardLeft}>
                  <View
                    style={[
                      styles.flagCircle,
                      {
                        backgroundColor: isSelected ? colors.primaryLight : colors.background,
                      },
                    ]}
                  >
                    <Text style={styles.flagEmoji}>{opt.flag}</Text>
                  </View>

                  <View style={styles.nameCol}>
                    <Text
                      style={[
                        styles.nativeName,
                        {
                          color: isSelected ? colors.primaryDark : colors.text,
                          fontSize: 16,
                          fontWeight: isSelected ? '800' : '700',
                        },
                      ]}
                    >
                      {opt.nativeName}
                    </Text>
                    <Text style={[styles.englishName, { color: colors.textSecondary }]}>
                      {opt.englishName}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.radioIndicator,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {isSelected && <Feather name="check" size={14} color="#FFFFFF" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tip / Note card */}
        <View
          style={[
            styles.noteCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Feather name="info" size={16} color={colors.primary} />
          <Text style={[styles.noteText, { color: colors.textSecondary, fontSize: 13 }]}>
            Changing the language immediately updates the navigation, categories, buttons, and settings across the app.
          </Text>
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
    gap: 16,
  },
  sectionHeader: {
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardsList: {
    gap: 12,
  },
  languageCard: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  flagCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagEmoji: {
    fontSize: 22,
  },
  nameCol: {
    flex: 1,
  },
  nativeName: {
    marginBottom: 2,
  },
  englishName: {
    fontSize: 12,
    fontWeight: '500',
  },
  radioIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  noteCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  noteText: {
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
  },
});
