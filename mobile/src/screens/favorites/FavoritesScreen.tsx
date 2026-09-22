import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Dimensions, Platform, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { apiClient } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { ProductCard } from '../../components/ProductCard';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { favoritesService } from '../../services/favoritesService';

const { width } = Dimensions.get('window');

export function FavoritesScreen({ navigation }: { navigation: AppNavigationProp }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<any[]>(favoritesService.getItems());
  const [loading, setLoading] = useState(!favoritesService.hasCachedData());
  const [refreshing, setRefreshing] = useState(false);
  const { addToCart, cartQuantityMap } = useCart();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const fetchFavorites = useCallback(async (force = false) => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }
    try {
      const snap = await favoritesService.getFavorites(force);
      setFavorites(snap.items);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }
    fetchFavorites();
    const unsubscribe = favoritesService.subscribe(() => {
      setFavorites(favoritesService.getItems());
    });
    return unsubscribe;
  }, [navigation, user, fetchFavorites]);

  const handleToggleFavorite = useCallback(async (product: any) => {
    const pId = product?.id ?? product;
    try {
      await favoritesService.toggleFavorite(pId);
      setFavorites(favoritesService.getItems());
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  }, []);

  const handleAddToCart = useCallback((p: any) => {
    addToCart(p.id, 1, p);
  }, [addToCart]);

  const handleProductPress = useCallback((p: any) => {
    navigation.navigate('ProductDetailScreen', { productId: p.id, initialProduct: p });
  }, [navigation]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: 296,
    offset: 296 * Math.floor(index / 2),
    index,
  }), []);

  const renderProductItem = useCallback(({ item }: { item: any }) => {
    const product = item.product_details || item.product;
    if (!product) return null;

    return (
      <View style={styles.cardWrapper}>
        <ProductCard 
          product={product} 
          cartQty={cartQuantityMap[product.id] || 0}
          isFavorite={true}
          onToggleFavorite={handleToggleFavorite}
          onPress={handleProductPress} 
          onAddToCart={handleAddToCart}
        />
      </View>
    );
  }, [cartQuantityMap, handleToggleFavorite, handleProductPress, handleAddToCart]);

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => {
              if (navigation.canGoBack()) {
                if(navigation.canGoBack()) { navigation.goBack(); } else { navigation.navigate('Main'); }
              } else {
                navigation.navigate('HomeTab');
              }
            }}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color={colors.primary} />
            <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Favorites</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Products you've saved for later.</Text>
        </View>

        <View style={styles.guestStateContainer}>
          <View style={[styles.guestIconBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' }]}>
            <Feather name="heart" size={44} color="#E11D48" />
          </View>
          <Text style={[styles.guestTitle, { color: colors.text }]}>Sign In to View Favorites</Text>
          <Text style={[styles.guestSubtitle, { color: colors.textSecondary }]}>
            Save your favorite grocery items, track price drops, and add them directly to cart.
          </Text>
          <TouchableOpacity 
            style={[styles.guestSignInBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Feather name="log-in" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.guestSignInBtnText}>Sign In / Register</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.backButton} 
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => {
              if (navigation.canGoBack()) {
                if(navigation.canGoBack()) { navigation.goBack(); } else { navigation.navigate('Main'); }
              } else {
                navigation.navigate('HomeTab');
              }
            }}
          >
            <Feather name="arrow-left" size={18} color={colors.primary} />
            <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Favorites</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (favorites.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.backButton} 
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => {
              if (navigation.canGoBack()) {
                if(navigation.canGoBack()) { navigation.goBack(); } else { navigation.navigate('Main'); }
              } else {
                navigation.navigate('HomeTab');
              }
            }}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color={colors.primary} />
            <Text style={[styles.backButtonText, { color: colors.primary }]}>{t('back')}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('favorites')}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Products you've saved for later.</Text>
        </View>

        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, isDark && { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
            <Feather name="heart" size={44} color="#E11D48" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No favorites yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Keep track of the products you love by clicking the heart icon on any product.
          </Text>
          <TouchableOpacity 
            style={styles.browseButton}
            onPress={() => navigation.navigate('HomeTab')}
            activeOpacity={0.85}
          >
            <Text style={styles.browseButtonText}>{t('exploreCatalog')}</Text>
            <Feather name="chevron-right" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header matching web */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => {
            if (navigation.canGoBack()) {
              if(navigation.canGoBack()) { navigation.goBack(); } else { navigation.navigate('Main'); }
            } else {
              navigation.navigate('HomeTab');
            }
          }}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color={colors.primary} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>{t('back')}</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('favorites')}</Text>
          <View style={[styles.itemCountBadge, isDark && { backgroundColor: colors.inputBg }]}>
            <Text style={[styles.itemCountText, { color: colors.primary }]}>{favorites.length} saved</Text>
          </View>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Products you've saved for later.</Text>
      </View>
      
      <FlatList
        data={favorites}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchFavorites(true).finally(() => setRefreshing(false));
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={50}
        getItemLayout={getItemLayout}
        renderItem={renderProductItem}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // slate-50
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  itemCountBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  itemCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFF1F2', // rose-50
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 290,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    boxShadow: '0px 2px 4px rgba(5, 150, 105, 0.15)',
    elevation: 3,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 130,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardWrapper: {
    width: (width - 44) / 2,
    height: 296,
  },
  guestStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  guestIconBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  guestSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    boxShadow: '0px 4px 8px rgba(5, 150, 105, 0.2)',
    elevation: 4,
  },
  guestSignInBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
