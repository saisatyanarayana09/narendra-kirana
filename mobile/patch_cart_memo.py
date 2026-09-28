import re

with open('src/screens/cart/CartScreen.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I need to wrap the inline renderItem inside CartScreen into a useCallback.
# The inline renderItem:
# renderItem={({ item, index }) => ( ... )}

render_item_inline = '''        renderItem={({ item, index }) => (
          <AnimatedFadeIn
            key={String(item.product?.id ?? item.product ?? item.id)}
            index={index}
            direction="right"
            distance={16}
            duration={250}
          >
            <CartItemCard
              item={item}
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={handleRemoveItem}
            />
          </AnimatedFadeIn>
        )}'''

render_item_usecallback = '''  const renderCartItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <AnimatedFadeIn
        key={String(item.product?.id ?? item.product ?? item.id)}
        index={index}
        direction="right"
        distance={16}
        duration={250}
      >
        <CartItemCard
          item={item}
          onUpdateQuantity={handleUpdateQuantity}
          onRemove={handleRemoveItem}
        />
      </AnimatedFadeIn>
    ),
    [handleUpdateQuantity, handleRemoveItem]
  );
'''

# Find a good place to insert renderCartItem (right before `if (!cart) {`)
if 'const renderCartItem =' not in content:
    content = content.replace('  if (!cart) {', render_item_usecallback + '\n  if (!cart) {')

# Now replace the inline renderItem with the reference
content = content.replace(render_item_inline, '        renderItem={renderCartItem}')

with open('src/screens/cart/CartScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
