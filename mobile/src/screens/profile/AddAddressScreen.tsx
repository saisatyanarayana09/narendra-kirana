import React, { useState, useEffect } from 'react';
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
import { apiClient } from '../../api/client';
import { useLocation } from '../../hooks/useLocation';

export function AddAddressScreen({ navigation, route }: { navigation: AppNavigationProp, route: any }) {
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color="#059669" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editingAddress ? 'Edit Address' : 'New Address'}
        </Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* GPS Capture Card */}
        <View style={styles.gpsCard}>
          <View style={styles.gpsCardTop}>
            <View>
              <Text style={styles.gpsCardTitle}>Pinpoint Delivery Location</Text>
              <Text style={styles.gpsCardSub}>
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
              <ActivityIndicator color={latitude ? "#059669" : "#4F46E5"} size="small" />
            ) : (
              <>
                <Feather 
                  name={latitude ? "check-circle" : "navigation"} 
                  size={16} 
                  color={latitude ? "#059669" : "#4F46E5"} 
                />
                <Text style={[styles.gpsBtnText, Boolean(latitude) && styles.gpsBtnTextSecured]}>
                  {latitude ? '📍 GPS Secured (Tap to relocate)' : '📍 Capture My Exact Location'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Address Form Card */}
        <View style={styles.formCard}>
          {/* Label Pills & Custom Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Label (e.g. Home, Work, Other)</Text>
            <View style={styles.labelPillsRow}>
              {['Home', 'Work', 'Other'].map((lbl) => (
                <TouchableOpacity
                  key={lbl}
                  style={[styles.labelPill, (title === lbl || (lbl === 'Other' && !['Home', 'Work'].includes(title))) && styles.labelPillActive]}
                  onPress={() => setTitle(lbl === 'Other' ? (['Home', 'Work'].includes(title) ? 'Other' : title) : lbl)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.labelPillText, (title === lbl || (lbl === 'Other' && !['Home', 'Work'].includes(title))) && styles.labelPillTextActive]}>
                    {lbl}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.textInput, { marginTop: 8 }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Label name (e.g. Home, Office, Parents)"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Street Address *</Text>
            <TextInput
              style={[styles.textInput, { height: 74, textAlignVertical: 'top', paddingTop: 10 }]}
              value={street}
              onChangeText={setStreet}
              placeholder="Flat/House No., Building Name, Street..."
              placeholderTextColor="#94A3B8"
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Landmark (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={landmark}
              onChangeText={setLandmark}
              placeholder="Near Temple / Opposite Park..."
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.rowTwoCols}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>City *</Text>
              <TextInput
                style={styles.textInput}
                value={city}
                onChangeText={setCity}
                placeholder="City"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>District</Text>
              <TextInput
                style={styles.textInput}
                value={district}
                onChangeText={setDistrict}
                placeholder="District"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <View style={styles.rowTwoCols}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>State *</Text>
              <TextInput
                style={styles.textInput}
                value={state}
                onChangeText={setState}
                placeholder="State"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Country *</Text>
              <TextInput
                style={styles.textInput}
                value={country}
                onChangeText={setCountry}
                placeholder="Country"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Pincode *</Text>
            <TextInput
              style={styles.textInput}
              value={zipCode}
              onChangeText={setZipCode}
              placeholder="Pincode / Zip Code"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={styles.saveBtn}
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
});
