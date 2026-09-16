import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Feather, Ionicons } from '@expo/vector-icons';

interface OrderTrackingMapProps {
  order: any;
  storeSettings?: any;
  height?: number;
}

export function OrderTrackingMap({
  order,
  storeSettings,
  height = 240
}: OrderTrackingMapProps) {
  const storeLat = parseFloat(storeSettings?.store_latitude || '17.385044');
  const storeLng = parseFloat(storeSettings?.store_longitude || '78.486671');

  const custLat = parseFloat(order?.delivery_latitude);
  const custLng = parseFloat(order?.delivery_longitude);

  const hasCustomerCoords = !isNaN(custLat) && !isNaN(custLng) && custLat !== 0 && custLng !== 0;

  const isOutForDelivery = order?.status === 'OUT_FOR_DELIVERY';

  const riderLat = isOutForDelivery ? (parseFloat(order?.delivery_partner_lat) || (storeLat * 0.35 + custLat * 0.65)) : null;
  const riderLng = isOutForDelivery ? (parseFloat(order?.delivery_partner_lng) || (storeLng * 0.35 + custLng * 0.65)) : null;

  const trackingHtml = useMemo(() => {
    if (!hasCustomerCoords) return '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <style>
            html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #f8fafc; }
            .store-pin {
              width: 30px; height: 30px; background: #064E3B; border: 2px solid #ffffff;
              border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 8px rgba(0,0,0,0.3);
              display: flex; align-items: center; justify-content: center; font-size: 13px;
            }
            .cust-pin {
              width: 30px; height: 30px; background: #E11D48; border: 2px solid #ffffff;
              border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 8px rgba(225,29,72,0.4);
              display: flex; align-items: center; justify-content: center; font-size: 13px;
            }
            .rider-pin {
              width: 32px; height: 32px; background: #4F46E5; border: 2px solid #ffffff;
              border-radius: 50%; box-shadow: 0 4px 10px rgba(79,70,229,0.5);
              display: flex; align-items: center; justify-content: center; font-size: 15px;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <script>
            var map = L.map('map', { zoomControl: false, attributionControl: false });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19
            }).addTo(map);

            var storeIcon = L.divIcon({
              className: '',
              html: '<div class="store-pin"><span style="transform: rotate(45deg);">🏪</span></div>',
              iconSize: [30, 30],
              iconAnchor: [15, 27]
            });

            var custIcon = L.divIcon({
              className: '',
              html: '<div class="cust-pin"><span style="transform: rotate(45deg);">🏠</span></div>',
              iconSize: [30, 30],
              iconAnchor: [15, 27]
            });

            var storeMarker = L.marker([${storeLat}, ${storeLng}], { icon: storeIcon }).addTo(map);
            var custMarker = L.marker([${custLat}, ${custLng}], { icon: custIcon }).addTo(map);

            ${riderLat && riderLng ? `
              var riderIcon = L.divIcon({
                className: '',
                html: '<div class="rider-pin">🛵</div>',
                iconSize: [32, 32],
                iconAnchor: [16, 16]
              });
              var riderMarker = L.marker([${riderLat}, ${riderLng}], { icon: riderIcon }).addTo(map);
            ` : ''}

            // Fetch OSRM Road Route
            var osrmUrl = 'https://router.project-osrm.org/route/v1/driving/${storeLng},${storeLat};${custLng},${custLat}?overview=full&geometries=geojson';
            fetch(osrmUrl)
              .then(function(res) { return res.json(); })
              .then(function(data) {
                if (data.routes && data.routes.length > 0) {
                  var route = data.routes[0];
                  var coords = route.geometry.coordinates.map(function(pt) { return [pt[1], pt[0]]; });
                  
                  // Background casing
                  L.polyline(coords, { color: '#047857', weight: 6, opacity: 0.25 }).addTo(map);
                  // Main route line
                  var poly = L.polyline(coords, { color: '#10B981', weight: 4, opacity: 0.95 }).addTo(map);

                  var bounds = L.latLngBounds([
                    [${storeLat}, ${storeLng}],
                    [${custLat}, ${custLng}]
                    ${riderLat && riderLng ? `,[${riderLat}, ${riderLng}]` : ''}
                  ]);
                  map.fitBounds(bounds, { padding: [35, 35] });
                } else {
                  var line = L.polyline([[${storeLat}, ${storeLng}], [${custLat}, ${custLng}]], {
                    color: '#10B981', weight: 3, dashArray: '5, 8'
                  }).addTo(map);
                  map.fitBounds(line.getBounds(), { padding: [30, 30] });
                }
              })
              .catch(function() {
                var line = L.polyline([[${storeLat}, ${storeLng}], [${custLat}, ${custLng}]], {
                  color: '#10B981', weight: 3, dashArray: '5, 8'
                }).addTo(map);
                map.fitBounds(line.getBounds(), { padding: [30, 30] });
              });
          </script>
        </body>
      </html>
    `;
  }, [hasCustomerCoords, storeLat, storeLng, custLat, custLng, riderLat, riderLng]);

  if (!hasCustomerCoords) {
    return null;
  }

  const handleOpenMaps = () => {
    const url = Platform.select({
      ios: `maps:0,0?q=${custLat},${custLng}`,
      android: `geo:${custLat},${custLng}?q=${custLat},${custLng}`,
      default: `https://www.google.com/maps/dir/?api=1&origin=${storeLat},${storeLng}&destination=${custLat},${custLng}`
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&origin=${storeLat},${storeLng}&destination=${custLat},${custLng}`);
    });
  };

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        source={{ html: trackingHtml }}
        style={styles.webView}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />

      {/* Floating Status Pill Top Left */}
      <View style={styles.statusPill}>
        <View style={[styles.statusDot, { backgroundColor: isOutForDelivery ? '#6366F1' : '#10B981' }]} />
        <Text style={styles.statusText}>
          {isOutForDelivery ? 'Rider On The Way' : 'Delivery Route'}
        </Text>
      </View>

      {/* 1-Tap Maps Launcher Bottom Left */}
      <TouchableOpacity
        style={styles.navButton}
        onPress={handleOpenMaps}
        activeOpacity={0.85}
      >
        <Ionicons name="compass" size={14} color="#059669" />
        <Text style={styles.navButtonText}>Open in Maps</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  statusPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  navButton: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
});
