import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  TouchableOpacity, 
  Dimensions, 
  FlatList, 
  Alert, 
  Platform, 
  Animated, 
  Easing, 
  Modal, 
  Linking as RNLinking 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { theme } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { ProductCard } from '../../components/ProductCard';
import { CategoryCard } from '../../components/CategoryCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { BannerSkeleton, ProductCardSkeleton, SkeletonItem } from '../../components/SkeletonLoader';
import { fixImageUrl } from '../../utils/image';

type Props = {
  navigation: AppNavigationProp;
};

const { width } = Dimensions.get('window');
const BANNER_HEIGHT = Math.min(180, Math.round((width * 7) / 16)); // aspect-[16/7] max-h-[180px] matching web

const stripEmojis = (str: string) => {
  if (!str) return '';
  return str.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, '').trim();
};

interface BannerCarouselSectionProps {
  banners: any[];
  onBannerPress: () => void;
}

const BannerCarouselSection = React.memo(function BannerCarouselSection({ banners, onBannerPress }: BannerCarouselSectionProps) {
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const bannerRef = useRef<FlatList>(null);
  const carouselTimerRef = useRef<any>(null);

  const startCarouselTimer = useCallback(() => {
    if (carouselTimerRef.current) {
      clearInterval(carouselTimerRef.current);
    }
    if (banners.length <= 1) return;
    carouselTimerRef.current = setInterval(() => {
      setActiveBannerIndex((prev) => {
        const nextIndex = (prev + 1) % banners.length;
        bannerRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, 4000);
  }, [banners.length]);

  useEffect(() => {
    startCarouselTimer();
    return () => {
      if (carouselTimerRef.current) {
        clearInterval(carouselTimerRef.current);
      }
    };
  }, [startCarouselTimer]);

  if (banners.length === 0) return null;

  return (
    <View style={styles.carouselWrapper}>
      <FlatList
        ref={bannerRef}
        data={banners}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={width}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        contentContainerStyle={styles.bannersList}
        keyExtractor={(item: any, index) => String(item?.id ?? index)}
        onScrollBeginDrag={() => clearInterval(carouselTimerRef.current)}
        onScrollEndDrag={() => startCarouselTimer()}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => bannerRef.current?.scrollToIndex({ index: info.index, animated: false }), 200);
        }}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveBannerIndex(index);
        }}
        renderItem={({ item }) => (
          <TouchableOpacity 
            activeOpacity={0.95}
            style={styles.bannerSlide}
            onPress={onBannerPress}
          >
            <Image 
              source={{ uri: fixImageUrl(item.image) || '' }} 
              style={styles.bannerImage} 
              contentFit="cover"
              recyclingKey={fixImageUrl(item.image) || String(item?.id)}
              cachePolicy="memory-disk"
            />
          </TouchableOpacity>
        )}
      />

      {/* Carousel Dots matching web app */}
      {banners.length > 1 && (
        <View style={styles.dotsContainer}>
          {banners.map((_, idx) => (
            <View 
              key={idx} 
              style={[
                styles.dot, 
                activeBannerIndex === idx && styles.activeDot
              ]} 
            />
          ))}
        </View>
      )}
    </View>
  );
});

interface AnnouncementMarqueeBarProps {
  text: string;
  bgColor: string;
  textColor: string;
}

