import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import ModernSwitch from '../../../components/ModernSwitch';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { ApiInstance, cachedGet, getErrorMessage } from '../../../services/api';
import { useAppTheme } from '../../../context/ThemeContext';
import { showAlert } from '../../../utils/alerts';
import UniversalCameraScanner from '../../../components/UniversalCameraScanner';
import WebCropper from '../../../components/WebCropper';

export default function AddProductScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const { id, sku: initialSku } = useLocalSearchParams<{ id?: string; sku?: string }>();
  const isEditing = Boolean(id);

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [sku, setSku] = useState(initialSku ? String(initialSku) : '');
  const [price, setPrice] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [unit, setUnit] = useState('1 kg');
  const [stock, setStock] = useState('10');
  const [maxOrderQty, setMaxOrderQty] = useState('10');
  const [expiryDate, setExpiryDate] = useState('');
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  const [isInStock, setIsInStock] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [lookingUpBarcode, setLookingUpBarcode] = useState(false);
  const [analyzingPackaging, setAnalyzingPackaging] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [showAIOptionsModal, setShowAIOptionsModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [webCropQueue, setWebCropQueue] = useState<{ uri: string; type: 'primary' | 'gallery' }[]>([]);
  const webCroppingImage = webCropQueue.length > 0 ? webCropQueue[0] : null;

  // Barcode Lookup by Text/SKU
  const handleBarcodeLookup = useCallback(async (overrideSku?: string) => {
    const cleanSku = (overrideSku !== undefined ? overrideSku : sku).trim();
    if (!cleanSku) {
      showAlert('Barcode Lookup', 'Enter or scan a barcode/SKU first.');
      return;
    }
    setLookingUpBarcode(true);
    try {
      const res = await api.get(`/products/barcode_lookup/?barcode=${encodeURIComponent(cleanSku)}`);
      const prod = res?.data?.product;
      if (prod) {
        if (prod.name) setName(prod.name);
        if (prod.brand) setBrand(prod.brand);
        if (prod.unit) setUnit(prod.unit);
        if (prod.description) setDescription(prod.description);
        showAlert('Found', `Auto-filled details for "${prod.name}".`);
      } else {
        showAlert('Scanned', `Barcode "${cleanSku}" set.`);
      }
    } catch (e: any) {
      showAlert('Lookup Failed', getErrorMessage(e, 'Could not find barcode details.'));
    } finally {
      setLookingUpBarcode(false);
    }
  }, [sku]);

  const handleBarcodeLookupRef = React.useRef(handleBarcodeLookup);
  handleBarcodeLookupRef.current = handleBarcodeLookup;

  // AI Vision Packaging Scan
  const handleAIVisionScan = async (source: 'camera' | 'library') => {
    setShowAIOptionsModal(false);
    try {
      if (Platform.OS !== 'web') {
        const perm =
          source === 'camera'
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          showAlert(
            'Permission Required',
            'Camera/Photo access is required for AI Packaging Scan.'
          );
          return;
        }
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAnalyzingPackaging(true);

        const formData = new FormData();
        const rawFilename = asset.uri.split('/').pop() || 'packaging.jpg';
        const match = /\.(\w+)$/.exec(rawFilename);
        const mimeType = match ? `image/${match[1]}` : 'image/jpeg';

        if (Platform.OS === 'web') {
          const resp = await fetch(asset.uri);
          const blob = await resp.blob();
          formData.append('image', blob, rawFilename);
        } else {
          formData.append('image', {
            uri: asset.uri,
            name: rawFilename,
            type: mimeType,
          } as any);
        }

        const res = await api.post('/products/vision_lookup/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (res?.data?.success && res?.data?.product) {
          const prod = res.data.product;
          if (prod.name) setName(prod.name);
          if (prod.brand) setBrand(prod.brand);
          if (prod.unit) setUnit(prod.unit);
          if (prod.description) setDescription(prod.description);
          setImageUri(asset.uri);
          setImageChanged(true);
          showAlert(
            'AI Vision Match',
            `Auto-filled details for "${prod.name || 'product'}".`
          );
        } else {
          showAlert(
            'AI Vision',
            res?.data?.error || 'Could not read packaging clearly. Please enter details manually.'
          );
        }
      }
    } catch (e: any) {
      showAlert(
        'AI Scan Failed',
        getErrorMessage(e, 'Could not analyze packaging photo.')
      );
    } finally {
      setAnalyzingPackaging(false);
    }
  };

  // Gallery Photos Picker
  const pickGalleryImages = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web: pick (multiple) without built-in edit, then crop + compress each one
        const webResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          quality: 1,
        });
        if (!webResult.canceled && webResult.assets && webResult.assets.length > 0) {
          setWebCropQueue((prev) => [
            ...prev,
            ...webResult.assets.map((a) => ({ uri: a.uri, type: 'gallery' as const })),
          ]);
        }
        return;
      }

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showAlert('Permission Denied', 'Photo access is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        let uri = result.assets[0].uri;
        try {
          const manip = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 800 } }],
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
          );
          uri = manip.uri;
        } catch {}
        setGalleryImages((prev) => [...prev, uri]);
      }
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to pick gallery photos.'));
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Initial Fetching
  useEffect(() => {
    let isMounted = true;
    cachedGet('/categories/')
      .then((res) => {
        if (!isMounted) return;
        const raw = res?.data?.results ?? res?.data;
        const list = Array.isArray(raw) ? raw : [];
        setCategories(list);
        if (!id && list.length > 0) {
          setSelectedCategory(list[0].id);
        }
      })
      .catch(() => {});

    if (id) {
      setLoading(true);
      api
        .get(`/products/${id}/`)
        .then((res) => {
          if (!isMounted || !res?.data) return;
          const p = res.data;
          setName(p.name || '');
          setBrand(p.brand || '');
          setSku(p.sku || '');
          setPrice(String(p.regular_price ?? p.price ?? ''));
          setOfferPrice(p.offer_price ? String(p.offer_price) : '');
          setCostPrice(p.cost_price ? String(p.cost_price) : '');
          setUnit(p.unit || '1 kg');
          setStock(String(p.stock_quantity ?? '0'));
          setMaxOrderQty(String(p.max_order_quantity ?? '10'));
          setExpiryDate(p.expiry_date || '');
          setTags(p.tags || '');
          setDescription(p.description || '');
          setIsInStock(p.is_in_stock ?? true);
          if (p.category) setSelectedCategory(Number(p.category));
          if (p.image) setImageUri(p.image);
          if (Array.isArray(p.gallery_images)) {
            setGalleryImages(
              p.gallery_images
                .map((g: any) => (typeof g === 'string' ? g : g?.image))
                .filter(Boolean)
            );
          }
        })
        .catch((err) => {
          if (err?.response?.status !== 401) {
            showAlert('Error', getErrorMessage(err, 'Could not load product details.'));
          }
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    } else if (initialSku) {
      handleBarcodeLookupRef.current(String(initialSku));
    }
    return () => {
      isMounted = false;
    };
  }, [id, initialSku]);

  // Primary Image Picker
  const pickImage = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web: pick without built-in edit, then crop + compress via WebCropper
        const webResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 1,
        });
        if (!webResult.canceled && webResult.assets && webResult.assets.length > 0) {
          setWebCropQueue((prev) => [...prev, { uri: webResult.assets[0].uri, type: 'primary' }]);
        }
        return;
      }

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showAlert('Permission Required', 'Permission to access camera roll is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        let uri = result.assets[0].uri;
        try {
          const manip = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 800 } }],
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
          );
          uri = manip.uri;
        } catch {}
        setImageUri(uri);
        setImageChanged(true);
      }
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Unable to pick image.'));
    }
  };

  // Web crop handlers (crop + compress, then advance queue)
  const handleWebCropComplete = (blob: Blob | null) => {
    const current = webCroppingImage;
    if (blob && current) {
      const croppedUri = URL.createObjectURL(blob);
      if (current.type === 'primary') {
        setImageUri(croppedUri);
        setImageChanged(true);
      } else {
        setGalleryImages((prev) => [...prev, croppedUri]);
      }
    }
    setWebCropQueue((prev) => prev.slice(1));
  };

  const handleWebCropCancel = () => {
    setWebCropQueue((prev) => prev.slice(1));
  };

  const getUploadFileInfo = (uri: string, fallback: string) => {
    const isInline = uri.startsWith('blob:') || uri.startsWith('data:');
    const raw = isInline ? '' : uri.split('/').pop()?.split('?')[0] || '';
    const match = /\.(\w+)$/.exec(raw);
    if (!match) return { name: `${fallback}.jpg`, type: 'image/jpeg' };
    const ext = match[1].toLowerCase();
    return { name: raw, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` };
  };

  // Save Handler
  const handleSave = async () => {
    const cleanName = name.trim();
    const cleanPrice = price.trim();
    const cleanUnit = unit.trim();

    if (!cleanName || !cleanPrice || !cleanUnit) {
      showAlert('Required Fields', 'Name, Price, and Unit are required.');
      return;
    }

    const parsedPrice = Number(cleanPrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      showAlert('Invalid Price', 'Please enter a valid price.');
      return;
    }

    const parsedStock = Math.max(0, parseInt(stock || '0', 10) || 0);

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', cleanName);
      formData.append('regular_price', String(parsedPrice));
      if (offerPrice.trim()) {
        formData.append('offer_price', offerPrice.trim());
      }
      if (costPrice.trim()) {
        formData.append('cost_price', costPrice.trim());
      }
      if (selectedCategory) {
        formData.append('category', String(selectedCategory));
      }
      if (brand.trim()) formData.append('brand', brand.trim());
      if (sku.trim()) formData.append('sku', sku.trim());
      if (expiryDate.trim()) formData.append('expiry_date', expiryDate.trim());
      if (tags.trim()) formData.append('tags', tags.trim());
      if (description.trim()) formData.append('description', description.trim());
      formData.append('unit', cleanUnit);
      formData.append('stock_quantity', String(parsedStock));
      formData.append('max_order_quantity', String(parseInt(maxOrderQty || '10', 10) || 10));
      formData.append('is_in_stock', isInStock && parsedStock > 0 ? 'true' : 'false');

      if (imageUri && imageChanged) {
        const { name: rawFilename, type: mimeType } = getUploadFileInfo(imageUri, 'product');

        if (Platform.OS === 'web') {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          formData.append('image', blob, rawFilename);
        } else {
          formData.append('image', {
            uri: imageUri,
            name: rawFilename,
            type: mimeType,
          } as any);
        }
      }

      for (let i = 0; i < galleryImages.length; i++) {
        const gUri = galleryImages[i];
        if (gUri.startsWith('http://') || gUri.startsWith('https://')) continue;
        const { name: gFilename, type: gMime } = getUploadFileInfo(gUri, `gallery_${i}`);
        if (Platform.OS === 'web') {
          const resp = await fetch(gUri);
          const blob = await resp.blob();
          formData.append('gallery_images', blob, gFilename);
        } else {
          formData.append('gallery_images', {
            uri: gUri,
            name: gFilename,
            type: gMime,
          } as any);
        }
      }

      if (isEditing && id) {
        await api.patch(`/products/${id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/products/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      (api as ApiInstance).clearCache();
      showAlert(
        'Success',
        isEditing ? 'Product updated.' : 'Product added.',
        () => router.back()
      );
    } catch (error: any) {
      showAlert('Error', getErrorMessage(error, 'Failed to save product.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* ─── Top Navigation Bar ─── */}
      <View
        style={[
          styles.topNavBar,
          {
            paddingTop: Math.max(insets.top, 12),
            backgroundColor: colors.bg,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.navTitle, { color: colors.text }]}>
          {isEditing ? 'Edit Product' : 'New Product'}
        </Text>

        <TouchableOpacity
          style={[styles.navSaveBtn, { backgroundColor: '#10b981' }]}
          onPress={handleSave}
          disabled={loading}
          accessibilityLabel="Save product"
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.navSaveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Media & AI Bar ─── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.mediaRow}>
            {/* Primary Image */}
            <TouchableOpacity
              style={[styles.primaryImageThumb, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
              onPress={pickImage}
              activeOpacity={0.8}
            >
              {imageUri ? (
                <>
                  <Image source={{ uri: imageUri }} style={styles.fullImage} contentFit="cover" />
                  <View style={styles.editThumbBadge}>
                    <Ionicons name="pencil" size={11} color="#ffffff" />
                  </View>
                </>
              ) : (
                <View style={styles.imagePlaceholderBox}>
                  <Ionicons name="camera-outline" size={26} color={colors.textMuted} />
                  <Text style={[styles.imagePlaceholderText, { color: colors.textMuted }]}>
                    Photo
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Gallery Reel */}
            <View style={{ flex: 1 }}>
              <View style={styles.mediaHeaderRow}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted, marginBottom: 0 }]}>
                  Gallery ({galleryImages.length})
                </Text>

                {/* AI Scan Action Pill */}
                <TouchableOpacity
                  style={[
                    styles.aiScanPill,
                    {
                      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.16)' : '#eef2ff',
                      borderColor: isDark ? '#4338ca' : '#c7d2fe',
                    },
                  ]}
                  onPress={() => setShowAIOptionsModal(true)}
                  disabled={analyzingPackaging}
                >
                  {analyzingPackaging ? (
                    <ActivityIndicator size="small" color="#6366f1" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={13} color="#6366f1" />
                      <Text style={[styles.aiScanPillText, { color: isDark ? '#a5b4fc' : '#4338ca' }]}>
                        AI Scan
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.galleryReel}
              >
                {galleryImages.map((uri, idx) => (
                  <View key={idx} style={[styles.galleryThumbBox, { borderColor: colors.border }]}>
                    <Image source={{ uri }} style={styles.fullImage} contentFit="cover" />
                    <TouchableOpacity
                      style={styles.galleryRemoveBadge}
                      onPress={() => removeGalleryImage(idx)}
                    >
                      <Ionicons name="close" size={11} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity
                  style={[styles.addGalleryChip, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                  onPress={pickGalleryImages}
                >
                  <Ionicons name="add" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </View>

        {/* ─── 1. General Details ─── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>GENERAL</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Name */}
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Product Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g. Sona Masoori Rice"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />

          {/* Category Selector */}
          <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 4 }]}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catPill,
                    active
                      ? { backgroundColor: '#10b981', borderColor: '#10b981' }
                      : { backgroundColor: colors.cardAlt, borderColor: colors.border },
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text
                    style={[
                      styles.catPillText,
                      { color: active ? '#ffffff' : colors.textMuted, fontWeight: active ? '700' : '500' },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Brand & Unit */}
          <View style={styles.gridRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Brand</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. Tata"
                placeholderTextColor={colors.textMuted}
                value={brand}
                onChangeText={setBrand}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Unit *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                placeholder="1 kg, 500 g"
                placeholderTextColor={colors.textMuted}
                value={unit}
                onChangeText={setUnit}
              />
            </View>
          </View>
        </View>

        {/* ─── 2. Pricing & Inventory ─── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PRICING & STOCK</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Price & Offer Price */}
          <View style={styles.gridRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Price (₹) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Offer Price (₹)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                placeholder="Optional"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={offerPrice}
                onChangeText={setOfferPrice}
              />
            </View>
          </View>

          {/* Stock & Max Order Limit */}
          <View style={styles.gridRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Stock</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                placeholder="10"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={stock}
                onChangeText={setStock}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Max Limit</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                placeholder="10"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={maxOrderQty}
                onChangeText={setMaxOrderQty}
              />
            </View>
          </View>

          {/* Cost Price */}
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Cost Price (₹)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
            placeholder="Cost to store"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={costPrice}
            onChangeText={setCostPrice}
          />

          {/* In-Stock Switch */}
          <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 4 }]}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>In Stock</Text>
            <ModernSwitch value={isInStock} onValueChange={setIsInStock} />
          </View>
        </View>

        {/* ─── 3. Organization & Details ─── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>MORE DETAILS</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Barcode / SKU with Scan & Auto-Fill */}
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Barcode</Text>
          <View style={styles.barcodeInputRow}>
            <TextInput
              style={[
                styles.input,
                { flex: 1, marginBottom: 0, backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Barcode number"
              placeholderTextColor={colors.textMuted}
              value={sku}
              onChangeText={setSku}
            />
            <TouchableOpacity
              style={[styles.barcodeIconBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
              onPress={() => setShowBarcodeScanner(true)}
              accessibilityLabel="Scan with Camera"
            >
              <Ionicons name="barcode-outline" size={18} color="#10b981" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.lookupBtn}
              onPress={() => handleBarcodeLookup()}
              disabled={lookingUpBarcode}
            >
              {lookingUpBarcode ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.lookupBtnText}>Auto-Fill</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Expiry Date */}
          <View style={{ marginTop: 10 }}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Expiry Date</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              value={expiryDate}
              onChangeText={setExpiryDate}
            />
          </View>

          {/* Tags */}
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Tags</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g. Snacks, Fresh"
            placeholderTextColor={colors.textMuted}
            value={tags}
            onChangeText={setTags}
          />

          {/* Description */}
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Description</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text, marginBottom: 0 },
            ]}
            placeholder="Product details..."
            placeholderTextColor={colors.textMuted}
            multiline
            value={description}
            onChangeText={setDescription}
          />
        </View>
      </ScrollView>

      {/* ─── AI Packaging Vision Modal ─── */}
      <Modal visible={showAIOptionsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="sparkles" size={18} color="#6366f1" />
                <Text style={[styles.modalTitle, { color: colors.text }]}>AI Packaging Scan</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAIOptionsModal(false)}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalOptions}>
              <TouchableOpacity
                style={[styles.modalOptionBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                onPress={() => handleAIVisionScan('camera')}
              >
                <Ionicons name="camera" size={20} color="#6366f1" />
                <Text style={[styles.modalOptionText, { color: colors.text }]}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalOptionBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                onPress={() => handleAIVisionScan('library')}
              >
                <Ionicons name="images" size={20} color="#10b981" />
                <Text style={[styles.modalOptionText, { color: colors.text }]}>Photo Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Universal Camera Barcode Scanner Modal ─── */}
      <Modal
        visible={showBarcodeScanner}
        animationType="slide"
        onRequestClose={() => setShowBarcodeScanner(false)}
      >
        {showBarcodeScanner && (
          <UniversalCameraScanner
            title="Scan Product Barcode"
            subtitle="Align barcode within frame"
            onScan={(code) => {
              setShowBarcodeScanner(false);
              setSku(code);
              handleBarcodeLookup(code);
            }}
            onClose={() => setShowBarcodeScanner(false)}
          />
        )}
      </Modal>

      {/* ─── Web Crop + Compress (one image at a time) ─── */}
      {Platform.OS === 'web' && webCroppingImage && (
        <WebCropper
          key={`${webCroppingImage.uri}-${webCropQueue.length}`}
          imageSrc={webCroppingImage.uri}
          initialAspect={1}
          onCropComplete={handleWebCropComplete}
          onCancel={handleWebCropCancel}
        />
      )}
    </View>
  );
}

// ─── Stylesheet ───
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  navSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navSaveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
  },

  // Inset Card Architecture
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    marginBottom: 6,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    marginBottom: 10,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },

  // Media Card
  mediaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryImageThumb: {
    width: 82,
    height: 82,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  imagePlaceholderBox: {
    alignItems: 'center',
    gap: 2,
  },
  imagePlaceholderText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  editThumbBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiScanPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  aiScanPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  galleryReel: {
    flexDirection: 'row',
    gap: 8,
  },
  galleryThumbBox: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  galleryRemoveBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addGalleryChip: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Category Pills
  categoryScroll: {
    gap: 7,
    marginBottom: 10,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  catPillText: {
    fontSize: 12,
  },

  // Switch Row
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Barcode Input Row
  barcodeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barcodeIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookupBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookupBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },



  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  modalOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalOptionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  modalOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
