import React, { useState } from 'react';
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
  const { cart, isLoading, updateQuantity, removeFromCart, applyPromo, removePromo, storeSettings } = useCart();
  const { colors, isDark } = useTheme();
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoApplying, setPromoApplying] = useState(false);

  if (!cart) {
    return <LoadingSpinner fullScreen />;
  }

  const items = cart.items || [];

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
            <Text style={styles.startShoppingBtnText}>Start shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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

  const isStoreClosed = storeSettings?.is_open === false;
  const minOrderAmount = parseFloat(storeSettings?.min_order_amount || '0');
  const cartSubtotal = parseFloat(cart?.subtotal || '0');
  const isBelowMinOrder = minOrderAmount > 0 && cartSubtotal < minOrderAmount;

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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 75 + insets.bottom }]}
      >
        {/* Store Closed or Minimum Order Warning */}
        {isStoreClosed && (
          <View style={styles.closedWarning}>
            <Text style={styles.closedWarningText}>The store is currently closed.</Text>
          </View>
        )}

        {isBelowMinOrder && (
          <View style={styles.minOrderWarning}>
            <Text style={styles.minOrderWarningText}>
              Minimum order amount is ₹{minOrderAmount.toFixed(2)}
            </Text>
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
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Subtotal</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>₹{parseFloat(cart.subtotal || '0').toFixed(2)}</Text>
          </View>

          {parseFloat(cart.discount || '0') > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.savingsLabel}>Product Savings</Text>
              <Text style={styles.savingsValue}>-₹{parseFloat(cart.discount).toFixed(2)}</Text>
            </View>
          )}

          {parseFloat(cart.promo_discount || '0') > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.savingsLabel}>Promo Discount</Text>
              <Text style={styles.savingsValue}>-₹{parseFloat(cart.promo_discount).toFixed(2)}</Text>
            </View>
          )}

          {parseFloat(cart.packaging_fee || '0') > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Packaging Fee</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>₹{parseFloat(cart.packaging_fee).toFixed(2)}</Text>
            </View>
          )}

          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total Due</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>₹{parseFloat(cart.total || '0').toFixed(2)}</Text>
          </View>

          {/* Store status banners in summary */}
          {isStoreClosed ? (
            <View style={styles.summaryWarningClosed}>
              <Text style={styles.summaryWarningClosedText}>The store is currently closed.</Text>
            </View>
          ) : isBelowMinOrder ? (
            <View style={styles.summaryWarningMinOrder}>
              <Text style={styles.summaryWarningMinOrderText}>
                Minimum order amount is ₹{minOrderAmount.toFixed(2)}
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

      {/* Sticky Bottom Checkout Bar – The ONLY checkout action */}
      {!isStoreClosed && !isBelowMinOrder && items.length > 0 && (
        <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 8) }]}>
          <View>
            <Text style={[styles.bottomTotalLabel, { color: colors.textSecondary }]}>TOTAL DUE</Text>
            <Text style={[styles.bottomTotalValue, { color: colors.text }]}>₹{parseFloat(cart.total || '0').toFixed(2)}</Text>
          </View>

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
  minOrderWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    alignItems: 'center',
  },
  minOrderWarningText: {
    color: '#B45309',
    fontWeight: '700',
    fontSize: 14,
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
    paddingTop: 8,
    paddingBottom: 8,
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
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
