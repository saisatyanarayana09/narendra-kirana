import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  Platform,
  Vibration,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../../../context/ThemeContext';
import { showAlert } from '../../../utils/alerts';
import UniversalCameraScanner from '../../../components/UniversalCameraScanner';

// ─── Data Types ───
type ScannerWorkflow = 'inspect' | 'batch';
type ScannerBarcodeFilter = 'all' | 'barcode' | 'qr';

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

interface BatchScanItem {
  id: string;
  code: string;
  name: string;
  sku: string;
  price: number;
  currentStock: number;
  batchQty: number;
  image?: string;
  productRef?: any;
  isRegistered: boolean;
}

export default function CommonSmartScannerScreen() {
  const { isDark, colors } = useAppTheme();
  const router = useRouter();

  // Scanner Hardware State
  const [torchOn, setTorchOn] = useState(false);
  const [barcodeFilter, setBarcodeFilter] = useState<ScannerBarcodeFilter>('all');
  const [workflow, setWorkflow] = useState<ScannerWorkflow>('inspect');

  // Async Execution States
  const [processing, setProcessing] = useState(false);
  const [updatingStock, setUpdatingStock] = useState(false);
  const [committingBatch, setCommittingBatch] = useState(false);

  // Results & Batch State
  const [scanResult, setScanResult] = useState<ScanResultState>(null);
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([]);
  const [batchManifest, setBatchManifest] = useState<BatchScanItem[]>([]);
  const [batchFlashBanner, setBatchFlashBanner] = useState<string | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Manual Entry Modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualSearchResults, setManualSearchResults] = useState<any[]>([]);
  const [searchingManual, setSearchingManual] = useState(false);

  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== 'web') {
        Vibration.vibrate(50);
      }
    } catch {}
  };

  const handleClose = () => {
    if (router.canGoBack && router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/more');
    }
  };

  // ─── Single Item Stock Stepper ───
  const handleQuickStockAdjust = async (product: any, delta: number) => {
    if (!product?.id) return;
    setUpdatingStock(true);
    triggerHaptic();
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

      // Update in recent scans list
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

  // ─── Customer Referral Redemption ───
  const handleRedeemReferral = async (referralId: string, token: string) => {
    setProcessing(true);
    triggerHaptic();
    try {
      await api.post(`/offers/referrals/${referralId}/approve/`, { token });
      showAlert('Success', `Referral reward #${referralId} redeemed successfully!`);
      setScanResult(null);
    } catch (error: any) {
      showAlert('Redeem Failed', getErrorMessage(error, 'Failed to redeem referral reward.'));
    } finally {
      setProcessing(false);
    }
  };

  // ─── Batch Mode: Add to Manifest ───
  const addToBatchManifest = (product: any, rawCode: string) => {
    triggerHaptic();
    const isRegistered = Boolean(product?.id);
    const code = rawCode.trim();
    const itemId = isRegistered ? String(product.id) : `unreg-${code}`;
    const name = isRegistered ? product.name : `Unregistered #${code}`;
    const price = Number(product?.offer_price || product?.regular_price || product?.price || 0);
    const currentStock = Number(product?.stock_quantity ?? 0);

    setBatchManifest((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === itemId);
      if (existingIndex > -1) {
        const updated = [...prev];
        const nextQty = updated[existingIndex].batchQty + 1;
        updated[existingIndex] = {
          ...updated[existingIndex],
          batchQty: nextQty,
        };
        showFlashBanner(`+1 ${name} (Batch: ${nextQty})`);
        return updated;
      } else {
        showFlashBanner(`Added ${name} to batch`);
        return [
          {
            id: itemId,
            code,
            name,
            sku: product?.sku || code,
            price,
            currentStock,
            batchQty: 1,
            image: product?.image,
            productRef: product,
            isRegistered,
          },
          ...prev,
        ];
      }
    });
  };

  const showFlashBanner = (message: string) => {
    if (bannerTimeoutRef.current) {
      clearTimeout(bannerTimeoutRef.current);
    }
    setBatchFlashBanner(message);
    bannerTimeoutRef.current = setTimeout(() => {
      setBatchFlashBanner(null);
    }, 2400);
  };

  // ─── Commit Batch Stock Additions to Database ───
  const handleCommitBatchStock = async () => {
    const registeredItems = batchManifest.filter((item) => item.isRegistered && item.productRef?.id);
    if (registeredItems.length === 0) {
      showAlert('Batch Empty', 'No registered catalog products found in this batch.');
      return;
    }

    setCommittingBatch(true);
    triggerHaptic();
    let successCount = 0;
    try {
      for (const item of registeredItems) {
        try {
          const newQty = Math.max(0, item.currentStock + item.batchQty);
          await api.patch(`/products/${item.productRef.id}/`, {
            stock_quantity: newQty,
            is_in_stock: newQty > 0,
          });
          successCount++;
        } catch {}
      }
      (api as ApiInstance).clearCache();
      showAlert(
        'Batch Restocked',
        `Successfully updated inventory stock for ${successCount} products!`
      );
      setBatchManifest([]);
      setShowBatchModal(false);
    } catch (error: any) {
      showAlert('Batch Error', getErrorMessage(error, 'Failed to update some batch products.'));
    } finally {
      setCommittingBatch(false);
    }
  };

  // ─── Core Barcode & QR Code Processing Engine ───
  const processScannedCode = useCallback(
    async (rawData: string) => {
      const cleanData = String(rawData || '').trim();
      if (!cleanData) {
        showAlert('Empty Code', 'Please scan or enter a valid QR code or product barcode.');
        return;
      }

      setProcessing(true);
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      try {
        // 1. Customer Referral QR Code Check (secure_qr:ID:SIGNATURE)
        const parts = cleanData.split(':');
        if (parts.length === 3 && parts[0] === 'secure_qr' && parts[1]) {
          const referralPayload = {
            referralId: parts[1],
            rawToken: cleanData,
          };

          if (workflow === 'inspect') {
            setScanResult({
              type: 'REFERRAL',
              ...referralPayload,
            });
          } else {
            showFlashBanner(`Customer Referral #${parts[1]} detected!`);
          }

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
            ...prev.filter((i) => i.code !== cleanData).slice(0, 8),
          ]);
          return;
        }

        // 2. Query Store Catalog by SKU / Barcode
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
          if (workflow === 'batch') {
            addToBatchManifest(matchedProduct, cleanData);
          } else {
            setScanResult({
              type: 'EXISTING_PRODUCT',
              product: matchedProduct,
            });
          }

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
            ...prev.filter((i) => i.code !== cleanData).slice(0, 8),
          ]);
          return;
        }

        // 3. New / Unregistered Barcode: Check Open Food Facts Registry
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

        if (workflow === 'batch') {
          addToBatchManifest(
            suggestion ? { name: suggestion.name, sku: cleanData, image: suggestion.image } : null,
            cleanData
          );
        } else {
          setScanResult({
            type: 'NEW_BARCODE',
            ...newBarcodePayload,
          });
        }

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
          ...prev.filter((i) => i.code !== cleanData).slice(0, 8),
        ]);
      } catch (error: any) {
        showAlert('Scan Error', getErrorMessage(error, 'Failed to process scanned code.'));
      } finally {
        setProcessing(false);
      }
    },
    [workflow]
  );

  // ─── Live Manual Search in Catalog ───
  const handleManualSearch = async (text: string) => {
    setManualCode(text);
    if (!text.trim()) {
      setManualSearchResults([]);
      return;
    }
    setSearchingManual(true);
    try {
      const response = await (api as ApiInstance).cachedGet('/products/');
      const rawList = response?.data?.results ?? response?.data;
      const products = Array.isArray(rawList) ? rawList : [];
      const query = text.toLowerCase().trim();
      const filtered = products
        .filter(
          (p: any) =>
            (p?.sku && String(p.sku).toLowerCase().includes(query)) ||
            (p?.name && String(p.name).toLowerCase().includes(query))
        )
        .slice(0, 5);
      setManualSearchResults(filtered);
    } catch {
      setManualSearchResults([]);
    } finally {
      setSearchingManual(false);
    }
  };

  const totalBatchUnits = batchManifest.reduce((acc, curr) => acc + curr.batchQty, 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* ─── 1. Executive Top Header ─── */}
      <View
        style={[
          styles.topHeader,
          {
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.75}
          style={[
            styles.headerCircleBtn,
            {
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#f8fafc',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
            },
          ]}
          onPress={handleClose}
          accessibilityLabel="Close Scanner"
        >
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.topHeaderCenter}>
          <View style={styles.titleRow}>
            <Text style={[styles.screenTitle, { color: colors.text }]}>Optical Scanner</Text>
            <View
              style={[
                styles.livePulsePill,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.14)' : '#ecfdf5',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#10b981',
                },
              ]}
            >
              <View style={styles.livePulseDot} />
              <Text style={styles.livePulseText}>Live HUD</Text>
            </View>
          </View>
        </View>

        {/* Header Right Action: Flashlight Toggle */}
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
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#f8fafc',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
                },
          ]}
          onPress={() => setTorchOn((prev) => !prev)}
          accessibilityLabel="Toggle Torch"
        >
          <Ionicons
            name={torchOn ? 'flash' : 'flash-outline'}
            size={19}
            color={torchOn ? '#d97706' : colors.text}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.maxContainer}>
          {/* ─── 2. Workflow Selector Pill (Inspect vs Rapid Batch) ─── */}
          <View
            style={[
              styles.workflowSelectorCard,
              {
                backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.workflowTab,
                workflow === 'inspect' && [
                  styles.workflowTabActive,
                  { backgroundColor: isDark ? '#0f172a' : '#ffffff' },
                ],
              ]}
              onPress={() => setWorkflow('inspect')}
            >
              <Ionicons
                name="eye-outline"
                size={16}
                color={workflow === 'inspect' ? '#10b981' : colors.textMuted}
              />
              <Text
                style={[
                  styles.workflowTabText,
                  { color: workflow === 'inspect' ? colors.text : colors.textMuted },
                ]}
              >
                Inspect & Restock
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.workflowTab,
                workflow === 'batch' && [
                  styles.workflowTabActive,
                  { backgroundColor: isDark ? '#0f172a' : '#ffffff' },
                ],
              ]}
              onPress={() => setWorkflow('batch')}
            >
              <Ionicons
                name="layers-outline"
                size={16}
                color={workflow === 'batch' ? '#10b981' : colors.textMuted}
              />
              <Text
                style={[
                  styles.workflowTabText,
                  { color: workflow === 'batch' ? colors.text : colors.textMuted },
                ]}
              >
                Continuous Batch
              </Text>
              {batchManifest.length > 0 && (
                <View style={styles.batchCountBadge}>
                  <Text style={styles.batchCountBadgeText}>{batchManifest.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* ─── 3. Precision Camera Viewfinder ─── */}
          <View
            style={[
              styles.cameraFrameCard,
              {
                backgroundColor: '#000000',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1',
              },
            ]}
          >
            <UniversalCameraScanner
              minimal
              mode={barcodeFilter}
              torch={torchOn}
              hideFloatingTorch={true}
              showModeSelector={true}
              onModeChange={(m) => setBarcodeFilter(m)}
              continuous={workflow === 'batch'}
              isScanned={workflow === 'inspect' ? !!scanResult : false}
              height={320}
              onScan={processScannedCode}
            />

            {/* Non-intrusive Rapid Batch Toast */}
            {batchFlashBanner && (
              <View style={styles.batchFlashToast}>
                <Ionicons name="checkmark-circle" size={16} color="#34d399" />
                <Text style={styles.batchFlashToastText} numberOfLines={1}>
                  {batchFlashBanner}
                </Text>
              </View>
            )}

            {/* In-Flight Decoding Spinner */}
            {processing && (
              <View style={styles.cameraDecodingPill}>
                <ActivityIndicator size="small" color="#10b981" />
                <Text style={styles.cameraDecodingText}>Decoding code...</Text>
              </View>
            )}
          </View>

          {/* ─── 4. Batch Mode Manifest Bar (Visible during Batch Mode) ─── */}
          {workflow === 'batch' && (
            <View
              style={[
                styles.batchActiveBar,
                {
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0',
                },
              ]}
            >
              <View style={styles.batchActiveBarLeft}>
                <Ionicons name="cube" size={20} color="#10b981" />
                <View>
                  <Text style={[styles.batchActiveTitle, { color: colors.text }]}>
                    {batchManifest.length} Items ({totalBatchUnits} Units)
                  </Text>
                  <Text style={[styles.batchActiveSub, { color: colors.textMuted }]}>
                    Continuous scan active • Point at next item
                  </Text>
                </View>
              </View>

              <View style={styles.batchActiveActions}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.batchBtnOutline, { borderColor: colors.border }]}
                  onPress={() => setShowBatchModal(true)}
                  disabled={batchManifest.length === 0}
                >
                  <Text style={[styles.batchBtnOutlineText, { color: colors.text }]}>
                    Manifest
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.batchBtnPrimary,
                    { opacity: batchManifest.length === 0 ? 0.6 : 1 },
                  ]}
                  onPress={handleCommitBatchStock}
                  disabled={batchManifest.length === 0 || committingBatch}
                >
                  {committingBatch ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="arrow-up-circle" size={15} color="#ffffff" />
                      <Text style={styles.batchBtnPrimaryText}>Apply Stock</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ─── 5. Single Inspect Mode Result Sheet ─── */}
          {workflow === 'inspect' && scanResult?.type === 'EXISTING_PRODUCT' && (
            <View
              style={[
                styles.resultCard,
                {
                  backgroundColor: isDark ? '#111827' : '#ffffff',
                  borderColor: '#10b981',
                },
              ]}
            >
              {/* Card Header */}
              <View style={styles.resultCardHeader}>
                <View style={styles.catalogPill}>
                  <Ionicons name="checkmark-circle" size={13} color="#10b981" />
                  <Text style={styles.catalogPillText}>IN STORE CATALOG</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setScanResult(null)}
                  style={styles.closeResultBtn}
                  accessibilityLabel="Dismiss Result"
                >
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Product Hero Info */}
              <View style={styles.productRow}>
                {scanResult.product.image ? (
                  <Image
                    source={{ uri: scanResult.product.image }}
                    style={styles.productThumb}
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

                <View style={styles.productCol}>
                  <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
                    {scanResult.product.name}
                  </Text>

                  <View style={styles.productMetaRow}>
                    <View
                      style={[
                        styles.skuPill,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
                        },
                      ]}
                    >
                      <Ionicons name="barcode-outline" size={12} color={colors.textMuted} />
                      <Text style={[styles.skuPillText, { color: colors.textMuted }]}>
                        {scanResult.product.sku}
                      </Text>
                    </View>
                    {scanResult.product.unit && (
                      <Text style={[styles.unitBadge, { color: colors.textMuted }]}>
                        {scanResult.product.unit}
                      </Text>
                    )}
                  </View>

                  {/* Price & Stock Status */}
                  <View style={styles.priceStockLine}>
                    <View style={styles.priceGroup}>
                      <Text style={styles.priceCurrent}>
                        ₹
                        {scanResult.product.offer_price ||
                          scanResult.product.regular_price ||
                          scanResult.product.price ||
                          '0'}
                      </Text>
                      {scanResult.product.offer_price && scanResult.product.regular_price ? (
                        <Text style={[styles.priceStrike, { color: colors.textMuted }]}>
                          ₹{scanResult.product.regular_price}
                        </Text>
                      ) : null}
                    </View>

                    <View
                      style={[
                        styles.stockBadge,
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

              {/* 1-Tap Instant Stock Adjustment Stepper */}
              <View
                style={[
                  styles.stockStepperBox,
                  {
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.55)' : '#f8fafc',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                  },
                ]}
              >
                <View style={styles.stepperHead}>
                  <Ionicons name="cube-outline" size={15} color={colors.textMuted} />
                  <Text style={[styles.stepperLabel, { color: colors.textMuted }]}>
                    Live Restock Stepper:
                  </Text>
                  {updatingStock && (
                    <ActivityIndicator size="small" color="#10b981" style={{ marginLeft: 6 }} />
                  )}
                </View>
                <View style={styles.stepperBtns}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    disabled={updatingStock || Number(scanResult.product.stock_quantity ?? 0) <= 0}
                    style={[
                      styles.stepperPillBtn,
                      {
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => handleQuickStockAdjust(scanResult.product, -1)}
                  >
                    <Text style={[styles.stepperPillBtnText, { color: colors.text }]}>-1</Text>
                  </TouchableOpacity>

                  {[1, 5, 10].map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      activeOpacity={0.7}
                      disabled={updatingStock}
                      style={[
                        styles.stepperPillBtn,
                        {
                          backgroundColor: isDark ? '#1e293b' : '#ffffff',
                          borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#a7f3d0',
                        },
                      ]}
                      onPress={() => handleQuickStockAdjust(scanResult.product, amt)}
                    >
                      <Text style={[styles.stepperPillBtnText, { color: '#10b981' }]}>+{amt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Action Buttons: Next Scan & Full Product Details */}
              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={[
                    styles.actionBtnOutline,
                    {
                      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f1f5f9',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                    },
                  ]}
                  onPress={() => setScanResult(null)}
                >
                  <Ionicons name="scan-outline" size={16} color={colors.text} />
                  <Text style={[styles.actionBtnOutlineText, { color: colors.text }]}>
                    Scan Next
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.actionBtnFilled, { backgroundColor: '#10b981' }]}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/products/new',
                      params: { id: String(scanResult.product.id) },
                    })
                  }
                >
                  <Ionicons name="create-outline" size={16} color="#ffffff" />
                  <Text style={styles.actionBtnFilledText}>Edit Product</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Referral Reward Sheet */}
          {workflow === 'inspect' && scanResult?.type === 'REFERRAL' && (
            <View
              style={[
                styles.resultCard,
                {
                  backgroundColor: isDark ? '#111827' : '#ffffff',
                  borderColor: '#8b5cf6',
                },
              ]}
            >
              <View style={styles.resultCardHeader}>
                <View
                  style={[
                    styles.catalogPill,
                    {
                      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.16)' : '#f5f3ff',
                      borderColor: '#8b5cf6',
                    },
                  ]}
                >
                  <Ionicons name="gift" size={13} color="#8b5cf6" />
                  <Text style={[styles.catalogPillText, { color: '#8b5cf6' }]}>
                    CUSTOMER REFERRAL VOUCHER
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setScanResult(null)}>
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.referralHero}>
                <View
                  style={[
                    styles.referralIconWrap,
                    { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.22)' : '#ede9fe' },
                  ]}
                >
                  <Ionicons name="gift-outline" size={28} color="#8b5cf6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.referralTitle, { color: colors.text }]}>
                    Referral Voucher #{scanResult.referralId}
                  </Text>
                  <Text style={[styles.referralSub, { color: colors.textMuted }]}>
                    Legitimate token verified. Ready to redeem customer benefit.
                  </Text>
                </View>
              </View>

              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={[
                    styles.actionBtnOutline,
                    {
                      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f1f5f9',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                    },
                  ]}
                  onPress={() => setScanResult(null)}
                >
                  <Text style={[styles.actionBtnOutlineText, { color: colors.text }]}>
                    Scan Next
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.actionBtnFilled, { backgroundColor: '#8b5cf6' }]}
                  disabled={processing}
                  onPress={() => handleRedeemReferral(scanResult.referralId, scanResult.rawToken)}
                >
                  {processing ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                      <Text style={styles.actionBtnFilledText}>Approve & Redeem</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Unregistered Barcode Intake Sheet */}
          {workflow === 'inspect' && scanResult?.type === 'NEW_BARCODE' && (
            <View
              style={[
                styles.resultCard,
                {
                  backgroundColor: isDark ? '#111827' : '#ffffff',
                  borderColor: '#f59e0b',
                },
              ]}
            >
              <View style={styles.resultCardHeader}>
                <View
                  style={[
                    styles.catalogPill,
                    {
                      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.16)' : '#fffbeb',
                      borderColor: '#f59e0b',
                    },
                  ]}
                >
                  <Ionicons name="barcode-outline" size={13} color="#f59e0b" />
                  <Text style={[styles.catalogPillText, { color: '#f59e0b' }]}>
                    UNREGISTERED BARCODE
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setScanResult(null)}>
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={{ gap: 4 }}>
                <Text style={[styles.newBarcodeTitle, { color: colors.text }]}>
                  {scanResult.globalSuggestion?.name || `Barcode: ${scanResult.sku}`}
                </Text>
                <Text style={[styles.newBarcodeDesc, { color: colors.textMuted }]}>
                  {scanResult.globalSuggestion?.name
                    ? `Matched "${scanResult.globalSuggestion.name}" in global registry. Add to catalog with pre-filled details.`
                    : `Barcode "${scanResult.sku}" is not yet in your inventory.`}
                </Text>
              </View>

              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={[
                    styles.actionBtnOutline,
                    {
                      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f1f5f9',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                    },
                  ]}
                  onPress={() => setScanResult(null)}
                >
                  <Text style={[styles.actionBtnOutlineText, { color: colors.text }]}>
                    Scan Next
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.actionBtnFilled, { backgroundColor: '#f59e0b' }]}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/products/new',
                      params: {
                        sku: scanResult.sku,
                        name: scanResult.globalSuggestion?.name || '',
                      },
                    })
                  }
                >
                  <Ionicons name="add-circle" size={16} color="#ffffff" />
                  <Text style={styles.actionBtnFilledText}>Add to Catalog</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ─── 6. Bottom Utility Actions (Manual Entry & Session History) ─── */}
          <View style={styles.bottomUtilitiesRow}>
            <TouchableOpacity
              activeOpacity={0.75}
              style={[
                styles.manualTriggerBtn,
                {
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.65)' : '#ffffff',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
                },
              ]}
              onPress={() => setShowManualModal(true)}
            >
              <Ionicons name="keypad-outline" size={17} color="#10b981" />
              <Text style={[styles.manualTriggerText, { color: colors.text }]}>
                Enter Barcode Manually
              </Text>
            </TouchableOpacity>
          </View>

          {/* ─── 7. Recent Scans Horizontal Carousel ─── */}
          {recentScans.length > 0 && (
            <View style={styles.recentTray}>
              <View style={styles.recentHead}>
                <View style={styles.recentHeadTitleGroup}>
                  <Ionicons name="time-outline" size={15} color={colors.textMuted} />
                  <Text style={[styles.recentHeadTitle, { color: colors.text }]}>
                    Session Scans ({recentScans.length})
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setRecentScans([])}>
                  <Text style={[styles.recentClearLink, { color: colors.textMuted }]}>Clear</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentScrollContainer}
              >
                {recentScans.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.75}
                    style={[
                      styles.recentChipCard,
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
                      size={15}
                      color={
                        item.type === 'EXISTING_PRODUCT'
                          ? '#10b981'
                          : item.type === 'REFERRAL'
                            ? '#8b5cf6'
                            : '#f59e0b'
                      }
                    />
                    <View style={{ maxWidth: 120 }}>
                      <Text
                        style={[styles.recentChipTitle, { color: colors.text }]}
                        numberOfLines={1}
                      >
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

          {/* ─── 8. Ergonomic Guidelines Micro-Card ─── */}
          <View
            style={[
              styles.guideBanner,
              {
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.35)' : '#f8fafc',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0',
              },
            ]}
          >
            <Ionicons name="sparkles-outline" size={15} color="#10b981" />
            <Text style={[styles.guideText, { color: colors.textMuted }]}>
              Fastest Capture: Align code horizontally inside the reticle under steady light.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ─── MODAL 1: Batch Session Manifest Sheet ─── */}
      <Modal
        visible={showBatchModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBatchModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.manifestModalCard,
              { backgroundColor: isDark ? '#0f172a' : '#ffffff' },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Batch Manifest</Text>
                <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                  {batchManifest.length} distinct items • {totalBatchUnits} total units
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowBatchModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {batchManifest.length === 0 ? (
                <View style={styles.emptyManifest}>
                  <Ionicons name="cube-outline" size={40} color={colors.textMuted} />
                  <Text style={[styles.emptyManifestText, { color: colors.textMuted }]}>
                    No items in current batch session.
                  </Text>
                </View>
              ) : (
                batchManifest.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.manifestItemRow,
                      {
                        borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
                      },
                    ]}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text
                        style={[styles.manifestItemName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text style={[styles.manifestItemSub, { color: colors.textMuted }]}>
                        SKU: {item.sku} • Stock: {item.currentStock}
                      </Text>
                    </View>

                    {/* Stepper for Batch Qty */}
                    <View style={styles.manifestStepper}>
                      <TouchableOpacity
                        style={[
                          styles.manifestStepBtn,
                          {
                            backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                          },
                        ]}
                        onPress={() => {
                          setBatchManifest((prev) =>
                            prev
                              .map((i) =>
                                i.id === item.id ? { ...i, batchQty: i.batchQty - 1 } : i
                              )
                              .filter((i) => i.batchQty > 0)
                          );
                        }}
                      >
                        <Text style={[styles.manifestStepBtnText, { color: colors.text }]}>-</Text>
                      </TouchableOpacity>
                      <Text style={[styles.manifestQtyText, { color: colors.text }]}>
                        {item.batchQty}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.manifestStepBtn,
                          {
                            backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                          },
                        ]}
                        onPress={() => {
                          setBatchManifest((prev) =>
                            prev.map((i) =>
                              i.id === item.id ? { ...i, batchQty: i.batchQty + 1 } : i
                            )
                          );
                        }}
                      >
                        <Text style={[styles.manifestStepBtnText, { color: '#10b981' }]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.manifestActions}>
              <TouchableOpacity
                style={[
                  styles.manifestClearBtn,
                  { borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0' },
                ]}
                onPress={() => {
                  setBatchManifest([]);
                  setShowBatchModal(false);
                }}
              >
                <Text style={[styles.manifestClearBtnText, { color: colors.textMuted }]}>
                  Clear Batch
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.manifestCommitBtn, { backgroundColor: '#10b981' }]}
                disabled={committingBatch || batchManifest.length === 0}
                onPress={handleCommitBatchStock}
              >
                {committingBatch ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.manifestCommitBtnText}>Apply Stock (+{totalBatchUnits})</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 2: Direct Manual Barcode Lookup ─── */}
      <Modal
        visible={showManualModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowManualModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View
            style={[
              styles.manualModalCard,
              { backgroundColor: isDark ? '#0f172a' : '#ffffff' },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Manual Barcode Entry
                </Text>
                <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                  Type SKU barcode digits or voucher code
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowManualModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.manualInputContainer,
                {
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#f8fafc',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#cbd5e1',
                },
              ]}
            >
              <Ionicons name="barcode-outline" size={20} color="#10b981" />
              <TextInput
                style={[styles.manualTextInput, { color: colors.text }]}
                placeholder="Enter 8-13 digit SKU or voucher code..."
                placeholderTextColor={colors.textMuted}
                value={manualCode}
                onChangeText={handleManualSearch}
                autoFocus
                autoCapitalize="none"
                returnKeyType="search"
                onSubmitEditing={() => {
                  if (manualCode.trim()) {
                    setShowManualModal(false);
                    processScannedCode(manualCode);
                  }
                }}
              />
              {manualCode.length > 0 && (
                <TouchableOpacity onPress={() => handleManualSearch('')}>
                  <Ionicons name="close-circle" size={17} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Instant Catalog Match Suggestions */}
            {searchingManual && (
              <ActivityIndicator size="small" color="#10b981" style={{ marginVertical: 8 }} />
            )}

            {manualSearchResults.length > 0 && (
              <View style={styles.manualSuggestionsList}>
                <Text style={[styles.suggestionHeader, { color: colors.textMuted }]}>
                  Catalog Matches ({manualSearchResults.length}):
                </Text>
                {manualSearchResults.map((prod) => (
                  <TouchableOpacity
                    key={prod.id}
                    style={[
                      styles.suggestionItem,
                      {
                        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#f1f5f9',
                      },
                    ]}
                    onPress={() => {
                      setShowManualModal(false);
                      setScanResult({ type: 'EXISTING_PRODUCT', product: prod });
                    }}
                  >
                    <Ionicons name="cube-outline" size={16} color="#10b981" />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.suggestionTitle, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {prod.name}
                      </Text>
                      <Text style={[styles.suggestionSub, { color: colors.textMuted }]}>
                        SKU: {prod.sku} • Stock: {prod.stock_quantity ?? 0}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.manualModalActions}>
              <TouchableOpacity
                style={[
                  styles.manualSubmitAction,
                  { backgroundColor: '#10b981', opacity: !manualCode.trim() ? 0.6 : 1 },
                ]}
                disabled={!manualCode.trim() || processing}
                onPress={() => {
                  if (manualCode.trim()) {
                    setShowManualModal(false);
                    processScannedCode(manualCode);
                  }
                }}
              >
                <Text style={styles.manualSubmitActionText}>Look Up Barcode</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Executive POS Styles ───
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    zIndex: 20,
  },
  topHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  screenTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  livePulsePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  livePulseText: {
    color: '#10b981',
    fontSize: 10.5,
    fontWeight: '800',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  maxContainer: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    gap: 14,
  },
  workflowSelectorCard: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  workflowTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  workflowTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  workflowTabText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  batchCountBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 2,
  },
  batchCountBadgeText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '800',
  },
  cameraFrameCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  batchFlashToast: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.5)',
    zIndex: 30,
  },
  batchFlashToastText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 240,
  },
  cameraDecodingPill: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 25,
  },
  cameraDecodingText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
  },
  batchActiveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  batchActiveBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  batchActiveTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  batchActiveSub: {
    fontSize: 11,
    marginTop: 1,
  },
  batchActiveActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  batchBtnOutline: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  batchBtnOutlineText: {
    fontSize: 12,
    fontWeight: '700',
  },
  batchBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  batchBtnPrimaryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  resultCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  resultCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catalogPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: '#10b981',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  catalogPillText: {
    color: '#10b981',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  closeResultBtn: {
    padding: 2,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productThumb: {
    width: 64,
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  productThumbFallback: {
    width: 64,
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productCol: {
    flex: 1,
    gap: 3,
  },
  productName: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 19,
  },
  productMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skuPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  skuPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  unitBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
  priceStockLine: {
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
  priceCurrent: {
    color: '#10b981',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  priceStrike: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  stockBadge: {
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
  stockStepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  stepperHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepperBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperPillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 32,
    alignItems: 'center',
  },
  stepperPillBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnOutlineText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  actionBtnFilled: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnFilledText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  referralHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  referralIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  referralSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  newBarcodeTitle: {
    fontSize: 15.5,
    fontWeight: '900',
  },
  newBarcodeDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  bottomUtilitiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manualTriggerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  manualTriggerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  recentTray: {
    gap: 8,
  },
  recentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentHeadTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentHeadTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  recentClearLink: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  recentScrollContainer: {
    gap: 8,
  },
  recentChipCard: {
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
  guideBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  guideText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  manifestModalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
    gap: 14,
  },
  manualModalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  emptyManifest: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  emptyManifestText: {
    fontSize: 13,
    fontWeight: '600',
  },
  manifestItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  manifestItemName: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  manifestItemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  manifestStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manifestStepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manifestStepBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  manifestQtyText: {
    fontSize: 13.5,
    fontWeight: '800',
    minWidth: 20,
    textAlign: 'center',
  },
  manifestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  manifestClearBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  manifestClearBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  manifestCommitBtn: {
    flex: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  manifestCommitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  manualInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
  },
  manualTextInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  manualSuggestionsList: {
    gap: 6,
    maxHeight: 180,
  },
  suggestionHeader: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
  },
  suggestionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  suggestionSub: {
    fontSize: 11,
    marginTop: 1,
  },
  manualModalActions: {
    marginTop: 4,
  },
  manualSubmitAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
  },
  manualSubmitActionText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
