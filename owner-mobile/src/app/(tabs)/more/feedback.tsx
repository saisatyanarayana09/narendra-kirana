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
import { useAppTheme } from '../../../context/ThemeContext';
import { showAlert, showConfirm } from '../../../utils/alerts';

export default function FeedbackScreen() {
  const { colors, isDark } = useAppTheme();

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
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
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
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.headerRow}>
                  <View style={styles.customerRow}>
                    <View style={[styles.avatar, { backgroundColor: colors.cardAlt }]}>
                      <Text style={[styles.avatarText, { color: colors.text }]}>
                        {(item?.customer_name || 'A').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.customerName, { color: colors.text }]}>
                        {item?.customer_name || 'Anonymous Customer'}
                      </Text>
                      <Text style={[styles.dateText, { color: colors.textMuted }]}>
                        {item?.created_at ? new Date(item.created_at).toLocaleString() : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= rating ? 'star' : 'star-outline'}
                        size={16}
                        color={star <= rating ? '#f59e0b' : colors.textMuted}
                      />
                    ))}
                  </View>
                </View>

                <View style={[styles.commentBox, { backgroundColor: colors.cardAlt }]}>
                  <Text style={[styles.commentText, { color: colors.text }]}>
                    {item?.comments || 'No additional comments provided.'}
                  </Text>
                </View>

                <View style={styles.footerRow}>
                  <TouchableOpacity
                    style={[styles.deleteBtn, { backgroundColor: colors.cardAlt }]}
                    onPress={() => item?.id && handleDelete(item.id)}
                  >
                    <Ionicons name="trash-outline" size={15} color="#ef4444" />
                    <Text style={styles.deleteText}>Delete Review</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="chatbox-ellipses-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No customer feedback yet.</Text>
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
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 11,
    marginTop: 2,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  commentBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  commentText: {
    fontSize: 13,
    lineHeight: 19,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
});
