import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { useAppTheme } from '../../../context/ThemeContext';
import { showAlert, showConfirm } from '../../../utils/alerts';
import ScreenHeader from '../../../components/ScreenHeader';
import ModernSwitch from '../../../components/ModernSwitch';

export default function CategoriesScreen() {
  const { colors, isDark } = useAppTheme();

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal editor state (replaces fixed form card for a clean list-first UX)
  const [modalOpen, setModalOpen] = useState(false);
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCategories();
  }, [fetchCategories]);

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setIsActive(true);
    setCategoryImageUri(null);
    setImageChanged(false);
    setModalOpen(true);
  };

  const openEditModal = (cat: any) => {
    setEditingId(cat.id);
    setName(cat.name || '');
    setIsActive(cat.is_active ?? true);
    setCategoryImageUri(cat.image || null);
    setImageChanged(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setName('');
    setIsActive(true);
    setCategoryImageUri(null);
    setImageChanged(false);
  };

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
      closeModal();
      await fetchCategories();
      showAlert('Success', editingId ? 'Category updated!' : 'Category created!');
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to save category. Ensure name is unique.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (cat: any) => {
    const newStatus = !cat.is_active;
    // 0ms Optimistic UI update
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, is_active: newStatus } : c))
    );

    try {
      await api.patch(`/categories/${cat.id}/`, { is_active: newStatus });
      (api as ApiInstance).clearCache();
    } catch (e: any) {
      // Revert on error
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, is_active: !newStatus } : c))
      );
      showAlert('Error', getErrorMessage(e, 'Failed to update category status.'));
    }
  };

  const handleDelete = (id: number, catName: string) => {
    showConfirm(
      'Delete Category',
      `Are you sure you want to delete "${catName}"? This action cannot be undone.`,
      async () => {
        try {
          await api.delete(`/categories/${id}/`);
          (api as ApiInstance).clearCache();
          setCategories((prev) => prev.filter((c) => c.id !== id));
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
    if (targetIndex < 0 || targetIndex >= filteredCategories.length) return;

    const updated = [...categories];
    const itemA = filteredCategories[index];
    const itemB = filteredCategories[targetIndex];

    const idxA = updated.findIndex((c) => c.id === itemA.id);
    const idxB = updated.findIndex((c) => c.id === itemB.id);

    if (idxA === -1 || idxB === -1) return;

    const [moved] = updated.splice(idxA, 1);
    updated.splice(idxB, 0, moved);
    setCategories(updated);

    try {
      const updates = updated.map((item, idx) => ({ id: item.id, display_order: idx }));
      await api.post('/categories/reorder/', updates);
      (api as ApiInstance).clearCache();
    } catch (e) {
      // Revert silently if reorder fails
      fetchCategories();
    }
  };

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    const q = searchTerm.trim().toLowerCase();
    return categories.filter((c) => (c.name || '').toLowerCase().includes(q));
  }, [categories, searchTerm]);

  const activeCount = useMemo(
    () => categories.filter((c) => Boolean(c.is_active)).length,
    [categories]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Universal Screen Header */}
      <ScreenHeader
        title="Categories & Aisles"
        subtitle={`${categories.length} total • ${activeCount} active`}
        rightAction={
          <TouchableOpacity
            style={styles.addHeaderBtn}
            onPress={openAddModal}
            accessibilityRole="button"
            accessibilityLabel="Add New Category"
          >
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.addHeaderBtnText}>Add</Text>
          </TouchableOpacity>
        }
      />

      {/* Instant Search Bar */}
      <View style={[styles.searchBarWrap, { backgroundColor: colors.bg }]}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search" size={17} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search categories..."
            placeholderTextColor={colors.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
            clearButtonMode="while-editing"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading categories...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCategories}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#10b981"
            />
          }
          renderItem={({ item, index }) => (
            <View
              style={[
                styles.categoryCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {/* Image & Title */}
              <TouchableOpacity
                style={styles.cardMain}
                activeOpacity={0.7}
                onPress={() => openEditModal(item)}
              >
                <View
                  style={[
                    styles.thumbnailBox,
                    { backgroundColor: colors.cardAlt, borderColor: colors.border },
                  ]}
                >
                  {item.image ? (
                    <Image
                      source={{ uri: item.image }}
                      style={styles.thumbnailImg}
                      contentFit="cover"
                    />
                  ) : (
                    <Ionicons name="pricetag-outline" size={20} color="#10b981" />
                  )}
                </View>

                <View style={styles.cardInfo}>
                  <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.metaRow}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: item.is_active ? '#10b981' : '#64748b' },
                      ]}
                    />
                    <Text style={[styles.statusText, { color: colors.textMuted }]}>
                      {item.is_active ? 'Active & Visible' : 'Hidden'}
                    </Text>
                    {item.products_count !== undefined && (
                      <Text style={[styles.productCount, { color: colors.textMuted }]}>
                        • {item.products_count} products
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>

              {/* Actions Right Col */}
              <View style={styles.cardActions}>
                {/* Reorder Arrows */}
                <View style={styles.reorderArrows}>
                  <TouchableOpacity
                    style={[
                      styles.arrowBtn,
                      { opacity: index === 0 ? 0.3 : 1 },
                    ]}
                    onPress={() => moveCategory(index, -1)}
                    disabled={index === 0}
                    accessibilityLabel="Move category up"
                  >
                    <Ionicons name="chevron-up" size={15} color={colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.arrowBtn,
                      { opacity: index === filteredCategories.length - 1 ? 0.3 : 1 },
                    ]}
                    onPress={() => moveCategory(index, 1)}
                    disabled={index === filteredCategories.length - 1}
                    accessibilityLabel="Move category down"
                  >
                    <Ionicons name="chevron-down" size={15} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Modern Switch */}
                <ModernSwitch
                  value={Boolean(item.is_active)}
                  onValueChange={() => handleToggleActive(item)}
                />

                {/* Edit & Delete Action Icons */}
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: colors.cardAlt }]}
                  onPress={() => openEditModal(item)}
                  accessibilityLabel="Edit category"
                >
                  <Ionicons name="create-outline" size={16} color={colors.text} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                  onPress={() => handleDelete(item.id, item.name)}
                  accessibilityLabel="Delete category"
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconBox, { backgroundColor: colors.cardAlt }]}>
                <Ionicons name="pricetags-outline" size={32} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {searchTerm ? 'No matching categories' : 'No categories yet'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {searchTerm
                  ? 'Try a different keyword or clear search'
                  : 'Organize your store inventory by creating your first aisle'}
              </Text>
              {!searchTerm && (
                <TouchableOpacity style={styles.emptyActionBtn} onPress={openAddModal}>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.emptyActionBtnText}>Create Category</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Bottom Sheet Modal for Add / Edit */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeModal}
          />
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {editingId ? 'Edit Category' : 'New Category'}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  {editingId
                    ? 'Update department details and image'
                    : 'Add a new product aisle for customer browsing'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeCircle, { backgroundColor: colors.cardAlt }]}
                onPress={closeModal}
              >
                <Ionicons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {/* Category Name */}
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                Category Name *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.cardAlt,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="e.g. Rice & Dals, Dairy, Spices"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoFocus
              />

              {/* Category Image Picker */}
              <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 14 }]}>
                Aisle Icon / Cover Image
              </Text>
              <View style={styles.imagePickerRow}>
                <TouchableOpacity
                  style={[
                    styles.imageBox,
                    { backgroundColor: colors.cardAlt, borderColor: colors.border },
                  ]}
                  onPress={handlePickImage}
                >
                  {categoryImageUri ? (
                    <Image
                      source={{ uri: categoryImageUri }}
                      style={styles.previewImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="camera-outline" size={24} color="#10b981" />
                      <Text style={[styles.imagePlaceholderText, { color: colors.textMuted }]}>
                        Tap to choose image
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {categoryImageUri && (
                  <TouchableOpacity
                    style={[styles.removeImgBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                    onPress={handleClearImage}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '700' }}>
                      Remove
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Active Toggle Switch */}
              <View
                style={[
                  styles.switchRow,
                  { backgroundColor: colors.cardAlt, borderColor: colors.border },
                ]}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.switchTitle, { color: colors.text }]}>
                    Active in Storefront
                  </Text>
                  <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                    Customers can see and browse items in this category
                  </Text>
                </View>
                <ModernSwitch value={isActive} onValueChange={setIsActive} />
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[
                    styles.cancelBtn,
                    { backgroundColor: colors.cardAlt, borderColor: colors.border },
                  ]}
                  onPress={closeModal}
                  disabled={saving}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { opacity: saving ? 0.7 : 1 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
                      <Text style={styles.saveBtnText}>
                        {editingId ? 'Update Category' : 'Create Category'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
  searchBarWrap: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
    gap: 8,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thumbnailBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  cardInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  productCount: {
    fontSize: 11,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reorderArrows: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  arrowBtn: {
    padding: 3,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  imagePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  imageBox: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  imagePlaceholderText: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  removeImgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 14,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  switchSub: {
    fontSize: 11,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
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
});
