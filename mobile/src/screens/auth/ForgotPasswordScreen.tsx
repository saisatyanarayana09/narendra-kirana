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
  ScrollView,
  Linking 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  navigation: any;
}

export function ForgotPasswordScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Required Field', 'Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setMessage('');
    try {
      const res = await apiClient.post('/auth/password-reset/', { email: email.trim() });
      const msg = typeof res.data === 'string' ? res.data : (res.data?.message || 'If an account exists, a password reset link has been sent to your email.');
      setIsSuccess(true);
      setMessage(String(msg));
    } catch (error: any) {
      const errData = error.response?.data;
      const errMsg = typeof errData === 'string' ? errData : (errData?.error || errData?.detail || errData?.message || 'Failed to request password reset. Please try again.');
      Alert.alert('Request Failed', String(errMsg));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEmailApp = async () => {
    try {
      if (Platform.OS === 'android') {
        const canOpen = await Linking.canOpenURL('mailto:');
        if (canOpen) {
          await Linking.openURL('mailto:');
          return;
        }
      } else if (Platform.OS === 'ios') {
        const canOpenMessage = await Linking.canOpenURL('message://');
        if (canOpenMessage) {
          await Linking.openURL('message://');
          return;
        }
        const canOpenMailto = await Linking.canOpenURL('mailto:');
        if (canOpenMailto) {
          await Linking.openURL('mailto:');
          return;
        }
      }
      await Linking.openURL('mailto:');
    } catch (err) {
      Linking.openURL('https://mail.google.com').catch(() => {
        Alert.alert('Email App', 'Please check your email client or webmail for the reset link.');
      });
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
            <Feather name="mail" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter the email associated with your account and we will send you a reset link.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {isSuccess ? (
            <View style={styles.successBox}>
              <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
                <Feather name="mail" size={32} color="#10B981" />
              </View>
              <Text style={[styles.successTitle, { color: colors.text }]}>Check your email</Text>
              <Text style={[styles.successMessage, { color: colors.textSecondary }]}>{message}</Text>
              
              {/* Primary: Open Email App */}
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 16, width: '100%', flexDirection: 'row', gap: 8 }]}
                onPress={handleOpenEmailApp}
                activeOpacity={0.85}
              >
                <Feather name="external-link" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Open Email App</Text>
              </TouchableOpacity>

              {/* Secondary: Return to Sign In */}
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border, marginTop: 10, width: '100%' }]}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Return to Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
                <TextInput
                  style={[
                    styles.input, 
                    { 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', 
                      borderColor: colors.border, 
                      color: colors.text 
                    }
                  ]}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <TouchableOpacity 
                style={[styles.primaryButton, { backgroundColor: colors.primary }, isLoading && styles.primaryButtonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send Reset Link</Text>
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
    marginBottom: 24,
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
  primaryButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
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
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
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
  secondaryButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
