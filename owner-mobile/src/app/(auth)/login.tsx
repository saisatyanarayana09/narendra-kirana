import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import api, { getErrorMessage } from '../../services/api';
import { safeStorage } from '../../utils/storage';
let GoogleSignin: any = null;
try {
  const gModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = gModule?.GoogleSignin || null;
} catch {
  // RNGoogleSignin native module is not registered in this binary (e.g. Expo Go, Web)
}

const SAVED_USERNAME_KEY = 'smart-kirana-owner-username';

if (GoogleSignin && Platform.OS !== 'web') {
  try {
    GoogleSignin.configure({
      webClientId: '729937153109-6e8fivp20b3ri2qsah1d6u2a7oi0uls6.apps.googleusercontent.com',
      iosClientId: '',
    });
  } catch {}
}


export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 960;
  const { isDark, toggleTheme, colors } = useAppTheme();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'waking'>('checking');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { login } = useAuth();

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim());

  useEffect(() => {
    let isMounted = true;
    // Username autofill removed per user request

    api
      .get('/store/settings/')
      .then(() => {
        if (isMounted) setBackendStatus('online');
      })
      .catch(() => {
        if (isMounted) setBackendStatus('waking');
      });

    return () => {
      isMounted = false;
    };
  }, []);


  const handleGoogleLogin = async () => {
    if (!GoogleSignin) {
      setErrorMsg('Google Sign-In requires the installed Android APK build with Play Services.');
      return;
    }
    try {
      setGoogleLoading(true);
      await GoogleSignin.hasPlayServices();
      const userInfo: any = await GoogleSignin.signIn();
      const idToken = userInfo?.data?.idToken || userInfo?.idToken;

      if (!idToken) {
        throw new Error('No ID token found');
      }

      const response = await api.post('/auth/google-login/', {
        credential: idToken,
        token_type: 'id_token'
      });

      const data = response?.data || {};
      const { access, refresh, user } = data;

      if (user) {
        await safeStorage.setItem('smart-kirana-owner-user', JSON.stringify(user));
      }
      if (access && refresh) {
        await login(access, refresh);
      }
    } catch (error: any) {
      if (error.code === 'SIGN_IN_CANCELLED' || error.code === '12501') {
        // user cancelled the login flow
      } else {
        setErrorMsg(error?.response?.data?.detail || 'Google Sign-In failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    const cleanId = identifier.trim();
    if (!cleanId || !password) {
      setErrorMsg('Please enter your email/username and password.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      const response = await api.post('/auth/login/', {
        username: cleanId,
        email: isEmail ? cleanId : undefined,
        password,
      });

      const data = response?.data || {};
      const { access, refresh, user } = data;

      if (!access) {
        setErrorMsg('Invalid login response from server.');
        return;
      }

      if (user && !user.is_owner && !user.is_staff) {
        setErrorMsg('This account does not have store owner/management access.');
        return;
      }

      // await safeStorage.setItem(SAVED_USERNAME_KEY, cleanId);
      if (user) {
        await safeStorage.setItem('smart-kirana-owner-user', JSON.stringify(user));
      }
      await login(access, refresh);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        setErrorMsg(
          err?.response?.data?.detail ||
            'Unable to sign in. Please verify your owner credentials.'
        );
      } else {
        setErrorMsg(getErrorMessage(err, 'Unable to sign in. Please verify your credentials.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.main, { backgroundColor: isDark ? '#020617' : '#ffffff' }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Left Column: Form & Brand Console */}
      <ScrollView
        style={styles.leftCol}
        contentContainerStyle={styles.leftContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formBox}>
          {/* Top Status & Switcher Header */}
          <View style={styles.topHeaderRow}>
            <View
              style={[
                styles.statusPill,
                backendStatus === 'online'
                  ? isDark
                    ? styles.statusOnlineDark
                    : styles.statusOnlineLight
                  : isDark
                    ? styles.statusWakingDark
                    : styles.statusWakingLight,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: backendStatus === 'online' ? '#10b981' : '#f59e0b' },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      backendStatus === 'online'
                        ? isDark
                          ? '#6ee7b7'
                          : '#065f46'
                        : isDark
                          ? '#fcd34d'
                          : '#92400e',
                  },
                ]}
              >
                {backendStatus === 'online'
                  ? 'Render Server Online'
                  : backendStatus === 'waking'
                    ? 'Waking Up Server...'
                    : 'Connecting...'}
              </Text>
            </View>

            <View style={styles.topRightActions}>
              <TouchableOpacity
                style={[
                  styles.themeToggle,
                  {
                    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                    borderColor: colors.border,
                  },
                ]}
                onPress={toggleTheme}
              >
                <Ionicons
                  name={isDark ? 'sunny' : 'moon'}
                  size={14}
                  color={isDark ? '#fbbf24' : '#4f46e5'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.vaultLink}
                onPress={() => Linking.openURL('https://narendra-kirana.onrender.com/')}
              >
                <Text style={[styles.vaultLinkText, { color: isDark ? '#818cf8' : '#4f46e5' }]}>
                  Backend Vault
                </Text>
                <Ionicons
                  name="arrow-up-outline"
                  size={13}
                  color={isDark ? '#818cf8' : '#4f46e5'}
                  style={{ transform: [{ rotate: '45deg' }] }}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Brand Header */}
          <View style={styles.brandSection}>
            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <Image
                  source={require('../../../assets/images/narendra-logo.png')}
                  style={styles.brandLogoImg}
                  contentFit="contain"
                />
              </View>
              <View>
                <Text
                  style={[
                    styles.brandTagline,
                    { color: isDark ? '#34d399' : '#064e3b' },
                  ]}
                >
                  NARENDRA{' '}
                  <Text style={{ color: isDark ? '#818cf8' : '#4f46e5' }}>KIRANA</Text>
                </Text>
                <Text style={[styles.portalTitle, { color: colors.text }]}>Owner Portal</Text>
              </View>
            </View>
            <Text style={[styles.portalSubtitle, { color: colors.textMuted }]}>
              Sign in with your registered{' '}
              <Text style={{ fontWeight: '700', color: colors.text }}>Owner Email</Text> or
              username to manage orders, inventory, and sales.
            </Text>
          </View>

          {/* Error Banner */}
          {errorMsg ? (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: isDark ? 'rgba(127, 29, 29, 0.35)' : '#fef2f2',
                  borderColor: isDark ? '#991b1b' : '#fecaca',
                },
              ]}
            >
              <Text style={{ fontSize: 14 }}>⚠️</Text>
              <Text
                style={[
                  styles.errorBoxText,
                  { color: isDark ? '#fca5a5' : '#b91c1c' },
                ]}
              >
                {errorMsg}
              </Text>
            </View>
          ) : null}

          {/* Dynamic Email or Username Field */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: isDark ? '#e2e8f0' : '#334155' }]}>
                Email or Username
              </Text>
              <Text
                style={[
                  styles.fieldBadge,
                  { color: isEmail ? (isDark ? '#818cf8' : '#4f46e5') : '#94a3b8' },
                ]}
              >
                {isEmail ? '✓ EMAIL' : 'EMAIL OR USERNAME'}
              </Text>
            </View>

            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderColor: isDark ? '#1e293b' : '#e2e8f0',
                },
              ]}
            >
              <Ionicons
                name={isEmail ? 'mail-outline' : 'person-outline'}
                size={18}
                color={isEmail ? (isDark ? '#818cf8' : '#4f46e5') : '#94a3b8'}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="perali.narendra@gmail.com or username"
                placeholderTextColor="#94a3b8"
                value={identifier}
                onChangeText={(text) => {
                  setIdentifier(text);
                  if (errorMsg) setErrorMsg(null);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: isDark ? '#e2e8f0' : '#334155' }]}>
                Password
              </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={[styles.forgotLinkText, { color: isDark ? '#818cf8' : '#4f46e5' }]}>
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderColor: isDark ? '#1e293b' : '#e2e8f0',
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color="#94a3b8"
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="Enter owner account password"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMsg) setErrorMsg(null);
                }}
                secureTextEntry={!showPassword}
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword((prev) => !prev)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit CTA Button */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.75 }]}
            onPress={handleLogin}
            disabled={loading || googleLoading}
          >
            {loading ? (
              <View style={styles.btnContent}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={styles.submitBtnText}>Authenticating...</Text>
              </View>
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.submitBtnText}>Sign in to Dashboard</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" />
              </View>
            )}
          </TouchableOpacity>

          {backendStatus === 'waking' && loading && !googleLoading ? (
            <Text style={{ textAlign: 'center', marginTop: 12, color: '#f59e0b', fontSize: 12, fontWeight: '600' }}>
              The server is waking up from sleep. This may take up to 45 seconds...
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: isDark ? '#334155' : '#e2e8f0' }} />
            <Text style={{ marginHorizontal: 10, color: '#94a3b8', fontSize: 13, fontWeight: '600' }}>OR CONTINUE WITH</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: isDark ? '#334155' : '#e2e8f0' }} />
          </View>

          
          <TouchableOpacity
            style={[
              styles.submitBtn, 
              { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderWidth: 1, borderColor: isDark ? '#334155' : '#cbd5e1', marginTop: 0, boxShadow: 'none', elevation: 0 }
            ]}
            onPress={handleGoogleLogin}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <View style={styles.btnContent}>
                <ActivityIndicator color={isDark ? '#e2e8f0' : '#475569'} size="small" />
                <Text style={[styles.submitBtnText, { color: isDark ? '#e2e8f0' : '#475569' }]}>Connecting...</Text>
              </View>
            ) : (
              <View style={styles.btnContent}>
                <Ionicons name="logo-google" size={18} color={isDark ? '#e2e8f0' : '#475569'} />
                <Text style={[styles.submitBtnText, { color: isDark ? '#e2e8f0' : '#475569' }]}>Sign in with Google</Text>
              </View>
            )}
          </TouchableOpacity>


          {/* Footer Customer Storefront Link */}
          <View style={[styles.footerBox, { borderTopColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              Manage orders, inventory, delivery fleet & analytics in real-time.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Right Column: Hero Showcase (Wide/Desktop Screens) */}
      {isWide && (
        <View style={styles.rightHero}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1920',
            }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#34d399" />
              <Text style={styles.heroBadgeText}>Retail Management & Cloud Sync</Text>
            </View>
            <Text style={styles.heroTitle}>
              Manage your store{'\n'}
              <Text style={{ color: '#34d399' }}>effortlessly in real-time.</Text>
            </Text>
            <Text style={styles.heroDesc}>
              Track orders, manage inventory, and view analytics.
            </Text>
            <View style={styles.heroFeaturesGrid}>
              {[
                'Unified Email Authentication',
                'Automatic Role Sync',
                'Dedicated Password Recovery',
                'Direct Render Vault Access',
              ].map((feat) => (
                <View key={feat} style={styles.heroFeatureItem}>
                  <View style={styles.heroFeatureDot} />
                  <Text style={styles.heroFeatureText}>{feat}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    flexDirection: 'row',
  },
  leftCol: {
    flex: 1,
  },
  leftContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  formBox: {
    width: '100%',
    maxWidth: 430,
  },
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 7,
  },
  statusOnlineLight: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  statusOnlineDark: {
    backgroundColor: 'rgba(6, 78, 59, 0.45)',
    borderColor: '#065f46',
  },
  statusWakingLight: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  statusWakingDark: {
    backgroundColor: 'rgba(120, 53, 15, 0.45)',
    borderColor: '#92400e',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themeToggle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vaultLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  vaultLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  brandSection: {
    marginBottom: 28,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.28)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  brandLogoImg: {
    width: 42,
    height: 42,
  },
  brandTagline: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  portalTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  portalSubtitle: {
    fontSize: 14,
    lineHeight: 21,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  errorBoxText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  fieldBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  forgotLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    height: 50,
  },
  inputIcon: {
    marginLeft: 14,
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    paddingRight: 12,
  },
  eyeButton: {
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
  },
  submitBtn: {
    backgroundColor: '#4f46e5',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    boxShadow: '0px 6px 14px rgba(79, 70, 229, 0.35)',
    elevation: 5,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  footerBox: {
    marginTop: 32,
    paddingTop: 22,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
  rightHero: {
    flex: 1,
    backgroundColor: '#020617',
    position: 'relative',
    justifyContent: 'flex-end',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 13, 22, 0.72)',
  },
  heroContent: {
    padding: 56,
    maxWidth: 640,
    zIndex: 10,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(52, 211, 153, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  heroBadgeText: {
    color: '#6ee7b7',
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 44,
    marginBottom: 14,
  },
  heroDesc: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 24,
  },
  heroFeaturesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  heroFeatureItem: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroFeatureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
  },
  heroFeatureText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
});
