import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { useAppTheme } from '../../../context/ThemeContext';
import { showAlert, showConfirm } from '../../../utils/alerts';

export default function ShowcaseScreen() {
  const { colors, isDark } = useAppTheme();

  const [sections, setSections] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New section creation
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [creatingSection, setCreatingSection] = useState(false);

  // Banner creation modal state
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [bannerImageUri, setBannerImageUri] = useState<string | null>(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Rename section modal
  const [renamingSection, setRenamingSection] = useState<any | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Curate products modal
  const [curatingSection, setCuratingSection] = useState<any | null>(null);
  const [curatedItems, setCuratedItems] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [savingProducts, setSavingProducts] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [secRes, banRes, prodRes] = await Promise.allSettled([
        api.get('/store/homepage-sections/'),
        api.get('/offers/banners/'),
        api.get('/products/?limit=200'),
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
      // Handled per-promise
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ----------------------------------------------------
  // BANNER OPERATIONS
  // ----------------------------------------------------

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
      showAlert('Validation', 'Please select an image for the promotional banner.');
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

  const handleToggleBanner = async (ban: any) => {
    try {
      await api.patch(`/offers/banners/${ban.id}/`, {
        is_active: !ban.is_active,
      });
      (api as ApiInstance).clearCache();
      fetchData();
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
      fetchData();
    }
  };

  const handleDeleteBanner = (id: number, title: string) => {
    showConfirm('Delete Banner', `Delete promotional banner "${title}"?`, async () => {
      try {
        await api.delete(`/offers/banners/${id}/`);
        (api as ApiInstance).clearCache();
        fetchData();
        showAlert('Deleted', 'Promotional banner removed.');
      } catch (e: any) {
        showAlert('Error', getErrorMessage(e, 'Failed to delete banner.'));
      }
    });
  };

  // ----------------------------------------------------
  // SECTION OPERATIONS
  // ----------------------------------------------------

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
      setNewSectionTitle('');
      await fetchData();
      showAlert('Success', `Homepage aisle "${cleanTitle}" created!`);
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to create section.'));
    } finally {
      setCreatingSection(false);
    }
  };

  const handleToggleSection = async (sec: any) => {
    try {
      await api.patch(`/store/homepage-sections/${sec.id}/`, {
        is_active: !sec.is_active,
      });
      (api as ApiInstance).clearCache();
      fetchData();
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to update section.'));
    }
  };

  const handleMoveSection = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const updated = [...sections];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    const reordered = updated.map((s, idx) => ({ ...s, display_order: idx }));
    setSections(reordered);

    try {
      await api.post(
        '/store/homepage-sections/reorder/',
        reordered.map((s) => ({ id: s.id, display_order: s.display_order }))
      );
      (api as ApiInstance).clearCache();
    } catch {
      fetchData();
    }
  };

  const handleDeleteSection = (id: number, title: string) => {
    showConfirm('Delete Section', `Delete homepage section "${title}"?`, async () => {
      try {
        await api.delete(`/store/homepage-sections/${id}/`);
        (api as ApiInstance).clearCache();
        fetchData();
      } catch (e: any) {
        showAlert('Error', getErrorMessage(e, 'Failed to delete section.'));
      }
    });
  };

  const handleOpenRename = (sec: any) => {
    setRenamingSection(sec);
    setRenameTitle(sec.title || '');
  };

  const handleSaveRename = async () => {
    if (!renamingSection) return;
    const cleanTitle = renameTitle.trim();
    if (!cleanTitle) {
      showAlert('Validation', 'Section title cannot be empty.');
      return;
    }
    setRenaming(true);
    try {
      await api.patch(`/store/homepage-sections/${renamingSection.id}/`, {
        title: cleanTitle,
      });
      (api as ApiInstance).clearCache();
      setRenamingSection(null);
      fetchData();
      showAlert('Success', 'Section title renamed!');
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to rename section.'));
    } finally {
      setRenaming(false);
    }
  };

  // ----------------------------------------------------
  // PRODUCT CURATION IN SECTION
  // ----------------------------------------------------

  const handleOpenCurate = (sec: any) => {
    setCuratingSection(sec);
    setCuratedItems([...(sec.items || [])]);
    setProductSearch('');
  };

  const handleToggleProductInCurated = (prod: any) => {
    const exists = curatedItems.some((i) => i.id === prod.id);
    if (exists) {
      setCuratedItems(curatedItems.filter((i) => i.id !== prod.id));
    } else {
      setCuratedItems([...curatedItems, prod]);
    }
  };

  const handleSaveCuratedProducts = async () => {
    if (!curatingSection) return;
    setSavingProducts(true);
    try {
      await api.patch(`/store/homepage-sections/${curatingSection.id}/`, {
        product_ids: curatedItems.map((p) => p.id),
      });
      (api as ApiInstance).clearCache();
      setCuratingSection(null);
      await fetchData();
      showAlert('Saved', 'Showcase section products updated successfully!');
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to save section products.'));
    } finally {
      setSavingProducts(false);
    }
  };

  const handleQuickRemoveProduct = async (sec: any, prodId: number) => {
    const updated = (sec.items || []).filter((i: any) => i.id !== prodId);
    try {
      await api.patch(`/store/homepage-sections/${sec.id}/`, {
        product_ids: updated.map((p: any) => p.id),
      });
      (api as ApiInstance).clearCache();
      fetchData();
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to remove product from section.'));
    }
  };

  const filteredCatalog = allProducts.filter((p) => {
    if (!productSearch.trim()) return true;
    const term = productSearch.toLowerCase();
    const nameMatch = p?.name?.toLowerCase().includes(term);
    const catMatch = p?.category_name?.toLowerCase().includes(term);
    return nameMatch || catMatch;
  });

  if (loading && !refreshing) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Loading storefront showcase...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
            tintColor="#10b981"
          />
        }
      >
        <View style={styles.maxContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Storefront Showcase</Text>
            <Text style={[styles.subTitle, { color: colors.textMuted }]}>
              Curate top hero banners and custom product aisles featured on the customer app
            </Text>
          </View>

          {/* ================================================================ */}
          {/* SECTION 1: PROMOTIONAL HERO BANNERS */}
          {/* ================================================================ */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="images-outline" size={18} color="#ec4899" />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    Hero Banners ({banners.length})
                  </Text>
                </View>
                <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                  Main carousel banners displayed at the top of the storefront
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.uploadBannerBtn, { backgroundColor: '#10b981' }]}
                onPress={() => setBannerModalOpen(true)}
              >
                <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                <Text style={styles.uploadBannerBtnText}>Upload Banner</Text>
              </TouchableOpacity>
            </View>

            {banners.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <Ionicons name="image-outline" size={32} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No promotional banners uploaded yet.
                </Text>
                <TouchableOpacity
                  style={[styles.addFirstBtn, { borderColor: '#10b981' }]}
                  onPress={() => setBannerModalOpen(true)}
                >
                  <Text style={styles.addFirstBtnText}>+ Add First Banner</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.bannerList}>
                {banners.map((ban, idx) => (
                  <View
                    key={ban?.id ?? `ban-${idx}`}
                    style={[
                      styles.bannerItem,
                      { backgroundColor: colors.cardAlt, borderColor: colors.border },
                    ]}
                  >
                    {/* Thumbnail */}
                    <View style={styles.bannerThumbWrap}>
                      {ban.image ? (
                        <Image source={{ uri: ban.image }} style={styles.bannerThumb} contentFit="cover" />
                      ) : (
                        <View style={[styles.bannerThumbFallback, { backgroundColor: colors.border }]}>
                          <Ionicons name="image-outline" size={20} color={colors.textMuted} />
                        </View>
                      )}
                    </View>

                    {/* Info */}
                    <View style={styles.bannerInfo}>
                      <Text style={[styles.bannerTitleText, { color: colors.text }]} numberOfLines={1}>
                        {ban.title || `Banner #${ban.id}`}
                      </Text>
                      {ban.link ? (
                        <Text style={[styles.bannerLinkText, { color: colors.textMuted }]} numberOfLines={1}>
                          🔗 {ban.link}
                        </Text>
                      ) : null}
                      <View style={styles.bannerStatusRow}>
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: ban.is_active ? '#10b981' : '#f43f5e' },
                          ]}
                        />
                        <Text style={[styles.bannerStatusText, { color: colors.textMuted }]}>
                          {ban.is_active ? 'Active' : 'Hidden'}
                        </Text>
                      </View>
                    </View>

                    {/* Order buttons */}
                    <View style={styles.orderBtnsCol}>
                      <TouchableOpacity
                        style={[styles.orderBtn, { opacity: idx === 0 ? 0.3 : 1 }]}
                        onPress={() => handleMoveBanner(idx, -1)}
                        disabled={idx === 0}
                      >
                        <Ionicons name="chevron-up" size={16} color={colors.text} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.orderBtn, { opacity: idx === banners.length - 1 ? 0.3 : 1 }]}
                        onPress={() => handleMoveBanner(idx, 1)}
                        disabled={idx === banners.length - 1}
                      >
                        <Ionicons name="chevron-down" size={16} color={colors.text} />
                      </TouchableOpacity>
                    </View>

                    {/* Switch */}
                    <Switch
                      value={Boolean(ban.is_active)}
                      onValueChange={() => handleToggleBanner(ban)}
                      trackColor={{ false: '#334155', true: '#10b981' }}
                    />

                    {/* Delete */}
                    <TouchableOpacity
                      style={styles.trashBtn}
                      onPress={() => handleDeleteBanner(ban.id, ban.title || `Banner #${ban.id}`)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ================================================================ */}
          {/* SECTION 2: SHOWCASE AISLES / SECTIONS */}
          {/* ================================================================ */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
            <View style={styles.cardHeader}>
              <View>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="layers-outline" size={18} color="#0ea5e9" />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    Curated Homepage Aisles ({sections.length})
                  </Text>
                </View>
                <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                  Custom curated grocery shelves shown to customers on the app home screen
                </Text>
              </View>
            </View>

            {/* Create new section inline */}
            <View style={[styles.createRow, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. Weekend Essentials, Breakfast Deals..."
                placeholderTextColor={colors.textMuted}
                value={newSectionTitle}
                onChangeText={setNewSectionTitle}
              />
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: '#10b981' }]}
                onPress={handleCreateSection}
                disabled={creatingSection}
              >
                {creatingSection ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.addBtnText}>Add Aisle</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {sections.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <Ionicons name="grid-outline" size={32} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No custom homepage aisles created yet.
                </Text>
              </View>
            ) : (
              <View style={styles.sectionsList}>
                {sections.map((sec, idx) => {
                  const itemsCount = (sec.items || []).length;
                  return (
                    <View
                      key={sec?.id ?? `sec-${idx}`}
                      style={[
                        styles.sectionCard,
                        { backgroundColor: colors.cardAlt, borderColor: colors.border },
                      ]}
                    >
                      {/* Section Top Header */}
                      <View style={styles.secTopRow}>
                        <View style={styles.secTitleWrap}>
                          <View style={[styles.orderBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[styles.orderBadgeText, { color: colors.textMuted }]}>#{idx + 1}</Text>
                          </View>
                          <Text style={[styles.secTitleText, { color: colors.text }]}>{sec.title}</Text>
                          <TouchableOpacity style={styles.renameIconBtn} onPress={() => handleOpenRename(sec)}>
                            <Ionicons name="pencil-outline" size={15} color={colors.textMuted} />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.secControlsRow}>
                          <View style={styles.orderBtnsCol}>
                            <TouchableOpacity
                              style={[styles.orderBtn, { opacity: idx === 0 ? 0.3 : 1 }]}
                              onPress={() => handleMoveSection(idx, -1)}
                              disabled={idx === 0}
                            >
                              <Ionicons name="chevron-up" size={16} color={colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.orderBtn, { opacity: idx === sections.length - 1 ? 0.3 : 1 }]}
                              onPress={() => handleMoveSection(idx, 1)}
                              disabled={idx === sections.length - 1}
                            >
                              <Ionicons name="chevron-down" size={16} color={colors.text} />
                            </TouchableOpacity>
                          </View>

                          <Switch
                            value={Boolean(sec.is_active)}
                            onValueChange={() => handleToggleSection(sec)}
                            trackColor={{ false: '#334155', true: '#10b981' }}
                          />

                          <TouchableOpacity
                            style={styles.trashBtn}
                            onPress={() => handleDeleteSection(sec.id, sec.title)}
                          >
                            <Ionicons name="trash-outline" size={18} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Products preview strip */}
                      <View style={styles.productsArea}>
                        <View style={styles.productsAreaHeader}>
                          <Text style={[styles.productsCountText, { color: colors.textMuted }]}>
                            {itemsCount} {itemsCount === 1 ? 'Product' : 'Products'} Curated
                          </Text>
                          <TouchableOpacity
                            style={[styles.curateBtn, { backgroundColor: '#10b981' }]}
                            onPress={() => handleOpenCurate(sec)}
                          >
                            <Ionicons name="add-circle-outline" size={16} color="#fff" />
                            <Text style={styles.curateBtnText}>Curate Products</Text>
                          </TouchableOpacity>
                        </View>

                        {itemsCount === 0 ? (
                          <View style={[styles.noItemsBox, { borderColor: colors.border }]}>
                            <Text style={[styles.noItemsText, { color: colors.textMuted }]}>
                              No products assigned to this aisle. Click "Curate Products" to add items.
                            </Text>
                          </View>
                        ) : (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
                            {sec.items.map((item: any, pIdx: number) => (
                              <View
                                key={item?.id ?? `item-${pIdx}`}
                                style={[
                                  styles.prodPill,
                                  { backgroundColor: colors.card, borderColor: colors.border },
                                ]}
                              >
                                <View style={styles.prodThumbWrap}>
                                  {item.image ? (
                                    <Image source={{ uri: item.image }} style={styles.prodThumb} contentFit="contain" />
                                  ) : (
                                    <View style={[styles.prodThumbFallback, { backgroundColor: colors.cardAlt }]}>
                                      <Text style={[styles.prodThumbInitial, { color: colors.textMuted }]}>
                                        {(item.name || 'P').charAt(0)}
                                      </Text>
                                    </View>
                                  )}
                                  <View style={styles.posBadge}>
                                    <Text style={styles.posBadgeText}>#{pIdx + 1}</Text>
                                  </View>
                                </View>

                                <Text style={[styles.prodName, { color: colors.text }]} numberOfLines={1}>
                                  {item.name}
                                </Text>
                                <Text style={[styles.prodPrice, { color: '#10b981' }]}>
                                  ₹{item.offer_price || item.regular_price}
                                </Text>

                                <TouchableOpacity
                                  style={styles.removeProdBtn}
                                  onPress={() => handleQuickRemoveProduct(sec, item.id)}
                                >
                                  <Ionicons name="close-circle" size={18} color="#ef4444" />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </ScrollView>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ================================================================ */}
      {/* MODAL: UPLOAD HERO BANNER */}
      {/* ================================================================ */}
      <Modal visible={bannerModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Upload Hero Banner</Text>
                <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                  Recommended aspect ratio 16:9 for sharp storefront display
                </Text>
              </View>
              <TouchableOpacity onPress={() => setBannerModalOpen(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Image Picker Box */}
            <TouchableOpacity
              style={[
                styles.bannerPickerBox,
                { backgroundColor: colors.cardAlt, borderColor: colors.border },
              ]}
              onPress={handlePickBannerImage}
            >
              {bannerImageUri ? (
                <Image source={{ uri: bannerImageUri }} style={styles.pickedBannerPreview} contentFit="cover" />
              ) : (
                <View style={styles.bannerPickerPlaceholder}>
                  <Ionicons name="cloud-upload-outline" size={36} color="#10b981" />
                  <Text style={[styles.pickerTitle, { color: colors.text }]}>Tap to Select Banner Image</Text>
                  <Text style={[styles.pickerSub, { color: colors.textMuted }]}>
                    Supports JPG, PNG, WEBP from device gallery
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {bannerImageUri && (
              <TouchableOpacity style={styles.repickBtn} onPress={handlePickBannerImage}>
                <Ionicons name="refresh" size={14} color="#10b981" />
                <Text style={styles.repickBtnText}>Choose Different Image</Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.label, { color: colors.textMuted }]}>Banner Title</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Festival Super Saver Weekend"
              placeholderTextColor={colors.textMuted}
              value={bannerTitle}
              onChangeText={setBannerTitle}
            />

            <Text style={[styles.label, { color: colors.textMuted, marginTop: 10 }]}>Destination Link (Optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. /category/grains or external URL"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              value={bannerLink}
              onChangeText={setBannerLink}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setBannerModalOpen(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#10b981' }]}
                onPress={handleUploadBanner}
                disabled={uploadingBanner}
              >
                {uploadingBanner ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                    <Text style={styles.submitBtnText}>Upload Banner</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================================================================ */}
      {/* MODAL: RENAME SECTION */}
      {/* ================================================================ */}
      <Modal visible={Boolean(renamingSection)} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCardSmall, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Rename Homepage Aisle</Text>
              <TouchableOpacity onPress={() => setRenamingSection(null)}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text, marginVertical: 14 }]}
              value={renameTitle}
              onChangeText={setRenameTitle}
              placeholder="Aisle title"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setRenamingSection(null)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#10b981' }]}
                onPress={handleSaveRename}
                disabled={renaming}
              >
                {renaming ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================================================================ */}
      {/* MODAL: CURATE SECTION PRODUCTS */}
      {/* ================================================================ */}
      <Modal visible={Boolean(curatingSection)} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.curateModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                  Curate "{curatingSection?.title}"
                </Text>
                <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                  {curatedItems.length} products currently selected
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCuratingSection(null)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Search filter */}
            <View style={[styles.searchBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search products by name or category..."
                placeholderTextColor={colors.textMuted}
                value={productSearch}
                onChangeText={setProductSearch}
              />
              {Boolean(productSearch) && (
                <TouchableOpacity onPress={() => setProductSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Catalog Grid List */}
            <FlatList
              data={filteredCatalog}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ paddingBottom: 16 }}
              numColumns={2}
              columnWrapperStyle={{ gap: 10 }}
              renderItem={({ item }) => {
                const isSelected = curatedItems.some((i) => i.id === item.id);
                return (
                  <TouchableOpacity
                    style={[
                      styles.catalogCard,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(16, 185, 129, 0.15)'
                            : '#ecfdf5'
                          : colors.cardAlt,
                        borderColor: isSelected ? '#10b981' : colors.border,
                      },
                    ]}
                    onPress={() => handleToggleProductInCurated(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.catalogThumbWrap}>
                      {item.image ? (
                        <Image source={{ uri: item.image }} style={styles.catalogThumb} contentFit="contain" />
                      ) : (
                        <View style={[styles.catalogFallback, { backgroundColor: colors.card }]}>
                          <Text style={[styles.catalogFallbackText, { color: colors.textMuted }]}>
                            {(item.name || 'P').charAt(0)}
                          </Text>
                        </View>
                      )}
                      {isSelected && (
                        <View style={styles.checkBadge}>
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        </View>
                      )}
                    </View>

                    <Text style={[styles.catalogName, { color: colors.text }]} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={[styles.catalogPrice, { color: '#10b981' }]}>
                      ₹{item.offer_price || item.regular_price}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyCatalogBox}>
                  <Text style={[styles.emptyCatalogText, { color: colors.textMuted }]}>
                    No products matched your search.
                  </Text>
                </View>
              }
            />

            {/* Bottom action bar */}
            <View style={[styles.curateBottomBar, { borderTopColor: colors.border }]}>
              <View style={[styles.curateCountPill, { backgroundColor: colors.cardAlt }]}>
                <Text style={[styles.curateCountPillText, { color: colors.text }]}>
                  {curatedItems.length} Selected
                </Text>
              </View>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={() => setCuratingSection(null)}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: '#10b981' }]}
                  onPress={handleSaveCuratedProducts}
                  disabled={savingProducts}
                >
                  {savingProducts ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={16} color="#fff" />
                      <Text style={styles.submitBtnText}>Save Section</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  maxContainer: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subTitle: {
    fontSize: 13,
    marginTop: 4,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  uploadBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadBannerBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyBox: {
    padding: 24,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  addFirstBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
  },
  addFirstBtnText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '700',
  },
  bannerList: {
    gap: 10,
  },
  bannerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  bannerThumbWrap: {
    width: 80,
    height: 48,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerInfo: {
    flex: 1,
    gap: 2,
  },
  bannerTitleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  bannerLinkText: {
    fontSize: 11,
  },
  bannerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  bannerStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  orderBtnsCol: {
    flexDirection: 'column',
    gap: 2,
  },
  orderBtn: {
    padding: 3,
  },
  trashBtn: {
    padding: 6,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionsList: {
    gap: 14,
  },
  sectionCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  secTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  secTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  orderBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  orderBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  secTitleText: {
    fontSize: 15,
    fontWeight: '700',
  },
  renameIconBtn: {
    padding: 4,
  },
  secControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  productsArea: {
    gap: 8,
  },
  productsAreaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productsCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  curateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  curateBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  noItemsBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  noItemsText: {
    fontSize: 12,
    textAlign: 'center',
  },
  hScroll: {
    marginTop: 4,
  },
  prodPill: {
    width: 120,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 10,
    alignItems: 'center',
    position: 'relative',
  },
  prodThumbWrap: {
    width: 60,
    height: 60,
    marginBottom: 6,
    position: 'relative',
  },
  prodThumb: {
    width: '100%',
    height: '100%',
  },
  prodThumbFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prodThumbInitial: {
    fontSize: 22,
    fontWeight: '800',
  },
  posBadge: {
    position: 'absolute',
    top: -2,
    left: -2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  posBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  prodName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  prodPrice: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  removeProdBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
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
  modalCardSmall: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
  },
  curateModalCard: {
    width: '100%',
    maxWidth: 640,
    height: '85%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  bannerPickerBox: {
    height: 160,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },
  pickedBannerPreview: {
    width: '100%',
    height: '100%',
  },
  bannerPickerPlaceholder: {
    alignItems: 'center',
    gap: 4,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  pickerSub: {
    fontSize: 12,
  },
  repickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginBottom: 10,
  },
  repickBtnText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  catalogCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 4,
    alignItems: 'center',
  },
  catalogThumbWrap: {
    width: 70,
    height: 70,
    marginBottom: 6,
    position: 'relative',
  },
  catalogThumb: {
    width: '100%',
    height: '100%',
  },
  catalogFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catalogFallbackText: {
    fontSize: 24,
    fontWeight: '800',
  },
  checkBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  catalogName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  catalogPrice: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  emptyCatalogBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyCatalogText: {
    fontSize: 13,
  },
  curateBottomBar: {
    borderTopWidth: 1,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  curateCountPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  curateCountPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
