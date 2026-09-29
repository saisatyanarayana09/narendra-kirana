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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { showAlert, showConfirm } from '../../../utils/alerts';

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
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

  const handleSave = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      showAlert('Validation', 'Category name is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = { name: cleanName, is_active: isActive };
      if (editingId) {
        await api.patch(`/categories/${editingId}/`, payload);
      } else {
        await api.post('/categories/', payload);
      }
      (api as ApiInstance).clearCache();
      setEditingId(null);
      setName('');
      setIsActive(true);
      await fetchCategories();
      showAlert('Success', editingId ? 'Category updated!' : 'Category created!');
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to save category.'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (cat: any) => {
    setEditingId(cat.id);
    setName(cat.name || '');
    setIsActive(cat.is_active ?? true);
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
    <View style={styles.container}>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingId ? 'Edit Category' : 'Add New Category'}</Text>
        <TextInput
          style={styles.input}
          placeholder="Category Name (e.g. Rice & Dal)"
          placeholderTextColor="#64748b"
          value={name}
          onChangeText={setName}
        />
        <View style={styles.switchRow}>
          <Text style={styles.label}>Active & Visible in Store</Text>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: '#334155', true: '#10b981' }}
          />
        </View>
        <View style={styles.btnRow}>
          {editingId ? (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setEditingId(null);
                setName('');
                setIsActive(true);
              }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{editingId ? 'Update' : 'Create Category'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Filter categories..."
          placeholderTextColor="#64748b"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
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
            <View style={styles.card}>
              <View style={styles.reorderCol}>
                <TouchableOpacity onPress={() => moveCategory(index, -1)} disabled={index === 0}>
                  <Ionicons name="chevron-up" size={18} color={index === 0 ? '#334155' : '#94a3b8'} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => moveCategory(index, 1)}
                  disabled={index === filtered.length - 1}
                >
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={index === filtered.length - 1 ? '#334155' : '#94a3b8'}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.catName}>{item?.name}</Text>
                <Text style={[styles.statusText, { color: item?.is_active ? '#10b981' : '#ef4444' }]}>
                  {item?.is_active ? 'Active' : 'Hidden'}
                </Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => handleEdit(item)}>
                  <Ionicons name="pencil" size={18} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item.id, item.name)}>
                  <Ionicons name="trash" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No categories found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  formCard: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  formTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#f8fafc',
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    backgroundColor: '#334155',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#cbd5e1',
    fontWeight: 'bold',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    margin: 12,
    marginBottom: 0,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  listContent: {
    padding: 12,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  reorderCol: {
    marginRight: 12,
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  catName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    padding: 8,
    backgroundColor: '#0f172a',
    borderRadius: 6,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 32,
  },
});
