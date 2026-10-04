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

// ─── Interactive Product Card Component ───
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

    return (
      <View
        style={[
          styles.productCard,
          {
            backgroundColor: colors.card,
            borderColor: isDragging
              ? '#10b981'
              : isHoveredTarget
                ? '#10b981'
                : isLowStock
                  ? isDark
                    ? 'rgba(245, 158, 11, 0.4)'
                    : '#fde68a'
                  : !inStock
                    ? isDark
                      ? 'rgba(244, 63, 94, 0.35)'
                      : '#fecdd3'
                    : colors.border,
            borderWidth: isDragging || isHoveredTarget ? 2 : 1,
          },
        ]}
      >
        {/* Card Main Row: Thumbnail + Details (Tap to Open Full Editor) */}
        <TouchableOpacity
          style={styles.cardMainRow}
          activeOpacity={0.7}
          onPress={() => item?.id && onEdit(item.id)}
          accessibilityLabel={`Edit ${item?.name || 'Product'}`}
        >
          {/* Thumbnail Box with Discount Ribbon */}
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
              <Ionicons name="cube-outline" size={26} color={colors.textMuted} />
            )}

            {hasDiscount ? (
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>-{discountPercent}%</Text>
              </View>
            ) : null}
          </View>

          {/* Product Info Block */}
          <View style={styles.cardInfoBlock}>
            <View style={styles.titleRowWrap}>
              <Text
                style={[styles.productName, { color: colors.text }]}
                numberOfLines={2}
              >
                {item?.name || 'Unnamed Product'}
              </Text>
            </View>

            {/* Badges: Category, Unit, SKU */}
            <View style={styles.tagsRow}>
              {item?.category_name ? (
                <View
                  style={[
                    styles.tagPill,
                    {
                      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.14)' : '#eff6ff',
                      borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe',
                    },
                  ]}
                >
                  <Text style={[styles.tagPillText, { color: isDark ? '#93c5fd' : '#2563eb' }]}>
                    {item.category_name}
                  </Text>
                </View>
              ) : null}

              {item?.unit ? (
                <View
                  style={[
                    styles.tagPill,
                    {
                      backgroundColor: colors.cardAlt,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.tagPillText, { color: colors.textMuted }]}>
                    {item.unit}
                  </Text>
                </View>
              ) : null}

              {item?.sku ? (
                <View
                  style={[
                    styles.tagPill,
                    {
                      backgroundColor: colors.cardAlt,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons name="barcode-outline" size={10} color={colors.textMuted} />
                  <Text style={[styles.tagPillText, { color: colors.textMuted }]}>
                    {item.sku}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Pricing Line */}
            <View style={styles.cardPriceRow}>
              <Text style={styles.offerPriceText}>
                ₹{item?.offer_price ? item.offer_price : item?.regular_price ?? item?.price ?? '0.00'}
              </Text>
              {hasDiscount ? (
                <Text style={[styles.strikeThroughPrice, { color: colors.textMuted }]}>
                  ₹{item.regular_price}
                </Text>
              ) : null}

              {/* Status Pill */}
              <View
                style={[
                  styles.stockStatusBadge,
                  {
                    backgroundColor: inStock
                      ? isLowStock
                        ? isDark
                          ? 'rgba(245, 158, 11, 0.16)'
                          : '#fef3c7'
                        : isDark
                          ? 'rgba(16, 185, 129, 0.16)'
                          : '#ecfdf5'
                      : isDark
                        ? 'rgba(244, 63, 94, 0.16)'
                        : '#fff1f2',
                  },
                ]}
              >
                <View
                  style={[
                    styles.stockDot,
                    {
                      backgroundColor: inStock
                        ? isLowStock
                          ? '#f59e0b'
                          : '#10b981'
                        : '#f43f5e',
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.stockStatusText,
                    {
                      color: inStock
                        ? isLowStock
                          ? isDark
                            ? '#fcd34d'
                            : '#b45309'
                          : isDark
                            ? '#6ee7b7'
                            : '#047857'
                        : isDark
                          ? '#fda4af'
                          : '#be123c',
                    },
                  ]}
                >
                  {inStock
                    ? isLowStock
                      ? `Low: ${qty} left`
                      : `${qty} in stock`
                    : 'Out of Stock'}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Card Interactive Footer Bar: Stepper & Clean Actions */}
        <View
          style={[
            styles.cardFooterBar,
            {
              borderTopColor: colors.border,
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(248, 250, 252, 0.8)',
            },
          ]}
        >
          {/* Quick Stock +/- Stepper */}
          <View style={styles.stepperContainer}>
            <Text style={[styles.stepperLabel, { color: colors.textMuted }]}>Stock:</Text>
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
                accessibilityLabel="Decrease stock"
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
                onPress={() => onStockDelta(item, +1)}
                accessibilityLabel="Increase stock"
              >
                <Ionicons name="add" size={14} color="#10b981" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Actions Right: Single Edit Button + Delete */}
          <View style={styles.cardActionsRight}>
            <TouchableOpacity
              style={[
                styles.quickActionBtn,
                { backgroundColor: colors.cardAlt, borderColor: colors.border },
              ]}
              onPress={() => onQuickEdit(item)}
              accessibilityLabel="Edit Product"
            >
              <Ionicons name="create-outline" size={14} color="#3b82f6" />
              <Text style={[styles.quickActionText, { color: colors.text }]}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.iconMiniBtn,
                { backgroundColor: isDark ? 'rgba(244, 63, 94, 0.12)' : '#fff1f2' },
              ]}
              onPress={() => item?.id && onDelete(item.id, item?.name || 'Product')}
              accessibilityLabel="Delete Product"
            >
              <Ionicons name="trash-outline" size={14} color="#f43f5e" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Reorder Controls Strip (Active when catalog reordering is toggled) */}
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
            {/* Interactive Drag Handle */}
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
                size={20}
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
                Hold & Drag ☰
              </Text>
            </View>

            {/* Quick 1-step nudge buttons */}
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
                <Text
                  style={[
                    styles.reorderBtnLabel,
                    { color: index === 0 ? colors.textMuted : '#10b981' },
                  ]}
                >
                  Up
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.reorderArrowBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: index === (totalCount ?? 0) - 1 ? 0.35 : 1,
                  },
                ]}
                onPress={() => onMoveProduct && typeof index === 'number' && onMoveProduct(index, 1)}
                disabled={index === (totalCount ?? 0) - 1}
                accessibilityLabel="Move Product Down"
              >
                <Ionicons
                  name="arrow-down"
                  size={14}
                  color={index === (totalCount ?? 0) - 1 ? colors.textMuted : '#10b981'}
                />
                <Text
                  style={[
                    styles.reorderBtnLabel,
                    {
                      color:
                        index === (totalCount ?? 0) - 1 ? colors.textMuted : '#10b981',
                    },
                  ]}
                >
                  Down
                </Text>
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

  // Quick Edit Modal State
  const [quickEditProduct, setQuickEditProduct] = useState<any | null>(null);
  const [qePrice, setQePrice] = useState('');
  const [qeOfferPrice, setQeOfferPrice] = useState('');
  const [qeStock, setQeStock] = useState('');
  const [qeInStock, setQeInStock] = useState(true);
  const [savingQuickEdit, setSavingQuickEdit] = useState(false);

  // Barcode Scanner Modal State
  const [showScanner, setShowScanner] = useState(false);

  // Drag and Drop Catalog Reorder State
  const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const scrollOffsetRef = useRef<number>(0);

  // ─── List Reference ───
  const listRef = useRef<FlatList>(null);

  // ─── Fetch Products & Categories ───
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
          const raw = prodRes.value.data?.results ?? prodRes.value.data;
          setProducts(Array.isArray(raw) ? raw : []);
        } else if (prodRes.status === 'rejected') {
          const err = prodRes.reason;
          if (err?.response?.status !== 401) {
            setErrorMsg(getErrorMessage(err, 'Failed to fetch products.'));
          }
        }

        if (catRes.status === 'fulfilled' && catRes.value?.data) {
          const rawCats = catRes.value.data?.results ?? catRes.value.data;
          setCategories(Array.isArray(rawCats) ? rawCats : []);
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

  // ─── Fast In-Line Stock Adjustments ───
  const handleStockDelta = useCallback(
    async (item: any, delta: number) => {
      const currentQty = Number(item?.stock_quantity ?? 0);
      const newQty = Math.max(0, currentQty + delta);
      const newInStock = newQty > 0;

      // Optimistic state update for instant UI feedback
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

  // ─── Catalog Products Reorder Handler (Drag & Drop + Quick Nudge) ───
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
          'Catalog filters cleared to show master display order. Hold and drag items by ☰ to rearrange products.'
        );
      }
    }
    setReorderMode((prev) => !prev);
  }, [reorderMode, searchQuery, selectedCatId, stockFilter, sortBy]);

  // ─── Quick Edit Modal Handlers ───
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

  // ─── Barcode Scanner Handler ───
  const handleBarcodeScan = (scannedSku: string) => {
    setShowScanner(false);
    const clean = scannedSku.trim();
    if (!clean) return;

    // Search in current product list
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

  // ─── Search Trie & Indexing ───
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

  // ─── Metrics / KPIs ───
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

  // ─── 4 Interactive KPI Cards Configuration with Effects ───
  const kpiCards = useMemo(
    () => [
      {
        key: 'ALL' as const,
        label: 'Total',
        icon: 'cube-outline' as const,
        color: '#3b82f6',
        activeBg: isDark ? 'rgba(59, 130, 246, 0.18)' : '#eff6ff',
        activeBorder: '#3b82f6',
        count: stats.total,
      },
      {
        key: 'IN_STOCK' as const,
        label: 'In Stock',
        icon: 'checkmark-circle-outline' as const,
        color: '#10b981',
        activeBg: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ecfdf5',
        activeBorder: '#10b981',
        count: stats.inStock,
      },
      {
        key: 'LOW_STOCK' as const,
        label: 'Low (≤5)',
        icon: 'alert-circle-outline' as const,
        color: '#f59e0b',
        activeBg: isDark ? 'rgba(245, 158, 11, 0.18)' : '#fffbeb',
        activeBorder: '#f59e0b',
        count: stats.lowStock,
      },
      {
        key: 'OUT' as const,
        label: 'Out',
        icon: 'close-circle-outline' as const,
        color: '#f43f5e',
        activeBg: isDark ? 'rgba(244, 63, 94, 0.18)' : '#fff1f2',
        activeBorder: '#f43f5e',
        count: stats.outOfStock,
      },
    ],
    [isDark, stats]
  );

  // ─── Filtered & Sorted Products ───
  const displayedProducts = useMemo(() => {
    const safeProducts = Array.isArray(products) ? products : [];
    if (reorderMode) {
      return safeProducts;
    }
    let baseList = safeProducts;

    // Search filter
    if (searchQuery.trim()) {
      const matchedIds = searchTrie.searchPrefix(searchQuery);
      if (matchedIds) {
        const results: any[] = [];
        matchedIds.forEach((id) => {
          const p = productMap.get(id);
          if (p) results.push(p);
        });
        baseList = results;
      }
    }

    // Category filter
    if (selectedCatId !== 'ALL') {
      baseList = baseList.filter((p) => p?.category === selectedCatId);
    }

    // Stock state filter
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

  const renderItem = useCallback(
    ({ item, index }: any) => {
      if (reorderMode) {
        return (
          <DraggableItem
            index={index}
            totalCount={displayedProducts.length}
            enabled={reorderMode}
            itemHeight={170}
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
      moveProduct,
      activeDragIndex,
      hoverIndex,
      reorderProduct,
    ]
  );

  // ─── Sticky Controls Hub (Search, Scanner, Sort, Reorder & Categories) ───
  const stickyHeader = useMemo(() => (
    <View
      style={[
        styles.stickyControlsWrap,
        {
          backgroundColor: colors.bg,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {/* 1. Header with Title & Add Product Action */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
          style={styles.titleCol}
        >
          <View style={styles.titleRow}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Products</Text>
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
          </View>
          <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>
            Manage inventory, pricing & live stock
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryAddBtn, { backgroundColor: '#10b981' }]}
          onPress={() => router.push('/(tabs)/products/new')}
          accessibilityLabel="Add New Product"
        >
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text style={styles.primaryAddBtnText}>Add Product</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Search & Control Bar */}
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
            placeholder="Search by name, SKU, brand, category..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={17} color={colors.textMuted} />
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

        {/* Sort Selector Button */}
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
          <Ionicons name="swap-vertical" size={16} color={colors.text} />
          <Text style={[styles.sortBtnText, { color: colors.text }]}>
            {sortBy === 'NAME'
              ? 'Name'
              : sortBy === 'PRICE_ASC'
                ? 'Price ↑'
                : sortBy === 'PRICE_DESC'
                  ? 'Price ↓'
                  : sortBy === 'STOCK_LOW'
                    ? 'Stock ↑'
                    : 'Sort'}
          </Text>
        </TouchableOpacity>

        {/* Reorder Catalog Button */}
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
            name={reorderMode ? 'checkmark-done' : 'reorder-three-outline'}
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
      </View>

      {/* 3. Horizontal Category Filter Pills */}
      {categories.length > 0 && (
        <View style={styles.categoriesScrollWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            <TouchableOpacity
              style={[
                styles.categoryPill,
                selectedCatId === 'ALL'
                  ? { backgroundColor: isDark ? '#ffffff' : '#0f172a' }
                  : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
              ]}
              onPress={() => setSelectedCatId('ALL')}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  {
                    color:
                      selectedCatId === 'ALL'
                        ? isDark
                          ? '#0f172a'
                          : '#ffffff'
                        : colors.textMuted,
                    fontWeight: selectedCatId === 'ALL' ? '800' : '600',
                  },
                ]}
              >
                All Categories
              </Text>
            </TouchableOpacity>

            {categories.map((cat) => {
              const active = selectedCatId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryPill,
                    active
                      ? { backgroundColor: isDark ? '#ffffff' : '#0f172a' }
                      : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
                  ]}
                  onPress={() => setSelectedCatId(active ? 'ALL' : cat.id)}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
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
      )}

      {/* Active Filter Indicator Pill (when filtered) */}
      {stockFilter !== 'ALL' && (
        <View style={styles.activeFilterChipRow}>
          <TouchableOpacity
            style={[
              styles.activeFilterChip,
              {
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.18)' : '#eff6ff',
                borderColor: isDark ? 'rgba(59, 130, 246, 0.35)' : '#bfdbfe',
              },
            ]}
            onPress={() => setStockFilter('ALL')}
          >
            <Text style={[styles.activeFilterChipText, { color: isDark ? '#93c5fd' : '#2563eb' }]}>
              Filter: {kpiCards.find((c) => c.key === stockFilter)?.label} ✕
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  ), [
    colors,
    isDark,
    products.length,
    searchQuery,
    sortBy,
    reorderMode,
    categories,
    selectedCatId,
    stockFilter,
    kpiCards,
    toggleReorderMode,
    router,
  ]);

  // ─── Scrollable Header (KPI Cards & Alert Banners) ───
  const listHeader = useMemo(() => (
    <View style={styles.topSectionWrap}>
      {/* Interactive KPI Stats Bar */}
      <View style={styles.kpiRow}>
        {kpiCards.map((card) => {
          const active = stockFilter === card.key;
          return (
            <TouchableOpacity
              key={card.key}
              activeOpacity={0.7}
              style={[
                styles.kpiCard,
                {
                  backgroundColor: active ? card.activeBg : colors.card,
                  borderColor: active ? card.activeBorder : colors.border,
                  borderWidth: active ? 1.5 : 1,
                },
                active && [
                  styles.kpiCardActive,
                  {
                    shadowColor: card.color,
                    ...Platform.select({
                      web: {
                        boxShadow: `0 4px 14px ${card.color}35`,
                      } as any,
                    }),
                  },
                ],
              ]}
              onPress={() =>
                setStockFilter(active && card.key !== 'ALL' ? 'ALL' : card.key)
              }
              accessibilityLabel={`${card.label} filter, ${card.count} items`}
            >
              <View style={styles.kpiTopRow}>
                <Ionicons
                  name={card.icon}
                  size={13}
                  color={active ? card.color : colors.textMuted}
                />
                <Text
                  style={[
                    styles.kpiValue,
                    {
                      color: active
                        ? card.color
                        : card.key === 'ALL'
                          ? colors.text
                          : card.color,
                    },
                  ]}
                >
                  {card.count}
                </Text>
              </View>
              <Text
                style={[
                  styles.kpiLabel,
                  {
                    color: active ? card.color : colors.textMuted,
                    fontWeight: active ? '800' : '700',
                  },
                ]}
                numberOfLines={1}
              >
                {card.label}
              </Text>
              {active && (
                <View
                  style={[styles.kpiActiveDot, { backgroundColor: card.color }]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Error Banner */}
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

      {/* Reorder Mode Banner */}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <Ionicons name="swap-vertical" size={18} color="#10b981" />
            <Text style={{ fontSize: 13, color: isDark ? '#a7f3d0' : '#065f46', fontWeight: '600', flex: 1 }}>
              Catalog Drag & Drop: Hold & drag ☰ to reposition products, or tap Up/Down.
            </Text>
          </View>
          <TouchableOpacity onPress={toggleReorderMode} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 13 }}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  ), [
    colors,
    isDark,
    kpiCards,
    stockFilter,
    errorMsg,
    reorderMode,
    fetchProducts,
    toggleReorderMode,
  ]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.maxContainer}>
        {/* Sticky Controls Hub */}
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
            ListEmptyComponent={
              <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={44} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No products found</Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                  {searchQuery
                    ? `No matches for "${searchQuery}". Try a different keyword or scan.`
                    : 'Your catalog is empty. Tap below to add your first product!'}
                </Text>
                <TouchableOpacity
                  style={[styles.emptyAddBtn, { backgroundColor: '#10b981' }]}
                  onPress={() => router.push('/(tabs)/products/new')}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
                  <Text style={styles.emptyAddBtnText}>Add New Product</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>

      {/* ─── 7. Quick Edit Price & Stock Modal ─── */}
      <Modal
        visible={Boolean(quickEditProduct)}
        transparent
        animationType="fade"
        onRequestClose={() => setQuickEditProduct(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View
            style={[
              styles.quickEditModalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Quick Edit Product
                </Text>
                <Text
                  style={[styles.modalSub, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {quickEditProduct?.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setQuickEditProduct(null)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.cardAlt }]}
              >
                <Ionicons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Inputs: Regular Price, Offer Price */}
            <View style={styles.modalInputsRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                  Regular Price (₹)
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.cardAlt,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  keyboardType="numeric"
                  value={qePrice}
                  onChangeText={setQePrice}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                  Offer Price (₹)
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.cardAlt,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  keyboardType="numeric"
                  placeholder="Optional"
                  placeholderTextColor={colors.textMuted}
                  value={qeOfferPrice}
                  onChangeText={setQeOfferPrice}
                />
              </View>
            </View>

            {/* Stock Quantity + Quick Add Chips */}
            <View style={{ gap: 6 }}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                Stock Quantity (Units)
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
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
              <View style={styles.quickAddChipsRow}>
                {[5, 10, 25, 50].map((addAmount) => (
                  <TouchableOpacity
                    key={addAmount}
                    style={[
                      styles.quickAddChip,
                      { backgroundColor: colors.cardAlt, borderColor: colors.border },
                    ]}
                    onPress={() => {
                      const cur = parseInt(qeStock, 10) || 0;
                      setQeStock(String(cur + addAmount));
                    }}
                  >
                    <Text style={[styles.quickAddChipText, { color: colors.text }]}>
                      +{addAmount}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* In-Stock Switch */}
            <View style={styles.modalSwitchRow}>
              <View>
                <Text style={[styles.switchTitle, { color: colors.text }]}>
                  Available in Store
                </Text>
                <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                  Customers can see and order this item
                </Text>
              </View>
              <ModernSwitch
                value={qeInStock}
                onValueChange={setQeInStock}
              />
            </View>

            {/* Modal Actions */}
            <View style={styles.modalBtnsRow}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  { backgroundColor: colors.cardAlt, borderColor: colors.border },
                ]}
                onPress={() => setQuickEditProduct(null)}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: '#10b981' }]}
                onPress={handleSaveQuickEdit}
                disabled={savingQuickEdit}
              >
                {savingQuickEdit ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                    <Text style={styles.modalSaveBtnText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Direct Link to Full Product Editor */}
            <TouchableOpacity
              style={styles.modalFullEditLink}
              onPress={() => {
                const id = quickEditProduct?.id;
                setQuickEditProduct(null);
                if (id) {
                  router.push({ pathname: '/(tabs)/products/new', params: { id: String(id) } });
                }
              }}
            >
              <Ionicons name="open-outline" size={14} color="#3b82f6" />
              <Text style={styles.modalFullEditLinkText}>
                Open full product editor (photos, description, SKU) →
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── 8. Barcode Scanner Modal ─── */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        {showScanner && (
          <UniversalCameraScanner
            mode="all"
            isActive={showScanner}
            title="Universal Scanner"
            subtitle="Point at any barcode or QR code to locate product"
            onScan={handleBarcodeScan}
            onClose={() => setShowScanner(false)}
          />
        )}
      </Modal>
    </View>
  );
}

// ─── Styles ───
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  maxContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },
  stickyControlsWrap: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    zIndex: 10,
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 0,
      },
    }),
  },
  activeFilterChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  activeFilterChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  topSectionWrap: {
    paddingTop: 6,
    paddingBottom: 2,
  },
  titleCol: {
    justifyContent: 'center',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  pageSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  primaryAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  primaryAddBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 10,
  },
  kpiRowScrolled: {
    marginBottom: 8,
  },
  kpiCard: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiCardActive: {
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 15.5,
    fontWeight: '900',
  },
  kpiLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  kpiActiveDot: {
    position: 'absolute',
    bottom: 2,
    width: 14,
    height: 2.5,
    borderRadius: 2,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  searchBarPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  searchScanIconBtn: {
    padding: 4,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoriesScrollWrap: {
    marginTop: 8,
    marginBottom: 6,
  },
  categoriesScroll: {
    gap: 7,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  categoryPillText: {
    fontSize: 12,
  },
  errorBannerWrap: {
    marginTop: 6,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    flex: 1,
  },
  retryText: {
    color: '#b91c1c',
    fontWeight: '800',
    fontSize: 12,
    marginLeft: 10,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 10,
    paddingBottom: 90,
  },
  productCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardMainRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  cardThumbBox: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  cardImg: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#e11d48',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderBottomLeftRadius: 6,
  },
  discountBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  cardInfoBlock: {
    flex: 1,
    gap: 4,
  },
  titleRowWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 14.5,
    fontWeight: '800',
    lineHeight: 19,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 1,
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 2,
  },
  offerPriceText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#10b981',
  },
  strikeThroughPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  stockStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockStatusText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  cardFooterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderTopWidth: 1,
    gap: 8,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperLabel: {
    fontSize: 11,
    fontWeight: '700',
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
  cardActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  iconMiniBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyBox: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  emptyAddBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  quickEditModalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalInput: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '700',
  },
  quickAddChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  quickAddChip: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickAddChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  modalSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  switchSub: {
    fontSize: 11,
  },
  modalBtnsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 6,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalSaveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  modalFullEditLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: -2,
  },
  modalFullEditLinkText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#3b82f6',
  },
  reorderStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  reorderRankBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  dragGripLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 2,
  },
  reorderRankText: {
    fontSize: 13,
    fontWeight: '700',
  },
  reorderBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reorderArrowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  reorderBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  reorderToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  reorderToggleBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  reorderActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
});
