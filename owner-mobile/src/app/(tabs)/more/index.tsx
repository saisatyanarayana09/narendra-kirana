import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import WebCropper from '../../../components/WebCropper';
import ModernSwitch from '../../../components/ModernSwitch';
import { useAuth } from '../../../context/AuthContext';
import { useAppTheme } from '../../../context/ThemeContext';
import api, { cachedGet, getErrorMessage } from '../../../services/api';
import { showAlert, showConfirm } from '../../../utils/alerts';
import { checkAndDownloadOtaUpdateSilently, applyOtaUpdate } from '../../../services/otaService';

interface NavItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
  ownerOnly?: boolean;
}

interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors, toggleTheme } = useAppTheme();
  const { logout } = useAuth();

  const [user, setUser] = useState<any>(null);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [webImage, setWebImage] = useState<string | null>(null);

  // Edit Profile Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  const handleCheckUpdate = async () => {
    if (checkingUpdates) return;
    setCheckingUpdates(true);
    try {
      const res = await checkAndDownloadOtaUpdateSilently();
      if (res.isDownloaded) {
        showConfirm(
          'Update Ready',
          'A new update was downloaded! Would you like to restart the app now to apply it?',
          () => applyOtaUpdate(),
          undefined,
          'Restart Now'
        );
      } else {
        showAlert('Up to Date', 'You are running the latest version of Narendra Kirana Store.');
      }
    } catch {
      showAlert('Check Failed', 'Could not check for updates. Please verify your internet connection.');
    } finally {
      setCheckingUpdates(false);
    }
  };

  const fetchProfile = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await cachedGet('/auth/profile/', {
        forceRefresh: isRefresh,
        onUpdate: () => {
          void fetchProfile();
        },
      });
      setUser(res.data);
      if (res.data?.customer_profile?.profile_picture) {
        setProfilePic(res.data.customer_profile.profile_picture);
      }
      setEditFirstName(res.data?.first_name || '');
      setEditLastName(res.data?.last_name || '');
      setEditMobile(res.data?.customer_profile?.mobile_number || '');
    } catch (e: any) {
      console.log('Failed to fetch profile', e);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        if (Platform.OS === 'web') {
          setWebImage(result.assets[0].uri);
        } else {
          setUploading(true);
          const manipResult = await ImageManipulator.manipulateAsync(
            result.assets[0].uri,
            [{ resize: { width: 500, height: 500 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
          );

          const formData = new FormData();
          formData.append('profile_picture', {
            uri: manipResult.uri,
            name: 'profile.jpg',
            type: 'image/jpeg',
          } as any);

          const res = await api.patch('/auth/profile/', formData);
          if (res.data?.customer_profile?.profile_picture) {
            setProfilePic(res.data.customer_profile.profile_picture);
            showAlert('Success', 'Profile picture updated successfully!');
          }
        }
      }
    } catch (e: any) {
      console.error('Upload Error:', e.response?.data || e.message);
      showAlert('Error', e.response?.data?.detail || e.response?.data?.profile_picture?.[0] || e.message || 'Failed to upload profile picture.');
    } finally {
      setUploading(false);
    }
  };

  const handleWebCropComplete = async (blob: any) => {
    setWebImage(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('profile_picture', blob, 'profile.jpg');
      const res = await api.patch('/auth/profile/', formData);
      if (res.data?.customer_profile?.profile_picture) {
        setProfilePic(res.data.customer_profile.profile_picture);
        showAlert('Success', 'Profile picture updated successfully!');
      }
    } catch (e: any) {
      console.error('Upload Error:', e.response?.data || e.message);
      showAlert('Error', e.response?.data?.detail || e.response?.data?.profile_picture?.[0] || e.message || 'Failed to upload profile picture.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const cleanMobile = editMobile.trim() ? editMobile.trim() : null;
      const payload: any = {
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        customer_profile: {
          mobile_number: cleanMobile,
        },
      };

      const res = await api.patch('/auth/profile/', payload);
      setUser(res.data);
      setEditModalVisible(false);
      showAlert('Success', 'Profile details updated.');
    } catch (e: any) {
      console.error('Save Profile Error:', e.response?.data || e.message);
      const errMsg = getErrorMessage(e, 'Could not update profile details.');
      showAlert('Update Failed', errMsg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSignOut = () => {
    showConfirm(
      'Sign Out',
      'Are you sure you want to sign out of the Narendra Kirana Owner Portal?',
      async () => {
        await logout();
      },
      undefined,
      'Sign Out'
    );
  };

  // Human-engineered, uncluttered navigation groups inspired by Apple HIG & Stripe Mobile
  const NAV_GROUPS: NavGroup[] = useMemo(() => [
    {
      id: 'catalog',
      title: 'CATALOG & MERCHANDISING',
      items: [
        {
          id: 'categories',
          title: 'Product Categories',
          icon: 'pricetags-outline',
          route: '/(tabs)/more/categories',
          color: '#10b981',
        },
        {
          id: 'showcase',
          title: 'Visual Showcase',
          icon: 'images-outline',
          route: '/(tabs)/more/showcase',
          color: '#059669',
        },
        {
          id: 'offers',
          title: 'Offers & Discounts',
          icon: 'ticket-outline',
          route: '/(tabs)/more/offers',
          color: '#f59e0b',
        },
      ],
    },
    {
      id: 'logistics',
      title: 'OPERATIONS & FULFILLMENT',
      items: [
        {
          id: 'delivery',
          title: 'Delivery Fleet',
          icon: 'bicycle-outline',
          route: '/(tabs)/more/delivery',
          color: '#0284c7',
        },
        {
          id: 'customers',
          title: 'Customers CRM',
          icon: 'people-outline',
          route: '/(tabs)/more/customers',
          color: '#6366f1',
        },
        {
          id: 'invoices',
          title: 'Invoices & Billing',
          icon: 'receipt-outline',
          route: '/(tabs)/more/invoices',
          color: '#2563eb',
        },
      ],
    },
    {
      id: 'growth',
      title: 'GROWTH & ANALYTICS',
      items: [
        {
          id: 'broadcast',
          title: 'Push Broadcast',
          icon: 'megaphone-outline',
          route: '/(tabs)/more/broadcast',
          color: '#ec4899',
        },
        {
          id: 'reports',
          title: 'Sales Analytics',
          icon: 'stats-chart-outline',
          route: '/(tabs)/more/reports',
          color: '#8b5cf6',
        },
      ],
    },
    {
      id: 'admin',
      title: 'STORE ADMINISTRATION',
      items: [
        ...(user?.is_owner
          ? [
              {
                id: 'agents',
                title: 'Manage Team & Staff',
                icon: 'shield-checkmark-outline' as const,
                route: '/(tabs)/more/agents',
                ownerOnly: true,
                color: '#10b981',
              },
            ]
          : []),
        {
          id: 'settings',
          title: 'Store Settings',
          icon: 'storefront-outline',
          route: '/(tabs)/more/settings',
          color: '#f59e0b',
        },
        {
          id: 'advanced',
          title: 'Advanced Configurations',
          icon: 'options-outline',
          route: '/(tabs)/more/advanced-settings',
          color: '#64748b',
        },
        {
          id: 'share-apps',
          title: 'Share App Links',
          icon: 'share-social-outline',
          route: '/(tabs)/more/share',
          color: '#0ea5e9',
        },
      ],
    },
  ], [user?.is_owner]);

  const displayName = useMemo(() => {
    if (user?.first_name || user?.last_name) {
      return `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
    }
    return user?.username || 'Store Owner';
  }, [user]);

  const initials = useMemo(() => {
    const f = (user?.first_name || '').trim();
    const l = (user?.last_name || '').trim();
    if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
    if (f) return f.slice(0, 2).toUpperCase();
    if (user?.username) return user.username.slice(0, 2).toUpperCase();
    return 'NK';
  }, [user]);

  const userPhone = user?.customer_profile?.mobile_number;
  const isOwner = Boolean(user?.is_owner);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingTop: Math.max(insets.top + 10, 16),
            paddingBottom: Math.max(insets.bottom + 90, 110),
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchProfile(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.contentBounded}>
          {/* Executive Operator Identity Card */}
          <View
            style={[
              styles.identityCard,
              {
                backgroundColor: colors.card,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              },
            ]}
          >
            <View style={styles.identityTopRow}>
              {/* 80px Polished Avatar with Camera Trigger Overlay */}
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={handlePickImage}
                disabled={uploading}
                style={styles.avatarTouchable}
              >
                <View
                  style={[
                    styles.avatarFrame,
                    {
                      backgroundColor: colors.cardAlt,
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                    },
                  ]}
                >
                  {profilePic ? (
                    <Image
                      source={{ uri: profilePic }}
                      style={styles.avatarImg}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <View style={styles.initialsWrap}>
                      <Text style={[styles.initialsText, { color: colors.primary }]}>
                        {initials}
                      </Text>
                    </View>
                  )}

                  {uploading && (
                    <View style={styles.avatarOverlay}>
                      <ActivityIndicator color="#ffffff" size="small" />
                    </View>
                  )}
                </View>

                {/* Edit Photo Icon Badge */}
                <View
                  style={[
                    styles.cameraBadge,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.card,
                    },
                  ]}
                >
                  <Ionicons name="camera" size={13} color="#ffffff" />
                </View>
              </TouchableOpacity>

              {/* Operator Info & Typography */}
              <View style={styles.identityInfo}>
                <Text style={[styles.operatorName, { color: colors.text }]} numberOfLines={1}>
                  {loading ? 'Loading...' : displayName}
                </Text>

                {/* Executive Role Pill */}
                <View style={styles.rolePillRow}>
                  <View
                    style={[
                      styles.rolePill,
                      {
                        backgroundColor: isOwner
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(99, 102, 241, 0.12)',
                        borderColor: isOwner
                          ? 'rgba(16, 185, 129, 0.28)'
                          : 'rgba(99, 102, 241, 0.28)',
                      },
                    ]}
                  >
                    <Ionicons
                      name={isOwner ? 'shield-checkmark' : 'person-circle'}
                      size={11.5}
                      color={isOwner ? '#10b981' : '#6366f1'}
                    />
                    <Text
                      style={[
                        styles.rolePillText,
                        { color: isOwner ? '#10b981' : '#6366f1' },
                      ]}
                    >
                      {isOwner ? 'STORE OWNER' : 'STAFF OPERATOR'}
                    </Text>
                  </View>
                </View>

                {/* Contact Micro-Lines */}
                <View style={styles.contactRow}>
                  <Ionicons name="mail-outline" size={12} color={colors.textMuted} />
                  <Text style={[styles.contactText, { color: colors.textMuted }]} numberOfLines={1}>
                    {user?.email || user?.username || '—'}
                  </Text>
                </View>

                {Boolean(userPhone) && (
                  <View style={[styles.contactRow, { marginTop: 3 }]}>
                    <Ionicons name="call-outline" size={12} color={colors.textMuted} />
                    <Text style={[styles.contactText, { color: colors.textMuted }]} numberOfLines={1}>
                      {userPhone}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Refined Capsule Action Row */}
            <View
              style={[
                styles.capsuleActionsRow,
                { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)' },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.capsuleBtn,
                  {
                    backgroundColor: colors.cardAlt,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                  },
                ]}
                onPress={() => {
                  setEditFirstName(user?.first_name || '');
                  setEditLastName(user?.last_name || '');
                  setEditMobile(user?.customer_profile?.mobile_number || '');
                  setEditModalVisible(true);
                }}
              >
                <Ionicons name="create-outline" size={14} color={colors.text} />
                <Text style={[styles.capsuleBtnText, { color: colors.text }]}>Edit Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.capsuleBtn,
                  {
                    backgroundColor: colors.cardAlt,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                  },
                ]}
                onPress={() => router.push('/(tabs)/more/settings')}
              >
                <Ionicons name="storefront-outline" size={14} color={colors.text} />
                <Text style={[styles.capsuleBtnText, { color: colors.text }]}>Storefront</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Integrated Executive Control Bar (Compact, bespoke dual-pill status row) */}
          <View
            style={[
              styles.controlBar,
              {
                backgroundColor: colors.card,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              },
            ]}
          >
            {/* Dark Appearance Toggle Pill */}
            <View style={styles.controlBarItem}>
              <View
                style={[
                  styles.controlIconBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(234, 179, 8, 0.15)'
                      : 'rgba(245, 158, 11, 0.12)',
                    borderColor: isDark
                      ? 'rgba(234, 179, 8, 0.3)'
                      : 'rgba(245, 158, 11, 0.2)',
                  },
                ]}
              >
                <Ionicons
                  name={isDark ? 'moon' : 'sunny'}
                  size={15}
                  color={isDark ? '#eab308' : '#d97706'}
                />
              </View>
              <View style={styles.controlTextCol}>
                <Text style={[styles.controlLabel, { color: colors.text }]}>Dark Mode</Text>
                <Text style={[styles.controlSub, { color: colors.textMuted }]}>
                  {isDark ? 'Night theme' : 'Light theme'}
                </Text>
              </View>
              <ModernSwitch value={isDark} onValueChange={toggleTheme} />
            </View>

            {/* Vertical Hairline Separator */}
            <View
              style={[
                styles.controlBarSeparator,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
              ]}
            />

            {/* Live Store Status Pill */}
            <View style={styles.controlStatusCol}>
              <View style={styles.statusDotRow}>
                <View style={styles.livePulseDot} />
                <Text style={[styles.statusTitle, { color: colors.text }]}>Store Live</Text>
              </View>
              <Text style={[styles.statusSubtitle, { color: colors.textMuted }]}>Portal Active</Text>
            </View>
          </View>

          {/* Inset-Grouped Navigation Hub (Apple HIG / Stripe Mobile) */}
          {NAV_GROUPS.map((group) => (
            <View key={group.id} style={styles.groupSection}>
              <Text style={[styles.groupTitle, { color: colors.textMuted }]}>
                {group.title}
              </Text>

              <View
                style={[
                  styles.groupCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  },
                ]}
              >
                {group.items.map((item, index) => {
                  const isLast = index === group.items.length - 1;

                  return (
                    <React.Fragment key={item.id}>
                      <TouchableOpacity
                        activeOpacity={0.65}
                        style={styles.menuRow}
                        onPress={() => router.push(item.route as any)}
                      >
                        <View
                          style={[
                            styles.menuIconBox,
                            {
                              backgroundColor: isDark
                                ? `${item.color}22`
                                : `${item.color}14`,
                              borderColor: isDark
                                ? `${item.color}44`
                                : `${item.color}28`,
                            },
                          ]}
                        >
                          <Ionicons name={item.icon} size={18} color={item.color} />
                        </View>

                        <View style={styles.menuTextContainer}>
                          <Text style={[styles.menuTitle, { color: colors.text }]}>
                            {item.title}
                          </Text>
                          {item.ownerOnly && (
                            <View style={styles.ownerBadgePill}>
                              <Text style={styles.ownerBadgePillText}>OWNER</Text>
                            </View>
                          )}
                        </View>

                        <Ionicons
                          name="chevron-forward"
                          size={15}
                          color={isDark ? '#475569' : '#cbd5e1'}
                          style={styles.menuChevron}
                        />
                      </TouchableOpacity>

                      {/* Inset Hairline Divider (Stops precisely at icon gutter) */}
                      {!isLast && (
                        <View
                          style={[
                            styles.insetDivider,
                            {
                              backgroundColor: isDark
                                ? 'rgba(255, 255, 255, 0.07)'
                                : 'rgba(0, 0, 0, 0.06)',
                            },
                          ]}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
            </View>
          ))}

          {/* Dedicated System & Session Group (Apple HIG Unified Card) */}
          <View style={styles.groupSection}>
            <Text style={[styles.groupTitle, { color: colors.textMuted }]}>
              SYSTEM & SESSION
            </Text>

            <View
              style={[
                styles.groupCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                },
              ]}
            >
              {/* Check for App Updates Row */}
              <TouchableOpacity
                activeOpacity={0.65}
                disabled={checkingUpdates}
                style={styles.menuRow}
                onPress={handleCheckUpdate}
              >
                <View
                  style={[
                    styles.menuIconBox,
                    {
                      backgroundColor: isDark ? 'rgba(2, 132, 199, 0.18)' : 'rgba(2, 132, 199, 0.12)',
                      borderColor: isDark ? 'rgba(2, 132, 199, 0.35)' : 'rgba(2, 132, 199, 0.22)',
                    },
                  ]}
                >
                  <Ionicons name="cloud-download-outline" size={18} color="#0284c7" />
                </View>

                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuTitle, { color: colors.text }]}>
                    Software Updates
                  </Text>
                </View>

                <View style={styles.systemAccessoryRow}>
                  {checkingUpdates ? (
                    <View style={styles.checkingUpdatesRow}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={[styles.checkingUpdatesText, { color: colors.textMuted }]}>
                        Checking...
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.versionPill,
                        {
                          backgroundColor: colors.cardAlt,
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                        },
                      ]}
                    >
                      <Text style={[styles.versionPillText, { color: colors.textMuted }]}>
                        v1.2.0
                      </Text>
                    </View>
                  )}
                  <Ionicons
                    name="chevron-forward"
                    size={15}
                    color={isDark ? '#475569' : '#cbd5e1'}
                    style={styles.menuChevron}
                  />
                </View>
              </TouchableOpacity>

              {/* Inset Hairline Divider */}
              <View
                style={[
                  styles.insetDivider,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.07)'
                      : 'rgba(0, 0, 0, 0.06)',
                  },
                ]}
              />

              {/* Sign Out Row (Dignified Destructive Styling) */}
              <TouchableOpacity
                activeOpacity={0.65}
                style={styles.menuRow}
                onPress={handleSignOut}
              >
                <View
                  style={[
                    styles.menuIconBox,
                    {
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.1)',
                      borderColor: isDark ? 'rgba(239, 68, 68, 0.32)' : 'rgba(239, 68, 68, 0.2)',
                    },
                  ]}
                >
                  <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                </View>

                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuTitle, { color: '#ef4444', fontWeight: '600' }]}>
                    Sign Out
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color={isDark ? '#475569' : '#cbd5e1'}
                  style={styles.menuChevron}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Refined Brand Footer Seal */}
          <View style={styles.footerWrap}>
            <View style={styles.footerBrandRow}>
              <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
              <Text style={[styles.footerText, { color: colors.textMuted }]}>
                Narendra Kirana Store • Owner Portal
              </Text>
            </View>
            <Text style={[styles.footerSub, { color: colors.textMuted }]}>
              Version 1.2.0 • Secured JWT Session
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Polish Edit Profile Modal (Sleek, iOS Keyboard-Safe Sheet) */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.card,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
              },
            ]}
          >
            {/* Modal Header */}
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
              ]}
            >
              <View style={styles.modalHeaderTitleCol}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Profile Details</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Update store operator credentials
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                activeOpacity={0.7}
                style={[styles.modalCloseBtn, { backgroundColor: colors.cardAlt }]}
              >
                <Ionicons name="close" size={17} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Modal Body Form */}
            <ScrollView
              style={styles.modalBodyScroll}
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>FIRST NAME</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.cardAlt,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="e.g. Narendra"
                placeholderTextColor={colors.textMuted}
                value={editFirstName}
                onChangeText={setEditFirstName}
                autoCapitalize="words"
              />

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>LAST NAME</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.cardAlt,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="e.g. Perali"
                placeholderTextColor={colors.textMuted}
                value={editLastName}
                onChangeText={setEditLastName}
                autoCapitalize="words"
              />

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>MOBILE NUMBER</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.cardAlt,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="e.g. 9876543210"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={editMobile}
                onChangeText={setEditMobile}
              />
            </ScrollView>

            {/* Modal Actions Footer */}
            <View
              style={[
                styles.modalFooter,
                { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  {
                    backgroundColor: colors.cardAlt,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  },
                ]}
                onPress={() => setEditModalVisible(false)}
                disabled={savingProfile}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
                activeOpacity={0.8}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Web Cropper Modal Overlay */}
      {Platform.OS === 'web' && webImage && (
        <WebCropper
          imageSrc={webImage}
          onCropComplete={handleWebCropComplete}
          onCancel={() => setWebImage(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  contentBounded: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },

  // 1. Executive Operator Identity Card
  identityCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  identityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 16,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatarFrame: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  initialsWrap: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 27,
    height: 27,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  identityInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  operatorName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  rolePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4.5,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5.5,
  },
  contactText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  capsuleActionsRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  capsuleBtn: {
    flex: 1,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    borderWidth: 1,
    gap: 6,
  },
  capsuleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },

  // 2. Integrated Executive Control Bar
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 18,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  controlBarItem: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  controlIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlTextCol: {
    flex: 1,
  },
  controlLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  controlSub: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  controlBarSeparator: {
    width: StyleSheet.hairlineWidth,
    height: 26,
    marginHorizontal: 10,
  },
  controlStatusCol: {
    flex: 0.85,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  statusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5.5,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10b981',
  },
  statusTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  statusSubtitle: {
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 0.5,
  },

  // 3. Inset-Grouped Navigation Hub
  groupSection: {
    marginBottom: 18,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 7,
    paddingHorizontal: 10,
  },
  groupCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  ownerBadgePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    paddingHorizontal: 5.5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ownerBadgePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 0.5,
  },
  menuChevron: {
    marginLeft: 6,
  },
  insetDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 64, // Stops cleanly at icon gutter
  },

  // 4. Dedicated System & Session Accessories
  systemAccessoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkingUpdatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkingUpdatesText: {
    fontSize: 12,
    fontWeight: '500',
  },
  versionPill: {
    paddingHorizontal: 7.5,
    paddingVertical: 2.5,
    borderRadius: 10,
    borderWidth: 1,
  },
  versionPillText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // 5. Brand Footer
  footerWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 28,
  },
  footerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  footerSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 3,
    opacity: 0.75,
  },

  // 6. Polish Edit Profile Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalHeaderTitleCol: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 17.5,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  modalBodyScroll: {
    maxHeight: 380,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14.5,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalSaveBtn: {
    flex: 1.4,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
