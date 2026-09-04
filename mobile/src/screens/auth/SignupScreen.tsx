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
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { apiClient } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Signup'>;
};

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
  const [showReferralInput, setShowReferralInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Live password validation criteria
  const pwd = form.password || '';
  const confirmPwd = form.confirm_password || '';

  const hasMinLength = pwd.length >= 8;
  const hasLetters = /[a-zA-Z]/.test(pwd);
  const hasNumbers = /[0-9]/.test(pwd);
  const isNotOnlyNumbers = pwd.length > 0 && !/^\d+$/.test(pwd);
  const hasMix = hasLetters && hasNumbers;
  const isPasswordValid = hasMinLength && hasMix && isNotOnlyNumbers;

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

  const inputBg = isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="arrow-left" color={colors.primary} size={18} />
              <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
            </TouchableOpacity>
            
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Quick registration for fresh daily grocery delivery
              </Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Full Name *</Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: colors.border }]}>
                <Feather name="user" size={15} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="e.g. Rahul Sharma"
                  placeholderTextColor={colors.textSecondary}
                  value={form.first_name}
                  onChangeText={(text) => setForm({ ...form, first_name: text })}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email Address */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Email Address *</Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: colors.border }]}>
                <Feather name="mail" size={15} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={form.email}
                  onChangeText={(text) => setForm({ ...form, email: text })}
                />
              </View>
            </View>

            {/* Mobile Number */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Mobile Number *</Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: colors.border }]}>
                <Feather name="phone" size={15} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={form.mobile_number}
                  onChangeText={(text) => setForm({ ...form, mobile_number: text.replace(/[^0-9]/g, '') })}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.text }]}>Password *</Text>
                {pwd.length > 0 && (
                  <Text style={[
                    styles.pwdStatusHint, 
                    { color: isPasswordValid ? '#10B981' : '#F59E0B' }
                  ]}>
                    {isPasswordValid ? '✓ Strong' : 'Min 8 chars, letters & numbers'}
                  </Text>
                )}
              </View>
              <View style={[
                styles.inputWrapper, 
                { backgroundColor: inputBg, borderColor: colors.border },
                isPasswordValid && styles.inputSuccess
              ]}>
                <Feather name="lock" size={15} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Create password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="none"
                  autoComplete="off"
                  value={form.password}
                  onChangeText={(text) => setForm({ ...form, password: text })}
                />
                <TouchableOpacity 
                  style={styles.eyeBtn} 
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name={showPassword ? "eye-off" : "eye"} color={colors.textSecondary} size={16} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.text }]}>Confirm Password *</Text>
                {isConfirmDirty && (
                  <Text style={[
                    styles.pwdStatusHint, 
                    { color: doPasswordsMatch ? '#10B981' : '#EF4444' }
                  ]}>
                    {doPasswordsMatch ? '✓ Matched' : 'Does not match'}
                  </Text>
                )}
              </View>
              <View style={[
                styles.inputWrapper, 
                { backgroundColor: inputBg, borderColor: colors.border },
                isConfirmDirty && (doPasswordsMatch ? styles.inputSuccess : styles.inputError)
              ]}>
                <Feather name="shield" size={15} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Re-enter password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="none"
                  autoComplete="off"
                  value={form.confirm_password}
                  onChangeText={(text) => setForm({ ...form, confirm_password: text })}
                />
                <TouchableOpacity 
                  style={styles.eyeBtn} 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name={showConfirmPassword ? "eye-off" : "eye"} color={colors.textSecondary} size={16} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Optional Referral Code - Compact Accordion */}
            {(!showReferralInput && !form.referral_code) ? (
              <TouchableOpacity 
                style={styles.referralToggle}
                onPress={() => setShowReferralInput(true)}
                activeOpacity={0.7}
              >
                <Feather name="tag" size={13} color={colors.primary} />
                <Text style={[styles.referralToggleText, { color: colors.primary }]}>+ Have a referral code?</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: colors.text }]}>Referral Code (Optional)</Text>
                  <TouchableOpacity onPress={() => { setForm({ ...form, referral_code: '' }); setShowReferralInput(false); }}>
                    <Text style={[styles.referralClose, { color: colors.textSecondary }]}>Remove</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: colors.border }]}>
                  <Feather name="gift" size={15} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="e.g. REF-A1B2C"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    value={form.referral_code}
                    onChangeText={(text) => setForm({ ...form, referral_code: text.toUpperCase() })}
                  />
                  {checkingReferral && <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />}
                  {!checkingReferral && referralInfo?.isValid && (
                    <Feather name="check-circle" size={15} color="#10B981" style={{ marginRight: 8 }} />
                  )}
                  {!checkingReferral && referralInfo?.isValid === false && (
                    <Feather name="alert-circle" size={15} color="#EF4444" style={{ marginRight: 8 }} />
                  )}
                </View>
                {referralInfo?.name && (
                  <Text style={styles.referralSuccessName}>Referred by {referralInfo.name}</Text>
                )}
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity 
              style={[
                styles.primaryButton, 
                { backgroundColor: colors.primary }, 
                isLoading && styles.primaryButtonDisabled
              ]}
              onPress={handleSignup}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.buttonInner}>
                  <Text style={styles.primaryButtonText}>Create Account</Text>
                  <Feather name="arrow-right" size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={[styles.footerLink, { color: colors.primary }]}>Log In</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 8 : 12,
  },
  headerBar: {
    marginBottom: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  titleRow: {
    gap: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  inputGroup: {
    gap: 3,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  pwdStatusHint: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    height: 41,
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
    height: '100%',
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
  },
  inputSuccess: {
    borderColor: '#34D399',
  },
  inputError: {
    borderColor: '#F87171',
  },
  referralToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  referralToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  referralClose: {
    fontSize: 11,
    fontWeight: '600',
  },
  referralSuccessName: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  footerText: {
    fontSize: 12,
  },
  footerLink: {
    fontWeight: '800',
    fontSize: 12,
  },
});
