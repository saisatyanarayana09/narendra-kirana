import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { Image } from "expo-image";
import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Linking as RNLinking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiClient } from "../../api/client";
import { storeApi } from "../../api/store";
import { AnimatedFadeIn } from "../../components/AnimatedFadeIn";
import { CategoryCard } from "../../components/CategoryCard";
import { ProductCard } from "../../components/ProductCard";
import {
  BannerSkeleton,
  ProductCardSkeleton,
  SkeletonItem,
} from "../../components/SkeletonLoader";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
import { AppNavigationProp } from "../../navigation/types";
import { favoritesService } from "../../services/favoritesService";
import {
  loadHomeData,
  saveHomeData,
  getHomeDataSync,
} from "../../services/homeDataCache";
import { triggerHaptic } from "../../utils/haptics";
import { fixImageUrl, getOptimizedImageUrl } from "../../utils/image";

type Props = {
  navigation: AppNavigationProp;
};

const { width } = Dimensions.get("window");
const BANNER_HEIGHT = Math.min(180, Math.round((width * 7) / 16)); // aspect-[16/7] max-h-[180px] matching web

const stripEmojis = (str: any) => {
  if (!str || typeof str !== "string")
    return typeof str === "number" ? String(str) : "";
  try {
    return str
      .replace(
        /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu,
        "",
      )
      .trim();
  } catch {
    return String(str || "");
  }
};

interface BannerCarouselSectionProps {
  banners: any[];
  onBannerPress: () => void;
}

