import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

interface MapLocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (data: {
    latitude: number;
    longitude: number;
    street: string;
    city: string;
    state: string;
    zip_code: string;
    display_name: string;
    distance_km?: number | null;
    is_outside_radius?: boolean;
  }) => void;
  initialLat?: number;
  initialLng?: number;
  title?: string;
  storeSettings?: any;
}

export function MapLocationPicker({
  visible,
  onClose,
  onConfirm,
  initialLat = 17.385044,
  initialLng = 78.486671,
  title = "Pin Your Delivery Location",
  storeSettings = null
}: MapLocationPickerProps) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);

  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat || 17.385044,
    lng: initialLng || 78.486671
  });

  const storeLat = parseFloat(storeSettings?.store_latitude || '17.385044');
  const storeLng = parseFloat(storeSettings?.store_longitude || '78.486671');
  const maxRadiusKm = parseFloat(storeSettings?.delivery_radius_km || '5.0');
  const enforceRadius = Boolean(storeSettings?.enforce_delivery_radius);

  const distanceKm = useMemo(() => {
    if (!coords.lat || !coords.lng) return null;
    const R = 6371;
    const dLat = ((coords.lat - storeLat) * Math.PI) / 180;
    const dLon = ((coords.lng - storeLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((storeLat * Math.PI) / 180) *
        Math.cos((coords.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  }, [coords.lat, coords.lng, storeLat, storeLng]);

  const isOutsideRadius = distanceKm !== null && distanceKm > maxRadiusKm;

  const [addressDetails, setAddressDetails] = useState({
    street: '',
    city: '',
    state: '',
    zip_code: '',
    display_name: 'Move the pin to your exact building or doorstep'
  });

  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Reverse Geocoding via OSM Nominatim
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'NarendraKiranaMobile/1.0'
        }
      });
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const road = addr.road || addr.street || addr.neighbourhood || addr.suburb || '';
        const area = addr.suburb || addr.residential || addr.city_district || '';
        const city = addr.city || addr.town || addr.village || addr.county || '';
        const state = addr.state || '';
        const postcode = addr.postcode || '';

        const streetLine = [road, area].filter(Boolean).join(', ');

        setAddressDetails({
          street: streetLine || data.name || '',
          city: city,
          state: state,
          zip_code: postcode,
          display_name: data.display_name || 'Selected Location'
        });
      }
    } catch (e) {
      console.warn('Reverse geocoding error:', e);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      const startLat = initialLat || 17.385044;
      const startLng = initialLng || 78.486671;
      setCoords({ lat: startLat, lng: startLng });
      reverseGeocode(startLat, startLng);
    }
  }, [visible, initialLat, initialLng, reverseGeocode]);

  // Handle GPS Locate Me
  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location permissions in Settings to locate your doorstep.');
        setIsLocating(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const newLat = parseFloat(loc.coords.latitude.toFixed(6));
      const newLng = parseFloat(loc.coords.longitude.toFixed(6));
      setCoords({ lat: newLat, lng: newLng });

      // Pan webview map
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          if (window.setPinLocation) {
            window.setPinLocation(${newLat}, ${newLng});
          }
          true;
        `);
      }
      reverseGeocode(newLat, newLng);
    } catch (err: any) {
      Alert.alert('GPS Error', err?.message || 'Could not fetch current location.');
    } finally {
      setIsLocating(false);
    }
  };

  // Receive message from Leaflet webview
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'location_changed') {
        const newLat = parseFloat(Number(data.lat).toFixed(6));
        const newLng = parseFloat(Number(data.lng).toFixed(6));
        setCoords({ lat: newLat, lng: newLng });
        reverseGeocode(newLat, newLng);
      }
    } catch (e) {
      console.warn('Map cleanup or animation error:', e);
    }
  };

  const handleConfirm = () => {
    if (isOutsideRadius && enforceRadius) {
      Alert.alert(
        'Outside Delivery Radius',
        `Selected doorstep is ${distanceKm} km away, which exceeds our maximum delivery radius of ${maxRadiusKm} km.`
      );
      return;
    }
    onConfirm({
      latitude: coords.lat,
      longitude: coords.lng,
      street: addressDetails.street,
      city: addressDetails.city,
      state: addressDetails.state,
      zip_code: addressDetails.zip_code,
      display_name: addressDetails.display_name,
      distance_km: distanceKm,
      is_outside_radius: isOutsideRadius
    });
    onClose();
  };

  // High-performance Leaflet HTML with CartoDB/OSM tiles and custom draggable pin
  const leafletHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .pin-marker {
            position: relative; width: 38px; height: 38px;
            display: flex; align-items: center; justify-content: center;
          }
          .pin-shape {
            width: 34px; height: 34px;
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            border: 2.5px solid #ffffff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 6px 14px rgba(5,150,105,0.4);
            display: flex; align-items: center; justify-content: center;
          }
          .pin-dot {
            width: 10px; height: 10px; background: #ffffff; border-radius: 50%;
            transform: rotate(45deg);
          }
          .map-controls-col {
            position: absolute;
            top: 12px;
            right: 12px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .ctrl-btn {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            background: rgba(255,255,255,0.96);
            border: 1px solid rgba(0,0,0,0.12);
            box-shadow: 0 4px 12px rgba(0,0,0,0.16);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            cursor: pointer;
            backdrop-filter: blur(8px);
            -webkit-tap-highlight-color: transparent;
            outline: none;
          }
          .ctrl-btn:active {
            transform: scale(0.92);
          }
          .sat-hint {
            position: absolute;
            left: 12px;
            bottom: 12px;
            z-index: 1000;
            background: rgba(15, 23, 42, 0.85);
            color: #fff;
            padding: 6px 10px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 600;
            backdrop-filter: blur(6px);
            pointer-events: none;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>

        <!-- Floating Interactive Controls -->
        <div class="map-controls-col">
          <button class="ctrl-btn" id="layer-btn" onclick="toggleLayer()" title="Toggle Satellite / Street">🛰️</button>
          <button class="ctrl-btn" onclick="focusPin()" title="Focus on Pin">🎯</button>
          ${storeSettings ? `<button class="ctrl-btn" onclick="focusStore()" title="Focus Store">🏪</button>` : ''}
          <button class="ctrl-btn" onclick="zoomIn()" style="font-weight:800; font-size:16px;">+</button>
          <button class="ctrl-btn" onclick="zoomOut()" style="font-weight:800; font-size:16px;">−</button>
        </div>

        <div class="sat-hint">🛰️ Tap satellite to see rooftop & gate</div>

        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          var lat = ${coords.lat};
          var lng = ${coords.lng};
          var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([lat, lng], 16);

          // Standard OSM and Esri Satellite layer
          var isSatellite = false;
          var streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
          var satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 });

          window.toggleLayer = function() {
            isSatellite = !isSatellite;
            var btn = document.getElementById('layer-btn');
            if (isSatellite) {
              map.removeLayer(streetLayer);
              satLayer.addTo(map);
              if (btn) btn.innerText = '🗺️';
            } else {
              map.removeLayer(satLayer);
              streetLayer.addTo(map);
              if (btn) btn.innerText = '🛰️';
            }
          };

          window.focusPin = function() {
            var pt = marker.getLatLng();
            map.flyTo(pt, 18, { duration: 0.8 });
          };

          ${storeSettings ? `
          window.focusStore = function() {
            map.flyTo([${storeLat}, ${storeLng}], 16, { duration: 0.8 });
          };
          ` : ''}

          window.zoomIn = function() { map.zoomIn(); };
          window.zoomOut = function() { map.zoomOut(); };

          ${storeSettings ? `
          L.marker([${storeLat}, ${storeLng}], {
            icon: L.divIcon({
              className: 'store-pin',
              html: '<div style="width:28px;height:28px;background:#064E3B;border:2px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:12px;">🏪</span></div>',
              iconSize: [28, 28],
              iconAnchor: [14, 26]
            })
          }).addTo(map);

          L.circle([${storeLat}, ${storeLng}], {
            radius: ${maxRadiusKm * 1000},
            color: '#059669',
            fillColor: '#10b981',
            fillOpacity: 0.12,
            weight: 2,
            dashArray: '5, 5'
          }).addTo(map);
          ` : ''}

          var customIcon = L.divIcon({
            className: 'pin-marker',
            html: '<div class="pin-shape"><div class="pin-dot"></div></div>',
            iconSize: [38, 38],
            iconAnchor: [19, 34]
          });

          var marker = L.marker([lat, lng], { draggable: true, icon: customIcon }).addTo(map);

          function notifyReactNative(nLat, nLng) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'location_changed',
                lat: nLat,
                lng: nLng
              }));
            }
          }

          marker.on('dragend', function(e) {
            var pt = e.target.getLatLng();
            notifyReactNative(pt.lat, pt.lng);
          });

          map.on('click', function(e) {
            marker.setLatLng(e.latlng);
            notifyReactNative(e.latlng.lat, e.latlng.lng);
          });

          window.setPinLocation = function(newLat, newLng) {
            marker.setLatLng([newLat, newLng]);
            map.flyTo([newLat, newLng], 17, { duration: 1.0 });
          };
        </script>
      </body>
    </html>
  `;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconCircle}>
              <Feather name="map-pin" size={18} color="#059669" />
            </View>
            <View>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSubtitle}>Drag the pin to your doorstep</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
            <Feather name="x" size={22} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Map Canvas with Leaflet */}
        <View style={styles.mapWrap}>
          <WebView
            ref={webViewRef}
            source={{ html: leafletHtml }}
            onMessage={handleMessage}
            style={styles.webView}
            scrollEnabled={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />

          {/* Quick "Locate Me" Button */}
          <TouchableOpacity
            style={styles.locateMeButton}
            onPress={handleLocateMe}
            disabled={isLocating}
            activeOpacity={0.85}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : (
              <>
                <Ionicons name="navigate" size={16} color="#059669" />
                <Text style={styles.locateMeText}>Locate Me</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer Details Card */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.pinInfoCard}>
            <View style={styles.pinTag}>
              <Text style={styles.pinTagText}>SELECTED DOORSTEP</Text>
              {isGeocoding && <ActivityIndicator size="small" color="#059669" style={{ marginLeft: 6 }} />}
            </View>
            <Text style={styles.displayNameText} numberOfLines={2}>
              {addressDetails.display_name}
            </Text>
            <Text style={styles.gpsCoordsText}>
              GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              {addressDetails.zip_code ? ` • Pincode: ${addressDetails.zip_code}` : ''}
            </Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
              <Feather name="check" size={18} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>Confirm Doorstep Pin</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  closeButton: {
    padding: 6,
    borderRadius: 8,
  },
  mapWrap: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  locateMeButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  locateMeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  pinInfoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  pinTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pinTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#059669',
  },
  displayNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
  },
  gpsCoordsText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#059669',
    boxShadow: '0px 3px 6px rgba(5, 150, 105, 0.25)',
    elevation: 3,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
