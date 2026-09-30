import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../../../context/ThemeContext';
import { showAlert } from '../../../utils/alerts';
import UniversalCameraScanner from '../../../components/UniversalCameraScanner';

type ScanResultState =
  | {
      type: 'REFERRAL';
      referralId: string;
      rawToken: string;
    }
  | {
      type: 'EXISTING_PRODUCT';
      product: any;
    }
  | {
      type: 'NEW_BARCODE';
      sku: string;
      globalSuggestion?: any;
    }
  | null;

interface RecentScanItem {
  id: string;
  code: string;
  type: 'REFERRAL' | 'EXISTING_PRODUCT' | 'NEW_BARCODE';
  title: string;
  subtitle: string;
  time: string;
  payload: any;
}

export default function CommonSmartScannerScreen() {
  const { isDark, colors } = useAppTheme();
  const [torchOn, setTorchOn] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [processing, setProcessing] = useState(false);
  const [updatingStock, setUpdatingStock] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResultState>(null);
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([]);
  const router = useRouter();

  const handleClose = () => {
    if (router.canGoBack && router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/more');
    }
  };

  const handleRedeemReferral = async (referralId: string, token: string) => {
    setProcessing(true);
    try {
      await api.post(`/offers/referrals/${referralId}/approve/`, { token });
      showAlert('Success', `Referral reward #${referralId} redeemed successfully!`);
      setScanResult(null);
      setManualToken('');
    } catch (error: any) {
      showAlert('Redeem Failed', getErrorMessage(error, 'Failed to redeem referral reward.'));
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickStockAdjust = async (product: any, delta: number) => {
    if (!product?.id) return;
    setUpdatingStock(true);
    try {
      const currentQty = Math.max(0, Number(product.stock_quantity ?? 0));
      const nextQty = Math.max(0, currentQty + delta);
      const res = await api.patch(`/products/${product.id}/`, {
        stock_quantity: nextQty,
        is_in_stock: nextQty > 0,
      });
      (api as ApiInstance).clearCache();

      const updatedProduct = res?.data || {
        ...product,
        stock_quantity: nextQty,
        is_in_stock: nextQty > 0,
      };

      setScanResult({
        type: 'EXISTING_PRODUCT',
        product: updatedProduct,
      });

      // Update in recent scans list as well
      setRecentScans((prev) =>
        prev.map((item) =>
          item.type === 'EXISTING_PRODUCT' && item.payload?.id === product.id
            ? {
                ...item,
                subtitle: `Stock: ${nextQty} • ₹${updatedProduct.offer_price || updatedProduct.regular_price || 0}`,
                payload: updatedProduct,
              }
            : item
        )
      );
    } catch (error: any) {
      showAlert('Error', getErrorMessage(error, 'Could not update product stock.'));
    } finally {
      setUpdatingStock(false);
    }
  };

  const processScannedCode = useCallback(async (rawData: string) => {
    const cleanData = String(rawData || '').trim();
    if (!cleanData) {
      showAlert('Empty Code', 'Please scan or enter a valid QR code or product barcode.');
      return;
    }

    setProcessing(true);
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      // 1. Check if it is a Customer Referral QR Token (secure_qr:ID:SIGNATURE)
      const parts = cleanData.split(':');
      if (parts.length === 3 && parts[0] === 'secure_qr' && parts[1]) {
        const referralPayload = {
          referralId: parts[1],
          rawToken: cleanData,
        };
        setScanResult({
          type: 'REFERRAL',
          ...referralPayload,
        });

        setRecentScans((prev) => [
          {
            id: `scan-${Date.now()}`,
            code: cleanData,
            type: 'REFERRAL',
            title: `Referral #${parts[1]}`,
            subtitle: 'Customer Reward Token',
            time: nowTime,
            payload: referralPayload,
          },
          ...prev.filter((i) => i.code !== cleanData).slice(0, 6),
        ]);
        return;
      }

      // 2. Check if Barcode / SKU matches an existing product in Store Catalog
      const response = await (api as ApiInstance).cachedGet('/products/');
      const rawList = response?.data?.results ?? response?.data;
      const products = Array.isArray(rawList) ? rawList : [];
      const matchedProduct = products.find(
        (p: any) =>
          String(p?.sku || '')
            .trim()
            .toLowerCase() === cleanData.toLowerCase()
      );

      if (matchedProduct) {
        setScanResult({
          type: 'EXISTING_PRODUCT',
          product: matchedProduct,
        });

        setRecentScans((prev) => [
          {
            id: `scan-${Date.now()}`,
            code: cleanData,
            type: 'EXISTING_PRODUCT',
            title: matchedProduct.name || 'Catalog Product',
            subtitle: `Stock: ${matchedProduct.stock_quantity ?? 0} • ₹${matchedProduct.offer_price || matchedProduct.regular_price || 0}`,
            time: nowTime,
            payload: matchedProduct,
          },
          ...prev.filter((i) => i.code !== cleanData).slice(0, 6),
        ]);
        return;
      }

      // 3. New / Unregistered barcode: query Open Food Facts / global registry suggestion
      let suggestion: any = null;
      if (/^\d{8,14}$/.test(cleanData)) {
        try {
          const offRes = await fetch(
            `https://world.openfoodfacts.org/api/v0/product/${cleanData}.json`
          );
          if (offRes.ok) {
            const offData = await offRes.json();
            if (offData.status === 1 && offData.product) {
              suggestion = {
                name: offData.product.product_name || offData.product.generic_name || '',
                brand: offData.product.brands || '',
                category: offData.product.categories_tags?.[0]?.replace('en:', '') || '',
                image: offData.product.image_front_small_url || offData.product.image_url || '',
              };
            }
          }
        } catch {}
      }

      const newBarcodePayload = {
        sku: cleanData,
        globalSuggestion: suggestion,
      };

      setScanResult({
        type: 'NEW_BARCODE',
        ...newBarcodePayload,
      });

      setRecentScans((prev) => [
        {
          id: `scan-${Date.now()}`,
          code: cleanData,
          type: 'NEW_BARCODE',
          title: suggestion?.name || `Barcode: ${cleanData}`,
          subtitle: 'New Item (Not in Catalog)',
          time: nowTime,
          payload: newBarcodePayload,
        },
        ...prev.filter((i) => i.code !== cleanData).slice(0, 6),
      ]);
    } catch (error: any) {
      showAlert('Scan Error', getErrorMessage(error, 'Failed to process scanned code.'));
    } finally {
      setProcessing(false);
    }
  }, []);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.maxContainer}>
        {/* 1. Executive Top Header */}
        <View style={styles.topHeader}>
          {/* Close Button */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={[
              styles.headerCircleBtn,
              {
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#ffffff',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
              },
            ]}
            onPress={handleClose}
            accessibilityLabel="Close Scanner"
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>

          {/* Center Brand Title & Auto-Detect Pulse Pill */}
          <View style={styles.topHeaderCenter}>
            <View style={styles.titleRow}>
              <Text style={[styles.screenTitle, { color: colors.text }]}>Smart Scanner</Text>
              <View
                style={[
                  styles.smartPulsePill,
                  {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.14)' : '#ecfdf5',
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#10b981',
                  },
                ]}
              >
                <View style={styles.smartPulseDot} />
                <Text style={styles.smartPulseText}>Live Auto-Detect</Text>
              </View>
            </View>
            <Text style={[styles.screenSub, { color: colors.textMuted }]}>
              Optical reader for product barcodes & customer QR codes
            </Text>
          </View>

          {/* Single High-Contrast Flashlight Toggle */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={[
              styles.headerCircleBtn,
              torchOn
                ? {
                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.22)' : '#fef08a',
                    borderColor: '#f59e0b',
                    shadowColor: '#f59e0b',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.4,
                    shadowRadius: 6,
                    elevation: 4,
                  }
                : {
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#ffffff',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
                  },
            ]}
            onPress={() => setTorchOn((prev) => !prev)}
            accessibilityLabel="Toggle Flashlight"
          >
            <Ionicons
              name={torchOn ? 'flash' : 'flash-outline'}
              size={19}
              color={torchOn ? '#d97706' : colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* 2. Precision Viewfinder Hero Card */}
        <View
          style={[
            styles.scannerHeroCard,
            {
              backgroundColor: '#0a0f1d',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
            },
          ]}
        >
          <UniversalCameraScanner
            minimal
            mode="all"
            torch={torchOn}
            hideFloatingTorch={true}
            isScanned={!!scanResult}
            height={340}
            onScan={processScannedCode}
          />
        </View>

        {/* 3. Real-Time Processing Status Indicator */}
        {processing && (
          <View
            style={[
              styles.processingGlassCard,
              {
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : '#ffffff',
                borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#a7f3d0',
              },
            ]}
          >
            <ActivityIndicator size="small" color="#10b981" />
            <Text style={[styles.processingText, { color: colors.text }]}>
              Decoded code • Querying store catalog...
            </Text>
          </View>
        )}

        {/* 4. Actionable Result Presentation Card */}
        {!processing && scanResult?.type === 'EXISTING_PRODUCT' && (
          <View
            style={[
              styles.resultGlassCard,
              {
                backgroundColor: isDark ? '#111827' : '#ffffff',
                borderColor: '#10b981',
                shadowColor: '#10b981',
              },
            ]}
          >
            {/* Header Badge & Dismiss */}
            <View style={styles.resultCardHeader}>
              <View
                style={[
                  styles.resultBadgePill,
                  {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#ecfdf5',
                    borderColor: '#10b981',
                  },
                ]}
              >
                <Ionicons name="checkmark-circle" size={13} color="#10b981" />
                <Text style={[styles.resultBadgeText, { color: '#10b981' }]}>
                  IN STORE CATALOG
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setScanResult(null)}
                style={styles.dismissCircleBtn}
                accessibilityLabel="Dismiss Result"
              >
                <Ionicons name="close" size={17} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Product Details Hero Row */}
            <View style={styles.productHeroRow}>
              {scanResult.product.image ? (
                <Image
                  source={{ uri: scanResult.product.image }}
                  style={styles.productThumbImg}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={[
                    styles.productThumbFallback,
                    {
                      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f1f5f9',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons name="cube-outline" size={28} color={colors.textMuted} />
                </View>
              )}

              <View style={styles.productDetailsCol}>
                <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
                  {scanResult.product.name}
                </Text>

                <View style={styles.productMetaTagsRow}>
                  <View
                    style={[
                      styles.skuTagPill,
                      {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
                      },
                    ]}
                  >
                    <Ionicons name="barcode-outline" size={12} color={colors.textMuted} />
                    <Text style={[styles.skuTagText, { color: colors.textMuted }]}>
                      {scanResult.product.sku}
                    </Text>
                  </View>
                  {scanResult.product.unit && (
                    <Text style={[styles.unitText, { color: colors.textMuted }]}>
                      {scanResult.product.unit}
                    </Text>
                  )}
                </View>

                {/* Price & Stock Metric Row */}
                <View style={styles.priceStockRow}>
                  <View style={styles.priceGroup}>
                    <Text style={styles.priceHighlight}>
                      ₹
                      {scanResult.product.offer_price ||
                        scanResult.product.regular_price ||
                        scanResult.product.price ||
                        '0.00'}
                    </Text>
                    {scanResult.product.offer_price && scanResult.product.regular_price ? (
                      <Text style={[styles.strikePrice, { color: colors.textMuted }]}>
                        ₹{scanResult.product.regular_price}
                      </Text>
                    ) : null}
                  </View>

                  <View
                    style={[
                      styles.stockStatusBadge,
                      {
                        backgroundColor: scanResult.product.is_in_stock
                          ? isDark
                            ? 'rgba(16, 185, 129, 0.18)'
                            : '#ecfdf5'
                          : isDark
                            ? 'rgba(244, 63, 94, 0.18)'
                            : '#fff1f2',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.stockDot,
                        {
                          backgroundColor: scanResult.product.is_in_stock ? '#10b981' : '#f43f5e',
                        },
                      ]}
                    />
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: '800',
                        color: scanResult.product.is_in_stock ? '#10b981' : '#f43f5e',
                      }}
                    >
                      {scanResult.product.is_in_stock
                        ? `${scanResult.product.stock_quantity ?? 0} in stock`
                        : 'Out of stock'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Instant Restock Stepper Controls */}
            <View
              style={[
                styles.stepperContainer,
                {
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.55)' : '#f8fafc',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                },
              ]}
            >
              <View style={styles.stepperLeft}>
                <Ionicons name="cube-outline" size={15} color={colors.textMuted} />
                <Text style={[styles.stepperLabel, { color: colors.textMuted }]}>
                  Quick Restock:
                </Text>
                {updatingStock && (
                  <ActivityIndicator size="small" color="#10b981" style={{ marginLeft: 6 }} />
                )}
              </View>
              <View style={styles.stepperButtonsRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={updatingStock || Number(scanResult.product.stock_quantity ?? 0) <= 0}
                  style={[
                    styles.stepBtn,
                    styles.stepBtnMinus,
                    {
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => handleQuickStockAdjust(scanResult.product, -1)}
                >
                  <Text style={[styles.stepBtnText, { color: colors.text }]}>-1</Text>
                </TouchableOpacity>

                {[1, 5, 10].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    activeOpacity={0.7}
                    disabled={updatingStock}
                    style={[
                      styles.stepBtn,
                      styles.stepBtnAdd,
                      {
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#a7f3d0',
                      },
                    ]}
                    onPress={() => handleQuickStockAdjust(scanResult.product, amt)}
                  >
                    <Text style={styles.stepBtnAddText}>+{amt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Action Buttons: Scan Next & Edit Product */}
            <View style={styles.resultActionsRow}>
              <TouchableOpacity
                activeOpacity={0.75}
                style={[
                  styles.actionBtnSecondary,
                  {
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f1f5f9',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                  },
                ]}
                onPress={() => setScanResult(null)}
              >
                <Ionicons name="scan-outline" size={16} color={colors.text} />
                <Text style={[styles.actionBtnSecondaryText, { color: colors.text }]}>
                  Scan Next
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.actionBtnPrimary, { backgroundColor: '#10b981' }]}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/products/new',
                    params: { id: String(scanResult.product.id) },
                  })
                }
              >
                <Ionicons name="create-outline" size={16} color="#ffffff" />
                <Text style={styles.actionBtnPrimaryText}>Edit Product</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!processing && scanResult?.type === 'REFERRAL' && (
          <View
            style={[
              styles.resultGlassCard,
              {
                backgroundColor: isDark ? '#111827' : '#ffffff',
                borderColor: '#8b5cf6',
                shadowColor: '#8b5cf6',
              },
            ]}
          >
            <View style={styles.resultCardHeader}>
              <View
                style={[
                  styles.resultBadgePill,
                  {
                    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.16)' : '#f5f3ff',
                    borderColor: '#8b5cf6',
                  },
                ]}
              >
                <Ionicons name="gift" size={13} color="#8b5cf6" />
                <Text style={[styles.resultBadgeText, { color: '#8b5cf6' }]}>
                  CUSTOMER REFERRAL TOKEN
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setScanResult(null)}
                style={styles.dismissCircleBtn}
                accessibilityLabel="Dismiss Result"
              >
                <Ionicons name="close" size={17} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.referralInfoBox}>
              <View
                style={[
                  styles.referralIconCircle,
                  { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.22)' : '#ede9fe' },
                ]}
              >
                <Ionicons name="gift-outline" size={28} color="#8b5cf6" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.referralTitle, { color: colors.text }]}>
                  Referral Reward #{scanResult.referralId}
                </Text>
                <Text style={[styles.referralSub, { color: colors.textMuted }]}>
                  Valid reward token. Ready to redeem.
                </Text>
              </View>
            </View>

            <View style={styles.resultActionsRow}>
              <TouchableOpacity
                activeOpacity={0.75}
                style={[
                  styles.actionBtnSecondary,
                  {
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f1f5f9',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                  },
                ]}
                onPress={() => setScanResult(null)}
              >
                <Ionicons name="scan-outline" size={16} color={colors.text} />
                <Text style={[styles.actionBtnSecondaryText, { color: colors.text }]}>
                  Scan Next
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.actionBtnPrimary, { backgroundColor: '#8b5cf6' }]}
                disabled={processing}
                onPress={() => handleRedeemReferral(scanResult.referralId, scanResult.rawToken)}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                    <Text style={styles.actionBtnPrimaryText}>Approve & Redeem</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!processing && scanResult?.type === 'NEW_BARCODE' && (
          <View
            style={[
              styles.resultGlassCard,
              {
                backgroundColor: isDark ? '#111827' : '#ffffff',
                borderColor: '#f59e0b',
                shadowColor: '#f59e0b',
              },
            ]}
          >
            <View style={styles.resultCardHeader}>
              <View
                style={[
                  styles.resultBadgePill,
                  {
                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.16)' : '#fffbeb',
                    borderColor: '#f59e0b',
                  },
                ]}
              >
                <Ionicons name="barcode-outline" size={13} color="#f59e0b" />
                <Text style={[styles.resultBadgeText, { color: '#f59e0b' }]}>
                  NEW PRODUCT BARCODE
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setScanResult(null)}
                style={styles.dismissCircleBtn}
                accessibilityLabel="Dismiss Result"
              >
                <Ionicons name="close" size={17} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.newBarcodeInfo}>
              <Text style={[styles.newBarcodeTitle, { color: colors.text }]}>
                {scanResult.globalSuggestion?.name || `Barcode: ${scanResult.sku}`}
              </Text>
              <Text style={[styles.newBarcodeDesc, { color: colors.textMuted }]}>
                {scanResult.globalSuggestion?.name
                  ? `Matched "${scanResult.globalSuggestion.name}" in database. Add to store catalog with 1 tap.`
                  : `Barcode "${scanResult.sku}" is not yet in your inventory.`}
              </Text>
            </View>

            <View style={styles.resultActionsRow}>
              <TouchableOpacity
                activeOpacity={0.75}
                style={[
                  styles.actionBtnSecondary,
                  {
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f1f5f9',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                  },
                ]}
                onPress={() => setScanResult(null)}
              >
                <Ionicons name="scan-outline" size={16} color={colors.text} />
                <Text style={[styles.actionBtnSecondaryText, { color: colors.text }]}>
                  Scan Next
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.actionBtnPrimary, { backgroundColor: '#f59e0b' }]}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/products/new',
                    params: { sku: scanResult.sku },
                  })
                }
              >
                <Ionicons name="add-circle" size={16} color="#ffffff" />
                <Text style={styles.actionBtnPrimaryText}>Add as New Product</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 5. Recent Scans Horizontal Tray */}
        {recentScans.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeaderRow}>
              <View style={styles.recentTitleGroup}>
                <Ionicons name="time-outline" size={15} color={colors.textMuted} />
                <Text style={[styles.recentTitle, { color: colors.text }]}>
                  Recent Scans ({recentScans.length})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setRecentScans([])}
                accessibilityLabel="Clear Scan History"
              >
                <Text style={[styles.recentClearText, { color: colors.textMuted }]}>
                  Clear History
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentScroll}
            >
              {recentScans.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.7}
                  style={[
                    styles.recentChip,
                    {
                      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#ffffff',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                    },
                  ]}
                  onPress={() => {
                    if (item.type === 'REFERRAL')
                      setScanResult({ type: 'REFERRAL', ...item.payload });
                    else if (item.type === 'EXISTING_PRODUCT')
                      setScanResult({ type: 'EXISTING_PRODUCT', product: item.payload });
                    else if (item.type === 'NEW_BARCODE')
                      setScanResult({ type: 'NEW_BARCODE', ...item.payload });
                  }}
                >
                  <Ionicons
                    name={
                      item.type === 'EXISTING_PRODUCT'
                        ? 'cube'
                        : item.type === 'REFERRAL'
                          ? 'gift'
                          : 'barcode-outline'
                    }
                    size={14}
                    color={
                      item.type === 'EXISTING_PRODUCT'
                        ? '#10b981'
                        : item.type === 'REFERRAL'
                          ? '#8b5cf6'
                          : '#f59e0b'
                    }
                  />
                  <View style={{ maxWidth: 130 }}>
                    <Text style={[styles.recentChipTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.recentChipTime, { color: colors.textMuted }]}>
                      {item.time}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 6. Sleek Manual Keypad Fallback Input */}
        <View style={styles.manualEntryCard}>
          <Text style={[styles.manualLabel, { color: colors.textMuted }]}>
            Can't scan? Type barcode SKU or QR token manually:
          </Text>
          <View
            style={[
              styles.manualInputRow,
              {
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#ffffff',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
              },
            ]}
          >
            <Ionicons name="keypad-outline" size={17} color={colors.textMuted} />
            <TextInput
              style={[styles.manualInput, { color: colors.text }]}
              placeholder="Enter SKU number or referral code..."
              placeholderTextColor={colors.textMuted}
              value={manualToken}
              onChangeText={setManualToken}
              autoCapitalize="none"
              onSubmitEditing={() => processScannedCode(manualToken)}
            />
            {manualToken.length > 0 && (
              <TouchableOpacity onPress={() => setManualToken('')}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.manualSubmitBtn, { backgroundColor: '#10b981' }]}
              onPress={() => processScannedCode(manualToken)}
              disabled={processing}
            >
              <Text style={styles.manualSubmitText}>Check</Text>
              <Ionicons name="arrow-forward" size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 7. Pro Tip Micro-Banner */}
        <View
          style={[
            styles.proTipBanner,
            {
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0',
            },
          ]}
        >
          <Ionicons name="bulb-outline" size={15} color="#10b981" />
          <Text style={[styles.proTipText, { color: colors.textMuted }]}>
            Pro Tip: Hold barcode 10-15 cm away under steady light for fastest capture.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 14,
    paddingBottom: 44,
  },
  maxContainer: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    gap: 14,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 4,
    paddingBottom: 2,
  },
  headerCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  topHeaderCenter: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  smartPulsePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  smartPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  smartPulseText: {
    color: '#10b981',
    fontSize: 10.5,
    fontWeight: '800',
  },
  screenSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  scannerHeroCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 5,
  },
  processingGlassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
  },
  processingText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  resultGlassCard: {
    padding: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    gap: 13,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  resultCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  resultBadgeText: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  dismissCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  productThumbImg: {
    width: 66,
    height: 66,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  productThumbFallback: {
    width: 66,
    height: 66,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productDetailsCol: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 15.5,
    fontWeight: '800',
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  productMetaTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skuTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  skuTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  unitText: {
    fontSize: 11,
    fontWeight: '600',
  },
  priceStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  priceGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  priceHighlight: {
    color: '#10b981',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  strikePrice: {
    fontSize: 12.5,
    textDecorationLine: 'line-through',
  },
  stockStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stockDot: {
    width: 5.5,
    height: 5.5,
    borderRadius: 3,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
  },
  stepperLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stepperLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepperButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    paddingHorizontal: 11,
    paddingVertical: 5.5,
    borderRadius: 9,
    borderWidth: 1,
    minWidth: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnMinus: {},
  stepBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  stepBtnAdd: {},
  stepBtnAddText: {
    color: '#10b981',
    fontSize: 11.5,
    fontWeight: '800',
  },
  resultActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionBtnSecondaryText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  actionBtnPrimary: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  actionBtnPrimaryText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  referralInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  referralIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralTitle: {
    fontSize: 16.5,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  referralSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  newBarcodeInfo: {
    gap: 4,
    paddingVertical: 4,
  },
  newBarcodeTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  newBarcodeDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  recentSection: {
    gap: 8,
    marginTop: 2,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  recentClearText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  recentScroll: {
    gap: 8,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  recentChipTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  recentChipTime: {
    fontSize: 10,
    marginTop: 1,
  },
  manualEntryCard: {
    gap: 6,
    marginTop: 2,
  },
  manualLabel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  manualInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  manualSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  manualSubmitText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  proTipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  proTipText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
  },
});
