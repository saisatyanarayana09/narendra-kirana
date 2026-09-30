import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import ModernSwitch from '../../../components/ModernSwitch';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { useAppTheme } from '../../../context/ThemeContext';
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

const RADIUS_PRESETS = [2, 3, 5, 8, 10, 15];

export default function MapScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  const [radiusKm, setRadiusKm] = useState(5);
  const [storeLat, setStoreLat] = useState('17.385044');
  const [storeLng, setStoreLng] = useState('78.486671');
  const [enforceRadius, setEnforceRadius] = useState(false);
  const [addressPreview, setAddressPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      try {
        const response = await api.get('/store/settings/');
        if (isMounted && response?.data) {
          const d = response.data;
          const km = parseFloat(String(d.delivery_radius_km ?? ''));
          if (!isNaN(km) && km > 0) {
            setRadiusKm(km);
          }
          if (d.store_latitude) {
            setStoreLat(String(d.store_latitude));
          }
          if (d.store_longitude) {
            setStoreLng(String(d.store_longitude));
          }
          if (typeof d.enforce_delivery_radius === 'boolean') {
            setEnforceRadius(d.enforce_delivery_radius);
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

  // Live Reverse Geocode lookup for human-readable store address preview
  useEffect(() => {
    const lat = parseFloat(storeLat);
    const lng = parseFloat(storeLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'NarendraKiranaOwnerMobile/1.0',
                'Accept-Language': 'en',
              },
            }
          );
          if (res.ok) {
            const data = await res.json();
            if (data?.display_name) {
              setAddressPreview(data.display_name.split(',').slice(0, 3).join(', '));
            }
          }
        } catch {
          // Non-blocking preview fallback
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [storeLat, storeLng]);

  const handleUseCurrentLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setStoreLat(pos.coords.latitude.toFixed(6));
          setStoreLng(pos.coords.longitude.toFixed(6));
          showAlert('GPS Located', 'Store location updated to your current device GPS position.');
        },
        () => {
          showAlert('Location Notice', 'Could not detect device GPS. You can drag the pin on the map or enter coordinates.');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      showAlert('Notice', 'Drag the marker on the map to set your store location.');
    }
  };

  const handleSave = async () => {
    const numLat = parseFloat(storeLat);
    const numLng = parseFloat(storeLng);
    if (isNaN(numLat) || Math.abs(numLat) > 90) {
      showAlert('Validation Error', 'Please enter a valid store latitude between -90 and 90.');
      return;
    }
    if (isNaN(numLng) || Math.abs(numLng) > 180) {
      showAlert('Validation Error', 'Please enter a valid store longitude between -180 and 180.');
      return;
    }

    setSaving(true);
    try {
      await api.patch('/store/settings/', {
        store_latitude: numLat.toFixed(6),
        store_longitude: numLng.toFixed(6),
        delivery_radius_km: Number(radiusKm.toFixed(2)),
        enforce_delivery_radius: Boolean(enforceRadius),
      });
      (api as ApiInstance).clearCache();
      showAlert('Success', 'Store delivery zone & coordinates saved successfully!', () =>
        router.back()
      );
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to update store radius & location.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  const numLat = parseFloat(storeLat) || 17.385044;
  const numLng = parseFloat(storeLng) || 78.486671;
  const storeLocation = { latitude: numLat, longitude: numLng };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
    >
      {/* Map or Web Zone Display */}
      {Platform.OS !== 'web' && MapView ? (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              ...storeLocation,
              latitudeDelta: 0.12,
              longitudeDelta: 0.12,
            }}
            onPress={(e: any) => {
              const coord = e?.nativeEvent?.coordinate;
              if (coord?.latitude && coord?.longitude) {
                setStoreLat(coord.latitude.toFixed(6));
                setStoreLng(coord.longitude.toFixed(6));
              }
            }}
          >
            {Marker ? (
              <Marker
                coordinate={storeLocation}
                title="Narendra Kirana Store Hub"
                description="Drag pin or tap map to update position"
                draggable
                onDragEnd={(e: any) => {
                  const coord = e?.nativeEvent?.coordinate;
                  if (coord?.latitude && coord?.longitude) {
                    setStoreLat(coord.latitude.toFixed(6));
                    setStoreLng(coord.longitude.toFixed(6));
                  }
                }}
              />
            ) : null}
            {Circle ? (
              <Circle
                center={storeLocation}
                radius={radiusKm * 1000}
                fillColor="rgba(16, 185, 129, 0.2)"
                strokeColor="#10b981"
                strokeWidth={2}
              />
            ) : null}
          </MapView>

          {/* Floating Helper Hint Banner */}
          <View style={styles.mapOverlayHint}>
            <Ionicons name="hand-left-outline" size={13} color="#10b981" />
            <Text style={styles.mapOverlayHintText}>
              Drag pin or tap map to position store hub
            </Text>
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.webZoneCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.webIconCircle}>
            <Ionicons name="location" size={28} color="#10b981" />
          </View>
          <Text style={[styles.webZoneTitle, { color: colors.text }]}>
            Store Delivery Radar Zone
          </Text>
          <Text style={[styles.webZoneSub, { color: colors.textMuted }]}>
            Active Radius: <Text style={{ color: '#10b981', fontWeight: 'bold' }}>{radiusKm} km</Text> around store coordinates
          </Text>
        </View>
      )}

      {/* Geofence & Location Settings Form */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Store Coordinates & Geofence
        </Text>

        {/* Latitude & Longitude Inputs */}
        <View style={styles.coordsRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Latitude</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text },
              ]}
              value={storeLat}
              onChangeText={setStoreLat}
              placeholder="17.385044"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Longitude</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text },
              ]}
              value={storeLng}
              onChangeText={setStoreLng}
              placeholder="78.486671"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Detected Address Preview Chip */}
        {addressPreview ? (
          <View style={[styles.addressBadge, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
            <Ionicons name="business-outline" size={14} color="#10b981" />
            <Text style={[styles.addressBadgeText, { color: colors.textMuted }]} numberOfLines={2}>
              {addressPreview}
            </Text>
          </View>
        ) : null}

        {/* GPS Quick Pin Action Button */}
        <TouchableOpacity
          style={[styles.gpsActionBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
          onPress={handleUseCurrentLocation}
          accessibilityLabel="Use Current GPS Device Location"
        >
          <Ionicons name="navigate-outline" size={16} color="#10b981" />
          <Text style={[styles.gpsActionBtnText, { color: colors.text }]}>
            Use Current Device GPS Location
          </Text>
        </TouchableOpacity>

        {/* Delivery Radius Presets */}
        <Text style={[styles.label, { color: colors.textMuted, marginTop: 12 }]}>
          Delivery Radius: <Text style={{ color: '#10b981', fontWeight: 'bold' }}>{radiusKm} km</Text>
        </Text>
        <View style={styles.presetsRow}>
          {RADIUS_PRESETS.map((preset) => {
            const isSelected = radiusKm === preset;
            return (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetBtn,
                  {
                    borderColor: isSelected ? '#10b981' : colors.border,
                    backgroundColor: isSelected ? (isDark ? '#064e3b' : '#ecfdf5') : colors.cardAlt,
                  },
                ]}
                onPress={() => setRadiusKm(preset)}
              >
                <Text
                  style={[
                    styles.presetBtnText,
                    {
                      color: isSelected ? '#10b981' : colors.textMuted,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {preset} km
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Fine Adjustment Plus / Minus */}
        <View style={styles.fineAdjRow}>
          <TouchableOpacity
            style={[styles.adjBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
            onPress={() => setRadiusKm((prev) => Math.max(1, Number((prev - 0.5).toFixed(1))))}
          >
            <Ionicons name="remove" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.adjDisplay, { color: colors.text }]}>{radiusKm} km</Text>
          <TouchableOpacity
            style={[styles.adjBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
            onPress={() => setRadiusKm((prev) => Math.min(50, Number((prev + 0.5).toFixed(1))))}
          >
            <Ionicons name="add" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Enforce Delivery Radius Switch */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.switchRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[styles.switchTitle, { color: colors.text }]}>Enforce Delivery Radius</Text>
            <Text style={[styles.switchSub, { color: colors.textMuted }]}>
              Block checkout if customer delivery GPS is beyond {radiusKm} km of the store.
            </Text>
          </View>
          <ModernSwitch
            value={enforceRadius}
            onValueChange={setEnforceRadius}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, { opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Save Geofence & Location</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  mapContainer: {
    height: 250,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  webZoneCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  webIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  webZoneTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  webZoneSub: {
    fontSize: 13,
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  coordsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  presetBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  presetBtnText: {
    fontSize: 12,
  },
  fineAdjRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 6,
  },
  adjBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjDisplay: {
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 70,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingVertical: 13,
    borderRadius: 10,
    marginTop: 6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mapOverlayHint: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mapOverlayHintText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  addressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  addressBadgeText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  gpsActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  gpsActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
