import React, { useState, useEffect } from 'react';
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
  ScrollView 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  navigation: any;
  route: {
    params?: {
      uid?: string;
      token?: string;
      email?: string;
      mode?: 'otp' | 'link';
    };
  };
}

export function ResetPasswordScreen({ navigation, route }: Props) {
  const { colors, isDark } = useTheme();
  const uid = route.params?.uid || '';
  const token = route.params?.token || '';
  const initialEmail = route.params?.email || '';
  const initialMode = route.params?.mode || (uid && token ? 'link' : 'otp');

  const [mode, setMode] = useState<'otp' | 'link'>(initialMode);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [message, setMessage] = useState('');

  // Proactive token check state for link mode
  const [tokenStatus, setTokenStatus] = useState<'none' | 'checking' | 'valid' | 'invalid'>(
    uid && token ? 'checking' : 'none'
  );
  const [tokenError, setTokenError] = useState('');

  useEffect(() => {
    if (uid && token) {
      let isMounted = true;
      setTokenStatus('checking');
      apiClient.post('/auth/password-reset/validate-token/', { uid, token, portal: 'customer' })
        .then((res: any) => {
          if (!isMounted) return;
          setTokenStatus('valid');
          if (res.data?.email && !email) {
            setEmail(res.data.email);
          }
        })
        .catch((err: any) => {
          if (!isMounted) return;
          setTokenStatus('invalid');
          const errData = err.response?.data;
          const errMsg = typeof errData === 'string' ? errData : (errData?.error || 'This reset link has expired or has already been used.');
          setTokenError(String(errMsg));
        });
      return () => { isMounted = false; };
    }
  }, [uid, token]);

  const handleSubmit = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Required Fields', 'Please fill in both password fields.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password Too Short', 'Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords Do Not Match', 'The entered passwords do not match. Please try again.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      if (mode === 'otp') {
        if (!email.trim()) {
          Alert.alert('Required Field', 'Please enter your registered email address.');
          setIsLoading(false);
          return;
        }
        if (!otp.trim() || otp.trim().length !== 6) {
          Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP code received in your email.');
          setIsLoading(false);
          return;
        }

        const res = await apiClient.post('/auth/password-reset/otp-confirm/', {
          email: email.trim(),
          otp: otp.trim(),
          new_password: password,
          portal: 'customer'
        });
        const msg = typeof res.data === 'string' ? res.data : (res.data?.message || 'Password reset successfully!');
        setIsSuccess(true);
        setMessage(String(msg));
      } else {
        if (!uid || !token) {
          Alert.alert('Invalid Link', 'This reset link is missing security parameters. Please switch to the 6-Digit OTP tab.');
          setIsLoading(false);
          return;
        }

        const res = await apiClient.post('/auth/password-reset-confirm/', { 
          uid, 
          token, 
          new_password: password,
          portal: 'customer'
        });
        const msg = typeof res.data === 'string' ? res.data : (res.data?.message || 'Your password has been reset successfully!');
        setIsSuccess(true);
        setMessage(String(msg));
      }
    } catch (error: any) {
      const errData = error.response?.data;
      const errMsg = typeof errData === 'string' ? errData : (errData?.error || errData?.detail || errData?.message || 'Failed to reset password. The link or OTP may have expired.');
      Alert.alert('Reset Failed', String(errMsg));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login')}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" color={colors.primary} size={18} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>Back to Login</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5' }]}>
            <Feather name="lock" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>New Password</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Verify your identity and set a secure new password.
          </Text>
        </View>

        {/* Mode Switcher Tabs */}
        <View style={[styles.tabContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              mode === 'otp' && { backgroundColor: colors.surface, elevation: 1 }
            ]}
            onPress={() => setMode('otp')}
            activeOpacity={0.8}
          >
            <Feather name="key" size={14} color={mode === 'otp' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.tabText, { color: mode === 'otp' ? colors.primary : colors.textSecondary, fontWeight: mode === 'otp' ? '700' : '600' }]}>
              6-Digit OTP
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              mode === 'link' && { backgroundColor: colors.surface, elevation: 1 }
            ]}
            onPress={() => setMode('link')}
            activeOpacity={0.8}
          >
            <Feather name="link" size={14} color={mode === 'link' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.tabText, { color: mode === 'link' ? colors.primary : colors.textSecondary, fontWeight: mode === 'link' ? '700' : '600' }]}>
              Email Link
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {isSuccess ? (
            <View style={styles.successBox}>
              <Feather name="check-circle" size={44} color="#10B981" />
              <Text style={[styles.successTitle, { color: colors.text }]}>Password Changed!</Text>
              <Text style={[styles.successMessage, { color: colors.textSecondary }]}>{message}</Text>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 16, width: '100%' }]}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Sign In Now</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {mode === 'link' && tokenStatus === 'invalid' && (
                <View style={[styles.warningBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2', borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5' }]}>
                  <Feather name="alert-triangle" color="#EF4444" size={18} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.warningTitle, { color: '#EF4444' }]}>Link Expired or Used</Text>
                    <Text style={styles.warningText}>
                      {tokenError || 'This reset link has expired or has already been used.'}
                    </Text>
                    <TouchableOpacity
                      style={styles.switchButton}
                      onPress={() => setMode('otp')}
                    >
                      <Text style={[styles.switchButtonText, { color: colors.primary }]}>Switch to 6-Digit OTP →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {mode === 'link' && (!uid || !token) && (
                <View style={[styles.warningBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2', borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5' }]}>
                  <Feather name="alert-triangle" color="#EF4444" size={16} />
                  <Text style={styles.warningText}>
                    Missing reset token. Switch to 6-Digit OTP tab or open the complete link from your email.
                  </Text>
                </View>
              )}

              {mode === 'otp' && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: colors.text }]}>Registered Email</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
                      placeholder="name@example.com"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: colors.text }]}>6-Digit OTP Code</Text>
                    <TextInput
                      style={[
                        styles.input, 
                        styles.otpInput,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border, color: colors.text }
                      ]}
                      placeholder="123456"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otp}
                      onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, ''))}
                    />
                    <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                      Enter the 6-digit code sent to your email (valid for 15 minutes).
                    </Text>
                  </View>
                </>
              )}

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>New Password</Text>
                <View style={[styles.passwordContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.passwordInput, { color: colors.text }]}
                    placeholder="Enter new password (min. 6 chars)"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity 
                    style={styles.eyeIcon} 
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Feather name={showPassword ? "eye-off" : "eye"} color={colors.textSecondary} size={18} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>Confirm Password</Text>
                <View style={[styles.passwordContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.passwordInput, { color: colors.text }]}
                    placeholder="Confirm new password"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <TouchableOpacity 
                    style={styles.eyeIcon} 
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Feather name={showConfirmPassword ? "eye-off" : "eye"} color={colors.textSecondary} size={18} />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                style={[
                  styles.primaryButton, 
                  { backgroundColor: colors.primary }, 
                  (isLoading || (mode === 'link' && (!uid || !token || tokenStatus === 'invalid'))) && styles.primaryButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={isLoading || (mode === 'link' && (!uid || !token || tokenStatus === 'invalid'))}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save New Password</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  header: {
    marginBottom: 20,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    marginBottom: 16,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabText: {
    fontSize: 13,
  },
  card: {
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 16,
  },
  inputContainer: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 20,
    letterSpacing: 8,
    fontWeight: '800',
  },
  helperText: {
    fontSize: 11,
    lineHeight: 14,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
  eyeIcon: {
    padding: 4,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 12,
    color: '#EF4444',
    lineHeight: 16,
  },
  switchButton: {
    marginTop: 6,
  },
  switchButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  primaryButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 8,
  },
  successMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
