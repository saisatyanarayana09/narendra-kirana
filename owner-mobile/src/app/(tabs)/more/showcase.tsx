import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
  FlatList,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import api, { ApiInstance, cachedGet, getErrorMessage } from '../../../services/api';
import { useAppTheme } from '../../../context/ThemeContext';
import { showAlert, showConfirm } from '../../../utils/alerts';
import ScreenHeader from '../../../components/ScreenHeader';
import ModernSwitch from '../../../components/ModernSwitch';
import { DraggableItem } from '../../../components/DraggableItem';

const bannerKeyExtractor = (item: any) => String(item.id);
const sectionKeyExtractor = (item: any) => String(item.id);
const catalogProductKeyExtractor = (item: any) => String(item.id);

interface BannerCardProps {
  item: any;
  index: number;
  totalCount: number;
  colors: any;
  isDark: boolean;
  activeBannerDragIndex: number | null;
  hoverBannerIndex: number | null;
  bannerListRef: React.RefObject<any>;
  bannerScrollOffsetRef: React.RefObject<any>;
  onDragStart: (idx: number) => void;
  onHoverChange: (idx: number | null) => void;
  onDrop: (fromIdx: number, toIdx: number) => void;
  onMoveBanner: (index: number, direction: -1 | 1) => void;
  onToggleBanner: (ban: any) => void;
  onDeleteBanner: (id: number, title: string) => void;
}

const BannerCard = React.memo<BannerCardProps>(
  ({
    item,
    index,
    totalCount,
    colors,
    isDark,
    activeBannerDragIndex,
    hoverBannerIndex,
    bannerListRef,
    bannerScrollOffsetRef,
    onDragStart,
    onHoverChange,
    onDrop,
    onMoveBanner,
    onToggleBanner,
    onDeleteBanner,
  }) => {
    return (
      <DraggableItem
        index={index}
        totalCount={totalCount}
        itemHeight={260}
        listRef={bannerListRef}
        scrollOffsetRef={bannerScrollOffsetRef}
        activeDragIndex={activeBannerDragIndex}
        hoverIndex={hoverBannerIndex}
        onDragStart={onDragStart}
        onHoverChange={onHoverChange}
        onDrop={onDrop}
      >
        {({ dragHandleProps, isDragging, isHoveredTarget }: any) => (
          <View
            style={[
              styles.bannerCard,
              {
                backgroundColor: colors.card,
                borderColor: isDragging || isHoveredTarget ? '#10b981' : colors.border,
                borderWidth: isDragging || isHoveredTarget ? 2 : 1,
              },
            ]}
          >
            {/* 16:9 Banner Image Preview */}
            <View style={[styles.bannerImgWrap, { backgroundColor: colors.cardAlt }]}>
              {item.image ? (
                <Image
                  source={{ uri: item.image }}
                  style={styles.bannerImg}
                  contentFit="cover"
                />
              ) : (
                <Ionicons name="image-outline" size={32} color={colors.textMuted} />
              )}
              <View style={styles.bannerBadge}>
                <Text style={styles.bannerBadgeText}>Slide #{index + 1}</Text>
              </View>
            </View>

            {/* Title & Link */}
            <View style={styles.bannerMeta}>
              <Text style={[styles.bannerTitle, { color: colors.text }]} numberOfLines={1}>
                {item.title || `Banner #${item.id}`}
              </Text>
              {Boolean(item.link) && (
                <Text style={[styles.bannerLink, { color: colors.textMuted }]} numberOfLines={1}>
                  🔗 {item.link}
                </Text>
              )}
            </View>

            {/* Card Footer with ModernSwitch & Reorder */}
            <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
              <View style={styles.reorderArrows}>
                {/* Drag Handle Grip */}
                <View
                  {...dragHandleProps}
                  style={[
                    styles.dragHandleGrip,
                    {
                      backgroundColor: isDragging
                        ? '#10b981'
                        : isDark
                          ? 'rgba(16, 185, 129, 0.15)'
                          : '#ecfdf5',
                      borderColor: isDragging
                        ? '#059669'
                        : isDark
                          ? 'rgba(16, 185, 129, 0.3)'
                          : '#a7f3d0',
                    },
                  ]}
                  accessibilityLabel={`Drag handle for banner ${item.title || item.id}`}
                >
                  <Ionicons
                    name="reorder-two-outline"
                    size={18}
                    color={isDragging ? '#ffffff' : '#10b981'}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.arrowBtn, { opacity: index === 0 ? 0.3 : 1 }]}
                  onPress={() => onMoveBanner(index, -1)}
                  disabled={index === 0}
                >
                  <Ionicons name="chevron-up" size={16} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.arrowBtn, { opacity: index === totalCount - 1 ? 0.3 : 1 }]}
                  onPress={() => onMoveBanner(index, 1)}
                  disabled={index === totalCount - 1}
                >
                  <Ionicons name="chevron-down" size={16} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.footerRight}>
                <ModernSwitch
                  value={Boolean(item.is_active)}
                  onValueChange={() => onToggleBanner(item)}
                />

                <TouchableOpacity
                  style={[styles.deleteBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                  onPress={() => onDeleteBanner(item.id, item.title || `Banner #${item.id}`)}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </DraggableItem>
    );
  },
  (prev, next) =>
    prev.item?.id === next.item?.id &&
    prev.item?.title === next.item?.title &&
    prev.item?.image === next.item?.image &&
    prev.item?.link === next.item?.link &&
    prev.item?.is_active === next.item?.is_active &&
    prev.item?.display_order === next.item?.display_order &&
    prev.index === next.index &&
    prev.totalCount === next.totalCount &&
    prev.isDark === next.isDark &&
    prev.colors === next.colors &&
    prev.activeBannerDragIndex === next.activeBannerDragIndex &&
    prev.hoverBannerIndex === next.hoverBannerIndex &&
    prev.onDragStart === next.onDragStart &&
    prev.onHoverChange === next.onHoverChange &&
    prev.onDrop === next.onDrop &&
    prev.onMoveBanner === next.onMoveBanner &&
    prev.onToggleBanner === next.onToggleBanner &&
    prev.onDeleteBanner === next.onDeleteBanner
);

