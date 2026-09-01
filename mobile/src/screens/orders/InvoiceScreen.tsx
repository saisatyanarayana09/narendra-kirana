import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Platform,
  Share
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { theme } from '../../constants/theme';
import { apiClient } from '../../api/client';
import { fixImageUrl } from '../../utils/image';

export function InvoiceScreen({ navigation, route }: { navigation: AppNavigationProp, route: any }) {
  const { orderId } = route.params || {};
  const [order, setOrder] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

  const handlePrintOrShare = async () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.print) {
      window.print();
      return;
    }

    // On native mobile devices, share receipt summary
    if (!order) return;
    try {
      const itemsText = (order.items || [])
        .filter((i: any) => i.status !== 'REJECTED')
        .map((i: any) => `${i.quantity}x ${i.product_name_snapshot || i.product_name} - ₹${parseFloat(i.subtotal || i.price_snapshot).toFixed(2)}`)
        .join('\n');

      const message = `*INVOICE: ${invoiceNumber}*\n` +
        `Store: ${settings?.store_name || 'Narendra Kirana Store'}\n` +
        `Date: ${orderDate}\n\n` +
        `*Items:*\n${itemsText}\n\n` +
        `*Total Paid: ₹${parseFloat(order.total_amount).toFixed(2)}*\n` +
        `Thank you for shopping with us!`;

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
        </View>
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>{error || 'Could not load invoice'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Dates & Invoice Number
  const orderDateObj = new Date(order.created_at);
  const isOrderDateValid = !isNaN(orderDateObj.getTime());
  const orderDate = isOrderDateValid 
    ? orderDateObj.toLocaleDateString('en-IN', { 
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit' 
      }) 
    : 'N/A';

  const invoiceDateObj = new Date();
  const invoiceDate = invoiceDateObj.toLocaleDateString('en-IN', { 
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit' 
  });

  const orderYear = isOrderDateValid ? orderDateObj.getFullYear() : invoiceDateObj.getFullYear();
  const invoiceNumber = `INV-${orderYear}-${String(order.id).padStart(5, '0')}`;

  const isDelivery = order.order_type === 'DELIVERY';
  const isRejected = order.status === 'REJECTED';

  const validItems = (order.items || []).filter((i: any) => i.status !== 'REJECTED');
  const subtotal = validItems.reduce((acc: number, item: any) => {
    return acc + parseFloat(item.subtotal || item.price_snapshot || '0');
  }, 0);

  const signatureUrl = fixImageUrl(settings?.invoice_signature);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice</Text>
        <TouchableOpacity style={styles.printHeaderButton} onPress={handlePrintOrShare}>
          <Feather name={Platform.OS === 'web' ? 'printer' : 'share-2'} size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Top Print / Share Action Banner */}
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.printButton} onPress={handlePrintOrShare}>
            <Feather name={Platform.OS === 'web' ? 'printer' : 'share-2'} size={18} color="#FFFFFF" />
            <Text style={styles.printButtonText}>
              {Platform.OS === 'web' ? 'Print / Download PDF' : 'Share Receipt'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Paper Invoice Container */}
        <View style={styles.invoicePaper}>
          
          {isRejected && (
            <View style={styles.rejectedWatermark}>
              <Text style={styles.rejectedWatermarkText}>REJECTED</Text>
            </View>
          )}

          {/* Store Brand & INVOICE Header */}
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

          {/* Info Grid (Billed To vs Invoice Meta) */}
          <View style={styles.infoGrid}>
            <View style={styles.billedToCol}>
              <Text style={styles.metaSectionLabel}>BILLED TO</Text>
              <Text style={styles.customerName}>
                {order.customer_name || `Customer #${order.customer || ''}`}
              </Text>
              <Text style={styles.statusLine}>
                Status: <Text style={[styles.statusText, isRejected && { color: theme.colors.error }]}>{order.status}</Text>
              </Text>
              <Text style={styles.orderTypeLine}>
                Type: <Text style={{ fontWeight: 'bold', color: isDelivery ? '#4F46E5' : '#0F172A' }}>
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
              <Text style={[styles.tableHeaderCell, { width: 30, textAlign: 'center' }]}>#</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Item Description</Text>
              <Text style={[styles.tableHeaderCell, { width: 45, textAlign: 'center' }]}>Qty</Text>
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
                  <Text style={[styles.tableCell, { width: 30, textAlign: 'center', color: '#94A3B8' }]}>
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
                  <Text style={[styles.tableCell, { width: 45, textAlign: 'center' }, itemRejected && styles.lineThrough]}>
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
    backgroundColor: '#F1F5F9', // bg-slate-100
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
  printHeaderButton: {
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
    alignItems: 'flex-end',
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#059669', // emerald-600
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  printButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  invoicePaper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
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
    fontSize: 20,
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
    fontSize: 28,
    fontWeight: '900',
    color: '#CBD5E1', // slate-300
    letterSpacing: 3,
  },
  thickDivider: {
    height: 3,
    backgroundColor: '#064E3B', // emerald-900
    marginVertical: theme.spacing.md,
  },
  infoGrid: {
    flexDirection: 'column',
    gap: 16,
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
    paddingVertical: 8,
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
    paddingVertical: 2,
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
    padding: 10,
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
    fontSize: 18,
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
