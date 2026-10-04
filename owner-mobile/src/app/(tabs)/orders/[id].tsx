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
  Modal,
  Platform,
  Share,
} from 'react-native';
import { useLocalSearchParams as useExpoParams, useRouter as useExpoRouter } from 'expo-router';
import { Image } from 'expo-image';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
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
  customer?: number | null;
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
  discount_applied?: string;
  promo_discount?: string;
  wallet_discount?: string;
  delivery_slot_date?: string;
  delivery_slot_label?: string;
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
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
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
      const [orderRes, partnersRes, settingsRes] = await Promise.allSettled([
        api.get(`/orders/${id}/`),
        api.get('/delivery/partners/'),
        api.get('/store/settings/'),
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

      if (settingsRes.status === 'fulfilled' && settingsRes.value?.data) {
        const rawSettings = settingsRes.value.data;
        setStoreSettings(Array.isArray(rawSettings) ? rawSettings[0] : rawSettings);
      }
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const formatInvoiceNumber = (orderObj: any) => {
    const rawId = String(orderObj?.id || '').trim();
    const d = orderObj?.created_at ? new Date(orderObj.created_at) : new Date();
    const year = !isNaN(d.getTime()) ? d.getFullYear() : new Date().getFullYear();
    if (rawId.toUpperCase().startsWith('ORD')) {
      return `INV-${year}-${rawId.toUpperCase()}`;
    }
    const digits = rawId.replace(/\D/g, '');
    return `INV-${year}-${(digits || '1').padStart(5, '0')}`;
  };

  const formatFullDateTime = (dateVal: any) => {
    if (!dateVal) return 'N/A';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const buildInvoiceHtml = useCallback(
    (o: Order) => {
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

      const orderDate = formatFullDateTime(o.created_at);
      const invoiceDate = formatFullDateTime(new Date());
      const invoiceNumber = formatInvoiceNumber(o);

      const rawMethod = (o.payment_method || 'COD').toUpperCase();
      let methodText = 'Cash on Delivery (COD)';
      if (rawMethod === 'UPI') {
        methodText = o.upi_transaction_id ? `UPI (Ref: ${o.upi_transaction_id})` : 'UPI Instant Payment';
      } else if (o.order_type === 'PICKUP' && rawMethod === 'COD') {
        methodText = 'Cash at Store Counter';
      }

      const items = o.items || [];
      const itemsHtml = items
        .map((it, idx) => {
          const qty = Number(it.quantity || 1);
          const price = parseFloat(it.price_snapshot) || 0;
          const total = parseFloat(it.subtotal) || price * qty;
          const isRejected = it.status === 'REJECTED';
          return `
            <tr class="${isRejected ? 'rejected' : ''}">
              <td style="text-align:center;color:${isRejected ? '#94a3b8' : '#64748b'};">${idx + 1}</td>
              <td>
                <div style="font-weight:700;color:${isRejected ? '#94a3b8;text-decoration:line-through;' : '#0f172a;'}">${it.product_name_snapshot}</div>
                ${it.unit_snapshot ? `<div style="font-size:10px;color:#64748b;">${it.unit_snapshot}</div>` : ''}
                ${isRejected ? `<span style="font-size:8px;font-weight:800;color:#e11d48;background:#ffe4e6;padding:1px 4px;border-radius:3px;">UNAVAILABLE</span>` : ''}
              </td>
              <td style="text-align:center;">${qty}</td>
              <td style="text-align:right;">₹${price.toFixed(2)}</td>
              <td style="text-align:right;font-weight:700;">${isRejected ? '₹0.00' : `₹${total.toFixed(2)}`}</td>
            </tr>
          `;
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
    .meta-card { background: transparent; border: none; padding: 0; margin-top: 6px; text-align: right; }
    .meta-row { display: flex; justify-content: flex-end; gap: 8px; margin: 2px 0; font-size: 10.5px; }
    .meta-lbl { color: #64748b; }
    .meta-val { font-weight: 700; color: #0f172a; font-family: monospace; }
    .compliance { background: transparent; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; }
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
    ${o.status === 'REJECTED' ? '<div class="cancelled-stamp">CANCELLED</div>' : ''}
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
          <div class="meta-row"><span class="meta-lbl">Order Ref:</span><span class="meta-val">#${o.id}</span></div>
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
        <div class="grid-name">${o.customer_name || `Customer #${o.customer ?? '—'}`}</div>
        ${o.customer_phone ? `<div class="grid-row"><span>Phone:</span><b>${o.customer_phone}</b></div>` : ''}
        <div class="grid-row">
          <span>Address:</span>
          <b>${o.order_type === 'DELIVERY' ? o.delivery_address || 'Home Delivery' : 'Store Counter Pickup'}</b>
        </div>
        ${o.delivery_pincode ? `<div class="grid-row"><span>PIN Code:</span><b>${o.delivery_pincode}</b></div>` : ''}
      </div>

      <div class="grid-col">
        <div class="grid-hdr">Fulfillment Details</div>
        <div class="grid-row"><span>Mode:</span><b>${o.order_type === 'DELIVERY' ? 'Home Delivery' : 'Store Pickup'}</b></div>
        ${o.delivery_slot_label ? `<div class="grid-row"><span>Slot:</span><b style="color:#4f46e5;">${o.delivery_slot_date || ''} (${o.delivery_slot_label})</b></div>` : ''}
        <div class="grid-row"><span>Order Status:</span><b style="color:${o.status === 'COMPLETED' ? '#059669' : o.status === 'REJECTED' ? '#e11d48' : '#334155'};">${o.status}</b></div>
        <div class="grid-row"><span>Payment Status:</span><b style="color:#059669;">${o.status === 'COMPLETED' ? 'PAID' : o.status === 'REJECTED' ? 'CANCELLED' : 'DUE AT DELIVERY'}</b></div>
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
          <span>Subtotal (${items.filter((i) => i.status !== 'REJECTED').length} items)</span>
          <b>₹${items.filter((i) => i.status !== 'REJECTED').reduce((acc, item) => acc + (parseFloat(item.subtotal) || 0), 0).toFixed(2)}</b>
        </div>
        ${parseFloat(o.discount_applied || '0') > 0 ? `<div class="tot-row" style="color:#4f46e5;"><span>Product Savings</span><b>-₹${parseFloat(o.discount_applied || '0').toFixed(2)}</b></div>` : ''}
        ${parseFloat(o.promo_discount || '0') > 0 ? `<div class="tot-row" style="color:#059669;"><span>Promo Code Discount</span><b>-₹${parseFloat(o.promo_discount || '0').toFixed(2)}</b></div>` : ''}
        ${parseFloat(o.packaging_fee || '0') > 0 ? `<div class="tot-row"><span>Packaging Charges</span><b>₹${parseFloat(o.packaging_fee || '0').toFixed(2)}</b></div>` : ''}
        ${o.order_type === 'DELIVERY' ? `<div class="tot-row"><span>Delivery Charges</span><b>${parseFloat(o.delivery_fee || '0') > 0 ? `₹${parseFloat(o.delivery_fee || '0').toFixed(2)}` : 'FREE'}</b></div>` : ''}
        ${parseFloat(o.wallet_discount || '0') > 0 ? `<div class="tot-row" style="color:#059669;font-weight:700;"><span>Wallet Applied</span><b>-₹${parseFloat(o.wallet_discount || '0').toFixed(2)}</b></div>` : ''}
        <div class="tot-row" style="border-top:1px solid #f1f5f9;padding-top:6px;">
          <span>Payment Mode</span>
          <b style="text-align:right;">${methodText}</b>
        </div>
        <div class="tot-grand">
          <span>${o.status === 'COMPLETED' ? 'TOTAL AMOUNT PAID' : 'TOTAL AMOUNT DUE'}</span>
          <span class="big">₹${parseFloat(o.total_amount).toFixed(2)}</span>
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

  const handlePrintOrShare = async () => {
    if (!order) return;
    if (Platform.OS === 'web') {
      window.print();
      return;
    }
    let html: string = '';
    try {
      const res = await api.get(`/orders/${order.id}/invoice/`);
      if (res.data?.html) {
        html = res.data.html;
      }
    } catch {
      // Fallback to local builder if offline or API error
    }
    if (!html) {
      html = buildInvoiceHtml(order);
    }

    try {
      await Print.printAsync({ html });
    } catch {
      try {
        const cleanId = String(order.id).replace(/^#/, '');
        const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Tax Invoice INV-${cleanId}`,
          });
          return;
        }
      } catch {
        // Fallback to text share
        const itemsText = (order.items || [])
          .map(
            (it) =>
              `• ${it.product_name_snapshot} (${it.unit_snapshot || ''}) x${it.quantity} = ₹${it.subtotal}`
          )
          .join('\n');
        const message =
          `TAX INVOICE - ${storeSettings?.store_name || 'Narendra Kirana'}\n` +
          `Invoice #: INV-${order.id}\n` +
          `Customer: ${order.customer_name || 'Walk-in'}\n` +
          `Total: ₹${order.total_amount}\n\n` +
          `ITEMS:\n${itemsText}\n\n` +
          `Thank you for shopping with us!`;
        Share.share({ message }).catch(() => {});
      }
    }
  };

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
            {/* Row 1: Order # on left, Amount on right */}
            <View style={styles.compactOrderHeaderRow}>
              <View style={styles.compactOrderIdCol}>
                <Text style={[styles.compactOrderId, { color: colors.text }]} selectable>
                  Order #{order.id}
                </Text>
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

            {/* Row 2: Badges & Time on left, Tax Invoice Action on right */}
            <View style={styles.compactOrderSubRow}>
              <View style={styles.compactSubBadgesLeft}>
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
                {order.created_at ? (
                  <Text style={[styles.orderCreatedTime, { color: colors.textMuted }]}>
                    {new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                    })},{' '}
                    {new Date(order.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                style={[
                  styles.invoiceNavBtn,
                  {
                    backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5',
                    borderColor: '#10b981',
                  },
                ]}
                onPress={() => setShowInvoiceModal(true)}
              >
                <Ionicons name="receipt-outline" size={13} color="#10b981" />
                <Text style={styles.invoiceNavBtnText}>Tax Invoice</Text>
              </TouchableOpacity>
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
                          isRejected
                            ? { color: '#e11d48' }
                            : { color: colors.text },
                        ]}
                      >
                        {isRejected ? '₹0.00' : `₹${item.subtotal}`}
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

      {/* Official In-Place Tax Invoice Modal */}
      <Modal visible={showInvoiceModal} transparent animationType="slide">
        <View style={styles.invoiceModalBackdrop}>
          <View style={[styles.invoiceModalCard, { backgroundColor: '#ffffff' }]}>
            {/* Modal Controls Header */}
            <View style={styles.invoiceModalHeader}>
              <View style={styles.invoiceModalHeaderLeft}>
                <Ionicons name="document-text" size={18} color="#059669" />
                <Text
                  style={styles.invoiceModalHeaderTitle}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Tax Invoice #{order.id}
                </Text>
              </View>
              <View style={styles.invoiceModalHeaderActions}>
                <TouchableOpacity
                  style={styles.modalPrintBtn}
                  onPress={handlePrintOrShare}
                >
                  <Ionicons name="print-outline" size={14} color="#fff" />
                  <Text style={styles.modalPrintBtnText}>Print</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setShowInvoiceModal(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Printable Document Body */}
            <ScrollView
              style={styles.invoicePrintScroll}
              contentContainerStyle={{ paddingBottom: 30 }}
              showsVerticalScrollIndicator={false}
            >
              {(() => {
                const orderDateFormatted = formatFullDateTime(order.created_at);
                const invoiceDateFormatted = formatFullDateTime(new Date());
                const invoiceNum = formatInvoiceNumber(order);
                const isRejected = order.status === 'REJECTED';
                const isCompleted = order.status === 'COMPLETED';
                const rawMethod = (order.payment_method || 'COD').toUpperCase();
                let methodText = 'Cash on Delivery (COD)';
                if (rawMethod === 'UPI') {
                  methodText = order.upi_transaction_id ? `UPI (Ref: ${order.upi_transaction_id})` : 'UPI Instant Payment';
                } else if (order.order_type === 'PICKUP' && rawMethod === 'COD') {
                  methodText = 'Cash at Store Counter';
                }

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
                              <Text style={styles.docMetaVal}>{invoiceNum}</Text>
                            </View>
                            <View style={styles.docMetaRow}>
                              <Text style={styles.docMetaLabel}>Invoice Date:</Text>
                              <Text style={styles.docMetaValSimple}>{invoiceDateFormatted}</Text>
                            </View>
                            <View style={styles.docMetaRow}>
                              <Text style={styles.docMetaLabel}>Order Reference:</Text>
                              <Text style={styles.docMetaVal}>#{order.id}</Text>
                            </View>
                            <View style={styles.docMetaRow}>
                              <Text style={styles.docMetaLabel}>Order Date:</Text>
                              <Text style={styles.docMetaValSimple}>{orderDateFormatted}</Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* Compliance Strip (GSTIN & FSSAI) */}
                      {Boolean(storeSettings?.gstin || storeSettings?.fssai_license_number) && (
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

                      {/* Customer & Fulfillment Info Grid (2 Columns) */}
                      <View style={styles.infoGridRow}>
                        {/* Billed / Shipped To */}
                        <View style={styles.infoGridCard}>
                          <Text style={styles.infoGridHeader}>BILLED / SHIPPED TO</Text>
                          <Text style={styles.infoGridName}>
                            {order.customer_name || `Customer ID: ${order.customer ?? '—'}`}
                          </Text>
                          {order.customer_phone ? (
                            <View style={styles.infoSubRow}>
                              <Ionicons name="call-outline" size={12} color="#94a3b8" />
                              <Text style={styles.invoiceCustomerPhone}>{order.customer_phone}</Text>
                            </View>
                          ) : null}
                          <View style={{ paddingTop: 3 }}>
                            <Text style={styles.infoAddressText}>
                              {order.order_type === 'DELIVERY'
                                ? order.delivery_address || 'Home Delivery Address'
                                : 'Store Counter Pickup'}
                            </Text>
                            {order.delivery_pincode ? (
                              <Text style={styles.infoPinText}>PIN: {order.delivery_pincode}</Text>
                            ) : null}
                          </View>
                        </View>

                        {/* Fulfillment Details */}
                        <View style={styles.infoGridCard}>
                          <Text style={styles.infoGridHeader}>FULFILLMENT DETAILS</Text>
                          <View style={styles.infoDetailLine}>
                            <Text style={styles.infoDetailLabel}>Fulfillment Mode:</Text>
                            <Text style={styles.infoDetailVal}>
                              {order.order_type === 'DELIVERY' ? 'Home Delivery' : 'Store Pickup'}
                            </Text>
                          </View>
                          {order.delivery_slot_label ? (
                            <View style={styles.infoDetailLine}>
                              <Text style={styles.infoDetailLabel}>Scheduled Slot:</Text>
                              <Text style={[styles.infoDetailVal, { color: '#4338ca', fontWeight: '800' }]}>
                                {order.delivery_slot_date ? `${order.delivery_slot_date} ` : ''}
                                ({order.delivery_slot_label})
                              </Text>
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
                              {order.status}
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

                        {(order.items || []).map((item: any, idx: number) => {
                          const qty = Number(item.quantity || 1);
                          const price = parseFloat(item.price_snapshot) || 0;
                          const lineTotal = parseFloat(item.subtotal) || price * qty;
                          const isRej = item.status === 'REJECTED';

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
                              <Text style={styles.totalLineVal}>₹{itemsSubtotal}</Text>
                            </View>

                            {parseFloat(order.discount_applied || '0') > 0 ? (
                              <View style={styles.totalLineRow}>
                                <Text style={[styles.totalLineLabel, { color: '#4338ca' }]}>Product Savings</Text>
                                <Text style={[styles.totalLineVal, { color: '#4338ca' }]}>
                                  -₹{parseFloat(order.discount_applied || '0').toFixed(2)}
                                </Text>
                              </View>
                            ) : null}

                            {parseFloat(order.promo_discount || '0') > 0 ? (
                              <View style={styles.totalLineRow}>
                                <Text style={[styles.totalLineLabel, { color: '#047857' }]}>Promo Discount</Text>
                                <Text style={[styles.totalLineVal, { color: '#047857' }]}>
                                  -₹{parseFloat(order.promo_discount || '0').toFixed(2)}
                                </Text>
                              </View>
                            ) : null}

                            {parseFloat(order.packaging_fee || '0') > 0 ? (
                              <View style={styles.totalLineRow}>
                                <Text style={styles.totalLineLabel}>Packaging Fee</Text>
                                <Text style={styles.totalLineVal}>
                                  ₹{parseFloat(order.packaging_fee || '0').toFixed(2)}
                                </Text>
                              </View>
                            ) : null}

                            {order.order_type === 'DELIVERY' ? (
                              <View style={styles.totalLineRow}>
                                <Text style={styles.totalLineLabel}>Delivery Fee</Text>
                                <Text style={styles.totalLineVal}>
                                  {parseFloat(order.delivery_fee || '0') > 0
                                    ? `₹${parseFloat(order.delivery_fee || '0').toFixed(2)}`
                                    : 'FREE'}
                                </Text>
                              </View>
                            ) : null}

                            {parseFloat(order.wallet_discount || '0') > 0 ? (
                              <View style={styles.totalLineRow}>
                                <Text style={[styles.totalLineLabel, { color: '#047857' }]}>Wallet Applied</Text>
                                <Text style={[styles.totalLineVal, { color: '#047857' }]}>
                                  -₹{parseFloat(order.wallet_discount || '0').toFixed(2)}
                                </Text>
                              </View>
                            ) : null}

                            <View style={[styles.totalLineRow, { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 5 }]}>
                              <Text style={styles.totalLineLabel}>Payment Mode</Text>
                              <Text style={[styles.totalLineVal, { textAlign: 'right' }]}>{methodText}</Text>
                            </View>
                          </View>

                          <View style={styles.grandTotalBanner}>
                            <Text style={styles.grandTotalBannerLabel}>
                              {order.status === 'COMPLETED' ? 'TOTAL AMOUNT PAID' : 'TOTAL AMOUNT DUE'}
                            </Text>
                            <Text style={styles.grandTotalBannerAmount}>
                              ₹{parseFloat(order.total_amount).toFixed(2)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Footer & Signature */}
                      <View style={styles.docFooterRow}>
                        <View style={styles.docTermsCol}>
                          <View style={styles.docTermsHeader}>
                            <Ionicons name="checkmark-circle-outline" size={13} color="#059669" />
                            <Text style={styles.docTermsTitle}>TERMS & CONDITIONS</Text>
                          </View>
                          {termsLines.map((termLine: string, idx: number) => (
                            <Text key={idx} style={styles.docTermLine}>
                              {termLine}
                            </Text>
                          ))}
                          <Text style={styles.docStoreGreeting}>
                            Thank you for shopping with {storeSettings?.store_name || 'Narendra Kirana Store'}!
                          </Text>
                        </View>

                        <View style={styles.docSigCol}>
                          <Text style={styles.docSigForStore}>
                            For {storeSettings?.store_name || 'Narendra Kirana Store'}
                          </Text>
                          <View style={styles.docSigBox}>
                            {storeSettings?.invoice_signature ? (
                              <Image
                                source={{ uri: storeSettings.invoice_signature }}
                                style={styles.docSigImg}
                                contentFit="contain"
                              />
                            ) : (
                              <View style={styles.docSigDashedLine} />
                            )}
                          </View>
                          <Text style={styles.docSigLabel}>Authorized Signatory</Text>
                          <Text style={styles.docSigSubLabel}>COMPUTER GENERATED INVOICE</Text>
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

const styles: any = StyleSheet.create({
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
  compactOrderIdCol: {
    flex: 1,
    gap: 2,
  },
  compactOrderId: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  compactTotalAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#10b981',
  },
  compactOrderSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  compactSubBadgesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderCreatedTime: {
    fontSize: 11,
    fontWeight: '600',
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
  invoiceNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  invoiceNavBtnText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '800',
  },
  invoiceModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  invoiceModalCard: {
    width: '100%',
    maxWidth: 580,
    maxHeight: '90%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  invoiceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  invoiceModalHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
  },
  invoiceModalHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flexShrink: 1,
  },
  invoiceModalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
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
  modalCloseBtn: {
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  invoicePrintScroll: {
    padding: 16,
  },
  paperContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
    overflow: 'hidden',
  },
  cancelledStampWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 50,
  },
  cancelledStampBox: {
    borderWidth: 5,
    borderColor: '#e11d48',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 10,
    transform: [{ rotate: '-15deg' }],
    opacity: 0.25,
  },
  cancelledStampText: {
    color: '#e11d48',
    fontSize: 42,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 16,
    marginBottom: 14,
    gap: 8,
  },
  docStoreCol: {
    flex: 1,
    alignItems: "flex-start",
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
    alignItems: "flex-end",
    gap: 4,
  },
  docMetaHeadingRow: {
    alignItems: "flex-end",
    gap: 2,
  },
  docTaxInvoiceHeading: {
    fontSize: 16,
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
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
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
  invoiceCustomerPhone: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  infoAddressText: {
    fontSize: 10.5,
    color: '#475569',
    lineHeight: 15,
  },
  infoPinText: {
    fontSize: 9.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#64748b',
    marginTop: 2,
  },
  infoDetailLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  infoDetailLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  infoDetailVal: {
    fontSize: 10,
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
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 0.5,
  },
  tableBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  tableBodyRowRejected: {
    backgroundColor: '#fff1f2',
    opacity: 0.7,
  },
  tableCellNum: {
    width: 24,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  tableItemTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  tableCellItemName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  tableCellItemUnit: {
    fontSize: 9.5,
    color: '#64748b',
    marginTop: 1,
  },
  unavailableBadge: {
    backgroundColor: '#ffe4e6',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  unavailableBadgeText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#e11d48',
  },
  tableCellQty: {
    width: 34,
    textAlign: 'center',
    fontSize: 10.5,
    fontWeight: '700',
    color: '#334155',
  },
  tableCellRate: {
    width: 58,
    textAlign: 'right',
    fontSize: 10.5,
    color: '#334155',
  },
  tableCellTotal: {
    width: 68,
    textAlign: 'right',
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0f172a',
  },

  // Totals Section
  totalsSection: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  totalsCard: {
    width: 280,
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
  totalLineLabel: {
    fontSize: 10.5,
    color: '#475569',
  },
  totalLineVal: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  grandTotalBanner: {
    backgroundColor: '#ecfdf5',
    borderTopWidth: 2,
    borderTopColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalBannerLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#065f46',
    letterSpacing: 0.5,
  },
  grandTotalBannerAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#047857',
  },

  // Footer & Signature
  docFooterRow: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  docTermsCol: {
    flex: 1,
    gap: 3,
  },
  docTermsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  docTermsTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#334155',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  docTermLine: {
    fontSize: 9.5,
    color: '#64748b',
    lineHeight: 13,
  },
  docStoreGreeting: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#047857',
    marginTop: 4,
  },
  docSigCol: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    minWidth: 120,
  },
  docSigForStore: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  docSigBox: {
    height: 38,
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 2,
  },
  docSigImg: {
    width: 100,
    height: 36,
  },
  docSigDashedLine: {
    width: 110,
    borderBottomWidth: 1,
    borderBottomColor: '#94a3b8',
    borderStyle: 'dashed',
    marginTop: 20,
  },
  docSigLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0f172a',
  },
  docSigSubLabel: {
    fontSize: 7.5,
    color: '#94a3b8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 1,
  },
});
