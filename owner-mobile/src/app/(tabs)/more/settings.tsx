import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Switch, TouchableOpacity, ActivityIndicator } from 'react-native';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { useRouter } from 'expo-router';
import { showAlert } from '../../../utils/alerts';

export default function SettingsScreen() {
  const [storeName, setStoreName] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      try {
        const response = await api.get('/store/settings/');
        if (isMounted && response?.data) {
          setStoreName(response.data.store_name || response.data.name || '');
          setIsOpen(response.data.is_open ?? true);
        }
      } catch {
        // Keep defaults if settings fetch fails
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/store/settings/', { store_name: storeName.trim(), is_open: isOpen });
      (api as ApiInstance).clearCache();
      showAlert('Success', 'Settings saved successfully', () => router.back());
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Store Name</Text>
        <TextInput
          style={styles.input}
          value={storeName}
          onChangeText={setStoreName}
          placeholder="Narendra Kirana"
          placeholderTextColor="#64748b"
        />

        <View style={styles.row}>
          <Text style={styles.label}>Accepting Orders (Store Open)</Text>
          <Switch
            value={isOpen}
            onValueChange={setIsOpen}
            trackColor={{ false: '#334155', true: '#10b981' }}
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Settings</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
  },
  label: {
    color: '#94a3b8',
    marginBottom: 8,
    fontSize: 16,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  saveBtn: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
