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
  ScrollView,
  ActivityIndicator 
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { apiClient } from '../../api/client';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Signup'>;
};

export function SignupScreen({ navigation }: Props) {
  const [form, setForm] = useState({
    first_name: '',
    email: '',
    mobile_number: '',
    password: '',
    confirm_password: '',
    referral_code: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Live referral lookup matching web app
  const [checkingReferral, setCheckingReferral] = useState(false);
  const [referralInfo, setReferralInfo] = useState<{ isValid?: boolean; name?: string; error?: string } | null>(null);

  useEffect(() => {
    const code = form.referral_code.trim();
    if (!code) {
      setReferralInfo(null);
      setCheckingReferral(false);
      return;
    }

    setCheckingReferral(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/auth/referral-lookup/?code=${encodeURIComponent(code)}`);
        setReferralInfo({ isValid: true, name: res.data.name });
      } catch (err: any) {
        setReferralInfo({ isValid: false, error: err.response?.data?.error || 'Invalid referral code.' });
      } finally {
        setCheckingReferral(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [form.referral_code]);

  const handleSignup = async () => {
    if (!form.first_name || !form.email || !form.mobile_number || !form.password) {
      Alert.alert('Required Fields', 'Please complete all required fields.');
      return;
    }

    if (form.password !== form.confirm_password) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if (referralInfo && referralInfo.isValid === false) {
      Alert.alert('Invalid Referral Code', 'Please enter a valid referral code or clear the field.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = { ...form, username: form.email };
      await apiClient.post('/auth/signup/', payload);
      
      Alert.alert(
        'Success', 
        'Account created successfully! Please log in.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error: any) {
      const details = error.response?.data;
      const errorMessage = details 
        ? (typeof details === 'object' ? Object.values(details).flat().join('\n') : String(details))
        : 'Unable to create account.';
      Alert.alert('Signup Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Back Button matching web */}
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" color="#059669" size={18} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Narendra Kirana for fresh daily essentials</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor="#94A3B8"
              value={form.first_name}
              onChangeText={(text) => setForm({ ...form, first_name: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(text) => setForm({ ...form, email: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mobile Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              value={form.mobile_number}
              onChangeText={(text) => setForm({ ...form, mobile_number: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Create password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                value={form.password}
                onChangeText={(text) => setForm({ ...form, password: text })}
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setShowPassword(!showPassword)}
              >
                <Feather name={showPassword ? "eye-off" : "eye"} color="#94A3B8" size={18} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showConfirmPassword}
                value={form.confirm_password}
                onChangeText={(text) => setForm({ ...form, confirm_password: text })}
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Feather name={showConfirmPassword ? "eye-off" : "eye"} color="#94A3B8" size={18} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Referral Code with live validation matching web app */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Referral Code (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. REF-A1B2C"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              value={form.referral_code}
              onChangeText={(text) => setForm({ ...form, referral_code: text.toUpperCase() })}
            />
            {checkingReferral && (
              <View style={styles.referralFeedbackRow}>
                <ActivityIndicator size="small" color="#059669" />
                <Text style={styles.referralCheckingText}>Verifying code...</Text>
              </View>
            )}
            {!checkingReferral && referralInfo?.isValid && (
              <View style={styles.referralFeedbackRow}>
                <Feather name="check-circle" size={14} color="#059669" />
                <Text style={styles.referralValidText}>
                  Valid code! Referred by {referralInfo.name}.
                </Text>
              </View>
            )}
            {!checkingReferral && referralInfo?.isValid === false && (
              <View style={styles.referralFeedbackRow}>
                <Feather name="x-circle" size={14} color="#EF4444" />
                <Text style={styles.referralInvalidText}>{referralInfo.error}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity 
            style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
            onPress={handleSignup}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 14,
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
  referralFeedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  referralCheckingText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  referralValidText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
  },
  referralInvalidText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
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
});
