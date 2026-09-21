import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Modal,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons, Feather } from '@expo/vector-icons';

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

  const rawCustLat = parseFloat(order?.delivery_latitude ?? order?.customer_latitude);
  const rawCustLng = parseFloat(order?.delivery_longitude ?? order?.customer_longitude);
  const hasCustomerCoords = !isNaN(rawCustLat) && !isNaN(rawCustLng) && rawCustLat !== 0 && rawCustLng !== 0;

  // Real customer coordinates if pinned by user; fallback to store coordinates if missing
  const custLat = hasCustomerCoords ? rawCustLat : storeLat;
  const custLng = hasCustomerCoords ? rawCustLng : storeLng;

  const rawRiderLat = parseFloat(order?.delivery_partner_lat ?? order?.delivery_partner?.current_lat);
  const rawRiderLng = parseFloat(order?.delivery_partner_lng ?? order?.delivery_partner?.current_lng);
  const hasRiderLiveCoords = !isNaN(rawRiderLat) && !isNaN(rawRiderLng) && rawRiderLat !== 0 && rawRiderLng !== 0;

  // NO FAKE 35%/65% INTERPOLATION: Only use authentic coordinates
  const riderLat = hasRiderLiveCoords ? rawRiderLat : null;
  const riderLng = hasRiderLiveCoords ? rawRiderLng : null;

  // When delivery partner is active, origin is the Rider; otherwise it's the store
  const hasRiderPosition = !isPickup && riderLat !== null && riderLng !== null;
  const originLat = hasRiderPosition ? riderLat : storeLat;
  const originLng = hasRiderPosition ? riderLng : storeLng;

  // Show store pin if pickup OR if rider has not started moving yet
  const showStorePin = isPickup || !hasRiderPosition;

  const riderName = (order?.delivery_partner_name || order?.delivery_partner?.name || 'Delivery Partner').replace(/['"\\<>]/g, '');
  const custAddress = (order?.delivery_address || 'Delivery Address').replace(/['"\\<>]/g, ' ');

  const [isExpanded, setIsExpanded] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const fullscreenWebViewRef = useRef<WebView>(null);

  // Live GPS coordinate injection: smoothly moves the bike marker & recalculates route without WebView reload
  useEffect(() => {
    if (hasRiderLiveCoords && riderLat !== null && riderLng !== null) {
      const heading = order?.delivery_partner?.heading ?? 'null';
      const speed = order?.delivery_partner?.speed ?? 'null';
      const script = `
        if (typeof window.updateRiderPosition === 'function') {
          window.updateRiderPosition(${riderLat}, ${riderLng}, ${heading}, ${speed});
        }
        true;
      `;
      webViewRef.current?.injectJavaScript(script);
      fullscreenWebViewRef.current?.injectJavaScript(script);
    }
  }, [riderLat, riderLng, order?.delivery_partner?.heading, order?.delivery_partner?.speed]);

  const trackingHtml = useMemo(() => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <style>
            * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
            html, body {
              margin: 0; padding: 0; width: 100%; height: 100%;
              overflow: hidden; background: #0f172a;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            }
            #map {
              position: absolute; top: 0; bottom: 0; left: 0; right: 0;
              width: 100%; height: 100%;
            }
            
            /* Pin Styles */
            .store-pin {
              width: 36px; height: 36px; background: #064E3B; border: 2.5px solid #ffffff;
              border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 12px rgba(0,0,0,0.4);
              display: flex; align-items: center; justify-content: center; font-size: 16px;
            }
            .cust-pin {
              width: 36px; height: 36px; background: #E11D48; border: 2.5px solid #ffffff;
              border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 14px rgba(225,29,72,0.5);
              display: flex; align-items: center; justify-content: center; font-size: 16px;
            }
            .rider-pin-wrap {
              position: relative; width: 48px; height: 48px;
              display: flex; align-items: center; justify-content: center;
            }
            .rider-pulse {
              position: absolute; width: 44px; height: 44px; border-radius: 50%;
              background: rgba(79, 70, 229, 0.4);
              animation: pulse-ring 1.4s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
            }
            @keyframes pulse-ring {
              0% { transform: scale(0.6); opacity: 1; }
              100% { transform: scale(1.6); opacity: 0; }
            }
            .rider-circle {
              width: 36px; height: 36px; background: #4F46E5; border: 2.5px solid #ffffff;
              border-radius: 50%; box-shadow: 0 4px 14px rgba(79,70,229,0.6);
              display: flex; align-items: center; justify-content: center; font-size: 18px; z-index: 2;
            }

            /* Floating HUD Elements */
            .eta-pill {
              position: absolute; top: 10px; left: 10px; z-index: 1000;
              background: rgba(255, 255, 255, 0.96); backdrop-filter: blur(8px);
              padding: 6px 12px; border-radius: 20px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              font-size: 11px; font-weight: 800; color: #0F172A;
              display: flex; align-items: center; gap: 6px; border: 1px solid #E2E8F0;
              cursor: pointer;
            }
            .eta-dot {
              width: 8px; height: 8px; border-radius: 50%; background: #10B981;
            }

            
          </style>
        </head>
        <body>
          <div id="map"></div>

          <!-- Top Status ETA Badge -->
          <div class="eta-pill" id="eta-pill" onclick="recenterMap()">
            <span class="eta-dot" style="background: ${hasRiderPosition ? '#4F46E5' : '#10B981'};"></span>
            <span id="eta-text">${
              hasRiderPosition
                ? 'Connecting live rider route...'
                : (order?.status === 'OUT_FOR_DELIVERY'
                    ? '🚚 Rider En Route 📡 Connecting GPS...'
                    : (order?.status === 'READY'
                        ? '📦 Order Packed 🚀 Ready for Dispatch'
                        : '📍 Delivery Route Assigned'))
            }</span>
          </div>

          

          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <script>
            var map = L.map('map', { zoomControl: false, attributionControl: false });

            // Layer Management: OpenStreetMap (Standard) & Esri World Imagery (Satellite)
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

            window.zoomIn = function() { map.zoomIn(); };
            window.zoomOut = function() { map.zoomOut(); };

            var custMarker = null;
            var riderMarker = null;
            var activePolyline = null;
            var activePolylineCasing = null;
            var activeStraightLine = null;
            var routeBounds = null;

              // Customer Doorstep Marker
              var custIcon = L.divIcon({
                className: '',
                html: '<div class="cust-pin"><span style="transform: rotate(45deg);">🏠</span></div>',
                iconSize: [36, 36],
                iconAnchor: [18, 32],
                popupAnchor: [0, -32]
              });
              custMarker = L.marker([${custLat}, ${custLng}], { icon: custIcon }).addTo(map);
              custMarker.bindPopup('<div style="font-size:12px; line-height:1.4;"><b style="color:#E11D48;">🏠 Delivery Destination</b><br/><span style="color:#334155;">${custAddress}</span></div>');

              

              ${hasRiderPosition ? `
                // Rider Live Pin (Pulse + Emoji)
                var riderIcon = L.divIcon({
                  className: '',
                  html: '<div class="rider-pin-wrap"><div class="rider-pulse"></div><div class="rider-circle">🛵</div></div>',
                  iconSize: [48, 48],
                  iconAnchor: [24, 24],
                  popupAnchor: [0, -24]
                });
                riderMarker = L.marker([${riderLat}, ${riderLng}], { icon: riderIcon }).addTo(map);
                riderMarker.bindPopup('<div style="font-size:12px; line-height:1.4;"><b style="color:#4F46E5;">🛵 ${riderName}</b><br/><span style="color:#059669; font-weight:700;">● Live GPS Active</span><br/><span style="color:#475569;">On the way to your doorstep</span></div>');
                riderMarker.openPopup();
              ` : ''}

              window.focusRider = function() {
                if (riderMarker) {
                  map.flyTo(riderMarker.getLatLng(), 17, { duration: 0.8 });
                  riderMarker.openPopup();
                }
              };

              window.focusDoorstep = function() {
                map.flyTo([${custLat}, ${custLng}], 17, { duration: 0.8 });
                if (custMarker) custMarker.openPopup();
              };

              routeBounds = L.latLngBounds([
                [${originLat}, ${originLng}],
                [${custLat}, ${custLng}]
              ]);
              map.fitBounds(routeBounds, { padding: [40, 40] });

              window.recenterMap = function() {
                if (routeBounds) {
                  map.flyToBounds(routeBounds, { padding: [40, 40], duration: 0.8 });
                }
              };

              // Reusable Road Route & Live Distance Fetcher
              function fetchOSRMRoute(oLng, oLat, dLng, dLat, isRiderOrigin) {
                var osrmUrl = 'https://router.project-osrm.org/route/v1/driving/' + oLng + ',' + oLat + ';' + dLng + ',' + dLat + '?overview=full&geometries=geojson';
                fetch(osrmUrl)
                  .then(function(res) { return res.json(); })
                  .then(function(data) {
                    if (data.routes && data.routes.length > 0) {
                      var route = data.routes[0];
                      var distKm = (route.distance / 1000).toFixed(1);
                      var durMins = Math.ceil(route.duration / 60);

                      var etaElem = document.getElementById('eta-text');
                      if (etaElem) {
                        var prefix = isRiderOrigin ? '🛵 ' : '📍 Store to Doorstep: ';
                        var suffix = isRiderOrigin ? ' away (Live GPS)' : ' estimated';
                        etaElem.innerText = prefix + distKm + ' km • ~' + durMins + ' mins' + suffix;
                      }

                      var coords = route.geometry.coordinates.map(function(pt) { return [pt[1], pt[0]]; });
                      
                      if (activePolylineCasing) map.removeLayer(activePolylineCasing);
                      if (activePolyline) map.removeLayer(activePolyline);
                      if (activeStraightLine) map.removeLayer(activeStraightLine);

                      activePolylineCasing = L.polyline(coords, { color: '#047857', weight: 6.5, opacity: 0.3 }).addTo(map);
                      activePolyline = L.polyline(coords, { color: '#10B981', weight: 4.5, opacity: 0.95 }).addTo(map);

                      routeBounds = activePolyline.getBounds();
                    } else {
                      drawFallbackLine(oLat, oLng, dLat, dLng);
                    }
                  })
                  .catch(function() {
                    drawFallbackLine(oLat, oLng, dLat, dLng);
                  });
              }

              function drawFallbackLine(oLat, oLng, dLat, dLng) {
                if (activePolylineCasing) map.removeLayer(activePolylineCasing);
                if (activePolyline) map.removeLayer(activePolyline);
                if (activeStraightLine) map.removeLayer(activeStraightLine);

                activeStraightLine = L.polyline([[oLat, oLng], [dLat, dLng]], {
                  color: '#10B981', weight: 3.5, dashArray: '5, 8'
                }).addTo(map);
                routeBounds = activeStraightLine.getBounds();
              }

              // Initial Route Fetch
              fetchOSRMRoute(${originLng}, ${originLat}, ${custLng}, ${custLat}, ${hasRiderPosition ? 'true' : 'false'});

              // Live Real-Time Coordinate Injection Handler (invoked smoothly without map reload!)
              window.updateRiderPosition = function(newLat, newLng, heading, speed) {
                var lat = parseFloat(newLat);
                var lng = parseFloat(newLng);
                if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

                if (!riderMarker) {
                  var riderIcon = L.divIcon({
                    className: '',
                    html: '<div class="rider-pin-wrap"><div class="rider-pulse"></div><div class="rider-circle">🛵</div></div>',
                    iconSize: [48, 48],
                    iconAnchor: [24, 24],
                    popupAnchor: [0, -24]
                  });
                  riderMarker = L.marker([lat, lng], { icon: riderIcon }).addTo(map);
                  riderMarker.bindPopup('<div style="font-size:12px; line-height:1.4;"><b style="color:#4F46E5;">🛵 ${riderName}</b><br/><span style="color:#059669; font-weight:700;">● Live GPS Active</span><br/><span style="color:#475569;">On the way to your doorstep</span></div>');
                  riderMarker.openPopup();
                } else {
                  riderMarker.setLatLng([lat, lng]);
                }

                // Smooth pan to rider
                map.panTo([lat, lng], { animate: true, duration: 0.8 });

                // Recalculate route and ETA countdown live from current position
                fetchOSRMRoute(lng, lat, ${custLng}, ${custLat}, true);
              };
          </script>
        </body>
      </html>
    `;
  }, [storeLat, storeLng, storeName, storeAddress, isPickup, custLat, custLng, originLat, originLng, showStorePin, hasRiderPosition, riderName, custAddress]);

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
    <>
      <View style={[styles.container, { height }]}>
        <WebView
          ref={webViewRef}
          source={{ html: trackingHtml }}
          style={{ width: '100%', height }}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="always"
          androidLayerType="hardware"
          
        />

        {/* Expand / Fullscreen Map Button Top Right */}
        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setIsExpanded(true)}
          activeOpacity={0.8}
          accessibilityLabel="Fullscreen Map"
        >
          <Ionicons name="expand" size={15} color="#0F172A" />
        </TouchableOpacity>

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

      {/* Fullscreen Interactive Tracking Modal */}
      <Modal
        visible={isExpanded}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsExpanded(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
          
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={styles.headerDot} />
              <View>
                <Text style={styles.modalTitle}>Live Delivery Route</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {custAddress}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setIsExpanded(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Full-Screen Map Canvas */}
          <View style={styles.fullscreenMapWrap}>
            <WebView
              ref={fullscreenWebViewRef}
              source={{ html: trackingHtml }}
              style={{ flex: 1 }}
              originWhitelist={['*']}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              mixedContentMode="always"
              androidLayerType="hardware"
            />
          </View>

          {/* Bottom Bar in Fullscreen */}
          <View style={styles.modalBottomBar}>
            <TouchableOpacity
              style={styles.modalNavButton}
              onPress={handleOpenMaps}
              activeOpacity={0.85}
            >
              <Ionicons name="navigate" size={16} color="#FFFFFF" />
              <Text style={styles.modalNavButtonText}>
                {isPickup ? 'Launch Directions in Google Maps' : 'Turn-by-Turn in Google Maps'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </>
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
  expandButton: {
    position: 'absolute',
    top: 10,
    right: 50,
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)',
    elevation: 3,
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
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  headerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenMapWrap: {
    flex: 1,
    position: 'relative',
  },
  modalBottomBar: {
    padding: 14,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  modalNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 14,
    boxShadow: '0px 3px 6px rgba(5, 150, 105, 0.3)',
    elevation: 4,
  },
  modalNavButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
