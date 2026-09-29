import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';

interface ChartPoint {
  name: string;
  Sales: number;
}

interface AnalyticsData {
  today_sales: number;
  weekly_sales: number;
  monthly_sales: number;
  yearly_sales: number;
  chart_data: ChartPoint[];
}

export default function ReportsScreen() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchReports = useCallback(async (forceRefresh = false) => {
    setErrorMsg(null);
    try {
      const res = await (api as ApiInstance).cachedGet('/orders/analytics/', { forceRefresh });
      if (res?.data) {
        setAnalytics(res.data);
      }
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
    fetchReports();
  }, [fetchReports]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReports(true);
  }, [fetchReports]);

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  const chartPoints = Array.isArray(analytics?.chart_data) ? analytics!.chart_data : [];
  const maxSale = Math.max(1, ...chartPoints.map((pt) => Number(pt?.Sales) || 0));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
    >
      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Today&apos;s Sales</Text>
          <Text style={styles.cardValue}>₹{analytics?.today_sales ?? 0}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>This Week</Text>
          <Text style={styles.cardValue}>₹{analytics?.weekly_sales ?? 0}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>This Month</Text>
          <Text style={styles.cardValue}>₹{analytics?.monthly_sales ?? 0}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>This Year</Text>
          <Text style={styles.cardValue}>₹{analytics?.yearly_sales ?? 0}</Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Last 7 Days Performance</Text>
        {chartPoints.length === 0 ? (
          <Text style={styles.emptyText}>No chart data available yet.</Text>
        ) : (
          chartPoints.map((pt, idx) => {
            const val = Number(pt?.Sales) || 0;
            const widthPct = Math.max(4, Math.min(100, Math.round((val / maxSale) * 100)));
            return (
              <View key={pt?.name || `day-${idx}`} style={styles.barRow}>
                <Text style={styles.dayLabel}>{pt?.name || '—'}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${widthPct}%` }]} />
                </View>
                <Text style={styles.barAmount}>₹{val}</Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBox: {
    backgroundColor: '#450a0a',
    borderColor: '#dc2626',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#fecaca',
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardLabel: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 6,
  },
  cardValue: {
    color: '#10b981',
    fontSize: 22,
    fontWeight: 'bold',
  },
  chartCard: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chartTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayLabel: {
    color: '#cbd5e1',
    width: 56,
    fontSize: 12,
  },
  barTrack: {
    flex: 1,
    height: 12,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  barFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 6,
  },
  barAmount: {
    color: '#f8fafc',
    width: 72,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
