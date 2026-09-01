import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  Share,
  Modal 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { AppNavigationProp } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';

export function ReferAndEarnScreen({ navigation }: { navigation: AppNavigationProp }) {
  const { user } = useAuth();
  
  const [settings, setSettings] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const [qrModal, setQrModal] = useState<{ isOpen: boolean; referralId: any; base64: string | null }>({
    isOpen: false,
    referralId: null,
    base64: null,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, historyRes, walletRes, milestonesRes] = await Promise.all([
        apiClient.get('/offers/referral-settings/').catch(() => ({ data: {} })),
        apiClient.get('/offers/referrals/').catch(() => ({ data: [] })),
        apiClient.get('/auth/wallet/').catch(() => ({ data: { balance: 0, transactions: [] } })),
        apiClient.get('/offers/referral-milestones/').catch(() => ({ data: [] })),
      ]);

      setSettings(settingsRes.data || {});
      setHistory(Array.isArray(historyRes.data) ? historyRes.data : (historyRes.data?.results || []));
      setWallet(walletRes.data || {});
      setMilestones(Array.isArray(milestonesRes.data) ? milestonesRes.data : (milestonesRes.data?.results || []));
    } catch (err) {
      console.error('Error loading referral data', err);
    } finally {
      setLoading(false);
    }
  };

  const referralCode = user?.customer_profile?.referral_code || user?.referral_code || `REF-${(user?.username || 'USER').slice(0, 5).toUpperCase()}`;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Alert.alert('Copied!', 'Referral code copied to clipboard.');
  };

  const handleShare = async () => {
    const shareText = settings?.share_text_template
      ? settings.share_text_template.replace('{code}', referralCode).replace('{link}', '')
      : `Shop online at Narendra Kirana and get special discounts! Use my referral code: ${referralCode}`;

    try {
      await Share.share({
        message: shareText,
        title: 'Join me on Narendra Kirana',
      });
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleShowQR = async (referralId: number) => {
    try {
      const res = await apiClient.get(`/offers/referrals/${referralId}/qr_code/`);
      setQrModal({ isOpen: true, referralId, base64: res.data.qr_code_base64 });
    } catch (err) {
      Alert.alert('Error', 'Failed to load QR code.');
    }
  };

  const handleClaim = async (referralId: number) => {
    try {
      await apiClient.post(`/offers/referrals/${referralId}/claim/`);
      Alert.alert('Reward Claimed', 'Show this QR code to the store owner at checkout.');
      setHistory(prev => prev.map(h => h.id === referralId ? { ...h, status: 'AWAITING_APPROVAL' } : h));
      handleShowQR(referralId);
    } catch (err) {
      Alert.alert('Error', 'Failed to claim reward.');
    }
  };

  const completedReferrals = history.filter(h => h.status === 'COMPLETED').length;
  const pendingReferrals = history.filter(h => h.status === 'PENDING').length;
  const totalEarned = (wallet?.transactions || [])
    .filter((t: any) => t.transaction_type === 'REFERRAL_REWARD' || t.transaction_type === 'MILESTONE_BONUS')
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount || '0'), 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={18} color="#059669" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Refer & Earn</Text>
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
        <Text style={styles.headerTitle}>Refer & Earn</Text>
        <Text style={styles.headerSubtitle}>Invite friends, earn real store credit!</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* Dark Hero Card matching web ReferAndEarn.jsx */}
        <View style={styles.heroCard}>
          <View style={styles.badgePill}>
            <Feather name="gift" size={12} color="#34D399" />
            <Text style={styles.badgeText}>PREMIUM REFERRAL PROGRAM</Text>
          </View>

          <Text style={styles.heroTitle}>
            Earn <Text style={styles.heroTitleGreen}>₹{parseFloat(settings?.referrer_reward_amount || '50').toFixed(0)} Store Credit</Text> for every friend you invite.
          </Text>

          <Text style={styles.heroSub}>
            Your friend also gets ₹{parseFloat(settings?.referee_reward_amount || '25').toFixed(0)} off on their first order!
          </Text>

          {/* Referral Code Box */}
          <View style={styles.codeContainer}>
            <View>
              <Text style={styles.codeLabel}>YOUR REFERRAL CODE</Text>
              <Text style={styles.codeText}>{referralCode}</Text>
            </View>

            <TouchableOpacity 
              style={[styles.copyBtn, copied && styles.copyBtnSuccess]}
              onPress={handleCopy}
              activeOpacity={0.8}
            >
              <Feather name={copied ? "check" : "copy"} size={16} color="#FFFFFF" />
              <Text style={styles.copyBtnText}>{copied ? "Copied" : "Copy"}</Text>
            </TouchableOpacity>
          </View>

          {/* Share Button */}
          <TouchableOpacity 
            style={styles.shareBtn}
            onPress={handleShare}
            activeOpacity={0.9}
          >
            <Feather name="share-2" size={18} color="#FFFFFF" />
            <Text style={styles.shareBtnText}>Share Code with Friends</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹{totalEarned.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#059669' }]}>{completedReferrals}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#D97706' }]}>{pendingReferrals}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* How It Works 3 Steps */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          
          <View style={styles.stepRow}>
            <View style={styles.stepNumberCircle}><Text style={styles.stepNumber}>1</Text></View>
            <View style={styles.stepInfo}>
              <Text style={styles.stepHeading}>Share Your Code</Text>
              <Text style={styles.stepDesc}>Send your unique code or link to friends and family.</Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepNumberCircle}><Text style={styles.stepNumber}>2</Text></View>
            <View style={styles.stepInfo}>
              <Text style={styles.stepHeading}>Friend Places Order</Text>
              <Text style={styles.stepDesc}>They sign up with your code and complete their first grocery order.</Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepNumberCircle}><Text style={styles.stepNumber}>3</Text></View>
            <View style={styles.stepInfo}>
              <Text style={styles.stepHeading}>You Both Get Rewarded</Text>
              <Text style={styles.stepDesc}>Store credit is added directly to your digital wallet.</Text>
            </View>
          </View>
        </View>

        {/* Referrals History List */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Your Referral Network</Text>
          
          {history.length === 0 ? (
            <View style={styles.emptyNetwork}>
              <Feather name="users" size={32} color="#CBD5E1" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyNetworkText}>
                You haven't referred any friends yet. Share your code above to get started!
              </Text>
            </View>
          ) : (
            history.map((item) => (
              <View key={item.id} style={styles.referralCard}>
                <View style={styles.refLeft}>
                  <View style={styles.refAvatar}>
                    <Text style={styles.refAvatarLetter}>
                      {(item.referee_name || 'F').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.refName}>{item.referee_name || 'Friend'}</Text>
                    <Text style={styles.refDate}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.refRight}>
                  <View style={[
                    styles.refStatusBadge, 
                    item.status === 'COMPLETED' && styles.statusCompleted,
                    item.status === 'PENDING' && styles.statusPending,
                    item.status === 'READY_TO_CLAIM' && styles.statusClaimable,
                  ]}>
                    <Text style={[
                      styles.refStatusText,
                      item.status === 'COMPLETED' && styles.statusTextCompleted,
                      item.status === 'PENDING' && styles.statusTextPending,
                      item.status === 'READY_TO_CLAIM' && styles.statusTextClaimable,
                    ]}>
                      {item.status?.replace('_', ' ')}
                    </Text>
                  </View>

                  {item.status === 'READY_TO_CLAIM' && (
                    <TouchableOpacity 
                      style={styles.claimBtn}
                      onPress={() => handleClaim(item.id)}
                    >
                      <Text style={styles.claimBtnText}>Claim</Text>
                    </TouchableOpacity>
                  )}

                  {item.status === 'AWAITING_APPROVAL' && (
                    <TouchableOpacity 
                      style={styles.showQrBtn}
                      onPress={() => handleShowQR(item.id)}
                    >
                      <Feather name="maximize" size={12} color="#4F46E5" />
                      <Text style={styles.showQrBtnText}>Show QR</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* QR Code Modal for In-Store Claiming */}
      <Modal
        visible={qrModal.isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setQrModal({ isOpen: false, referralId: null, base64: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Show QR at Checkout</Text>
            <Text style={styles.modalSub}>
              Present this QR code to the store owner to claim your referral reward.
            </Text>

            {qrModal.base64 ? (
              <Image 
                source={{ uri: `data:image/png;base64,${qrModal.base64}` }} 
                style={styles.qrImage} 
                contentFit="contain"
              />
            ) : (
              <ActivityIndicator size="large" color="#059669" style={{ marginVertical: 30 }} />
            )}

            <TouchableOpacity 
              style={styles.closeModalBtn}
              onPress={() => setQrModal({ isOpen: false, referralId: null, base64: null })}
            >
              <Text style={styles.closeModalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
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
  heroCard: {
    backgroundColor: '#0F172A', // slate-900
    borderRadius: 22,
    padding: 22,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 28,
    marginBottom: 6,
  },
  heroTitleGreen: {
    color: '#34D399',
  },
  heroSub: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 18,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  codeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  codeText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  copyBtnSuccess: {
    backgroundColor: '#10B981',
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981', // green
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  stepNumberCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '900',
    color: '#059669',
  },
  stepInfo: {
    flex: 1,
  },
  stepHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  emptyNetwork: {
    padding: 24,
    alignItems: 'center',
  },
  emptyNetworkText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  referralCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  refLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  refAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refAvatarLetter: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  refName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  refDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  refRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  statusCompleted: {
    backgroundColor: '#ECFDF5',
  },
  statusPending: {
    backgroundColor: '#FFFBEB',
  },
  statusClaimable: {
    backgroundColor: '#EEF2FF',
  },
  refStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  statusTextCompleted: {
    color: '#059669',
  },
  statusTextPending: {
    color: '#D97706',
  },
  statusTextClaimable: {
    color: '#4F46E5',
  },
  claimBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  claimBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  showQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  showQrBtnText: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 20,
  },
  qrImage: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  closeModalBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  closeModalBtnText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 14,
  },
});
