import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { showAlert } from '../../../utils/alerts';

// Safely import maps on native only to prevent NativeModuleError on Web/unsupported environments
let MapView: any = null;
let Circle: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Circle = Maps.Circle;
    Marker = Maps.Marker;
  } catch {
    // Fallback to non-map radius controls if native module is unavailable
  }
}

export default function MapScreen() {
  const router = useRouter();
  const [radius, setRadius] = useState(5000); // 5km default in meters
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [storeLocation, setStoreLocation] = useState({
    latitude: 17.385,
    longitude: 78.4867,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      try {
        const response = await api.get('/store/settings/');
        if (isMounted && response?.data) {
          const km = parseFloat(String(response.data.delivery_radius_km ?? ''));
          if (!isNaN(km) && km > 0) {
            setRadius(Math.round(km * 1000));
          }
          const lat = parseFloat(String(response.data.store_latitude ?? ''));
          const lng = parseFloat(String(response.data.store_longitude ?? ''));
          if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
            setStoreLocation({ latitude: lat, longitude: lng });
          }
        }
      } catch {
        // Keep default coordinates if fetch fails
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
      await api.patch('/store/settings/', { delivery_radius_km: Number((radius / 1000).toFixed(2)) });
      (api as ApiInstance).clearCache();
      showAlert('Success', 'Delivery radius updated', () => router.back());
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to update radius'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Platform.OS !== 'web' && MapView ? (
        <MapView
          style={styles.map}
          initialRegion={{
            ...storeLocation,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
        >
          {Marker ? <Marker coordinate={storeLocation} title="Your Store" /> : null}
          {Circle ? (
            <Circle
              center={storeLocation}
              radius={radius}
              fillColor="rgba(16, 185, 129, 0.2)"
              strokeColor="#10b981"
            />
          ) : null}
        </MapView>
      ) : (
        <View style={[styles.map, styles.webFallback]}>
          <Text style={styles.infoText}>Delivery Zone Configuration</Text>
          <Text style={styles.coordText}>
            Store Coordinates: {storeLocation.latitude.toFixed(4)}, {storeLocation.longitude.toFixed(4)}
          </Text>
          <Text style={styles.subText}>Adjust your store delivery radius below:</Text>
        </View>
      )}

      <View style={styles.controls}>
        <Text style={styles.infoText}>Radius: {(radius / 1000).toFixed(1)} km</Text>
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={styles.adjBtn}
            onPress={() => setRadius((prev) => Math.max(1000, prev - 1000))}
          >
            <Text style={styles.btnText}>-</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.adjBtn}
            onPress={() => setRadius((prev) => Math.min(50000, prev + 1000))}
          >
            <Text style={styles.btnText}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>Save Area</Text>
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
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    flex: 1,
  },
  webFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  coordText: {
    color: '#10b981',
    fontSize: 14,
    marginBottom: 8,
  },
  subText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
  controls: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  infoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  adjBtn: {
    backgroundColor: '#334155',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 24,
  },
  saveBtn: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
