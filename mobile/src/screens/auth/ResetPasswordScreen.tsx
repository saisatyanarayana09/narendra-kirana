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
  const initialMode = route.params?.mode === 'otp' ? 'otp' : 'link';

  const [mode, setMode] = useState<'otp' | 'link'>(initialMode);
  const [email, setEmail] = useState(initialEmail);
  const [otpStep, setOtpStep] = useState<'verify' | 'set_password'>('verify');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isEditingEmail, setIsEditingEmail] = useState(!initialEmail);
  const [otpError, setOtpError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [message, setMessage] = useState('');

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSendOtp = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your registered email address first.');
      return;
    }
    setIsSendingOtp(true);
    setOtpError('');
    try {
      const res = await apiClient.post('/auth/password-reset/', {
        email: email.trim(),
        method: 'otp',
        portal: 'customer'
      });
      const msg = typeof res.data === 'string' ? res.data : (res.data?.message || 'A 6-digit verification code has been sent to your email.');
      Alert.alert('Code Sent', String(msg));
      setResendCooldown(60);
      setIsEditingEmail(false);
    } catch (err: any) {
      const errData = err.response?.data;
      const errMsg = typeof errData === 'string' ? errData : (errData?.error || errData?.detail || 'Failed to send OTP code.');
      Alert.alert('Request Failed', String(errMsg));
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Step 1: Verify OTP only (Does not ask for password yet)
  const handleVerifyOtp = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please provide your registered email address.');
      return;
    }
    const cleanOtp = otp.trim().replace(/[^0-9]/g, '');
    if (cleanOtp.length !== 6) {
      setOtpError('Please enter all 6 digits of the code sent to your email.');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError('');
    try {
      const res = await apiClient.post('/auth/password-reset/verify-otp/', {
        email: email.trim(),
        otp: cleanOtp,
        portal: 'customer'
      });
      if (res.data?.valid) {
        setOtpStep('set_password');
      } else {
        setOtpError(res.data?.error || 'Invalid verification code. Please try again.');
      }
    } catch (err: any) {
      const errData = err.response?.data;
      const errMsg = typeof errData === 'string' ? errData : (errData?.error || errData?.detail || 'Incorrect or expired verification code.');
      setOtpError(String(errMsg));
    } finally {
      setIsVerifyingOtp(false);
    }
  };

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

  // Step 2 (or Link mode): Save New Password
  const handleSubmit = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Required Fields', 'Please fill in both password fields.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Password Too Short', 'Password must be at least 8 characters long.');
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
          Alert.alert('Invalid Link', 'This reset link is missing security parameters. Please switch to 6-Digit OTP.');
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton} 
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login')}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" color={colors.primary} size={18} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>Back to Login</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5' }]}>
            <Feather name={mode === 'otp' && otpStep === 'verify' ? 'shield' : 'lock'} size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {mode === 'otp' && otpStep === 'verify' ? 'Verify Code' : 'New Password'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {mode === 'otp' && otpStep === 'verify' 
              ? 'Enter the 6-digit code sent to your email to verify your identity.' 
              : 'Choose a strong password to protect your account.'}
          </Text>
        </View>

        {/* Mode Switcher Tabs */}
        <View style={[styles.tabContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
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
              {/* LINK MODE WARNINGS */}
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
                <View style={[styles.warningBox, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF', borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE' }]}>
                  <Feather name="info" color="#3B82F6" size={18} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.warningTitle, { color: isDark ? '#60A5FA' : '#1D4ED8' }]}>Email Link Recovery</Text>
                    <Text style={[styles.warningText, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>
                      Open the reset link from your email inbox to proceed, or switch to 6-Digit OTP.
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                      <TouchableOpacity
                        style={styles.switchButton}
                        onPress={() => setMode('otp')}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.switchButtonText, { color: colors.primary }]}>Use 6-Digit OTP →</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.switchButton}
                        onPress={() => navigation.navigate('ForgotPasswordScreen')}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.switchButtonText, { color: colors.textSecondary }]}>Request Link</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* OTP MODE: STEP 1 - VERIFY CODE */}
              {mode === 'otp' && otpStep === 'verify' && (
                <>
                  {/* Step Tracker */}
                  <View style={styles.stepHeaderRow}>
                    <View style={[styles.stepBadge, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#DCFCE7' }]}>
                      <Text style={[styles.stepBadgeText, { color: isDark ? '#34D399' : '#15803D' }]}>
                        STEP 1 OF 2: VERIFY CODE
                      </Text>
                    </View>
                  </View>

                  {/* Email Destination Display (No need to re-type if already known!) */}
                  {email && !isEditingEmail ? (
                    <View style={[styles.emailBadgeBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <Feather name="mail" size={16} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.emailBadgeSmall, { color: colors.textSecondary }]}>Code sent to:</Text>
                          <Text style={[styles.emailBadgeMain, { color: colors.text }]} numberOfLines={1}>{email}</Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => setIsEditingEmail(true)} style={styles.changeEmailTouch}>
                        <Text style={[styles.changeEmailLink, { color: colors.primary }]}>Change</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.inputContainer}>
                      <Text style={[styles.label, { color: colors.text }]}>Registered Email Address</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput
                          style={[styles.input, { flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
                          placeholder="name@example.com"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          value={email}
                          onChangeText={setEmail}
                        />
                        <TouchableOpacity
                          style={[styles.sendCodeBtn, { backgroundColor: colors.primary }]}
                          onPress={handleSendOtp}
                          disabled={isSendingOtp}
                          activeOpacity={0.8}
                        >
                          {isSendingOtp ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                          ) : (
                            <Text style={styles.sendCodeBtnText}>Send Code</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* 6-Digit OTP Code Input */}
                  <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: colors.text }]}>6-Digit Verification Code</Text>
                    <TextInput
                      style={[
                        styles.input, 
                        styles.otpInput,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: otpError ? '#EF4444' : colors.border, color: colors.text }
                      ]}
                      placeholder="123456"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otp}
                      onChangeText={(t) => {
                        setOtp(t.replace(/[^0-9]/g, ''));
                        if (otpError) setOtpError('');
                      }}
                    />

                    {otpError ? (
                      <View style={styles.errorBanner}>
                        <Feather name="alert-circle" size={14} color="#EF4444" />
                        <Text style={styles.errorBannerText}>{otpError}</Text>
                      </View>
                    ) : null}

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                        Expires in 15 minutes.
                      </Text>
                      {resendCooldown > 0 ? (
                        <Text style={[styles.helperText, { color: colors.textSecondary, fontWeight: '700' }]}>
                          Resend in {resendCooldown}s
                        </Text>
                      ) : (
                        <TouchableOpacity 
                          onPress={handleSendOtp}
                          disabled={isSendingOtp}
                          activeOpacity={0.7}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <Feather name="refresh-cw" size={12} color={colors.primary} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                            {isSendingOtp ? 'Sending...' : 'Resend Code'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Step 1 Action Button: Verify Code Only */}
                  <TouchableOpacity 
                    style={[
                      styles.primaryButton, 
                      { backgroundColor: colors.primary, marginTop: 8 }, 
                      (isVerifyingOtp || !email.trim() || otp.trim().length !== 6) && styles.primaryButtonDisabled
                    ]}
                    onPress={handleVerifyOtp}
                    disabled={isVerifyingOtp || !email.trim() || otp.trim().length !== 6}
                    activeOpacity={0.85}
                  >
                    {isVerifyingOtp ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.primaryButtonText}>Verify Code</Text>
                        <Feather name="arrow-right" size={16} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {/* STEP 2 (FOR OTP) OR DIRECT FORM (FOR VALID LINK) */}
              {((mode === 'otp' && otpStep === 'set_password') || mode === 'link') && (
                <>
                  {mode === 'otp' && (
                    <>
                      <View style={styles.stepHeaderRow}>
                        <View style={[styles.stepBadge, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#DCFCE7' }]}>
                          <Text style={[styles.stepBadgeText, { color: isDark ? '#34D399' : '#15803D' }]}>
                            STEP 2 OF 2: CREATE NEW PASSWORD
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.verifiedBanner, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5', borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0' }]}>
                        <Feather name="check-circle" size={16} color="#10B981" />
                        <Text style={[styles.verifiedBannerText, { color: isDark ? '#34D399' : '#065F46' }]}>
                          Identity verified for {email}
                        </Text>
                      </View>
                    </>
                  )}

                  <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: colors.text }]}>New Password</Text>
                    <View style={[styles.passwordContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border }]}>
                      <TextInput
                        style={[styles.passwordInput, { color: colors.text }]}
                        placeholder="Enter new password (min. 8 chars)"
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
                    {confirmPassword.length > 0 && password !== confirmPassword && (
                      <Text style={styles.passwordMismatchText}>✕ Passwords do not match</Text>
                    )}
                    {confirmPassword.length > 0 && password === confirmPassword && (
                      <Text style={styles.passwordMatchText}>✓ Passwords match</Text>
                    )}
                  </View>

                  <TouchableOpacity 
                    style={[
                      styles.primaryButton, 
                      { backgroundColor: colors.primary }, 
                      (isLoading || (mode === 'link' && (!uid || !token || tokenStatus === 'invalid')) || password.length < 8 || password !== confirmPassword) && styles.primaryButtonDisabled
                    ]}
                    onPress={handleSubmit}
                    disabled={isLoading || (mode === 'link' && (!uid || !token || tokenStatus === 'invalid')) || password.length < 8 || password !== confirmPassword}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Save &amp; Set New Password</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
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
    lineHeight: 32,
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
  passwordMismatchText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    marginTop: 4,
  },
  passwordMatchText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 4,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  emailBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  emailBadgeSmall: {
    fontSize: 11,
    fontWeight: '600',
  },
  emailBadgeMain: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 1,
  },
  changeEmailTouch: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  changeEmailLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  sendCodeBtn: {
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendCodeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    flex: 1,
  },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  verifiedBannerText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