interface SectionCardProps {
  item: any;
  index: number;
  totalCount: number;
  colors: any;
  isDark: boolean;
  activeSectionDragIndex: number | null;
  hoverSectionIndex: number | null;
  sectionListRef: React.RefObject<any>;
  sectionScrollOffsetRef: React.RefObject<any>;
  onDragStart: (idx: number) => void;
  onHoverChange: (idx: number | null) => void;
  onDrop: (fromIdx: number, toIdx: number) => void;
  onMoveSection: (index: number, direction: -1 | 1) => void;
  onToggleSection: (sec: any) => void;
  onDeleteSection: (id: number, title: string) => void;
  onOpenCurator: (sec: any) => void;
}

const SectionCard = React.memo<SectionCardProps>(
  ({
    item,
    index,
    totalCount,
    colors,
    isDark,
    activeSectionDragIndex,
    hoverSectionIndex,
    sectionListRef,
    sectionScrollOffsetRef,
    onDragStart,
    onHoverChange,
    onDrop,
    onMoveSection,
    onToggleSection,
    onDeleteSection,
    onOpenCurator,
  }) => {
    return (
      <DraggableItem
        index={index}
        totalCount={totalCount}
        itemHeight={170}
        listRef={sectionListRef}
        scrollOffsetRef={sectionScrollOffsetRef}
        activeDragIndex={activeSectionDragIndex}
        hoverIndex={hoverSectionIndex}
        onDragStart={onDragStart}
        onHoverChange={onHoverChange}
        onDrop={onDrop}
      >
        {({ dragHandleProps, isDragging, isHoveredTarget }) => (
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.card,
                borderColor: isDragging || isHoveredTarget ? '#10b981' : colors.border,
                borderWidth: isDragging || isHoveredTarget ? 2 : 1,
              },
            ]}
          >
            {/* Header with Title & Item Count */}
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.sectionItemsCount, { color: colors.textMuted }]}>
                  {item.items?.length ?? 0} products curated in this aisle
                </Text>
              </View>

              <View
                style={[
                  styles.orderPill,
                  { backgroundColor: colors.cardAlt, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.orderPillText, { color: colors.textMuted }]}>
                  #{index + 1}
                </Text>
              </View>
            </View>

            {/* Curated Product Thumbnails Row */}
            {item.items && item.items.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.curatedThumbnailsRow}
              >
                {item.items.slice(0, 10).map((p: any) => (
                  <View
                    key={p.id}
                    style={[
                      styles.curatedThumbBox,
                      { backgroundColor: colors.cardAlt, borderColor: colors.border },
                    ]}
                  >
                    {p.image ? (
                      <Image
                        source={{ uri: p.image }}
                        style={styles.curatedThumbImg}
                        contentFit="cover"
                      />
                    ) : (
                      <Ionicons name="cube-outline" size={16} color={colors.textMuted} />
                    )}
                  </View>
                ))}
                {item.items.length > 10 && (
                  <View
                    style={[
                      styles.morePill,
                      { backgroundColor: colors.cardAlt, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.morePillText, { color: colors.textMuted }]}>
                      +{item.items.length - 10}
                    </Text>
                  </View>
                )}
              </ScrollView>
            ) : (
              <View style={[styles.emptyAisleBox, { backgroundColor: colors.cardAlt }]}>
                <Ionicons name="basket-outline" size={18} color={colors.textMuted} />
                <Text style={[styles.emptyAisleText, { color: colors.textMuted }]}>
                  No products added yet. Tap "Curate Products" below.
                </Text>
              </View>
            )}

            {/* Card Footer with Curate Button, Switch & Reorder */}
            <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.curateBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                onPress={() => onOpenCurator(item)}
              >
                <Ionicons name="layers-outline" size={15} color="#10b981" />
                <Text style={[styles.curateBtnText, { color: colors.text }]}>
                  Curate Products
                </Text>
              </TouchableOpacity>

              <View style={styles.footerRight}>
                {/* Reorder Arrows with Drag Handle */}
                <View style={styles.reorderArrows}>
                  {/* Drag Handle Grip */}
                  <View
                    {...dragHandleProps}
                    style={[
                      styles.dragHandleGrip,
                      {
                        backgroundColor: isDragging
                          ? '#10b981'
                          : isDark
                            ? 'rgba(16, 185, 129, 0.15)'
                            : '#ecfdf5',
                        borderColor: isDragging
                          ? '#059669'
                          : isDark
                            ? 'rgba(16, 185, 129, 0.3)'
                            : '#a7f3d0',
                      },
                    ]}
                    accessibilityLabel={`Drag handle for section ${item.title}`}
                  >
                    <Ionicons
                      name="reorder-two-outline"
                      size={18}
                      color={isDragging ? '#ffffff' : '#10b981'}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.arrowBtn, { opacity: index === 0 ? 0.3 : 1 }]}
                    onPress={() => onMoveSection(index, -1)}
                    disabled={index === 0}
                  >
                    <Ionicons name="chevron-up" size={15} color={colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.arrowBtn, { opacity: index === totalCount - 1 ? 0.3 : 1 }]}
                    onPress={() => onMoveSection(index, 1)}
                    disabled={index === totalCount - 1}
                  >
                    <Ionicons name="chevron-down" size={15} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ModernSwitch
                  value={Boolean(item.is_active)}
                  onValueChange={() => onToggleSection(item)}
                />

                <TouchableOpacity
                  style={[styles.deleteBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                  onPress={() => onDeleteSection(item.id, item.title)}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </DraggableItem>
    );
  },
  (prev, next) =>
    (prev.item === next.item ||
      (prev.item?.id === next.item?.id &&
        prev.item?.title === next.item?.title &&
        prev.item?.is_active === next.item?.is_active &&
        prev.item?.display_order === next.item?.display_order &&
        (prev.item?.items?.length ?? 0) === (next.item?.items?.length ?? 0))) &&
    prev.index === next.index &&
    prev.totalCount === next.totalCount &&
    prev.isDark === next.isDark &&
    prev.colors === next.colors &&
    prev.activeSectionDragIndex === next.activeSectionDragIndex &&
    prev.hoverSectionIndex === next.hoverSectionIndex &&
    prev.onDragStart === next.onDragStart &&
    prev.onHoverChange === next.onHoverChange &&
    prev.onDrop === next.onDrop &&
    prev.onMoveSection === next.onMoveSection &&
    prev.onToggleSection === next.onToggleSection &&
    prev.onDeleteSection === next.onDeleteSection &&
    prev.onOpenCurator === next.onOpenCurator
);

