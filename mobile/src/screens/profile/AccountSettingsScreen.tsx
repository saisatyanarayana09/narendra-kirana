import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  Alert,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';

export function AccountSettingsScreen({ navigation }: { navigation: AppNavigationProp }) {
  const { colors, isDark } = useTheme();
  const { user, updateUser } = useAuth();
  
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [dob, setDob] = useState(user?.customer_profile?.dob || '');
  const [dobError, setDobError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const deleteRequested = Boolean(user?.customer_profile?.delete_requested);

  const handleSaveProfile = async () => {
    if (!firstName.trim()) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }

    if (password) {
      if (password.length < 6) {
        Alert.alert('Validation Error', 'Password must be at least 6 characters long.');
        return;
      }
      if (!confirmPassword) {
        Alert.alert('Validation Error', 'Please confirm your new password.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Validation Error', 'New password and confirm password do not match.');
        return;
      }
    }

    const trimmedDob = dob ? dob.trim() : '';
    if (trimmedDob) {
      const dobPattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!dobPattern.test(trimmedDob)) {
        setDobError('Date of birth must be in YYYY-MM-DD format (e.g. 1995-08-15).');
        Alert.alert('Validation Error', 'Date of birth must be in YYYY-MM-DD format (e.g. 1995-08-15).');
        return;
      }

      const [year, month, day] = trimmedDob.split('-').map(Number);
      const parsedDate = new Date(year, month - 1, day);
      const now = new Date();
      if (
        parsedDate.getFullYear() !== year ||
        parsedDate.getMonth() !== month - 1 ||
        parsedDate.getDate() !== day ||
        year < 1900 ||
        parsedDate > now
      ) {
        setDobError('Please enter a valid past calendar date (YYYY-MM-DD).');
        Alert.alert('Validation Error', 'Please enter a valid past calendar date in YYYY-MM-DD format (e.g. 1995-08-15).');
        return;
      }
    }
    setDobError('');

    setSaving(true);
    try {
      const payload: any = {
        first_name: firstName.trim(),
      };
      if (password) payload.password = password;
      if (dob !== undefined) payload.customer_profile = JSON.stringify({ dob: trimmedDob || null });

      const res = await apiClient.put('/auth/profile/', payload);
      if (updateUser && res.data) {
        await updateUser(res.data);
      }
      Alert.alert('Success', 'Profile updated successfully!');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Failed to update profile.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!deletePassword.trim()) {
      Alert.alert('Password Required', 'Please enter your password to confirm account deletion.');
      return;
    }

    setDeleteLoading(true);
    try {
      await apiClient.post('/auth/request-delete/', { password: deletePassword });
      Alert.alert('Submitted', 'Account deletion requested successfully.');
      if (user && updateUser) {
        const updatedUser = {
          ...user,
          customer_profile: {
            ...user.customer_profile,
            delete_requested: true,
          },
        };
        await updateUser(updatedUser);
      }
      setShowDeletePrompt(false);
      setDeletePassword('');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to request deletion.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.backButton} 
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main')}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color={colors.primary} />
            <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Account Settings</Text>
        </View>
        <View style={styles.guestStateContainer}>
          <View style={[styles.guestIconBox, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5' }]}>
            <Feather name="user" size={44} color={colors.primary} />
          </View>
          <Text style={[styles.guestTitle, { color: colors.text }]}>Sign In to Manage Account</Text>
          <Text style={[styles.guestSubtitle, { color: colors.textSecondary }]}>
            Please sign in to update your profile name, date of birth, and security credentials.
          </Text>
          <TouchableOpacity
            style={[styles.guestSignInBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Feather name="log-in" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.guestSignInBtnText}>Sign In / Register</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header matching web AccountSettings.jsx */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main')}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color={colors.primary} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Account Settings</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Manage your personal details and security preferences.</Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Personal Details Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardSectionLabel, { color: colors.text, borderBottomColor: colors.border }]}>Personal Information</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Full Name</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Your full name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputLabelRow}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Email Address</Text>
                <Text style={[styles.readOnlyBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', color: colors.textSecondary }]}>Cannot be changed</Text>
              </View>
              <TextInput
                style={[styles.textInput, styles.textInputDisabled, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9', borderColor: colors.border, color: colors.textSecondary }]}
                value={user?.email || user?.username || ''}
                editable={false}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Date of Birth</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border, color: colors.text }, Boolean(dobError) && styles.textInputError]}
                value={dob}
                onChangeText={(val) => {
                  setDob(val);
                  if (dobError) setDobError('');
                }}
                placeholder="e.g. 1995-08-15"
                placeholderTextColor={colors.textSecondary}
                maxLength={10}
              />
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>Format: YYYY-MM-DD (e.g. 1995-08-15)</Text>
              {Boolean(dobError) && <Text style={styles.errorText}>{dobError}</Text>}
            </View>
          </View>

        {/* Security & Password Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardSectionLabel, { color: colors.text, borderBottomColor: colors.border }]}>Security & Password</Text>
          <Text style={[styles.cardHint, { color: colors.textSecondary }]}>Leave blank if you do not wish to change your password.</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>New Password</Text>
            <View style={[styles.passwordInputWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter new password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {Boolean(password) && (
            <View style={[styles.inputGroup, { marginTop: 4 }]}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Confirm New Password</Text>
              <View style={[
                styles.passwordInputWrap,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border },
                Boolean(confirmPassword) && password !== confirmPassword && styles.passwordInputError
              ]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.text }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter new password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeBtn}
                >
                  <Feather name={showConfirmPassword ? "eye-off" : "eye"} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {Boolean(confirmPassword) && password !== confirmPassword && (
                <Text style={styles.errorText}>Passwords do not match</Text>
              )}
            </View>
          )}
        </View>

        {/* Save Changes Button */}
        <TouchableOpacity 
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSaveProfile}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        {/* Danger Zone matching web AccountSettings.jsx */}
        <View style={[styles.dangerCard, { backgroundColor: isDark ? 'rgba(244, 63, 94, 0.08)' : '#FFF1F2', borderColor: isDark ? 'rgba(244, 63, 94, 0.2)' : '#FFE4E6' }]}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <Text style={[styles.dangerSubtitle, isDark && { color: '#FB7185' }]}>
            Permanently remove your account and all associated personal data.
          </Text>

          {deleteRequested ? (
            <View style={[styles.deletionPendingCard, isDark && { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
              <View style={styles.pulsingDotRow}>
                <View style={styles.pulsingDotOuter}>
                  <View style={styles.pulsingDotInner} />
                </View>
                <Text style={[styles.deletionPendingTitle, isDark && { color: '#FBBF24' }]}>Deletion Pending Approval</Text>
              </View>
              <Text style={[styles.deletionPendingDesc, isDark && { color: '#FDE68A' }]}>
                Your deletion request is currently being reviewed by store management. You will be logged out once approved.
              </Text>
            </View>
          ) : showDeletePrompt ? (
            <View style={[styles.deletePromptCard, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? 'rgba(244, 63, 94, 0.4)' : '#FDA4AF' }]}>
              <Text style={[styles.deletePromptLabel, { color: colors.text }]}>Enter your password to confirm:</Text>
              
              <View style={[styles.passwordInputWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border }]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.text }]}
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showDeletePassword}
                />
                <TouchableOpacity 
                  onPress={() => setShowDeletePassword(!showDeletePassword)}
                  style={styles.eyeBtn}
                >
                  <Feather name={showDeletePassword ? "eye-off" : "eye"} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.deleteActionButtons}>
                <TouchableOpacity 
                  style={[styles.confirmDeleteBtn, deleteLoading && styles.btnDisabled]}
                  onPress={handleRequestDeletion}
                  disabled={deleteLoading}
                  activeOpacity={0.85}
                >
                  {deleteLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.confirmDeleteText}>Confirm Deletion</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.cancelDeleteBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}
                  onPress={() => {
                    setShowDeletePrompt(false);
                    setDeletePassword('');
                  }}
                  disabled={deleteLoading}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.cancelDeleteText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.deleteAccountBtn, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? 'rgba(244, 63, 94, 0.4)' : '#FDA4AF' }]}
              onPress={() => setShowDeletePrompt(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.deleteAccountText}>Request Account Deletion</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // slate-50
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    color: '#059669',
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 130,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.03)',
    elevation: 1,
  },
  cardSectionLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardHint: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  readOnlyBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
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
  textInputDisabled: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
  },
  textInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '600',
  },
  passwordInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
  },
  passwordInputError: {
    borderColor: '#FDA4AF',
    backgroundColor: '#FFF1F2',
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  eyeBtn: {
    padding: 6,
  },
  saveBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    boxShadow: '0px 2px 4px rgba(5, 150, 105, 0.15)',
    elevation: 3,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  dangerCard: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FFE4E6',
    borderRadius: 18,
    padding: 18,
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#E11D48',
    marginBottom: 4,
  },
  dangerSubtitle: {
    fontSize: 12,
    color: '#9F1239',
    lineHeight: 17,
    marginBottom: 14,
  },
  deleteAccountBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDA4AF',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  deleteAccountText: {
    color: '#E11D48',
    fontWeight: '700',
    fontSize: 13,
  },
  deletionPendingCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 14,
  },
  pulsingDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  pulsingDotOuter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(217, 119, 6, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulsingDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D97706',
  },
  deletionPendingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#B45309',
  },
  deletionPendingDesc: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
  deletePromptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDA4AF',
  },
  deletePromptLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  deleteActionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  confirmDeleteBtn: {
    flex: 1,
    backgroundColor: '#E11D48',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDeleteText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  cancelDeleteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelDeleteText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 13,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  guestStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  guestIconBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  guestSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    boxShadow: '0px 4px 8px rgba(5, 150, 105, 0.2)',
    elevation: 4,
  },
  guestSignInBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
