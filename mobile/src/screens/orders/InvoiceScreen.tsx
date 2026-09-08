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
  Alert,
  StatusBar,
  Linking as RNLinking
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { AppNavigationProp } from '../../navigation/types';
import { theme } from '../../constants/theme';
import { apiClient } from '../../api/client';
import { fixImageUrl } from '../../utils/image';
import { getItem, saveItem, deleteItem } from '../../utils/storage';
import { useAuth } from '../../context/AuthContext';

const SAVED_DOWNLOAD_DIR_KEY = 'SAVED_SAF_INVOICE_DOWNLOAD_DIR';

export function InvoiceScreen({ navigation, route }: { navigation: AppNavigationProp, route: any }) {
  const { user } = useAuth();
  const { orderId } = route.params || {};
  const [order, setOrder] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchInvoiceData();
    } else {
      setLoading(false);
    }
  }, [orderId, user]);

  const fetchInvoiceData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
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

  const rawTerms = settings?.invoice_terms_and_conditions || 
    settings?.terms_and_conditions || 
    "1. Goods once sold will not be taken back without original bill.\n2. In case of any dispute, local jurisdiction applies.\n3. Perishable goods must be reported within 24 hours.";
  const termsList = rawTerms.split('\n').map((t: string) => t.trim()).filter(Boolean);

  const handleWhatsAppHelp = async () => {
    const rawNum = settings?.whatsapp_number || settings?.store_phone || '';
    const cleanNumber = rawNum.replace(/[^0-9]/g, '');
    const formattedNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
    const helpTemplate = settings?.whatsapp_order_help_template || 'Hi Narendra Kirana, I need help with Order #{order_id}';
    const orderIdentifier = String(order?.id || orderId || '').trim();
    const message = helpTemplate.replace('{order_id}', orderIdentifier);

    const waUrl = `whatsapp://send?phone=${formattedNumber}&text=${encodeURIComponent(message)}`;
    const webWaUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await RNLinking.canOpenURL(waUrl);
      if (canOpen) {
        await RNLinking.openURL(waUrl);
      } else {
        await RNLinking.openURL(webWaUrl);
      }
    } catch {
      await RNLinking.openURL(webWaUrl).catch(() => {
        Alert.alert('WhatsApp Not Available', `Please contact store support directly at ${rawNum}`);
      });
    }
  };

  // Generate HTML for printable PDF exactly matching web app
  const generateInvoiceHtml = () => {
    const itemsHtml = (order?.items || []).map((item: any, index: number) => {
      const rejected = item.status === 'REJECTED';
      const name = item.product_name_snapshot || item.product_name || 'Product';
      const unit = item.unit_snapshot || '';
      const price = (parseFloat(item.price_snapshot || item.price_at_order || '0') || 0).toFixed(2);
      const itemSubtotal = rejected ? '0.00' : (parseFloat(item.subtotal || item.price_snapshot || '0') || 0).toFixed(2);

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
        <meta name="color-scheme" content="light">
        <title>Invoice - ${invoiceNumber}</title>
        <style>
          @media (prefers-color-scheme: dark) { body, .container, .info-card { background: #FFFFFF !important; color: #1E293B !important; } }
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
                ${settings?.fssai_license_number ? `
                  <div style="display: inline-block; margin-top: 4px; font-size: 11px; font-weight: bold; color: #047857; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 2px 6px; border-radius: 4px;">
                    ✓ FSSAI Lic. No: ${settings.fssai_license_number}
                  </div>
                ` : ''}
                ${settings?.gstin ? `
                  <div style="margin-top: 2px; font-size: 11px; font-weight: bold; color: #334155;">
                    GSTIN: ${settings.gstin}
                  </div>
                ` : ''}
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
                <span style="font-weight: 600; color: #0F172A;">₹${(subtotal || 0).toFixed(2)}</span>
              </div>

              ${parseFloat(order?.discount_applied || '0') > 0 ? `
                <div class="total-line total-line.border-top" style="color: #4F46E5;">
                  <span>Product Savings</span>
                  <span style="font-weight: bold;">-₹${(parseFloat(order?.discount_applied || '0') || 0).toFixed(2)}</span>
                </div>
              ` : ''}

              ${parseFloat(order?.promo_discount || '0') > 0 ? `
                <div class="total-line total-line.border-top" style="color: #059669;">
                  <span>Promo Discount</span>
                  <span style="font-weight: bold;">-₹${(parseFloat(order?.promo_discount || '0') || 0).toFixed(2)}</span>
                </div>
              ` : ''}

              ${parseFloat(order?.packaging_fee || '0') > 0 ? `
                <div class="total-line total-line.border-top">
                  <span>Packaging Fee</span>
                  <span style="font-weight: 600; color: #0F172A;">₹${(parseFloat(order?.packaging_fee || '0') || 0).toFixed(2)}</span>
                </div>
              ` : ''}

              ${isDelivery ? `
                <div class="total-line total-line.border-top">
                  <span>Delivery Fee</span>
                  <span style="font-weight: 600; color: #0F172A;">${parseFloat(order?.delivery_fee || '0') > 0 ? `₹${(parseFloat(order?.delivery_fee || '0') || 0).toFixed(2)}` : 'FREE'}</span>
                </div>
              ` : ''}

              ${parseFloat(order?.wallet_discount || '0') > 0 ? `
                <div class="total-line total-line.border-top" style="color: #059669;">
                  <span>Wallet Applied</span>
                  <span style="font-weight: bold;">-₹${(parseFloat(order?.wallet_discount || '0') || 0).toFixed(2)}</span>
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
                <span class="final-total-amount">₹${(parseFloat(order?.total_amount || '0') || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <div class="terms">
              <h4>Terms & Return Policy</h4>
              ${termsList.map((t: string) => `<div>${t}</div>`).join('')}
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

  // Direct Download PDF Handler with custom filename Invoice_ORD-XXXX.pdf (using SAF on Android / FileSystem)
  const handleDownloadPdf = async () => {
    if (downloading || !order) return;

    const rawId = String(order?.id || orderId || '').trim();
    const numDigits = rawId.replace(/^ORD-?/i, '');
    const formattedOrdId = rawId.toUpperCase().startsWith('ORD-') 
      ? rawId.toUpperCase() 
      : `ORD-${numDigits.padStart(4, '0')}`;
    const fileName = `Invoice_${formattedOrdId}.pdf`;

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
          const cleanFileName = fileName.replace(/\.pdf$/i, '');
          let directoryUri = await getItem(SAVED_DOWNLOAD_DIR_KEY);

          // 1. If folder permission was already granted previously, save directly without prompting!
          if (directoryUri) {
            try {
              const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
                directoryUri,
                cleanFileName,
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
              Alert.alert('Download Complete', `Invoice saved directly to your device as ${fileName}`);
              return;
            } catch (existingDirErr) {
              console.log('Previously remembered directory invalid or revoked, re-prompting:', existingDirErr);
              await deleteItem(SAVED_DOWNLOAD_DIR_KEY);
              directoryUri = null;
            }
          }

          // 2. First-time only: request directory permission with Downloads pre-selected
          let initialDir: string | undefined;
          try {
            initialDir = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Download');
          } catch {}

          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(initialDir);
          if (permissions.granted) {
            directoryUri = permissions.directoryUri;
            await saveItem(SAVED_DOWNLOAD_DIR_KEY, directoryUri);

            const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
              directoryUri,
              cleanFileName,
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
            Alert.alert('Download Complete', `Invoice saved directly to your device as ${fileName}`);
            return;
          }
        } catch (safErr) {
          console.log('SAF prompt dismissed or error, saving to App Documents and sharing:', safErr);
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

  // Share Button Handler (shares generated PDF via share sheet or text summary fallback)
  const handleShare = async () => {
    if (!order) return;
    try {
      setDownloading(true);
      const rawId = String(order?.id || orderId || '').trim();
      const numDigits = rawId.replace(/^ORD-?/i, '');
      const formattedOrdId = rawId.toUpperCase().startsWith('ORD-') 
        ? rawId.toUpperCase() 
        : `ORD-${numDigits.padStart(4, '0')}`;
      const fileName = `Invoice_${formattedOrdId}.pdf`;

      const html = generateInvoiceHtml();
      const { uri } = await Print.printToFileAsync({ html });
      const targetUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: uri, to: targetUri });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(targetUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${fileName}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        const itemsText = (order.items || [])
          .filter((i: any) => i.status !== 'REJECTED')
          .map((i: any) => `• ${i.quantity}x ${i.product_name_snapshot || i.product_name} - ₹${(parseFloat(i.subtotal || i.price_snapshot || '0') || 0).toFixed(2)}`)
          .join('\n');

        const message = `🧾 *INVOICE: ${invoiceNumber}*\n` +
          `🏪 *Store:* ${settings?.store_name || 'Narendra Kirana Store'}\n` +
          `📅 *Date:* ${orderDate}\n` +
          `📦 *Type:* ${isDelivery ? 'Home Delivery' : 'Store Pickup'}\n\n` +
          `*Items Ordered:*\n${itemsText}\n\n` +
          `💰 *Total Paid:* ₹${(parseFloat(order?.total_amount || '0') || 0).toFixed(2)}\n\n` +
          `Thank you for shopping with Narendra Kirana!`;

        await Share.share({ message });
      }
    } catch (err) {
      console.error('Error sharing receipt:', err);
    } finally {
      setDownloading(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#F1F5F9' }]} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={[styles.webActionBar, { backgroundColor: '#FFFFFF', borderBottomColor: '#E2E8F0' }]}>
          <TouchableOpacity 
            style={[styles.backToOrderBtn, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={15} color="#334155" />
            <Text style={[styles.backToOrderText, { color: '#334155' }]}>Back to Order</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.guestStateContainer}>
          <View style={[styles.guestIconBox, { backgroundColor: '#ECFDF5' }]}>
            <Feather name="file-text" size={44} color="#059669" />
          </View>
          <Text style={[styles.guestTitle, { color: '#0F172A' }]}>Sign In to View Invoice</Text>
          <Text style={[styles.guestSubtitle, { color: '#64748B' }]}>
            Please sign in to view and download official GST tax invoices for your purchases.
          </Text>
          <TouchableOpacity
            style={[styles.guestSignInBtn, { backgroundColor: '#059669' }]}
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#F1F5F9' }]} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={[styles.webActionBar, { backgroundColor: '#FFFFFF', borderBottomColor: '#E2E8F0' }]}>
          <TouchableOpacity 
            style={[styles.backToOrderBtn, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={15} color="#334155" />
            <Text style={[styles.backToOrderText, { color: '#334155' }]}>Back to Order</Text>
          </TouchableOpacity>

          <View style={styles.actionButtonsRight}>
            <View style={[styles.downloadPdfButton, { opacity: 0.4 }]}>
              <Feather name="printer" size={15} color="#FFFFFF" />
              <Text style={styles.downloadPdfButtonText}>Download / Print PDF</Text>
            </View>
            <View style={[styles.shareIconButton, { opacity: 0.4 }]}>
              <Feather name="share-2" size={15} color="#059669" />
            </View>
          </View>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={[styles.loadingText, { color: '#64748B' }]}>Loading invoice...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#F1F5F9' }]} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={[styles.webActionBar, { backgroundColor: '#FFFFFF', borderBottomColor: '#E2E8F0' }]}>
          <TouchableOpacity 
            style={[styles.backToOrderBtn, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={15} color="#334155" />
            <Text style={[styles.backToOrderText, { color: '#334155' }]}>Back to Order</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color="#DC2626" />
          <Text style={styles.errorText}>{error || 'Could not load invoice'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F1F5F9' }]} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* Action Bar matching web Invoice.jsx:76-86 */}
      <View style={[styles.webActionBar, { backgroundColor: '#FFFFFF', borderBottomColor: '#E2E8F0' }]}>
        <TouchableOpacity 
          style={[styles.backToOrderBtn, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={15} color="#334155" />
          <Text style={[styles.backToOrderText, { color: '#334155' }]}>Back to Order</Text>
        </TouchableOpacity>

        <View style={styles.actionButtonsRight}>
          <TouchableOpacity 
            style={styles.downloadPdfButton} 
            onPress={handleDownloadPdf}
            disabled={downloading}
            activeOpacity={0.85}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather name="printer" size={15} color="#FFFFFF" />
            )}
            <Text style={styles.downloadPdfButtonText}>
              {downloading ? 'Saving...' : 'Download / Print PDF'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.shareIconButton} 
            onPress={handleShare}
            disabled={downloading}
            activeOpacity={0.75}
          >
            <Feather name="share-2" size={15} color="#059669" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Printable A4 Container exactly matching web app */}
        <View style={styles.invoicePaper}>
          
          {/* Watermark Logo matching web app Invoice.jsx:100-102 */}
          <View style={styles.watermarkContainer}>
            <Image 
              source={require('../../../assets/logo.jpg')} 
              style={styles.watermarkLogo} 
              contentFit="contain" 
            />
          </View>

          {isRejected && (
            <View style={styles.rejectedWatermark}>
              <Text style={styles.rejectedWatermarkText}>REJECTED</Text>
            </View>
          )}

          {/* Header Section matching web app */}
          <View style={styles.brandHeader}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.storeName}>
                <Text style={{ color: '#064E3B' }}>NARENDRA </Text>
                <Text style={{ color: '#16A34A' }}>KIRANA</Text>
                {String(settings?.store_name || '').toLowerCase().includes('store') && (
                  <Text style={{ color: '#16A34A' }}> STORE</Text>
                )}
              </Text>
              {settings?.store_address ? (
                <Text style={styles.storeDetailText}>{settings.store_address}</Text>
              ) : (
                <Text style={styles.storeDetailText}>Main Road, Kirana Market</Text>
              )}
              {settings?.store_phone ? (
                <Text style={styles.storeDetailText}>{settings.store_phone}</Text>
              ) : null}
              {settings?.store_email ? (
                <Text style={styles.storeDetailText}>{settings.store_email}</Text>
              ) : null}
              {Boolean(settings?.fssai_license_number || settings?.fssai_number) && (
                <View style={styles.fssaiBadge}>
                  <Feather name="check-circle" size={11} color="#047857" />
                  <Text style={styles.fssaiBadgeText}>
                    FSSAI Lic: {settings?.fssai_license_number || settings?.fssai_number}
                  </Text>
                </View>
              )}
              {Boolean(settings?.gstin || settings?.gst_number) && (
                <Text style={styles.gstinText}>
                  GSTIN: {settings?.gstin || settings?.gst_number}
                </Text>
              )}
            </View>

            <View style={styles.invoiceTitleBox}>
              <Text style={styles.invoiceTitleText}>INVOICE</Text>
            </View>
          </View>

          <View style={styles.thickDivider} />

          {/* Info Grid Section matching web app */}
          <View style={styles.infoGrid}>
            <View style={styles.billedToCol}>
              <View style={styles.billedToTitleWrap}>
                <Text style={styles.metaSectionLabel}>BILLED TO</Text>
              </View>
              <Text style={styles.customerName}>
                {order.customer_name || `Customer #${order.customer || ''}`}
              </Text>
              <Text style={styles.statusLine}>
                Order Status: <Text style={[styles.statusText, isRejected ? { color: '#DC2626' } : { color: '#1E293B' }]}>{order.status}</Text>
              </Text>

              <View style={styles.orderTypeContainer}>
                <Text style={styles.orderTypeLabel}>
                  ORDER TYPE: <Text style={{ color: isDelivery ? '#4F46E5' : '#0F172A', fontWeight: 'bold' }}>
                    {isDelivery ? 'HOME DELIVERY' : 'STORE PICKUP'}
                  </Text>
                </Text>
                {isDelivery ? (
                  <View style={{ marginTop: 2 }}>
                    <Text style={styles.addressLine}>{order.delivery_address || 'Address not specified'}</Text>
                    {order.delivery_pincode ? <Text style={styles.pincodeLine}>Pincode: {order.delivery_pincode}</Text> : null}
                  </View>
                ) : (
                  <Text style={styles.addressLine}>Pickup Time: {order.pickup_time || 'As soon as possible'}</Text>
                )}
              </View>
            </View>

            <View style={styles.invoiceMetaCol}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Invoice No:</Text>
                <Text style={styles.metaValue}>{invoiceNumber}</Text>
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
              <Text style={[styles.tableHeaderCell, styles.colIndex]}>#</Text>
              <Text style={[styles.tableHeaderCell, styles.colDesc]}>Item Description</Text>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
              <Text style={[styles.tableHeaderCell, styles.colPrice]}>Price</Text>
              <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
            </View>

            {(order.items || []).map((item: any, index: number) => {
              const itemRejected = item.status === 'REJECTED';
              const name = item.product_name_snapshot || item.product_name || 'Product';
              const unit = item.unit_snapshot;
              const price = (parseFloat(item.price_snapshot || item.price_at_order || '0') || 0).toFixed(2);
              const total = itemRejected ? '0.00' : (parseFloat(item.subtotal || item.price_snapshot || '0') || 0).toFixed(2);

              return (
                <View key={item.id || index} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, styles.colIndex, { color: '#94A3B8' }]}>
                    {index + 1}
                  </Text>
                  <View style={styles.colDesc}>
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
                  <Text style={[styles.tableCell, styles.colQty, itemRejected && styles.lineThrough]}>
                    {item.quantity}
                  </Text>
                  <Text style={[styles.tableCell, styles.colPrice, itemRejected && styles.lineThrough]}>
                    ₹{price}
                  </Text>
                  <Text style={[styles.tableCellBold, styles.colTotal, itemRejected && styles.lineThrough]}>
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
                <Text style={styles.summaryValue}>₹{(subtotal || 0).toFixed(2)}</Text>
              </View>

              {parseFloat(order.discount_applied || '0') > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: '#4F46E5' }]}>Product Savings</Text>
                  <Text style={[styles.summaryValue, { color: '#4F46E5', fontWeight: 'bold' }]}>
                    -₹{(parseFloat(order.discount_applied || '0') || 0).toFixed(2)}
                  </Text>
                </View>
              )}

              {parseFloat(order.promo_discount || '0') > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: '#059669' }]}>Promo Discount</Text>
                  <Text style={[styles.summaryValue, { color: '#059669', fontWeight: 'bold' }]}>
                    -₹{(parseFloat(order.promo_discount || '0') || 0).toFixed(2)}
                  </Text>
                </View>
              )}

              {parseFloat(order.packaging_fee || '0') > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Packaging Fee</Text>
                  <Text style={styles.summaryValue}>₹{(parseFloat(order.packaging_fee || '0') || 0).toFixed(2)}</Text>
                </View>
              )}

              {isDelivery && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Delivery Fee</Text>
                  <Text style={styles.summaryValue}>
                    {parseFloat(order.delivery_fee || '0') > 0 ? `₹${(parseFloat(order.delivery_fee || '0') || 0).toFixed(2)}` : 'FREE'}
                  </Text>
                </View>
              )}

              {parseFloat(order.wallet_discount || '0') > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: '#059669' }]}>Wallet Applied</Text>
                  <Text style={[styles.summaryValue, { color: '#059669', fontWeight: 'bold' }]}>
                    -₹{(parseFloat(order.wallet_discount || '0') || 0).toFixed(2)}
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
                  ₹{(parseFloat(order.total_amount || '0') || 0).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* Footer & Signature */}
          <View style={styles.invoiceFooter}>
            <View style={styles.termsBox}>
              <View style={styles.termsHeader}>
                <Feather name="shield" size={14} color="#047857" />
                <Text style={styles.termsTitle}>Terms & Return Policy</Text>
              </View>
              {termsList.map((termLine: string, idx: number) => (
                <Text key={idx} style={styles.termText}>{termLine}</Text>
              ))}
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

        {/* Need Help? Chat on WhatsApp Button */}
        <TouchableOpacity
          style={styles.whatsAppHelpBtn}
          onPress={handleWhatsAppHelp}
          activeOpacity={0.85}
        >
          <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
          <Text style={styles.whatsAppHelpBtnText}>Need Help? Chat on WhatsApp</Text>
        </TouchableOpacity>
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
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
    color: '#64748B',
    fontWeight: '500',
  },
  errorText: {
    marginTop: 12,
    fontSize: 15,
    color: '#DC2626',
    fontWeight: '600',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  webActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backToOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  backToOrderText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 13,
  },
  actionButtonsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  downloadPdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669', // emerald-600 matching web
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  downloadPdfButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  shareIconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  invoicePaper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4, // rounded-sm matching web
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  watermarkContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.04,
    pointerEvents: 'none',
    zIndex: 0,
  },
  watermarkLogo: {
    width: '75%',
    height: 280,
  },
  rejectedWatermark: {
    position: 'absolute',
    top: '35%',
    left: '8%',
    right: '8%',
    borderWidth: 6,
    borderColor: '#DC2626',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-35deg' }],
    opacity: 0.35,
    zIndex: 50,
  },
  rejectedWatermarkText: {
    fontSize: 44,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 8,
    textAlign: 'center',
  },
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 10,
    zIndex: 1,
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
    fontSize: 34,
    fontWeight: '900',
    color: '#E2E8F0', // slate-200 matching web
    letterSpacing: 4,
  },
  thickDivider: {
    height: 2.5,
    backgroundColor: '#064E3B', // emerald-900 matching web
    marginVertical: 12,
    zIndex: 1,
  },
  infoGrid: {
    flexDirection: 'column',
    gap: 14,
    marginBottom: 16,
    zIndex: 1,
  },
  billedToCol: {
    paddingVertical: 2,
  },
  billedToTitleWrap: {
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    paddingBottom: 2,
    alignSelf: 'flex-start',
    marginBottom: 6,
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
  orderTypeContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  orderTypeLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#475569',
    letterSpacing: 0.5,
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
    marginTop: 2,
  },
  pincodeLine: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
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
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  colIndex: {
    flex: 0.7,
    textAlign: 'center',
  },
  colDesc: {
    flex: 4.2,
    paddingRight: 6,
  },
  colQty: {
    flex: 1.0,
    textAlign: 'center',
  },
  colPrice: {
    flex: 1.9,
    textAlign: 'right',
  },
  colTotal: {
    flex: 2.2,
    textAlign: 'right',
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
    color: '#0F172A',
  },
  guestSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    color: '#64748B',
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
  fssaiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  fssaiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  gstinText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginTop: 3,
  },
  whatsAppHelpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 16,
    marginBottom: 24,
    marginHorizontal: 12,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  whatsAppHelpBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
