import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
  Platform,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { useAppTheme } from '../../../context/ThemeContext';
import { showAlert } from '../../../utils/alerts';
import ScreenHeader from '../../../components/ScreenHeader';

// ─── Formatters & Helpers ───
const formatInvoiceNumber = (order: any) => {
  const d = order?.created_at ? new Date(order.created_at) : new Date();
  const year = !isNaN(d.getFullYear()) ? d.getFullYear() : new Date().getFullYear();
  return `INV-${year}-${String(order?.id ?? 0).padStart(5, '0')}`;
};

const formatOrderDateTime = (dateStr: string) => {
  if (!dateStr) return { date: '—', time: '—' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { date: '—', time: '—' };
  return {
    date: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
};

const formatFullDateTime = (dateStr?: string | Date | null) => {
  if (!dateStr) return 'N/A';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (!d || isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const getPaymentMethodDisplay = (order: any) => {
  if (!order) return 'Cash on Delivery (COD)';
  const total = parseFloat(order.total_amount) || 0;
  const wallet = parseFloat(order.wallet_discount) || 0;
  const rawMethod = String(order.payment_method || 'COD').toUpperCase();

  let methodText = 'Cash on Delivery (COD)';
  if (rawMethod === 'UPI') {
    methodText = order.upi_transaction_id
      ? `UPI (Ref: ${order.upi_transaction_id})`
      : 'UPI Instant Payment';
  } else if (order.order_type === 'PICKUP' && rawMethod === 'COD') {
    methodText = 'Cash at Store Counter';
  } else if (rawMethod === 'CARD') {
    methodText = 'Debit / Credit Card';
  }

  if (total === 0 && wallet > 0) {
    return 'Wallet Balance (Full)';
  }
  if (wallet > 0) {
    return `Hybrid (Wallet + ${methodText})`;
  }
  return methodText;
};

// ─── 1. Invoice Card Component (Matches Web App Invoices Table Row) ───
const InvoiceCard = memo(
  ({
    order,
    onViewInvoice,
    onOpenOrder,
    colors,
    isDark,
  }: {
    order: any;
    onViewInvoice: (order: any) => void;
    onOpenOrder: (id: number) => void;
    colors: any;
    isDark: boolean;
  }) => {
    const method = String(order?.payment_method || 'COD').toUpperCase();
    const isCompleted = order?.status === 'COMPLETED';
    const isReady = order?.status === 'READY';
    const isPreparing = order?.status === 'PREPARING';
    const isRejected = order?.status === 'REJECTED';
    const isDelivery = order?.order_type === 'DELIVERY';

    const { date, time } = formatOrderDateTime(order?.created_at);
    const invoiceNum = formatInvoiceNumber(order);

    const handleCopyUtr = async (utr: string) => {
      await Clipboard.setStringAsync(utr);
      showAlert('Copied', `UTR reference "${utr}" copied to clipboard.`);
    };

    return (
      <View
        style={[
          styles.invoiceCard,
          {
            backgroundColor: colors.card,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
          },
        ]}
      >
        {/* Top Header Row: Invoice ID, Order Type Pill & Date/Time */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.invoiceIdBadge}>
              <Ionicons name="document-text" size={13} color="#6366f1" />
              <Text style={styles.invoiceIdText}>#{order?.id}</Text>
            </View>

            <View
              style={[
                styles.orderTypePill,
                {
                  backgroundColor: isDelivery
                    ? isDark
                      ? 'rgba(99, 102, 241, 0.15)'
                      : '#e0e7ff'
                    : isDark
                      ? 'rgba(16, 185, 129, 0.15)'
                      : '#ecfdf5',
                },
              ]}
            >
              <Text
                style={[
                  styles.orderTypeText,
                  { color: isDelivery ? '#6366f1' : '#10b981' },
                ]}
              >
                {isDelivery ? 'HOME DELIVERY' : 'STORE PICKUP'}
              </Text>
            </View>

            {order?.delivery_slot_label ? (
              <Text style={[styles.slotLabelText, { color: colors.textMuted }]} numberOfLines={1}>
                • {order.delivery_slot_label}
              </Text>
            ) : null}
          </View>

          <View style={styles.cardHeaderRight}>
            <Text style={[styles.dateText, { color: colors.text }]}>{date}</Text>
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={11} color={colors.textMuted} />
              <Text style={[styles.timeText, { color: colors.textMuted }]}>{time}</Text>
            </View>
          </View>
        </View>

        {/* Middle Row: Customer Info & Status Badges */}
        <View style={styles.cardBodyRow}>
          <View style={styles.customerCol}>
            <Text style={[styles.customerName, { color: colors.text }]} numberOfLines={1}>
              {order?.customer_name || `Customer #${order?.customer ?? '—'}`}
            </Text>
            {order?.customer_phone ? (
              <View style={styles.customerMetaRow}>
                <Ionicons name="call-outline" size={11} color={colors.textMuted} />
                <Text style={[styles.customerPhone, { color: colors.textMuted }]}>
                  {order.customer_phone}
                </Text>
              </View>
            ) : null}
            {order?.delivery_pincode ? (
              <Text style={[styles.pincodeText, { color: colors.textMuted }]}>
                PIN: {order.delivery_pincode}
              </Text>
            ) : null}
          </View>

          <View style={styles.badgesCol}>
            {/* Payment Method Badge */}
            <View style={styles.paymentBadgeRow}>
              {method === 'UPI' ? (
                <View
                  style={[
                    styles.methodBadge,
                    {
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
                      borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#a7f3d0',
                    },
                  ]}
                >
                  <Ionicons name="card-outline" size={11} color="#10b981" />
                  <Text style={[styles.methodBadgeText, { color: '#10b981' }]}>UPI</Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.methodBadge,
                    {
                      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
                      borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : '#fde68a',
                    },
                  ]}
                >
                  <Ionicons name="cash-outline" size={11} color="#f59e0b" />
                  <Text style={[styles.methodBadgeText, { color: '#f59e0b' }]}>COD</Text>
                </View>
              )}

              {/* Order Status Badge */}
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isCompleted
                      ? isDark
                        ? 'rgba(16, 185, 129, 0.18)'
                        : '#ecfdf5'
                      : isReady
                        ? isDark
                          ? 'rgba(59, 130, 246, 0.18)'
                          : '#eff6ff'
                        : isPreparing
                          ? isDark
                            ? 'rgba(245, 158, 11, 0.18)'
                            : '#fffbeb'
                          : isRejected
                            ? isDark
                              ? 'rgba(244, 63, 94, 0.18)'
                              : '#fff1f2'
                            : isDark
                              ? 'rgba(99, 102, 241, 0.18)'
                              : '#e0e7ff',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color: isCompleted
                        ? '#10b981'
                        : isReady
                          ? '#3b82f6'
                          : isPreparing
                            ? '#f59e0b'
                            : isRejected
                              ? '#f43f5e'
                              : '#6366f1',
                    },
                  ]}
                >
                  {order?.status || 'NEW'}
                </Text>
              </View>
            </View>

            {/* Clickable UTR Copy Pill */}
            {order?.upi_transaction_id ? (
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.utrCopyBtn}
                onPress={() => handleCopyUtr(order.upi_transaction_id)}
              >
                <Text style={styles.utrText}>
                  UTR: {order.upi_transaction_id.slice(0, 8)}...
                </Text>
                <Ionicons name="copy-outline" size={10} color="#6366f1" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Bottom Amount & Actions Row */}
        <View style={[styles.cardFooterRow, { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9' }]}>
          <View style={styles.amountCol}>
            <Text style={[styles.amountText, { color: colors.text }]}>
              ₹{parseFloat(order?.total_amount || 0).toFixed(2)}
            </Text>
            {parseFloat(order?.wallet_discount || 0) > 0 ? (
              <Text style={styles.walletDiscountText}>
                -₹{parseFloat(order.wallet_discount).toFixed(2)} wallet
              </Text>
            ) : null}
          </View>

          <View style={styles.actionBtnsGroup}>
            {/* Print / View Tax Invoice Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.printActionBtn}
              onPress={() => onViewInvoice(order)}
            >
              <Ionicons name="print-outline" size={14} color="#6366f1" />
              <Text style={styles.printActionBtnText}>Tax Invoice</Text>
            </TouchableOpacity>

            {/* Order Details Navigation Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.orderNavBtn,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
                },
              ]}
              onPress={() => order?.id && onOpenOrder(order.id)}
            >
              <Text style={[styles.orderNavBtnText, { color: colors.text }]}>Order</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }
);

export default function InvoicesScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  const [orders, setOrders] = useState<any[]>([]);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'UPI' | 'COD'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'ACTIVE'>('ALL');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected Invoice Preview Modal
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const fetchInvoices = useCallback(async (isPoll = false) => {
    if (!isPoll) setErrorMsg(null);
    try {
      const [ordersRes, settingsRes] = await Promise.allSettled([
        (api as ApiInstance).cachedGet('/orders/', { forceRefresh: true }),
        api.get('/store/settings/'),
      ]);

      if (ordersRes.status === 'fulfilled' && ordersRes.value?.data) {
        const raw = ordersRes.value.data?.results ?? ordersRes.value.data;
        setOrders(Array.isArray(raw) ? raw : []);
      }
      if (settingsRes.status === 'fulfilled' && settingsRes.value?.data) {
        setStoreSettings(settingsRes.value.data);
      }
    } catch (e: any) {
      if (!isPoll && e?.response?.status !== 401) {
        setErrorMsg(getErrorMessage(e, 'Failed to load store invoices.'));
      }
    } finally {
      if (!isPoll) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
    const interval = setInterval(() => fetchInvoices(true), 12000);
    return () => clearInterval(interval);
  }, [fetchInvoices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInvoices();
  }, [fetchInvoices]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    const q = searchTerm.trim().toLowerCase();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return safeOrders.filter((order) => {
      if (!order) return false;

      // 1. Search Query
      if (q) {
        const idMatch = String(order.id || '').toLowerCase().includes(q);
        const nameMatch = String(order.customer_name || '').toLowerCase().includes(q);
        const addrMatch = String(order.delivery_address || '').toLowerCase().includes(q);
        const upiMatch = String(order.upi_transaction_id || '').toLowerCase().includes(q);
        if (!idMatch && !nameMatch && !addrMatch && !upiMatch) return false;
      }

      // 2. Date Filter
      if (dateFilter !== 'ALL' && order.created_at) {
        const orderDate = new Date(order.created_at);
        if (dateFilter === 'TODAY' && orderDate < startOfToday) return false;
        if (dateFilter === 'WEEK' && orderDate < startOfWeek) return false;
        if (dateFilter === 'MONTH' && orderDate < startOfMonth) return false;
      }

      // 3. Payment Filter
      if (paymentFilter !== 'ALL') {
        const method = String(order.payment_method || 'COD').toUpperCase();
        if (paymentFilter !== method) return false;
      }

      // 4. Status Filter
      if (statusFilter === 'COMPLETED' && order.status !== 'COMPLETED') return false;
      if (
        statusFilter === 'ACTIVE' &&
        (order.status === 'COMPLETED' || order.status === 'REJECTED')
      ) {
        return false;
      }

      return true;
    });
  }, [orders, searchTerm, dateFilter, paymentFilter, statusFilter]);

  // 4 Financial Metrics
  const metrics = useMemo(() => {
    let totalBilled = 0;
    let upiTotal = 0;
    let codTotal = 0;
    let completedCount = 0;

    filteredOrders.forEach((o) => {
      const amt = parseFloat(o.total_amount) || 0;
      totalBilled += amt;
      const m = String(o.payment_method || 'COD').toUpperCase();
      if (m === 'UPI') upiTotal += amt;
      else codTotal += amt;
      if (o.status === 'COMPLETED') completedCount += 1;
    });

    return {
      totalBilled: totalBilled.toFixed(2),
      upiTotal: upiTotal.toFixed(2),
      codTotal: codTotal.toFixed(2),
      completedCount,
      totalInvoices: filteredOrders.length,
    };
  }, [filteredOrders]);

  // Export CSV
  const handleExportCSV = useCallback(async () => {
    if (filteredOrders.length === 0) {
      showAlert('Export Invoices', 'No invoices match the current filter.');
      return;
    }

    const headers = [
      'Invoice / Order ID',
      'Date',
      'Customer',
      'Payment Method',
      'UTR Ref',
      'Status',
      'Total Amount (Rs.)',
    ];
    const rows = filteredOrders.map((o) => [
      `#${o.id}`,
      new Date(o.created_at).toLocaleString('en-IN'),
      o.customer_name || `Customer #${o.customer}`,
      o.payment_method || 'COD',
      o.upi_transaction_id || '-',
      o.status,
      o.total_amount,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `narendra_kirana_invoices_${Date.now()}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showAlert('Exported', 'Invoices summary CSV exported successfully!');
    } else {
      try {
        await Share.share({
          title: 'Invoices Report',
          message: csvContent,
        });
      } catch {
        await Clipboard.setStringAsync(csvContent);
        showAlert('Exported', 'Invoices CSV copied to clipboard.');
      }
    }
  }, [filteredOrders]);

  // Build 1:1 Matching Official A4 Tax Invoice HTML for PDF / Print
  const buildOfficialInvoiceHtml = useCallback(
    (inv: any) => {
      const items = inv.items || [];
      const storeName = storeSettings?.store_name || 'Narendra Kirana Store';
      const storeAddr = storeSettings?.store_address || '';
      const storePhone = storeSettings?.store_phone || '';
      const storeEmail = storeSettings?.store_email || '';
      const gstin = storeSettings?.gstin || '';
      const fssai = storeSettings?.fssai_license_number || '';
      const signatureImg = storeSettings?.invoice_signature || '';
      const terms =
        storeSettings?.invoice_terms_and_conditions ||
        storeSettings?.terms_and_conditions ||
        '1. Goods once sold will not be taken back without original bill.\n2. Report any damaged or missing items within 24 hours of delivery.\n3. This is a computer-generated tax invoice and requires no physical signature.';

      const orderDateObj = new Date(inv.created_at);
      const isOrderDateValid = !isNaN(orderDateObj.getTime());
      const orderDate = isOrderDateValid
        ? orderDateObj.toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
        : 'N/A';

      const invoiceDate = new Date().toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const orderYear = isOrderDateValid ? orderDateObj.getFullYear() : new Date().getFullYear();
      const invoiceNumber = `INV-${orderYear}-${String(inv.id).padStart(5, '0')}`;
      const methodText = getPaymentMethodDisplay(inv);

      const itemsHtml = items
        .map((i: any, idx: number) => {
          const qty = Number(i.quantity || 1);
          const price = parseFloat(i.price_snapshot) || 0;
          const lineTotal = parseFloat(i.subtotal) || price * qty;
          const isRejected = i.status === 'REJECTED' || i.is_rejected;
          return `<tr class="${isRejected ? 'rejected' : ''}">
            <td style="text-align:center;color:${isRejected ? '#94a3b8' : '#64748b'};">${idx + 1}</td>
            <td>
              <div style="font-weight:700;color:${isRejected ? '#94a3b8;text-decoration:line-through;' : '#0f172a;'}">${i.product_name_snapshot || 'Item'}</div>
              ${i.unit_snapshot ? `<div style="font-size:10px;color:#64748b;">${i.unit_snapshot}</div>` : ''}
              ${isRejected ? `<span style="font-size:8px;font-weight:800;color:#e11d48;background:#ffe4e6;padding:1px 4px;border-radius:3px;">UNAVAILABLE</span>` : ''}
            </td>
            <td style="text-align:center;">${qty}</td>
            <td style="text-align:right;">₹${price.toFixed(2)}</td>
            <td style="text-align:right;font-weight:700;">${isRejected ? '₹0.00' : `₹${lineTotal.toFixed(2)}`}</td>
          </tr>`;
        })
        .join('');

      const termsHtml = terms
        .split('\n')
        .map((l: string) => l.trim())
        .filter(Boolean)
        .map((l: string) => `<p style="margin:2px 0;color:#475569;">${l}</p>`)
        .join('');

      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tax Invoice ${invoiceNumber}</title>
  <style>
    @media print {
      @page { size: A4 portrait; margin: 10mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background: #f8fafc; padding: 20px; font-size: 11px; }
    .paper { max-width: 800px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); position: relative; }
    .cancelled-stamp { position: absolute; top: 35%; left: 50%; transform: translate(-50%, -50%) rotate(-15deg); border: 6px solid #e11d48; color: #e11d48; font-size: 54px; font-weight: 900; letter-spacing: 6px; padding: 10px 30px; border-radius: 12px; opacity: 0.25; pointer-events: none; }
    .hdr { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 14px; gap: 16px; }
    .store-info h1 { font-size: 19px; font-weight: 900; color: #0f172a; line-height: 1.2; }
    .store-info .tag { font-size: 9.5px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
    .store-info p { font-size: 10.5px; color:#475569; margin-top: 3px; line-height: 1.4; }
    .meta-box { text-align: right; }
    .meta-box h2 { font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
    .meta-box .orig { display: inline-block; font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #065f46; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 2px 6px; border-radius: 4px; margin-top: 2px; }
    .meta-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-top: 6px; text-align: right; }
    .meta-row { display: flex; justify-content: flex-end; gap: 8px; margin: 2px 0; font-size: 10.5px; }
    .meta-lbl { color: #64748b; }
    .meta-val { font-weight: 700; color: #0f172a; font-family: monospace; }
    .compliance { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; }
    .compliance b { color: #334155; }
    .grid { display: flex; gap: 12px; margin-bottom: 14px; }
    .grid-col { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; background: #ffffff; }
    .grid-hdr { font-size: 9px; font-weight: 900; text-transform: uppercase; color: #94a3b8; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 6px; letter-spacing: 0.5px; }
    .grid-name { font-size: 12px; font-weight: 800; color: #0f172a; }
    .grid-row { display: flex; justify-content: space-between; font-size: 10px; margin: 2px 0; color: #475569; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    th { background: #f1f5f9; color: #475569; font-size: 9.5px; font-weight: 800; text-transform: uppercase; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-size: 10.5px; color: #1e293b; }
    .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 16px; }
    .totals-box { width: 280px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff; }
    .tot-row { display: flex; justify-content: space-between; padding: 5px 10px; font-size: 10.5px; color: #475569; }
    .tot-grand { background: #ecfdf5; border-top: 2px solid #10b981; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; color: #065f46; font-size: 11px; font-weight: 800; }
    .tot-grand .big { font-size: 16px; font-weight: 900; color: #047857; }
    .ftr { border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 10px; }
    .ftr-terms { max-width: 420px; color: #64748b; }
    .ftr-sig { text-align: right; }
    .sig-img { max-height: 44px; object-fit: contain; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="paper">
    ${inv.status === 'REJECTED' ? '<div class="cancelled-stamp">CANCELLED</div>' : ''}
    <div class="hdr">
      <div class="store-info">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
          <img src="/logo.jpg" alt="Store Logo" style="width:40px;height:40px;object-fit:contain;border-radius:8px;border:1px solid #e2e8f0;" onerror="this.style.display='none';" />
          <div>
            <h1>${storeName}</h1>
            <div class="tag">Grocery & Daily Essentials</div>
          </div>
        </div>
        ${storeAddr ? `<p>📍 ${storeAddr}</p>` : ''}
        ${storePhone || storeEmail ? `<p>📞 ${[storePhone, storeEmail].filter(Boolean).join(' • ')}</p>` : ''}
      </div>
      <div class="meta-box">
        <h2>TAX INVOICE</h2>
        <div class="orig">Original for Recipient</div>
        <div class="meta-card">
          <div class="meta-row"><span class="meta-lbl">Invoice No:</span><span class="meta-val">${invoiceNumber}</span></div>
          <div class="meta-row"><span class="meta-lbl">Invoice Date:</span><span>${invoiceDate}</span></div>
          <div class="meta-row"><span class="meta-lbl">Order Ref:</span><span class="meta-val">#${inv.id}</span></div>
          <div class="meta-row"><span class="meta-lbl">Order Date:</span><span>${orderDate}</span></div>
        </div>
      </div>
    </div>

    ${
      gstin || fssai
        ? `<div class="compliance">
        ${gstin ? `<div><b>GSTIN:</b> <span style="font-family:monospace;font-weight:700;">${gstin}</span></div>` : ''}
        ${fssai ? `<div><b>FSSAI Lic. No:</b> <span style="font-family:monospace;font-weight:700;">${fssai}</span> <span style="background:#d1fae5;color:#065f46;font-size:8px;font-weight:800;padding:1px 4px;border-radius:3px;">Govt Reg.</span></div>` : ''}
        <div style="color:#64748b;">Place of Supply: <b>State Code (09)</b></div>
      </div>`
        : ''
    }

    <div class="grid">
      <div class="grid-col">
        <div class="grid-hdr">Billed / Shipped To</div>
        <div class="grid-name">${inv.customer_name || `Customer #${inv.customer ?? '—'}`}</div>
        ${inv.customer_phone ? `<div class="grid-row"><span>Phone:</span><b>${inv.customer_phone}</b></div>` : ''}
        <div class="grid-row">
          <span>Address:</span>
          <b>${inv.order_type === 'DELIVERY' ? inv.delivery_address || 'Home Delivery' : 'Store Counter Pickup'}</b>
        </div>
        ${inv.delivery_pincode ? `<div class="grid-row"><span>PIN Code:</span><b>${inv.delivery_pincode}</b></div>` : ''}
      </div>

      <div class="grid-col">
        <div class="grid-hdr">Fulfillment Details</div>
        <div class="grid-row"><span>Mode:</span><b>${inv.order_type === 'DELIVERY' ? 'Home Delivery' : 'Store Pickup'}</b></div>
        ${inv.delivery_slot_label ? `<div class="grid-row"><span>Slot:</span><b style="color:#4f46e5;">${inv.delivery_slot_date || ''} (${inv.delivery_slot_label})</b></div>` : ''}
        <div class="grid-row"><span>Order Status:</span><b style="color:${inv.status === 'COMPLETED' ? '#059669' : inv.status === 'REJECTED' ? '#e11d48' : '#334155'};">${inv.status}</b></div>
        <div class="grid-row"><span>Payment Status:</span><b style="color:#059669;">${inv.status === 'COMPLETED' ? 'PAID' : inv.status === 'REJECTED' ? 'CANCELLED' : 'DUE AT DELIVERY'}</b></div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:5%;text-align:center;">#</th>
          <th style="width:55%;">Item Description</th>
          <th style="width:12%;text-align:center;">Qty</th>
          <th style="width:14%;text-align:right;">Rate (₹)</th>
          <th style="width:14%;text-align:right;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="totals-wrap">
      <div class="totals-box">
        <div class="tot-row">
          <span>Subtotal (${items.filter((i: any) => i.status !== 'REJECTED').length} items)</span>
          <b>₹${items.filter((i: any) => i.status !== 'REJECTED').reduce((acc: number, item: any) => acc + (parseFloat(item.subtotal) || 0), 0).toFixed(2)}</b>
        </div>
        ${parseFloat(inv.discount_applied || '0') > 0 ? `<div class="tot-row" style="color:#4f46e5;"><span>Product Savings</span><b>-₹${parseFloat(inv.discount_applied).toFixed(2)}</b></div>` : ''}
        ${parseFloat(inv.promo_discount || '0') > 0 ? `<div class="tot-row" style="color:#059669;"><span>Promo Code Discount</span><b>-₹${parseFloat(inv.promo_discount).toFixed(2)}</b></div>` : ''}
        ${parseFloat(inv.packaging_fee || '0') > 0 ? `<div class="tot-row"><span>Packaging Charges</span><b>₹${parseFloat(inv.packaging_fee).toFixed(2)}</b></div>` : ''}
        ${inv.order_type === 'DELIVERY' ? `<div class="tot-row"><span>Delivery Charges</span><b>${parseFloat(inv.delivery_fee || '0') > 0 ? `₹${parseFloat(inv.delivery_fee).toFixed(2)}` : 'FREE'}</b></div>` : ''}
        ${parseFloat(inv.wallet_discount || '0') > 0 ? `<div class="tot-row" style="color:#059669;font-weight:700;"><span>Wallet Applied</span><b>-₹${parseFloat(inv.wallet_discount).toFixed(2)}</b></div>` : ''}
        <div class="tot-row" style="border-top:1px solid #f1f5f9;padding-top:6px;">
          <span>Payment Mode</span>
          <b style="text-align:right;">${methodText}</b>
        </div>
        <div class="tot-grand">
          <span>${inv.status === 'COMPLETED' ? 'TOTAL AMOUNT PAID' : 'TOTAL AMOUNT DUE'}</span>
          <span class="big">₹${parseFloat(inv.total_amount).toFixed(2)}</span>
        </div>
      </div>
    </div>

    <div class="ftr">
      <div class="ftr-terms">
        <div style="font-weight:900;text-transform:uppercase;margin-bottom:3px;color:#334155;">Terms & Conditions</div>
        ${termsHtml}
        <div style="margin-top:4px;font-weight:700;color:#047857;">Thank you for shopping with ${storeName}!</div>
      </div>
      <div class="ftr-sig">
        <div style="font-weight:700;color:#64748b;margin-bottom:2px;">For ${storeName}</div>
        ${signatureImg ? `<img src="${signatureImg}" class="sig-img" alt="Authorized Signature" />` : '<div style="width:140px;border-bottom:1px dashed #94a3b8;margin:18px 0 4px auto;"></div>'}
        <div style="font-weight:900;color:#0f172a;">Authorized Signatory</div>
        <div style="font-size:8px;color:#94a3b8;text-transform:uppercase;">Computer Generated Invoice</div>
      </div>
    </div>
  </div>
</body>
</html>`;
    },
    [storeSettings]
  );

  // Print / PDF Handler
  const handlePrintPdf = useCallback(
    async (inv: any) => {
      try {
        let html: string = '';
        try {
          const res = await api.get(`/orders/${inv.id}/invoice/`);
          if (res.data?.html) {
            html = res.data.html;
          }
        } catch {
          // Fallback to local builder if offline or API error
        }
        if (!html) {
          html = buildOfficialInvoiceHtml(inv);
        }

        if (Platform.OS === 'web') {
          const frameId = 'sk-inv-print-frame';
          let frame = document.getElementById(frameId) as HTMLIFrameElement | null;
          if (frame) frame.remove();
          frame = document.createElement('iframe');
          frame.id = frameId;
          Object.assign(frame.style, {
            position: 'fixed',
            top: '-10000px',
            left: '-10000px',
            width: '800px',
            height: '1100px',
          });
          document.body.appendChild(frame);
          const d = frame.contentDocument || frame.contentWindow?.document;
          if (d) {
            d.open();
            d.write(html);
            d.close();
          }
          setTimeout(() => {
            frame?.contentWindow?.focus();
            frame?.contentWindow?.print();
            setTimeout(() => frame?.remove(), 2500);
          }, 500);
          return;
        }

        const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Tax Invoice INV-${inv.id}`,
          });
        } else {
          showAlert('PDF Generated', `Invoice PDF saved at:\n${uri}`);
        }
      } catch (err: any) {
        showAlert('Print Error', getErrorMessage(err, 'Failed to generate invoice PDF.'));
      }
    },
    [buildOfficialInvoiceHtml]
  );

  // Share Text / WhatsApp
  const handleShareText = useCallback(
    async (inv: any) => {
      const itemsSummary = (inv.items || [])
        .map(
          (i: any) =>
            `• ${i.product_name_snapshot} (${i.unit_snapshot || ''}) x${i.quantity} = ₹${i.subtotal || i.price_snapshot}`
        )
        .join('\n');
      const msg = `🧾 *TAX INVOICE - ${storeSettings?.store_name || 'Narendra Kirana Store'}*\nInvoice #: INV-${inv.id}\nDate: ${inv.created_at ? new Date(inv.created_at).toLocaleString() : ''}\nCustomer: ${inv.customer_name || 'Customer'}\nPayment: ${inv.payment_method || 'COD'} (${inv.status})\n\n*ITEMS:*\n${itemsSummary}\n\n*TOTAL AMOUNT:* ₹${inv.total_amount}\n\nThank you for shopping with us!`;

      try {
        await Share.share({ message: msg });
      } catch {
        await Clipboard.setStringAsync(msg);
        showAlert('Copied', 'Invoice text copied to clipboard.');
      }
    },
    [storeSettings]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* ─── Screen Header ─── */}
      <ScreenHeader
        title="Billing & Invoices"
        subtitle="Search, review, print, and export official GST customer tax invoices."
        rightAction={
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.headerBrandingBtn,
                {
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
                },
              ]}
              onPress={() => router.push('/(tabs)/more/store' as any)}
            >
              <Ionicons name="options-outline" size={14} color="#6366f1" />
              <Text style={[styles.headerBrandingBtnText, { color: colors.text }]}>
                Branding
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.headerExportBtn}
              onPress={handleExportCSV}
            >
              <Ionicons name="download-outline" size={14} color="#ffffff" />
              <Text style={styles.headerExportBtnText}>Export CSV</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.mainScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
      >
        <View style={styles.maxContainer}>
          {/* ─── 2. Financial Metrics Grid (4 Cards Exactly Like Web App) ─── */}
          <View style={styles.metricsGrid}>
            {/* Total Invoiced Value */}
            <View
              style={[
                styles.metricCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                },
              ]}
            >
              <View style={styles.metricCardHead}>
                <Text style={styles.metricCardLabel}>TOTAL INVOICED VALUE</Text>
                <Ionicons name="document-text" size={16} color="#6366f1" />
              </View>
              <Text style={[styles.metricCardVal, { color: colors.text }]}>
                ₹{metrics.totalBilled}
              </Text>
              <Text style={[styles.metricCardSub, { color: colors.textMuted }]}>
                Across {metrics.totalInvoices} invoices
              </Text>
            </View>

            {/* Settled via UPI */}
            <View
              style={[
                styles.metricCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                },
              ]}
            >
              <View style={styles.metricCardHead}>
                <Text style={styles.metricCardLabel}>SETTLED VIA UPI</Text>
                <Ionicons name="card" size={16} color="#10b981" />
              </View>
              <Text style={[styles.metricCardVal, { color: '#10b981' }]}>
                ₹{metrics.upiTotal}
              </Text>
              <Text style={[styles.metricCardSub, { color: colors.textMuted }]}>
                Instant digital receipts
              </Text>
            </View>

            {/* Cash on Delivery (COD) */}
            <View
              style={[
                styles.metricCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                },
              ]}
            >
              <View style={styles.metricCardHead}>
                <Text style={styles.metricCardLabel}>CASH ON DELIVERY (COD)</Text>
                <Ionicons name="cash" size={16} color="#f59e0b" />
              </View>
              <Text style={[styles.metricCardVal, { color: '#f59e0b' }]}>
                ₹{metrics.codTotal}
              </Text>
              <Text style={[styles.metricCardSub, { color: colors.textMuted }]}>
                Collected at counter/door
              </Text>
            </View>

            {/* Completed Orders */}
            <View
              style={[
                styles.metricCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                },
              ]}
            >
              <View style={styles.metricCardHead}>
                <Text style={styles.metricCardLabel}>COMPLETED ORDERS</Text>
                <Ionicons name="checkmark-circle" size={16} color="#3b82f6" />
              </View>
              <Text style={[styles.metricCardVal, { color: '#3b82f6' }]}>
                {metrics.completedCount} / {metrics.totalInvoices}
              </Text>
              <Text style={[styles.metricCardSub, { color: colors.textMuted }]}>
                Fully fulfilled & invoiced
              </Text>
            </View>
          </View>

          {/* ─── 3. Filter & Search Hub ─── */}
          <View
            style={[
              styles.filterCard,
              {
                backgroundColor: colors.card,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
              },
            ]}
          >
            {/* Search Input Bar */}
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: colors.cardAlt,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0',
                },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search by Order ID, Customer, UTR..."
                placeholderTextColor={colors.textMuted}
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              {searchTerm ? (
                <TouchableOpacity onPress={() => setSearchTerm('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Date Range Selector Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsRow}
            >
              {(
                [
                  { key: 'ALL', label: 'All Time' },
                  { key: 'TODAY', label: 'Today' },
                  { key: 'WEEK', label: '7 Days' },
                  { key: 'MONTH', label: 'This Month' },
                ] as const
              ).map((d) => (
                <TouchableOpacity
                  key={d.key}
                  style={[
                    styles.datePill,
                    {
                      backgroundColor:
                        dateFilter === d.key
                          ? isDark
                            ? '#334155'
                            : '#ffffff'
                          : colors.cardAlt,
                      borderColor:
                        dateFilter === d.key
                          ? '#6366f1'
                          : isDark
                            ? 'rgba(255, 255, 255, 0.06)'
                            : '#e2e8f0',
                    },
                  ]}
                  onPress={() => setDateFilter(d.key)}
                >
                  <Text
                    style={[
                      styles.datePillText,
                      {
                        color: dateFilter === d.key ? '#6366f1' : colors.textMuted,
                        fontWeight: dateFilter === d.key ? '800' : '600',
                      },
                    ]}
                  >
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Payment & Status Filter Pills */}
            <View style={styles.pillDropdownsRow}>
              {/* Payment Filter */}
              <View style={styles.subPillsGroup}>
                {(['ALL', 'UPI', 'COD'] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.subPill,
                      {
                        backgroundColor:
                          paymentFilter === m
                            ? isDark
                              ? '#334155'
                              : '#ffffff'
                            : colors.cardAlt,
                        borderColor:
                          paymentFilter === m
                            ? '#6366f1'
                            : isDark
                              ? 'rgba(255, 255, 255, 0.06)'
                              : '#e2e8f0',
                      },
                    ]}
                    onPress={() => setPaymentFilter(m)}
                  >
                    <Text
                      style={[
                        styles.subPillText,
                        {
                          color: paymentFilter === m ? '#6366f1' : colors.textMuted,
                          fontWeight: paymentFilter === m ? '800' : '600',
                        },
                      ]}
                    >
                      {m === 'ALL' ? 'All Pay' : m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.subPillDivider} />

              {/* Status Filter */}
              <View style={styles.subPillsGroup}>
                {(['ALL', 'COMPLETED', 'ACTIVE'] as const).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.subPill,
                      {
                        backgroundColor:
                          statusFilter === s
                            ? isDark
                              ? '#334155'
                              : '#ffffff'
                            : colors.cardAlt,
                        borderColor:
                          statusFilter === s
                            ? '#6366f1'
                            : isDark
                              ? 'rgba(255, 255, 255, 0.06)'
                              : '#e2e8f0',
                      },
                    ]}
                    onPress={() => setStatusFilter(s)}
                  >
                    <Text
                      style={[
                        styles.subPillText,
                        {
                          color: statusFilter === s ? '#6366f1' : colors.textMuted,
                          fontWeight: statusFilter === s ? '800' : '600',
                        },
                      ]}
                    >
                      {s === 'ALL' ? 'All Status' : s === 'COMPLETED' ? 'Done' : 'Active'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Refresh Button */}
              <TouchableOpacity
                style={[
                  styles.refreshIconBtn,
                  {
                    backgroundColor: colors.cardAlt,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0',
                  },
                ]}
                onPress={() => fetchInvoices()}
              >
                <Ionicons
                  name="refresh"
                  size={14}
                  color={colors.textMuted}
                  style={refreshing ? { transform: [{ rotate: '45deg' }] } : undefined}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Error Banner */}
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#ef4444" />
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* ─── 4. Invoices List ─── */}
          {loading && !refreshing ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                Loading store invoices...
              </Text>
            </View>
          ) : filteredOrders.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                },
              ]}
            >
              <Ionicons name="document-text-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No invoices matching filters
              </Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Try clearing your search query or changing date range filters.
              </Text>
            </View>
          ) : (
            <View style={styles.invoicesListCol}>
              {filteredOrders.map((order) => (
                <InvoiceCard
                  key={order.id}
                  order={order}
                  onViewInvoice={(inv) => setSelectedInvoice(inv)}
                  onOpenOrder={(id) => router.push(`/(tabs)/orders/${id}` as any)}
                  colors={colors}
                  isDark={isDark}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ─── 5. Official Tax Invoice Modal (Matches Web App Invoice.jsx & InvoiceModal.jsx) ─── */}
      <Modal
        visible={Boolean(selectedInvoice)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedInvoice(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: '#f1f5f9' }]}>
            {/* Modal Header */}
            <View style={styles.modalHeaderBar}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconBadge}>
                  <Ionicons name="document-text" size={16} color="#10b981" />
                </View>
                <View>
                  <View style={styles.modalTitleRow}>
                    <Text style={styles.modalTitleText}>Tax Invoice</Text>
                    <View style={styles.modalOrderIdPill}>
                      <Text style={styles.modalOrderIdText}>#{selectedInvoice?.id}</Text>
                    </View>
                  </View>
                  <Text style={styles.modalSubText}>
                    Print preview & official invoice document
                  </Text>
                </View>
              </View>

              {/* Header Action Buttons */}
              <View style={styles.modalHeaderActions}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.modalPrintBtn}
                  onPress={() => selectedInvoice && handlePrintPdf(selectedInvoice)}
                >
                  <Ionicons name="print" size={14} color="#ffffff" />
                  <Text style={styles.modalPrintBtnText}>Print / PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.modalShareBtn}
                  onPress={() => selectedInvoice && handleShareText(selectedInvoice)}
                >
                  <Ionicons name="share-social-outline" size={16} color="#1e293b" />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedInvoice(null)}
                >
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Document Scroll Content */}
            <ScrollView
              style={styles.docScroll}
              contentContainerStyle={styles.docScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {selectedInvoice && (() => {
                const orderDateFormatted = formatFullDateTime(selectedInvoice.created_at);
                const invoiceDateFormatted = formatFullDateTime(new Date());
                const invoiceNumber = formatInvoiceNumber(selectedInvoice);
                const isRejected = selectedInvoice.status === 'REJECTED';
                const isCompleted = selectedInvoice.status === 'COMPLETED';
                const itemsList = selectedInvoice.items || [];
                const activeItems = itemsList.filter((i: any) => i.status !== 'REJECTED' && !i.is_rejected);
                const activeSubtotal = activeItems.reduce(
                  (acc: number, item: any) =>
                    acc + (parseFloat(item.subtotal) || (parseFloat(item.price_snapshot) || 0) * (Number(item.quantity) || 1)),
                  0
                );

                const rawTerms = storeSettings?.invoice_terms_and_conditions || storeSettings?.terms_and_conditions;
                const termsLines = rawTerms && rawTerms.trim()
                  ? rawTerms.split('\n').map((l: string) => l.trim()).filter(Boolean)
                  : [
                      '1. Goods once sold will not be taken back without original bill.',
                      '2. Report any damaged or missing items within 24 hours of delivery.',
                      '3. This is a computer-generated tax invoice and requires no physical signature.',
                    ];

                return (
                  <View style={styles.paperContainer}>
                    {/* Cancelled Stamp (if rejected) */}
                    {isRejected && (
                      <View style={styles.cancelledStampWrap}>
                        <View style={styles.cancelledStampBox}>
                          <Text style={styles.cancelledStampText}>CANCELLED</Text>
                        </View>
                      </View>
                    )}

                    <View style={[styles.docBody, isRejected && styles.docBodyRejected]}>
                      {/* Top Store Header & Document Meta */}
                      <View style={styles.docTopHeader}>
                        {/* Store Brand */}
                        <View style={styles.docStoreCol}>
                          <View style={styles.docStoreRow}>
                            <Image
                              source={
                                storeSettings?.store_logo
                                  ? { uri: storeSettings.store_logo }
                                  : require('../../../../assets/images/narendra-logo.png')
                              }
                              style={styles.docLogoImg}
                              contentFit="contain"
                            />
                            <View style={styles.docStoreTitleCol}>
                              <Text style={styles.docStoreName}>
                                {storeSettings?.store_name || 'Narendra Kirana Store'}
                              </Text>
                              <Text style={styles.docStoreTag}>GROCERY & DAILY ESSENTIALS</Text>
                            </View>
                          </View>

                          <View style={styles.docContactWrap}>
                            {storeSettings?.store_address ? (
                              <View style={styles.docContactRow}>
                                <Ionicons name="location-outline" size={13} color="#94a3b8" style={{ marginTop: 1 }} />
                                <Text style={styles.docContactText}>{storeSettings.store_address}</Text>
                              </View>
                            ) : null}

                            {(storeSettings?.store_phone || storeSettings?.store_email) ? (
                              <View style={styles.docContactRow}>
                                {storeSettings?.store_phone ? (
                                  <View style={styles.docInlineMeta}>
                                    <Ionicons name="call-outline" size={12} color="#94a3b8" />
                                    <Text style={styles.docContactText}>{storeSettings.store_phone}</Text>
                                  </View>
                                ) : null}
                                {storeSettings?.store_phone && storeSettings?.store_email ? (
                                  <Text style={styles.docMetaDot}>•</Text>
                                ) : null}
                                {storeSettings?.store_email ? (
                                  <View style={styles.docInlineMeta}>
                                    <Ionicons name="mail-outline" size={12} color="#94a3b8" />
                                    <Text style={styles.docContactText}>{storeSettings.store_email}</Text>
                                  </View>
                                ) : null}
                              </View>
                            ) : null}
                          </View>
                        </View>

                        {/* Invoice Official Meta */}
                        <View style={styles.docMetaCol}>
                          <View style={styles.docMetaHeadingRow}>
                            <Text style={styles.docTaxInvoiceHeading}>TAX INVOICE</Text>
                            <View style={styles.docOriginalBadge}>
                              <Text style={styles.docOriginalBadgeText}>ORIGINAL FOR RECIPIENT</Text>
                            </View>
                          </View>

                          <View style={styles.docMetaCard}>
                            <View style={styles.docMetaRow}>
                              <Text style={styles.docMetaLabel}>Invoice No:</Text>
                              <Text style={styles.docMetaVal}>{invoiceNumber}</Text>
                            </View>
                            <View style={styles.docMetaRow}>
                              <Text style={styles.docMetaLabel}>Invoice Date:</Text>
                              <Text style={styles.docMetaValSimple}>{invoiceDateFormatted}</Text>
                            </View>
                            <View style={styles.docMetaRow}>
                              <Text style={styles.docMetaLabel}>Order Reference:</Text>
                              <Text style={styles.docMetaVal}>#{selectedInvoice.id}</Text>
                            </View>
                            <View style={styles.docMetaRow}>
                              <Text style={styles.docMetaLabel}>Order Date:</Text>
                              <Text style={styles.docMetaValSimple}>{orderDateFormatted}</Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* Compliance Strip (GSTIN & FSSAI) */}
                      {(storeSettings?.gstin || storeSettings?.fssai_license_number) && (
                        <View style={styles.complianceStrip}>
                          {storeSettings?.gstin ? (
                            <View style={styles.complianceItem}>
                              <Text style={styles.complianceLabel}>GSTIN:</Text>
                              <Text style={styles.complianceVal}>{storeSettings.gstin}</Text>
                            </View>
                          ) : null}
                          {storeSettings?.fssai_license_number ? (
                            <View style={styles.complianceItem}>
                              <Ionicons name="checkmark-circle" size={13} color="#059669" />
                              <Text style={styles.complianceLabel}>FSSAI Lic. No:</Text>
                              <Text style={styles.complianceVal}>{storeSettings.fssai_license_number}</Text>
                              <View style={styles.govtRegPill}>
                                <Text style={styles.govtRegText}>GOVT REG.</Text>
                              </View>
                            </View>
                          ) : null}
                          <Text style={styles.placeOfSupplyText}>
                            Place of Supply: <Text style={{ fontWeight: '800', color: '#1e293b' }}>State Code (09)</Text>
                          </Text>
                        </View>
                      )}

                      {/* Customer & Fulfillment Info Grid */}
                      <View style={styles.infoGridRow}>
                        {/* Billed / Shipped To */}
                        <View style={styles.infoGridCard}>
                          <Text style={styles.infoGridHeader}>BILLED / SHIPPED TO</Text>
                          <Text style={styles.infoGridName}>
                            {selectedInvoice.customer_name || `Customer ID: ${selectedInvoice.customer ?? '—'}`}
                          </Text>
                          {selectedInvoice.customer_phone ? (
                            <View style={styles.infoSubRow}>
                              <Ionicons name="call-outline" size={12} color="#94a3b8" />
                              <Text style={styles.infoSubText}>{selectedInvoice.customer_phone}</Text>
                            </View>
                          ) : null}
                          <View style={{ paddingTop: 3 }}>
                            <Text style={styles.infoAddressText}>
                              {selectedInvoice.order_type === 'DELIVERY'
                                ? selectedInvoice.delivery_address || 'Home Delivery Address'
                                : 'Store Counter Pickup'}
                            </Text>
                            {selectedInvoice.delivery_pincode ? (
                              <Text style={styles.infoPinText}>PIN: {selectedInvoice.delivery_pincode}</Text>
                            ) : null}
                          </View>
                        </View>

                        {/* Fulfillment Details */}
                        <View style={styles.infoGridCard}>
                          <Text style={styles.infoGridHeader}>FULFILLMENT DETAILS</Text>
                          <View style={styles.infoDetailLine}>
                            <Text style={styles.infoDetailLabel}>Fulfillment Mode:</Text>
                            <Text style={styles.infoDetailVal}>
                              {selectedInvoice.order_type === 'DELIVERY' ? 'Home Delivery' : 'Store Pickup'}
                            </Text>
                          </View>
                          {selectedInvoice.delivery_slot_label ? (
                            <View style={styles.infoDetailLine}>
                              <Text style={styles.infoDetailLabel}>Scheduled Slot:</Text>
                              <Text style={[styles.infoDetailVal, { color: '#4338ca', fontWeight: '800' }]}>
                                {selectedInvoice.delivery_slot_date ? `${selectedInvoice.delivery_slot_date} ` : ''}
                                ({selectedInvoice.delivery_slot_label})
                              </Text>
                            </View>
                          ) : selectedInvoice.pickup_time ? (
                            <View style={styles.infoDetailLine}>
                              <Text style={styles.infoDetailLabel}>Pickup Slot:</Text>
                              <Text style={styles.infoDetailVal}>{selectedInvoice.pickup_time}</Text>
                            </View>
                          ) : null}
                          <View style={styles.infoDetailLine}>
                            <Text style={styles.infoDetailLabel}>Order Status:</Text>
                            <Text
                              style={[
                                styles.infoDetailVal,
                                {
                                  color: isCompleted ? '#047857' : isRejected ? '#e11d48' : '#1e293b',
                                  fontWeight: '800',
                                },
                              ]}
                            >
                              {selectedInvoice.status}
                            </Text>
                          </View>
                          <View style={styles.infoDetailLine}>
                            <Text style={styles.infoDetailLabel}>Payment Status:</Text>
                            <Text
                              style={[
                                styles.infoDetailVal,
                                {
                                  color: isCompleted ? '#047857' : isRejected ? '#e11d48' : '#047857',
                                  fontWeight: '800',
                                },
                              ]}
                            >
                              {isCompleted ? 'PAID' : isRejected ? 'CANCELLED' : 'DUE AT DELIVERY'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Items Table */}
                      <View style={styles.itemsTableCard}>
                        <View style={styles.tableHeaderRow}>
                          <Text style={[styles.tableColHead, { width: 24, textAlign: 'center' }]}>#</Text>
                          <Text style={[styles.tableColHead, { flex: 1 }]}>ITEM DESCRIPTION</Text>
                          <Text style={[styles.tableColHead, { width: 34, textAlign: 'center' }]}>QTY</Text>
                          <Text style={[styles.tableColHead, { width: 58, textAlign: 'right' }]}>RATE (₹)</Text>
                          <Text style={[styles.tableColHead, { width: 68, textAlign: 'right' }]}>AMOUNT (₹)</Text>
                        </View>

                        {(selectedInvoice.items || []).map((item: any, idx: number) => {
                          const qty = Number(item.quantity || 1);
                          const price = parseFloat(item.price_snapshot) || 0;
                          const lineTotal = parseFloat(item.subtotal) || price * qty;
                          const isRej = item.status === 'REJECTED' || item.is_rejected;

                          return (
                            <View key={idx} style={[styles.tableBodyRow, isRej && styles.tableBodyRowRejected]}>
                              <Text style={[styles.tableCellNum, isRej && { color: '#94a3b8' }]}>
                                {idx + 1}
                              </Text>
                              <View style={{ flex: 1, paddingRight: 6 }}>
                                <View style={styles.tableItemTitleWrap}>
                                  <Text
                                    style={[
                                      styles.tableCellItemName,
                                      isRej && { textDecorationLine: 'line-through', color: '#94a3b8' },
                                    ]}
                                  >
                                    {item.product_name_snapshot || 'Item'}
                                  </Text>
                                  {isRej ? (
                                    <View style={styles.unavailableBadge}>
                                      <Text style={styles.unavailableBadgeText}>UNAVAILABLE</Text>
                                    </View>
                                  ) : null}
                                </View>
                                {item.unit_snapshot ? (
                                  <Text style={styles.tableCellItemUnit}>{item.unit_snapshot}</Text>
                                ) : null}
                              </View>
                              <Text style={[styles.tableCellQty, isRej && { color: '#94a3b8', textDecorationLine: 'line-through' }]}>
                                {qty}
                              </Text>
                              <Text style={[styles.tableCellRate, isRej && { color: '#94a3b8', textDecorationLine: 'line-through' }]}>
                                {price.toFixed(2)}
                              </Text>
                              <Text style={[styles.tableCellTotal, isRej && { color: '#94a3b8' }]}>
                                {isRej ? '0.00' : lineTotal.toFixed(2)}
                              </Text>
                            </View>
                          );
                        })}
                      </View>

                      {/* Cost Breakdown & Grand Total Box */}
                      <View style={styles.totalsSection}>
                        <View style={styles.totalsCard}>
                          <View style={styles.totalsBody}>
                            <View style={styles.totalLineRow}>
                              <Text style={styles.totalLineLabel}>
                                Subtotal ({activeItems.length} items)
                              </Text>
                              <Text style={styles.totalLineVal}>₹{activeSubtotal.toFixed(2)}</Text>
                            </View>

                            {parseFloat(selectedInvoice.discount_applied || '0') > 0 ? (
                              <View style={styles.totalLineRow}>
                                <Text style={[styles.totalLineLabel, { color: '#4f46e5' }]}>
                                  Product Savings
                                </Text>
                                <Text style={[styles.totalLineVal, { color: '#4f46e5', fontWeight: '800' }]}>
                                  -₹{parseFloat(selectedInvoice.discount_applied).toFixed(2)}
                                </Text>
                              </View>
                            ) : null}

                            {parseFloat(selectedInvoice.promo_discount || '0') > 0 ? (
                              <View style={styles.totalLineRow}>
                                <Text style={[styles.totalLineLabel, { color: '#059669' }]}>
                                  Promo Code Discount
                                </Text>
                                <Text style={[styles.totalLineVal, { color: '#059669', fontWeight: '800' }]}>
                                  -₹{parseFloat(selectedInvoice.promo_discount).toFixed(2)}
                                </Text>
                              </View>
                            ) : null}

                            {parseFloat(selectedInvoice.packaging_fee || '0') > 0 ? (
                              <View style={styles.totalLineRow}>
                                <Text style={styles.totalLineLabel}>Packaging Charges</Text>
                                <Text style={styles.totalLineVal}>
                                  ₹{parseFloat(selectedInvoice.packaging_fee).toFixed(2)}
                                </Text>
                              </View>
                            ) : null}

                            {selectedInvoice.order_type === 'DELIVERY' ? (
                              <View style={styles.totalLineRow}>
                                <Text style={styles.totalLineLabel}>Delivery Charges</Text>
                                <Text style={styles.totalLineVal}>
                                  {parseFloat(selectedInvoice.delivery_fee || '0') > 0
                                    ? `₹${parseFloat(selectedInvoice.delivery_fee).toFixed(2)}`
                                    : 'FREE'}
                                </Text>
                              </View>
                            ) : null}

                            {parseFloat(selectedInvoice.wallet_discount || '0') > 0 ? (
                              <View style={[styles.totalLineRow, styles.totalDividerTop]}>
                                <Text style={[styles.totalLineLabel, { color: '#047857', fontWeight: '800' }]}>
                                  Wallet Applied
                                </Text>
                                <Text style={[styles.totalLineVal, { color: '#047857', fontWeight: '800' }]}>
                                  -₹{parseFloat(selectedInvoice.wallet_discount).toFixed(2)}
                                </Text>
                              </View>
                            ) : null}

                            <View style={[styles.totalLineRow, styles.totalDividerTop]}>
                              <Text style={styles.totalLineLabel}>Payment Mode</Text>
                              <Text style={[styles.totalLineVal, { fontWeight: '700', textAlign: 'right', flex: 1, marginLeft: 12 }]}>
                                {getPaymentMethodDisplay(selectedInvoice)}
                              </Text>
                            </View>
                          </View>

                          {/* Total Amount Paid / Due Highlighted Emerald Banner */}
                          <View style={styles.grandTotalBanner}>
                            <Text style={styles.grandTotalLabel}>
                              {isCompleted ? 'TOTAL AMOUNT PAID' : 'TOTAL AMOUNT DUE'}
                            </Text>
                            <Text style={styles.grandTotalVal}>
                              ₹{parseFloat(selectedInvoice.total_amount).toFixed(2)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Footer: Terms & Conditions and Authorized Signatory */}
                      <View style={styles.docFooterRow}>
                        {/* Terms & Conditions */}
                        <View style={styles.termsCol}>
                          <View style={styles.termsHeadRow}>
                            <Ionicons name="checkmark-circle" size={13} color="#059669" />
                            <Text style={styles.termsHeadText}>TERMS & CONDITIONS</Text>
                          </View>
                          <View style={styles.termsList}>
                            {termsLines.map((line: string, idx: number) => (
                              <Text key={idx} style={styles.termsLineText}>{line}</Text>
                            ))}
                          </View>
                          <Text style={styles.termsGreeting}>
                            Thank you for shopping with {storeSettings?.store_name || 'Narendra Kirana'}!
                          </Text>
                        </View>

                        {/* Authorized Signatory */}
                        <View style={styles.signatureCol}>
                          <Text style={styles.sigStoreName}>
                            For {storeSettings?.store_name || 'Narendra Kirana Store'}
                          </Text>
                          <View style={styles.sigImageContainer}>
                            {storeSettings?.invoice_signature ? (
                              <Image
                                source={{ uri: storeSettings.invoice_signature }}
                                style={styles.sigImage}
                                contentFit="contain"
                              />
                            ) : (
                              <View style={styles.sigDashedLine} />
                            )}
                          </View>
                          <Text style={styles.sigTitle}>Authorized Signatory</Text>
                          <Text style={styles.sigSub}>Computer Generated Invoice</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Executive Styles (Matching Web App Invoices.jsx & Invoice.jsx) ───
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBrandingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  headerBrandingBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  headerExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  headerExportBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  maxContainer: {
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
    gap: 14,
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    gap: 4,
  },
  metricCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricCardLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#94a3b8',
  },
  metricCardVal: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  metricCardSub: {
    fontSize: 10.5,
  },

  // Filter & Search Hub
  filterCard: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    height: '100%',
  },
  filterPillsRow: {
    gap: 6,
  },
  datePill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 1,
  },
  datePillText: {
    fontSize: 11.5,
  },
  pillDropdownsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  subPillsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  subPillText: {
    fontSize: 11,
  },
  subPillDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#cbd5e1',
  },
  refreshIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Invoices List Col & Cards
  invoicesListCol: {
    gap: 10,
  },
  invoiceCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  invoiceIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  invoiceIdText: {
    color: '#6366f1',
    fontSize: 12,
    fontWeight: '900',
  },
  orderTypePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  orderTypeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  slotLabelText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
    gap: 1,
  },
  dateText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timeText: {
    fontSize: 10,
  },
  cardBodyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  customerCol: {
    flex: 1,
    gap: 2,
  },
  customerName: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  customerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customerPhone: {
    fontSize: 11,
  },
  pincodeText: {
    fontSize: 10.5,
  },
  badgesCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  paymentBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  methodBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  utrCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  utrText: {
    fontSize: 9.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#6366f1',
    fontWeight: '700',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  amountCol: {
    gap: 1,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  walletDiscountText: {
    color: '#10b981',
    fontSize: 10.5,
    fontWeight: '700',
  },
  actionBtnsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  printActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
  },
  printActionBtnText: {
    color: '#6366f1',
    fontSize: 11.5,
    fontWeight: '800',
  },
  orderNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 9,
  },
  orderNavBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },

  // Empty & Loading States
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 11.5,
    textAlign: 'center',
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 12,
  },
  errorBannerText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },

  // ─── Modal Styles ───
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 24 : 10,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 820,
    maxHeight: '94%',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 25,
    elevation: 10,
  },
  modalHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalTitleText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalOrderIdPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  modalOrderIdText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
  },
  modalSubText: {
    fontSize: 10.5,
    color: '#64748b',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalPrintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
  },
  modalPrintBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
  },
  modalShareBtn: {
    padding: 7,
    borderRadius: 9,
    backgroundColor: '#f1f5f9',
  },
  modalCloseBtn: {
    padding: 4,
  },

  // Document Paper View (Matching Web App Invoice.jsx 1:1)
  docScroll: {
    flex: 1,
  },
  docScrollContent: {
    padding: 14,
    paddingBottom: 28,
  },
  paperContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cancelledStampWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    pointerEvents: 'none',
  },
  cancelledStampBox: {
    borderWidth: 6,
    borderColor: '#dc2626',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 16,
    transform: [{ rotate: '-12deg' }],
    opacity: 0.25,
  },
  cancelledStampText: {
    color: '#dc2626',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 6,
  },
  docBody: {
    position: 'relative',
    zIndex: 10,
  },
  docBodyRejected: {
    opacity: 0.88,
  },

  // Top Header (Store Brand & Document Meta)
  docTopHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 16,
    marginBottom: 14,
    gap: 14,
  },
  docStoreCol: {
    gap: 6,
  },
  docStoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  docLogoImg: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  docStoreTitleCol: {
    flex: 1,
  },
  docStoreName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  docStoreTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  docContactWrap: {
    gap: 3,
    paddingTop: 3,
  },
  docContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  docContactText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  docInlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  docMetaDot: {
    fontSize: 11,
    color: '#94a3b8',
    marginHorizontal: 2,
  },

  // Official Meta Box
  docMetaCol: {
    gap: 8,
  },
  docMetaHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  docTaxInvoiceHeading: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  docOriginalBadge: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  docOriginalBadgeText: {
    color: '#065f46',
    fontSize: 8.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  docMetaCard: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    marginTop: 4,
    gap: 3,
  },
  docMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  docMetaLabel: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '500',
  },
  docMetaVal: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#0f172a',
  },
  docMetaValSimple: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0f172a',
  },

  // Compliance Strip
  complianceStrip: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    gap: 6,
  },
  complianceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  complianceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  complianceVal: {
    fontSize: 10.5,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#0f172a',
  },
  govtRegPill: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  govtRegText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#065f46',
  },
  placeOfSupplyText: {
    fontSize: 10,
    color: '#64748b',
  },

  // Customer & Fulfillment Info Grid
  infoGridRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  infoGridCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#ffffff',
    gap: 4,
  },
  infoGridHeader: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 4,
    marginBottom: 2,
  },
  infoGridName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  infoSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoSubText: {
    fontSize: 11,
    color: '#475569',
  },
  infoAddressText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
    lineHeight: 15,
  },
  infoPinText: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#64748b',
    marginTop: 1,
  },
  infoDetailLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 1,
  },
  infoDetailLabel: {
    fontSize: 10.5,
    color: '#64748b',
  },
  infoDetailVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },

  // Items Table
  itemsTableCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: '#ffffff',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableColHead: {
    fontSize: 9,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  tableBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableBodyRowRejected: {
    backgroundColor: 'rgba(255, 241, 242, 0.5)',
  },
  tableCellNum: {
    width: 24,
    textAlign: 'center',
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748b',
  },
  tableItemTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  tableCellItemName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  tableCellItemUnit: {
    fontSize: 9.5,
    color: '#64748b',
    marginTop: 1,
  },
  unavailableBadge: {
    backgroundColor: '#ffe4e6',
    borderWidth: 1,
    borderColor: '#fecdd3',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  unavailableBadgeText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#be123c',
  },
  tableCellQty: {
    width: 34,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
  },
  tableCellRate: {
    width: 58,
    textAlign: 'right',
    fontSize: 10.5,
    color: '#475569',
  },
  tableCellTotal: {
    width: 68,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },

  // Totals Section
  totalsSection: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  totalsCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  totalsBody: {
    padding: 10,
    gap: 5,
  },
  totalLineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalDividerTop: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 6,
    marginTop: 2,
  },
  totalLineLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  totalLineVal: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  grandTotalBanner: {
    backgroundColor: '#ecfdf5',
    borderTopWidth: 2,
    borderTopColor: '#059669',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  grandTotalLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#065f46',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  grandTotalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#047857',
  },

  // Footer: Terms & Signature
  docFooterRow: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 14,
    gap: 14,
  },
  termsCol: {
    gap: 4,
  },
  termsHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  termsHeadText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#334155',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  termsList: {
    gap: 2,
  },
  termsLineText: {
    fontSize: 9.5,
    color: '#64748b',
    lineHeight: 14,
  },
  termsGreeting: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#047857',
    marginTop: 4,
  },
  signatureCol: {
    alignItems: 'flex-end',
    gap: 2,
    paddingTop: 4,
  },
  sigStoreName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  sigImageContainer: {
    height: 42,
    justifyContent: 'flex-end',
    marginVertical: 3,
  },
  sigImage: {
    width: 130,
    height: 38,
  },
  sigDashedLine: {
    width: 130,
    borderBottomWidth: 1,
    borderBottomColor: '#94a3b8',
    borderStyle: 'dashed',
    marginBottom: 2,
  },
  sigTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0f172a',
  },
  sigSub: {
    fontSize: 8,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
