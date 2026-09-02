import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { apiClient } from '../../api/client';

export function NotificationsScreen({ navigation }: { navigation: AppNavigationProp }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/notifications/');
      setNotifications(Array.isArray(res.data) ? res.data : (res.data?.results || []));
    } catch (error) {
      console.error('Failed to load notifications', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, []);

  const markAsRead = async (id: number) => {
    const target = notifications.find(n => n.id === id);
    if (!target || target.is_read) return;

    // Optimistically update local state so unread highlight clears immediately
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));

    try {
      await apiClient.patch(`/notifications/${id}/`, { is_read: true });
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    const unreadList = notifications.filter(n => !n.is_read);
    if (unreadList.length === 0 || markingAll) return;

    setMarkingAll(true);
    // Optimistically update all notifications locally
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

    try {
      await Promise.all(
        unreadList.map(n => apiClient.patch(`/notifications/${n.id}/`, { is_read: true }).catch(() => null))
      );
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
      fetchNotifications();
    } finally {
      setMarkingAll(false);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== id));
      await apiClient.delete(`/notifications/${id}/`);
    } catch (err) {
      console.error('Failed to delete notification', err);
      fetchNotifications();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={18} color="#059669" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header matching web Notifications.jsx */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color="#059669" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          {unreadCount > 0 && (
            <TouchableOpacity 
              style={styles.markAllReadBtn}
              onPress={markAllAsRead}
              disabled={markingAll}
              activeOpacity={0.7}
            >
              {markingAll ? (
                <ActivityIndicator size="small" color="#059669" />
              ) : (
                <>
                  <Feather name="check-circle" size={14} color="#059669" />
                  <Text style={styles.markAllReadText}>Mark all as read</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSubtitle}>Updates about your orders and offers.</Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} tintColor="#059669" />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Feather name="bell" size={40} color="#059669" />
            </View>
            <Text style={styles.emptyTitle}>You're all caught up!</Text>
            <Text style={styles.emptySubtitle}>
              We'll notify you here when there are updates about your orders or exciting new offers.
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const isRead = item.is_read;
          return (
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => markAsRead(item.id)}
              style={[styles.notificationCard, !isRead && styles.notificationCardUnread]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.titleRow}>
                  {!isRead && <View style={styles.unreadDot} />}
                  <Text style={[styles.notifTitle, !isRead && styles.notifTitleUnread]}>
                    {item.title}
                  </Text>
                </View>
                <View style={styles.headerMeta}>
                  <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                  <TouchableOpacity 
                    onPress={() => deleteNotification(item.id)}
                    style={styles.deleteBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="trash-2" size={15} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={[styles.notifMessage, !isRead && styles.notifMessageUnread]}>
                {item.message}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // slate-50
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  markAllReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 9,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  markAllReadText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  notificationCardUnread: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  notifTitleUnread: {
    color: '#064E3B',
    fontWeight: '800',
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  deleteBtn: {
    padding: 2,
  },
  notifMessage: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  notifMessageUnread: {
    color: '#047857',
  },
});
