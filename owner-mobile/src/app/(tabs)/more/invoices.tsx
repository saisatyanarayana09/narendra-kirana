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
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { useAppTheme } from '../../../context/ThemeContext';
import { showAlert } from '../../../utils/alerts';
import ScreenHeader from '../../../components/ScreenHeader';

const InvoiceRow = memo(
  ({
    item,
    onViewInvoice,
    onOpenOrder,
    colors,
  }: {
    item: any;
    onViewInvoice: (item: any) => void;
    onOpenOrder: (id: number) => void;
    colors: any;
  }) => {
    const method = String(item?.payment_method || 'COD').toUpperCase();
    const isCompleted = item?.status === 'COMPLETED';

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.invoiceId, { color: '#10b981' }]}>INV-#{item?.id ?? '—'}</Text>
            <Text style={[styles.customerName, { color: colors.text }]}>
              {item?.customer_name || 'Walk-in / Guest'}
            </Text>
          </View>
          <View style={styles.rightCol}>
            <Text style={[styles.amount, { color: colors.text }]}>₹{item?.total_amount ?? '0.00'}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, method === 'UPI' ? styles.upiBadge : styles.codBadge]}>
                <Text style={styles.badgeText}>{method}</Text>
              </View>
              <View style={[styles.badge, isCompleted ? styles.doneBadge : styles.activeBadge]}>
                <Text style={styles.badgeText}>{item?.status || 'NEW'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.dateText, { color: colors.textMuted }]}>
            {item?.created_at ? new Date(item.created_at).toLocaleString() : '—'}
          </Text>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.invoiceActionBtn, { backgroundColor: colors.cardAlt }]}
              onPress={() => onViewInvoice(item)}
            >
              <Ionicons name="document-text-outline" size={14} color="#10b981" />
              <Text style={[styles.invoiceActionText, { color: '#10b981' }]}>Tax Invoice</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.invoiceActionBtn, { backgroundColor: colors.cardAlt }]}
              onPress={() => item?.id && onOpenOrder(item.id)}
            >
              <Text style={[styles.invoiceActionText, { color: colors.textMuted }]}>Order</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
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
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'UPI' | 'COD'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'ACTIVE'>('ALL');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected Invoice Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const fetchInvoices = useCallback(async (forceRefresh = false) => {
    setErrorMsg(null);
    try {
      const [ordersRes, settingsRes] = await Promise.allSettled([
        (api as ApiInstance).cachedGet('/orders/', { forceRefresh }),
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
      if (e?.response?.status !== 401) {
        setErrorMsg(getErrorMessage(e, 'Failed to load store invoices.'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInvoices(true);
  }, [fetchInvoices]);

  const totalRevenue = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    return safeOrders.reduce((sum: number, o: any) => sum + (parseFloat(o?.total_amount) || 0), 0);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    const q = searchTerm.trim().toLowerCase();

    return safeOrders.filter((order) => {
      if (!order) return false;
      if (q) {
        const idMatch = String(order.id || '').toLowerCase().includes(q);
        const nameMatch = String(order.customer_name || '').toLowerCase().includes(q);
        const addrMatch = String(order.delivery_address || '').toLowerCase().includes(q);
        const upiMatch = String(order.upi_transaction_id || '').toLowerCase().includes(q);
        if (!idMatch && !nameMatch && !addrMatch && !upiMatch) return false;
      }

      if (paymentFilter !== 'ALL') {
        const method = String(order.payment_method || 'COD').toUpperCase();
        if (paymentFilter !== method) return false;
      }

      if (statusFilter === 'COMPLETED' && order.status !== 'COMPLETED') return false;
      if (
        statusFilter === 'ACTIVE' &&
        (order.status === 'COMPLETED' || order.status === 'REJECTED')
      ) {
        return false;
      }

      return true;
    });
  }, [orders, searchTerm, paymentFilter, statusFilter]);

  const metrics = useMemo(() => {
    let totalBilled = 0;
    let upiTotal = 0;
    let codTotal = 0;

    filteredOrders.forEach((o) => {
      const amt = parseFloat(o.total_amount) || 0;
      totalBilled += amt;
      const m = String(o.payment_method || 'COD').toUpperCase();
      if (m === 'UPI') upiTotal += amt;
      else codTotal += amt;
    });

    return {
      totalBilled: totalBilled.toFixed(2),
      upiTotal: upiTotal.toFixed(2),
      codTotal: codTotal.toFixed(2),
      count: filteredOrders.length,
    };
  }, [filteredOrders]);

  const handlePrintOrShare = async (inv: any) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Build a clean HTML invoice document and open it in a new window for PDF printing
      const items = inv.items || [];
      const itemsHtml = items
        .map((i: any) => {
          const qty = Number(i.quantity || 1);
          const price = parseFloat(i.price_snapshot) || 0;
          const lineTotal = parseFloat(i.subtotal) || price * qty;
          const isRejected = i.status === 'REJECTED' || i.is_rejected;
          return `<tr style="${isRejected ? 'color:#e11d48;text-decoration:line-through;' : ''}">
            <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${i.product_name_snapshot || 'Item'}${i.unit_snapshot ? `<br><small style="color:#64748b">${i.unit_snapshot}</small>` : ''}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:center;">${qty}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;">₹${price.toFixed(2)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${isRejected ? '<span style="color:#e11d48">₹0.00</span>' : `₹${lineTotal.toFixed(2)}`}</td>
          </tr>`;
        })
        .join('');

      const storeName = storeSettings?.store_name || 'Narendra Kirana Store';
      const storeAddr = storeSettings?.store_address || '';
      const storePhone = storeSettings?.store_phone || '';
      const storeEmail = storeSettings?.store_email || '';
      const gstin = storeSettings?.gstin || '';
      const fssai = storeSettings?.fssai_license_number || '';

      let feesHtml = '';
      if (inv.delivery_fee && parseFloat(inv.delivery_fee) > 0) {
        feesHtml += `<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Delivery Fee</span><span>₹${inv.delivery_fee}</span></div>`;
      }
      if (inv.packaging_fee && parseFloat(inv.packaging_fee) > 0) {
        feesHtml += `<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Packaging Fee</span><span>₹${inv.packaging_fee}</span></div>`;
      }
      if (inv.discount_amount && parseFloat(inv.discount_amount) > 0) {
        feesHtml += `<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Discount</span><span style="color:#059669">-₹${inv.discount_amount}</span></div>`;
      }

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice #${inv.id} - ${storeName}</title>
<style>
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } @page { margin: 12mm; } }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color: #0f172a; padding: 24px; max-width: 700px; margin: 0 auto; }
  .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #059669; padding-bottom: 14px; }
  .header h1 { font-size: 22px; font-weight: 900; color: #059669; }
  .header p { font-size: 11px; color: #475569; margin-top: 2px; }
  .header .tax-id { font-size: 11px; font-weight: 700; color: #334155; margin-top: 3px; }
  .meta { display: flex; justify-content: space-between; margin: 14px 0; font-size: 12px; }
  .meta .label { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 2px; }
  .meta .val { font-weight: 700; font-size: 13px; }
  .meta .sub { color: #475569; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { background: #f1f5f9; padding: 8px; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
  td { font-size: 12px; }
  .fees { padding: 8px 0; font-size: 12px; color: #334155; border-top: 1px dashed #cbd5e1; }
  .grand { display: flex; justify-content: space-between; padding: 10px 0; margin-top: 4px; border-top: 2px solid #0f172a; font-size: 16px; font-weight: 900; }
  .footer { text-align: center; margin-top: 24px; font-size: 10px; color: #94a3b8; }
</style></head><body>
  <div class="header">
    <h1>${storeName}</h1>
    ${storeAddr ? `<p>${storeAddr}</p>` : ''}
    ${storePhone || storeEmail ? `<p>${[storePhone, storeEmail].filter(Boolean).join(' • ')}</p>` : ''}
    ${gstin ? `<p class="tax-id">GSTIN: ${gstin}</p>` : ''}
    ${fssai ? `<p class="tax-id">FSSAI: ${fssai}</p>` : ''}
  </div>
  <div class="meta">
    <div>
      <div class="label">Billed To</div>
      <div class="val">${inv.customer_name || 'Walk-in / Guest'}</div>
      ${inv.customer_phone ? `<div class="sub">Phone: ${inv.customer_phone}</div>` : ''}
      ${inv.delivery_address ? `<div class="sub">${inv.delivery_address}</div>` : ''}
    </div>
    <div style="text-align:right;">
      <div class="label">Invoice</div>
      <div class="val">INV-#${inv.id}</div>
      <div class="sub">${inv.created_at ? new Date(inv.created_at).toLocaleDateString() : ''}</div>
      <div class="sub">${inv.payment_method || 'COD'} • ${inv.status}</div>
      ${inv.upi_transaction_id ? `<div class="sub">UPI Ref: ${inv.upi_transaction_id}</div>` : ''}
    </div>
  </div>
  <table>
    <thead><tr>
      <th style="text-align:left;">Item</th>
      <th style="text-align:center;">Qty</th>
      <th style="text-align:right;">Price</th>
      <th style="text-align:right;">Total</th>
    </tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  ${feesHtml ? `<div class="fees">${feesHtml}</div>` : ''}
  <div class="grand"><span>Grand Total</span><span>₹${inv.total_amount}</span></div>
  <div class="footer">This is a computer-generated invoice. Thank you for shopping at ${storeName}!</div>
</body></html>`;

      // Use a hidden iframe to print — avoids popup blockers
      const frameId = 'smart-kirana-invoice-print';
      let frame = document.getElementById(frameId) as HTMLIFrameElement | null;
      if (frame) frame.remove();
      frame = document.createElement('iframe');
      frame.id = frameId;
      frame.style.position = 'fixed';
      frame.style.top = '-10000px';
      frame.style.left = '-10000px';
      frame.style.width = '800px';
      frame.style.height = '900px';
      document.body.appendChild(frame);

      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
          frame?.contentWindow?.focus();
          frame?.contentWindow?.print();
          // Clean up after print dialog closes
          setTimeout(() => frame?.remove(), 2000);
        }, 500);
      }
      return;
    }

    // Native: Share as text
    const itemsSummary = (inv.items || [])
      .map(
        (i: any) =>
          `• ${i.product_name_snapshot} (${i.unit_snapshot || ''}) x${i.quantity} = ₹${i.subtotal || i.price_snapshot}`
      )
      .join('\n');

    const msg = `🧾 TAX INVOICE: ${storeSettings?.store_name || 'Narendra Kirana'}\n` +
      `Invoice #: INV-${inv.id}\n` +
      `Date: ${inv.created_at ? new Date(inv.created_at).toLocaleString() : ''}\n` +
      `Customer: ${inv.customer_name || 'Guest'}\n` +
      `Phone: ${inv.customer_phone || ''}\n` +
      `Payment: ${inv.payment_method || 'COD'} (Status: ${inv.status})\n\n` +
      `ITEMS:\n${itemsSummary}\n\n` +
      `TOTAL AMOUNT: ₹${inv.total_amount}\n` +
      `Thank you for shopping!`;

    try {
      await Share.share({ message: msg });
    } catch {
      showAlert('Invoice', msg);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Universal Screen Header */}
      <ScreenHeader
        title="Tax Invoices & Billing"
        subtitle={`${filteredOrders.length} invoices • ₹${totalRevenue.toFixed(0)} billed`}
      />

      {/* Top Filter and Search Header */}
      <View style={[styles.filterHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.searchRow, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
          <Ionicons name="search" size={17} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search invoice #, customer, address..."
            placeholderTextColor={colors.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.pillRow}>
          {(['ALL', 'UPI', 'COD'] as const).map((method) => (
            <TouchableOpacity
              key={method}
              style={[
                styles.pill,
                { backgroundColor: colors.cardAlt },
                paymentFilter === method && styles.pillActive,
              ]}
              onPress={() => setPaymentFilter(method)}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: colors.textMuted },
                  paymentFilter === method && styles.pillTextActive,
                ]}
              >
                {method}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.pipeDivider} />

          {(['ALL', 'COMPLETED', 'ACTIVE'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.pill,
                { backgroundColor: colors.cardAlt },
                statusFilter === status && styles.pillActive,
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: colors.textMuted },
                  statusFilter === status && styles.pillTextActive,
                ]}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Metrics Banner */}
      <View style={[styles.metricsBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>INVOICES</Text>
          <Text style={[styles.metricVal, { color: colors.text }]}>{metrics.count}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>TOTAL BILLED</Text>
          <Text style={[styles.metricVal, { color: '#10b981' }]}>₹{metrics.totalBilled}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>UPI / ONLINE</Text>
          <Text style={[styles.metricVal, { color: '#3b82f6' }]}>₹{metrics.upiTotal}</Text>
        </View>
      </View>

      {/* Error Message */}
      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* Invoice List */}
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item, index) => (item?.id != null ? String(item.id) : `inv-${index}`)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#10b981"
            />
          }
          renderItem={({ item }) => (
            <InvoiceRow
              item={item}
              onViewInvoice={(inv) => setSelectedInvoice(inv)}
              onOpenOrder={(id) => router.push(`/(tabs)/orders/${id}` as any)}
              colors={colors}
            />
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No invoices match this filter criteria.
            </Text>
          }
        />
      )}

      {/* Official Tax Invoice Modal */}
      <Modal visible={Boolean(selectedInvoice)} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.invoiceModalCard, { backgroundColor: '#ffffff' }]}>
            {/* Modal Controls Header */}
            <View style={styles.invoiceModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="document-text" size={20} color="#059669" />
                <Text style={styles.invoiceModalHeaderTitle}>
                  Tax Invoice #{selectedInvoice?.id}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity
                  style={styles.modalPrintBtn}
                  onPress={() => selectedInvoice && handlePrintOrShare(selectedInvoice)}
                >
                  <Ionicons name="print-outline" size={16} color="#fff" />
                  <Text style={styles.modalPrintBtnText}>Print / Share</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSelectedInvoice(null)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Printable Document Body */}
            <ScrollView style={styles.invoicePrintScroll}>
              {/* Store Identity */}
              <View style={styles.storeDocHeader}>
                <Text style={styles.docStoreName}>
                  {storeSettings?.store_name || 'Narendra Kirana Store'}
                </Text>
                <Text style={styles.docStoreAddr}>
                  {storeSettings?.store_address || 'Main Road, Market Center'}
                </Text>
                <Text style={styles.docStorePhone}>
                  Phone: {storeSettings?.store_phone || '+91 9876543210'} • Email:{' '}
                  {storeSettings?.store_email || 'support@narendrakirana.com'}
                </Text>
                {storeSettings?.gstin ? (
                  <Text style={styles.docStoreTax}>GSTIN: {storeSettings.gstin}</Text>
                ) : null}
                {storeSettings?.fssai_license_number ? (
                  <Text style={styles.docStoreTax}>
                    FSSAI Lic #: {storeSettings.fssai_license_number}
                  </Text>
                ) : null}
              </View>

              <View style={styles.docDivider} />

              {/* Invoice Meta Grid */}
              <View style={styles.docMetaGrid}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docMetaLabel}>BILLED TO:</Text>
                  <Text style={styles.docMetaVal}>
                    {selectedInvoice?.customer_name || 'Walk-in / Guest Customer'}
                  </Text>
                  {selectedInvoice?.customer_phone ? (
                    <Text style={styles.docMetaSub}>Phone: {selectedInvoice.customer_phone}</Text>
                  ) : null}
                  {selectedInvoice?.delivery_address ? (
                    <Text style={styles.docMetaSub} numberOfLines={2}>
                      Address: {selectedInvoice.delivery_address}
                    </Text>
                  ) : null}
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={styles.docMetaLabel}>INVOICE DETAILS:</Text>
                  <Text style={styles.docMetaVal}>INV-#{selectedInvoice?.id}</Text>
                  <Text style={styles.docMetaSub}>
                    Date:{' '}
                    {selectedInvoice?.created_at
                      ? new Date(selectedInvoice.created_at).toLocaleDateString()
                      : ''}
                  </Text>
                  <Text style={styles.docMetaSub}>
                    Payment: {selectedInvoice?.payment_method || 'COD'} ({selectedInvoice?.status})
                  </Text>
                  {selectedInvoice?.upi_transaction_id ? (
                    <Text style={styles.docMetaSub}>
                      UPI Ref: {selectedInvoice.upi_transaction_id}
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* Itemized Table */}
              <View style={styles.itemTable}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.colHeader, { flex: 2 }]}>ITEM</Text>
                  <Text style={[styles.colHeader, { flex: 0.8, textAlign: 'center' }]}>QTY</Text>
                  <Text style={[styles.colHeader, { flex: 1, textAlign: 'right' }]}>PRICE</Text>
                  <Text style={[styles.colHeader, { flex: 1, textAlign: 'right' }]}>TOTAL</Text>
                </View>
                {(selectedInvoice?.items || []).map((item: any, idx: number) => {
                  const qty = Number(item.quantity || 1);
                  const price = parseFloat(item.price_snapshot) || 0;
                  const lineTotal = parseFloat(item.subtotal) || price * qty;
                  return (
                    <View key={idx} style={styles.tableRow}>
                      <View style={{ flex: 2 }}>
                        <Text style={styles.itemName}>
                          {item.product_name_snapshot || 'Item'}
                        </Text>
                        {item.unit_snapshot ? (
                          <Text style={styles.itemUnit}>{item.unit_snapshot}</Text>
                        ) : null}
                      </View>
                      <Text style={[styles.rowText, { flex: 0.8, textAlign: 'center' }]}>
                        {qty}
                      </Text>
                      <Text style={[styles.rowText, { flex: 1, textAlign: 'right' }]}>
                        ₹{price.toFixed(2)}
                      </Text>
                      <Text style={[styles.rowTextBold, { flex: 1, textAlign: 'right' }]}>
                        ₹{lineTotal.toFixed(2)}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Fee & Tax Breakdown */}
              <View style={styles.breakdownBox}>
                {selectedInvoice?.delivery_fee && parseFloat(selectedInvoice.delivery_fee) > 0 ? (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Delivery Fee</Text>
                    <Text style={styles.breakdownVal}>₹{selectedInvoice.delivery_fee}</Text>
                  </View>
                ) : null}
                {selectedInvoice?.packaging_fee && parseFloat(selectedInvoice.packaging_fee) > 0 ? (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Packaging Fee</Text>
                    <Text style={styles.breakdownVal}>₹{selectedInvoice.packaging_fee}</Text>
                  </View>
                ) : null}
                {selectedInvoice?.discount_amount && parseFloat(selectedInvoice.discount_amount) > 0 ? (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Discount</Text>
                    <Text style={[styles.breakdownVal, { color: '#059669' }]}>
                      -₹{selectedInvoice.discount_amount}
                    </Text>
                  </View>
                ) : null}
                <View style={[styles.breakdownRow, styles.grandTotalRow]}>
                  <Text style={styles.grandTotalLabel}>Grand Total</Text>
                  <Text style={styles.grandTotalVal}>₹{selectedInvoice?.total_amount}</Text>
                </View>
              </View>

              {/* Store Digital Signature */}
              {storeSettings?.invoice_signature ? (
                <View style={styles.signatureBox}>
                  <Image
                    source={{ uri: storeSettings.invoice_signature }}
                    style={styles.signatureImg}
                  />
                  <Text style={styles.signatureLabel}>Authorized Signatory</Text>
                </View>
              ) : null}

              <Text style={styles.docFooterNotice}>
                This is a computer-generated tax invoice issued by Narendra Kirana.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterHeader: {
    padding: 12,
    borderBottomWidth: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  pillActive: {
    backgroundColor: '#10b981',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pillTextActive: {
    color: '#ffffff',
  },
  pipeDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#64748b',
    marginHorizontal: 4,
  },
  metricsBanner: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  errorBox: {
    padding: 10,
    backgroundColor: '#dc2626',
  },
  errorText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  listContent: {
    padding: 14,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  invoiceId: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  customerName: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '800',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  upiBadge: {
    backgroundColor: '#6366f1',
  },
  codBadge: {
    backgroundColor: '#f59e0b',
  },
  doneBadge: {
    backgroundColor: '#059669',
  },
  activeBadge: {
    backgroundColor: '#3b82f6',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  dateText: {
    fontSize: 11,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  invoiceActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  invoiceActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 14,
  },
  invoiceModalCard: {
    borderRadius: 16,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  invoiceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  invoiceModalHeaderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  modalPrintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modalPrintBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  invoicePrintScroll: {
    padding: 16,
  },
  storeDocHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  docStoreName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  docStoreAddr: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    marginTop: 2,
  },
  docStorePhone: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 2,
  },
  docStoreTax: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#334155',
    marginTop: 2,
  },
  docDivider: {
    height: 1,
    backgroundColor: '#cbd5e1',
    marginVertical: 12,
  },
  docMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  docMetaLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    marginBottom: 2,
  },
  docMetaVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  docMetaSub: {
    fontSize: 11,
    color: '#475569',
    marginTop: 1,
  },
  itemTable: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  colHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  itemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  itemUnit: {
    fontSize: 10,
    color: '#64748b',
  },
  rowText: {
    fontSize: 11,
    color: '#334155',
  },
  rowTextBold: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  breakdownBox: {
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 180,
    paddingVertical: 2,
  },
  breakdownLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  breakdownVal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f172a',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    paddingTop: 4,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  grandTotalVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#059669',
  },
  signatureBox: {
    alignItems: 'flex-end',
    marginTop: 10,
    marginBottom: 14,
  },
  signatureImg: {
    width: 120,
    height: 48,
    resizeMode: 'contain',
  },
  signatureLabel: {
    fontSize: 10,
    color: '#64748b',
    borderTopWidth: 1,
    borderTopColor: '#94a3b8',
    paddingTop: 2,
    marginTop: 2,
  },
  docFooterNotice: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
    marginBottom: 16,
  },
});
