import React, { useEffect, useState, useCallback, memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '../../../context/AuthContext';

class TrieNode {
  children: Record<string, TrieNode>;
  productIds: Set<number>;

  constructor() {
    this.children = {};
    this.productIds = new Set();
  }
}

class ProductTrie {
  root: TrieNode;

  constructor() {
    this.root = new TrieNode();
  }
  insert(word: string, productId: number) {
    if (!word || typeof word !== 'string') return;
    const cleanWord = word.toLowerCase().trim();
    const parts = cleanWord.split(/\s+/);
    parts.forEach((part) => {
      let currNode = this.root;
      for (const char of part) {
        if (!currNode.children[char]) {
          currNode.children[char] = new TrieNode();
        }
        currNode = currNode.children[char];
        currNode.productIds.add(productId);
      }
    });
  }
  searchPrefix(prefix: string): Set<number> | null {
    if (!prefix || typeof prefix !== 'string') return null;
    let node = this.root;
    const cleanPrefix = prefix.toLowerCase().trim();
    if (!cleanPrefix) return null;

    for (const char of cleanPrefix) {
      if (!node.children[char]) {
        return new Set();
      }
      node = node.children[char];
    }
    return node.productIds;
  }
}

interface ProductItemProps {
  item: any;
  onEdit: (id: number) => void;
}

const ProductItem = memo(({ item, onEdit }: ProductItemProps) => {
  return (
    <View style={styles.card}>
      <Image
        source={{ uri: item?.image || 'https://via.placeholder.com/150' }}
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <View style={styles.cardInfo}>
        <Text style={styles.name}>{item?.name || 'Unnamed Product'}</Text>
        <Text style={styles.price}>
          ₹{item?.offer_price ?? item?.regular_price ?? item?.price ?? '0.00'}
          {item?.unit ? <Text style={styles.unit}> / {item.unit}</Text> : null}
        </Text>
        <Text style={styles.stock}>
          {item?.is_in_stock ? (
            <Text style={{ color: '#10b981' }}>In Stock ({item?.stock_quantity ?? 0})</Text>
          ) : (
            <Text style={{ color: '#ef4444' }}>Out of Stock</Text>
          )}
        </Text>
      </View>
      <TouchableOpacity style={styles.editBtn} onPress={() => item?.id && onEdit(item.id)}>
        <Ionicons name="pencil" size={20} color="#cbd5e1" />
      </TouchableOpacity>
    </View>
  );
});

export default function ProductsListScreen() {
  const { token } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const fetchProducts = useCallback(
    async (forceRefresh = false) => {
      if (!token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setErrorMsg(null);
      try {
        const response = await (api as ApiInstance).cachedGet('/products/', { forceRefresh });
        const raw = response?.data?.results ?? response?.data;
        setProducts(Array.isArray(raw) ? raw : []);
      } catch (error: any) {
        if (error?.response?.status !== 401) {
          setErrorMsg(getErrorMessage(error, 'Failed to fetch products.'));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts(true);
  }, [fetchProducts]);

  const { productMap, searchTrie } = useMemo(() => {
    const safeProducts = Array.isArray(products) ? products : [];
    const map = new Map<number, any>();
    const trie = new ProductTrie();

    for (let i = 0; i < safeProducts.length; i++) {
      const p = safeProducts[i];
      if (!p || p.id == null) continue;
      map.set(p.id, p);
      if (p.name) trie.insert(String(p.name), p.id);
    }

    return { productMap: map, searchTrie: trie };
  }, [products]);

  const displayedProducts = useMemo(() => {
    const safeProducts = Array.isArray(products) ? products : [];
    if (!searchQuery.trim()) return safeProducts;

    const matchedIds = searchTrie.searchPrefix(searchQuery);
    if (!matchedIds) return safeProducts;

    const results: any[] = [];
    matchedIds.forEach((id) => {
      const p = productMap.get(id);
      if (p) results.push(p);
    });

    return results;
  }, [searchQuery, products, searchTrie, productMap]);

  const handleEdit = useCallback(
    (id: number) => {
      router.push({ pathname: '/(tabs)/products/new', params: { id: String(id) } });
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: any }) => <ProductItem item={item} onEdit={handleEdit} />,
    [handleEdit]
  );

  const keyExtractor = useCallback(
    (item: any, index: number) => (item?.id != null ? String(item.id) : `prod-${index}`),
    []
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Products</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search inventory..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {errorMsg ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity onPress={() => fetchProducts(true)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={displayedProducts}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {searchQuery ? `No products found matching "${searchQuery}"` : 'No products found.'}
            </Text>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(tabs)/products/new')}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    backgroundColor: '#1e293b',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    color: '#f8fafc',
    fontSize: 16,
  },
  errorBanner: {
    backgroundColor: '#450a0a',
    margin: 16,
    marginBottom: 0,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dc2626',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#fecaca',
    flex: 1,
    fontSize: 13,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 12,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  name: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  price: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  unit: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 'normal',
  },
  stock: {
    fontSize: 12,
    marginTop: 4,
  },
  editBtn: {
    padding: 8,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
