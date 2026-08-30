import os
import re

filepath = 'frontend/src/owner/pages/OrderDetails.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add updating state
old_state = "const [packedItems, setPackedItems] = useState({});"
new_state = "const [packedItems, setPackedItems] = useState({});\n  const [isUpdating, setIsUpdating] = useState(false);"
content = content.replace(old_state, new_state)

# Update the updateStatus function
old_update = """  const updateStatus = async (newStatus) => {
   try {
   await api.patch(`/orders/${id}/status/`, { status: newStatus });
   fetchOrder(); // refresh order data
   } catch (err) {
   console.error(err);
   alert(err.response?.data?.detail || 'Failed to update order status.');
   }
   };"""

new_update = """  const updateStatus = async (newStatus) => {
   if (isUpdating) return;
   setIsUpdating(true);
   try {
     await api.patch(`/orders/${id}/status/`, { status: newStatus });
     await fetchOrder(); // refresh order data
   } catch (err) {
     console.error(err);
     alert(err.response?.data?.detail || 'Failed to update order status.');
   } finally {
     setIsUpdating(false);
   }
   };"""
content = content.replace(old_update, new_update)

# Now inject `disabled={isUpdating}` to the action buttons
content = content.replace("onClick={() => updateStatus('ACCEPTED')}", "onClick={() => updateStatus('ACCEPTED')} disabled={isUpdating}")
content = content.replace("onClick={() => updateStatus('REJECTED')}", "onClick={() => updateStatus('REJECTED')} disabled={isUpdating}")
content = content.replace("onClick={() => updateStatus('PREPARING')}", "onClick={() => updateStatus('PREPARING')} disabled={isUpdating}")
content = content.replace("onClick={() => updateStatus('READY')}", "onClick={() => updateStatus('READY')} disabled={isUpdating || !allPacked}")
content = content.replace("onClick={() => updateStatus('COMPLETED')}", "onClick={() => updateStatus('COMPLETED')} disabled={isUpdating}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
