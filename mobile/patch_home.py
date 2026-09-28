import re

with open('src/screens/home/HomeScreen.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace ProductCard imports
content = content.replace('import { ProductCard } from "../../components/ProductCard";', 'import { ConnectedProductCard } from "../../components/ConnectedProductCard";')

# Remove cart from useCart in HomeScreen
content = content.replace('const { cart, addToCart, cartQuantityMap } = useCart();', 'const { } = useCart();')

# Remove favorites state
content = re.sub(r'const \[favoriteIds, setFavoriteIds\].*?favoritesService\.getFavoriteMap\(\),\n\s*\);', '', content, flags=re.DOTALL)
content = re.sub(r'const fetchFavorites = useCallback\(\s*async.*?\[user\],\n\s*\);', '', content, flags=re.DOTALL)
content = re.sub(r'const toggleFavorite = useCallback\(\s*async.*?\[user, navigation\],\n\s*\);', '', content, flags=re.DOTALL)

# In useEffect for user, remove favorites fetching
content = re.sub(r'if \(user\) {\n\s*fetchFavorites\(\);\n\s*const unsubscribe = favoritesService\.subscribe\(\(\) => {\n.*?return unsubscribe;\n\s*}\s*else\s*{\n\s*setFavoriteIds\(new Set\(\)\);\n\s*setFavoriteMap\(\{\}\);\n\s*}', '', content, flags=re.DOTALL)

content = content.replace('fetchFavorites(true);', '')

# Replace renderProductItem logic
content = re.sub(r'const renderProductItem = useCallback\(\s*\(\{\s*item\s*\}\s*:\s*\{\s*item:\s*any\s*\}\)\s*=>\s*\(\s*<View style=\{styles\.horizontalProductItem\}>\s*<ProductCard\s*product=\{item\}\s*onPress=\{handleProductPress\}\s*onAddToCart=\{handleAddToCart\}\s*cartQty=\{cartQuantityMap\[item\.id\] \|\| 0\}\s*isFavorite=\{favoriteIds\.has\(item\.id\)\}\s*onToggleFavorite=\{handleToggleFavorite\}\s*/>\s*</View>\s*\),\s*\[\s*handleProductPress,\s*handleAddToCart,\s*cartQuantityMap,\s*favoriteIds,\s*handleToggleFavorite,\s*\],\s*\);',
r'''const renderProductItem = useCallback(
    ({ item }: { item: any }) => (
      <View style={styles.horizontalProductItem}>
        <ConnectedProductCard product={item} />
      </View>
    ),
    [],
  );''', content, flags=re.DOTALL)

# Also remove unused handleProductPress, handleAddToCart, handleToggleFavorite
content = re.sub(r'const handleProductPress = useCallback\(.*?\[navigation\],\n\s*\);', '', content, flags=re.DOTALL)
content = re.sub(r'const handleAddToCart = useCallback\(.*?\[addToCart\],\n\s*\);', '', content, flags=re.DOTALL)
content = re.sub(r'const handleToggleFavorite = useCallback\(.*?\[toggleFavorite\],\n\s*\);', '', content, flags=re.DOTALL)

with open('src/screens/home/HomeScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
