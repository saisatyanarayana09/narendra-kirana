const fs = require('fs');
let code = fs.readFileSync('src/screens/cart/CheckoutScreen.tsx', 'utf8');

// 1. Rename 'Note for the store' to 'Custom delivery instructions'
code = code.replace(
  />Note for the store \(optional\)<\/Text>/g,
  '>Custom delivery instructions (optional)</Text>'
);
code = code.replace(
  /placeholder="E\.g\., Please pack fragile items carefully\.\.\."/g,
  'placeholder="E.g., Leave at the door, call upon arrival..."'
);

// 2. Remove the JSX block for Pickup time and Time slots safely
const pStart = code.indexOf(") : (!storeSettings?.enable_time_slots && orderType === 'PICKUP' ? (");
const pEnd = code.indexOf('{/* Customer Instructions Note */}');

if (pStart > -1 && pEnd > pStart) {
  code = code.substring(0, pStart) + ') : null}\n\n          {/* Customer Instructions Note */}' + code.substring(pEnd + 34);
}

// 3. Remove Time Slot Validation correctly (using string replace for the specific block)
const validationBlock = `    if (storeSettings?.enable_time_slots) {
      if (slotDay === 'TODAY' && availableSlotsToday.length === 0) {
        Alert.alert('No Slots Available Today', 'All delivery slots for today have closed. Please select Tomorrow to schedule your order.');
        return;
      }
      if (!selectedSlotLabel) {
        Alert.alert('Select Time Slot', 'Please select a delivery or pickup time slot.');
        return;
      }
      if (slotDay === 'TODAY') {
        const matched = parsedSlotsList.find((s) => s.label === selectedSlotLabel);
        if (matched && isSlotPassedToday(matched)) {
          Alert.alert('Selected Slot Closed', 'The delivery slot you selected for today has closed. Please choose another available slot or select Tomorrow.');
          return;
        }
      }
    }`;

code = code.replace(validationBlock, '');

fs.writeFileSync('src/screens/cart/CheckoutScreen.tsx', code);
console.log('Modifications complete');
