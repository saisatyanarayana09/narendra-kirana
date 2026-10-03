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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import api, { getErrorMessage } from '../../services/api';
import { safeStorage } from '../../utils/storage';
import { GoogleSignin } from '../../utils/GoogleSigninWrapper';

if (Platform.OS !== 'web') {
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
  const [focusedField, setFocusedField] = useState<'identifier' | 'password' | null>(null);

  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'waking'>('checking');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { login } = useAuth();

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim());

  useEffect(() => {
    let isMounted = true;
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
    try {
      setGoogleLoading(true);
      await GoogleSignin.hasPlayServices();
      const userInfo: any = await GoogleSignin.signIn();
      const idToken = userInfo?.idToken;

      if (!idToken) {
        throw new Error('No Google ID token received');
      }

      const response = await api.post('/auth/google-login/', {
        credential: idToken,
        token_type: 'id_token',
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
      if (error?.code === 'SIGN_IN_CANCELLED' || error?.code === '12501') {
        // User cancelled login modal
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

      if (user) {
        await safeStorage.setItem('smart-kirana-owner-user', JSON.stringify(user));
      }
      await login(access, refresh);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        setErrorMsg(
          err?.response?.data?.detail ||
            'Unable to sign in. Please check your owner credentials.'
        );
      } else {
        setErrorMsg(getErrorMessage(err, 'Unable to sign in. Please verify your credentials.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.main, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollCol}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          {/* Top Bar: Theme Toggle & Background Wake Status */}
          <View style={styles.topBar}>
            {backendStatus === 'waking' ? (
              <View style={[styles.wakingPill, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb' }]}>
                <View style={styles.wakingDot} />
                <Text style={styles.wakingText}>Server waking up...</Text>
              </View>
            ) : <View />}

            <TouchableOpacity
              style={[
                styles.themeButton,
                {
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderColor: isDark ? '#1e293b' : '#e2e8f0',
                },
              ]}
              onPress={toggleTheme}
              accessibilityLabel="Toggle dark/light theme"
            >
              <Ionicons
                name={isDark ? 'sunny' : 'moon'}
                size={16}
                color={isDark ? '#fbbf24' : '#10b981'}
              />
            </TouchableOpacity>
          </View>

          {/* Clean Brand Header */}
          <View style={styles.brandContainer}>
            <View
              style={[
                styles.logoWrapper,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5',
                  borderColor: isDark ? 'rgba(52, 211, 153, 0.3)' : '#a7f3d0',
                },
              ]}
            >
              <Image
                source={require('../../../assets/images/narendra-logo.png')}
                style={styles.logoImage}
                contentFit="contain"
              />
            </View>

            <Text style={[styles.brandTitle, { color: colors.text }]}>
              NARENDRA <Text style={{ color: colors.primary }}>KIRANA</Text>
            </Text>
            <Text style={[styles.brandSubtitle, { color: colors.textMuted }]}>
              Store Owner & Management Portal
            </Text>
          </View>

          {/* Form Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                borderColor: isDark ? '#1e293b' : '#e2e8f0',
              },
            ]}
          >
            {/* Error Banner */}
            {errorMsg ? (
              <View
                style={[
                  styles.errorAlert,
                  {
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca',
                  },
                ]}
              >
                <Ionicons name="alert-circle" size={18} color="#ef4444" style={{ marginTop: 1 }} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Email / Username Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: isDark ? '#cbd5e1' : '#334155' }]}>
                Email or Username
              </Text>
              <View
                style={[
                  styles.inputField,
                  {
                    backgroundColor: isDark ? '#090d16' : '#f8fafc',
                    borderColor:
                      focusedField === 'identifier'
                        ? colors.primary
                        : isDark
                        ? '#1e293b'
                        : '#cbd5e1',
                  },
                ]}
              >
                <Ionicons
                  name={isEmail ? 'mail-outline' : 'person-outline'}
                  size={18}
                  color={focusedField === 'identifier' ? colors.primary : '#94a3b8'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="owner@store.com or username"
                  placeholderTextColor="#94a3b8"
                  value={identifier}
                  onChangeText={(text) => {
                    setIdentifier(text);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  onFocus={() => setFocusedField('identifier')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: isDark ? '#cbd5e1' : '#334155' }]}>
                  Password
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/forgot-password')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.forgotLink, { color: colors.primary }]}>
                    Forgot password?
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.inputField,
                  {
                    backgroundColor: isDark ? '#090d16' : '#f8fafc',
                    borderColor:
                      focusedField === 'password'
                        ? colors.primary
                        : isDark
                        ? '#1e293b'
                        : '#cbd5e1',
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={focusedField === 'password' ? colors.primary : '#94a3b8'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="Enter your password"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Primary Sign In Button */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.primary },
                loading && { opacity: 0.8 },
              ]}
              onPress={handleLogin}
              disabled={loading || googleLoading}
              activeOpacity={0.88}
            >
              {loading ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={styles.primaryBtnText}>Authenticating...</Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Text style={styles.primaryBtnText}>Sign in to Dashboard</Text>
                  <Ionicons name="arrow-forward" size={17} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>

            {/* Waking Server Helper Notice */}
            {backendStatus === 'waking' && loading ? (
              <Text style={styles.wakingNotice}>
                The server is booting from sleep. Please allow up to 30 seconds...
              </Text>
            ) : null}

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]} />
              <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]} />
            </View>

            {/* Google Sign In Button */}
            <TouchableOpacity
              style={[
                styles.googleBtn,
                {
                  backgroundColor: isDark ? '#090d16' : '#ffffff',
                  borderColor: isDark ? '#1e293b' : '#cbd5e1',
                },
              ]}
              onPress={handleGoogleLogin}
              disabled={loading || googleLoading}
              activeOpacity={0.88}
            >
              {googleLoading ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator color={isDark ? '#e2e8f0' : '#475569'} size="small" />
                  <Text style={[styles.googleBtnText, { color: isDark ? '#e2e8f0' : '#475569' }]}>
                    Connecting to Google...
                  </Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Ionicons name="logo-google" size={18} color="#ea4335" />
                  <Text style={[styles.googleBtnText, { color: isDark ? '#f8fafc' : '#1e293b' }]}>
                    Sign in with Google
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Security Badge Footer */}
          <View style={styles.securityFooter}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#10b981" />
            <Text style={[styles.securityText, { color: colors.textMuted }]}>
              Secure 256-Bit Encrypted Owner Console
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Desktop / Tablet Showcase Column */}
      {isWide && (
        <View style={styles.heroColumn}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1920',
            }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <View style={styles.heroBackdrop} />
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Ionicons name="storefront" size={14} color="#34d399" />
              <Text style={styles.heroBadgeText}>Smart Kirana Enterprise</Text>
            </View>

            <Text style={styles.heroHeading}>
              Manage your store{'\n'}
              <Text style={{ color: '#34d399' }}>with ease and precision.</Text>
            </Text>

            <Text style={styles.heroSubheading}>
              Real-time analytics, barcode inventory, order dispatch, and instant digital billing.
            </Text>

            <View style={styles.featuresList}>
              {[
                'Live Order Tracking & Push Alerts',
                'Fast Barcode & Stock Manager',
                'Instant Thermal & PDF Invoicing',
                'Delivery Fleet & Agent Dispatch',
              ].map((feature) => (
                <View key={feature} style={styles.featureItem}>
                  <View style={styles.featureBullet} />
                  <Text style={styles.featureText}>{feature}</Text>
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
  scrollCol: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  formContainer: {
    width: '100%',
    maxWidth: 420,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  wakingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 6,
  },
  wakingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
  },
  wakingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
  },
  themeButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 22,
  },
  logoWrapper: {
    width: 60,
    height: 60,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoImage: {
    width: 44,
    height: 44,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  forgotLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  inputIcon: {
    marginLeft: 12,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    paddingRight: 12,
  },
  eyeBtn: {
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
  },
  primaryBtn: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wakingNotice: {
    textAlign: 'center',
    marginTop: 10,
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  googleBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },
  securityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  heroColumn: {
    flex: 1,
    backgroundColor: '#020617',
    position: 'relative',
    justifyContent: 'flex-end',
  },
  heroBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 13, 22, 0.76)',
  },
  heroContent: {
    padding: 56,
    maxWidth: 600,
    zIndex: 10,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(52, 211, 153, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  heroBadgeText: {
    color: '#6ee7b7',
    fontSize: 12,
    fontWeight: '800',
  },
  heroHeading: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 42,
    marginBottom: 12,
  },
  heroSubheading: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
  },
  featureText: {
    color: '#f1f5f9',
    fontSize: 13,
    fontWeight: '600',
  },
});
