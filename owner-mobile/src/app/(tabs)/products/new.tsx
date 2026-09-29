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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { showAlert } from '../../../utils/alerts';

export default function AddProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('1 kg');
  const [stock, setStock] = useState('0');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setLoading(true);
    api
      .get(`/products/${id}/`)
      .then((res) => {
        if (!isMounted || !res?.data) return;
        const p = res.data;
        setName(p.name || '');
        setPrice(String(p.regular_price ?? p.price ?? ''));
        setUnit(p.unit || '1 kg');
        setStock(String(p.stock_quantity ?? '0'));
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
    return () => {
      isMounted = false;
    };
  }, [id]);

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
      showAlert('Validation Error', 'Name, Price, and Unit are required.');
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
      formData.append('unit', cleanUnit);
      formData.append('stock_quantity', String(parsedStock));
      formData.append('is_in_stock', parsedStock > 0 ? 'true' : 'false');

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
      showAlert('Success', isEditing ? 'Product updated successfully' : 'Product added successfully', () =>
        router.back()
      );
    } catch (error: any) {
      showAlert('Error', getErrorMessage(error, 'Failed to save product'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
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
        <Text style={styles.label}>Product Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Aashirvaad Atta"
          placeholderTextColor="#64748b"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Unit (e.g., 1 kg, 1 pc)</Text>
        <TextInput
          style={styles.input}
          placeholder="1 kg"
          placeholderTextColor="#64748b"
          value={unit}
          onChangeText={setUnit}
        />

        <Text style={styles.label}>Price (₹)</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          placeholderTextColor="#64748b"
          keyboardType="numeric"
          value={price}
          onChangeText={setPrice}
        />

        <Text style={styles.label}>Stock Quantity</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          placeholderTextColor="#64748b"
          keyboardType="numeric"
          value={stock}
          onChangeText={setStock}
        />

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
    paddingVertical: 32,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  imagePicker: {
    width: 150,
    height: 150,
    borderRadius: 16,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imagePlaceholderText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  form: {
    padding: 20,
  },
  label: {
    color: '#94a3b8',
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 16,
    color: '#f8fafc',
    fontSize: 16,
    marginBottom: 20,
  },
  saveBtn: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