interface CatalogProductRowProps {
  item: any;
  isSelected: boolean;
  colors: any;
  isDark: boolean;
  onToggle: (item: any) => void;
}

const CatalogProductRow = React.memo<CatalogProductRowProps>(
  ({ item, isSelected, colors, isDark, onToggle }) => {
    return (
      <TouchableOpacity
        style={[
          styles.productPickerRow,
          {
            backgroundColor: isSelected
              ? isDark
                ? 'rgba(16, 185, 129, 0.15)'
                : '#ecfdf5'
              : colors.cardAlt,
            borderColor: isSelected ? '#10b981' : colors.border,
          },
        ]}
        activeOpacity={0.7}
        onPress={() => onToggle(item)}
      >
        <View style={styles.productPickerLeft}>
          <View style={[styles.pickerThumb, { backgroundColor: colors.card }]}>
            {item.image ? (
              <Image
                source={{ uri: item.image }}
                style={styles.curatedThumbImg}
                contentFit="cover"
              />
            ) : (
              <Ionicons name="cube-outline" size={16} color={colors.textMuted} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pickerTitle, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.pickerPrice, { color: colors.textMuted }]}>
              ₹{item.regular_price} • Stock: {item.stock_quantity ?? 0}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.checkCircle,
            {
              backgroundColor: isSelected ? '#10b981' : 'transparent',
              borderColor: isSelected ? '#10b981' : colors.border,
            },
          ]}
        >
          {isSelected && (
            <Ionicons name="checkmark" size={14} color="#ffffff" />
          )}
        </View>
      </TouchableOpacity>
    );
  },
  (prev, next) =>
    prev.item?.id === next.item?.id &&
    prev.item?.name === next.item?.name &&
    prev.item?.image === next.item?.image &&
    prev.item?.regular_price === next.item?.regular_price &&
    prev.item?.stock_quantity === next.item?.stock_quantity &&
    prev.isSelected === next.isSelected &&
    prev.isDark === next.isDark &&
    prev.colors === next.colors &&
    prev.onToggle === next.onToggle
);

