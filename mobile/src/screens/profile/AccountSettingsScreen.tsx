import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';

export function AccountSettingsScreen({ navigation }: { navigation: AppNavigationProp }) {
  const { user } = useAuth();
  
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [username, setUsername] = useState(user?.username || user?.email || '');
  const [dob, setDob] = useState(user?.customer_profile?.dob || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !username.trim()) {
      Alert.alert('Validation Error', 'Full Name and Email are required.');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        first_name: firstName,
        username: username,
      };
      if (password) payload.password = password;
      if (dob) payload.customer_profile = JSON.stringify({ dob });

      await apiClient.put('/auth/profile/', payload);
      Alert.alert('Success', 'Profile updated successfully!');
      setPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Failed to update profile.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleRequestDelete = () => {
    Alert.prompt
      ? Alert.prompt(
          'Delete Account',
          'Please enter your password to confirm deletion request:',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Request Deletion',
              style: 'destructive',
              onPress: async (pwd?: string) => {
                if (!pwd) return;
                performDeleteRequest(pwd);
              }
            }
          ],
          'secure-text'
        )
      : Alert.alert(
          'Delete Account',
          'Are you sure you want to request deletion of your account?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Request Deletion',
              style: 'destructive',
              onPress: () => performDeleteRequest('confirm')
            }
          ]
        );
  };

  const performDeleteRequest = async (pwd: string) => {
    setDeleteLoading(true);
    try {
      await apiClient.post('/auth/request-delete/', { password: pwd });
      Alert.alert('Request Submitted', 'Account deletion requested successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to request deletion.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header matching web AccountSettings.jsx */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color="#059669" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Settings</Text>
        <Text style={styles.headerSubtitle}>Manage your personal details and security preferences.</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* Personal Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>Personal Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.textInput}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Your full name"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.textInput}
              value={username}
              onChangeText={setUsername}
              placeholder="Your email address"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date of Birth (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.textInput}
              value={dob}
              onChangeText={setDob}
              placeholder="e.g. 1995-08-15"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        {/* Security & Password Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>Security & Password</Text>
          <Text style={styles.cardHint}>Leave blank if you do not wish to change your password.</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>New Password</Text>
            <View style={styles.passwordInputWrap}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter new password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Save Changes Button */}
        <TouchableOpacity 
          style={styles.saveBtn}
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

        {/* Danger Zone */}
        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <Text style={styles.dangerSubtitle}>
            Once you request deletion, your account will be queued for permanent removal.
          </Text>
          <TouchableOpacity 
            style={styles.deleteAccountBtn}
            onPress={handleRequestDelete}
            disabled={deleteLoading}
            activeOpacity={0.85}
          >
            {deleteLoading ? (
              <ActivityIndicator color="#E11D48" size="small" />
            ) : (
              <Text style={styles.deleteAccountText}>Request Account Deletion</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // slate-50
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
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
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
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
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
});
