import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Dimensions,
  Animated,
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { apiClient } from '../../api/client';
import { useDebounce } from '../../hooks/useDebounce';
import { ProductCard } from '../../components/ProductCard';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import { useMobileVoice } from '../../hooks/useMobileVoice';

const { width } = Dimensions.get('window');
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

const POPULAR_SEARCHES = [
  'Rice & Dal', 'Cooking Oil', 'Aashirvaad Atta', 'Maggi', 'Sugar & Salt', 'Ghee', 'Spices', 'Tea'
];

type Props = {
  navigation: AppNavigationProp;
  route?: { params?: { autoStartVoice?: boolean } };
};

const SEARCH_CACHE_LIMIT = 50;
const searchCache = new Map<string, any[]>();

export function SearchScreen({ navigation, route }: Props) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { addToCart, cartQuantityMap } = useCart();
  const { colors, isDark } = useTheme();
  const activeQueryRef = useRef('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Looping pulsing animation references
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.4)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Mobile Voice Hook
  const {
    isListening,
    interimText,
    isSpeaking,
    error: voiceError,
    startListening,
    toggleListening,
    speak,
    stopSpeaking,
  } = useMobileVoice({
    onResult: (spokenText) => {
      setQuery(spokenText);
    },
  });

  // Auto-trigger voice search if launched from mic shortcut
  useEffect(() => {
    if (route?.params?.autoStartVoice) {
      const timer = setTimeout(() => {
        startListening();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [route?.params?.autoStartVoice, startListening]);

  // Clean up any pending search request on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Pulsing animation effect when listening
  useEffect(() => {
    if (isListening) {
      pulseLoopRef.current = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.35,
              duration: 700,
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 700,
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
          ]),
          Animated.sequence([
            Animated.timing(pulseOpacity, {
              toValue: 0.1,
              duration: 700,
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 0.45,
              duration: 700,
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
          ]),
        ])
      );
      pulseLoopRef.current.start();
    } else {
      if (pulseLoopRef.current) {
        pulseLoopRef.current.stop();
        pulseLoopRef.current = null;
      }
      pulseAnim.setValue(1);
      pulseOpacity.setValue(0.4);
    }

    return () => {
      if (pulseLoopRef.current) {
        pulseLoopRef.current.stop();
      }
    };
  }, [isListening]);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      performSearch(debouncedQuery);
    } else {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setResults([]);
    }
  }, [debouncedQuery]);

  const performSearch = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    activeQueryRef.current = trimmed;
    const cacheKey = trimmed.toLowerCase();

    // 0ms instant display from memory cache if previously fetched!
    if (searchCache.has(cacheKey)) {
      setResults(searchCache.get(cacheKey)!);
      setLoading(false);
      return;
    }

    // Cancel in-flight network request from older keystrokes
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const response = await apiClient.get('/products/', {
        params: { search: trimmed },
        signal: controller.signal,
      });
      if (activeQueryRef.current === trimmed) {
        const data = response.data.results || response.data || [];
        if (searchCache.size >= SEARCH_CACHE_LIMIT) {
          const firstKey = searchCache.keys().next().value;
          if (firstKey) searchCache.delete(firstKey);
        }
        searchCache.set(cacheKey, data);
        setResults(data);
      }
    } catch (error: any) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED' || error?.name === 'AbortError') {
        return; // Request was cleanly cancelled by newer keystroke
      }
      console.error('Search error:', error);
    } finally {
      if (activeQueryRef.current === trimmed) {
        setLoading(false);
      }
    }
  };

  const handleProductPress = useCallback((p: any) => {
    navigation.navigate('ProductDetailScreen', { productId: p.id, initialProduct: p });
  }, [navigation]);

  const handleAddToCart = useCallback((p: any) => {
    addToCart(p.id, 1, p);
  }, [addToCart]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: 296,
    offset: 296 * Math.floor(index / 2),
    index,
  }), []);

  const renderProductItem = useCallback(({ item }: { item: any }) => (
    <View style={styles.cardWrapper}>
      <ProductCard 
        product={item} 
        cartQty={cartQuantityMap[item.id] || 0}
        onPress={handleProductPress} 
        onAddToCart={handleAddToCart}
      />
    </View>
  ), [cartQuantityMap, handleProductPress, handleAddToCart]);

  const renderListHeader = useCallback(() => (
    <View style={styles.resultsHeader}>
      <Text style={[styles.resultsCountText, { color: colors.textSecondary }]}>
        Found {results.length} {results.length === 1 ? 'product' : 'products'}
      </Text>
    </View>
  ), [results.length, colors.textSecondary]);

  const displaySearchValue = isListening && interimText ? interimText : query;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header Search Bar matching web GlobalSearchBar */}
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
          <Feather name="arrow-left" color={colors.primary} size={20} />
        </TouchableOpacity>

        <View style={[
          styles.searchBar, 
          { backgroundColor: colors.inputBg, borderColor: colors.border },
          isListening && styles.searchBarListening
        ]}>
          <Feather name="search" size={18} color={isListening ? "#E11D48" : colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={isListening ? "Listening... Speak now" : "Search products..."}
            placeholderTextColor={isListening ? "#E11D48" : colors.textSecondary}
            value={displaySearchValue}
            onChangeText={(text) => {
              setQuery(text);
              if (isListening) toggleListening();
            }}
            autoFocus
            returnKeyType="search"
          />

          {/* Right-Hand Button Controls Group positioned inside Search Bar */}
          <View style={styles.rightButtonsGroup}>
            {/* Read Aloud Text-to-Speech Button */}
            {query.trim().length > 0 && !isListening && (
              <TouchableOpacity
                onPress={() => {
                  if (isSpeaking) {
                    stopSpeaking();
                  } else {
                    const count = results.length;
                    speak(`${query}. Found ${count} ${count === 1 ? 'item' : 'items'}.`);
                  }
                }}
                style={styles.rightIconBtn}
                activeOpacity={0.7}
              >
                <Feather 
                  name={isSpeaking ? "volume-x" : "volume-2"} 
                  size={16} 
                  color={isSpeaking ? colors.primary : colors.textSecondary} 
                />
              </TouchableOpacity>
            )}

            {/* Clear Input Button */}
            {query.length > 0 && !isListening && (
              <TouchableOpacity 
                onPress={() => {
                  setQuery('');
                  if (isSpeaking) stopSpeaking();
                }}
                style={styles.rightIconBtn}
                activeOpacity={0.7}
              >
                <Feather name="x" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            {/* Speech-to-Text Microphone Icon Button */}
            <View>
              {isListening && (
                <Animated.View 
                  style={[
                    styles.micPulseRing,
                    {
                      transform: [{ scale: pulseAnim }],
                      opacity: pulseOpacity,
                    }
                  ]} 
                />
              )}
              <TouchableOpacity
                onPress={toggleListening}
                style={[
                  styles.micBtn,
                  isDark && { backgroundColor: colors.inputBg },
                  isListening && styles.micBtnActive
                ]}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Voice Search"
              >
                <Feather 
                  name={isListening ? "mic-off" : "mic"} 
                  size={16} 
                  color={isListening ? "#FFFFFF" : colors.primary} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Main Body: Voice banner, Popular searches or Results */}
      <View style={styles.content}>
        {/* Real-Time Live Transcribing Audio Banner */}
        {isListening && (
          <View style={styles.listeningBanner}>
            <Feather name="radio" size={14} color="#E11D48" />
            <Text style={styles.listeningText} numberOfLines={1}>
              {interimText ? `"${interimText}"` : "Listening... Speak now"}
            </Text>
            <TouchableOpacity onPress={toggleListening}>
              <Text style={styles.listeningDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Voice Error Banner */}
        {!!voiceError && (
          <View style={[styles.errorBanner, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' }]}>
            <Feather name="alert-circle" size={14} color="#EF4444" />
            <Text style={[styles.errorBannerText, { color: isDark ? '#FCA5A5' : '#B91C1C' }]}>
              {voiceError}
            </Text>
          </View>
        )}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 12, fontSize: 14, color: colors.textSecondary, fontWeight: '500' }}>Searching products...</Text>
          </View>
        ) : query.trim() === '' ? (
          /* Popular Searches When Empty */
          <View style={styles.initialStateContainer}>
            <Text style={[styles.popularLabel, { color: colors.text }]}>Popular Searches</Text>
            <View style={styles.tagsContainer}>
              {POPULAR_SEARCHES.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setQuery(tag)}
                  activeOpacity={0.7}
                >
                  <Feather name="trending-up" size={13} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.tagText, { color: colors.text }]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.center}>
            <View style={[styles.emptyIconBox, { backgroundColor: colors.inputBg }]}>
              <Feather name="search" size={36} color={colors.textSecondary} />
            </View>
            <Text style={[styles.noResultsText, { color: colors.text }]}>No products found for "{query}"</Text>
            <Text style={[styles.noResultsSub, { color: colors.textSecondary }]}>
              Try checking your spelling or search for broader keywords.
            </Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item, index) => String(item?.id || item?.uuid || item?.uid || index)}
            numColumns={2}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContainer}
            columnWrapperStyle={styles.row}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            updateCellsBatchingPeriod={50}
            getItemLayout={getItemLayout}
            ListHeaderComponent={renderListHeader}
            renderItem={renderProductItem}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // slate-50
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  backButton: {
    padding: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 8,
    paddingRight: 100,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  clearButton: {
    padding: 4,
  },
  searchBarListening: {
    borderColor: '#E11D48',
    backgroundColor: '#FFF1F2',
  },
  rightButtonsGroup: {
    position: 'absolute',
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rightIconBtn: {
    padding: 6,
    borderRadius: 8,
  },
  micBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnActive: {
    backgroundColor: '#E11D48',
  },
  micPulseRing: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FB7185',
  },
  listeningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFE4E6',
    borderBottomWidth: 1,
    borderBottomColor: '#FECDD3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  listeningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#9F1239',
    fontStyle: 'italic',
  },
  listeningDoneText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E11D48',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  noResultsSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  initialStateContainer: {
    padding: 20,
  },
  popularLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.02)',
    elevation: 1,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 130,
  },
  resultsHeader: {
    marginBottom: 12,
  },
  resultsCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardWrapper: {
    width: (width - 44) / 2,
    height: 296,
  },
});
