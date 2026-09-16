import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { theme } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { CartItemCard } from '../../components/CartItemCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { triggerHaptic } from '../../utils/haptics';

export function CartScreen({ navigation }: { navigation: AppNavigationProp }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { cart, isLoading, updateQuantity, removeFromCart, clearCart, applyPromo, removePromo, storeSettings } = useCart();
  const { colors, isDark } = useTheme();
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoApplying, setPromoApplying] = useState(false);

  const items = cart?.items || [];

  const isStoreClosed = storeSettings?.is_open === false;
  const isEmergencyPaused = Boolean(storeSettings?.is_emergency_paused);
  const emergencyPauseMessage = storeSettings?.emergency_pause_message || "We are currently experiencing high order volume and will resume shortly. Thank you for your patience!";
  const {
    mrpTotal,
    discount,
    itemsTotal,
    cartSubtotal,
    minOrderAmount,
    isBelowMinOrder,
    minOrderShortfall,
    outOfStockItems,
    hasOutOfStock,
    freeDeliveryThreshold,
    freeDeliveryGap,
    freeDeliveryProgress,
  } = useMemo(() => {
    const mrp = parseFloat(cart?.subtotal || '0') || 0;
    const disc = parseFloat(cart?.discount || '0') || 0;
    const itmTotal = parseFloat(cart?.items_total || '0') || Math.max(0, mrp - disc);
    const minOrder = parseFloat(storeSettings?.min_order_amount || '0') || 0;
    const belowMin = minOrder > 0 && itmTotal < minOrder;
    const shortfall = Math.max(0, minOrder - itmTotal);

    const oos = items.filter((item) => {
      const stockQty = item.stock_quantity ?? item.product?.stock_quantity ?? 999;
      const inStock = item.is_in_stock !== false && item.product?.is_in_stock !== false;
      return !inStock || stockQty <= 0;
    });

    const freeThresh = parseFloat(storeSettings?.free_delivery_threshold || '0') || 0;
    const gap = Math.max(0, freeThresh - itmTotal);
    const progress = freeThresh > 0 ? Math.min(100, Math.round((itmTotal / freeThresh) * 100)) : 100;

    return {
      mrpTotal: mrp,
      discount: disc,
      itemsTotal: itmTotal,
      cartSubtotal: itmTotal,
      minOrderAmount: minOrder,
      isBelowMinOrder: belowMin,
      minOrderShortfall: shortfall,
      outOfStockItems: oos,
      hasOutOfStock: oos.length > 0,
      freeDeliveryThreshold: freeThresh,
      freeDeliveryGap: gap,
      freeDeliveryProgress: progress,
    };
  }, [cart?.subtotal, cart?.discount, cart?.items_total, storeSettings?.min_order_amount, storeSettings?.free_delivery_threshold, items]);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoError('');
    setPromoApplying(true);
    try {
      await applyPromo(promoCode.trim().toUpperCase());
      setPromoCode('');
    } catch (error: any) {
      setPromoError(error.response?.data?.detail || error.response?.data?.error || 'Invalid promo code');
    } finally {
      setPromoApplying(false);
    }
  };

  if (!cart) {
    return <LoadingSpinner fullScreen />;
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color={colors.primary} />
            <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconBox, { backgroundColor: colors.inputBg }]}>
            <Feather name="shopping-bag" size={44} color={colors.textSecondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Your cart is empty</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Looks like you haven't added anything to your cart yet. Browse our products and discover great deals.
          </Text>
          <TouchableOpacity 
            style={styles.startShoppingBtn}
            onPress={() => navigation.navigate('HomeTab')}
            activeOpacity={0.85}
          >
            <Text style={styles.startShoppingText}>Start shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header matching web */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color={colors.primary} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Your cart</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: items.length > 0 ? 115 + insets.bottom : 30 }]}
      >
        {/* Out of Stock Warning Banner */}
        {hasOutOfStock && (
          <View style={styles.outOfStockBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Feather name="alert-circle" size={15} color="#DC2626" />
              <Text style={styles.outOfStockBannerTitle}>Action Required: Out of Stock</Text>
            </View>
            <Text style={styles.outOfStockBannerText}>
              {outOfStockItems.length === 1 
                ? `1 item in your cart is currently out of stock. Please remove it to proceed to checkout.`
                : `${outOfStockItems.length} items in your cart are currently out of stock. Please remove them to proceed.`}
            </Text>
          </View>
        )}

        {/* Emergency Pause Warning */}
        {isEmergencyPaused && (
          <View style={styles.emergencyWarning}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Feather name="alert-triangle" size={16} color="#B45309" />
              <Text style={styles.emergencyWarningTitle}>Ordering Temporarily Paused</Text>
            </View>
            <Text style={styles.emergencyWarningText}>{emergencyPauseMessage}</Text>
          </View>
        )}

        {/* Store Closed Warning */}
        {isStoreClosed && (
          <View style={styles.closedWarning}>
            <Text style={styles.closedWarningText}>The store is currently closed.</Text>
          </View>
        )}

        {/* Minimum Order Shortfall Warning */}
        {isBelowMinOrder && (
          <View style={styles.minOrderWarning}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Feather name="info" size={14} color="#B45309" />
              <Text style={styles.minOrderWarningTitle}>Minimum Order Required</Text>
            </View>
            <Text style={styles.minOrderWarningText}>
              Minimum order is ₹{(minOrderAmount || 0).toFixed(2)}. Add ₹{minOrderShortfall.toFixed(2)} more to checkout.
            </Text>
          </View>
        )}

        {/* Free Delivery Motivational Progress Bar */}
        {freeDeliveryThreshold > 0 && (
          <View style={[styles.freeDeliveryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="truck" size={15} color={freeDeliveryGap === 0 ? '#10B981' : colors.primary} />
                <Text style={[styles.freeDeliveryText, { color: colors.text }]}>
                  {freeDeliveryGap === 0
                    ? '🎉 You unlocked FREE Delivery!'
                    : `Add ₹${freeDeliveryGap.toFixed(2)} more for FREE Delivery`}
                </Text>
              </View>
              <Text style={{ fontSize: 11, fontWeight: '700', color: freeDeliveryGap === 0 ? '#10B981' : colors.textSecondary }}>
                {freeDeliveryGap === 0 ? 'FREE' : `₹${itemsTotal.toFixed(0)} / ₹${freeDeliveryThreshold.toFixed(0)}`}
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.inputBg }]}>
              <View style={[styles.progressBar, { width: `${freeDeliveryProgress}%`, backgroundColor: freeDeliveryGap === 0 ? '#10B981' : colors.primary }]} />
            </View>
          </View>
        )}

        {/* Cart Items List */}
        <View style={styles.section}>
          {items.map(item => (
            <CartItemCard 
              key={item.id} 
              item={item} 
              onUpdateQuantity={updateQuantity}
              onRemove={removeFromCart}
              isLoading={isLoading}
            />
          ))}
        </View>

        {/* Promo Code Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.promoForm}>
            <TextInput
              style={[styles.promoInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter promo code"
              placeholderTextColor={colors.textSecondary}
              value={promoCode}
              onChangeText={(t) => {
                setPromoCode(t.toUpperCase());
                if (promoError) setPromoError('');
              }}
              autoCapitalize="characters"
            />
            <TouchableOpacity 
              style={[styles.applyBtn, isDark && { backgroundColor: colors.primary }, (!promoCode.trim() || promoApplying) && styles.disabledApplyBtn]} 
              onPress={handleApplyPromo}
              disabled={!promoCode.trim() || promoApplying || isLoading}
              activeOpacity={0.8}
            >
              {promoApplying ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.applyBtnText}>Apply</Text>
              )}
            </TouchableOpacity>
          </View>

          {promoError ? (
            <View style={styles.promoErrorRow}>
              <Feather name="alert-circle" size={13} color="#DC2626" />
              <Text style={styles.promoErrorText}>{promoError}</Text>
            </View>
          ) : null}

          {cart.promo_code ? (
            <View style={[styles.appliedPromoRow, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
              <View>
                <Text style={[styles.appliedPromoTag, isDark && { color: '#34D399' }]}>Code Applied</Text>
                <Text style={[styles.appliedPromoCode, isDark && { color: colors.text }]}>{cart.promo_code}</Text>
              </View>
              <TouchableOpacity 
                style={[styles.removePromoBtn, isDark && { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={async () => {
                  setPromoError('');
                  await removePromo();
                }} 
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={[styles.removePromoText, isDark && { color: colors.text }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Order Summary Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Order Summary</Text>
          
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Item MRP Total</Text>
              <Text style={[styles.mrpStrikeText, { color: colors.textSecondary }]}>₹{mrpTotal.toFixed(2)}</Text>
            </View>
          )}

          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.savingsLabel}>Product Savings</Text>
              <Text style={styles.savingsValue}>-₹{discount.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              {discount > 0 ? 'Item Subtotal' : 'Subtotal'}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>₹{itemsTotal.toFixed(2)}</Text>
          </View>

          {parseFloat(cart?.promo_discount || '0') > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.savingsLabel}>Promo Discount</Text>
              <Text style={styles.savingsValue}>-₹{(parseFloat(cart.promo_discount || '0') || 0).toFixed(2)}</Text>
            </View>
          )}

          {parseFloat(cart?.packaging_fee || '0') > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Packaging Fee</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>₹{(parseFloat(cart.packaging_fee || '0') || 0).toFixed(2)}</Text>
            </View>
          )}

          {(discount > 0 || parseFloat(cart?.promo_discount || '0') > 0) && (
            <View style={[styles.savingsHighlightCard, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
              <Feather name="gift" size={14} color="#059669" />
              <Text style={styles.savingsHighlightText}>
                You are saving ₹{(discount + (parseFloat(cart?.promo_discount || '0') || 0)).toFixed(2)} on this order!
              </Text>
            </View>
          )}

          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total Due</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>₹{(parseFloat(cart.total || '0') || 0).toFixed(2)}</Text>
          </View>

          {/* Store status banners in summary */}
          {hasOutOfStock ? (
            <View style={styles.summaryWarningOutOfStock}>
              <Feather name="alert-circle" size={14} color="#DC2626" />
              <Text style={styles.summaryWarningOutOfStockText}>Some items in your cart are currently out of stock.</Text>
            </View>
          ) : isEmergencyPaused ? (
            <View style={styles.summaryWarningEmergency}>
              <Feather name="alert-triangle" size={14} color="#B45309" />
              <Text style={styles.summaryWarningEmergencyText}>Ordering is temporarily paused by the store.</Text>
            </View>
          ) : isStoreClosed ? (
            <View style={styles.summaryWarningClosed}>
              <Text style={styles.summaryWarningClosedText}>The store is currently closed.</Text>
            </View>
          ) : isBelowMinOrder ? (
            <View style={styles.summaryWarningMinOrder}>
              <Text style={styles.summaryWarningMinOrderText}>
                Minimum order is ₹{(minOrderAmount || 0).toFixed(2)} (Add ₹{minOrderShortfall.toFixed(2)} more)
              </Text>
            </View>
          ) : (
            <View style={styles.summaryTrustRow}>
              <Feather name="shield" size={13} color={colors.primary} />
              <Text style={[styles.summaryTrustText, { color: colors.textSecondary }]}>100% Genuine Products · Safe Delivery</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Checkout Bar – Always visible with clear disabled state */}
      {items.length > 0 && (
        <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View>
            <Text style={[styles.bottomTotalLabel, { color: colors.textSecondary }]}>TOTAL DUE</Text>
            <Text style={[styles.bottomTotalValue, { color: colors.text }]}>₹{(parseFloat(cart.total || '0') || 0).toFixed(2)}</Text>
          </View>

          {hasOutOfStock ? (
            <TouchableOpacity 
              style={[styles.checkoutBtn, styles.disabledCheckoutBtn]}
              onPress={() => Alert.alert('Out of Stock', 'Please remove the out-of-stock items from your cart to proceed to checkout.')}
              activeOpacity={0.8}
            >
              <Text style={styles.checkoutBtnText}>Remove Out of Stock</Text>
            </TouchableOpacity>
          ) : isEmergencyPaused ? (
            <TouchableOpacity 
              style={[styles.checkoutBtn, styles.disabledCheckoutBtn]}
              onPress={() => Alert.alert('Orders Temporarily Paused', emergencyPauseMessage)}
              activeOpacity={0.8}
            >
              <Text style={styles.checkoutBtnText}>Orders Paused</Text>
            </TouchableOpacity>
          ) : isStoreClosed ? (
            <TouchableOpacity 
              style={[styles.checkoutBtn, styles.disabledCheckoutBtn]}
              onPress={() => Alert.alert('Store Closed', 'The store is currently closed and not accepting new orders.')}
              activeOpacity={0.8}
            >
              <Text style={styles.checkoutBtnText}>Store Closed</Text>
            </TouchableOpacity>
          ) : isBelowMinOrder ? (
            <TouchableOpacity 
              style={[styles.checkoutBtn, styles.disabledCheckoutBtn]}
              onPress={() => Alert.alert('Minimum Order Required', `Please add ₹${minOrderShortfall.toFixed(2)} more to reach the minimum order amount of ₹${minOrderAmount.toFixed(2)}.`)}
              activeOpacity={0.8}
            >
              <Text style={styles.checkoutBtnText}>Add ₹{minOrderShortfall.toFixed(2)} More</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.checkoutBtn}
              onPress={() => {
                if (!user) {
                  triggerHaptic('light');
                  Alert.alert(
                    'Sign In Required',
                    'Please sign in or create an account to place your order. Your cart items will be saved!',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Sign In',
                        onPress: () => {
                          navigation.navigate('Login' as any);
                        },
                      },
                    ]
                  );
                  return;
                }
                triggerHaptic('selection');
                navigation.navigate('CheckoutScreen');
              }}
              disabled={isLoading}
              activeOpacity={0.9}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.checkoutBtnContent}>
                  <Text style={styles.checkoutBtnText}>Checkout</Text>
                  <Feather name="arrow-right" size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles: any = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // slate-50
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    position: 'relative',
  },
  mrpStrikeText: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'line-through',
  },
  savingsHighlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  savingsHighlightText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    flex: 1,
  },
  outOfStockBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  outOfStockBannerTitle: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 14,
  },
  outOfStockBannerText: {
    color: '#991B1B',
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 18,
  },
  summaryWarningOutOfStock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  summaryWarningOutOfStockText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 12,
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 280,
  },
  startShoppingBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  startShoppingText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  closedWarning: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    alignItems: 'center',
  },
  closedWarningText: {
    color: '#B91C1C',
    fontWeight: '700',
    fontSize: 14,
  },
  emergencyWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  emergencyWarningTitle: {
    color: '#B45309',
    fontWeight: '800',
    fontSize: 14,
  },
  emergencyWarningText: {
    color: '#92400E',
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 18,
  },
  minOrderWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  minOrderWarningTitle: {
    color: '#B45309',
    fontWeight: '800',
    fontSize: 13,
  },
  minOrderWarningText: {
    color: '#B45309',
    fontWeight: '700',
    fontSize: 13,
  },
  freeDeliveryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  freeDeliveryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  section: {
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  promoForm: {
    flexDirection: 'row',
    gap: 8,
  },
  promoInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  applyBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 18,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledApplyBtn: {
    backgroundColor: '#CBD5E1',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  promoErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  promoErrorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    flex: 1,
  },
  appliedPromoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 12,
    borderRadius: 12,
  },
  appliedPromoTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  appliedPromoCode: {
    fontSize: 15,
    fontWeight: '800',
    color: '#064E3B',
    marginTop: 2,
  },
  removePromoBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  removePromoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
  },
  savingsLabel: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  savingsValue: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    marginTop: 6,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  summaryWarningClosed: {
    marginTop: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    alignItems: 'center',
  },
  summaryWarningClosedText: {
    color: '#B91C1C',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  summaryWarningEmergency: {
    marginTop: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryWarningEmergencyText: {
    color: '#B45309',
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
  },
  summaryWarningMinOrder: {
    marginTop: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    alignItems: 'center',
  },
  summaryWarningMinOrderText: {
    color: '#B45309',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  summaryTrustRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
  },
  summaryTrustText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  checkoutBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 6,
  },
  bottomTotalLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  bottomTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 1,
  },
  checkoutBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 22,
    paddingVertical: 12,
    minHeight: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  disabledCheckoutBtn: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default CartScreen;
