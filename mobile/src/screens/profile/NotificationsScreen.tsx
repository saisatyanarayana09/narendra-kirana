import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { apiClient } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getCachedNotificationsSync, loadCachedNotifications, saveCachedNotifications } from '../../services/profileCache';

export function NotificationsScreen({ navigation }: { navigation: AppNavigationProp }) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const cachedNotifs = getCachedNotificationsSync(user?.id);
  const [notifications, setNotifications] = useState<any[]>(cachedNotifs || []);
  const [loading, setLoading] = useState(!cachedNotifs || cachedNotifs.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (user) {
      if (notifications.length === 0) {
        loadCachedNotifications(user.id).then((cached) => {
          if (cached && cached.length > 0) {
            setNotifications(cached);
            setLoading(false);
          }
        });
      }
      fetchNotifications();
    } else {
      setNotifications([]);
      setLoading(false);
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const res = await apiClient.get('/notifications/');
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setNotifications(list);
      saveCachedNotifications(user.id, list);
    } catch (error) {
      console.error('Failed to load notifications', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    if (!user) {
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    fetchNotifications();
  }, [user]);

  const markAsRead = async (id: number) => {
    if (!user) return;
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
    if (!user) return;
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
    if (!user) return;
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

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.backButton} 
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={18} color={colors.primary} />
            <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        </View>
        <View style={styles.guestStateContainer}>
          <View style={[styles.guestIconBox, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5' }]}>
            <Feather name="bell" size={44} color={colors.primary} />
          </View>
          <Text style={[styles.guestTitle, { color: colors.text }]}>Sign In to Access Notifications</Text>
          <Text style={[styles.guestSubtitle, { color: colors.textSecondary }]}>
            Stay updated on your live order status, special promotions, and instant delivery alerts.
          </Text>
          <TouchableOpacity
            style={[styles.guestSignInBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Feather name="log-in" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.guestSignInBtnText}>Sign In / Register</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && notifications.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.backButton} 
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={18} color={colors.primary} />
            <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header matching web Notifications.jsx */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            style={styles.backButton} 
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color={colors.primary} />
            <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
          </TouchableOpacity>

          {unreadCount > 0 && (
            <TouchableOpacity 
              style={[styles.markAllReadBtn, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5', borderColor: isDark ? 'rgba(5, 150, 105, 0.3)' : '#A7F3D0' }]}
              onPress={markAllAsRead}
              disabled={markingAll}
              activeOpacity={0.7}
            >
              {markingAll ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Feather name="check-circle" size={14} color={colors.primary} />
                  <Text style={[styles.markAllReadText, { color: colors.primary }]}>Mark all as read</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Updates about your orders and offers.</Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item, index) => String(item?.id ?? index)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        ListEmptyComponent={() => (
          <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#D1FAE5' }]}>
              <Feather name="bell" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>You're all caught up!</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
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
              style={[
                styles.notificationCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                !isRead && { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5', borderColor: isDark ? 'rgba(5, 150, 105, 0.3)' : '#A7F3D0' }
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.titleRow}>
                  {!isRead && <View style={styles.unreadDot} />}
                  <Text style={[styles.notifTitle, { color: colors.text }, !isRead && { color: isDark ? '#34D399' : '#064E3B', fontWeight: '800' }]}>
                    {item.title}
                  </Text>
                </View>
                <View style={styles.headerMeta}>
                  <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatDate(item.created_at)}</Text>
                  <TouchableOpacity 
                    onPress={() => deleteNotification(item.id)}
                    style={styles.deleteBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="trash-2" size={15} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={[styles.notifMessage, { color: colors.textSecondary }, !isRead && { color: isDark ? '#A7F3D0' : '#047857' }]}>
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
    lineHeight: 28,
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
    paddingBottom: 130,
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
  guestStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  guestIconBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  guestSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  guestSignInBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
