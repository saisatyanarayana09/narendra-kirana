import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import api, { getErrorMessage } from '../../services/api';
import { showAlert } from '../../utils/alerts';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRequestOtp = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Please enter your registered owner email address.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      await api.post('/auth/password-reset/', { email: cleanEmail });
      setStep('verify');
      showAlert('OTP Sent', 'Please check your email for the password reset code.');
    } catch (e: any) {
      setErrorMsg(getErrorMessage(e, 'Failed to request password reset.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const cleanEmail = email.trim();
    const cleanOtp = otp.trim();
    if (!cleanOtp || !newPassword) {
      setErrorMsg('Please enter both the OTP code and your new password.');
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
      showAlert('Password Updated', 'Your password has been reset. You can now sign in.', () => {
        router.replace('/(auth)/login');
      });
    } catch (e: any) {
      setErrorMsg(getErrorMessage(e, 'Invalid OTP or password does not meet security requirements.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Reset Owner Password</Text>
        <Text style={styles.subtitle}>
          {step === 'request'
            ? 'Enter your registered email to receive a one-time verification code.'
            : `Enter the OTP sent to ${email} and choose a new password.`}
        </Text>

        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
          </View>
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="Owner Email Address"
          placeholderTextColor="#94a3b8"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          editable={step === 'request'}
          onChangeText={setEmail}
        />

        {step === 'verify' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="6-Digit OTP Code"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
            />
            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
          </>
        ) : null}

        <TouchableOpacity
          style={styles.button}
          onPress={step === 'request' ? handleRequestOtp : handleResetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {step === 'request' ? 'Send Reset OTP' : 'Confirm & Reset Password'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    padding: 24,
    borderRadius: 16,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: '#450a0a',
    borderColor: '#dc2626',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#fecaca',
    fontSize: 13,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
    color: '#f8fafc',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  backText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
});
