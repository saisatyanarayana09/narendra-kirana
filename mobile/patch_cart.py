import re

with open('src/screens/cart/CartScreen.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to replace the ScrollView with a FlatList.
# Currently:
# <ScrollView
#   showsVerticalScrollIndicator={false}
#   contentContainerStyle={[
#     styles.scrollContent,
#     { paddingBottom: items.length > 0 ? 100 : 24 },
#   ]}
# >
#   ...header content...
#   <View style={styles.section}>
#     {items.map((item, index) => { ... })}
#   </View>
#   ...footer content...
# </ScrollView>

# Find the start of the ScrollView
scrollview_start = content.find('<ScrollView')
scrollview_end = content.find('</ScrollView>') + len('</ScrollView>')

if scrollview_start == -1 or scrollview_end == -1:
    print("Could not find ScrollView in CartScreen.tsx")
    exit(1)

scrollview_block = content[scrollview_start:scrollview_end]

# Extract items.map block
items_map_start = scrollview_block.find('<View style={styles.section}>\n          {items.map((item, index) => {')
if items_map_start == -1:
    print("Could not find items.map in CartScreen")
    exit(1)

items_map_end = scrollview_block.find('</View>', items_map_start) + len('</View>')

header_content = scrollview_block[scrollview_block.find('>') + 1:items_map_start].strip()
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
        renderItem={{({{ item, index }}) => (
          <AnimatedFadeIn
            key={{String(item.product?.id ?? item.product ?? item.id)}}
            index={{index}}
            direction="right"
            distance={{16}}
            duration={{250}}
          >
            <CartItemCard
              item={{item}}
              onUpdateQuantity={{handleUpdateQuantity}}
              onRemove={{handleRemoveItem}}
            />
          </AnimatedFadeIn>
        )}}
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

with open('src/screens/cart/CartScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
