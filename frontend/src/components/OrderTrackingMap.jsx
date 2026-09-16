import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Store, MapPin, Truck, Navigation, Clock, ShieldCheck, Compass } from 'lucide-react';

// Store Pin Icon
const storePinIcon = L.divIcon({
  className: 'store-osm-pin',
  html: `
    <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
      <div style="width: 32px; height: 32px; background: #064E3B; border: 2.5px solid #ffffff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
        <span style="transform: rotate(45deg); font-size: 14px;">🏪</span>
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 32],
  popupAnchor: [0, -32]
});

// Customer Pin Icon
const customerPinIcon = L.divIcon({
  className: 'customer-osm-pin',
  html: `
    <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
      <div style="width: 32px; height: 32px; background: #E11D48; border: 2.5px solid #ffffff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 10px rgba(225,29,72,0.4); display: flex; align-items: center; justify-content: center;">
        <span style="transform: rotate(45deg); font-size: 14px;">🏠</span>
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 32],
  popupAnchor: [0, -32]
});

// Rider Pin Icon
const riderPinIcon = L.divIcon({
  className: 'rider-osm-pin',
  html: `
    <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: rgba(99,102,241,0.25); animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="width: 34px; height: 34px; background: #4F46E5; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 4px 12px rgba(79,70,229,0.5); display: flex; align-items: center; justify-content: center; z-index: 2;">
        <span style="font-size: 16px;">🛵</span>
      </div>
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  popupAnchor: [0, -21]
});

export default function OrderTrackingMap({
  order,
  storeSettings,
  className = "w-full h-72 sm:h-80 rounded-2xl overflow-hidden"
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polylineRef = useRef(null);
  const riderMarkerRef = useRef(null);

  const [routeInfo, setRouteInfo] = useState({
    distanceKm: null,
    durationMins: null,
    loading: true
  });

  const storeLat = parseFloat(storeSettings?.store_latitude || '17.385044');
  const storeLng = parseFloat(storeSettings?.store_longitude || '78.486671');

  const custLat = parseFloat(order?.delivery_latitude);
  const custLng = parseFloat(order?.delivery_longitude);

  const hasCustomerCoords = !isNaN(custLat) && !isNaN(custLng) && custLat !== 0 && custLng !== 0;

  useEffect(() => {
    if (!mapContainerRef.current || !hasCustomerCoords) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const centerLat = (storeLat + custLat) / 2;
    const centerLng = (storeLng + custLng) / 2;

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    // Official OpenStreetMap Tiles (100% Free, Zero API Keys Required)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const isOutForDelivery = order?.status === 'OUT_FOR_DELIVERY';

    // Store marker (only show if NOT yet out for delivery, e.g. PREPARING or READY at store)
    if (!isOutForDelivery) {
      const storeMarker = L.marker([storeLat, storeLng], { icon: storePinIcon }).addTo(map);
      storeMarker.bindPopup(`<b>${storeSettings?.store_name || 'Store'}</b><br/>Dispatch Hub`);
    }

    // Customer marker (Destination)
    const custMarker = L.marker([custLat, custLng], { icon: customerPinIcon }).addTo(map);
    custMarker.bindPopup(`<b>Delivery Address</b><br/>${order?.delivery_address || 'Customer Doorstep'}`);

    // Rider marker (if out for delivery)
    let riderPos = null;
    if (isOutForDelivery) {
      // If delivery partner profile has GPS, use it; otherwise place at an estimated 65% progress along the vector
      const rLat = parseFloat(order?.delivery_partner_lat) || (storeLat * 0.35 + custLat * 0.65);
      const rLng = parseFloat(order?.delivery_partner_lng) || (storeLng * 0.35 + custLng * 0.65);
      riderPos = [rLat, rLng];
      const rMarker = L.marker(riderPos, { icon: riderPinIcon }).addTo(map);
      rMarker.bindPopup(`<b>${order?.delivery_partner_name || 'Delivery Partner'}</b><br/>🛵 Rider is on the way to you!`);
      riderMarkerRef.current = rMarker;
    }

    // Origin: use Rider's location when out for delivery, or store when dispatching
    const routeOriginLng = (isOutForDelivery && riderPos) ? riderPos[1] : storeLng;
    const routeOriginLat = (isOutForDelivery && riderPos) ? riderPos[0] : storeLat;

    // Fetch real road route from OSRM
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${routeOriginLng},${routeOriginLat};${custLng},${custLat}?overview=full&geometries=geojson`;
    fetch(osrmUrl)
      .then(res => res.json())
      .then(data => {
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const distKm = (route.distance / 1000).toFixed(1);
          const durMins = Math.ceil(route.duration / 60);

          setRouteInfo({
            distanceKm: distKm,
            durationMins: durMins,
            loading: false
          });

          // Draw road route polyline
          const coords = route.geometry.coordinates.map(pt => [pt[1], pt[0]]);
          
          // Polyline background shadow
          L.polyline(coords, {
            color: '#047857',
            weight: 6,
            opacity: 0.25,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(map);

          // Polyline main stroke
          const polyline = L.polyline(coords, {
            color: '#10B981',
            weight: 4,
            opacity: 0.95,
            dashArray: isOutForDelivery ? '8, 8' : undefined,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(map);

          polylineRef.current = polyline;

          // Fit active trip markers with comfortable padding
          const boundsPoints = isOutForDelivery && riderPos
            ? [riderPos, [custLat, custLng]]
            : [[storeLat, storeLng], [custLat, custLng]];
          const bounds = L.latLngBounds(boundsPoints);
          map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
        } else {
          // Fallback straight line
          const startPt = (isOutForDelivery && riderPos) ? riderPos : [storeLat, storeLng];
          const straightLine = L.polyline([startPt, [custLat, custLng]], {
            color: '#10B981',
            weight: 3,
            dashArray: '5, 8'
          }).addTo(map);
          polylineRef.current = straightLine;
          map.fitBounds(straightLine.getBounds(), { padding: [40, 40] });
          setRouteInfo({ distanceKm: null, durationMins: null, loading: false });
        }
      })
      .catch(() => {
        // Fallback straight line
        const straightLine = L.polyline([[storeLat, storeLng], [custLat, custLng]], {
          color: '#10B981',
          weight: 3,
          dashArray: '5, 8'
        }).addTo(map);
        map.fitBounds(straightLine.getBounds(), { padding: [40, 40] });
        setRouteInfo({ distanceKm: null, durationMins: null, loading: false });
      });

    mapInstanceRef.current = map;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [hasCustomerCoords, storeLat, storeLng, custLat, custLng, order?.status]);

  if (!hasCustomerCoords) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
        <MapPin size={28} className="text-slate-400 mb-2" />
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Live Delivery Route</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-0.5">
          Delivery address: {order?.delivery_address || 'Address registered'}. Exact GPS pin wasn't captured for this address.
        </p>
      </div>
    );
  }

  const isOutForDelivery = order?.status === 'OUT_FOR_DELIVERY';

  return (
    <div className={`relative shadow-md border border-slate-200 dark:border-slate-800 ${className}`}>
      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Route Info Pill Top Left */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 px-3 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/80 dark:border-slate-700">
        <div className={`w-2.5 h-2.5 rounded-full ${isOutForDelivery ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`} />
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
          {isOutForDelivery ? 'Rider On The Way' : 'Delivery Route'}
        </span>
        {routeInfo.distanceKm && (
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 pl-1 border-l border-slate-200 dark:border-slate-700">
            {routeInfo.distanceKm} km
          </span>
        )}
        {routeInfo.durationMins && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            (~{routeInfo.durationMins}m)
          </span>
        )}
      </div>

      {/* 1-Tap Navigation Link Bottom Left */}
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${custLat},${custLng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 left-3 z-[1000] flex items-center gap-1.5 px-3 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-700 dark:text-slate-200 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 text-xs font-bold hover:text-emerald-600 transition"
      >
        <Compass size={13} className="text-emerald-600" />
        Open in Maps
      </a>
    </div>
  );
}
