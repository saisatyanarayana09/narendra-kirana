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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { showAlert } from '../../../utils/alerts';

export default function AddProductScreen() {
  const router = useRouter();
  const { id, sku: initialSku } = useLocalSearchParams<{ id?: string; sku?: string }>();
  const isEditing = Boolean(id);

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [sku, setSku] = useState(initialSku ? String(initialSku) : '');
  const [price, setPrice] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [unit, setUnit] = useState('1 kg');
  const [stock, setStock] = useState('10');
  const [maxOrderQty, setMaxOrderQty] = useState('10');
  const [description, setDescription] = useState('');
  const [isInStock, setIsInStock] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lookingUpBarcode, setLookingUpBarcode] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

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
          setUnit(p.unit || '1 kg');
          setStock(String(p.stock_quantity ?? '0'));
          setMaxOrderQty(String(p.max_order_quantity ?? '10'));
          setDescription(p.description || '');
          setIsInStock(p.is_in_stock ?? true);
          if (p.category) setSelectedCategory(Number(p.category));
          if (p.image) setImageUri(p.image);
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
      if (selectedCategory) {
        formData.append('category', String(selectedCategory));
      }
      if (brand.trim()) formData.append('brand', brand.trim());
      if (sku.trim()) formData.append('sku', sku.trim());
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
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.imageSection}>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <Text style={styles.imagePlaceholderText}>Tap to add Image</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Barcode / SKU (Optional)</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Enter barcode or use bottom Scan tab"
            placeholderTextColor="#64748b"
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

        <Text style={[styles.label, { marginTop: 16 }]}>Category</Text>
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
                selectedCategory === cat.id && styles.catChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text
                style={[
                  styles.catChipText,
                  selectedCategory === cat.id && { color: '#fff', fontWeight: 'bold' },
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Product Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Aashirvaad Atta"
          placeholderTextColor="#64748b"
          value={name}
          onChangeText={setName}
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Brand</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. ITC"
              placeholderTextColor="#64748b"
              value={brand}
              onChangeText={setBrand}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Unit *</Text>
            <TextInput
              style={styles.input}
              placeholder="1 kg, 500 ml"
              placeholderTextColor="#64748b"
              value={unit}
              onChangeText={setUnit}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Regular Price (₹) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Offer Price (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="Optional"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={offerPrice}
              onChangeText={setOfferPrice}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Stock Quantity</Text>
            <TextInput
              style={styles.input}
              placeholder="10"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={stock}
              onChangeText={setStock}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Max Order Limit</Text>
            <TextInput
              style={styles.input}
              placeholder="10"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={maxOrderQty}
              onChangeText={setMaxOrderQty}
            />
          </View>
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
          placeholder="Optional product description..."
          placeholderTextColor="#64748b"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Available In Stock</Text>
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
            <Text style={styles.saveBtnText}>{isEditing ? 'Update Product' : 'Save Product'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  imagePicker: {
    width: 130,
    height: 130,
    borderRadius: 16,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imagePlaceholderText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  form: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    color: '#94a3b8',
    marginBottom: 6,
    fontSize: 13,
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 14,
    color: '#f8fafc',
    fontSize: 15,
    marginBottom: 16,
  },
  scanCamBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lookupBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    borderRadius: 8,
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
    marginBottom: 16,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  catChipActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  catChipText: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
