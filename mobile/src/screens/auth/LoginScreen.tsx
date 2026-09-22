import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  Image
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather, AntDesign } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

GoogleSignin.configure({
  webClientId: '729937153109-6e8fivp20b3ri2qsah1d6u2a7oi0uls6.apps.googleusercontent.com',
  offlineAccess: false,
});

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

export function LoginScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const { login, loginWithGoogle, pendingRedirect, clearPendingRedirect } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const processRedirect = () => {
    if (pendingRedirect) {
      const { screen, tab, params } = pendingRedirect;
      clearPendingRedirect();
      if (tab) {
        (navigation as any).navigate('Main', {
          screen: tab,
          params: { screen, params },
        });
      } else {
        (navigation as any).navigate(screen as any, params);
      }
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).navigate('Main' as any);
    }
  };

  const handleGoogleLogin = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Google Sign-In is only supported on the Android/iOS mobile app, not on the web browser.');
      return;
    }

    try {
      setIsGoogleLoading(true);
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = (response as any).data?.idToken || (response as any).idToken;
      if (idToken) {
        await loginWithGoogle(idToken);
        processRedirect();
      } else {
        throw new Error('No ID token present!');
      }
    } catch (error: any) {
      console.error('Google Signin Error:', error);
      Alert.alert('Google Sign-In Failed', error.message || 'Something went wrong.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Required Fields', 'Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await login({ username: email.trim(), password });
      processRedirect();
    } catch (error: any) {
      Alert.alert(
        'Login Failed', 
        error.response?.data?.detail || error.response?.data?.error || 'Invalid email or password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <KeyboardAwareScrollView 
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid={true}
        extraScrollHeight={20}
      >
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton} 
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login')}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" color={colors.primary} size={18} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Image 
              source={require('../../../assets/narendra-logo-tight.png')} 
              style={styles.logoImage} 
              resizeMode="contain" 
            />
            <Text style={styles.brandTitle}>
              <Text style={[styles.brandSlate, { color: colors.text }]}>Narendra </Text>
              <Text style={styles.brandRed}>Kirana</Text>
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Welcome back</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sign in to access your orders, wallet & favorites</Text>
        </View>

        {pendingRedirect && (
          <View style={[styles.redirectBanner, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5', borderColor: isDark ? 'rgba(5, 150, 105, 0.3)' : '#A7F3D0' }]}>
            <Feather name="lock" color={colors.primary} size={15} />
            <Text style={[styles.redirectBannerText, { color: isDark ? '#34D399' : '#065F46' }]}>
              {pendingRedirect.screen === 'InvoiceScreen'
                ? `Sign in to view Order #${pendingRedirect.params?.orderId || ''} invoice`
                : pendingRedirect.screen === 'OrderTrackingScreen'
                ? `Sign in to track Order #${pendingRedirect.params?.orderId || ''}`
                : pendingRedirect.screen === 'OrderHistoryScreen'
                ? 'Sign in to view your full order history'
                : 'Sign in to complete your checkout'}
            </Text>
          </View>
        )}

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity 
            style={[
              styles.googleButton, 
              isDark 
                ? { backgroundColor: '#1E293B', borderColor: '#334155' }
                : { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' },
              {
                shadowColor: '#4285F4',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 4,
              }
            ]}
            onPress={handleGoogleLogin}
            disabled={isLoading || isGoogleLoading}
            activeOpacity={0.8}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color="#4285F4" size="small" />
            ) : (
              <>
                <AntDesign name="google" color="#4285F4" size={22} style={{ marginRight: 10 }} />
                <Text style={[styles.googleButtonText, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary, backgroundColor: colors.background }]}>OR</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Email or Username</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
              placeholder="Enter your email or username"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.passwordHeader}>
              <Text style={[styles.label, { color: colors.text }]}>Password</Text>
              <TouchableOpacity 
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => navigation.navigate('ForgotPasswordScreen' as any)}
              >
                <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.passwordContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                placeholder="Enter password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Feather name={showPassword ? "eye-off" : "eye"} color={colors.textSecondary} size={18} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.primaryButton, { backgroundColor: colors.primary }, isLoading && styles.primaryButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading || isGoogleLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Log In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // slate-50
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  logoImage: {
    width: 44,
    height: 44,
  },
  brandTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandSlate: {
    color: '#0F172A',
  },
  brandRed: {
    color: '#DC2626',
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.04)',
    elevation: 2,
    gap: 16,
  },
  inputContainer: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 6,
  },
  forgotPasswordText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
    boxShadow: '0px 2px 4px rgba(5, 150, 105, 0.2)',
    elevation: 3,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 6,
  },
  footerText: {
    color: '#64748B',
    fontSize: 13,
  },
  footerLink: {
    color: '#059669',
    fontWeight: '800',
    fontSize: 13,
  },
  redirectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  redirectBannerText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
});
