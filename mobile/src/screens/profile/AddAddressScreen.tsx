import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../../constants/theme';
import { apiClient } from '../../api/client';

export function AddAddressScreen({ navigation }: { navigation: NativeStackNavigationProp<any> }) {
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [addressType, setAddressType] = useState('HOME');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!addressLine1 || !city || !state || !pincode) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/addresses/', {
        address_line_1: addressLine1,
        address_line_2: addressLine2,
        city,
        state,
        pincode,
        address_type: addressType
      });
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save address');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Address</Text>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          <View style={styles.typeContainer}>
            {['HOME', 'WORK', 'OTHER'].map(type => (
              <TouchableOpacity 
                key={type}
                style={[styles.typeButton, addressType === type && styles.typeButtonActive]}
                onPress={() => setAddressType(type)}
              >
                <Text style={[styles.typeText, addressType === type && styles.typeTextActive]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address Line 1 *</Text>
            <TextInput style={styles.input} value={addressLine1} onChangeText={setAddressLine1} placeholder="House No., Building Name" />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address Line 2</Text>
            <TextInput style={styles.input} value={addressLine2} onChangeText={setAddressLine2} placeholder="Road Name, Area, Colony" />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>City *</Text>
              <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="E.g. Hyderabad" />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Pincode *</Text>
              <TextInput style={styles.input} value={pincode} onChangeText={setPincode} placeholder="500001" keyboardType="numeric" maxLength={6} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>State *</Text>
            <TextInput style={styles.input} value={state} onChangeText={setState} placeholder="E.g. Telangana" />
          </View>
        </ScrollView>
        
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Address</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: { padding: theme.spacing.xs, marginRight: theme.spacing.sm },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  form: { padding: theme.spacing.md },
  typeContainer: { flexDirection: 'row', marginBottom: theme.spacing.lg },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface
  },
  typeButtonActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  typeText: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '500' },
  typeTextActive: { color: theme.colors.primaryDark, fontWeight: 'bold' },
  inputGroup: { marginBottom: theme.spacing.md },
  row: { flexDirection: 'row' },
  label: { fontSize: 14, color: theme.colors.text, marginBottom: 8, fontWeight: '500' },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 14,
    fontSize: 16,
    color: theme.colors.text
  },
  footer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center'
  },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
