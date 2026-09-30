import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { useAppTheme } from '../../../context/ThemeContext';
import ScreenHeader from '../../../components/ScreenHeader';

type Timeframe = '7' | '30' | 'all';

export default function ReportsScreen() {
  const { colors, isDark } = useAppTheme();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>('30');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchOrders = useCallback(async (forceRefresh = false) => {
    setErrorMsg(null);
    try {
      const res = await (api as ApiInstance).cachedGet('/orders/?limit=2000', { forceRefresh });
      const raw = res?.data?.results ?? res?.data;
      setOrders(Array.isArray(raw) ? raw : []);
    } catch (e: any) {
      if (e?.response?.status !== 401) {
        setErrorMsg(getErrorMessage(e, 'Failed to load sales analytics.'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders(true);
  }, [fetchOrders]);

  const { totalSales, totalOrders, aov, chartPoints, topProducts } = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    if (timeframe !== 'all') {
      cutoff.setDate(now.getDate() - parseInt(timeframe, 10));
    }

    // Filter valid completed/active orders
    const validOrders = orders.filter((o) => {
      const orderDate = new Date(o.created_at);
      const isTimeframe = timeframe === 'all' || orderDate >= cutoff;
      return o.status !== 'REJECTED' && isTimeframe;
    });

    const totalSalesNum = validOrders.reduce(
      (sum, o) => sum + (parseFloat(o.total_amount) || 0),
      0
    );
    const totalOrdersCount = validOrders.length;
    const aovNum = totalOrdersCount > 0 ? totalSalesNum / totalOrdersCount : 0;

    // Daily chart aggregation
    const dailyMap: Record<string, number> = {};
    validOrders.forEach((o) => {
      if (!o.created_at) return;
      const dateStr = new Date(o.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      dailyMap[dateStr] = (dailyMap[dateStr] || 0) + (parseFloat(o.total_amount) || 0);
    });

    const daysCount = timeframe === '7' ? 7 : timeframe === '30' ? 14 : 7;
    const chartList: { name: string; Sales: number }[] = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      chartList.push({
        name: dateStr,
        Sales: Math.round(dailyMap[dateStr] || 0),
      });
    }

    // Top Best Sellers aggregation
    const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    validOrders.forEach((o) => {
      (o.items || []).forEach((item: any) => {
        const pId = String(item.product || item.product_name_snapshot || 'item');
        const pName = item.product_name_snapshot || 'Product';
        if (!productMap[pId]) {
          productMap[pId] = { name: pName, quantity: 0, revenue: 0 };
        }
        productMap[pId].quantity += Number(item.quantity || 1);
        productMap[pId].revenue +=
          parseFloat(item.subtotal) ||
          (parseFloat(item.price_snapshot) || 0) * (item.quantity || 1);
      });
    });

    const bestSellers = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      totalSales: totalSalesNum.toFixed(2),
      totalOrders: totalOrdersCount,
      aov: aovNum.toFixed(2),
      chartPoints: chartList,
      topProducts: bestSellers,
    };
  }, [orders, timeframe]);

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  const maxSale = Math.max(1, ...chartPoints.map((pt) => pt.Sales));

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Universal Screen Header */}
      <ScreenHeader
        title="Sales & Analytics"
        subtitle={`₹${parseFloat(totalSales).toLocaleString('en-IN', { maximumFractionDigits: 0 })} revenue • ${totalOrders} orders`}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10b981"
          />
        }
      >
      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* Timeframe Selector */}
      <View style={[styles.timeframeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {[
          { key: '7', label: 'Past 7 Days' },
          { key: '30', label: 'Past 30 Days' },
          { key: 'all', label: 'All Time' },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[
              styles.timeframeBtn,
              timeframe === t.key && {
                backgroundColor: isDark ? '#064e3b' : '#ecfdf5',
                borderColor: '#10b981',
              },
            ]}
            onPress={() => setTimeframe(t.key as Timeframe)}
          >
            <Text
              style={[
                styles.timeframeText,
                {
                  color: timeframe === t.key ? '#10b981' : colors.textMuted,
                  fontWeight: timeframe === t.key ? '700' : '500',
                },
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Metrics Summary Grid */}
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.metricIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <Ionicons name="cash-outline" size={20} color="#10b981" />
          </View>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Total Revenue</Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>₹{totalSales}</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.metricIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
            <Ionicons name="cart-outline" size={20} color="#3b82f6" />
          </View>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Total Orders</Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>{totalOrders}</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border, width: '100%' }]}>
          <View style={[styles.metricIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
            <Ionicons name="trending-up-outline" size={20} color="#a855f7" />
          </View>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Average Order Value (AOV)</Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>₹{aov}</Text>
        </View>
      </View>

      {/* Sales Performance Chart Card */}
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.chartHeader}>
          <Ionicons name="bar-chart-outline" size={18} color="#10b981" />
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            Revenue Timeline ({timeframe === '7' ? '7 Days' : timeframe === '30' ? '14 Days' : 'Recent'})
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chartRow}>
            {chartPoints.map((pt, idx) => {
              const heightPercent = Math.min(100, Math.round((pt.Sales / maxSale) * 100));
              return (
                <View key={idx} style={styles.barCol}>
                  <Text style={[styles.barVal, { color: colors.textMuted }]}>
                    {pt.Sales > 0 ? `₹${pt.Sales}` : ''}
                  </Text>
                  <View style={[styles.barTrack, { backgroundColor: colors.cardAlt }]}>
                    <View
                      style={[
                        styles.barFill,
                        { height: `${Math.max(6, heightPercent)}%`, backgroundColor: '#10b981' },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, { color: colors.textMuted }]}>{pt.name}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Top Best Sellers Leaderboard */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.chartHeader}>
          <Ionicons name="trophy-outline" size={18} color="#f59e0b" />
          <Text style={[styles.chartTitle, { color: colors.text }]}>Top Best Selling Products</Text>
        </View>

        {topProducts.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No products sold in this timeframe.
          </Text>
        ) : (
          topProducts.map((p, idx) => (
            <View
              key={idx}
              style={[
                styles.sellerRow,
                { borderBottomColor: colors.border },
                idx === topProducts.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={[styles.rankBadge, { backgroundColor: idx < 3 ? '#f59e0b' : colors.cardAlt }]}>
                <Text style={[styles.rankText, { color: idx < 3 ? '#fff' : colors.textMuted }]}>
                  #{idx + 1}
                </Text>
              </View>
              <View style={{ flex: 1, paddingHorizontal: 10 }}>
                <Text style={[styles.sellerName, { color: colors.text }]} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={[styles.sellerQty, { color: colors.textMuted }]}>
                  {p.quantity} units sold
                </Text>
              </View>
              <Text style={[styles.sellerRev, { color: '#10b981' }]}>
                ₹{p.revenue.toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  errorBox: {
    padding: 12,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#fff',
    fontSize: 13,
  },
  timeframeRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  timeframeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  timeframeText: {
    fontSize: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 150,
    gap: 14,
    paddingTop: 10,
  },
  barCol: {
    alignItems: 'center',
    width: 48,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barVal: {
    fontSize: 9,
    marginBottom: 4,
    fontWeight: '600',
  },
  barTrack: {
    width: 14,
    flex: 1,
    borderRadius: 7,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  sellerName: {
    fontSize: 13,
    fontWeight: '600',
  },
  sellerQty: {
    fontSize: 11,
    marginTop: 2,
  },
  sellerRev: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 16,
    fontSize: 13,
  },
});
