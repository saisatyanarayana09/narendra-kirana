import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Gift, Share2, Copy } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { theme } from '../../constants/theme';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export function ReferAndEarnScreen({ navigation }: { navigation: NativeStackNavigationProp<any> }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiClient.get('/offers/referral-settings/');
      setSettings(res.data);
    } catch (error) {
      console.error('Error fetching referral settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Safe fallback if user has no code yet (though backend automatically creates it)
  const referralCode = user?.username ? user.username.substring(0, 8).toUpperCase() : 'SHARE123';
  const referralLink = `https://narendra-kirana.vercel.app/signup?ref=${referralCode}`;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Hey! Sign up for Narendra Kirana using my code ${referralCode} and we both get rewards! ${referralLink}`,
      });
    } catch (error) {
      console.error('Error sharing', error);
    }
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
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer & Earn</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.heroBox}>
          <Gift size={64} color={theme.colors.primary} style={styles.heroIcon} />
          <Text style={styles.heroTitle}>Invite Friends & Earn</Text>
          <Text style={styles.heroSubtitle}>
            Get ₹{settings?.referrer_reward_amount || '50'} when your friend places their first order of ₹{settings?.minimum_order_amount || '500'} or more.
          </Text>
        </View>

        <View style={styles.codeSection}>
          <Text style={styles.codeLabel}>Your Referral Code</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{referralCode}</Text>
            <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
              <Copy size={20} color={theme.colors.primary} />
              <Text style={styles.copyText}>{copied ? 'Copied!' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Share2 size={20} color={theme.colors.surface} />
          <Text style={styles.shareText}>Share Referral Link</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.statsButton} 
          onPress={() => { /* Navigate to Referral Stats */ }}
        >
          <Text style={styles.statsText}>View My Referrals</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: theme.spacing.md, backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  backButton: { marginRight: theme.spacing.md },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: theme.spacing.xl, alignItems: 'center' },
  heroBox: { alignItems: 'center', marginBottom: theme.spacing.xl },
  heroIcon: { marginBottom: theme.spacing.md },
  heroTitle: { fontSize: 24, fontWeight: '900', color: theme.colors.text, marginBottom: theme.spacing.sm },
  heroSubtitle: { fontSize: 15, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  codeSection: { width: '100%', marginBottom: theme.spacing.xl },
  codeLabel: { fontSize: 14, fontWeight: 'bold', color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  codeBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.colors.primaryLight, padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.primary + '30',
  },
  codeText: { fontSize: 24, fontWeight: 'bold', color: theme.colors.primaryDark, letterSpacing: 2 },
  copyButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyText: { color: theme.colors.primary, fontWeight: 'bold' },
  shareButton: {
    width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: theme.colors.primary, padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg, gap: theme.spacing.sm, marginBottom: theme.spacing.lg,
  },
  shareText: { color: theme.colors.surface, fontSize: 16, fontWeight: 'bold' },
  statsButton: { padding: theme.spacing.sm },
  statsText: { color: theme.colors.primary, fontSize: 16, fontWeight: 'bold' },
});