const AnnouncementMarqueeBar = React.memo(function AnnouncementMarqueeBar({
  text,
  bgColor,
  textColor,
}: AnnouncementMarqueeBarProps) {
  const animatedX = useRef(new Animated.Value(0)).current;
  const [textWidth, setTextWidth] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (textWidth > 0 && !isPaused) {
      animatedX.setValue(screenWidth);
      const distance = textWidth + screenWidth;
      const speed = 45; // pixels per second
      const duration = (distance / speed) * 1000;

      animRef.current = Animated.loop(
        Animated.timing(animatedX, {
          toValue: -textWidth,
          duration,
          easing: Easing.linear,
          useNativeDriver: Platform.OS !== 'web',
        })
      );
      animRef.current.start();

      return () => {
        if (animRef.current) animRef.current.stop();
      };
    }
  }, [textWidth, screenWidth, animatedX, isPaused]);

  return (
    <TouchableOpacity 
      activeOpacity={0.95}
      onPressIn={() => {
        if (animRef.current) animRef.current.stop();
        setIsPaused(true);
      }}
      onPressOut={() => setIsPaused(false)}
      style={[styles.marqueeBar, { backgroundColor: bgColor }]}
    >
      <View style={styles.marqueeIconWrap}>
        <Feather name="volume-2" size={14} color={textColor} />
      </View>
      <View style={styles.marqueeContent}>
        <Animated.View
          style={{
            transform: [{ translateX: animatedX }],
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Text
            onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
            style={[styles.marqueeText, { color: textColor }]}
            numberOfLines={1}
          >
            {text}
          </Text>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
});

export function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [festiveModalVisible, setFestiveModalVisible] = useState(false);

  useEffect(() => {
    if (settings?.enable_festive_popup) {
      AsyncStorage.getItem('festive_popup_seen').then((seen) => {
        if (!seen) {
          setFestiveModalVisible(true);
        }
      });
    }
  }, [settings?.enable_festive_popup]);

  const handleDismissFestive = async () => {
    setFestiveModalVisible(false);
    try {
      await AsyncStorage.setItem('festive_popup_seen', 'true');
    } catch {}
  };

  const nowTime = Date.now();
  const startDateValid = !settings?.announcement_start_date || new Date(settings.announcement_start_date).getTime() <= nowTime;
  const endDateValid = !settings?.announcement_end_date || new Date(settings.announcement_end_date).getTime() >= nowTime;
  const showAnnouncement = Boolean(settings?.enable_announcement_bar) && startDateValid && endDateValid && Boolean(settings?.announcement_text);
  const announcementText = settings?.announcement_text || '';

  const handleWhatsAppSupport = async () => {
    const rawNum = settings?.whatsapp_number || settings?.store_phone || '';
    const cleanNumber = rawNum.replace(/[^0-9]/g, '');
    const formattedNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
    const msg = settings?.whatsapp_default_message || 'Hi Narendra Kirana, I need help with my grocery order.';

    const waUrl = `whatsapp://send?phone=${formattedNumber}&text=${encodeURIComponent(msg)}`;
    const webWaUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(msg)}`;

    try {
      const canOpen = await RNLinking.canOpenURL(waUrl);
      if (canOpen) {
        await RNLinking.openURL(waUrl);
      } else {
        await RNLinking.openURL(webWaUrl);
      }
    } catch {
      await RNLinking.openURL(webWaUrl).catch(() => {
        Alert.alert('WhatsApp Not Available', `Please contact store support directly at ${rawNum}`);
      });
    }
  };

  // Favorites state
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [favoriteMap, setFavoriteMap] = useState<Record<number, number>>({});

  const fetchFavorites = async () => {
    if (!user) {
      return;
    }
    try {
      const res = await apiClient.get('/favorites/').catch(() => ({ data: [] }));
      const items = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      const ids = new Set<number>();
      const map: Record<number, number> = {};
      items.forEach((item: any) => {
        const pId = item.product?.id ?? item.product ?? item.product_details?.id;
        if (pId) {
          const numId = Number(pId);
          ids.add(numId);
          map[numId] = item.id;
        }
      });
      setFavoriteIds(ids);
      setFavoriteMap(map);
    } catch (error) {
      console.log('Error fetching favorites:', error);
    }
  };

  const toggleFavorite = async (param: any) => {
    const productId = typeof param === 'object' && param !== null ? param.id : Number(param);
    if (!productId) return;

    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to save your favorite products.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }

    const isFav = favoriteIds.has(productId);
    const favId = favoriteMap[productId];

    // Optimistic UI update
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(productId);
      else next.add(productId);
      return next;
    });

    try {
      if (isFav) {
        if (favId) {
          await apiClient.delete(`/favorites/${favId}/`).catch(() => 
            apiClient.post('/favorites/toggle/', { product: productId })
          );
        } else {
          await apiClient.post('/favorites/toggle/', { product: productId });
        }
        setFavoriteMap(prev => {
          const next = { ...prev };
          delete next[productId];
          return next;
        });
      } else {
        const res = await apiClient.post('/favorites/', { product: productId });
        const newId = res.data?.id || res.data?.favorite?.id;
        if (newId) {
          setFavoriteMap(prev => ({ ...prev, [productId]: newId }));
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert on failure
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (isFav) next.add(productId);
        else next.delete(productId);
        return next;
      });
    }
  };

  const fetchHomeData = async () => {
    try {
      const [catsRes, bannersRes, sectionsRes, settingsRes] = await Promise.all([
        apiClient.get('/categories/').catch(() => ({ data: [] })),
        apiClient.get('/offers/banners/').catch(() => ({ data: [] })),
        apiClient.get('/store/homepage-sections/').catch(() => ({ data: [] })),
        apiClient.get('/store/settings/').catch(() => ({ data: {} })),
      ]);
      
      setCategories(Array.isArray(catsRes.data) ? catsRes.data : (catsRes.data?.results || []));
      setBanners(Array.isArray(bannersRes.data) ? bannersRes.data : (bannersRes.data?.results || []));
      
      const rawSections = Array.isArray(sectionsRes.data) ? sectionsRes.data : (sectionsRes.data?.results || []);
      const mappedSections = rawSections
        .map((sec: any) => ({
          ...sec,
          items: (sec.section_products || [])
            .sort((a: any, b: any) => a.position - b.position)
            .map((sp: any) => sp.product_details)
            .filter(Boolean)
        }))
        .filter((s: any) => s.is_active !== false)
        .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));

      setSections(mappedSections);
      setSettings(settingsRes.data || {});
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
    fetchFavorites();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchFavorites();
    });
    return unsubscribe;
  }, [user, navigation]);

  const handleProductPress = useCallback((p: any) => {
    navigation.navigate('ProductDetailScreen', { productId: p.id });
  }, [navigation]);

  const handleAddToCart = useCallback((p: any) => {
    addToCart(p.id, 1);
  }, [addToCart]);

  const handleToggleFavorite = useCallback((p: any) => {
    toggleFavorite(p?.id ?? p);
  }, [toggleFavorite]);

  const handleCategoryPress = useCallback((c: any) => {
    navigation.navigate('CategoriesTab', { 
      screen: 'ProductListScreen', 
      params: { categoryId: c.id, categoryName: c.name } 
    });
  }, [navigation]);

  const handleBannerPress = useCallback(() => {
    navigation.navigate('CategoriesTab', { screen: 'ProductListScreen', params: {} });
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHomeData();
    fetchFavorites();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {/* Top Header */}
        <View style={[styles.headerRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.brandContainer}>
            <Text style={styles.brandTitle}>
              <Text style={[styles.brandSlate, { color: colors.text }]}>Narendra </Text>
              <Text style={styles.brandRed}>Kirana</Text>
            </Text>
          </View>
          <View style={[styles.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Feather name="search" size={16} color={colors.textSecondary} />
            <Text style={[styles.searchPlaceholder, { color: colors.textSecondary }]}>Search products...</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <BannerSkeleton />
          
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <SkeletonItem width={120} height={18} borderRadius={6} style={{ marginBottom: 12 }} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <SkeletonItem width={72} height={72} borderRadius={16} />
              <SkeletonItem width={72} height={72} borderRadius={16} />
              <SkeletonItem width={72} height={72} borderRadius={16} />
              <SkeletonItem width={72} height={72} borderRadius={16} />
            </View>
          </View>

          <View style={{ marginBottom: 16 }}>
            <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
              <SkeletonItem width={140} height={18} borderRadius={6} />
            </View>
            <View style={styles.horizontalProductsList}>
              <View style={styles.horizontalProductItem}><ProductCardSkeleton /></View>
              <View style={styles.horizontalProductItem}><ProductCardSkeleton /></View>
              <View style={styles.horizontalProductItem}><ProductCardSkeleton /></View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header matching Web App 1:1 in a single row */}
      <View style={[styles.headerRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>
            <Text style={[styles.brandSlate, { color: colors.text }]}>Narendra </Text>
            <Text style={styles.brandRed}>Kirana</Text>
          </Text>
        </View>

        {/* Inline Search Bar matching Web App */}
        <TouchableOpacity 
          style={[styles.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('SearchScreen')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Feather name="search" size={16} color={colors.textSecondary} />
            <Text style={[styles.searchPlaceholder, { color: colors.textSecondary }]} numberOfLines={1}>{t('searchPlaceholder')}</Text>
          </View>
          <View style={{ padding: 4 }}>
            <Feather name="mic" size={15} color={colors.primary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Top Announcement Marquee Bar */}
      {showAnnouncement && (
        <AnnouncementMarqueeBar
          text={announcementText}
          bgColor={settings?.announcement_bg_color || '#EF4444'}
          textColor={settings?.announcement_text_color || '#FFFFFF'}
        />
      )}

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={['#059669']} 
          />
        }
      >
        {/* Banner Carousel or Web Fallback Hero Banner */}
        {banners.length > 0 ? (
          <BannerCarouselSection banners={banners} onBannerPress={handleBannerPress} />
        ) : (
          <View style={styles.fallbackHeroBanner}>
            {/* Decorative shapes and floating emojis matching web */}
            <View style={styles.heroDecorTopCircle} />
            <View style={styles.heroDecorBottomCircle} />
            <Text style={styles.heroFloatingEmojiCart}>🛒</Text>
            <Text style={styles.heroFloatingEmojiVeg}>🥬</Text>
            
            <View style={styles.heroInnerContent}>
              <View style={styles.heroTagPill}>
                <Feather name="star" size={11} color="#FDE047" />
                <Text style={styles.heroTagText}>
                  {settings?.store_name || 'NARENDRA KIRANA STORE'}
                </Text>
              </View>

              <Text style={styles.heroHeadline}>
                Everyday essentials, <Text style={styles.heroHeadlineYellow}>ready when you are.</Text>
              </Text>

              <Text style={styles.heroSubheadline} numberOfLines={2}>
                Order online and collect from your local store. Quality products and reliable service.
              </Text>

              <TouchableOpacity 
                style={[styles.exploreCatalogBtn, isDark && { backgroundColor: colors.surface }]}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('CategoriesTab', { screen: 'CategoriesScreen' })}
              >
                <Text style={[styles.exploreCatalogText, isDark && { color: colors.text }]}>{t('exploreCatalog')}</Text>
                <Feather name="chevron-right" size={16} color={isDark ? colors.text : "#0F172A"} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Categories / Shop by category Section */}
        {categories.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('shopByCategory')}</Text>
              <TouchableOpacity 
                style={styles.seeAllBtn}
                onPress={() => navigation.navigate('CategoriesTab')}
              >
                <Text style={[styles.seeAllText, { color: colors.textSecondary }]}>{t('seeAll')}</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              horizontal
              data={categories}
              keyExtractor={(cat) => String(cat.id)}
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.categoriesScrollList}
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              windowSize={3}
              renderItem={({ item, index }) => (
                <CategoryCard 
                  category={item} 
                  index={index}
                  style={styles.categoryCardHorizontal}
                  onPress={handleCategoryPress} 
                />
              )}
            />
          </View>
        )}

        {/* Dynamic Homepage Product Sections (Horizontal Scrolling Carousel - Scroll Left / Right) */}
        {sections.map((section: any, secIdx: number) => {
          const sectionProducts = (section.items || []).filter((item: any) => item && item.is_in_stock !== false);
          if (sectionProducts.length === 0) return null;

          return (
            <View key={section.id || secIdx} style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleGroup}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{stripEmojis(section.title)}</Text>
                  <View style={[styles.countBadge, { backgroundColor: colors.inputBg }]}>
                    <Text style={[styles.countBadgeText, { color: colors.textSecondary }]}>{sectionProducts.length}</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.seeAllBtn}
                  onPress={() => {
                    const cleanTitle = stripEmojis(section.title);
                    const categoryId = section.category_id || section.category;
                    if (categoryId) {
                      navigation.navigate('CategoriesTab', { 
                        screen: 'ProductListScreen', 
                        params: { categoryId, categoryName: cleanTitle } 
                      });
                    } else {
                      navigation.navigate('CategoriesTab', { 
                        screen: 'ProductListScreen', 
                        params: { search: cleanTitle, categoryName: cleanTitle } 
                      });
                    }
                  }}
                >
                  <Text style={[styles.seeAllText, { color: colors.textSecondary }]}>{t('seeAll')}</Text>
                </TouchableOpacity>
              </View>

              {/* Horizontal Scrollable Product Carousel (Virtual FlatList) */}
              <FlatList
                horizontal
                data={sectionProducts}
                keyExtractor={(product) => String(product.id)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalProductsList}
                initialNumToRender={3}
                maxToRenderPerBatch={3}
                windowSize={3}
                removeClippedSubviews={Platform.OS === 'android'}
                getItemLayout={(_, index) => ({
                  length: 160 + 12,
                  offset: 16 + (160 + 12) * index,
                  index,
                })}
                renderItem={({ item }) => (
                  <View style={styles.horizontalProductItem}>
                    <ProductCard 
                      product={item} 
                      onPress={handleProductPress}
                      onAddToCart={handleAddToCart}
                      isFavorite={favoriteIds.has(item.id)}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  </View>
                )}
              />
            </View>
          );
        })}

      </ScrollView>

      {/* Floating WhatsApp Support Action Button */}
      {Boolean(settings?.enable_whatsapp_support) && (
        <TouchableOpacity
          style={styles.floatingWhatsAppBtn}
          onPress={handleWhatsAppSupport}
          activeOpacity={0.85}
        >
          <Ionicons name="logo-whatsapp" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Festive Popup Modal */}
      {festiveModalVisible && (
        <Modal
          visible={festiveModalVisible}
          transparent
          animationType="fade"
          onRequestClose={handleDismissFestive}
        >
          <View style={styles.festiveModalOverlay}>
            <View style={[styles.festiveCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {/* Close Button */}
              <TouchableOpacity 
                style={[styles.festiveCloseBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#F1F5F9' }]}
                onPress={handleDismissFestive}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={18} color={colors.text} />
              </TouchableOpacity>

              {/* Optional Festive Banner Image */}
              {settings?.festive_popup_image ? (
                <Image
                  source={{ uri: fixImageUrl(settings.festive_popup_image) }}
                  style={styles.festiveBannerImage}
                  contentFit="cover"
                />
              ) : null}

              <View style={styles.festiveBody}>
                <View style={styles.festiveIconWrap}>
                  <Text style={{ fontSize: 32 }}>🪔</Text>
                </View>
                <Text style={[styles.festiveTitle, { color: colors.text }]}>
                  {settings?.festive_popup_title || 'Special Festive Offer!'}
                </Text>
                <Text style={[styles.festiveContent, { color: colors.textSecondary }]}>
                  {settings?.festive_popup_content || 'Enjoy special savings and festive discounts on your grocery orders today!'}
                </Text>
                <TouchableOpacity
                  style={[styles.festiveActionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    handleDismissFestive();
                    navigation.navigate('CategoriesTab', { screen: 'ProductListScreen', params: {} });
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.festiveActionBtnText}>Explore Offers Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // slate-50 matching web
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandSlate: {
    color: '#0F172A', // slate-900
  },
  brandRed: {
    color: '#DC2626', // red-600
  },
  searchBar: {
    flex: 1,
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  searchPlaceholder: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  carouselWrapper: {
    width: width,
    height: BANNER_HEIGHT,
    backgroundColor: '#F1F5F9', // bg-slate-100 matching web
    position: 'relative',
    marginBottom: 6,
    overflow: 'hidden',
  },
  bannersList: {},
  bannerSlide: {
    width: width,
    height: BANNER_HEIGHT,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  dot: {
    width: 7,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  activeDot: {
    width: 28, // active wide pill w-8 matching web
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 3,
  },
  fallbackHeroBanner: {
    width: width,
    backgroundColor: '#065F46', // emerald-800 matching web
    paddingVertical: 22,
    paddingHorizontal: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 6,
  },
  heroInnerContent: {
    position: 'relative',
    zIndex: 10,
  },
  heroFloatingEmojiCart: {
    position: 'absolute',
    top: 10,
    right: 32,
    fontSize: 26,
    opacity: 0.22,
  },
  heroFloatingEmojiVeg: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    fontSize: 24,
    opacity: 0.22,
  },
  heroDecorTopCircle: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroDecorBottomCircle: {
    position: 'absolute',
    bottom: -30,
    right: 40,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  heroTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  heroTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  heroHeadline: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 28,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroHeadlineYellow: {
    color: '#FDE047', // yellow-300 matching web
  },
  heroSubheadline: {
    fontSize: 12,
    color: '#D1FAE5', // emerald-100 matching web
    lineHeight: 18,
    marginBottom: 16,
  },
  exploreCatalogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exploreCatalogText: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 13,
  },
  sectionContainer: {
    marginTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  categoriesScrollList: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  horizontalProductsList: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 8,
  },
  horizontalProductItem: {
    width: 160, // Exact w-[160px] matching web customer.jsx carousel items
  },
  countBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryCardHorizontal: {},
  marqueeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  marqueeIconWrap: {
    marginRight: 8,
    zIndex: 2,
  },
  marqueeContent: {
    flex: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  marqueeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  floatingWhatsAppBtn: {
    position: 'absolute',
    bottom: 24,
    right: 18,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 999,
  },
  festiveModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  festiveCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
  },
  festiveCloseBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  festiveBannerImage: {
    width: '100%',
    height: 150,
  },
  festiveBody: {
    padding: 24,
    alignItems: 'center',
  },
  festiveIconWrap: {
    marginBottom: 12,
  },
  festiveTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  festiveContent: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
  },
  festiveActionBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  festiveActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
