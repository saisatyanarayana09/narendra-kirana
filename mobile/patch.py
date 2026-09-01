import sys

with open('src/screens/products/ProductDetailScreen.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'const handleFavorite = () => {\\n    Alert.alert(\\'Favorites\\', \\'Added to your favorites!\\');\\n  };',
    '''const handleFavorite = async () => {
    if (!user) { Alert.alert('Login Required', 'Please login'); return; }
    if (toggling) return;
    setToggling(true);
    try {
      if (isFavorite && favoriteId) {
        await apiClient.delete(/favorites//);
        setIsFavorite(false);
        setFavoriteId(null);
      } else {
        const res = await apiClient.post('/favorites/', { product: productId });
        setIsFavorite(true);
        setFavoriteId(res.data.id);
      }
    } catch (e) { Alert.alert('Error', 'Could not update favorites'); }
    finally { setToggling(false); }
  };'''
)

content = content.replace(
    'useEffect(() => {\\n    fetchProduct();\\n  }, [productId]);',
    '''useEffect(() => {
    fetchProduct();
    if (user) checkFavorite();
  }, [productId, user]);

  const checkFavorite = async () => {
    try {
      const res = await apiClient.get('/favorites/');
      const fav = res.data.find((f: any) => f.product === productId);
      if (fav) {
        setIsFavorite(true);
        setFavoriteId(fav.id);
      }
    } catch (error) {}
  };'''
)

content = content.replace(
    '<Feather name="heart" color={theme.colors.text} size={22} />',
    '<Feather name="heart" color={isFavorite ? theme.colors.action : theme.colors.text} fill={isFavorite ? theme.colors.action : "transparent"} size={22} />'
)

with open('src/screens/products/ProductDetailScreen.tsx', 'w') as f:
    f.write(content)
