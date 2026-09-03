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
import { useTheme } from '../../context/ThemeContext';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Signup'>;
};

function generateFriendlyPassword(): string {
  const words = ['Kirana', 'Mango', 'Fresh', 'Spice', 'Green', 'Daily', 'Rice', 'Sweet', 'Harvest', 'Super'];
  const symbols = ['@', '#', '$', '!', '&'];
  const randomWord = words[Math.floor(Math.random() * words.length)];
  const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
  const randomNumber = Math.floor(1000 + Math.random() * 9000);
  return `${randomWord}${randomSymbol}${randomNumber}`;
}

export function SignupScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
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
  const [generatedNotice, setGeneratedNotice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Live password validation criteria
  const pwd = form.password || '';
  const confirmPwd = form.confirm_password || '';

  const hasMinLength = pwd.length >= 8;
  const hasLetters = /[a-zA-Z]/.test(pwd);
  const hasNumbers = /[0-9]/.test(pwd);
  const isNotOnlyNumbers = pwd.length > 0 && !/^\d+$/.test(pwd);
  const hasMix = hasLetters && hasNumbers;

  // Strength score: 0 to 4
  let strengthScore = 0;
  if (pwd.length > 0) {
    if (pwd.length < 8 || !isNotOnlyNumbers) strengthScore = 1;
    else if (hasMinLength && (hasLetters || hasNumbers) && !hasMix) strengthScore = 2;
    else if (hasMinLength && hasMix && pwd.length < 10) strengthScore = 3;
    else if (pwd.length >= 10 && hasMix && /[^a-zA-Z0-9]/.test(pwd)) strengthScore = 4;
    else strengthScore = 3;
  }

  const strengthLabels = ['Enter password', 'Weak', 'Fair', 'Good & Secure', 'Very Strong'];
  const strengthColors = ['#E2E8F0', '#EF4444', '#F59E0B', '#10B981', '#059669'];

  const doPasswordsMatch = pwd.length > 0 && confirmPwd.length > 0 && pwd === confirmPwd;
  const isConfirmDirty = confirmPwd.length > 0;

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
        setReferralInfo({ isValid: true, name: res.data.referrer_name || res.data.name });
      } catch (err: any) {
        setReferralInfo({ isValid: false, error: err.response?.data?.error || 'Invalid referral code.' });
      } finally {
        setCheckingReferral(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [form.referral_code]);

  // 1-Tap Password Generator
  const handleSuggestPassword = () => {
    const suggested = generateFriendlyPassword();
    setForm(prev => ({
      ...prev,
      password: suggested,
      confirm_password: suggested,
    }));
    setShowPassword(true);
    setShowConfirmPassword(true);
    setGeneratedNotice(true);
  };

  const handleSignup = async () => {
    if (!form.first_name || !form.email || !form.mobile_number || !form.password) {
      Alert.alert('Required Fields', 'Please complete all required fields.');
      return;
    }

    if (!hasMinLength) {
      Alert.alert('Password Too Short', 'Password must be at least 8 characters long.');
      return;
    }

    if (!isNotOnlyNumbers) {
      Alert.alert('Invalid Password', 'Password cannot be entirely numbers. Please include letters.');
      return;
    }

    if (form.password !== form.confirm_password) {
      Alert.alert('Password Mismatch', 'Passwords do not match. Please re-enter.');
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
        'Registration Successful! 🎉',
        `Your account has been created!\n\nWe sent an activation link to ${form.email}. Please check your inbox and click the link to activate your account before logging in.`,
        [{ text: 'Proceed to Login', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error: any) {
      const details = error.response?.data;
      let errorMessage = 'Unable to create account.';
      if (details?.password) {
        errorMessage = Array.isArray(details.password) ? details.password.join('\n') : details.password;
      } else if (details) {
        errorMessage = typeof details === 'object' ? Object.values(details).flat().join('\n') : String(details);
      }
      Alert.alert('Signup Failed', errorMessage);
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
        {/* Back Button matching web */}
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" color={colors.primary} size={18} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Join Narendra Kirana for fresh daily essentials</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Full Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor={colors.textSecondary}
              value={form.first_name}
              onChangeText={(text) => setForm({ ...form, first_name: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Email Address *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
              placeholder="name@example.com"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(text) => setForm({ ...form, email: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Mobile Number *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
              placeholder="10-digit mobile number"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              value={form.mobile_number}
              onChangeText={(text) => setForm({ ...form, mobile_number: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.text }]}>Password *</Text>
              <TouchableOpacity
                style={[styles.suggestButton, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5', borderColor: isDark ? 'rgba(5, 150, 105, 0.3)' : '#A7F3D0' }]}
                onPress={handleSuggestPassword}
                activeOpacity={0.7}
              >
                <Feather name="zap" size={12} color={colors.primary} />
                <Text style={[styles.suggestButtonText, { color: colors.primary }]}>Suggest Password</Text>
              </TouchableOpacity>
            </View>

            <View style={[
              styles.passwordContainer,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border },
              hasMinLength && hasMix && isNotOnlyNumbers && styles.inputSuccess
            ]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                placeholder="Create password (min. 8 characters)"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
                value={form.password}
                onChangeText={(text) => {
                  setForm({ ...form, password: text });
                  setGeneratedNotice(false);
                }}
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setShowPassword(!showPassword)}
              >
                <Feather name={showPassword ? "eye-off" : "eye"} color={colors.textSecondary} size={18} />
              </TouchableOpacity>
            </View>

            {/* Generated Password Notice */}
            {generatedNotice && (
              <View style={[styles.generatedBanner, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5', borderColor: isDark ? 'rgba(5, 150, 105, 0.3)' : '#A7F3D0' }]}>
                <Text style={[styles.generatedBannerText, { color: isDark ? '#34D399' : '#065F46' }]}>
                  🔑 Generated: <Text style={styles.generatedPasswordText}>{form.password}</Text> (Remember to keep it safe!)
                </Text>
              </View>
            )}

            {/* Password Strength Meter */}
            {pwd.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthHeader}>
                  <Text style={[styles.strengthLabel, { color: colors.textSecondary }]}>Strength:</Text>
                  <Text style={[styles.strengthValue, { color: strengthColors[strengthScore] }]}>
                    {strengthLabels[strengthScore]}
                  </Text>
                </View>
                <View style={styles.meterTrack}>
                  {[1, 2, 3, 4].map((step) => (
                    <View
                      key={step}
                      style={[
                        styles.meterStep,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' },
                        step <= strengthScore && { backgroundColor: strengthColors[strengthScore] }
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Rule Checklist */}
            <View style={[styles.rulesCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderColor: colors.border }]}>
              <View style={styles.ruleItem}>
                <View style={[styles.ruleCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }, hasMinLength && styles.ruleCircleActive]}>
                  <Feather name="check" size={10} color={hasMinLength ? "#FFFFFF" : colors.textSecondary} />
                </View>
                <Text style={[styles.ruleText, { color: colors.textSecondary }, hasMinLength && styles.ruleTextActive]}>
                  8+ chars
                </Text>
              </View>

              <View style={styles.ruleItem}>
                <View style={[styles.ruleCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }, hasMix && styles.ruleCircleActive]}>
                  <Feather name="check" size={10} color={hasMix ? "#FFFFFF" : colors.textSecondary} />
                </View>
                <Text style={[styles.ruleText, { color: colors.textSecondary }, hasMix && styles.ruleTextActive]}>
                  Letters & numbers
                </Text>
              </View>

              <View style={styles.ruleItem}>
                <View style={[styles.ruleCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }, isNotOnlyNumbers && styles.ruleCircleActive]}>
                  <Feather name="check" size={10} color={isNotOnlyNumbers ? "#FFFFFF" : colors.textSecondary} />
                </View>
                <Text style={[styles.ruleText, { color: colors.textSecondary }, isNotOnlyNumbers && styles.ruleTextActive]}>
                  Not all-numeric
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Confirm Password *</Text>
            <View style={[
              styles.passwordContainer,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border },
              isConfirmDirty && (doPasswordsMatch ? styles.inputSuccess : styles.inputMismatch)
            ]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                placeholder="Confirm password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showConfirmPassword}
                value={form.confirm_password}
                onChangeText={(text) => setForm({ ...form, confirm_password: text })}
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Feather name={showConfirmPassword ? "eye-off" : "eye"} color={colors.textSecondary} size={18} />
              </TouchableOpacity>
            </View>

            {/* Live Match Feedback */}
            {isConfirmDirty && (
              <View style={styles.matchFeedbackRow}>
                {doPasswordsMatch ? (
                  <>
                    <Feather name="check-circle" size={13} color={colors.primary} />
                    <Text style={[styles.matchSuccessText, { color: colors.primary }]}>Passwords match!</Text>
                  </>
                ) : (
                  <>
                    <Feather name="alert-circle" size={13} color="#D97706" />
                    <Text style={styles.matchWarningText}>Passwords do not match yet</Text>
                  </>
                )}
              </View>
            )}
          </View>

          {/* Referral Code with live validation matching web app */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Referral Code (Optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. REF-A1B2C"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
              value={form.referral_code}
              onChangeText={(text) => setForm({ ...form, referral_code: text.toUpperCase() })}
            />
            {checkingReferral && (
              <View style={styles.referralFeedbackRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.referralCheckingText, { color: colors.textSecondary }]}>Verifying code...</Text>
              </View>
            )}
            {!checkingReferral && referralInfo?.isValid && (
              <View style={styles.referralFeedbackRow}>
                <Feather name="check-circle" size={14} color={colors.primary} />
                <Text style={[styles.referralValidText, { color: colors.primary }]}>
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
            style={[styles.primaryButton, { backgroundColor: colors.primary }, isLoading && styles.primaryButtonDisabled]}
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
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Log In</Text>
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  suggestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  suggestButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
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
  inputSuccess: {
    borderColor: '#34D399',
    backgroundColor: '#F0FDF4',
  },
  inputMismatch: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
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
  generatedBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 2,
  },
  generatedBannerText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
  },
  generatedPasswordText: {
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#047857',
  },
  strengthContainer: {
    gap: 4,
    marginTop: 2,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strengthLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  strengthValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  meterTrack: {
    flexDirection: 'row',
    gap: 4,
    height: 4,
  },
  meterStep: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
  },
  rulesCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 10,
    padding: 8,
    marginTop: 2,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ruleCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleCircleActive: {
    backgroundColor: '#10B981',
  },
  ruleText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  ruleTextActive: {
    color: '#065F46',
    fontWeight: '700',
  },
  matchFeedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  matchSuccessText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
  },
  matchWarningText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '600',
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
