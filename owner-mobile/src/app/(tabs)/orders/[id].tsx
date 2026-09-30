import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Linking,
} from 'react-native';
import { useLocalSearchParams as useExpoParams, useRouter as useExpoRouter } from 'expo-router';
import { Image } from 'expo-image';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../context/ThemeContext';
import { showAlert, showConfirm } from '../../../utils/alerts';

interface OrderItem {
  id: number;
  product?: number;
  product_name_snapshot: string;
  unit_snapshot?: string;
  price_snapshot: string;
  quantity: number;
  subtotal: string;
  status?: string;
  product_image?: string | null;
}

interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_pincode?: string;
  delivery_latitude?: string | number;
  delivery_longitude?: string | number;
  order_type: string;
  payment_method?: string;
  upi_transaction_id?: string;
  status: string;
  total_amount: string;
  delivery_fee?: string;
  packaging_fee?: string;
  discount_amount?: string;
  wallet_discount?: string;
  delivery_otp?: string;
  delivery_partner?: number | null;
  customer_note?: string;
  owner_note?: string;
  created_at?: string;
  items: OrderItem[];
}

const PIPELINE_STEPS = [
  { key: 'ACCEPTED', label: 'Accepted', icon: 'checkmark-circle-outline' as const },
  { key: 'PREPARING', label: 'Packing', icon: 'cube-outline' as const },
  { key: 'READY', label: 'Ready', icon: 'bag-check-outline' as const },
  { key: 'COMPLETED', label: 'Fulfilled', icon: 'shield-checkmark-outline' as const },
];

