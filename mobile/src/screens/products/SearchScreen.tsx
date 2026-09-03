import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Dimensions,
  Animated 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { apiClient } from '../../api/client';
import { useDebounce } from '../../hooks/useDebounce';
import { ProductCard } from '../../components/ProductCard';
import { useCart } from '../../context/CartContext';
import { useMobileVoice } from '../../hooks/useMobileVoice';

const { width } = Dimensions.get('window');

const POPULAR_SEARCHES = [
  'Rice & Dal', 'Cooking Oil', 'Aashirvaad Atta', 'Maggi', 'Sugar & Salt', 'Ghee', 'Spices', 'Tea'
];

type Props = {
  navigation: AppNavigationProp;
};

export function SearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { addToCart } = useCart();
  const activeQueryRef = useRef('');

  // Looping pulsing animation references
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.4)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Mobile Voice Hook
  const {
    isListening,
    interimText,
    isSpeaking,
    toggleListening,
    speak,
    stopSpeaking,
  } = useMobileVoice({
    onResult: (spokenText) => {
      setQuery(spokenText);
    },
  });

  // Animated mic pulse effect
  useEffect(() => {
    if (isListening) {
      pulseAnim.setValue(1);
      pulseOpacity.setValue(0.5);

      pulseLoopRef.current = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.5,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1.0,
              duration: 700,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(pulseOpacity, {
              toValue: 0.1,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 0.5,
              duration: 700,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      pulseLoopRef.current.start();
    } else {
      if (pulseLoopRef.current) pulseLoopRef.current.stop();
      pulseAnim.setValue(1);
      pulseOpacity.setValue(0);
    }
    return () => {
      if (pulseLoopRef.current) pulseLoopRef.current.stop();
    };
  }, [isListening]);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length >= 1) {
      performSearch(trimmed);
    } else {
      activeQueryRef.current = '';
      setResults([]);
    }
  }, [debouncedQuery]);

  const performSearch = async (searchQuery: string) => {
    activeQueryRef.current = searchQuery;
    setLoading(true);
    try {
      const res = await apiClient.get(`/products/?search=${encodeURIComponent(searchQuery)}`);
      if (activeQueryRef.current === searchQuery) {
        setResults(res.data.results || res.data || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      if (activeQueryRef.current === searchQuery) {
        setLoading(false);
      }
    }
  };

  const displaySearchValue = isListening && interimText ? interimText : query;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Search Bar matching web GlobalSearchBar */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('HomeTab');
            }
          }}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" color="#059669" size={20} />
        </TouchableOpacity>

        <View style={[styles.searchBar, isListening && styles.searchBarListening]}>
          <Feather name="search" size={18} color={isListening ? "#E11D48" : "#94A3B8"} />
          <TextInput
            style={styles.searchInput}
            placeholder={isListening ? "Listening... Speak now" : "Search products..."}
            placeholderTextColor={isListening ? "#E11D48" : "#94A3B8"}
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
                  color={isSpeaking ? "#059669" : "#64748B"} 
                />
              </TouchableOpacity>
            )}

            {/* Clear Input Button */}
            {query.length > 0 && !isListening && (
              <TouchableOpacity 
                onPress={() => setQuery('')}
                style={styles.rightIconBtn}
                activeOpacity={0.7}
              >
                <Feather name="x" size={16} color="#64748B" />
              </TouchableOpacity>
            )}

            {/* Speech-to-Text Microphone Button inside right edge */}
            <TouchableOpacity 
              onPress={toggleListening}
              style={[styles.micBtn, isListening && styles.micBtnActive]}
              activeOpacity={0.8}
            >
              {isListening && (
                <Animated.View 
                  style={[
                    styles.micPulseRing,
                    { transform: [{ scale: pulseAnim }], opacity: pulseOpacity }
                  ]} 
                />
              )}
              <Feather name="mic" size={16} color={isListening ? "#FFFFFF" : "#64748B"} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Real-time Voice Feedback Banner */}
      {isListening && (
        <View style={styles.listeningBanner}>
          <Feather name="radio" size={14} color="#E11D48" />
          <Text style={styles.listeningText} numberOfLines={1}>
            {interimText || "Listening... Speak your product"}
          </Text>
          <TouchableOpacity onPress={toggleListening}>
            <Text style={styles.listeningDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.content}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#059669" />
          </View>
        ) : query.trim().length < 1 ? (
          /* Popular Searches When Empty */
          <View style={styles.initialStateContainer}>
            <Text style={styles.popularLabel}>Popular Searches</Text>
            <View style={styles.tagsContainer}>
              {POPULAR_SEARCHES.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={styles.tagChip}
                  onPress={() => setQuery(tag)}
                  activeOpacity={0.7}
                >
                  <Feather name="trending-up" size={13} color="#059669" style={{ marginRight: 6 }} />
                  <Text style={styles.tagText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyIconBox}>
              <Feather name="search" size={36} color="#CBD5E1" />
            </View>
            <Text style={styles.noResultsText}>No products found for "{query}"</Text>
            <Text style={styles.noResultsSub}>
              Try checking your spelling or search for broader keywords.
            </Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => String(item.id)}
            numColumns={2}
            contentContainerStyle={styles.listContainer}
            columnWrapperStyle={styles.row}
            ListHeaderComponent={() => (
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCountText}>
                  Found {results.length} {results.length === 1 ? 'product' : 'products'}
                </Text>
              </View>
            )}
            renderItem={({ item }) => (
              <View style={styles.cardWrapper}>
                <ProductCard 
                  product={item} 
                  onPress={() => navigation.navigate('ProductDetailScreen', { productId: item.id })} 
                  onAddToCart={(p) => addToCart(p.id, 1)}
                />
              </View>
            )}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
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
  },
});
