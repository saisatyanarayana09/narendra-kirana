import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Switch,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { useAppTheme } from '../../../context/ThemeContext';
import { showAlert } from '../../../utils/alerts';

export default function AddProductScreen() {
  const router = useRouter();
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
  const [loading, setLoading] = useState(false);
  const [lookingUpBarcode, setLookingUpBarcode] = useState(false);
  const [analyzingPackaging, setAnalyzingPackaging] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [showAIOptionsModal, setShowAIOptionsModal] = useState(false);

  const handleBarcodeLookup = async (overrideSku?: string) => {
    const cleanSku = (overrideSku !== undefined ? overrideSku : sku).trim();
    if (!cleanSku) {
      showAlert('Barcode Lookup', 'Enter or scan a barcode/SKU number first.');
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
        showAlert('Found!', `Auto-filled details for "${prod.name}".`);
      } else {
        showAlert('Scanned', `Barcode "${cleanSku}" set. Fill in product details below.`);
      }
    } catch (e: any) {
      showAlert('Lookup Failed', getErrorMessage(e, 'Could not find barcode details.'));
    } finally {
      setLookingUpBarcode(false);
    }
  };

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
            'Camera / Photo library permission is required for AI Packaging Scan.'
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
          // Auto-apply as primary product photo
          setImageUri(asset.uri);
          setImageChanged(true);
          showAlert(
            'AI Vision Match! ✨',
            `Successfully extracted "${prod.name || 'details'}" from packaging image.`
          );
        } else {
          showAlert(
            'AI Vision',
            res?.data?.error ||
              'Could not clearly read the product packaging. Please enter details manually.'
          );
        }
      }
    } catch (e: any) {
      showAlert(
        'AI Vision Scan Failed',
        getErrorMessage(e, 'Could not analyze product packaging. Please try again.')
      );
    } finally {
      setAnalyzingPackaging(false);
    }
  };

  const pickGalleryImages = async () => {
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          showAlert('Permission Denied', 'Media library permission is required.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uris = result.assets.map((a) => a.uri);
        setGalleryImages((prev) => [...prev, ...uris]);
      }
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to pick gallery photos.'));
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    let isMounted = true;
    api
      .get('/categories/')
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
      handleBarcodeLookup(String(initialSku));
    }
    return () => {
      isMounted = false;
    };
  }, [id, initialSku]);

  const pickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          showAlert('Permission Required', 'Permission to access camera roll is required!');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
        setImageChanged(true);
      }
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Unable to pick image.'));
    }
  };

  const handleSave = async () => {
    const cleanName = name.trim();
    const cleanPrice = price.trim();
    const cleanUnit = unit.trim();

    if (!cleanName || !cleanPrice || !cleanUnit) {
      showAlert('Validation Error', 'Name, Regular Price, and Unit are required.');
      return;
    }

    const parsedPrice = Number(cleanPrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      showAlert('Validation Error', 'Please enter a valid numeric price.');
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
        const rawFilename = imageUri.split('/').pop() || 'product.jpg';
        const match = /\.(\w+)$/.exec(rawFilename);
        const mimeType = match ? `image/${match[1]}` : 'image/jpeg';

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
        const gFilename = gUri.split('/').pop() || `gallery_${i}.jpg`;
        const gMatch = /\.(\w+)$/.exec(gFilename);
        const gMime = gMatch ? `image/${gMatch[1]}` : 'image/jpeg';
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
        isEditing ? 'Product updated successfully' : 'Product added successfully',
        () => router.back()
      );
    } catch (error: any) {
      showAlert('Error', getErrorMessage(error, 'Failed to save product'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
      <View
        style={[
          styles.imageSection,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[styles.imagePicker, { backgroundColor: colors.cardAlt }]}
          onPress={pickImage}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.imagePlaceholderText, { color: colors.textMuted, marginTop: 4 }]}>
                Tap to upload photo
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        {/* AI Vision Packaging Scan Banner */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.aiScanBanner,
            {
              backgroundColor: isDark ? 'rgba(99, 102, 241, 0.16)' : '#eef2ff',
              borderColor: isDark ? '#4338ca' : '#c7d2fe',
            },
          ]}
          onPress={() => setShowAIOptionsModal(true)}
          disabled={analyzingPackaging}
        >
          <View style={styles.aiIconBadge}>
            <Ionicons name="sparkles" size={18} color="#6366f1" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.aiScanTitle, { color: isDark ? '#a5b4fc' : '#4338ca' }]}>
                AI Packaging Vision Scan
              </Text>
              <View style={styles.aiNewPill}>
                <Text style={styles.aiNewPillText}>AI VISION</Text>
              </View>
            </View>
            <Text style={[styles.aiScanSub, { color: colors.textMuted }]}>
              {analyzingPackaging
                ? 'AI is analyzing packaging photo...'
                : 'Snap packaging to auto-fill Name, Brand, Unit & Details'}
            </Text>
          </View>
          {analyzingPackaging ? (
            <ActivityIndicator size="small" color="#6366f1" />
          ) : (
            <Ionicons name="camera-outline" size={20} color="#6366f1" />
          )}
        </TouchableOpacity>

        {/* Extra Gallery Photos Section */}
        <View style={styles.gallerySection}>
          <View style={styles.galleryHeader}>
            <Text style={[styles.label, { color: colors.textMuted, marginBottom: 0 }]}>
              Additional Gallery Photos ({galleryImages.length})
            </Text>
            <TouchableOpacity
              style={[
                styles.addGalleryBtn,
                { backgroundColor: colors.cardAlt, borderColor: colors.border },
              ]}
              onPress={pickGalleryImages}
            >
              <Ionicons name="add" size={14} color="#10b981" />
              <Text style={[styles.addGalleryBtnText, { color: colors.text }]}>Add Photos</Text>
            </TouchableOpacity>
          </View>

          {galleryImages.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryList}>
              {galleryImages.map((uri, idx) => (
                <View key={idx} style={[styles.galleryThumbWrap, { borderColor: colors.border }]}>
                  <Image source={{ uri }} style={styles.galleryThumb} contentFit="cover" />
                  <TouchableOpacity
                    style={styles.galleryRemoveBtn}
                    onPress={() => removeGalleryImage(idx)}
                  >
                    <Ionicons name="close" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <Text style={[styles.label, { color: colors.textMuted }]}>Barcode / SKU (Optional)</Text>
        <View style={styles.row}>
          <TextInput
            style={[
              styles.input,
              { flex: 1, marginBottom: 0, backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
            ]}
            placeholder="Enter barcode or scan"
            placeholderTextColor={colors.textMuted}
            value={sku}
            onChangeText={setSku}
          />
          <TouchableOpacity
            style={styles.lookupBtn}
            onPress={() => handleBarcodeLookup()}
            disabled={lookingUpBarcode}
          >
            <Text style={styles.lookupBtnText}>
              {lookingUpBarcode ? '...' : 'Auto-Fill'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: colors.textMuted, marginTop: 16 }]}>Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catScroll}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.catChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedCategory === cat.id && styles.catChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text
                style={[
                  styles.catChipText,
                  { color: colors.textMuted },
                  selectedCategory === cat.id && { color: '#fff', fontWeight: 'bold' },
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.label, { color: colors.textMuted }]}>Product Name *</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
          ]}
          placeholder="e.g. Aashirvaad Shudh Chakki Atta"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Brand</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="e.g. ITC"
              placeholderTextColor={colors.textMuted}
              value={brand}
              onChangeText={setBrand}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Unit *</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="1 kg, 500 ml"
              placeholderTextColor={colors.textMuted}
              value={unit}
              onChangeText={setUnit}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Regular Price (₹) *</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Offer Price (₹)</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Optional discount"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={offerPrice}
              onChangeText={setOfferPrice}
            />
          </View>
        </View>

        {/* Purchase/Cost Price & Expiry Date */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Cost / Purchase Price (₹)</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Cost to store"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={costPrice}
              onChangeText={setCostPrice}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Expiry Date (YYYY-MM-DD)</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="e.g. 2026-12-31"
              placeholderTextColor={colors.textMuted}
              value={expiryDate}
              onChangeText={setExpiryDate}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Stock Quantity</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="10"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={stock}
              onChangeText={setStock}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Max Order Limit</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="10"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={maxOrderQty}
              onChangeText={setMaxOrderQty}
            />
          </View>
        </View>

        {/* Product Tags */}
        <Text style={[styles.label, { color: colors.textMuted }]}>Product Tags / Highlights</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
          ]}
          placeholder="e.g. Bestseller, Organic, Snacks, Top Pick (comma separated)"
          placeholderTextColor={colors.textMuted}
          value={tags}
          onChangeText={setTags}
        />

        <Text style={[styles.label, { color: colors.textMuted }]}>Description</Text>
        <TextInput
          style={[
            styles.input,
            {
              minHeight: 70,
              textAlignVertical: 'top',
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder="Optional product description..."
          placeholderTextColor={colors.textMuted}
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <View style={styles.switchRow}>
          <View>
            <Text style={[styles.switchLabel, { color: colors.text }]}>Available In Stock</Text>
            <Text style={[styles.switchSub, { color: colors.textMuted }]}>
              Show this product as ready to buy in customer app
            </Text>
          </View>
          <Switch
            value={isInStock}
            onValueChange={setIsInStock}
            trackColor={{ false: '#334155', true: '#10b981' }}
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>{isEditing ? 'Update Product' : 'Save Product'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>

      {/* AI Packaging Options Modal */}
      <Modal visible={showAIOptionsModal} transparent animationType="fade">
        <View style={styles.aiModalOverlay}>
          <View
            style={[
              styles.aiModalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.aiModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="sparkles" size={20} color="#6366f1" />
                <Text style={[styles.aiModalTitle, { color: colors.text }]}>
                  AI Packaging Scanner
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAIOptionsModal(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.aiModalSub, { color: colors.textMuted }]}>
              Take a photo of the product front or packaging label. AI will extract name, brand, weight/unit, and description automatically.
            </Text>

            <View style={styles.aiModalOptions}>
              <TouchableOpacity
                style={[
                  styles.aiOptionBtn,
                  { backgroundColor: colors.cardAlt, borderColor: colors.border },
                ]}
                onPress={() => handleAIVisionScan('camera')}
              >
                <Ionicons name="camera" size={24} color="#6366f1" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.aiOptionTitle, { color: colors.text }]}>
                    Take Photo with Camera
                  </Text>
                  <Text style={[styles.aiOptionDesc, { color: colors.textMuted }]}>
                    Snap product packaging right now
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.aiOptionBtn,
                  { backgroundColor: colors.cardAlt, borderColor: colors.border },
                ]}
                onPress={() => handleAIVisionScan('library')}
              >
                <Ionicons name="images" size={24} color="#10b981" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.aiOptionTitle, { color: colors.text }]}>
                    Pick from Photo Gallery
                  </Text>
                  <Text style={[styles.aiOptionDesc, { color: colors.textMuted }]}>
                    Select saved packaging photo
                  </Text>
                </View>
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
  imageSection: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  imagePicker: {
    width: 130,
    height: 130,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imagePlaceholderText: {
    fontSize: 12,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  form: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 14,
  },
  lookupBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lookupBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  catScroll: {
    gap: 8,
    marginBottom: 14,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  catChipActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  catChipText: {
    fontSize: 13,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchSub: {
    fontSize: 12,
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  aiScanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  aiIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiScanTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  aiNewPill: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  aiNewPillText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  aiScanSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  gallerySection: {
    marginBottom: 16,
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addGalleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  addGalleryBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  galleryList: {
    flexDirection: 'row',
  },
  galleryThumbWrap: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  galleryThumb: {
    width: '100%',
    height: '100%',
  },
  galleryRemoveBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  aiModalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  aiModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiModalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  aiModalSub: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 18,
  },
  aiModalOptions: {
    gap: 10,
  },
  aiOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  aiOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  aiOptionDesc: {
    fontSize: 11.5,
    marginTop: 1,
  },
});