const BannerCarouselSection = React.memo(function BannerCarouselSection({
  banners,
  onBannerPress,
}: BannerCarouselSectionProps) {
  const isFocused = useIsFocused();
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
    if (isFocused) {
      startCarouselTimer();
    } else {
      if (carouselTimerRef.current) {
        clearInterval(carouselTimerRef.current);
      }
    }
    return () => {
      if (carouselTimerRef.current) {
        clearInterval(carouselTimerRef.current);
      }
    };
  }, [isFocused, startCarouselTimer]);

  const getBannerItemLayout = useCallback(
    (_: any, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [],
  );

  const renderBannerItem = useCallback(
    ({ item }: { item: any }) => {
      const bannerUri =
        getOptimizedImageUrl(
          item.image,
          Math.round(width * 2),
          Math.round(BANNER_HEIGHT * 2),
        ) ||
        fixImageUrl(item.image) ||
        "";
      return (
        <TouchableOpacity
          activeOpacity={0.95}
          style={styles.bannerSlide}
          onPress={onBannerPress}
        >
          <Image
            source={{ uri: bannerUri }}
            style={styles.bannerImage}
            contentFit="cover"
            recyclingKey={bannerUri || String(item?.id)}
            cachePolicy="memory-disk"
          />
        </TouchableOpacity>
      );
    },
    [onBannerPress],
  );

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
        getItemLayout={getBannerItemLayout}
        contentContainerStyle={styles.bannersList}
        keyExtractor={(item: any, index) =>
          String(item?.id || item?.uuid || item?.uid || index)
        }
        onScrollBeginDrag={() => clearInterval(carouselTimerRef.current)}
        onScrollEndDrag={() => isFocused && startCarouselTimer()}
        onScrollToIndexFailed={(info) => {
          setTimeout(
            () =>
              bannerRef.current?.scrollToIndex({
                index: info.index,
                animated: false,
              }),
            200,
          );
        }}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveBannerIndex(index);
        }}
        initialNumToRender={6}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === "android"}
        renderItem={renderBannerItem}
      />

      {/* Carousel Dots matching web app */}
      {banners.length > 1 && (
        <View style={styles.dotsContainer}>
          {banners.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                activeBannerIndex === idx && styles.activeDot,
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
  const screenWidth = Dimensions.get("window").width;
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
          useNativeDriver: Platform.OS !== "web",
        }),
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
      <View style={[styles.marqueeContent, { paddingLeft: 12 }]}>
        <Animated.View
          style={{
            transform: [{ translateX: animatedX }],
            flexDirection: "row",
            alignItems: "center",
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

const SEARCH_TICKER_PLACEHOLDERS = [
  "Search 'Aashirvaad Shudh Chakki Atta'...",
  "Search 'Fresh Paneer & Milk'...",
  "Search 'Fortune Sunflower Oil'...",
  "Search 'Basmati Rice & Dals'...",
  "Search 'Tata Salt & Spices'...",
];

const SearchTicker = React.memo(function SearchTicker({
  textColor,
  placeholders = SEARCH_TICKER_PLACEHOLDERS,
}: {
  textColor: string;
  placeholders?: string[];
}) {
  const isFocused = useIsFocused();
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isFocused) return;

    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(slideAnim, {
          toValue: -8,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start(() => {
        setIndex((prev) => (prev + 1) % placeholders.length);
        slideAnim.setValue(8);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 250,
            easing: Easing.out(Easing.ease),
            useNativeDriver: Platform.OS !== "web",
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 250,
            easing: Easing.out(Easing.ease),
            useNativeDriver: Platform.OS !== "web",
          }),
        ]).start();
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [isFocused, fadeAnim, slideAnim, placeholders.length]);

  return (
    <View style={styles.tickerContainer}>
      <Animated.Text
        style={[
          styles.searchPlaceholder,
          {
            color: textColor,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
        numberOfLines={1}
      >
        {placeholders[index]}
      </Animated.Text>
    </View>
  );
});

export function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { cart, addToCart, cartQuantityMap } = useCart();
  const { colors, isDark } = useTheme();
  const { t, language, setLanguage } = useLanguage();

  // Try to get cached home data synchronously for instant render
  const cachedHome = getHomeDataSync();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(!cachedHome); // Skip loading if cache exists
  const [categories, setCategories] = useState<any[]>(
    cachedHome?.categories || [],
  );
  const [banners, setBanners] = useState<any[]>(cachedHome?.banners || []);
  const [sections, setSections] = useState<any[]>(cachedHome?.sections || []);
  const [settings, setSettings] = useState<any>(cachedHome?.settings || null);
  const [festiveModalVisible, setFestiveModalVisible] = useState(false);

  // Scroll-driven header collapse & search translation animation
  const scrollY = useRef(new Animated.Value(0)).current;

  // Tier 2 container height collapses (from 48 down to 0)
  const headerSearchHeight = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [48, 0],
    extrapolate: "clamp",
  });

  // Make collapsed search bar width responsive, taking ~42% of screen up to 160px max
  const collapsedSearchBarWidth = Math.min(width * 0.42, 160);

  // Search Bar scales down its width to fit next to brand
  const searchBarWidth = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [width - 32, collapsedSearchBarWidth],
    extrapolate: "clamp",
  });

  // Instead of scaling, directly animate height for crisp UI (from 44 down to 36)
  const searchBarHeight = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [44, 36],
    extrapolate: "clamp",
  });

  // Search Bar translates UP to perfectly align centers with brand text
  const searchBarTranslateY = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, -44],
    extrapolate: "clamp",
  });

  // Search Bar translates RIGHT to dock on the right edge
  const searchBarTranslateX = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, width - 32 - collapsedSearchBarWidth],
    extrapolate: "clamp",
  });

  // The text ticker inside fades out as it gets smaller
  const headerSearchOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const headerSearchInverseOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const micWidth = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [34, 0],
    extrapolate: "clamp",
  });

  useEffect(() => {
    if (settings?.enable_festive_popup) {
      AsyncStorage.getItem("festive_popup_seen").then((seen) => {
        if (!seen) {
          setFestiveModalVisible(true);
        }
      });
    }
  }, [settings?.enable_festive_popup]);

  const handleDismissFestive = async () => {
    setFestiveModalVisible(false);
    try {
      await AsyncStorage.setItem("festive_popup_seen", "true");
    } catch {}
  };

  const nowTime = Date.now();
  const startDateValid =
    !settings?.announcement_start_date ||
    new Date(settings.announcement_start_date).getTime() <= nowTime;
  const endDateValid =
    !settings?.announcement_end_date ||
    new Date(settings.announcement_end_date).getTime() >= nowTime;
  const showAnnouncement =
    Boolean(settings?.enable_announcement_bar) &&
    startDateValid &&
    endDateValid &&
    Boolean(settings?.announcement_text);
  const announcementText = settings?.announcement_text || "";

  const handleWhatsAppSupport = async () => {
    const rawNum = settings?.whatsapp_number || settings?.store_phone || "";
    const cleanNumber = rawNum.replace(/[^0-9]/g, "");
    const formattedNumber =
      cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
    const msg =
      settings?.whatsapp_default_message ||
      "Hi Narendra Kirana, I need help with my grocery order.";

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
        Alert.alert(
          "WhatsApp Not Available",
          `Please contact store support directly at ${rawNum}`,
        );
      });
    }
  };

  // Favorites state synced via favoritesService
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(
    favoritesService.getFavoriteIds(),
  );
  const [favoriteMap, setFavoriteMap] = useState<Record<number, number>>(
    favoritesService.getFavoriteMap(),
  );

  const fetchFavorites = useCallback(
    async (force = false) => {
      if (!user) {
        setFavoriteIds(new Set());
        setFavoriteMap({});
        return;
      }
      try {
        const snap = await favoritesService.getFavorites(force);
        setFavoriteIds(new Set(snap.ids));
        setFavoriteMap({ ...snap.map });
      } catch (error) {
        console.log("Error fetching favorites:", error);
      }
    },
    [user],
  );

  const toggleFavorite = useCallback(
    async (param: any) => {
      const productId =
        typeof param === "object" && param !== null ? param.id : Number(param);
      if (!productId) return;

      if (!user) {
        Alert.alert(
          "Sign In Required",
          "Please sign in to save your favorite products.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Sign In", onPress: () => navigation.navigate("Login") },
          ],
        );
        return;
      }

      try {
        await favoritesService.toggleFavorite(productId);
      } catch (error) {
        console.error("Error toggling favorite:", error);
      }
    },
    [user, navigation],
  );

  const fetchHomeData = async () => {
    try {
      const [catsRes, bannersRes, sectionsRes, settingsData] =
        await Promise.all([
          apiClient.get("/categories/").catch(() => ({ data: [] })),
          apiClient.get("/offers/banners/").catch(() => ({ data: [] })),
          apiClient
            .get("/store/homepage-sections/")
            .catch(() => ({ data: [] })),
          storeApi.getSettings().catch(() => ({})),
        ]);

      const catsList = Array.isArray(catsRes.data)
        ? catsRes.data
        : catsRes.data?.results || [];
      const bannersList = Array.isArray(bannersRes.data)
        ? bannersRes.data
        : bannersRes.data?.results || [];

      if (catsList.length > 0) {
        setCategories(catsList);
      }
      if (bannersList.length > 0) {
        setBanners(bannersList);
      }

      // Prefetch top 3 promotional banners into disk/memory cache
      bannersList.slice(0, 3).forEach((b: any) => {
        const uri =
          getOptimizedImageUrl(
            b.image,
            Math.round(width * 2),
            Math.round(BANNER_HEIGHT * 2),
          ) || fixImageUrl(b.image);
        if (uri) {
          Image.prefetch(uri).catch(() => {});
        }
      });

      const rawSections = Array.isArray(sectionsRes.data)
        ? sectionsRes.data
        : sectionsRes.data?.results || [];
      const mappedSections = rawSections
        .map((sec: any) => ({
          ...sec,
          items: (sec.section_products || [])
            .sort((a: any, b: any) => a.position - b.position)
            .map((sp: any) => sp.product_details)
            .filter(Boolean),
        }))
        .filter((s: any) => s.is_active !== false)
        .sort(
          (a: any, b: any) => (a.display_order || 0) - (b.display_order || 0),
        );

      if (mappedSections.length > 0) {
        setSections(mappedSections);
      }
      if (settingsData && Object.keys(settingsData).length > 0) {
        setSettings(settingsData);
      }

      // Persist to local cache for instant zero-lag launch next time
      if (
        catsList.length > 0 ||
        mappedSections.length > 0 ||
        bannersList.length > 0
      ) {
        saveHomeData({
          categories: catsList.length > 0 ? catsList : categories,
          banners: bannersList.length > 0 ? bannersList : banners,
          sections: mappedSections.length > 0 ? mappedSections : sections,
          settings:
            settingsData && Object.keys(settingsData).length > 0
              ? settingsData
              : settings,
        }).catch(() => {});
      }
    } catch (error) {
      console.error("Error fetching home data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // 1. If we didn't have synchronous cache on the very first tick, hydrate from disk immediately
    if (!cachedHome) {
      loadHomeData().then((cached) => {
        if (cached) {
          setCategories((prev: any[]) =>
            prev.length === 0 ? cached.categories : prev,
          );
          setBanners((prev: any[]) =>
            prev.length === 0 ? cached.banners : prev,
          );
          setSections((prev: any[]) =>
            prev.length === 0 ? cached.sections : prev,
          );
          setSettings((prev: any) => (!prev ? cached.settings : prev));
          setLoading(false);
        }
      });
    }

    // 2. Fetch fresh data in background (SWR - stale while revalidate)
    fetchHomeData();

    if (user) {
      fetchFavorites();
      const unsubscribe = favoritesService.subscribe(() => {
        setFavoriteIds(new Set(favoritesService.getFavoriteIds()));
        setFavoriteMap({ ...favoritesService.getFavoriteMap() });
      });
      return unsubscribe;
    } else {
      setFavoriteIds(new Set());
      setFavoriteMap({});
    }
  }, [user, fetchFavorites]);

  const handleProductPress = useCallback(
    (p: any) => {
      navigation.navigate("ProductDetailScreen", {
        productId: p.id,
        initialProduct: p,
      });
    },
    [navigation],
  );

  const handleAddToCart = useCallback(
    (p: any) => {
      addToCart(p.id, 1, p);
    },
    [addToCart],
  );

  const handleToggleFavorite = useCallback(
    (p: any) => {
      toggleFavorite(p?.id ?? p);
    },
    [toggleFavorite],
  );

  const handleCategoryPress = useCallback(
    (c: any) => {
      navigation.navigate("CategoriesTab", {
        screen: "ProductListScreen",
        params: { categoryId: c.id, categoryName: c.name },
      });
    },
    [navigation],
  );

  const handleBannerPress = useCallback(() => {
    navigation.navigate("CategoriesTab", {
      screen: "ProductListScreen",
      params: {},
    });
  }, [navigation]);

  const categoryCardSize = width > 400 ? 104 : 96;
  const getCategoryItemLayout = useCallback(
    (_: any, index: number) => ({
      length: categoryCardSize + 10,
      offset: 16 + (categoryCardSize + 10) * index,
      index,
    }),
    [categoryCardSize],
  );

  const renderCategoryItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <CategoryCard
        category={item}
        index={index}
        style={styles.categoryCardHorizontal}
        onPress={handleCategoryPress}
      />
    ),
    [handleCategoryPress],
  );

  const getProductItemLayout = useCallback(
    (_: any, index: number) => ({
      length: 160 + 12,
      offset: 16 + (160 + 12) * index,
      index,
    }),
    [],
  );

  const renderProductItem = useCallback(
    ({ item }: { item: any }) => (
      <View style={styles.horizontalProductItem}>
        <ProductCard
          product={item}
          onPress={handleProductPress}
          onAddToCart={handleAddToCart}
          cartQty={cartQuantityMap[item.id] || 0}
          isFavorite={favoriteIds.has(item.id)}
          onToggleFavorite={handleToggleFavorite}
        />
      </View>
    ),
    [
      handleProductPress,
      handleAddToCart,
      cartQuantityMap,
      favoriteIds,
      handleToggleFavorite,
    ],
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHomeData();
    fetchFavorites(true);
  };

  const customSearches = React.useMemo(() => {
    if (settings?.popular_searches) {
      const parsed = settings.popular_searches
        .split("\n")
        .map((s: string) => s.trim())
        .filter(Boolean);
      if (parsed.length > 0) {
        return parsed.map((s: string) => `Search '${s}'...`);
      }
    }
    return SEARCH_TICKER_PLACEHOLDERS;
  }, [settings?.popular_searches]);

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        {/* 2-Tier Header Skeleton */}
        <View
          style={[
            styles.topHeaderContainer,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={styles.headerTier1}>
            <View style={styles.brandLocationGroup}>
              <View style={styles.brandTitleRow}>
                <Text style={styles.brandTitle}>
                  <Text style={[styles.brandSlate, { color: colors.text }]}>
                    Narendra{" "}
                  </Text>
                  <Text style={styles.brandRed}>Kirana</Text>
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.fullWidthSearchBar,
              { backgroundColor: colors.inputBg, borderColor: colors.border },
            ]}
          >
            <View style={styles.searchInnerRow}>
              <Feather
                name="search"
                size={17}
                color={colors.textSecondary}
                style={{ marginRight: 8 }}
              />
              <SearchTicker textColor={colors.textSecondary} />
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <BannerSkeleton />

          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <SkeletonItem
              width={120}
              height={18}
              borderRadius={6}
              style={{ marginBottom: 12 }}
            />
            <View style={{ flexDirection: "row", gap: 12 }}>
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
              <View style={styles.horizontalProductItem}>
                <ProductCardSkeleton />
              </View>
              <View style={styles.horizontalProductItem}>
                <ProductCardSkeleton />
              </View>
              <View style={styles.horizontalProductItem}>
                <ProductCardSkeleton />
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      {/* Top Collapsing Header Section */}
      <View
        style={[
          styles.topHeaderContainer,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            zIndex: 50,
          },
        ]}
      >
        {/* Tier 1: Brand & User Icon */}
        <View style={styles.headerTier1}>
          <View style={styles.brandLocationGroup}>
            <View style={styles.brandTextWrap}>
              <Text
                style={{ fontSize: 20, fontWeight: "900", letterSpacing: -0.5 }}
              >
                <Text style={[styles.brandSlate, { color: colors.text }]}>
                  Narendra{" "}
                </Text>
                <Text style={styles.brandRed}>Kirana</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Tier 2: The placeholder space that collapses */}
        <Animated.View style={{ height: headerSearchHeight, opacity: 0 }} />

        {/* The Animated Search Bar */}
        <Animated.View
          style={{
            position: "absolute",
            top: 48,
            left: 16,
            width: searchBarWidth,
            height: searchBarHeight,
            transform: [
              { translateY: searchBarTranslateY },
              { translateX: searchBarTranslateX },
            ],
            zIndex: 60,
          }}
        >
          <TouchableOpacity
            style={[
              styles.fullWidthSearchBar,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.border,
                marginHorizontal: 0,
                width: "100%",
                height: "100%",
              },
            ]}
            activeOpacity={0.88}
            onPress={() => navigation.navigate("SearchScreen")}
          >
            <View style={styles.searchInnerRow}>
              <Feather
                name="search"
                size={17}
                color={colors.textSecondary}
                style={{ marginRight: 8 }}
              />

              <View style={{ flex: 1, justifyContent: "center" }}>
                <Animated.View
                  style={{
                    opacity: headerSearchOpacity,
                    position: "absolute",
                    width: "100%",
                  }}
                >
                  <SearchTicker
                    textColor={colors.textSecondary}
                    placeholders={customSearches}
                  />
                </Animated.View>

                <Animated.View
                  style={{
                    opacity: headerSearchInverseOpacity,
                    position: "absolute",
                    width: "100%",
                  }}
                >
                  <Text
                    style={[
                      styles.searchPlaceholder,
                      { color: colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    Search
                  </Text>
                </Animated.View>
              </View>
            </View>

            <Animated.View
              style={{
                opacity: headerSearchOpacity,
                width: micWidth,
                overflow: "hidden",
              }}
            >
              <TouchableOpacity
                style={styles.voiceMicBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={(e) => {
                  e.stopPropagation();
                  triggerHaptic("medium");
                  navigation.navigate("SearchScreen", { autoStartVoice: true });
                }}
              >
                <Feather name="mic" size={16} color={colors.primary} />
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Top Announcement Marquee Bar */}
      {showAnnouncement && (
        <AnnouncementMarqueeBar
          text={announcementText}
          bgColor={settings?.announcement_bg_color || "#EF4444"}
          textColor={settings?.announcement_text_color || "#FFFFFF"}
        />
      )}

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#059669"]}
          />
        }
      >
        {/* Banner Carousel or Web Fallback Hero Banner */}
        {banners.length > 0 ? (
          <BannerCarouselSection
            banners={banners}
            onBannerPress={handleBannerPress}
          />
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
                  {settings?.store_name || "NARENDRA KIRANA STORE"}
                </Text>
              </View>

              <Text style={styles.heroHeadline}>
                Everyday essentials,{" "}
                <Text style={styles.heroHeadlineYellow}>
                  ready when you are.
                </Text>
              </Text>

              <Text style={styles.heroSubheadline} numberOfLines={2}>
                Order online and collect from your local store. Quality products
                and reliable service.
              </Text>

              <TouchableOpacity
                style={[
                  styles.exploreCatalogBtn,
                  isDark && { backgroundColor: colors.surface },
                ]}
                activeOpacity={0.9}
                onPress={() =>
                  navigation.navigate("CategoriesTab", {
                    screen: "CategoriesScreen",
                  })
                }
              >
                <Text
                  style={[
                    styles.exploreCatalogText,
                    isDark && { color: colors.text },
                  ]}
                >
                  {t("exploreCatalog")}
                </Text>
                <Feather
                  name="chevron-right"
                  size={16}
                  color={isDark ? colors.text : "#0F172A"}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Categories / Shop by category Section */}
        {categories.length > 0 && (
          <AnimatedFadeIn delay={100}>
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("shopByCategory")}
                </Text>
                <TouchableOpacity
                  style={styles.seeAllBtn}
                  onPress={() => navigation.navigate("CategoriesTab")}
                >
                  <Text
                    style={[styles.seeAllText, { color: colors.textSecondary }]}
                  >
                    {t("seeAll")}
                  </Text>
                </TouchableOpacity>
              </View>

              <FlatList
                horizontal
                data={categories}
                keyExtractor={(cat) => String(cat.id)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesScrollList}
                initialNumToRender={6}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={Platform.OS === "android"}
                getItemLayout={getCategoryItemLayout}
                renderItem={renderCategoryItem}
              />
            </View>
          </AnimatedFadeIn>
        )}

        {/* Dynamic Homepage Product Sections (Horizontal Scrolling Carousel - Scroll Left / Right) */}
        {sections.length === 0 ? (
          <View style={styles.sectionContainer}>
            <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
              <SkeletonItem width={140} height={18} borderRadius={6} />
            </View>
            <View style={styles.horizontalProductsList}>
              <View style={styles.horizontalProductItem}>
                <ProductCardSkeleton />
              </View>
              <View style={styles.horizontalProductItem}>
                <ProductCardSkeleton />
              </View>
              <View style={styles.horizontalProductItem}>
                <ProductCardSkeleton />
              </View>
            </View>
          </View>
        ) : (
          sections.map((section: any, secIdx: number) => {
            if (!section) return null;
            const sectionProducts = (section.items || []).filter(
              (item: any) => item && item.is_in_stock !== false,
            );
            if (sectionProducts.length === 0) return null;

            return (
              <AnimatedFadeIn
                key={section.id || secIdx}
                index={secIdx}
                delay={200}
              >
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleGroup}>
                      <Text
                        style={[styles.sectionTitle, { color: colors.text }]}
                      >
                        {stripEmojis(section.title)}
                      </Text>
                      <View
                        style={[
                          styles.countBadge,
                          { backgroundColor: colors.inputBg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.countBadgeText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {sectionProducts.length}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.seeAllBtn}
                      onPress={() => {
                        const cleanTitle = stripEmojis(section.title);
                        const categoryId =
                          section.category_id ||
                          section.category?.id ||
                          section.category;
                        if (categoryId) {
                          navigation.navigate("CategoriesTab", {
                            screen: "ProductListScreen",
                            params: { categoryId, categoryName: cleanTitle },
                          });
                        } else {
                          navigation.navigate("CategoriesTab", {
                            screen: "ProductListScreen",
                            params: {
                              search: cleanTitle,
                              categoryName: cleanTitle,
                            },
                          });
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.seeAllText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {t("seeAll")}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Horizontal Scrollable Product Carousel (Virtual FlatList) */}
                  <FlatList
                    horizontal
                    data={sectionProducts}
                    keyExtractor={(product) => String(product.id)}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalProductsList}
                    initialNumToRender={6}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={Platform.OS === "android"}
                    getItemLayout={getProductItemLayout}
                    renderItem={renderProductItem}
                  />
                </View>
              </AnimatedFadeIn>
            );
          })
        )}
      </Animated.ScrollView>

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
            <View
              style={[
                styles.festiveCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {/* Close Button */}
              <TouchableOpacity
                style={[
                  styles.festiveCloseBtn,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.12)"
                      : "#F1F5F9",
                  },
                ]}
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
                  {settings?.festive_popup_title || "Special Festive Offer!"}
                </Text>
                <Text
                  style={[
                    styles.festiveContent,
                    { color: colors.textSecondary },
                  ]}
                >
                  {settings?.festive_popup_content ||
                    "Enjoy special savings and festive discounts on your grocery orders today!"}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.festiveActionBtn,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={() => {
                    handleDismissFestive();
                    navigation.navigate("CategoriesTab", {
                      screen: "ProductListScreen",
                      params: {},
                    });
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.festiveActionBtnText}>
                    Explore Offers Now
                  </Text>
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
    backgroundColor: "#F8FAFC", // slate-50 matching web
  },
  topHeaderContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTier1: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  brandLocationGroup: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  brandTextWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  brandTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  brandSlate: {
    color: "#0F172A",
  },
  brandRed: {
    color: "#DC2626",
  },
  liveStoreDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  deliverySpeedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  deliverySpeedText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#047857",
    letterSpacing: 0.5,
  },
  headerActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerActionBtn: {
    height: 36,
    minWidth: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  languageToggleText: {
    fontSize: 11,
    fontWeight: "800",
  },
  fullWidthSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.04)",
    elevation: 1,
  },
  voiceMicBtn: {
    padding: 6,
    marginLeft: 6,
  },
  searchInnerRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  tickerContainer: {
    flex: 1,
    overflow: "hidden",
    justifyContent: "center",
  },
  searchPlaceholder: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  carouselWrapper: {
    width,
    height: BANNER_HEIGHT,
    backgroundColor: "#F1F5F9", // bg-slate-100 matching web
    position: "relative",
    marginBottom: 6,
    overflow: "hidden",
  },
  bannersList: {},
  bannerSlide: {
    width,
    height: BANNER_HEIGHT,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  dotsContainer: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    zIndex: 10,
  },
  dot: {
    width: 7,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.65)",
  },
  activeDot: {
    width: 28, // active wide pill w-8 matching web
    height: 5,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.35)",
    elevation: 3,
  },
  fallbackHeroBanner: {
    width,
    backgroundColor: "#065F46", // emerald-800 matching web
    paddingVertical: 22,
    paddingHorizontal: 16,
    overflow: "hidden",
    position: "relative",
    marginBottom: 6,
  },
  heroInnerContent: {
    position: "relative",
    zIndex: 10,
  },
  heroFloatingEmojiCart: {
    position: "absolute",
    top: 10,
    right: 32,
    fontSize: 26,
    opacity: 0.22,
  },
  heroFloatingEmojiVeg: {
    position: "absolute",
    bottom: 12,
    right: 16,
    fontSize: 24,
    opacity: 0.22,
  },
  heroDecorTopCircle: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  heroDecorBottomCircle: {
    position: "absolute",
    bottom: -30,
    right: 40,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  heroTagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  heroTagText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  heroHeadline: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 28,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroHeadlineYellow: {
    color: "#FDE047", // yellow-300 matching web
  },
  heroSubheadline: {
    fontSize: 12,
    color: "#D1FAE5", // emerald-100 matching web
    lineHeight: 18,
    marginBottom: 16,
  },
  exploreCatalogBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    alignSelf: "flex-start",
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
    elevation: 3,
  },
  exploreCatalogText: {
    color: "#0F172A",
    fontWeight: "900",
    fontSize: 13,
  },
  sectionContainer: {
    marginTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
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
    height: 296,
  },
  countBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  sectionTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryCardHorizontal: {},
  marqueeBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 36,
    paddingHorizontal: 12,
    overflow: "hidden",
  },
  marqueeIconWrap: {
    marginRight: 8,
    zIndex: 2,
  },
  marqueeContent: {
    flex: 1,
    overflow: "hidden",
    justifyContent: "center",
  },
  marqueeText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  floatingWhatsAppBtn: {
    position: "absolute",
    bottom: 24,
    right: 18,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#25D366",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.3)",
    elevation: 6,
    zIndex: 999,
  },
  festiveModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  festiveCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.25)",
    elevation: 10,
    position: "relative",
  },
  festiveCloseBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  festiveBannerImage: {
    width: "100%",
    height: 150,
  },
  festiveBody: {
    padding: 24,
    alignItems: "center",
  },
  festiveIconWrap: {
    marginBottom: 12,
  },
  festiveTitle: {
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  festiveContent: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 20,
  },
  festiveActionBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  festiveActionBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
