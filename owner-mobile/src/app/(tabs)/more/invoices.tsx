import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
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
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
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

  // Build clean HTML for the invoice (used for preview + PDF)
  const buildInvoiceHtml = useCallback((inv: any) => {
    const items = inv.items || [];
    const storeName = storeSettings?.store_name || 'Narendra Kirana Store';
    const storeAddr = storeSettings?.store_address || '';
    const storePhone = storeSettings?.store_phone || '';
    const storeEmail = storeSettings?.store_email || '';
    const gstin = storeSettings?.gstin || '';
    const fssai = storeSettings?.fssai_license_number || '';

    const itemsHtml = items
      .map((i: any) => {
        const qty = Number(i.quantity || 1);
        const price = parseFloat(i.price_snapshot) || 0;
        const lineTotal = parseFloat(i.subtotal) || price * qty;
        const isRejected = i.status === 'REJECTED' || i.is_rejected;
        return `<tr${isRejected ? ' class="rejected"' : ''}>
          <td>${i.product_name_snapshot || 'Item'}${i.unit_snapshot ? `<br><small>${i.unit_snapshot}</small>` : ''}</td>
          <td class="c">${qty}</td>
          <td class="r">₹${price.toFixed(2)}</td>
          <td class="r b">${isRejected ? '<span class="red">₹0.00</span>' : `₹${lineTotal.toFixed(2)}`}</td>
        </tr>`;
      })
      .join('');

    let feesHtml = '';
    if (inv.delivery_fee && parseFloat(inv.delivery_fee) > 0)
      feesHtml += `<div class="fr"><span>Delivery Fee</span><span>₹${inv.delivery_fee}</span></div>`;
    if (inv.packaging_fee && parseFloat(inv.packaging_fee) > 0)
      feesHtml += `<div class="fr"><span>Packaging Fee</span><span>₹${inv.packaging_fee}</span></div>`;
    if (inv.discount_amount && parseFloat(inv.discount_amount) > 0)
      feesHtml += `<div class="fr"><span>Discount</span><span class="grn">-₹${inv.discount_amount}</span></div>`;

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice #${inv.id}</title>
<style>
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}@page{margin:10mm;size:A4;}}
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:-apple-system,'Segoe UI',Roboto,Helvetica,sans-serif;color:#1e293b;padding:28px 32px;background:#fff;}
  .box{max-width:680px;margin:0 auto;}
  .hdr{text-align:center;padding-bottom:16px;border-bottom:2.5px solid #059669;margin-bottom:18px;}
  .hdr h1{font-size:20px;font-weight:900;color:#059669;letter-spacing:.5px;}
  .hdr p{font-size:11px;color:#475569;margin-top:3px;}
  .hdr .tx{font-size:10.5px;font-weight:700;color:#334155;margin-top:2px;}
  .tb{text-align:center;margin-bottom:16px;}
  .tb h2{font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:1.5px;border-bottom:1px solid #e2e8f0;display:inline-block;padding-bottom:4px;}
  .meta{display:flex;justify-content:space-between;margin-bottom:18px;gap:12px;}
  .mb .lb{font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;margin-bottom:3px;}
  .mb .vl{font-size:13px;font-weight:700;color:#0f172a;}
  .mb .sb{font-size:11px;color:#475569;margin-top:1px;}
  table{width:100%;border-collapse:collapse;margin-bottom:14px;}
  thead{background:#f1f5f9;}
  th{padding:8px 10px;font-size:9.5px;font-weight:800;color:#64748b;text-transform:uppercase;text-align:left;border-bottom:2px solid #e2e8f0;}
  th.c{text-align:center;}th.r{text-align:right;}
  td{padding:7px 10px;font-size:12px;color:#334155;border-bottom:1px solid #f1f5f9;}
  td.c{text-align:center;}td.r{text-align:right;}td.b{font-weight:600;}
  td small{color:#94a3b8;font-size:10px;}
  tr.rejected{text-decoration:line-through;color:#e11d48;opacity:.7;}
  .red{color:#e11d48;font-weight:700;}
  .grn{color:#059669;}
  .fees{border-top:1px dashed #cbd5e1;padding:8px 0;margin-bottom:6px;}
  .fr{display:flex;justify-content:space-between;padding:3px 0;font-size:12px;color:#334155;}
  .grand{display:flex;justify-content:space-between;padding:12px 0;border-top:2px solid #0f172a;font-size:17px;font-weight:900;color:#0f172a;}
  .grand .amt{color:#059669;}
  .ft{text-align:center;margin-top:28px;padding-top:14px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;font-style:italic;}
</style></head><body>
<div class="box">
  <div class="hdr">
    <h1>${storeName}</h1>
    ${storeAddr ? `<p>${storeAddr}</p>` : ''}
    ${storePhone || storeEmail ? `<p>${[storePhone, storeEmail].filter(Boolean).join(' • ')}</p>` : ''}
    ${gstin ? `<p class="tx">GSTIN: ${gstin}</p>` : ''}
    ${fssai ? `<p class="tx">FSSAI: ${fssai}</p>` : ''}
  </div>
  <div class="tb"><h2>Tax Invoice</h2></div>
  <div class="meta">
    <div class="mb">
      <div class="lb">Billed To</div>
      <div class="vl">${inv.customer_name || 'Walk-in / Guest'}</div>
      ${inv.customer_phone ? `<div class="sb">Phone: ${inv.customer_phone}</div>` : ''}
      ${inv.delivery_address ? `<div class="sb">${inv.delivery_address}</div>` : ''}
    </div>
    <div class="mb" style="text-align:right;">
      <div class="lb">Invoice Details</div>
      <div class="vl">INV-#${inv.id}</div>
      <div class="sb">${inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</div>
      <div class="sb">${inv.payment_method || 'COD'} • ${inv.status}</div>
      ${inv.upi_transaction_id ? `<div class="sb">UPI Ref: ${inv.upi_transaction_id}</div>` : ''}
    </div>
  </div>
  <table>
    <thead><tr><th>Item</th><th class="c">Qty</th><th class="r">Price</th><th class="r">Total</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  ${feesHtml ? `<div class="fees">${feesHtml}</div>` : ''}
  <div class="grand"><span>Grand Total</span><span class="amt">₹${inv.total_amount}</span></div>
  <div class="ft">Computer-generated invoice. Thank you for shopping at ${storeName}!</div>
</div>
</body></html>`;
  }, [storeSettings]);

  // Download / Print as PDF
  const handleDownloadPdf = useCallback(async (inv: any) => {
    try {
      const html = buildInvoiceHtml(inv);
      if (Platform.OS === 'web') {
        const frameId = 'sk-inv-print';
        let frame = document.getElementById(frameId) as HTMLIFrameElement | null;
        if (frame) frame.remove();
        frame = document.createElement('iframe');
        frame.id = frameId;
        Object.assign(frame.style, { position: 'fixed', top: '-10000px', left: '-10000px', width: '800px', height: '1100px' });
        document.body.appendChild(frame);
        const d = frame.contentDocument || frame.contentWindow?.document;
        if (d) { d.open(); d.write(html); d.close(); }
        setTimeout(() => { frame?.contentWindow?.focus(); frame?.contentWindow?.print(); setTimeout(() => frame?.remove(), 2000); }, 500);
        return;
      }
      const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Invoice INV-#${inv.id}` });
      } else {
        showAlert('PDF Saved', `Invoice saved to:\n${uri}`);
      }
    } catch {
      showAlert('Error', 'Failed to generate PDF.');
    }
  }, [buildInvoiceHtml]);

  // Share as text
  const handleShareText = useCallback(async (inv: any) => {
    const itemsSummary = (inv.items || [])
      .map((i: any) => `• ${i.product_name_snapshot} (${i.unit_snapshot || ''}) x${i.quantity} = ₹${i.subtotal || i.price_snapshot}`)
      .join('\n');
    const msg = `🧾 TAX INVOICE: ${storeSettings?.store_name || 'Narendra Kirana'}\nInvoice #: INV-${inv.id}\nDate: ${inv.created_at ? new Date(inv.created_at).toLocaleString() : ''}\nCustomer: ${inv.customer_name || 'Guest'}\nPhone: ${inv.customer_phone || ''}\nPayment: ${inv.payment_method || 'COD'} (${inv.status})\n\nITEMS:\n${itemsSummary}\n\nTOTAL: ₹${inv.total_amount}\nThank you!`;
    try { await Share.share({ message: msg }); } catch { showAlert('Invoice', msg); }
  }, [storeSettings]);

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

      {/* A4 Invoice Preview Modal */}
      <Modal visible={Boolean(selectedInvoice)} transparent animationType="slide" onRequestClose={() => setSelectedInvoice(null)}>
        <View style={styles.previewBackdrop}>
          <View style={[styles.previewContainer, { backgroundColor: colors.bg }]}>
            {/* Header */}
            <View style={[styles.previewHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="document-text" size={20} color="#059669" />
                <Text style={[styles.previewTitle, { color: colors.text }]}>
                  Invoice #{selectedInvoice?.id}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedInvoice(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={28} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* A4 Paper Preview */}
            <ScrollView
              style={styles.previewScrollArea}
              contentContainerStyle={styles.previewScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.a4Shadow}>
                {Platform.OS === 'web' ? (
                  <iframe
                    srcDoc={selectedInvoice ? buildInvoiceHtml(selectedInvoice) : ''}
                    style={{
                      width: '100%',
                      height: 800,
                      border: 'none',
                      borderRadius: 4,
                      backgroundColor: '#ffffff',
                    } as any}
                    title="Invoice Preview"
                  />
                ) : (
                  /* Native fallback: render items natively */
                  <View style={styles.a4NativeContent}>
                    <Text style={styles.a4StoreName}>
                      {storeSettings?.store_name || 'Narendra Kirana Store'}
                    </Text>
                    {storeSettings?.store_address ? (
                      <Text style={styles.a4StoreDetail}>{storeSettings.store_address}</Text>
                    ) : null}
                    {storeSettings?.store_phone ? (
                      <Text style={styles.a4StoreDetail}>Phone: {storeSettings.store_phone}</Text>
                    ) : null}
                    {storeSettings?.gstin ? (
                      <Text style={styles.a4Tax}>GSTIN: {storeSettings.gstin}</Text>
                    ) : null}

                    <View style={styles.a4Divider} />
                    <Text style={styles.a4InvoiceLabel}>TAX INVOICE</Text>
                    <View style={styles.a4Divider} />

                    <View style={styles.a4MetaRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.a4MetaLabel}>BILLED TO</Text>
                        <Text style={styles.a4MetaVal}>{selectedInvoice?.customer_name || 'Walk-in / Guest'}</Text>
                        {selectedInvoice?.customer_phone ? <Text style={styles.a4MetaSub}>Phone: {selectedInvoice.customer_phone}</Text> : null}
                      </View>
                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.a4MetaLabel}>INVOICE</Text>
                        <Text style={styles.a4MetaVal}>INV-#{selectedInvoice?.id}</Text>
                        <Text style={styles.a4MetaSub}>{selectedInvoice?.created_at ? new Date(selectedInvoice.created_at).toLocaleDateString() : ''}</Text>
                        <Text style={styles.a4MetaSub}>{selectedInvoice?.payment_method || 'COD'} • {selectedInvoice?.status}</Text>
                      </View>
                    </View>

                    {/* Items */}
                    <View style={styles.a4TableHead}>
                      <Text style={[styles.a4ColH, { flex: 2, textAlign: 'left' }]}>Item</Text>
                      <Text style={[styles.a4ColH, { flex: 0.6, textAlign: 'center' }]}>Qty</Text>
                      <Text style={[styles.a4ColH, { flex: 1, textAlign: 'right' }]}>Price</Text>
                      <Text style={[styles.a4ColH, { flex: 1, textAlign: 'right' }]}>Total</Text>
                    </View>
                    {(selectedInvoice?.items || []).map((item: any, idx: number) => {
                      const qty = Number(item.quantity || 1);
                      const price = parseFloat(item.price_snapshot) || 0;
                      const lineTotal = parseFloat(item.subtotal) || price * qty;
                      const isRej = item.status === 'REJECTED' || item.is_rejected;
                      return (
                        <View key={idx} style={styles.a4TableRow}>
                          <Text style={[styles.a4Cell, { flex: 2 }, isRej && { textDecorationLine: 'line-through', color: '#e11d48' }]}>
                            {item.product_name_snapshot || 'Item'}
                          </Text>
                          <Text style={[styles.a4Cell, { flex: 0.6, textAlign: 'center' }, isRej && { color: '#e11d48' }]}>{qty}</Text>
                          <Text style={[styles.a4Cell, { flex: 1, textAlign: 'right' }, isRej && { color: '#e11d48' }]}>₹{price.toFixed(2)}</Text>
                          <Text style={[styles.a4Cell, { flex: 1, textAlign: 'right', fontWeight: '600' }, isRej && { color: '#e11d48' }]}>
                            {isRej ? '₹0.00' : `₹${lineTotal.toFixed(2)}`}
                          </Text>
                        </View>
                      );
                    })}

                    <View style={styles.a4GrandRow}>
                      <Text style={styles.a4GrandLabel}>Grand Total</Text>
                      <Text style={styles.a4GrandVal}>₹{selectedInvoice?.total_amount}</Text>
                    </View>

                    <Text style={styles.a4Footer}>
                      Computer-generated invoice. Thank you for shopping!
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Bottom Action Bar */}
            <View style={[styles.previewActions, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={styles.actionBtnDownload}
                onPress={() => selectedInvoice && handleDownloadPdf(selectedInvoice)}
              >
                <Ionicons name="download-outline" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>Download PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtnShare}
                onPress={() => selectedInvoice && handleShareText(selectedInvoice)}
              >
                <Ionicons name="share-social-outline" size={18} color="#059669" />
                <Text style={[styles.actionBtnText, { color: '#059669' }]}>Share</Text>
              </TouchableOpacity>
            </View>
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
  // A4 Preview Modal
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  previewContainer: {
    flex: 1,
    marginTop: 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  previewScrollArea: {
    flex: 1,
  },
  previewScrollContent: {
    padding: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
  a4Shadow: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    // A4 paper shadow effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  // Native fallback styles (when not web)
  a4NativeContent: {
    padding: 24,
  },
  a4StoreName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
    textAlign: 'center',
    marginBottom: 4,
  },
  a4StoreDetail: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    marginTop: 2,
  },
  a4Tax: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    marginTop: 2,
  },
  a4Divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  a4InvoiceLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  a4MetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  a4MetaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  a4MetaVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  a4MetaSub: {
    fontSize: 11,
    color: '#475569',
    marginTop: 1,
  },
  a4TableHead: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 2,
  },
  a4ColH: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  a4TableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  a4Cell: {
    fontSize: 12,
    color: '#334155',
  },
  a4GrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderTopColor: '#0f172a',
    paddingTop: 12,
    marginTop: 12,
  },
  a4GrandLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  a4GrandVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#059669',
  },
  a4Footer: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 24,
  },
  // Bottom action bar
  previewActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  actionBtnDownload: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnShare: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#059669',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
