import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Platform,
  Share,
  Alert
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { AppNavigationProp } from '../../navigation/types';
import { theme } from '../../constants/theme';
import { apiClient } from '../../api/client';
import { fixImageUrl } from '../../utils/image';

export function InvoiceScreen({ navigation, route }: { navigation: AppNavigationProp, route: any }) {
  const { orderId } = route.params || {};
  const [order, setOrder] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoiceData();
  }, [orderId]);

  const fetchInvoiceData = async () => {
    try {
      setLoading(true);
      const [orderRes, settingsRes] = await Promise.all([
        apiClient.get(`/orders/${orderId}/`),
        apiClient.get('/store/settings/').catch(() => ({ data: {} }))
      ]);
      setOrder(orderRes.data);
      setSettings(settingsRes.data || {});
    } catch (err) {
      console.error('Failed to load invoice details:', err);
      setError('Failed to load invoice details.');
    } finally {
      setLoading(false);
    }
  };

  // Helper formatting
  const orderDateObj = order?.created_at ? new Date(order.created_at) : new Date();
  const isOrderDateValid = !isNaN(orderDateObj.getTime());
  const orderDate = isOrderDateValid 
    ? orderDateObj.toLocaleDateString('en-IN', { 
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      }) 
    : 'N/A';

  const invoiceDateObj = new Date();
  const invoiceDate = invoiceDateObj.toLocaleDateString('en-IN', { 
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  const orderYear = isOrderDateValid ? orderDateObj.getFullYear() : invoiceDateObj.getFullYear();
  const invoiceNumber = `INV-${orderYear}-${String(order?.id || '').padStart(5, '0')}`;
  const isDelivery = order?.order_type === 'DELIVERY';
  const isRejected = order?.status === 'REJECTED';

  const validItems = (order?.items || []).filter((i: any) => i.status !== 'REJECTED');
  const subtotal = validItems.reduce((acc: number, item: any) => {
    return acc + parseFloat(item.subtotal || item.price_snapshot || '0');
  }, 0);

  const signatureUrl = fixImageUrl(settings?.invoice_signature);

  // Generate HTML for printable PDF exactly matching web app
  const generateInvoiceHtml = () => {
    const itemsHtml = (order?.items || []).map((item: any, index: number) => {
      const rejected = item.status === 'REJECTED';
      const name = item.product_name_snapshot || item.product_name || 'Product';
      const unit = item.unit_snapshot || '';
      const price = parseFloat(item.price_snapshot || item.price_at_order || '0').toFixed(2);
      const itemSubtotal = rejected ? '0.00' : parseFloat(item.subtotal || item.price_snapshot || '0').toFixed(2);

      return `
        <tr style="border-bottom: 1px solid #E2E8F0; ${rejected ? 'opacity: 0.5;' : ''}">
          <td style="padding: 12px 8px; text-align: center; color: #94A3B8; font-weight: bold;">${index + 1}</td>
          <td style="padding: 12px 8px;">
            <div style="font-weight: bold; color: ${rejected ? '#64748B; text-decoration: line-through;' : '#0F172A;'}">${name}</div>
            ${unit ? `<div style="font-size: 11px; color: #64748B; margin-top: 2px;">${unit}</div>` : ''}
            ${rejected ? '<span style="font-size: 9px; font-weight: 900; color: #E11D48; background: #FFF1F2; border: 1px solid #FECDD3; padding: 2px 4px; border-radius: 4px; text-transform: uppercase;">Unavailable</span>' : ''}
          </td>
          <td style="padding: 12px 8px; text-align: center; font-weight: 600; ${rejected ? 'text-decoration: line-through; color: #64748B;' : 'color: #334155;'}">${item.quantity}</td>
          <td style="padding: 12px 8px; text-align: right; ${rejected ? 'text-decoration: line-through; color: #64748B;' : 'color: #334155;'}">₹${price}</td>
          <td style="padding: 12px 8px; text-align: right; font-weight: bold; ${rejected ? 'text-decoration: line-through; color: #64748B;' : 'color: #0F172A;'}">₹${itemSubtotal}</td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice - ${invoiceNumber}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; margin: 0; padding: 0; background: #FFF; }
          .container { max-width: 800px; margin: auto; padding: 20px; box-sizing: border-box; position: relative; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #064E3B; padding-bottom: 20px; margin-bottom: 25px; }
          .store-brand { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; margin: 0 0 6px 0; }
          .store-brand span.green { color: #064E3B; }
          .store-brand span.red { color: #DC2626; }
          .store-info { font-size: 13px; color: #475569; line-height: 1.5; }
          .invoice-title { font-size: 42px; font-weight: 900; color: #CBD5E1; letter-spacing: 4px; margin: 0; text-transform: uppercase; }
          .info-grid { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 30px; }
          .info-card { background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 8px; padding: 16px; flex: 1; font-size: 13px; }
          .info-label { font-size: 10px; font-weight: bold; color: #94A3B8; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
          .info-title { font-size: 16px; font-weight: bold; color: #0F172A; margin: 0 0 6px 0; }
          .meta-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
          .meta-row:last-child { margin-bottom: 0; }
          .meta-key { color: #64748B; font-weight: 500; }
          .meta-val { color: #0F172A; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
          th { background: #F1F5F9; border-top: 1px solid #CBD5E1; border-bottom: 2px solid #CBD5E1; padding: 10px 8px; text-transform: uppercase; font-size: 11px; font-weight: bold; color: #334155; text-align: left; }
          .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 40px; }
          .totals-box { width: 340px; font-size: 13px; }
          .total-line { display: flex; justify-content: space-between; padding: 5px 0; color: #475569; }
          .total-line.border-top { border-top: 1px solid #E2E8F0; }
          .final-total { display: flex; justify-content: space-between; align-items: center; background: #ECFDF5; border-top: 3px solid #064E3B; padding: 12px 16px; margin-top: 8px; border-radius: 6px; }
          .final-total-label { font-weight: 900; color: #064E3B; font-size: 14px; letter-spacing: 1px; }
          .final-total-amount { font-weight: 900; color: #064E3B; font-size: 22px; }
          .footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #E2E8F0; padding-top: 25px; margin-top: 20px; font-size: 12px; }
          .terms { max-width: 360px; color: #64748B; line-height: 1.5; }
          .terms h4 { color: #0F172A; text-transform: uppercase; font-size: 11px; margin: 0 0 6px 0; }
          .signature-box { text-align: right; width: 200px; }
          .signature-line { border-bottom: 1px solid #94A3B8; height: 50px; display: flex; align-items: flex-end; justify-content: flex-end; padding-bottom: 4px; margin-bottom: 6px; }
          .signature-text { font-style: italic; font-size: 18px; color: #475569; font-family: cursive, serif; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div>
              <h1 class="store-brand"><span class="green">NARENDRA</span> <span class="red">KIRANA</span></h1>
              <div class="store-info">
                <div>${settings?.store_address || 'Main Road, Kirana Market'}</div>
                ${settings?.store_phone ? `<div>Phone: ${settings.store_phone}</div>` : ''}
                ${settings?.store_email ? `<div>Email: ${settings.store_email}</div>` : ''}
              </div>
            </div>
            <div>
              <h2 class="invoice-title">INVOICE</h2>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-card">
              <div class="info-label">BILLED TO</div>
              <div class="info-title">${order?.customer_name || `Customer #${order?.customer || ''}`}</div>
              <div style="color: #475569; margin-bottom: 4px;">Status: <strong>${order?.status}</strong></div>
              <div style="color: #475569; margin-bottom: 6px;">Order Type: <strong style="color: ${isDelivery ? '#4F46E5' : '#0F172A'};">${isDelivery ? 'HOME DELIVERY' : 'STORE PICKUP'}</strong></div>
              <div style="color: #64748B;">
                ${isDelivery ? (order?.delivery_address || 'Address not specified') + (order?.delivery_pincode ? `<br>Pincode: ${order.delivery_pincode}` : '') : `Pickup Time: ${order?.pickup_time || 'As soon as possible'}`}
              </div>
            </div>

            <div class="info-card">
              <div class="meta-row">
                <span class="meta-key">Invoice No:</span>
                <span class="meta-val">${invoiceNumber}</span>
              </div>
              <div class="meta-row">
                <span class="meta-key">Invoice Date:</span>
                <span class="meta-val">${invoiceDate}</span>
              </div>
              <div class="meta-row">
                <span class="meta-key">Order Date:</span>
                <span class="meta-val">${orderDate}</span>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">#</th>
                <th>Item Description</th>
                <th style="width: 50px; text-align: center;">Qty</th>
                <th style="width: 80px; text-align: right;">Price</th>
                <th style="width: 90px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals-wrap">
            <div class="totals-box">
              <div class="total-line">
                <span>Subtotal</span>
                <span style="font-weight: 600; color: #0F172A;">₹${subtotal.toFixed(2)}</span>
              </div>

              ${parseFloat(order?.discount_applied || '0') > 0 ? `
                <div class="total-line total-line.border-top" style="color: #4F46E5;">
                  <span>Product Savings</span>
                  <span style="font-weight: bold;">-₹${parseFloat(order.discount_applied).toFixed(2)}</span>
                </div>
              ` : ''}

              ${parseFloat(order?.promo_discount || '0') > 0 ? `
                <div class="total-line total-line.border-top" style="color: #059669;">
                  <span>Promo Discount</span>
                  <span style="font-weight: bold;">-₹${parseFloat(order.promo_discount).toFixed(2)}</span>
                </div>
              ` : ''}

              ${parseFloat(order?.packaging_fee || '0') > 0 ? `
                <div class="total-line total-line.border-top">
                  <span>Packaging Fee</span>
                  <span style="font-weight: 600; color: #0F172A;">₹${parseFloat(order.packaging_fee).toFixed(2)}</span>
                </div>
              ` : ''}

              ${isDelivery ? `
                <div class="total-line total-line.border-top">
                  <span>Delivery Fee</span>
                  <span style="font-weight: 600; color: #0F172A;">${parseFloat(order?.delivery_fee || '0') > 0 ? `₹${parseFloat(order.delivery_fee).toFixed(2)}` : 'FREE'}</span>
                </div>
              ` : ''}

              ${parseFloat(order?.wallet_discount || '0') > 0 ? `
                <div class="total-line total-line.border-top" style="color: #059669;">
                  <span>Wallet Applied</span>
                  <span style="font-weight: bold;">-₹${parseFloat(order.wallet_discount).toFixed(2)}</span>
                </div>
              ` : ''}

              <div class="total-line total-line.border-top">
                <span>Payment Method</span>
                <span style="font-weight: bold; color: #0F172A;">
                  ${parseFloat(order?.total_amount || '0') === 0 
                    ? 'Wallet Full' 
                    : (parseFloat(order?.wallet_discount || '0') > 0 
                        ? 'Hybrid (Wallet + Cash)' 
                        : (isDelivery ? 'Cash on Delivery' : 'Cash at Store'))}
                </span>
              </div>

              <div class="final-total">
                <span class="final-total-label">${order?.status === 'COMPLETED' ? 'TOTAL PAID' : 'TOTAL DUE'}</span>
                <span class="final-total-amount">₹${parseFloat(order?.total_amount || '0').toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <div class="terms">
              <h4>Terms & Information</h4>
              <div>1. Please keep this invoice for your records.</div>
              <div>2. Goods sold are non-refundable without valid receipt.</div>
              <div style="font-weight: bold; color: #0F172A; margin-top: 6px;">Thank you for your business!</div>
            </div>

            <div class="signature-box">
              <div class="signature-line">
                ${signatureUrl ? `<img src="${signatureUrl}" style="max-height: 40px; object-fit: contain;" />` : `<span class="signature-text">${settings?.store_name || 'Authorized'}</span>`}
              </div>
              <div style="font-weight: bold; color: #0F172A; font-size: 13px;">Authorized Signatory</div>
              <div style="font-size: 10px; color: #64748B; text-transform: uppercase; letter-spacing: 1px;">Narendra Kirana</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Direct Download PDF Handler with custom filename (e.g. Invoice_ORD-2609-0001.pdf)
  const handleDownloadPdf = async () => {
    if (downloading || !order) return;

    const fileName = `Invoice_${order.id || orderId}.pdf`;

    if (Platform.OS === 'web') {
      // In web browser, trigger native print / Save as PDF
      if (typeof window !== 'undefined' && window.print) {
        window.print();
      }
      return;
    }

    try {
      setDownloading(true);
      const html = generateInvoiceHtml();
      const { uri, base64 } = await Print.printToFileAsync({ html, base64: true });

      // On Android, attempt direct save to chosen folder via StorageAccessFramework
      if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
        try {
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const directoryUri = permissions.directoryUri;
            const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
              directoryUri,
              fileName,
              'application/pdf'
            );
            if (base64) {
              await FileSystem.writeAsStringAsync(newFileUri, base64, {
                encoding: FileSystem.EncodingType.Base64,
              });
            } else {
              const fileContent = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              await FileSystem.writeAsStringAsync(newFileUri, fileContent, {
                encoding: FileSystem.EncodingType.Base64,
              });
            }
            Alert.alert('Download Complete', `Invoice saved to your storage as ${fileName}`);
            return;
          }
        } catch (safErr) {
          console.log('SAF prompt dismissed, saving to App Documents and sharing:', safErr);
        }
      }

      // Direct copy to documents directory with the exact custom filename
      const targetUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: uri, to: targetUri });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(targetUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Download ${fileName}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Download Complete', `Invoice saved as ${fileName}`);
      }
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      Alert.alert('Error', 'Failed to generate invoice PDF.');
    } finally {
      setDownloading(false);
    }
  };

  // Share Receipt Summary Handler
  const handleShareReceipt = async () => {
    if (!order) return;
    try {
      const itemsText = (order.items || [])
        .filter((i: any) => i.status !== 'REJECTED')
        .map((i: any) => `• ${i.quantity}x ${i.product_name_snapshot || i.product_name} - ₹${parseFloat(i.subtotal || i.price_snapshot).toFixed(2)}`)
        .join('\n');

      const message = `🧾 *INVOICE: ${invoiceNumber}*\n` +
        `🏪 *Store:* ${settings?.store_name || 'Narendra Kirana Store'}\n` +
        `📅 *Date:* ${orderDate}\n` +
        `📦 *Type:* ${isDelivery ? 'Home Delivery' : 'Store Pickup'}\n\n` +
        `*Items Ordered:*\n${itemsText}\n\n` +
        `💰 *Total Paid:* ₹${parseFloat(order.total_amount).toFixed(2)}\n\n` +
        `Thank you for shopping with Narendra Kirana!`;

      await Share.share({ message });
    } catch (err) {
      console.error('Error sharing receipt:', err);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoice</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading invoice...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoice</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>{error || 'Could not load invoice'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice</Text>
        <TouchableOpacity 
          style={styles.headerActionBtn} 
          onPress={handleDownloadPdf}
          disabled={downloading}
        >
          {downloading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Feather name="printer" size={20} color={theme.colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Action Buttons Row: Download / Print PDF & Share Receipt matching web app */}
        <View style={styles.actionBar}>
          <TouchableOpacity 
            style={styles.downloadPdfButton} 
            onPress={handleDownloadPdf}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather name="printer" size={18} color="#FFFFFF" />
            )}
            <Text style={styles.downloadPdfButtonText}>
              {Platform.OS === 'web' ? 'Download / Print PDF' : (downloading ? 'Generating PDF...' : 'Download PDF Receipt')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.shareButton} 
            onPress={handleShareReceipt}
          >
            <Feather name="share-2" size={18} color="#0F172A" />
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Printable A4 Container exactly matching web app */}
        <View style={styles.invoicePaper}>
          
          {/* Watermark Logo / Background */}
          <View style={styles.watermarkContainer}>
            <Text style={styles.watermarkText}>NARENDRA KIRANA</Text>
          </View>

          {isRejected && (
            <View style={styles.rejectedWatermark}>
              <Text style={styles.rejectedWatermarkText}>REJECTED</Text>
            </View>
          )}

          {/* Header Section */}
          <View style={styles.brandHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.storeName}>
                <Text style={{ color: '#064E3B' }}>NARENDRA </Text>
                <Text style={{ color: '#DC2626' }}>KIRANA</Text>
              </Text>
              {settings?.store_address ? (
                <Text style={styles.storeDetailText}>{settings.store_address}</Text>
              ) : (
                <Text style={styles.storeDetailText}>Main Road, Kirana Market</Text>
              )}
              {settings?.store_phone ? (
                <Text style={styles.storeDetailText}>Phone: {settings.store_phone}</Text>
              ) : null}
              {settings?.store_email ? (
                <Text style={styles.storeDetailText}>Email: {settings.store_email}</Text>
              ) : null}
            </View>
            <View style={styles.invoiceTitleBox}>
              <Text style={styles.invoiceTitleText}>INVOICE</Text>
            </View>
          </View>

          <View style={styles.thickDivider} />

          {/* Info Grid Section */}
          <View style={styles.infoGrid}>
            <View style={styles.billedToCol}>
              <Text style={styles.metaSectionLabel}>BILLED TO</Text>
              <Text style={styles.customerName}>
                {order.customer_name || `Customer #${order.customer || ''}`}
              </Text>
              <Text style={styles.statusLine}>
                Order Status: <Text style={[styles.statusText, isRejected && { color: theme.colors.error }]}>{order.status}</Text>
              </Text>
              <Text style={styles.orderTypeLine}>
                Order Type: <Text style={{ fontWeight: 'bold', color: isDelivery ? '#4F46E5' : '#0F172A' }}>
                  {isDelivery ? 'HOME DELIVERY' : 'STORE PICKUP'}
                </Text>
              </Text>
              {isDelivery ? (
                <Text style={styles.addressLine}>
                  {order.delivery_address || 'Address not specified'}
                  {order.delivery_pincode ? `\nPincode: ${order.delivery_pincode}` : ''}
                </Text>
              ) : (
                <Text style={styles.addressLine}>
                  Pickup Time: {order.pickup_time || 'As soon as possible'}
                </Text>
              )}
            </View>

            <View style={styles.invoiceMetaCol}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Invoice No:</Text>
                <Text style={styles.metaValue} numberOfLines={1}>{invoiceNumber}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Invoice Date:</Text>
                <Text style={styles.metaValue}>{invoiceDate}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Order Date:</Text>
                <Text style={styles.metaValue}>{orderDate}</Text>
              </View>
            </View>
          </View>

          {/* Items Table */}
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { width: 28, textAlign: 'center' }]}>#</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Item Description</Text>
              <Text style={[styles.tableHeaderCell, { width: 40, textAlign: 'center' }]}>Qty</Text>
              <Text style={[styles.tableHeaderCell, { width: 65, textAlign: 'right' }]}>Price</Text>
              <Text style={[styles.tableHeaderCell, { width: 75, textAlign: 'right' }]}>Amount</Text>
            </View>

            {(order.items || []).map((item: any, index: number) => {
              const itemRejected = item.status === 'REJECTED';
              const name = item.product_name_snapshot || item.product_name || 'Product';
              const unit = item.unit_snapshot;
              const price = parseFloat(item.price_snapshot || item.price_at_order || '0').toFixed(2);
              const total = itemRejected ? '0.00' : parseFloat(item.subtotal || item.price_snapshot || '0').toFixed(2);

              return (
                <View key={item.id || index} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, { width: 28, textAlign: 'center', color: '#94A3B8' }]}>
                    {index + 1}
                  </Text>
                  <View style={{ flex: 1, paddingRight: 4 }}>
                    <Text style={[styles.tableCellName, itemRejected && styles.lineThrough]}>
                      {name}
                    </Text>
                    {unit ? <Text style={styles.tableCellUnit}>{unit}</Text> : null}
                    {itemRejected && (
                      <View style={styles.unavailableBadge}>
                        <Text style={styles.unavailableBadgeText}>Unavailable</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.tableCell, { width: 40, textAlign: 'center' }, itemRejected && styles.lineThrough]}>
                    {item.quantity}
                  </Text>
                  <Text style={[styles.tableCell, { width: 65, textAlign: 'right' }, itemRejected && styles.lineThrough]}>
                    ₹{price}
                  </Text>
                  <Text style={[styles.tableCellBold, { width: 75, textAlign: 'right' }, itemRejected && styles.lineThrough]}>
                    ₹{total}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Totals Section */}
          <View style={styles.totalsContainer}>
            <View style={styles.totalsBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
              </View>

              {parseFloat(order.discount_applied || '0') > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: '#4F46E5' }]}>Product Savings</Text>
                  <Text style={[styles.summaryValue, { color: '#4F46E5', fontWeight: 'bold' }]}>
                    -₹{parseFloat(order.discount_applied).toFixed(2)}
                  </Text>
                </View>
              )}

              {parseFloat(order.promo_discount || '0') > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: '#059669' }]}>Promo Discount</Text>
                  <Text style={[styles.summaryValue, { color: '#059669', fontWeight: 'bold' }]}>
                    -₹{parseFloat(order.promo_discount).toFixed(2)}
                  </Text>
                </View>
              )}

              {parseFloat(order.packaging_fee || '0') > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Packaging Fee</Text>
                  <Text style={styles.summaryValue}>₹{parseFloat(order.packaging_fee).toFixed(2)}</Text>
                </View>
              )}

              {isDelivery && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Delivery Fee</Text>
                  <Text style={styles.summaryValue}>
                    {parseFloat(order.delivery_fee || '0') > 0 ? `₹${parseFloat(order.delivery_fee).toFixed(2)}` : 'FREE'}
                  </Text>
                </View>
              )}

              {parseFloat(order.wallet_discount || '0') > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: '#059669' }]}>Wallet Applied</Text>
                  <Text style={[styles.summaryValue, { color: '#059669', fontWeight: 'bold' }]}>
                    -₹{parseFloat(order.wallet_discount).toFixed(2)}
                  </Text>
                </View>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Payment Method</Text>
                <Text style={[styles.summaryValue, { fontWeight: 'bold' }]}>
                  {parseFloat(order.total_amount || '0') === 0 
                    ? 'Wallet Full' 
                    : (parseFloat(order.wallet_discount || '0') > 0 
                        ? 'Hybrid (Wallet + Cash)' 
                        : (isDelivery ? 'Cash on Delivery' : 'Cash at Store'))}
                </Text>
              </View>

              <View style={styles.finalTotalBox}>
                <Text style={styles.finalTotalLabel}>
                  {order.status === 'COMPLETED' ? 'TOTAL PAID' : 'TOTAL DUE'}
                </Text>
                <Text style={styles.finalTotalAmount}>
                  ₹{parseFloat(order.total_amount || '0').toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* Footer & Signature */}
          <View style={styles.invoiceFooter}>
            <View style={styles.termsBox}>
              <View style={styles.termsHeader}>
                <Feather name="check-circle" size={14} color="#047857" />
                <Text style={styles.termsTitle}>Terms & Info</Text>
              </View>
              <Text style={styles.termText}>1. Please keep this invoice for your records.</Text>
              <Text style={styles.termText}>2. Goods sold are non-refundable without valid receipt.</Text>
              <Text style={styles.thankYouText}>Thank you for your business!</Text>
            </View>

            <View style={styles.signatureCol}>
              <View style={styles.signatureBox}>
                {signatureUrl ? (
                  <Image source={{ uri: signatureUrl }} style={styles.signatureImage} contentFit="contain" />
                ) : (
                  <Text style={styles.signaturePlaceholderText}>
                    {settings?.store_name || 'Authorized'}
                  </Text>
                )}
              </View>
              <Text style={styles.signatoryLabel}>Authorized Signatory</Text>
              <Text style={styles.signatoryStore}>Narendra Kirana</Text>
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9', // bg-slate-100 matching web
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  headerActionBtn: {
    padding: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  errorText: {
    marginTop: 12,
    fontSize: 15,
    color: theme.colors.error,
    fontWeight: '600',
    textAlign: 'center',
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  actionBar: {
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  downloadPdfButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669', // emerald-600 matching web
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  downloadPdfButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  shareButtonText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 14,
  },
  invoicePaper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  watermarkContainer: {
    position: 'absolute',
    top: '40%',
    left: '-20%',
    right: '-20%',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-30deg' }],
    opacity: 0.03,
    pointerEvents: 'none',
  },
  watermarkText: {
    fontSize: 52,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 8,
  },
  rejectedWatermark: {
    position: 'absolute',
    top: '35%',
    left: '10%',
    right: '10%',
    borderWidth: 4,
    borderColor: '#EF4444',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-25deg' }],
    opacity: 0.25,
    zIndex: 50,
  },
  rejectedWatermarkText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 6,
  },
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: theme.spacing.md,
  },
  storeName: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  storeDetailText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  invoiceTitleBox: {
    alignItems: 'flex-end',
  },
  invoiceTitleText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#CBD5E1', // slate-300 matching web
    letterSpacing: 3,
  },
  thickDivider: {
    height: 3,
    backgroundColor: '#064E3B', // emerald-900 matching web
    marginVertical: theme.spacing.md,
  },
  infoGrid: {
    flexDirection: 'column',
    gap: 14,
    marginBottom: theme.spacing.lg,
  },
  billedToCol: {
    backgroundColor: '#F8FAFC',
    padding: theme.spacing.md,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metaSectionLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  statusLine: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 2,
  },
  statusText: {
    fontWeight: 'bold',
    color: '#0F172A',
  },
  orderTypeLine: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 4,
  },
  addressLine: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 4,
  },
  invoiceMetaCol: {
    backgroundColor: '#F8FAFC',
    padding: theme.spacing.md,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  table: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#334155',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableRowAlt: {
    backgroundColor: '#FAFAFA',
  },
  tableCell: {
    fontSize: 12,
    color: '#334155',
  },
  tableCellName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  tableCellUnit: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  tableCellBold: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  lineThrough: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  unavailableBadge: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  unavailableBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#E11D48',
    textTransform: 'uppercase',
  },
  totalsContainer: {
    alignItems: 'flex-end',
    marginBottom: theme.spacing.xl,
  },
  totalsBox: {
    width: '100%',
    maxWidth: 320,
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#475569',
  },
  summaryValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  finalTotalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ECFDF5', // emerald-50
    borderTopWidth: 2,
    borderTopColor: '#064E3B',
    padding: 12,
    marginTop: 6,
    borderRadius: 4,
  },
  finalTotalLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#064E3B',
    letterSpacing: 1,
  },
  finalTotalAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#064E3B',
  },
  invoiceFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: theme.spacing.lg,
    flexDirection: 'column',
    gap: 20,
  },
  termsBox: {
    flex: 1,
  },
  termsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  termsTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  termText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  thankYouText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 6,
  },
  signatureCol: {
    alignItems: 'flex-start',
  },
  signatureBox: {
    width: 160,
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  signatureImage: {
    width: '100%',
    height: '100%',
  },
  signaturePlaceholderText: {
    fontStyle: 'italic',
    fontSize: 18,
    color: '#475569',
    fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'serif',
  },
  signatoryLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  signatoryStore: {
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 1,
  },
});
