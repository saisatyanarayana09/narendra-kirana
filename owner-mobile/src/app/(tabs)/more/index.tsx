import React, { useState, useEffect, useCallback } from 'react';
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
import api, { getErrorMessage } from '../../../services/api';
import { showAlert, showConfirm } from '../../../utils/alerts';
import { checkAndDownloadOtaUpdateSilently, applyOtaUpdate } from '../../../services/otaService';

interface NavItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
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
      const res = await api.get('/auth/profile/');
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

  // Structured, Human-Engineered Settings Groups
  const NAV_GROUPS: NavGroup[] = [
    {
      id: 'catalog',
      title: 'CATALOG & MERCHANDISING',
      items: [
        {
          id: 'categories',
          title: 'Product Categories',
          subtitle: 'Aisles, store departments & hierarchy',
          icon: 'pricetags-outline',
          route: '/(tabs)/more/categories',
        },
        {
          id: 'showcase',
          title: 'Visual Showcase',
          subtitle: 'Curate hero banners & seasonal aisles',
          icon: 'images-outline',
          route: '/(tabs)/more/showcase',
        },
        {
          id: 'offers',
          title: 'Offers & Discounts',
          subtitle: 'Store coupons, rules & cashback deals',
          icon: 'ticket-outline',
          route: '/(tabs)/more/offers',
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
          subtitle: 'Live rider tracking & active orders',
          icon: 'bicycle-outline',
          route: '/(tabs)/more/delivery',
        },
        {
          id: 'customers',
          title: 'Customer Directory',
          subtitle: 'Directory of registered shoppers & CRM',
          icon: 'people-outline',
          route: '/(tabs)/more/customers',
        },
        {
          id: 'invoices',
          title: 'Invoices & Billing',
          subtitle: 'GST invoices, tax logs & receipts',
          icon: 'receipt-outline',
          route: '/(tabs)/more/invoices',
        },
      ],
    },
    {
      id: 'insights',
      title: 'GROWTH & NOTIFICATIONS',
      items: [
        {
          id: 'broadcast',
          title: 'Push Broadcast',
          subtitle: 'Rich push announcements & images',
          icon: 'megaphone-outline',
          route: '/(tabs)/more/broadcast',
        },
        {
          id: 'reports',
          title: 'Sales & Analytics',
          subtitle: 'Revenue, performance & financial graphs',
          icon: 'stats-chart-outline',
          route: '/(tabs)/more/reports',
        },
      ],
    },
    {
      id: 'admin',
      title: 'ADMINISTRATION & SECURITY',
      items: [
        ...(user?.is_owner
          ? [
              {
                id: 'agents',
                title: 'Manage Team & Agents',
                subtitle: 'Store staff, co-owners & delivery riders',
                icon: 'shield-checkmark-outline' as const,
                route: '/(tabs)/more/agents',
                ownerOnly: true,
              },
            ]
          : []),
        {
          id: 'settings',
          title: 'Store Settings',
          subtitle: 'Store status, hours, delivery radius & contact info',
          icon: 'storefront-outline',
          route: '/(tabs)/more/settings',
        },
        {
          id: 'advanced',
          title: 'Configurations',
          subtitle: 'UPI QR, GST/FSSAI tax, WhatsApp & cloud backups',
          icon: 'options-outline',
          route: '/(tabs)/more/advanced-settings',
        },
      ],
    },
  ];

  const displayName =
    user?.first_name || user?.last_name
      ? `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
      : user?.username || 'Store Owner';

  const userPhone = user?.customer_profile?.mobile_number;
  const isOwner = Boolean(user?.is_owner);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* Top App Bar */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top, 14),
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.topBarInner}>
          <View>
            <Text style={[styles.topBarTitle, { color: colors.text }]}>Store Account</Text>
            <Text style={[styles.topBarSubtitle, { color: colors.textMuted }]}>
              Narendra Kirana Store
            </Text>
          </View>

          <View style={styles.topBarPills}>
            <View style={[styles.statusPip, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <View style={styles.statusDot} />
              <Text style={styles.statusPipText}>Live</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingBottom: Math.max(insets.bottom + 90, 110) },
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
          {/* Hero Profile Card */}
          <View
            style={[
              styles.profileCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.profileMainRow}>
              {/* Avatar with Camera Trigger */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handlePickImage}
                disabled={uploading}
                style={styles.avatarTouchable}
              >
                <View
                  style={[
                    styles.avatarFrame,
                    {
                      backgroundColor: colors.cardAlt,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {profilePic ? (
                    <Image source={{ uri: profilePic }} style={styles.avatarImg} contentFit="cover" />
                  ) : (
                    <Ionicons name="person" size={34} color={colors.textMuted} />
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

              {/* Name & Details */}
              <View style={styles.profileInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
                    {loading ? 'Loading...' : displayName}
                  </Text>
                </View>

                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.roleBadge,
                      {
                        backgroundColor: isOwner
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(99, 102, 241, 0.12)',
                      },
                    ]}
                  >
                    <Ionicons
                      name={isOwner ? 'shield-checkmark' : 'person-circle'}
                      size={12}
                      color={isOwner ? '#10b981' : '#6366f1'}
                    />
                    <Text
                      style={[
                        styles.roleBadgeText,
                        { color: isOwner ? '#10b981' : '#6366f1' },
                      ]}
                    >
                      {isOwner ? 'Store Owner' : 'Store Staff'}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.profileEmail, { color: colors.textMuted }]} numberOfLines={1}>
                  {user?.email || user?.username || '-'}
                </Text>

                {Boolean(userPhone) && (
                  <View style={styles.phoneRow}>
                    <Ionicons name="call-outline" size={12} color={colors.textMuted} />
                    <Text style={[styles.profilePhone, { color: colors.textMuted }]}>
                      {userPhone}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Quick Action Buttons */}
            <View style={[styles.profileActionsRow, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.profileActionBtn, { backgroundColor: colors.cardAlt }]}
                onPress={() => {
                  setEditFirstName(user?.first_name || '');
                  setEditLastName(user?.last_name || '');
                  setEditMobile(user?.customer_profile?.mobile_number || '');
                  setEditModalVisible(true);
                }}
              >
                <Ionicons name="create-outline" size={15} color={colors.text} />
                <Text style={[styles.profileActionText, { color: colors.text }]}>Edit Details</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.profileActionBtn, { backgroundColor: colors.cardAlt }]}
                onPress={handlePickImage}
              >
                <Ionicons name="image-outline" size={15} color={colors.text} />
                <Text style={[styles.profileActionText, { color: colors.text }]}>Change Photo</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Preferences Section: Theme Switcher */}
          <View
            style={[
              styles.preferencesCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.prefLeft}>
              <View style={[styles.prefIconWrap, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <Ionicons
                  name={isDark ? 'moon' : 'sunny'}
                  size={18}
                  color={isDark ? '#eab308' : '#f59e0b'}
                />
              </View>
              <View style={styles.prefTextBox}>
                <Text style={[styles.prefTitle, { color: colors.text }]}>Dark Appearance</Text>
                <Text style={[styles.prefSubtitle, { color: colors.textMuted }]}>
                  {isDark ? 'Night mode enabled' : 'Clean light theme'}
                </Text>
              </View>
            </View>

            <ModernSwitch value={isDark} onValueChange={toggleTheme} />
          </View>

          {/* Grouped Settings Lists */}
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
                    borderColor: colors.border,
                  },
                ]}
              >
                {group.items.map((item, index) => {
                  const isLast = index === group.items.length - 1;

                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.65}
                      style={[
                        styles.menuRow,
                        !isLast && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: colors.border,
                        },
                      ]}
                      onPress={() => router.push(item.route as any)}
                    >
                      <View
                        style={[
                          styles.menuIconBox,
                          {
                            backgroundColor: colors.cardAlt,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Ionicons name={item.icon} size={19} color={colors.text} />
                      </View>

                      <View style={styles.menuTextContainer}>
                        <View style={styles.menuTitleRow}>
                          <Text style={[styles.menuTitle, { color: colors.text }]}>
                            {item.title}
                          </Text>
                          {item.ownerOnly && (
                            <View style={styles.ownerBadgePill}>
                              <Text style={styles.ownerBadgePillText}>OWNER</Text>
                            </View>
                          )}
                        </View>
                        <Text
                          style={[styles.menuSubtitle, { color: colors.textMuted }]}
                          numberOfLines={1}
                        >
                          {item.subtitle}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={17}
                        color={colors.textMuted}
                        style={styles.menuChevron}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          {/* Safe Sign Out Section */}
          <View style={styles.signOutSection}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.signOutButton,
                {
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2',
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.22)' : '#fecaca',
                },
              ]}
              onPress={handleSignOut}
            >
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text style={styles.signOutText}>Sign Out of Store Account</Text>
            </TouchableOpacity>
          </View>

          {/* Check for Updates Section */}
          <View style={styles.updateCheckSection}>
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={checkingUpdates}
              style={[
                styles.updateCheckButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={handleCheckUpdate}
            >
              {checkingUpdates ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="cloud-download-outline" size={17} color={colors.primary} />
              )}
              <Text style={[styles.updateCheckText, { color: colors.text }]}>
                {checkingUpdates ? 'Checking for updates...' : 'Check for App Updates'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer Metadata */}
          <View style={styles.footerWrap}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              Narendra Kirana Store  Owner Portal
            </Text>
            <Text style={[styles.footerSub, { color: colors.textMuted }]}>
              Version 1.2.0  Secured JWT Session
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
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
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Profile Details</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Update store operator credentials
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.cardAlt }]}
              >
                <Ionicons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
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
                placeholder="e.g. 09949895755"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={editMobile}
                onChangeText={setEditMobile}
              />
            </View>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setEditModalVisible(false)}
                disabled={savingProfile}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
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
  topBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingBottom: 14,
    zIndex: 10,
  },
  topBarInner: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  topBarSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  topBarPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10b981',
  },
  statusPipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
    letterSpacing: 0.2,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  contentBounded: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  profileCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  profileMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 16,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatarFrame: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  profileEmail: {
    fontSize: 13,
    fontWeight: '500',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  profilePhone: {
    fontSize: 12,
    fontWeight: '500',
  },
  profileActionsRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 10,
    gap: 8,
  },
  profileActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  profileActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  preferencesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  prefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prefIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prefTextBox: {},
  prefTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  prefSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  groupSection: {
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  ownerBadgePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ownerBadgePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 0.5,
  },
  menuSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  menuChevron: {
    marginLeft: 10,
  },
  signOutSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '700',
  },
  footerWrap: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  footerSub: {
    fontSize: 11,
    marginTop: 3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 18,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalSaveBtn: {
    flex: 1.5,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  updateCheckSection: {
    marginTop: 12,
    marginBottom: 4,
  },
  updateCheckButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  updateCheckText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
