import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { useAppTheme } from '../../../context/ThemeContext';
import { showAlert, showConfirm } from '../../../utils/alerts';

export default function CategoriesScreen() {
  const { colors, isDark } = useAppTheme();

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [categoryImageUri, setCategoryImageUri] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/categories/');
      const raw = res?.data?.results ?? res?.data;
      setCategories(Array.isArray(raw) ? raw : []);
    } catch (e: any) {
      if (e?.response?.status !== 401) {
        showAlert('Error', getErrorMessage(e, 'Failed to load categories.'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handlePickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!res.canceled && res.assets && res.assets[0]?.uri) {
      setCategoryImageUri(res.assets[0].uri);
      setImageChanged(true);
    }
  };

  const handleClearImage = () => {
    setCategoryImageUri(null);
    setImageChanged(true);
  };

  const handleSave = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      showAlert('Validation', 'Category name is required.');
      return;
    }

    setSaving(true);
    try {
      if (imageChanged && categoryImageUri) {
        const formData = new FormData();
        formData.append('name', cleanName);
        formData.append('is_active', String(isActive));

        const rawFilename = categoryImageUri.split('/').pop() || 'category.jpg';
        const match = /\.(\w+)$/.exec(rawFilename);
        const mimeType = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

        if (Platform.OS === 'web') {
          const resp = await fetch(categoryImageUri);
          const blob = await resp.blob();
          formData.append('image', blob, rawFilename);
        } else {
          formData.append('image', {
            uri: categoryImageUri,
            name: rawFilename,
            type: mimeType,
          } as any);
        }

        if (editingId) {
          await api.patch(`/categories/${editingId}/`, formData);
        } else {
          await api.post('/categories/', formData);
        }
      } else {
        const payload: any = { name: cleanName, is_active: isActive };
        if (editingId) {
          await api.patch(`/categories/${editingId}/`, payload);
        } else {
          await api.post('/categories/', payload);
        }
      }

      (api as ApiInstance).clearCache();
      setEditingId(null);
      setName('');
      setIsActive(true);
      setCategoryImageUri(null);
      setImageChanged(false);
      await fetchCategories();
      showAlert('Success', editingId ? 'Category updated!' : 'Category created!');
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to save category. Ensure name is unique.'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (cat: any) => {
    setEditingId(cat.id);
    setName(cat.name || '');
    setIsActive(cat.is_active ?? true);
    setCategoryImageUri(cat.image || null);
    setImageChanged(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setIsActive(true);
    setCategoryImageUri(null);
    setImageChanged(false);
  };

  const handleDelete = (id: number, catName: string) => {
    showConfirm(
      'Delete Category',
      `Are you sure you want to delete "${catName}"?`,
      async () => {
        try {
          await api.delete(`/categories/${id}/`);
          (api as ApiInstance).clearCache();
          fetchCategories();
          showAlert('Deleted', `Category "${catName}" removed.`);
        } catch (e: any) {
          showAlert('Error', getErrorMessage(e, 'Failed to delete category. It may contain products.'));
        }
      },
      undefined,
      'Delete'
    );
  };

  const moveCategory = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const updated = [...categories];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setCategories(updated);

    try {
      const updates = updated.map((item, idx) => ({ id: item.id, display_order: idx }));
      await api.post('/categories/reorder/', updates);
      (api as ApiInstance).clearCache();
    } catch {
      fetchCategories();
    }
  };

  const filtered = categories.filter((c) =>
    !searchTerm.trim()
      ? true
      : String(c?.name || '')
          .toLowerCase()
          .includes(searchTerm.trim().toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Form Card */}
      <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.formHeader}>
          <Text style={[styles.formTitle, { color: colors.text }]}>
            {editingId ? 'Edit Category' : 'Add New Category'}
          </Text>
          {editingId ? (
            <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelLink}>
              <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>Cancel Editing</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
          placeholder="Category Name (e.g. Rice & Dals, Dairy, Snacks)"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        {/* Category Image Picker */}
        <View style={styles.imageRow}>
          <TouchableOpacity
            style={[styles.imagePickerBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
            onPress={handlePickImage}
          >
            {categoryImageUri ? (
              <Image source={{ uri: categoryImageUri }} style={styles.pickedImage} contentFit="cover" />
            ) : (
              <View style={styles.placeholderBox}>
                <Ionicons name="image-outline" size={20} color="#10b981" />
                <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
                  {editingId ? 'Change Image' : 'Add Category Image'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {categoryImageUri ? (
            <TouchableOpacity style={styles.clearImgBtn} onPress={handleClearImage}>
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
              <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>Remove</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.text }]}>Active & Visible in Store</Text>
            <Text style={[styles.subLabel, { color: colors.textMuted }]}>
              Show this category and its items on the customer app
            </Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: '#334155', true: '#10b981' }}
          />
        </View>

        <View style={styles.btnRow}>
          {editingId ? (
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={handleCancelEdit}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: '#10b981' }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name={editingId ? 'save-outline' : 'add-circle-outline'} size={18} color="#fff" />
                <Text style={styles.saveBtnText}>{editingId ? 'Update Category' : 'Create Category'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Filter Bar */}
      <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Filter categories by name..."
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
          data={filtered}
          keyExtractor={(item, idx) => (item?.id != null ? String(item.id) : `cat-${idx}`)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchCategories();
              }}
              tintColor="#10b981"
            />
          }
          renderItem={({ item, index }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Reorder Buttons */}
              <View style={styles.reorderCol}>
                <TouchableOpacity
                  onPress={() => moveCategory(index, -1)}
                  disabled={index === 0}
                  style={{ opacity: index === 0 ? 0.3 : 1 }}
                >
                  <Ionicons name="chevron-up" size={18} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => moveCategory(index, 1)}
                  disabled={index === filtered.length - 1}
                  style={{ opacity: index === filtered.length - 1 ? 0.3 : 1 }}
                >
                  <Ionicons name="chevron-down" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Category Thumbnail */}
              <View style={styles.catThumbWrap}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.catThumb} contentFit="cover" />
                ) : (
                  <View style={[styles.catThumbFallback, { backgroundColor: colors.cardAlt }]}>
                    <Text style={[styles.catInitial, { color: colors.textMuted }]}>
                      {(item.name || 'C').charAt(0)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={styles.cardInfo}>
                <Text style={[styles.catName, { color: colors.text }]}>{item?.name}</Text>
                <View style={styles.statusPillRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: item?.is_active ? '#10b981' : '#f43f5e' },
                    ]}
                  />
                  <Text style={[styles.statusText, { color: colors.textMuted }]}>
                    {item?.is_active ? 'Active in Store' : 'Hidden'}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: colors.cardAlt }]}
                  onPress={() => handleEdit(item)}
                >
                  <Ionicons name="pencil-outline" size={16} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: colors.cardAlt }]}
                  onPress={() => handleDelete(item.id, item.name)}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No categories found.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formCard: {
    padding: 16,
    borderBottomWidth: 1,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  cancelLink: {
    padding: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  imagePickerBtn: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  pickedImage: {
    width: '100%',
    height: '100%',
  },
  placeholderBox: {
    alignItems: 'center',
    gap: 2,
  },
  placeholderText: {
    fontSize: 9,
    textAlign: 'center',
  },
  clearImgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 6,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  subLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
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
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    gap: 10,
  },
  reorderCol: {
    alignItems: 'center',
    gap: 2,
  },
  catThumbWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
  },
  catThumb: {
    width: '100%',
    height: '100%',
  },
  catThumbFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  catInitial: {
    fontSize: 18,
    fontWeight: '800',
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  catName: {
    fontSize: 15,
    fontWeight: '700',
  },
  statusPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 6,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
