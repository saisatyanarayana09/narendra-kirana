import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage } from '../../../services/api';
import { showAlert, showConfirm } from '../../../utils/alerts';

export default function FeedbackScreen() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeedbacks = useCallback(async () => {
    try {
      const res = await api.get('/store/feedback/');
      const raw = res?.data?.results ?? res?.data;
      setFeedbacks(Array.isArray(raw) ? raw : []);
    } catch (e: any) {
      if (e?.response?.status !== 401) {
        showAlert('Error', getErrorMessage(e, 'Failed to load customer feedback.'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const handleDelete = (id: number) => {
    showConfirm(
      'Delete Feedback',
      'Are you sure you want to delete this customer review?',
      async () => {
        try {
          await api.delete(`/store/feedback/${id}/`);
          fetchFeedbacks();
        } catch (e: any) {
          showAlert('Error', getErrorMessage(e, 'Failed to delete feedback.'));
        }
      },
      undefined,
      'Delete'
    );
  };

  return (
    <View style={styles.container}>
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={feedbacks}
          keyExtractor={(item, idx) => (item?.id != null ? String(item.id) : `fb-${idx}`)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchFeedbacks();
              }}
              tintColor="#10b981"
            />
          }
          renderItem={({ item }) => {
            const rating = Number(item?.rating) || 0;
            return (
              <View style={styles.card}>
                <View style={styles.headerRow}>
                  <View>
                    <Text style={styles.customerName}>{item?.customer_name || 'Anonymous'}</Text>
                    <Text style={styles.dateText}>
                      {item?.created_at ? new Date(item.created_at).toLocaleString() : ''}
                    </Text>
                  </View>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= rating ? 'star' : 'star-outline'}
                        size={16}
                        color={star <= rating ? '#f59e0b' : '#475569'}
                      />
                    ))}
                  </View>
                </View>

                <Text style={styles.commentText}>
                  {item?.comments || 'No additional comments provided.'}
                </Text>

                <View style={styles.footerRow}>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => item?.id && handleDelete(item.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="chatbox-ellipses-outline" size={48} color="#475569" />
              <Text style={styles.emptyText}>No customer feedback yet.</Text>
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
    backgroundColor: '#0f172a',
  },
  listContent: {
    padding: 14,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  customerName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  commentText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyBox: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: '#64748b',
    marginTop: 12,
    fontSize: 15,
  },
});
