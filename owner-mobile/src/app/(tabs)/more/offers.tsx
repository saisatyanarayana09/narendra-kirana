import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import ModernSwitch from '../../../components/ModernSwitch';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { useAppTheme } from '../../../context/ThemeContext';
import { showAlert, showConfirm } from '../../../utils/alerts';

export default function OffersScreen() {
  const { colors, isDark } = useAppTheme();

  const [activeTab, setActiveTab] = useState<'PROMOS' | 'BANNERS'>('PROMOS');

  // Promos State
  const [promos, setPromos] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Promo Form
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FLAT'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('0');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Banners State
  const [banners, setBanners] = useState<any[]>([]);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [bannerImageUri, setBannerImageUri] = useState<string | null>(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [bannerIsActive, setBannerIsActive] = useState(true);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const fetchOffers = useCallback(async () => {
    try {
      const [promosRes, catRes, banRes] = await Promise.allSettled([
        api.get('/offers/promocodes/'),
        api.get('/categories/'),
        api.get('/offers/banners/'),
      ]);

      if (promosRes.status === 'fulfilled' && promosRes.value?.data) {
        const raw = promosRes.value.data?.results ?? promosRes.value.data;
        setPromos(Array.isArray(raw) ? raw : []);
      }
      if (catRes.status === 'fulfilled' && catRes.value?.data) {
        const rawC = catRes.value.data?.results ?? catRes.value.data;
        setCategories(Array.isArray(rawC) ? rawC : []);
      }
      if (banRes.status === 'fulfilled' && banRes.value?.data) {
        const rawB = banRes.value.data?.results ?? banRes.value.data;
        const bList = Array.isArray(rawB) ? rawB : [];
        setBanners(bList.sort((a: any, b: any) => (a?.display_order ?? 0) - (b?.display_order ?? 0)));
      }
    } catch (e: any) {
      if (e?.response?.status !== 401) {
        showAlert('Error', getErrorMessage(e, 'Failed to load offers and banners.'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // ─── Promo Codes Handlers ───
  const handleCreatePromo = async () => {
    const cleanCode = code.trim().toUpperCase();
    const cleanVal = discountValue.trim();

    if (!cleanCode || !cleanVal) {
      showAlert('Validation', 'Promo code and discount value are required.');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        code: cleanCode,
        discount_type: discountType,
        discount_value: cleanVal,
        min_order_amount: minOrderAmount.trim() || '0',
        is_active: isActive,
      };
      if (selectedCategory) {
        payload.applicable_category = selectedCategory;
      }

      await api.post('/offers/promocodes/', payload);
      (api as ApiInstance).clearCache();
      setCode('');
      setDiscountValue('');
      setMinOrderAmount('0');
      setSelectedCategory(null);
      setIsActive(true);
      await fetchOffers();
      showAlert('Success', `Promo code "${cleanCode}" created!`);
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to create promo code.'));
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePromo = async (promo: any) => {
    try {
      await api.patch(`/offers/promocodes/${promo.id}/`, {
        is_active: !promo.is_active,
      });
      (api as ApiInstance).clearCache();
      fetchOffers();
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to toggle promo code.'));
    }
  };

  const handleDeletePromo = (id: number, promoCode: string) => {
    showConfirm(
      'Delete Promo Code',
      `Delete promo code "${promoCode}"?`,
      async () => {
        try {
          await api.delete(`/offers/promocodes/${id}/`);
          (api as ApiInstance).clearCache();
          fetchOffers();
          showAlert('Deleted', `Promo code "${promoCode}" removed.`);
        } catch (e: any) {
          showAlert('Error', getErrorMessage(e, 'Failed to delete promo code.'));
        }
      },
      undefined,
      'Delete'
    );
  };

  // ─── Banners Handlers ───
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
    const cleanTitle = bannerTitle.trim() || 'Storefront Banner';
    setUploadingBanner(true);

    try {
      const formData = new FormData();
      formData.append('title', cleanTitle);
      if (bannerLink.trim()) {
        formData.append('link', bannerLink.trim());
      }
      formData.append('display_order', String(banners.length));
      formData.append('is_active', String(bannerIsActive));

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
      setBannerIsActive(true);
      await fetchOffers();
      showAlert('Success', 'Storefront banner uploaded successfully!');
    } catch (e: any) {
      showAlert('Upload Error', getErrorMessage(e, 'Failed to upload promotional banner.'));
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleToggleBanner = async (ban: any) => {
    try {
      await api.patch(`/offers/banners/${ban.id}/`, {
        is_active: !ban.is_active,
      });
      (api as ApiInstance).clearCache();
      fetchOffers();
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to toggle banner status.'));
    }
  };

  const handleMoveBanner = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const updated = [...banners];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    const reordered = updated.map((b, idx) => ({ ...b, display_order: idx }));
    setBanners(reordered);

    try {
      await api.post(
        '/offers/banners/reorder/',
        reordered.map((b) => ({ id: b.id, display_order: b.display_order }))
      );
      (api as ApiInstance).clearCache();
    } catch {
      fetchOffers();
    }
  };

  const handleDeleteBanner = (id: number, title: string) => {
    showConfirm('Delete Banner', `Delete promotional banner "${title}"?`, async () => {
      try {
        await api.delete(`/offers/banners/${id}/`);
        (api as ApiInstance).clearCache();
        fetchOffers();
        showAlert('Deleted', 'Storefront banner removed.');
      } catch (e: any) {
        showAlert('Error', getErrorMessage(e, 'Failed to delete banner.'));
      }
    });
  };

  const filteredPromos = promos.filter((p) => {
    if (!searchTerm.trim()) return true;
    return String(p?.code || '').toLowerCase().includes(searchTerm.trim().toLowerCase());
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* ─── Top Tabs: Promo Codes vs Store Banners ─── */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === 'PROMOS' && {
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
              borderColor: '#10b981',
            },
          ]}
          onPress={() => setActiveTab('PROMOS')}
          accessibilityLabel="Promo Codes Tab"
        >
          <Ionicons
            name="pricetag-outline"
            size={16}
            color={activeTab === 'PROMOS' ? '#10b981' : colors.textMuted}
          />
          <Text
            style={[
              styles.tabBtnText,
              {
                color: activeTab === 'PROMOS' ? '#10b981' : colors.textMuted,
                fontWeight: activeTab === 'PROMOS' ? '700' : '600',
              },
            ]}
          >
            Promo Codes ({promos.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === 'BANNERS' && {
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
              borderColor: '#10b981',
            },
          ]}
          onPress={() => setActiveTab('BANNERS')}
          accessibilityLabel="Storefront Banners Tab"
        >
          <Ionicons
            name="images-outline"
            size={16}
            color={activeTab === 'BANNERS' ? '#10b981' : colors.textMuted}
          />
          <Text
            style={[
              styles.tabBtnText,
              {
                color: activeTab === 'BANNERS' ? '#10b981' : colors.textMuted,
                fontWeight: activeTab === 'BANNERS' ? '700' : '600',
              },
            ]}
          >
            Store Banners ({banners.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── TAB 1: PROMO CODES ─── */}
      {activeTab === 'PROMOS' && (
        <>
          {/* Form Card */}
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Create Promo Code</Text>

            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                placeholder="CODE (e.g. SAVE10, FESTIVE50)"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                value={code}
                onChangeText={setCode}
              />

              <View style={[styles.typeSelector, { borderColor: colors.border, backgroundColor: colors.cardAlt }]}>
                <TouchableOpacity
                  style={[styles.typeBtn, discountType === 'PERCENTAGE' && styles.typeBtnActive]}
                  onPress={() => setDiscountType('PERCENTAGE')}
                >
                  <Text style={[styles.typeBtnText, { color: discountType === 'PERCENTAGE' ? '#fff' : colors.text }]}>
                    % Off
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, discountType === 'FLAT' && styles.typeBtnActive]}
                  onPress={() => setDiscountType('FLAT')}
                >
                  <Text style={[styles.typeBtnText, { color: discountType === 'FLAT' ? '#fff' : colors.text }]}>
                    ₹ Flat
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                placeholder={discountType === 'PERCENTAGE' ? 'Discount % (e.g. 10)' : 'Discount ₹ (e.g. 50)'}
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={discountValue}
                onChangeText={setDiscountValue}
              />
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                placeholder="Min Order ₹ (0)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={minOrderAmount}
                onChangeText={setMinOrderAmount}
              />
            </View>

            {/* Category restriction selector pills */}
            <Text style={[styles.sectionSubTitle, { color: colors.textMuted }]}>
              Applicable Category (Optional restriction)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              <TouchableOpacity
                style={[
                  styles.catPill,
                  {
                    backgroundColor: selectedCategory === null ? '#10b981' : colors.cardAlt,
                    borderColor: selectedCategory === null ? '#10b981' : colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[styles.catPillText, { color: selectedCategory === null ? '#fff' : colors.text }]}>
                  All Categories (Storewide)
                </Text>
              </TouchableOpacity>

              {categories.map((c) => {
                const isSelected = selectedCategory === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.catPill,
                      {
                        backgroundColor: isSelected ? '#10b981' : colors.cardAlt,
                        borderColor: isSelected ? '#10b981' : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedCategory(isSelected ? null : c.id)}
                  >
                    <Text style={[styles.catPillText, { color: isSelected ? '#fff' : colors.text }]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.switchRow}>
              <Text style={[styles.label, { color: colors.text }]}>Active Immediately</Text>
              <ModernSwitch
                value={isActive}
                onValueChange={setIsActive}
              />
            </View>

            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: '#10b981' }]}
              onPress={handleCreatePromo}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="pricetag-outline" size={18} color="#fff" />
                  <Text style={styles.createBtnText}>Add Promo Code</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Filter promo codes by name..."
              placeholderTextColor={colors.textMuted}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            {Boolean(searchTerm) && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {loading && !refreshing ? (
            <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 32 }} />
          ) : (
            <FlatList
              data={filteredPromos}
              keyExtractor={(item, idx) => (item?.id != null ? String(item.id) : `promo-${idx}`)}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    fetchOffers();
                  }}
                  tintColor="#10b981"
                />
              }
              renderItem={({ item }) => (
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.cardInfo}>
                    <View style={styles.codeRow}>
                      <Text style={[styles.promoCode, { color: colors.text }]}>{item?.code}</Text>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: item?.is_active ? '#059669' : '#475569' },
                        ]}
                      >
                        <Text style={styles.badgeText}>{item?.is_active ? 'ACTIVE' : 'INACTIVE'}</Text>
                      </View>

                      {item?.applicable_category_details ? (
                        <View style={[styles.catBadge, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                          <Text style={[styles.catBadgeText, { color: colors.textMuted }]}>
                            {item.applicable_category_details.name}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={[styles.promoDesc, { color: colors.textMuted }]}>
                      {item?.discount_type === 'PERCENTAGE'
                        ? `${item?.discount_value}% OFF`
                        : `₹${item?.discount_value} FLAT OFF`}{' '}
                      • Min Order: ₹{item?.min_order_amount ?? 0}
                    </Text>
                  </View>

                  <View style={styles.actionsRow}>
                    <ModernSwitch
                      value={Boolean(item.is_active)}
                      onValueChange={() => handleTogglePromo(item)}
                    />

                    <TouchableOpacity
                      style={[styles.deleteBtn, { backgroundColor: colors.cardAlt }]}
                      onPress={() => handleDeletePromo(item.id, item.code)}
                    >
                      <Ionicons name="trash-outline" size={17} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    No promo codes created yet.
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}

      {/* ─── TAB 2: STOREFRONT BANNERS ─── */}
      {activeTab === 'BANNERS' && (
        <View style={{ flex: 1 }}>
          {/* Header Action Bar */}
          <View style={[styles.bannerHeaderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.formTitle, { color: colors.text, marginBottom: 2 }]}>
                Promotional Banners
              </Text>
              <Text style={[styles.sectionSubTitle, { color: colors.textMuted, marginBottom: 0 }]}>
                Carousel banners displayed on the customer app home screen. Reorder with Up/Down arrows.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.addBannerBtn, { backgroundColor: '#10b981' }]}
              onPress={() => setBannerModalOpen(true)}
              accessibilityLabel="Add Promotional Banner"
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addBannerBtnText}>Add Banner</Text>
            </TouchableOpacity>
          </View>

          {loading && !refreshing ? (
            <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 32 }} />
          ) : (
            <FlatList
              data={banners}
              keyExtractor={(item, idx) => (item?.id != null ? String(item.id) : `ban-${idx}`)}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    fetchOffers();
                  }}
                  tintColor="#10b981"
                />
              }
              renderItem={({ item, index }) => (
                <View style={[styles.bannerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {/* Banner Thumbnail */}
                  <View style={styles.bannerThumbWrap}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.bannerThumb} contentFit="cover" />
                    ) : (
                      <View style={[styles.bannerThumbFallback, { backgroundColor: colors.cardAlt }]}>
                        <Ionicons name="image-outline" size={24} color={colors.textMuted} />
                      </View>
                    )}
                  </View>

                  {/* Banner Details */}
                  <View style={styles.bannerDetails}>
                    <View style={styles.bannerTitleRow}>
                      <View style={[styles.orderIndexBadge, { backgroundColor: colors.cardAlt }]}>
                        <Text style={[styles.orderIndexBadgeText, { color: colors.textMuted }]}>
                          #{index + 1}
                        </Text>
                      </View>
                      <Text style={[styles.bannerTitleText, { color: colors.text }]} numberOfLines={1}>
                        {item.title || `Banner #${item.id}`}
                      </Text>
                    </View>

                    {item.link ? (
                      <Text style={[styles.bannerLinkText, { color: colors.textMuted }]} numberOfLines={1}>
                        🔗 {item.link}
                      </Text>
                    ) : null}

                    <View style={styles.bannerActiveRow}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: item.is_active ? '#10b981' : '#f43f5e' },
                        ]}
                      />
                      <Text style={[styles.bannerStatusText, { color: colors.textMuted }]}>
                        {item.is_active ? 'Active & Visible' : 'Hidden'}
                      </Text>
                    </View>
                  </View>

                  {/* Banner Reorder Up / Down Controls */}
                  <View style={styles.bannerReorderCol}>
                    <TouchableOpacity
                      style={[styles.bannerArrowBtn, { opacity: index === 0 ? 0.3 : 1 }]}
                      onPress={() => handleMoveBanner(index, -1)}
                      disabled={index === 0}
                      accessibilityLabel="Move Banner Up"
                    >
                      <Ionicons name="chevron-up" size={16} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.bannerArrowBtn, { opacity: index === banners.length - 1 ? 0.3 : 1 }]}
                      onPress={() => handleMoveBanner(index, 1)}
                      disabled={index === banners.length - 1}
                      accessibilityLabel="Move Banner Down"
                    >
                      <Ionicons name="chevron-down" size={16} color={colors.text} />
                    </TouchableOpacity>
                  </View>

                  {/* Toggle Active Switch */}
                  <ModernSwitch
                    value={Boolean(item.is_active)}
                    onValueChange={() => handleToggleBanner(item)}
                  />

                  {/* Delete Button */}
                  <TouchableOpacity
                    style={[styles.deleteBtn, { backgroundColor: colors.cardAlt }]}
                    onPress={() => handleDeleteBanner(item.id, item.title || `Banner #${item.id}`)}
                    accessibilityLabel="Delete Banner"
                  >
                    <Ionicons name="trash-outline" size={17} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="images-outline" size={44} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No banners uploaded</Text>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    Upload high-impact promotional banners to display at the top of your customer app.
                  </Text>
                  <TouchableOpacity
                    style={[styles.addBannerBtn, { backgroundColor: '#10b981', marginTop: 12 }]}
                    onPress={() => setBannerModalOpen(true)}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.addBannerBtnText}>Upload First Banner</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* ─── MODAL: ADD STOREFRONT BANNER ─── */}
      <Modal visible={bannerModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add Promotional Banner</Text>
                <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                  Upload promotional banner photo for customer home screen
                </Text>
              </View>
              <TouchableOpacity onPress={() => setBannerModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Image Picker Box */}
            <TouchableOpacity
              style={[
                styles.imagePickerBox,
                { backgroundColor: colors.cardAlt, borderColor: bannerImageUri ? '#10b981' : colors.border },
              ]}
              onPress={handlePickBannerImage}
            >
              {bannerImageUri ? (
                <Image source={{ uri: bannerImageUri }} style={styles.bannerImagePreview} contentFit="cover" />
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  <Ionicons name="image-outline" size={32} color="#10b981" />
                  <Text style={[styles.imagePickerText, { color: colors.text }]}>Tap to select banner photo</Text>
                  <Text style={[styles.imagePickerSub, { color: colors.textMuted }]}>Recommended aspect ratio 16:9</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={[styles.label, { color: colors.textMuted, marginTop: 12 }]}>Banner Title</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Festival Super Saver 50% Off"
              placeholderTextColor={colors.textMuted}
              value={bannerTitle}
              onChangeText={setBannerTitle}
            />

            <Text style={[styles.label, { color: colors.textMuted, marginTop: 10 }]}>Destination Link (Optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. /category/rice or external URL"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              value={bannerLink}
              onChangeText={setBannerLink}
            />

            <View style={[styles.switchRow, { marginTop: 12 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Active Immediately</Text>
              <ModernSwitch
                value={bannerIsActive}
                onValueChange={setBannerIsActive}
              />
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setBannerModalOpen(false)}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#10b981' }]}
                onPress={handleUploadBanner}
                disabled={uploadingBanner}
              >
                {uploadingBanner ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                    <Text style={styles.modalSubmitBtnText}>Upload Banner</Text>
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabBtnText: {
    fontSize: 13,
  },
  formCard: {
    padding: 16,
    borderBottomWidth: 1,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  typeSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  typeBtn: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: '#10b981',
  },
  typeBtnText: {
    fontWeight: '700',
    fontSize: 12,
  },
  sectionSubTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 2,
  },
  catScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 13,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13,
  },
  listContent: {
    padding: 12,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    gap: 10,
  },
  cardInfo: {
    flex: 1,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  promoCode: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  promoDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  // Banners tab styles
  bannerHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  addBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBannerBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 10,
  },
  bannerThumbWrap: {
    width: 64,
    height: 40,
    borderRadius: 6,
    overflow: 'hidden',
  },
  bannerThumb: {
    width: '100%',
    height: '100%',
  },
  bannerThumbFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerDetails: {
    flex: 1,
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderIndexBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  orderIndexBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bannerTitleText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  bannerLinkText: {
    fontSize: 11,
    marginTop: 2,
  },
  bannerActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bannerStatusText: {
    fontSize: 11,
  },
  bannerReorderCol: {
    gap: 3,
  },
  bannerArrowBtn: {
    padding: 4,
    borderRadius: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  imagePickerBox: {
    height: 140,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  bannerImagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePickerPlaceholder: {
    alignItems: 'center',
    gap: 6,
  },
  imagePickerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  imagePickerSub: {
    fontSize: 11,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalSubmitBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
