import { AppNavigationProp } from '../../navigation/types';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../../constants/theme';
import { useCart } from '../../context/CartContext';
import { CartItemCard } from '../../components/CartItemCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export function CartScreen({ navigation }: { navigation: AppNavigationProp }) {
  const { cart, isLoading, updateQuantity, removeFromCart, applyPromo, removePromo } = useCart();
  const [promoCode, setPromoCode] = useState('');

  if (!cart) {
    return <LoadingSpinner fullScreen />;
  }

  if (cart.items.length === 0) {
    return (
      <SafeAreaView style={styles.emptyContainer} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Cart</Text>
        </View>
        <View style={styles.emptyContent}>
          <View style={styles.emptyIconCircle}>
            <Feather name="shopping-cart" size={48} color={theme.colors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Looks like you haven't added any groceries yet.</Text>
          <TouchableOpacity 
            style={styles.browseButton}
            onPress={() => navigation.navigate('HomeTab')}
          >
            <Text style={styles.browseButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    try {
      await applyPromo(promoCode.trim().toUpperCase());
      setPromoCode('');
    } catch (error: any) {
      Alert.alert('Invalid Code', error.response?.data?.error || 'Failed to apply promo code');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Cart</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{cart.items.length}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Cart Items */}
        <View style={styles.itemsSection}>
          {cart.items.map(item => (
            <CartItemCard 
              key={item.id} 
              item={item} 
              onUpdateQuantity={updateQuantity}
              onRemove={removeFromCart}
              isLoading={isLoading}
            />
          ))}
        </View>

        {/* Promo Code */}
        <View style={styles.promoSection}>
          {cart.promo_code ? (
            <View style={styles.activePromo}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="tag" size={16} color={theme.colors.success} />
                <Text style={styles.activePromoText}>{cart.promo_code} Applied</Text>
              </View>
              <TouchableOpacity onPress={removePromo} disabled={isLoading}>
                <Feather name="x" size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.promoInputContainer}>
              <TextInput
                style={styles.promoInput}
                placeholder="Enter promo code"
                value={promoCode}
                onChangeText={setPromoCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity 
                style={[styles.applyButton, !promoCode.trim() && styles.disabledButton]} 
                onPress={handleApplyPromo}
                disabled={!promoCode.trim() || isLoading}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bill Details */}
        <View style={styles.billSection}>
          <Text style={styles.billTitle}>Bill Details</Text>
          
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total Due</Text>
            <Text style={styles.billValue}>₹{cart.subtotal}</Text>
          </View>
          
          {parseFloat(cart.discount) > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Product Discount</Text>
              <Text style={styles.billValueDiscount}>-₹{cart.discount}</Text>
            </View>
          )}
          
          {parseFloat(cart.promo_discount) > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Promo Discount</Text>
              <Text style={styles.billValueDiscount}>-₹{cart.promo_discount}</Text>
            </View>
          )}
          
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Handling Fee</Text>
            <Text style={styles.billValue}>₹{cart.packaging_fee}</Text>
          </View>
          
          <View style={[styles.billRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>To Pay</Text>
            <Text style={styles.totalValue}>₹{cart.total}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomTotalLabel}>Total Due</Text>
          <Text style={styles.bottomTotalValue}>₹{cart.total}</Text>
        </View>
        <TouchableOpacity 
          style={styles.checkoutButton}
          onPress={() => navigation.navigate('CheckoutScreen')}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.colors.surface} size="small" />
          ) : (
            <Text style={styles.checkoutText}>Proceed to Checkout</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
  },
  badge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  browseButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: 16,
  },
  browseButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  itemsSection: {
    marginBottom: theme.spacing.lg,
  },
  promoSection: {
    marginBottom: theme.spacing.lg,
  },
  promoInputContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  promoInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    fontSize: 15,
  },
  applyButton: {
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  disabledButton: {
    opacity: 0.5,
  },
  applyButtonText: {
    color: theme.colors.surface,
    fontWeight: 'bold',
  },
  activePromo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  activePromoText: {
    color: theme.colors.success,
    fontWeight: 'bold',
    marginLeft: theme.spacing.sm,
  },
  billSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  billTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  billLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  billValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  billValueDiscount: {
    fontSize: 14,
    color: theme.colors.success,
    fontWeight: '500',
  },
  totalRow: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.text,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  bottomTotalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: theme.colors.textSecondary,
  },
  bottomTotalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.text,
  },
  checkoutButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: 16,
    minWidth: 180,
    alignItems: 'center',
  },
  checkoutText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
});


