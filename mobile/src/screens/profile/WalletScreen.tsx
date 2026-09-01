import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { theme } from '../../constants/theme';
import { apiClient } from '../../api/client';

export function WalletScreen({ navigation }: { navigation: AppNavigationProp }) {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const res = await apiClient.get('/auth/wallet/');
      setWallet(res.data);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" color={theme.colors.surface} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wallet</Text>
      </View>

      <View style={styles.balanceCardContainer}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>₹{wallet?.balance || '0.00'}</Text>
          <Feather name="briefcase" size={64} color="rgba(255,255,255,0.2)" style={styles.bgIcon} />
        </View>
      </View>

      <View style={styles.transactionsSection}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        
        {(!wallet?.transactions || wallet.transactions.length === 0) ? (
          <View style={styles.emptyContent}>
            <Text style={styles.emptyText}>No transactions yet.</Text>
          </View>
        ) : (
          <FlatList
            data={wallet.transactions}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isCredit = item.transaction_type === 'CREDIT';
              return (
                <View style={styles.transactionCard}>
                  <View style={[styles.iconBox, { backgroundColor: isCredit ? theme.colors.success + '20' : theme.colors.error + '20' }]}>
                    {isCredit ? (
                      <Feather name="arrow-down-left" size={20} color={theme.colors.success} />
                    ) : (
                      <Feather name="arrow-up-right" size={20} color={theme.colors.error} />
                    )}
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDesc}>{item.description}</Text>
                    <Text style={styles.transactionDate}>{formatDate(item.created_at)}</Text>
                  </View>
                  <Text style={[styles.transactionAmount, { color: isCredit ? theme.colors.success : theme.colors.error }]}>
                    {isCredit ? '+' : '-'}₹{item.amount}
                  </Text>
                </View>
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: theme.spacing.md, backgroundColor: theme.colors.primary,
  },
  backButton: { marginRight: theme.spacing.md },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  balanceCardContainer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
  },
  balanceCard: {
    backgroundColor: theme.colors.primaryDark,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    overflow: 'hidden',
  },
  balanceLabel: { color: theme.colors.primaryLight, fontSize: 14, marginBottom: 8 },
  balanceAmount: { color: theme.colors.surface, fontSize: 36, fontWeight: '900' },
  bgIcon: { position: 'absolute', right: -10, bottom: -10 },
  transactionsSection: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: theme.spacing.md },
  emptyContent: { padding: theme.spacing.xl, alignItems: 'center' },
  emptyText: { color: theme.colors.textSecondary },
  transactionCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  transactionInfo: { flex: 1 },
  transactionDesc: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 2 },
  transactionDate: { fontSize: 12, color: theme.colors.textSecondary },
  transactionAmount: { fontSize: 16, fontWeight: 'bold' },
});


