const fs = require('fs');

let content = fs.readFileSync('src/components/OrderTrackingMap.tsx', 'utf8');

// 1. Remove map controls
content = content.replace(/<!-- Floating Interactive Control Buttons -->[\s\S]*?<\/div>/, '');

// 2. Remove map controls CSS
content = content.replace(/\/\* Controls Container \*\/[\s\S]*?\.ctrl-btn:active\s*\{[\s\S]*?\}/, '');

// 3. Remove scrollEnabled={false} from WebViews to enable gestures (2 occurrences)
content = content.replace(/scrollEnabled=\{false\}/g, '');

// 4. Update ETA pill text & style (remove "Store Pickup Location")
content = content.replace(
  /<span class="eta-dot" style="background: \$\{isPickup \? '#064E3B' : \(hasRiderPosition \? '#4F46E5' : '#10B981'\)\};"><\/span>/,
  '<span class="eta-dot" style="background: ${hasRiderPosition ? \'#4F46E5\' : \'#10B981\'};"></span>'
);

content = content.replace(
  /<span id="eta-text">\$\{[\s\S]*?\}<\/span>/,
  `<span id="eta-text">\${\n              hasRiderPosition\n                ? 'Connecting live rider route...'\n                : (order?.status === 'OUT_FOR_DELIVERY'\n                    ? '🚚 Rider En Route 📡 Connecting GPS...'\n                    : (order?.status === 'READY'\n                        ? '📦 Order Packed 🚀 Ready for Dispatch'\n                        : '📍 Delivery Route Assigned'))\n            }</span>`
);

// 5. Remove storeMarker from the HTML javascript
content = content.replace(/\$\{isPickup \? `[\s\S]*?` : `/g, '`'); // removes the pickup branch completely, leaving only the delivery branch
content = content.replace(/\$\{showStorePin \? `[\s\S]*?` : ''\}/g, ''); // removes showStorePin logic
content = content.replace(/var storeMarker = null;\n/, '');

// 6. Ensure Leaflet lets pinch-to-zoom work by changing the viewport meta tag
content = content.replace(/user-scalable=no/, 'user-scalable=yes');

fs.writeFileSync('src/components/OrderTrackingMap.tsx', content);
console.log('Fixed OrderTrackingMap.tsx');