export default function ShowcaseScreen() {
  const { colors, isDark } = useAppTheme();

  const [activeTab, setActiveTab] = useState<'banners' | 'sections'>('banners');
  const [sections, setSections] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New section creation state
  const [newSectionModalOpen, setNewSectionModalOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [creatingSection, setCreatingSection] = useState(false);

  // Banner creation modal state
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [bannerImageUri, setBannerImageUri] = useState<string | null>(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Drag & drop reorder states
  const bannerListRef = useRef<FlatList>(null);
  const bannerScrollOffsetRef = useRef<number>(0);
  const [activeBannerDragIndex, setActiveBannerDragIndex] = useState<number | null>(null);
  const [hoverBannerIndex, setHoverBannerIndex] = useState<number | null>(null);

  const sectionListRef = useRef<FlatList>(null);
  const sectionScrollOffsetRef = useRef<number>(0);
  const [activeSectionDragIndex, setActiveSectionDragIndex] = useState<number | null>(null);
  const [hoverSectionIndex, setHoverSectionIndex] = useState<number | null>(null);

  // Curate products modal state
  const [curatingSection, setCuratingSection] = useState<any | null>(null);
  const [curatedItems, setCuratedItems] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [savingProducts, setSavingProducts] = useState(false);

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      const opts = {
        forceRefresh,
        onUpdate: () => {
          void fetchData();
        },
      };
      const [secRes, banRes, prodRes] = await Promise.allSettled([
        cachedGet('/store/homepage-sections/', opts),
        cachedGet('/offers/banners/', opts),
        cachedGet('/products/?limit=200', opts),
      ]);

      if (secRes.status === 'fulfilled' && secRes.value?.data) {
        const rawSec = secRes.value.data?.results ?? secRes.value.data;
        const list = Array.isArray(rawSec) ? rawSec : [];
        const mapped = list.map((sec: any) => ({
          ...sec,
          items: (sec.section_products || [])
            .sort((a: any, b: any) => (a?.position ?? 0) - (b?.position ?? 0))
            .map((sp: any) => sp.product_details)
            .filter(Boolean),
        }));
        setSections(mapped.sort((a: any, b: any) => (a?.display_order ?? 0) - (b?.display_order ?? 0)));
      }

      if (banRes.status === 'fulfilled' && banRes.value?.data) {
        const rawBan = banRes.value.data?.results ?? banRes.value.data;
        const bList = Array.isArray(rawBan) ? rawBan : [];
        setBanners(bList.sort((a: any, b: any) => (a?.display_order ?? 0) - (b?.display_order ?? 0)));
      }

      if (prodRes.status === 'fulfilled' && prodRes.value?.data) {
        const rawProd = prodRes.value.data?.results ?? prodRes.value.data;
        setAllProducts(Array.isArray(rawProd) ? rawProd : []);
      }
    } catch {
      // Handled per promise
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  // ---------------- Banner Actions ----------------
  const handlePickBannerImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!res.canceled && res.assets && res.assets[0]?.uri) {
      setBannerImageUri(res.assets[0].uri);
    }
  };

  const handleUploadBanner = async () => {
    if (!bannerImageUri) {
      showAlert('Validation', 'Please select a banner image.');
      return;
    }
    const cleanTitle = bannerTitle.trim() || 'Promotional Banner';
    setUploadingBanner(true);

    try {
      const formData = new FormData();
      formData.append('title', cleanTitle);
      if (bannerLink.trim()) {
        formData.append('link', bannerLink.trim());
      }
      formData.append('display_order', String(banners.length));
      formData.append('is_active', 'true');

      const rawFilename = bannerImageUri.split('/').pop() || 'banner.jpg';
      const match = /\.(\w+)$/.exec(rawFilename);
      const mimeType = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

      if (Platform.OS === 'web') {
        const response = await fetch(bannerImageUri);
        const blob = await response.blob();
        formData.append('image', blob, rawFilename);
      } else {
        formData.append('image', {
          uri: bannerImageUri,
          name: rawFilename,
          type: mimeType,
        } as any);
      }

      await api.post('/offers/banners/', formData);
      (api as ApiInstance).clearCache();

      setBannerModalOpen(false);
      setBannerImageUri(null);
      setBannerTitle('');
      setBannerLink('');
      await fetchData();
      showAlert('Success', 'Promotional banner uploaded successfully!');
    } catch (e: any) {
      showAlert('Upload Error', getErrorMessage(e, 'Failed to upload promotional banner.'));
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleToggleBanner = useCallback(async (ban: any) => {
    const next = !ban.is_active;
    // 0ms Optimistic update
    setBanners((prev) =>
      prev.map((b) => (b.id === ban.id ? { ...b, is_active: next } : b))
    );

    try {
      await api.patch(`/offers/banners/${ban.id}/`, { is_active: next });
      (api as ApiInstance).clearCache();
    } catch (e: any) {
      // Revert
      setBanners((prev) =>
        prev.map((b) => (b.id === ban.id ? { ...b, is_active: !next } : b))
      );
      showAlert('Error', getErrorMessage(e, 'Failed to toggle banner status.'));
    }
  }, []);

  const handleReorderBanner = useCallback(async (fromIndex: number, toIndex: number) => {
    let reordered: any[] = [];
    setBanners((prev) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex >= prev.length
      ) {
        return prev;
      }
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      reordered = updated.map((b, idx) => ({ ...b, display_order: idx }));
      return reordered;
    });

    if (reordered.length === 0) return;

    try {
      await api.post(
        '/offers/banners/reorder/',
        reordered.map((b) => ({ id: b.id, display_order: b.display_order }))
      );
      (api as ApiInstance).clearCache();
    } catch {
      fetchData();
    }
  }, [fetchData]);

  const handleMoveBanner = useCallback((index: number, direction: -1 | 1) => {
    handleReorderBanner(index, index + direction);
  }, [handleReorderBanner]);

  const handleDeleteBanner = useCallback((id: number, title: string) => {
    showConfirm('Delete Banner', `Delete promotional banner "${title}"?`, async () => {
      try {
        await api.delete(`/offers/banners/${id}/`);
        (api as ApiInstance).clearCache();
        setBanners((prev) => prev.filter((b) => b.id !== id));
        showAlert('Deleted', 'Promotional banner removed.');
      } catch (e: any) {
        showAlert('Error', getErrorMessage(e, 'Failed to delete banner.'));
      }
    });
  }, []);

  // ---------------- Section Actions ----------------
  const handleCreateSection = async () => {
    const cleanTitle = newSectionTitle.trim();
    if (!cleanTitle) {
      showAlert('Validation', 'Please enter a section title.');
      return;
    }
    setCreatingSection(true);
    try {
      await api.post('/store/homepage-sections/', {
        title: cleanTitle,
        section_type: 'products',
        is_active: true,
        display_order: sections.length,
      });
      (api as ApiInstance).clearCache();
      setNewSectionModalOpen(false);
      setNewSectionTitle('');
      await fetchData();
      showAlert('Success', `Homepage aisle "${cleanTitle}" created!`);
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to create section.'));
    } finally {
      setCreatingSection(false);
    }
  };

  const handleToggleSection = useCallback(async (sec: any) => {
    const next = !sec.is_active;
    // 0ms Optimistic update
    setSections((prev) =>
      prev.map((s) => (s.id === sec.id ? { ...s, is_active: next } : s))
    );

    try {
      await api.patch(`/store/homepage-sections/${sec.id}/`, { is_active: next });
      (api as ApiInstance).clearCache();
    } catch (e: any) {
      // Revert
      setSections((prev) =>
        prev.map((s) => (s.id === sec.id ? { ...s, is_active: !next } : s))
      );
      showAlert('Error', getErrorMessage(e, 'Failed to update section.'));
    }
  }, []);

  const handleReorderSection = useCallback(async (fromIndex: number, toIndex: number) => {
    let reordered: any[] = [];
    setSections((prev) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex >= prev.length
      ) {
        return prev;
      }
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      reordered = updated.map((s, idx) => ({ ...s, display_order: idx }));
      return reordered;
    });

    if (reordered.length === 0) return;

    try {
      await api.post(
        '/store/homepage-sections/reorder/',
        reordered.map((s) => ({ id: s.id, display_order: s.display_order }))
      );
      (api as ApiInstance).clearCache();
    } catch {
      fetchData();
    }
  }, [fetchData]);

  const handleMoveSection = useCallback((index: number, direction: -1 | 1) => {
    handleReorderSection(index, index + direction);
  }, [handleReorderSection]);

  const handleDeleteSection = useCallback((id: number, title: string) => {
    showConfirm('Delete Aisle', `Delete homepage section "${title}"?`, async () => {
      try {
        await api.delete(`/store/homepage-sections/${id}/`);
        (api as ApiInstance).clearCache();
        setSections((prev) => prev.filter((s) => s.id !== id));
        showAlert('Deleted', 'Homepage section removed.');
      } catch (e: any) {
        showAlert('Error', getErrorMessage(e, 'Failed to delete section.'));
      }
    });
  }, []);

  // Curate products handler
  const openCurator = useCallback((section: any) => {
    setCuratingSection(section);
    setCuratedItems(section.items ? [...section.items] : []);
    setProductSearch('');
  }, []);

  const toggleProductInCurated = useCallback((product: any) => {
    setCuratedItems((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        return prev.filter((p) => p.id !== product.id);
      } else {
        return [...prev, product];
      }
    });
  }, []);

  const handleBannerDragStart = useCallback((idx: number) => {
    setActiveBannerDragIndex(idx);
  }, []);

  const handleBannerHoverChange = useCallback((idx: number | null) => {
    setHoverBannerIndex(idx);
  }, []);

  const handleBannerDrop = useCallback((fromIdx: number, toIdx: number) => {
    setActiveBannerDragIndex(null);
    setHoverBannerIndex(null);
    if (fromIdx !== toIdx) {
      handleReorderBanner(fromIdx, toIdx);
    }
  }, [handleReorderBanner]);

  const handleSectionDragStart = useCallback((idx: number) => {
    setActiveSectionDragIndex(idx);
  }, []);

  const handleSectionHoverChange = useCallback((idx: number | null) => {
    setHoverSectionIndex(idx);
  }, []);

  const handleSectionDrop = useCallback((fromIdx: number, toIdx: number) => {
    setActiveSectionDragIndex(null);
    setHoverSectionIndex(null);
    if (fromIdx !== toIdx) {
      handleReorderSection(fromIdx, toIdx);
    }
  }, [handleReorderSection]);

  const renderBannerItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <BannerCard
        item={item}
        index={index}
        totalCount={banners.length}
        colors={colors}
        isDark={isDark}
        activeBannerDragIndex={activeBannerDragIndex}
        hoverBannerIndex={hoverBannerIndex}
        bannerListRef={bannerListRef}
        bannerScrollOffsetRef={bannerScrollOffsetRef}
        onDragStart={handleBannerDragStart}
        onHoverChange={handleBannerHoverChange}
        onDrop={handleBannerDrop}
        onMoveBanner={handleMoveBanner}
        onToggleBanner={handleToggleBanner}
        onDeleteBanner={handleDeleteBanner}
      />
    ),
    [
      banners.length,
      colors,
      isDark,
      activeBannerDragIndex,
      hoverBannerIndex,
      handleBannerDragStart,
      handleBannerHoverChange,
      handleBannerDrop,
      handleMoveBanner,
      handleToggleBanner,
      handleDeleteBanner,
    ]
  );

  const renderSectionItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <SectionCard
        item={item}
        index={index}
        totalCount={sections.length}
        colors={colors}
        isDark={isDark}
        activeSectionDragIndex={activeSectionDragIndex}
        hoverSectionIndex={hoverSectionIndex}
        sectionListRef={sectionListRef}
        sectionScrollOffsetRef={sectionScrollOffsetRef}
        onDragStart={handleSectionDragStart}
        onHoverChange={handleSectionHoverChange}
        onDrop={handleSectionDrop}
        onMoveSection={handleMoveSection}
        onToggleSection={handleToggleSection}
        onDeleteSection={handleDeleteSection}
        onOpenCurator={openCurator}
      />
    ),
    [
      sections.length,
      colors,
      isDark,
      activeSectionDragIndex,
      hoverSectionIndex,
      handleSectionDragStart,
      handleSectionHoverChange,
      handleSectionDrop,
      handleMoveSection,
      handleToggleSection,
      handleDeleteSection,
      openCurator,
    ]
  );

  const handleSaveCuratedProducts = async () => {
    if (!curatingSection) return;
    setSavingProducts(true);
    try {
      const itemsPayload = curatedItems.map((p, idx) => ({
        product_id: p.id,
        position: idx,
      }));
      await api.post(`/store/homepage-sections/${curatingSection.id}/set-products/`, {
        products: itemsPayload,
      });
      (api as ApiInstance).clearCache();
      setCuratingSection(null);
      await fetchData();
      showAlert('Success', 'Section products updated successfully!');
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to save section products.'));
    } finally {
      setSavingProducts(false);
    }
  };

  const filteredCatalog = useMemo(() => {
    if (!productSearch.trim()) return allProducts;
    const q = productSearch.trim().toLowerCase();
    return allProducts.filter((p) => (p.name || '').toLowerCase().includes(q));
  }, [allProducts, productSearch]);

  const selectedProductIdsSet = useMemo(
    () => new Set(curatedItems.map((p) => p.id)),
    [curatedItems]
  );

  const renderCatalogItem = useCallback(
    ({ item }: { item: any }) => (
      <CatalogProductRow
        item={item}
        isSelected={selectedProductIdsSet.has(item.id)}
        colors={colors}
        isDark={isDark}
        onToggle={toggleProductInCurated}
      />
    ),
    [selectedProductIdsSet, colors, isDark, toggleProductInCurated]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Universal Screen Header */}
      <ScreenHeader
        title="Storefront Showcase"
        subtitle={`${banners.length} hero banners • ${sections.length} curated aisles`}
        rightAction={
          <TouchableOpacity
            style={styles.addHeaderBtn}
            onPress={() => {
              if (activeTab === 'banners') {
                setBannerModalOpen(true);
              } else {
                setNewSectionModalOpen(true);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={activeTab === 'banners' ? 'Upload Banner' : 'Create Aisle'}
          >
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.addHeaderBtnText}>
              {activeTab === 'banners' ? 'Add Banner' : 'Add Aisle'}
            </Text>
          </TouchableOpacity>
        }
      />

      {/* Segmented Controller Tab Bar */}
      <View style={[styles.tabBarWrap, { backgroundColor: colors.bg }]}>
        <View
          style={[
            styles.segmentTrack,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'banners' && {
                backgroundColor: isDark ? '#064e3b' : '#d1fae5',
              },
            ]}
            onPress={() => setActiveTab('banners')}
          >
            <Ionicons
              name="images-outline"
              size={16}
              color={activeTab === 'banners' ? '#10b981' : colors.textMuted}
            />
            <Text
              style={[
                styles.segmentText,
                {
                  color: activeTab === 'banners' ? '#10b981' : colors.textMuted,
                  fontWeight: activeTab === 'banners' ? '800' : '600',
                },
              ]}
            >
              Hero Banners ({banners.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'sections' && {
                backgroundColor: isDark ? '#064e3b' : '#d1fae5',
              },
            ]}
            onPress={() => setActiveTab('sections')}
          >
            <Ionicons
              name="grid-outline"
              size={16}
              color={activeTab === 'sections' ? '#10b981' : colors.textMuted}
            />
            <Text
              style={[
                styles.segmentText,
                {
                  color: activeTab === 'sections' ? '#10b981' : colors.textMuted,
                  fontWeight: activeTab === 'sections' ? '800' : '600',
                },
              ]}
            >
              Homepage Aisles ({sections.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading showcase data...
          </Text>
        </View>
      ) : activeTab === 'banners' ? (
        /* TAB 1: BANNERS LIST */
        <FlatList
          ref={bannerListRef}
          data={banners}
          keyExtractor={bannerKeyExtractor}
          contentContainerStyle={styles.listContent}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== 'web'}
          onScroll={(e) => {
            bannerScrollOffsetRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#10b981"
            />
          }
          renderItem={renderBannerItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconBox, { backgroundColor: colors.cardAlt }]}>
                <Ionicons name="images-outline" size={32} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Hero Banners</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Upload 16:9 carousel banners.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setBannerModalOpen(true)}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyActionBtnText}>Upload Banner</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        /* TAB 2: HOMEPAGE SECTIONS / AISLES LIST */
        <FlatList
          ref={sectionListRef}
          data={sections}
          keyExtractor={sectionKeyExtractor}
          contentContainerStyle={styles.listContent}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== 'web'}
          onScroll={(e) => {
            sectionScrollOffsetRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#10b981"
            />
          }
          renderItem={renderSectionItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconBox, { backgroundColor: colors.cardAlt }]}>
                <Ionicons name="grid-outline" size={32} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Curated Aisles</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Create custom homepage rows (e.g. "Festival Specials", "Summer Coolers")
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setNewSectionModalOpen(true)}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyActionBtnText}>Create Aisle</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Modal 1: Upload Banner */}
      <Modal
        visible={bannerModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setBannerModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setBannerModalOpen(false)}
          />
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Upload Hero Banner
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  16:9 banner displayed in customer top carousel
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeCircle, { backgroundColor: colors.cardAlt }]}
                onPress={() => setBannerModalOpen(false)}
              >
                <Ionicons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {/* Banner Image Picker */}
              <TouchableOpacity
                style={[
                  styles.bannerPickerBox,
                  { backgroundColor: colors.cardAlt, borderColor: colors.border },
                ]}
                onPress={handlePickBannerImage}
              >
                {bannerImageUri ? (
                  <Image
                    source={{ uri: bannerImageUri }}
                    style={styles.bannerPickerImg}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.bannerPlaceholder}>
                    <Ionicons name="cloud-upload-outline" size={32} color="#10b981" />
                    <Text style={[styles.bannerPlaceholderTitle, { color: colors.text }]}>
                      Tap to select 16:9 banner
                    </Text>
                    <Text style={[styles.bannerPlaceholderSub, { color: colors.textMuted }]}>
                      Recommended: 1200 x 675 px (PNG / JPG)
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 14 }]}>
                Banner Title (Optional)
              </Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. Weekend Mega Sale"
                placeholderTextColor={colors.textMuted}
                value={bannerTitle}
                onChangeText={setBannerTitle}
              />

              <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 14 }]}>
                Destination Link (Optional)
              </Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. /category/rice or promo link"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                value={bannerLink}
                onChangeText={setBannerLink}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                  onPress={() => setBannerModalOpen(false)}
                  disabled={uploadingBanner}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { opacity: uploadingBanner ? 0.7 : 1 }]}
                  onPress={handleUploadBanner}
                  disabled={uploadingBanner}
                >
                  {uploadingBanner ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />
                      <Text style={styles.saveBtnText}>Upload Banner</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal 2: Create Aisle Section */}
      <Modal
        visible={newSectionModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setNewSectionModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setNewSectionModalOpen(false)}
          />
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  New Homepage Aisle
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  A curated row on customer homepage
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeCircle, { backgroundColor: colors.cardAlt }]}
                onPress={() => setNewSectionModalOpen(false)}
              >
                <Ionicons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                Aisle Title *
              </Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. Festival Sweets, Daily Essentials"
                placeholderTextColor={colors.textMuted}
                value={newSectionTitle}
                onChangeText={setNewSectionTitle}
                autoFocus
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                  onPress={() => setNewSectionModalOpen(false)}
                  disabled={creatingSection}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { opacity: creatingSection ? 0.7 : 1 }]}
                  onPress={handleCreateSection}
                  disabled={creatingSection}
                >
                  {creatingSection ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
                      <Text style={styles.saveBtnText}>Create Aisle</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal 3: Curate Products Bottom Sheet */}
      <Modal
        visible={Boolean(curatingSection)}
        transparent
        animationType="slide"
        onRequestClose={() => setCuratingSection(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setCuratingSection(null)}
          />
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border, maxHeight: '92%' },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Curate: {curatingSection?.title}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  {curatedItems.length} products selected for this aisle
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeCircle, { backgroundColor: colors.cardAlt }]}
                onPress={() => setCuratingSection(null)}
              >
                <Ionicons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Product Search */}
            <View style={[styles.curatorSearchWrap, { borderBottomColor: colors.border }]}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search catalog to add items..."
                placeholderTextColor={colors.textMuted}
                value={productSearch}
                onChangeText={setProductSearch}
              />
              {productSearch.length > 0 && (
                <TouchableOpacity onPress={() => setProductSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Catalog Selector FlatList */}
            <FlatList
              data={filteredCatalog}
              keyExtractor={catalogProductKeyExtractor}
              contentContainerStyle={{ padding: 12, gap: 8 }}
              initialNumToRender={8}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={Platform.OS !== 'web'}
              renderItem={renderCatalogItem}
            />

            {/* Footer with Save */}
            <View style={[styles.curatorFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.saveBtn, { width: '100%', opacity: savingProducts ? 0.7 : 1 }]}
                onPress={handleSaveCuratedProducts}
                disabled={savingProducts}
              >
                {savingProducts ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color="#ffffff" />
                    <Text style={styles.saveBtnText}>
                      Save {curatedItems.length} Products in Aisle
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addHeaderBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  tabBarWrap: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  segmentTrack: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
    gap: 12,
  },
  bannerCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bannerImgWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bannerImg: {
    width: '100%',
    height: '100%',
  },
  bannerBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bannerBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  bannerMeta: {
    padding: 12,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  bannerLink: {
    fontSize: 11,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  reorderArrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dragHandleGrip: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  arrowBtn: {
    padding: 4,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionItemsCount: {
    fontSize: 12,
    marginTop: 2,
  },
  orderPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  orderPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  curatedThumbnailsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
  },
  curatedThumbBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  curatedThumbImg: {
    width: '100%',
    height: '100%',
  },
  morePill: {
    height: 38,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyAisleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginVertical: 8,
  },
  emptyAisleText: {
    fontSize: 12,
    flex: 1,
  },
  curateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  curateBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 16,
  },
  bannerPickerBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerPickerImg: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    alignItems: 'center',
    padding: 16,
  },
  bannerPlaceholderTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  bannerPlaceholderSub: {
    fontSize: 11,
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 2,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  curatorSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  productPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  productPickerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  pickerPrice: {
    fontSize: 12,
    marginTop: 2,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  curatorFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
});