export default function OrderDetailsScreen() {
  const { id } = useExpoParams();
  const router = useExpoRouter();
  const { isDark, colors } = useAppTheme();
  const [order, setOrder] = useState<Order | null>(null);
  const [partners, setPartners] = useState<any[]>([]);
  const [packedItems, setPackedItems] = useState<Record<number, boolean>>({});
  const [ownerNote, setOwnerNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchOrderDetails = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const [orderRes, partnersRes] = await Promise.allSettled([
        api.get(`/orders/${id}/`),
        api.get('/delivery/partners/'),
      ]);

      if (orderRes.status === 'fulfilled' && orderRes.value?.data) {
        setOrder(orderRes.value.data);
        setOwnerNote(orderRes.value.data.owner_note || '');
      } else if (orderRes.status === 'rejected') {
        const err = orderRes.reason;
        if (err?.response?.status !== 401) {
          showAlert('Error', getErrorMessage(err, 'Could not load order details'), () =>
            router.back()
          );
        }
      }

      if (partnersRes.status === 'fulfilled' && partnersRes.value?.data) {
        const raw = partnersRes.value.data?.results ?? partnersRes.value.data;
        setPartners(Array.isArray(raw) ? raw : []);
      }
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const itemsList = Array.isArray(order?.items) ? order.items : [];
  const activeItems = itemsList.filter((i) => i?.status !== 'REJECTED');
  const packedCount = activeItems.filter((i) => packedItems[i.id]).length;
  const allPacked = activeItems.length > 0 && packedCount === activeItems.length;
  const progressPercent =
    activeItems.length > 0 ? Math.round((packedCount / activeItems.length) * 100) : 0;

  const updateStatus = useCallback(
    async (newStatus: string) => {
      if (!id) return;
      if (newStatus === 'READY' && !allPacked) {
        const remaining = activeItems.length - packedCount;
        showAlert(
          'Packing Incomplete',
          `Please check off all ${activeItems.length} active items (or reject unavailable items) before marking the order as ready.\n\n${remaining} item(s) remaining to pack.`
        );
        return;
      }
      try {
        setUpdatingStatus(true);
        await api.patch(`/orders/${id}/status/`, { status: newStatus });
        (api as ApiInstance).clearCache();
        await fetchOrderDetails();
      } catch (error: any) {
        showAlert('Error', getErrorMessage(error, 'Failed to update order status'));
      } finally {
        setUpdatingStatus(false);
      }
    },
    [id, allPacked, activeItems.length, packedCount, fetchOrderDetails]
  );

  const handleRejectItem = (item: OrderItem) => {
    showConfirm(
      'Reject Unavailable Item',
      `Mark "${item.product_name_snapshot}" as out of stock and deduct it from this order?`,
      async () => {
        try {
          setUpdatingStatus(true);
          const res = await api.post(`/orders/${id}/reject_item/`, { item_id: item.id });
          if (res?.data) setOrder(res.data);
          (api as ApiInstance).clearCache();
          showAlert('Item Removed', `Removed ${item.product_name_snapshot} from order.`);
        } catch (e: any) {
          showAlert('Error', getErrorMessage(e, 'Failed to reject item.'));
        } finally {
          setUpdatingStatus(false);
        }
      },
      undefined,
      'Reject Item'
    );
  };

  const handleAssignPartner = async (partnerId: number | null) => {
    if (!id) return;
    try {
      const res = await api.post(`/orders/${id}/assign_partner/`, {
        delivery_partner_id: partnerId,
      });
      if (res?.data) setOrder(res.data);
      (api as ApiInstance).clearCache();
      showAlert(
        'Updated',
        partnerId ? 'Delivery partner assigned!' : 'Delivery partner unassigned.'
      );
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to assign delivery partner.'));
    }
  };

  const handleSaveNote = async () => {
    if (!id) return;
    setSavingNote(true);
    try {
      const res = await api.patch(`/orders/${id}/owner_note/`, { owner_note: ownerNote });
      if (res?.data) setOrder(res.data);
      (api as ApiInstance).clearCache();
      showAlert('Saved', 'Owner note updated.');
    } catch (e: any) {
      try {
        const res = await api.post(`/orders/${id}/owner_note/`, { owner_note: ownerNote });
        if (res?.data) setOrder(res.data);
        (api as ApiInstance).clearCache();
        showAlert('Saved', 'Owner note updated.');
      } catch (errFallback: any) {
        showAlert('Error', getErrorMessage(errFallback || e, 'Failed to save note.'));
      }
    } finally {
      setSavingNote(false);
    }
  };

  const handleOpenDirections = async () => {
    if (!order?.delivery_latitude || !order?.delivery_longitude) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${order.delivery_latitude},${order.delivery_longitude}`;
    try {
      await Linking.openURL(url);
    } catch {
      showAlert('Coordinates', `${order.delivery_latitude}, ${order.delivery_longitude}`);
    }
  };

  const handleWhatsAppCustomer = () => {
    if (!order?.customer_phone) return;
    const cleanDigits = String(order.customer_phone).replace(/\D/g, '');
    const phoneWithCountry = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const msg = encodeURIComponent(
      `Hello ${order.customer_name || ''}, regarding your Narendra Kirana Order #${order.id} (₹${order.total_amount}):`
    );
    Linking.openURL(`https://wa.me/${phoneWithCountry}?text=${msg}`).catch(() => {});
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!order) return null;

  const itemsSubtotal = itemsList
    .filter((i) => i?.status !== 'REJECTED')
    .reduce(
      (sum, item) =>
        sum +
        (parseFloat(item?.subtotal) ||
          (parseFloat(item?.price_snapshot) || 0) * (item?.quantity || 1)),
      0
    )
    .toFixed(2);
  const canRejectItems = ['NEW', 'ACCEPTED', 'PREPARING'].includes(order.status);
  const isPackingMode = order.status === 'PREPARING';
  const isPackedOrDone = ['READY', 'OUT_FOR_DELIVERY', 'COMPLETED'].includes(order.status);

  const toggleAllPacked = () => {
    if (allPacked) {
      setPackedItems({});
    } else {
      const next: Record<number, boolean> = {};
      activeItems.forEach((i) => {
        if (i?.id) next[i.id] = true;
      });
      setPackedItems(next);
    }
  };

  const getStepIndex = (st: string) => {
    if (st === 'ACCEPTED') return 0;
    if (st === 'PREPARING') return 1;
    if (st === 'READY' || st === 'OUT_FOR_DELIVERY') return 2;
    if (st === 'COMPLETED') return 3;
    return -1;
  };
  const currentStep = getStepIndex(order.status);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.maxContainer}>
          {/* 1. Sleek Compact Top Navigation Bar */}
          <View style={styles.compactNavRow}>
            <TouchableOpacity
              style={[
                styles.compactBackBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => router.back()}
              accessibilityLabel="Back to orders"
            >
              <Ionicons name="arrow-back" size={16} color={colors.text} />
              <Text style={[styles.compactBackText, { color: colors.text }]}>Orders</Text>
            </TouchableOpacity>

            <View style={styles.topBadgesRight}>
              <View
                style={[
                  styles.modePill,
                  {
                    backgroundColor:
                      order.order_type === 'PICKUP'
                        ? isDark
                          ? 'rgba(124, 58, 237, 0.16)'
                          : '#f3e8ff'
                        : isDark
                          ? 'rgba(59, 130, 246, 0.16)'
                          : '#eff6ff',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modePillText,
                    {
                      color:
                        order.order_type === 'PICKUP'
                          ? isDark
                            ? '#d8b4fe'
                            : '#7c3aed'
                          : isDark
                            ? '#93c5fd'
                            : '#2563eb',
                    },
                  ]}
                >
                  {order.order_type === 'PICKUP' ? '🏪 Pickup' : '🛵 Delivery'}
                </Text>
              </View>

              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor:
                      order.status === 'COMPLETED'
                        ? '#10b981'
                        : order.status === 'READY'
                          ? '#059669'
                          : order.status === 'PREPARING'
                            ? '#f59e0b'
                            : order.status === 'ACCEPTED'
                              ? '#3b82f6'
                              : order.status === 'REJECTED'
                                ? '#64748b'
                                : '#e11d48',
                  },
                ]}
              >
                <Text style={styles.statusPillText}>{order.status}</Text>
              </View>
            </View>
          </View>

          {/* 2. Compact Order Summary & Slim Stepper Card */}
          <View
            style={[
              styles.compactCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {/* Top row: Order # & Payment on left, Amount on right */}
            <View style={styles.compactOrderHeaderRow}>
              <View style={styles.compactOrderLeftCol}>
                <View style={styles.compactOrderIdRow}>
                  <Text style={[styles.compactOrderId, { color: colors.text }]} selectable>
                    Order #{order.id}
                  </Text>
                  <View
                    style={[
                      styles.payBadgePill,
                      {
                        backgroundColor: colors.cardAlt,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.payBadgeText, { color: colors.textMuted }]}>
                      {order.payment_method || 'COD'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.payBadgePill,
                      {
                        backgroundColor: isDark ? '#064e3b' : '#ecfdf5',
                        borderColor: '#10b981',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 3,
                      },
                    ]}
                    onPress={() => router.push('/(tabs)/more/invoices' as any)}
                  >
                    <Ionicons name="document-text-outline" size={12} color="#10b981" />
                    <Text style={[styles.payBadgeText, { color: '#10b981', fontWeight: 'bold' }]}>
                      Invoice
                    </Text>
                  </TouchableOpacity>
                </View>
                {order.upi_transaction_id ? (
                  <Text
                    style={[styles.upiSubText, { color: colors.textMuted }]}
                    numberOfLines={1}
                  >
                    Ref: {order.upi_transaction_id}
                  </Text>
                ) : null}
              </View>

              <Text style={styles.compactTotalAmount}>₹{order.total_amount}</Text>
            </View>

            {/* Slim 4-Stage Stepper */}
            {order.status !== 'REJECTED' && (
              <View style={styles.slimStepperRow}>
                {PIPELINE_STEPS.map((step, idx) => {
                  const done = idx <= currentStep;
                  const isCurrent = idx === currentStep;
                  return (
                    <View key={step.key} style={styles.slimStepItem}>
                      <View
                        style={[
                          styles.slimStepIndicator,
                          {
                            backgroundColor: done ? '#10b981' : colors.cardAlt,
                            borderColor: isCurrent ? '#10b981' : 'transparent',
                            borderWidth: isCurrent ? 1.5 : 0,
                          },
                        ]}
                      >
                        <Ionicons
                          name={step.icon}
                          size={11}
                          color={done ? '#ffffff' : colors.textMuted}
                        />
                      </View>
                      <Text
                        style={[
                          styles.slimStepLabel,
                          {
                            color: done ? '#10b981' : colors.textMuted,
                            fontWeight: isCurrent ? '800' : done ? '700' : '500',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {step.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* 3. Interactive Packing Checklist & Bill Card */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {/* Customer Special Note Banner during packing if present */}
            {order.customer_note ? (
              <View
                style={[
                  styles.compactCustomerNotePill,
                  {
                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.14)' : '#fffbeb',
                    borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : '#fde68a',
                    marginBottom: 8,
                  },
                ]}
              >
                <Ionicons name="chatbubble-ellipses" size={13} color="#d97706" />
                <Text
                  style={[
                    styles.compactCustomerNoteText,
                    { color: isDark ? '#fef3c7' : '#78350f' },
                  ]}
                  numberOfLines={2}
                >
                  Customer note: "{order.customer_note}"
                </Text>
              </View>
            ) : null}
            {/* Checklist Header */}
            <View style={styles.checklistHeaderRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.checklistTitleRow}>
                  <Ionicons
                    name={
                      isPackingMode
                        ? 'clipboard-outline'
                        : isPackedOrDone
                          ? 'bag-check-outline'
                          : 'list-outline'
                    }
                    size={17}
                    color="#10b981"
                  />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {isPackingMode ? 'Packing Checklist' : `Order Items (${activeItems.length})`}
                  </Text>
                  {isPackingMode && (
                    <View
                      style={[
                        styles.packedCounterBadge,
                        {
                          backgroundColor: allPacked
                            ? '#10b981'
                            : isDark
                              ? 'rgba(16, 185, 129, 0.15)'
                              : '#ecfdf5',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.packedCounterText,
                          { color: allPacked ? '#ffffff' : '#059669' },
                        ]}
                      >
                        {packedCount}/{activeItems.length} Packed
                      </Text>
                    </View>
                  )}
                  {isPackedOrDone && (
                    <View
                      style={[
                        styles.packedCounterBadge,
                        {
                          backgroundColor: isDark
                            ? 'rgba(16, 185, 129, 0.15)'
                            : '#ecfdf5',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.packedCounterText,
                          { color: '#059669' },
                        ]}
                      >
                        ✓ All Packed
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.checklistHint, { color: colors.textMuted }]}>
                  {isPackingMode
                    ? 'Tap items to check off as you pack into the delivery bag'
                    : isPackedOrDone
                      ? 'All items have been verified and packed'
                      : 'Review items before accepting and packing'}
                </Text>
              </View>

              {isPackingMode && activeItems.length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.packAllBtn,
                    {
                      backgroundColor: allPacked ? '#10b981' : colors.cardAlt,
                      borderColor: allPacked ? '#10b981' : colors.border,
                    },
                  ]}
                  onPress={toggleAllPacked}
                >
                  <Ionicons
                    name={allPacked ? 'refresh' : 'checkmark-done'}
                    size={14}
                    color={allPacked ? '#ffffff' : colors.text}
                  />
                  <Text
                    style={[
                      styles.packAllText,
                      { color: allPacked ? '#ffffff' : colors.text },
                    ]}
                  >
                    {allPacked ? 'Reset' : 'Pack All'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Visual Progress Bar (ONLY during PREPARING packing mode) */}
            {isPackingMode && activeItems.length > 0 && (
              <View style={styles.progressWrap}>
                <View style={[styles.progressBarTrack, { backgroundColor: colors.cardAlt }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${progressPercent}%`,
                        backgroundColor: allPacked ? '#10b981' : '#3b82f6',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressPercentText, { color: colors.textMuted }]}>
                  {progressPercent}%
                </Text>
              </View>
            )}

            {/* All Packed Celebration Banner during PREPARING */}
            {order.status === 'PREPARING' && allPacked && activeItems.length > 0 && (
              <View
                style={[
                  styles.allPackedBanner,
                  {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : '#a7f3d0',
                  },
                ]}
              >
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="checkmark-done-circle" size={24} color="#10b981" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.allPackedTitle}>All items verified & packed!</Text>
                    <Text style={[styles.allPackedSub, { color: colors.textMuted }]}>
                      Order is sealed and ready for dispatch / handover.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.allPackedQuickBtn}
                  onPress={() => updateStatus('READY')}
                >
                  <Text style={styles.allPackedQuickBtnText}>Mark Ready</Text>
                  <Ionicons name="arrow-forward" size={13} color="#ffffff" />
                </TouchableOpacity>
              </View>
            )}

            {/* Items List */}
            <View style={styles.itemsListWrap}>
              {itemsList.map((item, index) => {
                const isRejected = item?.status === 'REJECTED';
                const isPacked = isPackingMode
                  ? Boolean(packedItems[item?.id])
                  : isPackedOrDone && !isRejected;
                return (
                  <TouchableOpacity
                    key={item?.id ? String(item.id) : `item-${index}`}
                    activeOpacity={isPackingMode && !isRejected ? 0.8 : 1}
                    disabled={!isPackingMode || isRejected}
                    onPress={() =>
                      isPackingMode &&
                      item?.id &&
                      setPackedItems((prev) => ({
                        ...prev,
                        [item.id]: !prev[item.id],
                      }))
                    }
                    style={[
                      styles.itemCardRow,
                      {
                        backgroundColor: isRejected
                          ? isDark
                            ? 'rgba(244, 63, 94, 0.06)'
                            : '#fff1f2'
                          : isPackingMode && isPacked
                            ? isDark
                              ? 'rgba(16, 185, 129, 0.08)'
                              : '#f0fdf4'
                            : colors.cardAlt,
                        borderColor: isRejected
                          ? '#fecdd3'
                          : isPackingMode && isPacked
                            ? '#10b981'
                            : colors.border,
                      },
                    ]}
                  >
                    {/* Custom Checkbox (ONLY in PREPARING packing mode) */}
                    {isPackingMode && (
                      <View
                        style={[
                          styles.itemCheckboxSquircle,
                          {
                            backgroundColor: isRejected
                              ? '#fda4af'
                              : isPacked
                                ? '#10b981'
                                : colors.card,
                            borderColor: isRejected
                              ? '#f43f5e'
                              : isPacked
                                ? '#10b981'
                                : colors.border,
                          },
                        ]}
                      >
                        {isPacked && !isRejected && (
                          <Ionicons name="checkmark" size={14} color="#ffffff" />
                        )}
                        {isRejected && (
                          <Ionicons name="close" size={14} color="#ffffff" />
                        )}
                      </View>
                    )}

                    {/* Product Thumbnail or Fallback */}
                    <View
                      style={[
                        styles.itemThumbBox,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      {item.product_image ? (
                        <Image
                          source={{ uri: item.product_image }}
                          style={styles.itemThumbImg}
                          contentFit="contain"
                        />
                      ) : (
                        <Ionicons
                          name="basket-outline"
                          size={20}
                          color={isPacked ? '#10b981' : colors.textMuted}
                        />
                      )}
                    </View>

                    {/* Item Details */}
                    <View style={styles.itemInfoCol}>
                      <View style={styles.itemNameLine}>
                        <Text
                          style={[
                            styles.itemNameText,
                            { color: colors.text },
                            (isPacked || isRejected) && {
                              textDecorationLine: 'line-through',
                              color: colors.textMuted,
                            },
                          ]}
                          numberOfLines={2}
                        >
                          {item.product_name_snapshot || 'Item'}
                        </Text>
                        {isRejected && (
                          <View style={styles.rejectedBadgePill}>
                            <Text style={styles.rejectedBadgeText}>Rejected</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.itemMetaLine}>
                        {item.unit_snapshot ? (
                          <View
                            style={[
                              styles.itemUnitPill,
                              { backgroundColor: colors.card, borderColor: colors.border },
                            ]}
                          >
                            <Text style={[styles.itemUnitText, { color: colors.text }]}>
                              {item.unit_snapshot}
                            </Text>
                          </View>
                        ) : null}
                        <Text style={[styles.itemPriceRateText, { color: colors.textMuted }]}>
                          ₹{item.price_snapshot} each
                        </Text>
                      </View>
                    </View>

                    {/* Price & Quantity Box */}
                    <View style={styles.itemRightPriceBox}>
                      <View style={[styles.itemQtyMultiplierPill, { backgroundColor: colors.card }]}>
                        <Text style={[styles.itemQtyMultiplierText, { color: colors.text }]}>
                          {item.quantity}×
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.itemSubtotalBold,
                          { color: colors.text },
                          isRejected && {
                            textDecorationLine: 'line-through',
                            color: colors.textMuted,
                          },
                        ]}
                      >
                        ₹{item.subtotal}
                      </Text>

                      {canRejectItems && !isRejected && item?.id ? (
                        <TouchableOpacity
                          style={styles.itemRejectTrigger}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          onPress={() => handleRejectItem(item)}
                        >
                          <Text style={styles.itemRejectTriggerText}>Reject</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Bill Breakdown */}
            <View style={[styles.billBreakdown, { borderTopColor: colors.border }]}>
              <View style={styles.feeRow}>
                <Text style={[styles.feeLabel, { color: colors.textMuted }]}>
                  Items Subtotal
                </Text>
                <Text style={[styles.feeVal, { color: colors.text }]}>
                  ₹{itemsSubtotal}
                </Text>
              </View>

              {Number(order.delivery_fee || 0) > 0 ? (
                <View style={styles.feeRow}>
                  <Text style={[styles.feeLabel, { color: colors.textMuted }]}>
                    Delivery Fee
                  </Text>
                  <Text style={[styles.feeVal, { color: colors.text }]}>
                    ₹{order.delivery_fee}
                  </Text>
                </View>
              ) : null}
              {Number(order.packaging_fee || 0) > 0 ? (
                <View style={styles.feeRow}>
                  <Text style={[styles.feeLabel, { color: colors.textMuted }]}>
                    Packaging Fee
                  </Text>
                  <Text style={[styles.feeVal, { color: colors.text }]}>
                    ₹{order.packaging_fee}
                  </Text>
                </View>
              ) : null}
              {Number(order.discount_amount || 0) > 0 ? (
                <View style={styles.feeRow}>
                  <Text style={[styles.feeLabel, { color: colors.textMuted }]}>
                    Promo Discount
                  </Text>
                  <Text style={[styles.feeVal, { color: '#10b981' }]}>
                    -₹{order.discount_amount}
                  </Text>
                </View>
              ) : null}
              {Number(order.wallet_discount || 0) > 0 ? (
                <View style={styles.feeRow}>
                  <Text style={[styles.feeLabel, { color: colors.textMuted }]}>
                    Wallet Used
                  </Text>
                  <Text style={[styles.feeVal, { color: '#10b981' }]}>
                    -₹{order.wallet_discount}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.totalText, { color: colors.text }]}>
                  Grand Total
                </Text>
                <Text style={styles.totalAmount}>₹{order.total_amount ?? '0.00'}</Text>
              </View>
            </View>
          </View>

          {/* 4. Delivery Rider Assignment & OTP Card */}
          {order.order_type === 'DELIVERY' ? (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.otpHeader}>
                <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
                  DELIVERY RIDER & OTP
                </Text>
                {order.delivery_otp ? (
                  <View style={styles.otpBadge}>
                    <Ionicons name="key-outline" size={13} color="#ffffff" />
                    <Text style={styles.otpText}>OTP: {order.delivery_otp}</Text>
                  </View>
                ) : null}
              </View>

              {partners.length === 0 ? (
                <Text style={[styles.checklistHint, { color: colors.textMuted }]}>
                  No delivery partners registered yet.
                </Text>
              ) : (
                <View style={styles.partnersWrap}>
                  {partners.map((p) => {
                    const selected = order.delivery_partner === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.partnerChip,
                          {
                            backgroundColor: selected ? '#10b981' : colors.cardAlt,
                            borderColor: selected ? '#10b981' : colors.border,
                          },
                        ]}
                        onPress={() => handleAssignPartner(selected ? null : p.id)}
                      >
                        <Ionicons
                          name="bicycle"
                          size={15}
                          color={selected ? '#ffffff' : colors.text}
                        />
                        <Text
                          style={[
                            styles.partnerChipText,
                            {
                              color: selected ? '#ffffff' : colors.text,
                              fontWeight: selected ? '800' : '600',
                            },
                          ]}
                        >
                          {p.name || p.username}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}

          {/* 5. Customer & Delivery Contact Card (Positioned at bottom) */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
              CUSTOMER & DELIVERY
            </Text>

            <View style={styles.compactCustomerRow}>
              {/* Left Column: Customer details */}
              <View style={styles.customerMetaCol}>
                <View style={styles.customerNameLine}>
                  <Ionicons name="person" size={14} color="#10b981" />
                  <Text
                    style={[styles.compactCustomerName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {order.customer_name || 'Guest Customer'}
                  </Text>
                  {order.customer_phone ? (
                    <Text style={[styles.compactPhoneText, { color: colors.textMuted }]}>
                      • {order.customer_phone}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.customerLocLine}>
                  <Ionicons
                    name={order.order_type === 'PICKUP' ? 'storefront-outline' : 'location-outline'}
                    size={14}
                    color={order.order_type === 'PICKUP' ? '#8b5cf6' : '#f59e0b'}
                  />
                  <Text
                    style={[styles.compactLocText, { color: colors.textMuted }]}
                    numberOfLines={2}
                  >
                    {order.order_type === 'PICKUP'
                      ? 'Customer will pick up at store counter'
                      : `${order.delivery_address || 'No address provided'}${
                          order.delivery_pincode ? ` (${order.delivery_pincode})` : ''
                        }`}
                  </Text>
                </View>
              </View>

              {/* Right Column: Sleek Quick Action Buttons */}
              <View style={styles.compactActionButtonsGroup}>
                {order.customer_phone ? (
                  <>
                    <TouchableOpacity
                      style={[styles.compactMiniBtn, { backgroundColor: '#10b981' }]}
                      onPress={() =>
                        Linking.openURL(`tel:${order.customer_phone}`).catch(() => {})
                      }
                      accessibilityLabel="Call Customer"
                    >
                      <Ionicons name="call" size={15} color="#ffffff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.compactMiniBtn, { backgroundColor: '#059669' }]}
                      onPress={handleWhatsAppCustomer}
                      accessibilityLabel="WhatsApp Customer"
                    >
                      <Ionicons name="logo-whatsapp" size={15} color="#ffffff" />
                    </TouchableOpacity>
                  </>
                ) : null}

                {order.delivery_latitude && order.delivery_longitude ? (
                  <TouchableOpacity
                    style={[styles.compactMiniBtn, { backgroundColor: '#2563eb' }]}
                    onPress={handleOpenDirections}
                    accessibilityLabel="Directions to Customer"
                  >
                    <Ionicons name="navigate" size={15} color="#ffffff" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {order.customer_note ? (
              <View
                style={[
                  styles.compactCustomerNotePill,
                  {
                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.14)' : '#fffbeb',
                    borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : '#fde68a',
                    marginTop: 4,
                  },
                ]}
              >
                <Ionicons name="chatbubble-ellipses" size={13} color="#d97706" />
                <Text
                  style={[
                    styles.compactCustomerNoteText,
                    { color: isDark ? '#fef3c7' : '#78350f' },
                  ]}
                  numberOfLines={2}
                >
                  "{order.customer_note}"
                </Text>
              </View>
            ) : null}
          </View>

          {/* 6. Owner Note Card */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
              INTERNAL OWNER NOTE
            </Text>
            <View style={styles.noteRow}>
              <TextInput
                style={[
                  styles.noteInput,
                  {
                    backgroundColor: colors.cardAlt,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Add packing or delivery instructions..."
                placeholderTextColor={colors.textMuted}
                value={ownerNote}
                onChangeText={setOwnerNote}
              />
              <TouchableOpacity
                style={styles.saveNoteBtn}
                onPress={handleSaveNote}
                disabled={savingNote}
              >
                <Text style={styles.saveNoteText}>
                  {savingNote ? '...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Primary Order Action Bar */}
      {order.status !== 'COMPLETED' && order.status !== 'REJECTED' && (
        <View
          style={[
            styles.stickyActionBar,
            { backgroundColor: colors.headerBg, borderTopColor: colors.border },
          ]}
        >
          <View style={styles.stickyActionInner}>
            {updatingStatus ? (
              <ActivityIndicator size="small" color="#10b981" style={{ flex: 1 }} />
            ) : (
              <>
                {order.status === 'NEW' && (
                  <>
                    <TouchableOpacity
                      style={styles.stickyRejectBtn}
                      onPress={() => updateStatus('REJECTED')}
                    >
                      <Ionicons name="close" size={18} color="#e11d48" />
                      <Text style={styles.stickyRejectText}>Reject</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.stickyPrimaryBtn, { backgroundColor: '#10b981' }]}
                      onPress={() => updateStatus('ACCEPTED')}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                      <Text style={styles.stickyPrimaryText}>Accept Order</Text>
                    </TouchableOpacity>
                  </>
                )}

                {order.status === 'ACCEPTED' && (
                  <TouchableOpacity
                    style={[styles.stickyPrimaryBtn, { backgroundColor: '#2563eb' }]}
                    onPress={() => updateStatus('PREPARING')}
                  >
                    <Ionicons name="cube-outline" size={18} color="#ffffff" />
                    <Text style={styles.stickyPrimaryText}>Start Packing Order</Text>
                  </TouchableOpacity>
                )}

                {order.status === 'PREPARING' && (
                  <View style={{ flex: 1, gap: 4 }}>
                    <TouchableOpacity
                      style={[
                        styles.stickyPrimaryBtn,
                        {
                          width: '100%',
                          flex: 0,
                          backgroundColor: allPacked
                            ? '#10b981'
                            : isDark
                              ? 'rgba(124, 58, 237, 0.15)'
                              : '#f5f3ff',
                          borderWidth: allPacked ? 0 : 1.5,
                          borderColor: allPacked
                            ? '#10b981'
                            : isDark
                              ? 'rgba(124, 58, 237, 0.4)'
                              : '#c4b5fd',
                          opacity: updatingStatus ? 0.6 : 1,
                        },
                      ]}
                      disabled={updatingStatus}
                      onPress={() => {
                        if (!allPacked) {
                          const remaining = activeItems.length - packedCount;
                          showAlert(
                            'Packing Incomplete',
                            `Please check off all ${activeItems.length} items (or reject unavailable items) before marking the order as ready.\n\n${remaining} item(s) remaining to pack.`
                          );
                          return;
                        }
                        updateStatus('READY');
                      }}
                    >
                      <Ionicons
                        name={allPacked ? 'checkmark-done-circle' : 'time-outline'}
                        size={18}
                        color={allPacked ? '#ffffff' : isDark ? '#c4b5fd' : '#7c3aed'}
                      />
                      <Text
                        style={[
                          styles.stickyPrimaryText,
                          {
                            color: allPacked ? '#ffffff' : isDark ? '#c4b5fd' : '#7c3aed',
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {allPacked
                          ? `Mark Order Ready (All ${activeItems.length} Packed)`
                          : `Check All Items First (${packedCount}/${activeItems.length} Packed)`}
                      </Text>
                    </TouchableOpacity>
                    {!allPacked && (
                      <Text
                        style={{
                          fontSize: 11,
                          textAlign: 'center',
                          color: colors.textMuted,
                          marginTop: 1,
                        }}
                      >
                        Check off or reject remaining {activeItems.length - packedCount} item(s) first
                      </Text>
                    )}
                  </View>
                )}

                {order.status === 'READY' && (
                  <TouchableOpacity
                    style={[styles.stickyPrimaryBtn, { backgroundColor: '#059669' }]}
                    onPress={() =>
                      updateStatus(
                        order.order_type === 'PICKUP' ? 'COMPLETED' : 'OUT_FOR_DELIVERY'
                      )
                    }
                  >
                    <Ionicons
                      name={
                        order.order_type === 'PICKUP'
                          ? 'bag-check-outline'
                          : 'bicycle-outline'
                      }
                      size={18}
                      color="#ffffff"
                    />
                    <Text style={styles.stickyPrimaryText}>
                      {order.order_type === 'PICKUP'
                        ? 'Complete Customer Pickup'
                        : 'Dispatch for Delivery'}
                    </Text>
                  </TouchableOpacity>
                )}

                {order.status === 'OUT_FOR_DELIVERY' && (
                  <TouchableOpacity
                    style={[styles.stickyPrimaryBtn, { backgroundColor: '#10b981' }]}
                    onPress={() => updateStatus('COMPLETED')}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={18}
                      color="#ffffff"
                    />
                    <Text style={styles.stickyPrimaryText}>
                      Mark Delivered & Completed
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 32,
  },
  maxContainer: {
    maxWidth: 780,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  compactNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: -2,
  },
  compactBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  compactBackText: {
    fontSize: 13,
    fontWeight: '700',
  },
  compactCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  compactOrderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactOrderLeftCol: {
    flex: 1,
    gap: 2,
  },
  compactOrderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactOrderId: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  payBadgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  payBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  upiSubText: {
    fontSize: 11,
  },
  compactTotalAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#10b981',
  },
  slimStepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.15)',
    gap: 6,
  },
  slimStepItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  slimStepIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slimStepLabel: {
    fontSize: 10.5,
    flexShrink: 1,
  },
  compactCustomerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  customerMetaCol: {
    flex: 1,
    gap: 3,
  },
  customerNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  compactCustomerName: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  compactPhoneText: {
    fontSize: 12,
    fontWeight: '600',
  },
  customerLocLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  compactLocText: {
    fontSize: 11.5,
    flex: 1,
  },
  compactActionButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactMiniBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactCustomerNotePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 2,
  },
  compactCustomerNoteText: {
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
    fontStyle: 'italic',
  },
  topBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  topBadgesRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  modePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusPill: {
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  orderHeadlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderIdTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  paymentMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  headlineAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: '#10b981',
  },
  pipelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  pipelineItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  pipelineCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pipelineLabel: {
    fontSize: 10,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  customerInfoBlock: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoMainText: {
    fontSize: 15,
    fontWeight: '800',
  },
  infoSubText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
  contactButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
  },
  contactActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  contactActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  customerNoteCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  customerNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customerNoteTitle: {
    color: '#d97706',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  customerNoteBody: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    fontStyle: 'italic',
  },
  checklistHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  checklistTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  packedCounterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  packedCounterText: {
    fontSize: 11,
    fontWeight: '800',
  },
  checklistHint: {
    fontSize: 11,
    marginTop: 3,
  },
  packAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  packAllText: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercentText: {
    fontSize: 11,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'right',
  },
  allPackedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginTop: 4,
  },
  allPackedTitle: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '800',
  },
  allPackedSub: {
    fontSize: 11,
    marginTop: 1,
  },
  allPackedQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  allPackedQuickBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  itemsListWrap: {
    gap: 8,
    marginTop: 4,
  },
  itemCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  itemCheckboxSquircle: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemThumbBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemThumbImg: {
    width: '100%',
    height: '100%',
  },
  itemInfoCol: {
    flex: 1,
    gap: 3,
  },
  itemNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  itemNameText: {
    fontSize: 13.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  rejectedBadgePill: {
    backgroundColor: '#ffe4e6',
    borderWidth: 1,
    borderColor: '#fecdd3',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  rejectedBadgeText: {
    color: '#e11d48',
    fontSize: 9.5,
    fontWeight: '800',
  },
  itemMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemUnitPill: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  itemUnitText: {
    fontSize: 10,
    fontWeight: '700',
  },
  itemPriceRateText: {
    fontSize: 11,
  },
  itemRightPriceBox: {
    alignItems: 'flex-end',
    gap: 2,
    minWidth: 64,
  },
  itemQtyMultiplierPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  itemQtyMultiplierText: {
    fontSize: 11,
    fontWeight: '800',
  },
  itemSubtotalBold: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  itemRejectTrigger: {
    marginTop: 2,
  },
  itemRejectTriggerText: {
    color: '#e11d48',
    fontSize: 10.5,
    fontWeight: '700',
  },
  billBreakdown: {
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 6,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  feeLabel: {
    fontSize: 13,
  },
  feeVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: 1,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '800',
  },
  totalAmount: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: '900',
  },
  otpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  otpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  otpText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  partnersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  partnerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  partnerChipText: {
    fontSize: 12,
  },
  noteRow: {
    flexDirection: 'row',
    gap: 8,
  },
  noteInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  saveNoteBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveNoteText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  stickyActionBar: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  stickyActionInner: {
    maxWidth: 780,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  stickyRejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 72, 0.4)',
    backgroundColor: 'rgba(225, 29, 72, 0.1)',
  },
  stickyRejectText: {
    color: '#e11d48',
    fontSize: 14,
    fontWeight: '800',
  },
  stickyPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  stickyPrimaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
