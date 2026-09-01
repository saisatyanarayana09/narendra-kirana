import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { apiClient } from '../../api/client';
import { useDebounce } from '../../hooks/useDebounce';
import { ProductCard } from '../../components/ProductCard';
import { useCart } from '../../context/CartContext';

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

  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      performSearch(debouncedQuery.trim());
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/products/?search=${encodeURIComponent(searchQuery)}`);
      setResults(res.data.results || res.data || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Search Bar matching web GlobalSearchBar */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" color="#059669" size={20} />
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity 
              onPress={() => setQuery('')}
              style={styles.clearButton}
              activeOpacity={0.7}
            >
              <Feather name="x" size={16} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#059669" />
          </View>
        ) : query.trim().length < 2 ? (
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
