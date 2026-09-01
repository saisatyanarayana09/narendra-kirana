import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppNavigationProp } from '../../navigation/types';
import { theme } from '../../constants/theme';
import { apiClient } from '../../api/client';

export function WalletScreen({ navigation }: { navigation: AppNavigationProp }) {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const res = await apiClient.get('/auth/wallet/');
      setWallet(res.data);
    } catch (error) {
      console.error('Failed to load wallet', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWallet();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={18} color="#059669" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Digital Wallet</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color="#059669" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Digital Wallet</Text>
      </View>

      <FlatList
        data={wallet?.transactions || []}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} tintColor="#059669" />
        }
        ListHeaderComponent={() => (
          <View style={styles.headerComponent}>
            {/* Emerald to Teal Gradient Hero Balance Card matching web Wallet.jsx */}
            <LinearGradient
              colors={['#10B981', '#0D9488']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <Text style={styles.heroCardLabel}>Your Wallet Balance</Text>
              <Text style={styles.heroBalanceAmount}>
                ₹{parseFloat(wallet?.balance || '0').toFixed(2)}
              </Text>
              <Text style={styles.heroSubtitle}>
                Use this balance at checkout to get instant discounts on your groceries.
              </Text>
            </LinearGradient>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Transaction History</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyCard}>
            <Feather name="dollar-sign" size={32} color="#CBD5E1" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyText}>
              No transactions yet. Earn money by referring friends!
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const amt = parseFloat(item.amount || '0');
          const isCredit = amt > 0;
          return (
            <View style={styles.transactionCard}>
              <View style={styles.transactionLeft}>
                <View style={[styles.txIconCircle, { backgroundColor: isCredit ? '#ECFDF5' : '#F8FAFC' }]}>
                  <Feather 
                    name={isCredit ? "arrow-down-left" : "arrow-up-right"} 
                    size={18} 
                    color={isCredit ? "#059669" : "#64748B"} 
                  />
                </View>
                <View style={styles.txDetails}>
                  <Text style={styles.txTypeTitle}>
                    {(item.transaction_type || 'TRANSACTION').replace(/_/g, ' ')}
                  </Text>
                  {item.description ? (
                    <Text style={styles.txDesc}>{item.description}</Text>
                  ) : null}
                  <Text style={styles.txDate}>{formatDate(item.created_at)}</Text>
                </View>
              </View>

              <Text style={[styles.txAmount, { color: isCredit ? '#059669' : '#0F172A' }]}>
                {isCredit ? '+' : '-'}₹{Math.abs(amt).toFixed(2)}
              </Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // slate-50
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerComponent: {
    marginBottom: 16,
  },
  heroCard: {
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  heroCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  heroBalanceAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
  },
  sectionHeaderRow: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 12,
  },
  txIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txDetails: {
    flex: 1,
  },
  txTypeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    textTransform: 'capitalize',
  },
  txDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  txDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
});
