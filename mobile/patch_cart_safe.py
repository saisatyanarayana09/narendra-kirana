import re

with open('src/screens/cart/CartScreen.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to replace the ScrollView with a FlatList.
scrollview_start = content.find('<ScrollView\n        showsVerticalScrollIndicator={false}')
scrollview_end = content.find('</ScrollView>') + len('</ScrollView>')

scrollview_block = content[scrollview_start:scrollview_end]

items_map_start = scrollview_block.find('<View style={styles.section}>\n          {items.map((item, index) => {')
items_map_end = scrollview_block.find('</View>', items_map_start) + len('</View>')

# The header content starts after `      >\n`
header_start_index = scrollview_block.find('      >\n') + len('      >\n')
header_content = scrollview_block[header_start_index:items_map_start].strip()

footer_content = scrollview_block[items_map_end:scrollview_block.rfind('</ScrollView>')].strip()

# Create FlatList
flatlist_code = f'''
      <FlatList
        data={{items}}
        keyExtractor={{(item) => String(item.product?.id ?? item.product ?? item.id)}}
        showsVerticalScrollIndicator={{false}}
        contentContainerStyle={{[styles.scrollContent, {{ paddingBottom: items.length > 0 ? 100 : 24 }}]}}
        initialNumToRender={{8}}
        maxToRenderPerBatch={{10}}
        windowSize={{5}}
        removeClippedSubviews={{Platform.OS === "android"}}
        ListHeaderComponent={{
          <View>
            {header_content}
          </View>
        }}
        renderItem={{renderCartItem}}
        ListFooterComponent={{
          <View>
            {footer_content}
          </View>
        }}
      />
'''

new_content = content[:scrollview_start] + flatlist_code + content[scrollview_end:]

# Replace import ScrollView with FlatList
new_content = new_content.replace('ScrollView,', 'FlatList,')

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

# Insert renderCartItem
new_content = new_content.replace('  if (!cart) {', render_item_usecallback + '\n  if (!cart) {')

with open('src/screens/cart/CartScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
