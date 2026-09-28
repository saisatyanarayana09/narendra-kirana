import re

file_path = r's:\smart-kirana\mobile\src\context\CartContext.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target_update = '''        // Resolve Ghost ID to Real ID (poll if addToCart POST is still in-flight)
        if (targetId < 0) {
          const pId = ghostItemProductId || productId;'''

replacement_update = '''        const pId = ghostItemProductId || productId;
        // Wait for any pending addToCart for this product to finish
        if (addToCartLocks.current[pId]) {
          try { await addToCartLocks.current[pId]; } catch(e) {}
        }

        // Resolve Ghost ID to Real ID (poll if addToCart POST is still in-flight)
        if (targetId < 0) {'''

target_remove = '''          // Ghost item: resolve to real ID from backend
          if (targetId < 0 && ghostItemProductId) {
            const freshCartRes = await apiClient.get("/cart/");'''

replacement_remove = '''          const pId = ghostItemProductId || productId;
          if (addToCartLocks.current[pId]) {
            try { await addToCartLocks.current[pId]; } catch(e) {}
          }

          // Ghost item: resolve to real ID from backend
          if (targetId < 0 && ghostItemProductId) {
            const freshCartRes = await apiClient.get("/cart/");'''


if target_update in content and target_remove in content:
    content = content.replace(target_update, replacement_update)
    content = content.replace(target_remove, replacement_remove)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Patched CartContext successfully!')
else:
    print('Targets not found!')
    if target_update not in content: print('Target update not found')
    if target_remove not in content: print('Target remove not found')
