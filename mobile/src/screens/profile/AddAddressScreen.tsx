import React, { useState, useEffect } from 'react';
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
import { apiClient } from '../../api/client';
import { useLocation } from '../../hooks/useLocation';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export function AddAddressScreen({ navigation, route }: { navigation: AppNavigationProp, route: any }) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const editingAddress = route.params?.editingAddress;
  const { requestLocation, location: gpsLocation, isRequesting: gpsLoading } = useLocation();

  const [title, setTitle] = useState(editingAddress?.title || editingAddress?.address_type || 'Home');
  const [street, setStreet] = useState(editingAddress?.street || editingAddress?.address_line_1 || '');
  const [landmark, setLandmark] = useState(editingAddress?.landmark || editingAddress?.address_line_2 || '');
  const [city, setCity] = useState(editingAddress?.city || '');
  const [district, setDistrict] = useState(editingAddress?.district || '');
  const [state, setState] = useState(editingAddress?.state || '');
  const [country, setCountry] = useState(editingAddress?.country || 'India');
  const [zipCode, setZipCode] = useState(editingAddress?.zip_code || editingAddress?.pincode || '');
  const [latitude, setLatitude] = useState<number | null>(editingAddress?.latitude || null);
  const [longitude, setLongitude] = useState<number | null>(editingAddress?.longitude || null);

  const [saving, setSaving] = useState(false);

  const handleCaptureGps = async () => {
    const loc = await requestLocation();
    if (loc) {
      setLatitude(parseFloat(loc.latitude.toFixed(6)));
      setLongitude(parseFloat(loc.longitude.toFixed(6)));
      Alert.alert('GPS Secured', 'Exact location coordinates captured successfully!');
    } else {
      Alert.alert('Location Required', 'Could not get GPS location. Please enable GPS permissions.');
    }
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to save addresses.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }

    if (!title.trim() || !street.trim() || !city.trim() || !state.trim() || !zipCode.trim()) {
      Alert.alert('Validation Error', 'Please fill in all required fields (Label, Street, City, State, Pincode).');
      return;
    }

    setSaving(true);
    const payload = {
      title,
      street,
      landmark,
      city,
      district,
      state,
      country,
      zip_code: zipCode,
      latitude,
      longitude,
    };

    try {
      if (editingAddress?.id) {
        await apiClient.put(`/auth/addresses/${editingAddress.id}/`, payload);
        Alert.alert('Success', 'Address updated successfully!');
      } else {
        await apiClient.post('/auth/addresses/', payload);
        Alert.alert('Success', 'Address saved successfully!');
      }
      navigation.goBack();
    } catch (err: any) {
      const msg = err.response?.data?.latitude?.[0] || err.response?.data?.detail || err.response?.data?.error || 'Failed to save address.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={18} color={colors.primary} />
            <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {editingAddress ? 'Edit Address' : 'New Address'}
          </Text>
        </View>
        <View style={styles.guestStateContainer}>
          <View style={[styles.guestIconBox, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5' }]}>
            <Feather name="map-pin" size={44} color={colors.primary} />
          </View>
          <Text style={[styles.guestTitle, { color: colors.text }]}>Sign In to Add Address</Text>
          <Text style={[styles.guestSubtitle, { color: colors.textSecondary }]}>
            Please sign in or create an account to save delivery addresses.
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
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color={colors.primary} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {editingAddress ? 'Edit Address' : 'New Address'}
        </Text>
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
        {/* GPS Capture Card */}
        <View style={[styles.gpsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.gpsCardTop}>
            <View>
              <Text style={[styles.gpsCardTitle, { color: colors.text }]}>Pinpoint Delivery Location</Text>
              <Text style={[styles.gpsCardSub, { color: colors.textSecondary }]}>
                {latitude ? 'Coordinates attached to this address ✓' : 'Add GPS coordinates so riders find you effortlessly'}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.gpsBtn, Boolean(latitude) && styles.gpsBtnSecured]}
            onPress={handleCaptureGps}
            disabled={gpsLoading}
            activeOpacity={0.85}
          >
            {gpsLoading ? (
              <ActivityIndicator color={latitude ? colors.primary : "#4F46E5"} size="small" />
            ) : (
              <>
                <Feather 
                  name={latitude ? "check-circle" : "navigation"} 
                  size={16} 
                  color={latitude ? colors.primary : "#4F46E5"} 
                />
                <Text style={[styles.gpsBtnText, Boolean(latitude) && styles.gpsBtnTextSecured]}>
                  {latitude ? '📍 GPS Secured (Tap to relocate)' : '📍 Capture My Exact Location'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Address Form Card */}
        <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Label Pills & Custom Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Label (e.g. Home, Work, Other)</Text>
            <View style={styles.labelPillsRow}>
              {['Home', 'Work', 'Other'].map((lbl) => (
                <TouchableOpacity
                  key={lbl}
                  style={[
                    styles.labelPill, 
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC', borderColor: colors.border },
                    (title === lbl || (lbl === 'Other' && !['Home', 'Work'].includes(title))) && styles.labelPillActive
                  ]}
                  onPress={() => setTitle(lbl === 'Other' ? (['Home', 'Work'].includes(title) ? 'Other' : title) : lbl)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.labelPillText, 
                    { color: colors.textSecondary },
                    (title === lbl || (lbl === 'Other' && !['Home', 'Work'].includes(title))) && styles.labelPillTextActive
                  ]}>
                    {lbl}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.textInput, { marginTop: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Label name (e.g. Home, Office, Parents)"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Street Address *</Text>
            <TextInput
              style={[styles.textInput, { height: 74, textAlignVertical: 'top', paddingTop: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
              value={street}
              onChangeText={setStreet}
              placeholder="Flat/House No., Building Name, Street..."
              placeholderTextColor={colors.textSecondary}
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Landmark (Optional)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
              value={landmark}
              onChangeText={setLandmark}
              placeholder="Near Temple / Opposite Park..."
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.rowTwoCols}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>City *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
                value={city}
                onChangeText={setCity}
                placeholder="City"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>District</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
                value={district}
                onChangeText={setDistrict}
                placeholder="District"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.rowTwoCols}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>State *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
                value={state}
                onChangeText={setState}
                placeholder="State"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Country *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
                value={country}
                onChangeText={setCountry}
                placeholder="Country"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Pincode *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
              value={zipCode}
              onChangeText={setZipCode}
              placeholder="Pincode / Zip Code"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.9}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>
              {editingAddress ? 'Update Address' : 'Save Address'}
            </Text>
          )}
        </TouchableOpacity>
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
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  gpsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  gpsCardTop: {
    marginBottom: 12,
  },
  gpsCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  gpsCardSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF', // indigo-50
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingVertical: 11,
    borderRadius: 12,
  },
  gpsBtnSecured: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  gpsBtnText: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 13,
  },
  gpsBtnTextSecured: {
    color: '#059669',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
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
  labelPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  labelPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  labelPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  labelPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  labelPillTextActive: {
    color: '#059669',
    fontWeight: '800',
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
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  saveBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
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
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  guestSignInBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
