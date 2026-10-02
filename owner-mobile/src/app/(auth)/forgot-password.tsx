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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage } from '../../services/api';
import { showAlert } from '../../utils/alerts';
import { useAppTheme } from '../../context/ThemeContext';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { isDark, colors } = useAppTheme();
  
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const isValidEmail = (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);

  const handleRequestOtp = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      await api.post('/auth/password-reset/', { email: cleanEmail });
      setStep('verify');
      setCountdown(60); // 60s cooldown for resend
      showAlert('OTP Sent', 'Please check your email for the password reset code.');
    } catch (e: any) {
      setErrorMsg(getErrorMessage(e, 'Failed to request password reset.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setErrorMsg(null);
    setResending(true);
    try {
      await api.post('/auth/password-reset/', { email: email.trim() });
      setCountdown(60);
      showAlert('OTP Resent', 'A new code has been sent to your email.');
    } catch (e: any) {
      setErrorMsg(getErrorMessage(e, 'Failed to resend OTP.'));
    } finally {
      setResending(false);
    }
  };

  const handleResetPassword = async () => {
    const cleanEmail = email.trim();
    const cleanOtp = otp.trim();
    
    if (!cleanOtp) {
      setErrorMsg('Please enter the 6-digit OTP code.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      await api.post('/auth/password-reset/otp-confirm/', {
        email: cleanEmail,
        otp: cleanOtp,
        new_password: newPassword,
      });
      showAlert('Password Updated', 'Your password has been successfully reset!', () => {
        router.replace('/(auth)/login');
      });
    } catch (e: any) {
      setErrorMsg(getErrorMessage(e, 'Invalid OTP or password does not meet security requirements.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? '#020617' : '#f8fafc' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={[styles.subtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            {step === 'request'
              ? 'Enter your registered email to receive a one-time verification code.'
              : `Enter the OTP sent to ${email} and choose a new password.`}
          </Text>

          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#fecaca" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#cbd5e1' : '#334155' }]}>Email Address</Text>
            <View style={[styles.inputWrapper, { borderColor: isDark ? '#334155' : '#cbd5e1', backgroundColor: isDark ? '#020617' : '#ffffff' }]}>
              <Ionicons name="mail" size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="owner@store.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                editable={step === 'request'}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {step === 'verify' ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: isDark ? '#cbd5e1' : '#334155' }]}>OTP Code</Text>
                <View style={[styles.inputWrapper, { borderColor: isDark ? '#334155' : '#cbd5e1', backgroundColor: isDark ? '#020617' : '#ffffff' }]}>
                  <Ionicons name="keypad" size={18} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="123456"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: isDark ? '#cbd5e1' : '#334155' }]}>New Password</Text>
                <View style={[styles.inputWrapper, { borderColor: isDark ? '#334155' : '#cbd5e1', backgroundColor: isDark ? '#020617' : '#ffffff' }]}>
                  <Ionicons name="lock-closed" size={18} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="Minimum 8 characters"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: isDark ? '#cbd5e1' : '#334155' }]}>Confirm Password</Text>
                <View style={[styles.inputWrapper, { borderColor: isDark ? '#334155' : '#cbd5e1', backgroundColor: isDark ? '#020617' : '#ffffff' }]}>
                  <Ionicons name="checkmark-done-circle" size={18} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="Repeat new password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                    <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.resendBtn} 
                onPress={handleResendOtp}
                disabled={countdown > 0 || resending}
              >
                <Text style={[styles.resendText, { color: countdown > 0 ? '#94a3b8' : '#10b981' }]}>
                  {resending ? 'Resending...' : countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP Code'}
                </Text>
              </TouchableOpacity>
            </>
          ) : null}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: isDark ? '#10b981' : '#059669' }]}
            onPress={step === 'request' ? handleRequestOtp : handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>
                {step === 'request' ? 'Send Reset OTP' : 'Confirm & Reset Password'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={16} color={isDark ? '#94a3b8' : '#64748b'} />
            <Text style={[styles.backText, { color: isDark ? '#94a3b8' : '#64748b' }]}>Back to Sign In</Text>
          </TouchableOpacity>
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
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.05)',
    elevation: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#10b981',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 22,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#450a0a',
    borderColor: '#dc2626',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    color: '#fecaca',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    height: 52,
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
  eyeBtn: {
    paddingHorizontal: 16,
    height: '100%',
    justifyContent: 'center',
  },
  resendBtn: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -4,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '700',
  },
  button: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  backBtn: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
