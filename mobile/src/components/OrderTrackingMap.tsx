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
import { Ionicons } from '@expo/vector-icons';

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
  const storeName = (storeSettings?.store_name || 'Narendra Kirana Store').replace(/['"\\<>]/g, '');
  const storeAddress = (storeSettings?.store_address || 'Main Road, Store Location').replace(/['"\\<>]/g, ' ');

  const isPickup = order?.order_type === 'PICKUP';

  const rawCustLat = parseFloat(order?.delivery_latitude);
  const rawCustLng = parseFloat(order?.delivery_longitude);
  const hasCustomerCoords = !isNaN(rawCustLat) && !isNaN(rawCustLng) && rawCustLat !== 0 && rawCustLng !== 0;

  // Graceful fallback coordinates if order was placed without pinned lat/lng
  const custLat = hasCustomerCoords ? rawCustLat : (storeLat + 0.008);
  const custLng = hasCustomerCoords ? rawCustLng : (storeLng + 0.008);

  const rawRiderLat = parseFloat(order?.delivery_partner_lat);
  const rawRiderLng = parseFloat(order?.delivery_partner_lng);
  const hasRiderLiveCoords = !isNaN(rawRiderLat) && !isNaN(rawRiderLng) && rawRiderLat !== 0 && rawRiderLng !== 0;

  const isRiderAssigned = Boolean(order?.delivery_partner_name) || Boolean(order?.delivery_partner);
  const isOutForDelivery = order?.status === 'OUT_FOR_DELIVERY' || (isRiderAssigned && order?.status === 'READY') || hasRiderLiveCoords;

  const riderLat = hasRiderLiveCoords
    ? rawRiderLat
    : (isOutForDelivery ? (storeLat * 0.35 + custLat * 0.65) : null);
  const riderLng = hasRiderLiveCoords
    ? rawRiderLng
    : (isOutForDelivery ? (storeLng * 0.35 + custLng * 0.65) : null);

  // When delivery partner is active, origin is the Rider; otherwise it's the store
  const hasRiderPosition = !isPickup && riderLat !== null && riderLng !== null;
  const originLat = hasRiderPosition ? riderLat : storeLat;
  const originLng = hasRiderPosition ? riderLng : storeLng;

  // Do NOT show store pin if rider is on the road to customer in delivery mode
  const showStorePin = isPickup || (!hasRiderPosition && !isOutForDelivery);

  const riderName = (order?.delivery_partner_name || 'Delivery Partner').replace(/['"\\<>]/g, '');
  const custAddress = (order?.delivery_address || 'Delivery Address').replace(/['"\\<>]/g, ' ');

  const trackingHtml = useMemo(() => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <style>
            * { box-sizing: border-box; }
            html, body {
              margin: 0; padding: 0; width: 100%; height: 100%;
              overflow: hidden; background: #f8fafc;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            }
            #map {
              position: absolute; top: 0; bottom: 0; left: 0; right: 0;
              width: 100%; height: 100%;
            }
            
            /* Pin Styles */
            .store-pin {
              width: 34px; height: 34px; background: #064E3B; border: 2.5px solid #ffffff;
              border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 10px rgba(0,0,0,0.35);
              display: flex; align-items: center; justify-content: center; font-size: 15px;
            }
            .cust-pin {
              width: 34px; height: 34px; background: #E11D48; border: 2.5px solid #ffffff;
              border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 12px rgba(225,29,72,0.45);
              display: flex; align-items: center; justify-content: center; font-size: 15px;
            }
            .rider-pin-wrap {
              position: relative; width: 44px; height: 44px;
              display: flex; align-items: center; justify-content: center;
            }
            .rider-pulse {
              position: absolute; width: 40px; height: 40px; border-radius: 50%;
              background: rgba(79, 70, 229, 0.35);
              animation: pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
            }
            @keyframes pulse-ring {
              0% { transform: scale(0.6); opacity: 1; }
              100% { transform: scale(1.6); opacity: 0; }
            }
            .rider-circle {
              width: 34px; height: 34px; background: #4F46E5; border: 2.5px solid #ffffff;
              border-radius: 50%; box-shadow: 0 4px 12px rgba(79,70,229,0.5);
              display: flex; align-items: center; justify-content: center; font-size: 16px; z-index: 2;
            }

            /* On-Map Floating ETA Pill */
            .eta-pill {
              position: absolute; top: 10px; left: 10px; z-index: 1000;
              background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(4px);
              padding: 6px 12px; border-radius: 20px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.12);
              font-size: 11px; font-weight: 800; color: #0F172A;
              display: flex; align-items: center; gap: 6px; border: 1px solid #E2E8F0;
            }
            .eta-dot {
              width: 7px; height: 7px; border-radius: 50%; background: #10B981;
            }
            .recenter-btn {
              position: absolute; bottom: 10px; right: 10px; z-index: 1000;
              background: #ffffff; border: 1px solid #E2E8F0;
              width: 32px; height: 32px; border-radius: 8px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.12);
              display: flex; align-items: center; justify-content: center;
              font-size: 15px; cursor: pointer;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <div class="eta-pill" id="eta-pill">
            <span class="eta-dot" style="background: ${isPickup ? '#064E3B' : (hasRiderPosition ? '#4F46E5' : '#10B981')};"></span>
            <span id="eta-text">${isPickup ? 'Store Pickup Location' : (hasRiderPosition ? 'Connecting live rider route...' : 'Delivery Route')}</span>
          </div>
          <button class="recenter-btn" onclick="recenterMap()" title="Recenter">🎯</button>

          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <script>
            var map = L.map('map', { zoomControl: false, attributionControl: false });

            // Free official OpenStreetMap tiles (Zero API Keys)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19
            }).addTo(map);

            ${isPickup ? `
              // Store Marker for Pickup
              var storeIcon = L.divIcon({
                className: '',
                html: '<div class="store-pin"><span style="transform: rotate(45deg);">🏪</span></div>',
                iconSize: [34, 34],
                iconAnchor: [17, 30],
                popupAnchor: [0, -30]
              });
              var storeMarker = L.marker([${storeLat}, ${storeLng}], { icon: storeIcon }).addTo(map);
              storeMarker.bindPopup('<div style="font-size:12px; line-height:1.4;"><b style="color:#064E3B;">🏪 ${storeName}</b><br/><span style="color:#475569;">${storeAddress}</span><br/><span style="color:#059669; font-weight:700;">Store Pickup Hub</span></div>').openPopup();

              map.setView([${storeLat}, ${storeLng}], 16);

              window.recenterMap = function() {
                map.setView([${storeLat}, ${storeLng}], 16);
              };
            ` : `
              // Customer Doorstep Marker
              var custIcon = L.divIcon({
                className: '',
                html: '<div class="cust-pin"><span style="transform: rotate(45deg);">🏠</span></div>',
                iconSize: [34, 34],
                iconAnchor: [17, 30],
                popupAnchor: [0, -30]
              });
              var custMarker = L.marker([${custLat}, ${custLng}], { icon: custIcon }).addTo(map);
              custMarker.bindPopup('<div style="font-size:12px; line-height:1.4;"><b style="color:#E11D48;">🏠 Delivery Destination</b><br/><span style="color:#334155;">${custAddress}</span></div>');

              ${showStorePin ? `
                // Store Pin (Only when order is being prepared before rider dispatch)
                var storeIcon = L.divIcon({
                  className: '',
                  html: '<div class="store-pin"><span style="transform: rotate(45deg);">🏪</span></div>',
                  iconSize: [32, 32],
                  iconAnchor: [16, 28],
                  popupAnchor: [0, -28]
                });
                var storeMarker = L.marker([${storeLat}, ${storeLng}], { icon: storeIcon }).addTo(map);
                storeMarker.bindPopup('<div style="font-size:12px;"><b>Store Dispatch Hub</b></div>');
              ` : ''}

              ${hasRiderPosition ? `
                // Rider Live Pin (Pulse + Emoji)
                var riderIcon = L.divIcon({
                  className: '',
                  html: '<div class="rider-pin-wrap"><div class="rider-pulse"></div><div class="rider-circle">🛵</div></div>',
                  iconSize: [44, 44],
                  iconAnchor: [22, 22],
                  popupAnchor: [0, -22]
                });
                var riderMarker = L.marker([${riderLat}, ${riderLng}], { icon: riderIcon }).addTo(map);
                riderMarker.bindPopup('<div style="font-size:12px; line-height:1.4;"><b style="color:#4F46E5;">🛵 ${riderName}</b><br/><span style="color:#059669; font-weight:700;">● Live GPS Active</span><br/><span style="color:#475569;">On the way to your doorstep</span></div>');
                riderMarker.openPopup();
              ` : ''}

              var routeBounds = L.latLngBounds([
                [${originLat}, ${originLng}],
                [${custLat}, ${custLng}]
              ]);
              map.fitBounds(routeBounds, { padding: [40, 40] });

              window.recenterMap = function() {
                if (routeBounds) {
                  map.fitBounds(routeBounds, { padding: [40, 40] });
                }
              };

              // Fetch Real-time Road Route from OSRM
              var osrmUrl = 'https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${custLng},${custLat}?overview=full&geometries=geojson';
              fetch(osrmUrl)
                .then(function(res) { return res.json(); })
                .then(function(data) {
                  if (data.routes && data.routes.length > 0) {
                    var route = data.routes[0];
                    var distKm = (route.distance / 1000).toFixed(1);
                    var durMins = Math.ceil(route.duration / 60);

                    var etaElem = document.getElementById('eta-text');
                    if (etaElem) {
                      etaElem.innerText = '🛵 ' + distKm + ' km • ~' + durMins + ' mins away';
                    }

                    var coords = route.geometry.coordinates.map(function(pt) { return [pt[1], pt[0]]; });
                    
                    // Road route casing
                    L.polyline(coords, { color: '#047857', weight: 6, opacity: 0.25 }).addTo(map);
                    // Road route stroke
                    var poly = L.polyline(coords, { color: '#10B981', weight: 4, opacity: 0.95 }).addTo(map);

                    routeBounds = poly.getBounds();
                    map.fitBounds(routeBounds, { padding: [40, 40] });
                  } else {
                    var line = L.polyline([[${originLat}, ${originLng}], [${custLat}, ${custLng}]], {
                      color: '#10B981', weight: 3, dashArray: '5, 8'
                    }).addTo(map);
                    routeBounds = line.getBounds();
                    map.fitBounds(routeBounds, { padding: [35, 35] });
                  }
                })
                .catch(function() {
                  var line = L.polyline([[${originLat}, ${originLng}], [${custLat}, ${custLng}]], {
                    color: '#10B981', weight: 3, dashArray: '5, 8'
                  }).addTo(map);
                  routeBounds = line.getBounds();
                  map.fitBounds(routeBounds, { padding: [35, 35] });
                });
            `}
          </script>
        </body>
      </html>
    `;
  }, [storeLat, storeLng, storeName, storeAddress, isPickup, custLat, custLng, riderLat, riderLng, originLat, originLng, showStorePin, hasRiderPosition, riderName, custAddress]);

  const handleOpenMaps = () => {
    const destCoords = isPickup ? `${storeLat},${storeLng}` : `${custLat},${custLng}`;
    const url = Platform.select({
      ios: `maps:0,0?q=${destCoords}`,
      android: `geo:${destCoords}?q=${destCoords}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${destCoords}`
    });
    Linking.openURL(url!).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destCoords}`);
    });
  };

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        source={{ html: trackingHtml }}
        style={{ width: '100%', height }}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        androidHardwareAccelerationDisabled={false}
        androidLayerType="hardware"
        scrollEnabled={false}
      />

      {/* 1-Tap Maps Launcher Bottom Left */}
      <TouchableOpacity
        style={styles.navButton}
        onPress={handleOpenMaps}
        activeOpacity={0.85}
      >
        <Ionicons name="compass" size={14} color="#059669" />
        <Text style={styles.navButtonText}>
          {isPickup ? 'Directions to Store' : 'Open in Google Maps'}
        </Text>
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
