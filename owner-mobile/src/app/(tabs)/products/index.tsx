import React, { useEffect, useState, useCallback, memo, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import ModernSwitch from '../../../components/ModernSwitch';
import { useRouter } from 'expo-router';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '../../../context/AuthContext';
import { useAppTheme } from '../../../context/ThemeContext';
import { showAlert, showConfirm } from '../../../utils/alerts';
import UniversalCameraScanner from '../../../components/UniversalCameraScanner';
import { DraggableItem } from '../../../components/DraggableItem';

// ─── Search Trie for 0ms Prefix Search ───
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

// ─── Minimalist Executive Product Card ───
interface ProductCardProps {
  item: any;
  colors: any;
  isDark: boolean;
  onEdit: (id: number) => void;
  onQuickEdit: (item: any) => void;
  onStockDelta: (item: any, delta: number) => void;
  onDelete: (id: number, name: string) => void;
  reorderMode?: boolean;
  index?: number;
  totalCount?: number;
  onMoveProduct?: (index: number, direction: -1 | 1) => void;
  dragHandleProps?: any;
  isDragging?: boolean;
  isHoveredTarget?: boolean;
}

const ProductCard = memo(
  ({
    item,
    colors,
    isDark,
    onEdit,
    onQuickEdit,
    onStockDelta,
    onDelete,
    reorderMode,
    index,
    totalCount,
    onMoveProduct,
    dragHandleProps,
    isDragging,
    isHoveredTarget,
  }: ProductCardProps) => {
    const qty = Number(item?.stock_quantity ?? 0);
    const inStock = Boolean(item?.is_in_stock) && qty > 0;
    const isLowStock = inStock && qty <= 5;

    const regular = parseFloat(item?.regular_price ?? item?.price ?? 0);
    const offer = parseFloat(item?.offer_price ?? 0);
    const hasDiscount = offer > 0 && regular > offer;
    const discountPercent = hasDiscount
      ? Math.round(((regular - offer) / regular) * 100)
      : 0;

    const stockStatusLabel = !inStock
      ? 'Out of Stock'
      : isLowStock
        ? `Low (${qty})`
        : `${qty} in stock`;

    const stockDotColor = !inStock ? '#f43f5e' : isLowStock ? '#f59e0b' : '#10b981';

    const stockBadgeBg = !inStock
      ? isDark
        ? 'rgba(244, 63, 94, 0.16)'
        : '#fff1f2'
      : isLowStock
        ? isDark
          ? 'rgba(245, 158, 11, 0.16)'
          : '#fffbeb'
        : isDark
          ? 'rgba(16, 185, 129, 0.16)'
          : '#ecfdf5';

    const stockBadgeText = !inStock
      ? isDark
        ? '#fda4af'
        : '#be123c'
      : isLowStock
        ? isDark
          ? '#fcd34d'
          : '#b45309'
        : isDark
          ? '#6ee7b7'
          : '#047857';

    return (
      <View
        style={[
          styles.productCard,
          {
            backgroundColor: colors.card,
            borderColor: isDragging || isHoveredTarget ? '#10b981' : colors.border,
            borderWidth: isDragging || isHoveredTarget ? 2 : 1,
          },
        ]}
      >
        {/* Main Tappable Info Area (Tap to Open Full Editor) */}
        <TouchableOpacity
          style={styles.cardMainRow}
          activeOpacity={0.75}
          onPress={() => item?.id && onEdit(item.id)}
          accessibilityLabel={`Edit ${item?.name || 'Product'}`}
        >
          {/* Thumbnail Box */}
          <View
            style={[
              styles.cardThumbBox,
              {
                backgroundColor: colors.cardAlt,
                borderColor: colors.border,
              },
            ]}
          >
            {item?.image ? (
              <Image
                source={{ uri: item.image }}
                style={styles.cardImg}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            ) : (
              <Ionicons name="cube-outline" size={24} color={colors.textMuted} />
            )}

            {hasDiscount ? (
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>-{discountPercent}%</Text>
              </View>
            ) : null}
          </View>

          {/* Central Information */}
          <View style={styles.cardInfoBlock}>
            <Text
              style={[styles.productName, { color: colors.text }]}
              numberOfLines={2}
            >
              {item?.name || 'Unnamed Product'}
            </Text>

            <Text
              style={[styles.productMetaText, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {[item?.unit, item?.category_name].filter(Boolean).join(' · ') || 'General item'}
            </Text>

            <View style={styles.cardPriceRow}>
              <Text style={styles.offerPriceText}>
                ₹{item?.offer_price ? item.offer_price : (item?.regular_price ?? item?.price ?? '0.00')}
              </Text>
              {hasDiscount ? (
                <Text style={[styles.strikeThroughPrice, { color: colors.textMuted }]}>
                  ₹{item.regular_price}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Right Status Badge */}
          <View style={styles.cardRightBadgeCol}>
            <View style={[styles.stockStatusBadge, { backgroundColor: stockBadgeBg }]}>
              <View style={[styles.stockDot, { backgroundColor: stockDotColor }]} />
              <Text style={[styles.stockStatusText, { color: stockBadgeText }]}>
                {stockStatusLabel}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Card Controls Row: Quick Stepper & Symmetrical Action Buttons */}
        <View style={[styles.cardControlsRow, { borderTopColor: colors.border }]}>
          {/* Tactile Stock Stepper */}
          <View
            style={[
              styles.stepperPill,
              { backgroundColor: colors.cardAlt, borderColor: colors.border },
            ]}
          >
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => onStockDelta(item, -1)}
              disabled={qty <= 0}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Decrease stock by 1"
            >
              <Ionicons
                name="remove"
                size={14}
                color={qty > 0 ? colors.text : colors.textMuted}
              />
            </TouchableOpacity>

            <Text style={[styles.stepperValText, { color: colors.text }]}>
              {qty}
            </Text>

            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => onStockDelta(item, 1)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Increase stock by 1"
            >
              <Ionicons name="add" size={14} color="#10b981" />
            </TouchableOpacity>
          </View>

          {/* Delete Action */}
          <View style={styles.cardActionsGroup}>
            <TouchableOpacity
              style={[
                styles.miniActionBtn,
                {
                  backgroundColor: isDark ? 'rgba(244, 63, 94, 0.12)' : '#fff1f2',
                  borderColor: isDark ? 'rgba(244, 63, 94, 0.25)' : '#fecdd3',
                },
              ]}
              onPress={() => item?.id && onDelete(item.id, item?.name || 'Product')}
              accessibilityLabel="Delete Product"
            >
              <Ionicons name="trash-outline" size={15} color="#f43f5e" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Reorder Mode Controls (Visible only when catalog reordering is enabled) */}
        {reorderMode && (
          <View
            style={[
              styles.reorderStrip,
              {
                borderTopColor: colors.border,
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4',
              },
            ]}
          >
            <View
              {...(dragHandleProps || {})}
              style={[
                styles.reorderRankBox,
                {
                  backgroundColor: isDragging
                    ? '#10b981'
                    : isDark
                      ? 'rgba(16, 185, 129, 0.2)'
                      : '#dcfce7',
                  borderColor: isDragging
                    ? '#059669'
                    : isDark
                      ? 'rgba(16, 185, 129, 0.35)'
                      : '#bbf7d0',
                },
              ]}
              accessibilityLabel={`Drag handle for item order ${typeof index === 'number' ? index + 1 : 1}`}
            >
              <Ionicons
                name="reorder-two-outline"
                size={18}
                color={isDragging ? '#ffffff' : '#10b981'}
              />
              <Text
                style={[
                  styles.reorderRankText,
                  { color: isDragging ? '#ffffff' : colors.text },
                ]}
              >
                #{typeof index === 'number' ? index + 1 : 1}
              </Text>
              <Text
                style={[
                  styles.dragGripLabel,
                  { color: isDragging ? '#ffffff' : '#10b981' },
                ]}
              >
                Drag
              </Text>
            </View>

            <View style={styles.reorderBtnsRow}>
              <TouchableOpacity
                style={[
                  styles.reorderArrowBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: index === 0 ? 0.35 : 1,
                  },
                ]}
                onPress={() => onMoveProduct && typeof index === 'number' && onMoveProduct(index, -1)}
                disabled={index === 0}
                accessibilityLabel="Move Product Up"
              >
                <Ionicons
                  name="arrow-up"
                  size={14}
                  color={index === 0 ? colors.textMuted : '#10b981'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.reorderArrowBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity:
                      typeof index === 'number' &&
                      typeof totalCount === 'number' &&
                      index >= totalCount - 1
                        ? 0.35
                        : 1,
                  },
                ]}
                onPress={() => onMoveProduct && typeof index === 'number' && onMoveProduct(index, 1)}
                disabled={
                  typeof index === 'number' &&
                  typeof totalCount === 'number' &&
                  index >= totalCount - 1
                }
                accessibilityLabel="Move Product Down"
              >
                <Ionicons
                  name="arrow-down"
                  size={14}
                  color={
                    typeof index === 'number' &&
                    typeof totalCount === 'number' &&
                    index >= totalCount - 1
                      ? colors.textMuted
                      : '#10b981'
                  }
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }
);

// ─── Main Products List Screen ───
export default function ProductsListScreen() {
  const { token } = useAuth();
  const { isDark, colors } = useAppTheme();
  const router = useRouter();

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT'>('ALL');
  const [selectedCatId, setSelectedCatId] = useState<number | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'DEFAULT' | 'NAME' | 'PRICE_ASC' | 'PRICE_DESC' | 'STOCK_LOW'>('DEFAULT');
  const [reorderMode, setReorderMode] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quick Edit Bottom Sheet State
  const [quickEditProduct, setQuickEditProduct] = useState<any | null>(null);
  const [qePrice, setQePrice] = useState('');
  const [qeOfferPrice, setQeOfferPrice] = useState('');
  const [qeStock, setQeStock] = useState('');
  const [qeInStock, setQeInStock] = useState(true);
  const [savingQuickEdit, setSavingQuickEdit] = useState(false);

  // Barcode Scanner Modal State
  const [showScanner, setShowScanner] = useState(false);

  // Drag & Drop Catalog Reorder State
  const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const scrollOffsetRef = useRef<number>(0);
  const listRef = useRef<FlatList>(null);

  // Fetch Products & Categories
  const fetchProducts = useCallback(
    async (forceRefresh = false) => {
      if (!token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setErrorMsg(null);
      try {
        const [prodRes, catRes] = await Promise.allSettled([
          (api as ApiInstance).cachedGet('/products/', { forceRefresh }),
          api.get('/categories/'),
        ]);

        if (prodRes.status === 'fulfilled' && prodRes.value?.data) {
          const list = Array.isArray(prodRes.value.data)
            ? prodRes.value.data
            : prodRes.value.data.results || [];
          setProducts(list);
        } else if (prodRes.status === 'rejected') {
          setErrorMsg(getErrorMessage(prodRes.reason, 'Failed to load products.'));
        }

        if (catRes.status === 'fulfilled' && catRes.value?.data) {
          const catList = Array.isArray(catRes.value.data)
            ? catRes.value.data
            : catRes.value.data.results || [];
          setCategories(catList);
        }
      } catch (err: any) {
        setErrorMsg(getErrorMessage(err, 'Failed to fetch inventory.'));
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

  // Fast In-Line Stock Adjustments
  const handleStockDelta = useCallback(
    async (item: any, delta: number) => {
      const currentQty = Number(item?.stock_quantity ?? 0);
      const newQty = Math.max(0, currentQty + delta);
      const newInStock = newQty > 0;

      // Optimistic update
      setProducts((prev) =>
        prev.map((p) =>
          p.id === item.id
            ? { ...p, stock_quantity: newQty, is_in_stock: newInStock }
            : p
        )
      );

      try {
        await api.patch(`/products/${item.id}/`, {
          stock_quantity: newQty,
          is_in_stock: newInStock,
        });
        (api as ApiInstance).clearCache();
      } catch (err: any) {
        // Revert on error
        setProducts((prev) =>
          prev.map((p) => (p.id === item.id ? item : p))
        );
        showAlert('Error', getErrorMessage(err, 'Failed to update stock.'));
      }
    },
    []
  );

  const handleDelete = useCallback(
    (id: number, name: string) => {
      showConfirm(
        'Delete Product',
        `Are you sure you want to permanently delete "${name}"?`,
        async () => {
          try {
            await api.delete(`/products/${id}/`);
            (api as ApiInstance).clearCache();
            setProducts((prev) => prev.filter((p) => p.id !== id));
            showAlert('Deleted', `"${name}" removed from inventory.`);
          } catch (e: any) {
            showAlert('Error', getErrorMessage(e, 'Failed to delete product.'));
          }
        },
        undefined,
        'Delete'
      );
    },
    []
  );

  // Reorder Handler
  const reorderProduct = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= products.length ||
        toIndex >= products.length
      ) {
        return;
      }

      const updated = [...products];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      setProducts(updated);

      try {
        const updates = updated.map((item, idx) => ({ id: item.id, display_order: idx }));
        await api.post('/products/reorder/', updates);
        (api as ApiInstance).clearCache();
      } catch (err: any) {
        fetchProducts(true);
        showAlert('Error', getErrorMessage(err, 'Failed to save product order.'));
      }
    },
    [products, fetchProducts]
  );

  const moveProduct = useCallback(
    (index: number, direction: -1 | 1) => {
      reorderProduct(index, index + direction);
    },
    [reorderProduct]
  );

  const toggleReorderMode = useCallback(() => {
    if (!reorderMode) {
      if (searchQuery || selectedCatId !== 'ALL' || stockFilter !== 'ALL' || sortBy !== 'DEFAULT') {
        setSearchQuery('');
        setSelectedCatId('ALL');
        setStockFilter('ALL');
        setSortBy('DEFAULT');
        showAlert(
          'Reorder Mode',
          'Catalog filters cleared to show master display order. Hold and drag items to rearrange.'
        );
      }
    }
    setReorderMode((prev) => !prev);
  }, [reorderMode, searchQuery, selectedCatId, stockFilter, sortBy]);

  // Quick Edit Bottom Sheet Handlers
  const openQuickEdit = useCallback((item: any) => {
    setQuickEditProduct(item);
    setQePrice(String(item?.regular_price ?? item?.price ?? ''));
    setQeOfferPrice(item?.offer_price ? String(item.offer_price) : '');
    setQeStock(String(item?.stock_quantity ?? '0'));
    setQeInStock(Boolean(item?.is_in_stock));
  }, []);

  const handleSaveQuickEdit = async () => {
    if (!quickEditProduct?.id) return;
    setSavingQuickEdit(true);
    try {
      const patchData: any = {
        regular_price: qePrice,
        offer_price: qeOfferPrice ? qeOfferPrice : null,
        stock_quantity: parseInt(qeStock, 10) || 0,
        is_in_stock: qeInStock,
      };

      const res = await api.patch(`/products/${quickEditProduct.id}/`, patchData);
      (api as ApiInstance).clearCache();

      if (res?.data) {
        setProducts((prev) =>
          prev.map((p) => (p.id === quickEditProduct.id ? res.data : p))
        );
      }
      setQuickEditProduct(null);
      showAlert('Success', 'Product updated successfully!');
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to update product.'));
    } finally {
      setSavingQuickEdit(false);
    }
  };

  // Barcode Scanner Handler
  const handleBarcodeScan = (scannedSku: string) => {
    setShowScanner(false);
    const clean = scannedSku.trim();
    if (!clean) return;

    const found = products.find(
      (p) => String(p?.sku || '').trim().toLowerCase() === clean.toLowerCase()
    );

    if (found) {
      setSearchQuery(found.name);
      openQuickEdit(found);
    } else {
      showConfirm(
        'Product Not Found',
        `Barcode "${clean}" is not in your inventory yet.\n\nWould you like to add it as a new product now?`,
        () => {
          router.push({
            pathname: '/(tabs)/products/new',
            params: { sku: clean },
          });
        },
        undefined,
        'Add Product'
      );
    }
  };

  // Search Trie & Indexing
  const { productMap, searchTrie } = useMemo(() => {
    const safeProducts = Array.isArray(products) ? products : [];
    const map = new Map<number, any>();
    const trie = new ProductTrie();

    for (let i = 0; i < safeProducts.length; i++) {
      const p = safeProducts[i];
      if (!p || p.id == null) continue;
      map.set(p.id, p);
      if (p.name) trie.insert(String(p.name), p.id);
      if (p.sku) trie.insert(String(p.sku), p.id);
      if (p.brand) trie.insert(String(p.brand), p.id);
      if (p.category_name) trie.insert(String(p.category_name), p.id);
    }

    return { productMap: map, searchTrie: trie };
  }, [products]);

  // Real-time Inventory Metrics
  const stats = useMemo(() => {
    const safe = Array.isArray(products) ? products : [];
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    for (let i = 0; i < safe.length; i++) {
      const p = safe[i];
      const qty = Number(p?.stock_quantity ?? 0);
      const isAvailable = Boolean(p?.is_in_stock) && qty > 0;
      if (isAvailable) {
        inStock++;
        if (qty <= 5) lowStock++;
      } else {
        outOfStock++;
      }
    }

    return {
      total: safe.length,
      inStock,
      lowStock,
      outOfStock,
    };
  }, [products]);

  // Filtered & Sorted Product List
  const displayedProducts = useMemo(() => {
    const safeProducts = Array.isArray(products) ? products : [];
    let baseList = safeProducts;

    // Search query matching via Trie
    if (searchQuery.trim()) {
      const matchedIds = searchTrie.searchPrefix(searchQuery);
      if (matchedIds) {
        baseList = Array.from(matchedIds)
          .map((id) => productMap.get(id))
          .filter(Boolean);
      } else {
        const q = searchQuery.toLowerCase().trim();
        baseList = baseList.filter((p) => {
          if (!p) return false;
          return (
            String(p.name || '').toLowerCase().includes(q) ||
            String(p.sku || '').toLowerCase().includes(q) ||
            String(p.brand || '').toLowerCase().includes(q) ||
            String(p.category_name || '').toLowerCase().includes(q)
          );
        });
      }
    }

    // Category filter
    if (selectedCatId !== 'ALL') {
      baseList = baseList.filter((p) => p?.category === selectedCatId);
    }

    // Stock status filter
    baseList = baseList.filter((p) => {
      if (!p) return false;
      const qty = Number(p.stock_quantity ?? 0);
      const inStock = Boolean(p.is_in_stock) && qty > 0;
      if (stockFilter === 'IN_STOCK') return inStock;
      if (stockFilter === 'LOW_STOCK') return inStock && qty <= 5;
      if (stockFilter === 'OUT') return !inStock;
      return true;
    });

    // Sorting
    if (sortBy === 'NAME') {
      baseList = [...baseList].sort((a, b) =>
        String(a?.name || '').localeCompare(String(b?.name || ''))
      );
    } else if (sortBy === 'PRICE_ASC') {
      baseList = [...baseList].sort(
        (a, b) =>
          parseFloat(a?.offer_price || a?.regular_price || 0) -
          parseFloat(b?.offer_price || b?.regular_price || 0)
      );
    } else if (sortBy === 'PRICE_DESC') {
      baseList = [...baseList].sort(
        (a, b) =>
          parseFloat(b?.offer_price || b?.regular_price || 0) -
          parseFloat(a?.offer_price || a?.regular_price || 0)
      );
    } else if (sortBy === 'STOCK_LOW') {
      baseList = [...baseList].sort(
        (a, b) => Number(a?.stock_quantity ?? 0) - Number(b?.stock_quantity ?? 0)
      );
    }

    return baseList;
  }, [searchQuery, products, searchTrie, productMap, selectedCatId, stockFilter, sortBy]);

  const handleEdit = useCallback(
    (id: number) => {
      router.push({ pathname: '/(tabs)/products/new', params: { id: String(id) } });
    },
    [router]
  );

  // ─── Compact Executive Header ───
  const stickyHeader = useMemo(
    () => (
      <View
        style={[
          styles.stickyHeaderWrap,
          {
            backgroundColor: colors.bg,
            borderBottomColor: colors.border,
          },
        ]}
      >
        {/* 1. Header Bar: Title, Count & Action Buttons */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
            style={styles.titleRow}
          >
            <Text style={[styles.pageTitle, { color: colors.text }]}>Inventory</Text>
            <View
              style={[
                styles.countBadge,
                { backgroundColor: colors.cardAlt, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.countBadgeText, { color: colors.textMuted }]}>
                {products.length} SKUs
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={[
                styles.reorderToggleBtn,
                {
                  backgroundColor: reorderMode ? '#10b981' : colors.card,
                  borderColor: reorderMode ? '#10b981' : colors.border,
                },
              ]}
              onPress={toggleReorderMode}
              accessibilityLabel="Toggle Reorder Mode"
            >
              <Ionicons
                name={reorderMode ? 'checkmark-done' : 'swap-vertical-outline'}
                size={16}
                color={reorderMode ? '#ffffff' : colors.text}
              />
              <Text
                style={[
                  styles.reorderToggleBtnText,
                  { color: reorderMode ? '#ffffff' : colors.text },
                ]}
              >
                {reorderMode ? 'Done' : 'Reorder'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryAddBtn, { backgroundColor: '#10b981' }]}
              onPress={() => router.push('/(tabs)/products/new')}
              accessibilityLabel="Add New Product"
            >
              <Ionicons name="add" size={18} color="#ffffff" />
              <Text style={styles.primaryAddBtnText}>New</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Unified Search & Sort Command Bar */}
        <View style={styles.searchBarRow}>
          <View
            style={[
              styles.searchBarPill,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="search-outline" size={17} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search by name, brand, or SKU..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.searchScanIconBtn}
              onPress={() => setShowScanner(true)}
              accessibilityLabel="Scan Barcode"
            >
              <Ionicons name="barcode-outline" size={20} color="#10b981" />
            </TouchableOpacity>
          </View>

          {/* Cycle Sort Button */}
          <TouchableOpacity
            style={[
              styles.sortBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => {
              const modes: Array<'DEFAULT' | 'NAME' | 'PRICE_ASC' | 'PRICE_DESC' | 'STOCK_LOW'> = [
                'DEFAULT',
                'NAME',
                'PRICE_ASC',
                'PRICE_DESC',
                'STOCK_LOW',
              ];
              const nextIdx = (modes.indexOf(sortBy) + 1) % modes.length;
              setSortBy(modes[nextIdx]);
            }}
          >
            <Ionicons name="filter-outline" size={15} color={colors.text} />
            <Text style={[styles.sortBtnText, { color: colors.text }]}>
              {sortBy === 'NAME'
                ? 'A-Z'
                : sortBy === 'PRICE_ASC'
                  ? 'Price ↑'
                  : sortBy === 'PRICE_DESC'
                    ? 'Price ↓'
                    : sortBy === 'STOCK_LOW'
                      ? 'Stock ↑'
                      : 'Sort'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. Streamlined Status & Category Capsule Strip */}
        <View style={styles.filterScrollWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {/* Quick Status Filter Pills with Live Item Counts */}
            <TouchableOpacity
              style={[
                styles.filterPill,
                stockFilter === 'ALL' && selectedCatId === 'ALL'
                  ? { backgroundColor: isDark ? '#ffffff' : '#0f172a' }
                  : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
              ]}
              onPress={() => {
                setStockFilter('ALL');
                setSelectedCatId('ALL');
              }}
            >
              <Text
                style={[
                  styles.filterPillText,
                  {
                    color:
                      stockFilter === 'ALL' && selectedCatId === 'ALL'
                        ? isDark
                          ? '#0f172a'
                          : '#ffffff'
                        : colors.textMuted,
                    fontWeight: stockFilter === 'ALL' && selectedCatId === 'ALL' ? '800' : '600',
                  },
                ]}
              >
                All ({stats.total})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                stockFilter === 'LOW_STOCK'
                  ? { backgroundColor: '#f59e0b' }
                  : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
              ]}
              onPress={() => setStockFilter(stockFilter === 'LOW_STOCK' ? 'ALL' : 'LOW_STOCK')}
            >
              <View style={styles.pillWithDot}>
                <View
                  style={[
                    styles.miniDot,
                    { backgroundColor: stockFilter === 'LOW_STOCK' ? '#ffffff' : '#f59e0b' },
                  ]}
                />
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: stockFilter === 'LOW_STOCK' ? '#ffffff' : colors.textMuted,
                      fontWeight: stockFilter === 'LOW_STOCK' ? '800' : '600',
                    },
                  ]}
                >
                  Low ({stats.lowStock})
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                stockFilter === 'OUT'
                  ? { backgroundColor: '#f43f5e' }
                  : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
              ]}
              onPress={() => setStockFilter(stockFilter === 'OUT' ? 'ALL' : 'OUT')}
            >
              <View style={styles.pillWithDot}>
                <View
                  style={[
                    styles.miniDot,
                    { backgroundColor: stockFilter === 'OUT' ? '#ffffff' : '#f43f5e' },
                  ]}
                />
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: stockFilter === 'OUT' ? '#ffffff' : colors.textMuted,
                      fontWeight: stockFilter === 'OUT' ? '800' : '600',
                    },
                  ]}
                >
                  Out ({stats.outOfStock})
                </Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.filterStripDivider, { backgroundColor: colors.border }]} />

            {/* Categories */}
            {categories.map((cat) => {
              const active = selectedCatId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.filterPill,
                    active
                      ? { backgroundColor: isDark ? '#ffffff' : '#0f172a' }
                      : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
                  ]}
                  onPress={() => setSelectedCatId(active ? 'ALL' : cat.id)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color: active
                          ? isDark
                            ? '#0f172a'
                            : '#ffffff'
                          : colors.textMuted,
                        fontWeight: active ? '800' : '600',
                      },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    ),
    [
      colors,
      isDark,
      products.length,
      searchQuery,
      sortBy,
      reorderMode,
      categories,
      selectedCatId,
      stockFilter,
      stats,
      toggleReorderMode,
      router,
    ]
  );

  // ─── Compact List Header (Banners Only) ───
  const listHeader = useMemo(
    () => (
      <View style={styles.topSectionWrap}>
        {errorMsg ? (
          <View style={styles.errorBannerWrap}>
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMsg}</Text>
              <TouchableOpacity onPress={() => fetchProducts(true)}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {reorderMode && (
          <View
            style={[
              styles.reorderActiveBanner,
              {
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
                borderColor: '#10b981',
              },
            ]}
          >
            <Ionicons name="swap-vertical" size={18} color="#10b981" />
            <Text
              style={{
                fontSize: 13,
                color: isDark ? '#a7f3d0' : '#065f46',
                fontWeight: '600',
                flex: 1,
              }}
            >
              Reorder Mode: Hold & drag items to arrange, or tap arrows.
            </Text>
            <TouchableOpacity onPress={toggleReorderMode} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 13 }}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    ),
    [colors, isDark, errorMsg, reorderMode, fetchProducts, toggleReorderMode]
  );

  const renderItem = useCallback(
    ({ item, index }: any) => {
      if (reorderMode) {
        return (
          <DraggableItem
            index={index}
            totalCount={displayedProducts.length}
            enabled={reorderMode}
            itemHeight={150}
            listRef={listRef}
            scrollOffsetRef={scrollOffsetRef}
            activeDragIndex={activeDragIndex}
            hoverIndex={hoverIndex}
            onDragStart={(idx) => {
              setActiveDragIndex(idx);
            }}
            onHoverChange={(idx) => {
              setHoverIndex(idx);
            }}
            onDrop={(fromIdx, toIdx) => {
              setActiveDragIndex(null);
              setHoverIndex(null);
              if (fromIdx !== toIdx) {
                reorderProduct(fromIdx, toIdx);
              }
            }}
          >
            {({ dragHandleProps, isDragging, isHoveredTarget }) => (
              <ProductCard
                item={item}
                colors={colors}
                isDark={isDark}
                onEdit={handleEdit}
                onQuickEdit={openQuickEdit}
                onStockDelta={handleStockDelta}
                onDelete={handleDelete}
                reorderMode={reorderMode}
                index={index}
                totalCount={displayedProducts.length}
                onMoveProduct={moveProduct}
                dragHandleProps={dragHandleProps}
                isDragging={isDragging}
                isHoveredTarget={isHoveredTarget}
              />
            )}
          </DraggableItem>
        );
      }

      return (
        <ProductCard
          item={item}
          colors={colors}
          isDark={isDark}
          onEdit={handleEdit}
          onQuickEdit={openQuickEdit}
          onStockDelta={handleStockDelta}
          onDelete={handleDelete}
          reorderMode={false}
          index={index}
          totalCount={displayedProducts.length}
        />
      );
    },
    [
      colors,
      isDark,
      handleEdit,
      openQuickEdit,
      handleStockDelta,
      handleDelete,
      reorderMode,
      displayedProducts.length,
      activeDragIndex,
      hoverIndex,
      reorderProduct,
      moveProduct,
    ]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.maxContainer}>
        {/* Sticky Executive Command Bar */}
        {stickyHeader}

        {loading && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Loading inventory...
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={displayedProducts}
            keyExtractor={(item, idx) =>
              item?.id != null ? String(item.id) : `prod-${idx}`
            }
            renderItem={renderItem}
            ListHeaderComponent={listHeader}
            contentContainerStyle={styles.listContent}
            onScroll={(e) => {
              scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#10b981"
              />
            }
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="cube-outline" size={44} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No products found
                </Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                  {searchQuery || stockFilter !== 'ALL' || selectedCatId !== 'ALL'
                    ? 'Try clearing active filters or search terms.'
                    : 'Tap "+ New" above to add your first product.'}
                </Text>
                {(searchQuery || stockFilter !== 'ALL' || selectedCatId !== 'ALL') && (
                  <TouchableOpacity
                    style={[styles.clearFilterBtn, { borderColor: colors.border }]}
                    onPress={() => {
                      setSearchQuery('');
                      setStockFilter('ALL');
                      setSelectedCatId('ALL');
                    }}
                  >
                    <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 13 }}>
                      Reset All Filters
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}
      </View>

      {/* ─── Modern iOS-Style Slide-Up Quick Edit Bottom Sheet ─── */}
      <Modal
        visible={Boolean(quickEditProduct)}
        transparent
        animationType="slide"
        onRequestClose={() => setQuickEditProduct(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetBackdrop}
        >
          <TouchableOpacity
            style={styles.sheetBackdropDismiss}
            activeOpacity={1}
            onPress={() => setQuickEditProduct(null)}
          />
          <View
            style={[
              styles.bottomSheetCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Top Indicator Capsule */}
            <View style={[styles.sheetDragPill, { backgroundColor: colors.border }]} />

            {/* Sheet Header */}
            <View style={styles.sheetHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetTitle, { color: colors.text }]} numberOfLines={1}>
                  {quickEditProduct?.name || 'Quick Edit'}
                </Text>
                <Text style={[styles.sheetSub, { color: colors.textMuted }]}>
                  {quickEditProduct?.category_name || 'Inventory item'}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.sheetCloseBtn,
                  { backgroundColor: colors.cardAlt, borderColor: colors.border },
                ]}
                onPress={() => setQuickEditProduct(null)}
              >
                <Ionicons name="close" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Sheet Form Body */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetBody}>
              {/* Stock Quantity Stepper */}
              <View style={styles.sheetSection}>
                <Text style={[styles.sheetSectionLabel, { color: colors.textMuted }]}>
                  Stock Quantity (Units)
                </Text>
                <View style={styles.sheetStockRow}>
                  <TouchableOpacity
                    style={[
                      styles.sheetStockStepBtn,
                      { backgroundColor: colors.cardAlt, borderColor: colors.border },
                    ]}
                    onPress={() => {
                      const cur = parseInt(qeStock, 10) || 0;
                      setQeStock(String(Math.max(0, cur - 1)));
                    }}
                  >
                    <Ionicons name="remove" size={18} color={colors.text} />
                  </TouchableOpacity>

                  <TextInput
                    style={[
                      styles.sheetStockInput,
                      {
                        backgroundColor: colors.cardAlt,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    keyboardType="numeric"
                    value={qeStock}
                    onChangeText={setQeStock}
                  />

                  <TouchableOpacity
                    style={[
                      styles.sheetStockStepBtn,
                      { backgroundColor: colors.cardAlt, borderColor: colors.border },
                    ]}
                    onPress={() => {
                      const cur = parseInt(qeStock, 10) || 0;
                      setQeStock(String(cur + 1));
                    }}
                  >
                    <Ionicons name="add" size={18} color="#10b981" />
                  </TouchableOpacity>
                </View>

                {/* Quick Add Chips */}
                <View style={styles.sheetQuickChipsRow}>
                  {[5, 10, 25, 50].map((addAmount) => (
                    <TouchableOpacity
                      key={addAmount}
                      style={[
                        styles.sheetQuickChip,
                        { backgroundColor: colors.cardAlt, borderColor: colors.border },
                      ]}
                      onPress={() => {
                        const cur = parseInt(qeStock, 10) || 0;
                        setQeStock(String(cur + addAmount));
                      }}
                    >
                      <Text style={[styles.sheetQuickChipText, { color: colors.text }]}>
                        +{addAmount}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Price & Offer Price in a 2-Column Grid */}
              <View style={styles.sheetInputsGrid}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={[styles.sheetSectionLabel, { color: colors.textMuted }]}>
                    Regular Price (₹)
                  </Text>
                  <TextInput
                    style={[
                      styles.sheetTextInput,
                      {
                        backgroundColor: colors.cardAlt,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    keyboardType="decimal-pad"
                    value={qePrice}
                    onChangeText={setQePrice}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={[styles.sheetSectionLabel, { color: colors.textMuted }]}>
                    Offer Price (₹)
                  </Text>
                  <TextInput
                    style={[
                      styles.sheetTextInput,
                      {
                        backgroundColor: colors.cardAlt,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    keyboardType="decimal-pad"
                    value={qeOfferPrice}
                    onChangeText={setQeOfferPrice}
                    placeholder="Optional"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              {/* In-Stock Switch */}
              <View style={[styles.sheetSwitchRow, { borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetSwitchTitle, { color: colors.text }]}>
                    Available in Store
                  </Text>
                  <Text style={[styles.sheetSwitchSub, { color: colors.textMuted }]}>
                    Customers can see and order this item
                  </Text>
                </View>
                <ModernSwitch value={qeInStock} onValueChange={setQeInStock} />
              </View>

              {/* Primary Action Button */}
              <View style={styles.sheetBtnsRow}>
                <TouchableOpacity
                  style={[styles.sheetSaveBtn, { backgroundColor: '#10b981' }]}
                  onPress={handleSaveQuickEdit}
                  disabled={savingQuickEdit}
                >
                  {savingQuickEdit ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={17} color="#ffffff" />
                      <Text style={styles.sheetSaveBtnText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Direct Link to Full Editor */}
              <TouchableOpacity
                style={styles.sheetFullEditLink}
                onPress={() => {
                  const id = quickEditProduct?.id;
                  setQuickEditProduct(null);
                  if (id) {
                    router.push({
                      pathname: '/(tabs)/products/new',
                      params: { id: String(id) },
                    });
                  }
                }}
              >
                <Ionicons name="open-outline" size={14} color="#3b82f6" />
                <Text style={styles.sheetFullEditLinkText}>
                  Open full product editor (photos, description, SKU)
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Barcode Scanner Modal ─── */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        {showScanner && (
          <UniversalCameraScanner
            title="Scan Product Barcode"
            subtitle="Align barcode within frame to find or add item"
            onScan={handleBarcodeScan}
            onClose={() => setShowScanner(false)}
          />
        )}
      </Modal>
    </View>
  );
}

// ─── Stylesheet ───
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  maxContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  centered: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },

  // Sticky Header
  stickyHeaderWrap: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    zIndex: 10,
    gap: 8,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reorderToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6.5,
    borderRadius: 9,
    borderWidth: 1,
  },
  reorderToggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  primaryAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 9,
  },
  primaryAddBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },

  // Search & Tool Bar
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBarPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
    height: '100%',
  },
  searchScanIconBtn: {
    padding: 3,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Filter Strip
  filterScrollWrap: {
    marginHorizontal: -16,
  },
  filterScroll: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingBottom: 2,
  },
  filterPill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillText: {
    fontSize: 11.5,
  },
  pillWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterStripDivider: {
    width: 1,
    height: 14,
    marginHorizontal: 3,
  },

  // Banners
  topSectionWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  errorBannerWrap: {
    marginBottom: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  errorText: {
    color: '#be123c',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  retryText: {
    color: '#be123c',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 8,
  },
  reorderActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },

  // List Content
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 90,
  },

  // ─── Product Card ───
  productCard: {
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  cardThumbBox: {
    width: 58,
    height: 58,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  cardImg: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#f43f5e',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderBottomRightRadius: 6,
  },
  discountBadgeText: {
    color: '#ffffff',
    fontSize: 8.5,
    fontWeight: '900',
  },
  cardInfoBlock: {
    flex: 1,
    gap: 2,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  productMetaText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  cardPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
  },
  offerPriceText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10b981',
  },
  strikeThroughPrice: {
    fontSize: 11.5,
    textDecorationLine: 'line-through',
  },
  cardRightBadgeCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  stockStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    paddingHorizontal: 7.5,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  stockDot: {
    width: 5.5,
    height: 5.5,
    borderRadius: 3,
  },
  stockStatusText: {
    fontSize: 10.5,
    fontWeight: '800',
  },

  // Card Controls Row
  cardControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderTopWidth: 1,
  },
  stepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValText: {
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
    minWidth: 26,
    textAlign: 'center',
  },
  cardActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  miniActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Reorder Controls
  reorderStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  reorderRankBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  reorderRankText: {
    fontSize: 11,
    fontWeight: '800',
  },
  dragGripLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 2,
  },
  reorderBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  reorderArrowBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  clearFilterBtn: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },

  // ─── Modern Slide-Up Bottom Sheet ───
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheetBackdropDismiss: {
    flex: 1,
  },
  bottomSheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 18,
    maxHeight: '85%',
  },
  sheetDragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sheetSub: {
    fontSize: 12,
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {
    gap: 16,
    paddingBottom: 10,
  },
  sheetSection: {
    gap: 8,
  },
  sheetSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  sheetStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetStockStepBtn: {
    width: 44,
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetStockInput: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
  },
  sheetQuickChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sheetQuickChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  sheetQuickChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sheetInputsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  sheetTextInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  sheetSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  sheetSwitchTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  sheetSwitchSub: {
    fontSize: 11.5,
    marginTop: 1,
  },
  sheetBtnsRow: {
    paddingTop: 4,
  },
  sheetSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: 12,
  },
  sheetSaveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  sheetFullEditLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  sheetFullEditLinkText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#3b82f6',
  },
});
