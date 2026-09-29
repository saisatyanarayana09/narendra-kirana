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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage } from '../../../services/api';
import { showAlert, showConfirm } from '../../../utils/alerts';

export default function ShowcaseScreen() {
  const [sections, setSections] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [creatingSection, setCreatingSection] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [secRes, banRes] = await Promise.allSettled([
        api.get('/store/homepage-sections/'),
        api.get('/offers/banners/'),
      ]);

      if (secRes.status === 'fulfilled' && secRes.value?.data) {
        const rawSec = secRes.value.data?.results ?? secRes.value.data;
        const list = Array.isArray(rawSec) ? rawSec : [];
        setSections(list.sort((a, b) => (a?.display_order ?? 0) - (b?.display_order ?? 0)));
      }
      if (banRes.status === 'fulfilled' && banRes.value?.data) {
        const rawBan = banRes.value.data?.results ?? banRes.value.data;
        setBanners(Array.isArray(rawBan) ? rawBan : []);
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
        subtitle: '',
        section_type: 'MANUAL',
        is_active: true,
        display_order: sections.length,
      });
      setNewSectionTitle('');
      fetchData();
      showAlert('Success', 'Homepage section created!');
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
      fetchData();
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to update section.'));
    }
  };

  const handleDeleteSection = (id: number, title: string) => {
    showConfirm('Delete Section', `Delete homepage section "${title}"?`, async () => {
      try {
        await api.delete(`/store/homepage-sections/${id}/`);
        fetchData();
      } catch (e: any) {
        showAlert('Error', getErrorMessage(e, 'Failed to delete section.'));
      }
    });
  };

  const handleToggleBanner = async (ban: any) => {
    try {
      await api.patch(`/offers/banners/${ban.id}/`, {
        is_active: !ban.is_active,
      });
      fetchData();
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to toggle banner.'));
    }
  };

  const handleDeleteBanner = (id: number) => {
    showConfirm('Delete Banner', 'Delete this promotional banner?', async () => {
      try {
        await api.delete(`/offers/banners/${id}/`);
        fetchData();
      } catch (e: any) {
        showAlert('Error', getErrorMessage(e, 'Failed to delete banner.'));
      }
    });
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
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
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Create Homepage Aisle / Section</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="e.g. Weekend Deals, Morning Essentials"
            placeholderTextColor="#64748b"
            value={newSectionTitle}
            onChangeText={setNewSectionTitle}
          />
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleCreateSection}
            disabled={creatingSection}
          >
            {creatingSection ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.addBtnText}>Add</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.groupTitle}>Homepage Sections ({sections.length})</Text>
      {sections.length === 0 ? (
        <Text style={styles.emptyText}>No custom homepage sections configured.</Text>
      ) : (
        sections.map((sec, idx) => (
          <View key={sec?.id ?? `sec-${idx}`} style={styles.itemCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{sec?.title || 'Untitled Section'}</Text>
              <Text style={styles.itemSub}>
                {(sec?.section_products || []).length} Products •{' '}
                {sec?.is_active ? 'Visible' : 'Hidden'}
              </Text>
            </View>
            <Switch
              value={Boolean(sec?.is_active)}
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
        ))
      )}

      <Text style={[styles.groupTitle, { marginTop: 20 }]}>
        Promotional Hero Banners ({banners.length})
      </Text>
      {banners.length === 0 ? (
        <Text style={styles.emptyText}>No promotional banners uploaded.</Text>
      ) : (
        banners.map((ban, idx) => (
          <View key={ban?.id ?? `ban-${idx}`} style={styles.itemCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{ban?.title || `Banner #${ban?.id}`}</Text>
              <Text style={styles.itemSub}>{ban?.is_active ? 'Active' : 'Inactive'}</Text>
            </View>
            <Switch
              value={Boolean(ban?.is_active)}
              onValueChange={() => handleToggleBanner(ban)}
              trackColor={{ false: '#334155', true: '#10b981' }}
            />
            <TouchableOpacity style={styles.trashBtn} onPress={() => handleDeleteBanner(ban.id)}>
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  sectionHeader: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#f8fafc',
  },
  addBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  groupTitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  itemCard: {
    backgroundColor: '#1e293b',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: 'bold',
  },
  itemSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  trashBtn: {
    padding: 6,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 12,
  },
});
