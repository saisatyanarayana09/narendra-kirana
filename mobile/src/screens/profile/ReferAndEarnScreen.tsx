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
  Modal,
  useWindowDimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { AppNavigationProp } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { getCachedReferralsSync, loadCachedReferrals, saveCachedReferrals } from '../../services/profileCache';

export function ReferAndEarnScreen({ navigation }: { navigation: AppNavigationProp }) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  
  const cachedData = getCachedReferralsSync(user?.id);
  const [settings, setSettings] = useState<any>(cachedData?.settings || null);
  const [history, setHistory] = useState<any[]>(cachedData?.history || []);
  const [wallet, setWallet] = useState<any>(cachedData?.wallet || null);
  const [milestones, setMilestones] = useState<any[]>(cachedData?.milestones || []);
  const [loading, setLoading] = useState(!cachedData);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'network' | 'rewards'>('network');
  
  const [qrModal, setQrModal] = useState<{ isOpen: boolean; referralId: any; base64: string | null }>({
    isOpen: false,
    referralId: null,
    base64: null,
  });
  const [loadingQrFor, setLoadingQrFor] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      if (!settings) {
        loadCachedReferrals(user.id).then((cached) => {
          if (cached) {
            if (cached.settings) setSettings(cached.settings);
            if (cached.history) setHistory(cached.history);
            if (cached.wallet) setWallet(cached.wallet);
            if (cached.milestones) setMilestones(cached.milestones);
            setLoading(false);
          }
        });
      }
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Automatically poll for status change while QR is open
  useEffect(() => {
    let intervalId: any;
    if (user && qrModal.isOpen && qrModal.referralId) {
      intervalId = setInterval(async () => {
        try {
          const res = await apiClient.get('/offers/referrals/');
          const latestHistory = Array.isArray(res.data) ? res.data : (res.data?.results || []);
          const currentRef = latestHistory.find((h: any) => h.id === qrModal.referralId);
          
          if (currentRef && currentRef.status === 'COMPLETED') {
            setHistory(latestHistory);
            setQrModal({ isOpen: false, referralId: null, base64: null });
            Alert.alert('Reward Approved! 🎉', 'Your referral reward has been approved by the store owner!');
          }
        } catch (e) {
          console.error('Polling error', e);
        }
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user, qrModal.isOpen, qrModal.referralId]);

  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const [settingsRes, historyRes, walletRes, milestonesRes] = await Promise.all([
        apiClient.get('/offers/referral-settings/').catch(() => ({ data: {} })),
        apiClient.get('/offers/referrals/').catch(() => ({ data: [] })),
        apiClient.get('/auth/wallet/').catch(() => ({ data: { balance: 0, transactions: [] } })),
        apiClient.get('/offers/referral-milestones/').catch(() => ({ data: [] })),
      ]);

      const newSettings = settingsRes.data || {};
      const newHistory = Array.isArray(historyRes.data) ? historyRes.data : (historyRes.data?.results || []);
      const newWallet = walletRes.data || {};
      const newMilestones = Array.isArray(milestonesRes.data) ? milestonesRes.data : (milestonesRes.data?.results || []);

      setSettings(newSettings);
      setHistory(newHistory);
      setWallet(newWallet);
      setMilestones(newMilestones);

      saveCachedReferrals(user.id, {
        settings: newSettings,
        history: newHistory,
        wallet: newWallet,
        milestones: newMilestones,
      });
    } catch (err) {
      console.error('Error loading referral data', err);
    } finally {
      setLoading(false);
    }
  };

  const { width: screenWidth } = useWindowDimensions();
  const isCompact = screenWidth < 375 || milestones.length > 3;

  const referralCode = user?.customer_profile?.referral_code || user?.referral_code || `REF-${(user?.username || 'USER').slice(0, 5).toUpperCase()}`;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const storeLink = 'https://narendra-kirana.vercel.app';
    let shareText = '';
    if (settings?.share_text_template) {
      if (settings.share_text_template.includes('{link}')) {
        shareText = settings.share_text_template
          .replace('{code}', referralCode)
          .replace('{link}', storeLink);
      } else {
        shareText = `${settings.share_text_template.replace('{code}', referralCode).trim()}\n${storeLink}`;
      }
    } else {
      shareText = `Shop online at Narendra Kirana and get special discounts! Use my referral code: ${referralCode}\n${storeLink}`;
    }
    shareText = shareText.replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim();

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
      setLoadingQrFor(referralId);
      const res = await apiClient.get(`/offers/referrals/${referralId}/qr_code/`);
      setQrModal({ isOpen: true, referralId, base64: res.data?.qr_code_base64 || null });
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to load QR code.');
    } finally {
      setLoadingQrFor(null);
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
  const readyToClaim = history.filter(h => h.status === 'READY_TO_CLAIM').length;
  const awaitingApproval = history.filter(h => h.status === 'AWAITING_APPROVAL').length;

  const referralCashTransactions = (wallet?.transactions || [])
    .filter((t: any) => t.transaction_type === 'REFERRAL_REWARD');

  const totalCashEarned = (wallet?.transactions || [])
    .filter((t: any) => t.transaction_type === 'REFERRAL_REWARD' || t.transaction_type === 'MILESTONE_BONUS')
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount || '0'), 0);

  const productsEarned = Math.max(0, completedReferrals - referralCashTransactions.length);

  const isProductReward = Boolean(settings?.referrer_reward_product);
  const rewardText = isProductReward 
    ? `a Free ${settings?.referrer_reward_product_name || 'Gift'}`
    : `₹${parseFloat(settings?.referrer_reward || '50').toFixed(0)}`;

  // Milestone gamification calculations
  const sortedMilestones = [...milestones].sort((a, b) => a.required_referrals - b.required_referrals);
  const maxMilestoneTarget = sortedMilestones.length > 0 
    ? sortedMilestones[sortedMilestones.length - 1].required_referrals 
    : 1;
  const nextMilestone = sortedMilestones.find(m => m.required_referrals > completedReferrals);
  const progressPercentage = Math.min(100, Math.max(0, (completedReferrals / maxMilestoneTarget) * 100));

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.backButton} 
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={18} color={colors.primary} />
            <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Refer & Earn</Text>
        </View>
        <View style={styles.guestStateContainer}>
          <View style={[styles.guestIconBox, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5' }]}>
            <Feather name="gift" size={44} color={colors.primary} />
          </View>
          <Text style={[styles.guestTitle, { color: colors.text }]}>Sign In to Access Refer & Earn</Text>
          <Text style={[styles.guestSubtitle, { color: colors.textSecondary }]}>
            Invite your friends and family to shop at Narendra Kirana and earn exclusive discounts, cash rewards, and free items.
          </Text>
          <TouchableOpacity
            style={[styles.guestSignInBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Feather name="log-in" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.guestSignInBtnText}>Sign In / Register</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !settings) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.backButton} 
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={18} color={colors.primary} />
            <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Refer & Earn</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color={colors.primary} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Refer & Earn</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Invite friends, earn real store credit!</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* Dark Hero Card matching web ReferAndEarn.jsx */}
        <View style={styles.heroCard}>
          <View style={styles.badgePill}>
            <Ionicons name="sparkles" size={12} color="#34D399" />
            <Text style={styles.badgeText}>PREMIUM REFERRAL PROGRAM</Text>
          </View>

          <Text style={styles.heroTitle}>
            Share the love.{"\n"}
            <Text style={styles.heroTitleGreen}>Earn {rewardText}.</Text>
          </Text>

          <Text style={styles.heroSub}>
            Invite your network to shop with us. Once they complete their first order, you instantly unlock your reward.
          </Text>

          {/* Referral Code Box */}
          <View style={styles.codeContainer}>
            <View>
              <Text style={styles.codeLabel}>YOUR UNIQUE CODE</Text>
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
            <Text style={styles.shareBtnText}>Share Invite Link</Text>
          </TouchableOpacity>
        </View>

        {/* Milestone Rewards Gamification Card (Only if milestones exist) */}
        {milestones.length > 0 && (
          <View style={[styles.milestoneCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.milestoneHeader}>
              <View>
                <View style={styles.milestoneTitleRow}>
                  <Feather name="award" size={18} color={colors.primary} />
                  <Text style={[styles.milestoneTitle, { color: colors.text }]}>Milestone Rewards</Text>
                </View>
                <Text style={[styles.milestoneSubtitle, { color: colors.textSecondary }]}>Unlock massive cash bonuses by inviting more friends.</Text>
              </View>
              <View style={styles.milestoneCounter}>
                <Text style={styles.milestoneCountNum}>{completedReferrals}</Text>
                <Text style={[styles.milestoneCountLabel, { color: colors.textSecondary }]}>FRIENDS JOINED</Text>
              </View>
            </View>

            {/* Progress Bar Track */}
            <View style={styles.progressTrackWrapper}>
              <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }]}>
                <LinearGradient
                  colors={['#34D399', '#6366F1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressBarFill, { width: `${Math.min(100, Math.max(0, progressPercentage))}%` }]}
                />
              </View>

              {/* Checkpoints */}
              <View style={styles.checkpointsRow}>
                <View style={[styles.checkpointItem, styles.checkpointZeroItem]}>
                  <View style={[styles.checkpointNode, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0', borderColor: colors.surface }, completedReferrals >= 0 && styles.checkpointAchieved]}>
                    <Text style={[styles.checkpointNodeText, { color: colors.textSecondary }]}>0</Text>
                  </View>
                </View>

                {milestones.map((m) => {
                  const isAchieved = completedReferrals >= m.required_referrals;
                  const isNext = nextMilestone && m.id === nextMilestone.id;

                  return (
                    <View key={m.id} style={styles.checkpointItem}>
                      <View style={[
                        styles.checkpointNode,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0', borderColor: colors.surface },
                        isAchieved && styles.checkpointAchieved,
                        isNext && styles.checkpointNext
                      ]}>
                        {isAchieved ? (
                          <Feather name="check" size={12} color="#FFFFFF" />
                        ) : (
                          <Text style={[styles.checkpointNodeText, { color: colors.textSecondary }, isNext && styles.checkpointNextText]}>
                            {m.required_referrals}
                          </Text>
                        )}
                      </View>
                      <View style={[styles.checkpointBonusPill, isCompact && styles.checkpointBonusPillCompact]}>
                        <Text 
                          style={[styles.checkpointBonusText, isCompact && styles.checkpointBonusTextCompact]}
                          numberOfLines={2}
                        >
                          {isCompact ? `₹${m.bonus_reward}` : `Bonus: ₹${m.bonus_reward}`}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* How It Works 3 Steps */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>How It Works</Text>
          
          <View style={styles.stepRow}>
            <View style={[styles.stepIconWrap, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ECFDF5' }]}>
              <Feather name="share-2" size={18} color={colors.primary} />
            </View>
            <View style={styles.stepInfo}>
              <Text style={[styles.stepHeading, { color: colors.text }]}>1. Share Your Link</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>Send your unique code or link to friends, family, or your social network.</Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <View style={[styles.stepIconWrap, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF' }]}>
              <Feather name="users" size={18} color="#3B82F6" />
            </View>
            <View style={styles.stepInfo}>
              <Text style={[styles.stepHeading, { color: colors.text }]}>2. They Make a Purchase</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>Your friends sign up and successfully receive their very first order.</Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <View style={[styles.stepIconWrap, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#EEF2FF' }]}>
              <Feather name="gift" size={18} color="#6366F1" />
            </View>
            <View style={styles.stepInfo}>
              <Text style={[styles.stepHeading, { color: colors.text }]}>3. Claim Your Reward</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>You unlock your reward immediately in your dashboard to claim.</Text>
            </View>
          </View>
        </View>

        {/* Analytics & Ledger Section matching web ReferAndEarn.jsx */}
        <View style={[styles.ledgerSectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Tab Selector */}
          <View style={[styles.tabSelectorRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === 'network' && [styles.tabBtnActive, { backgroundColor: isDark ? colors.surface : '#FFFFFF' }]]}
              onPress={() => setActiveTab('network')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnText, { color: colors.textSecondary }, activeTab === 'network' && [styles.tabBtnTextActive, { color: colors.text }]]}>
                Network Tracking
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === 'rewards' && [styles.tabBtnActive, { backgroundColor: isDark ? colors.surface : '#FFFFFF' }]]}
              onPress={() => setActiveTab('rewards')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnText, { color: colors.textSecondary }, activeTab === 'rewards' && [styles.tabBtnTextActive, { color: colors.text }]]}>
                Reward Ledger
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'network' ? (
            <View>
              {/* 4 Quick Stats Strip */}
              <View style={[styles.statsStripRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FAFAFA', borderColor: colors.border }]}>
                <View style={styles.stripStatItem}>
                  <Text style={[styles.stripStatNum, { color: colors.text }]}>{history.length}</Text>
                  <Text style={[styles.stripStatLabel, { color: colors.textSecondary }]}>Total Invites</Text>
                </View>
                <View style={[styles.stripStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.stripStatItem}>
                  <Text style={[styles.stripStatNum, { color: colors.primary }]}>{completedReferrals}</Text>
                  <Text style={[styles.stripStatLabel, { color: colors.primary }]}>Completed</Text>
                </View>
                <View style={[styles.stripStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.stripStatItem}>
                  <Text style={[styles.stripStatNum, { color: '#818CF8' }]}>{readyToClaim + awaitingApproval}</Text>
                  <Text style={[styles.stripStatLabel, { color: '#818CF8' }]}>To Claim</Text>
                </View>
                <View style={[styles.stripStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.stripStatItem}>
                  <Text style={[styles.stripStatNum, { color: '#FBBF24' }]}>{pendingReferrals}</Text>
                  <Text style={[styles.stripStatLabel, { color: '#FBBF24' }]}>Pending</Text>
                </View>
              </View>

              {/* Network List */}
              {history.length === 0 ? (
                <View style={styles.emptyNetwork}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
                    <Feather name="users" size={28} color={colors.textSecondary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>Your network is empty</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    Share your code above. Once friends sign up, their progress will be tracked right here.
                  </Text>
                </View>
              ) : (
                <View style={styles.networkList}>
                  {history.map((item) => {
                    const friendName = item.referred_name || item.referee_name || 'Friend';
                    return (
                      <View key={item.id} style={[styles.referralCard, { borderBottomColor: colors.border }]}>
                        <View style={styles.refLeft}>
                          <View style={[styles.refAvatar, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF' }]}>
                            <Text style={styles.refAvatarLetter}>
                              {friendName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View>
                            <Text style={[styles.refName, { color: colors.text }]}>{friendName}</Text>
                            <Text style={[styles.refDate, { color: colors.textSecondary }]}>
                              Joined {new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.refRight}>
                          {item.status === 'COMPLETED' && (
                            <View style={[styles.refStatusBadge, styles.statusCompleted]}>
                              <Feather name="check" size={12} color={colors.primary} />
                              <Text style={[styles.refStatusText, styles.statusTextCompleted]}>Rewarded</Text>
                            </View>
                          )}

                          {item.status === 'READY_TO_CLAIM' && (
                            <TouchableOpacity 
                              style={styles.claimBtn}
                              onPress={() => handleClaim(item.id)}
                              activeOpacity={0.85}
                            >
                              <Ionicons name="sparkles" size={13} color="#FFFFFF" />
                              <Text style={styles.claimBtnText}>Claim Reward</Text>
                            </TouchableOpacity>
                          )}

                          {item.status === 'AWAITING_APPROVAL' && (
                            <TouchableOpacity 
                              style={styles.showQrBtn}
                              onPress={() => handleShowQR(item.id)}
                              activeOpacity={0.85}
                              disabled={loadingQrFor === item.id}
                            >
                              {loadingQrFor === item.id ? (
                                <ActivityIndicator size="small" color="#2563EB" style={{ width: 13, height: 13 }} />
                              ) : (
                                <Feather name="maximize" size={13} color="#2563EB" />
                              )}
                              <Text style={styles.showQrBtnText}>
                                {loadingQrFor === item.id ? 'Loading...' : 'Show QR'}
                              </Text>
                            </TouchableOpacity>
                          )}

                          {item.status === 'PENDING' && (
                            <View style={[styles.refStatusBadge, styles.statusPending]}>
                              <Feather name="clock" size={12} color="#D97706" />
                              <Text style={[styles.refStatusText, styles.statusTextPending]}>Pending First Order</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ) : (
            <View>
              {/* Rewards Summary Strip */}
              <View style={[styles.statsStripRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FAFAFA', borderColor: colors.border }]}>
                <View style={styles.stripStatItem}>
                  <Text style={[styles.stripStatNum, { color: colors.primary }]}>₹{totalCashEarned.toFixed(0)}</Text>
                  <Text style={[styles.stripStatLabel, { color: colors.primary }]}>Total Cash Earned</Text>
                </View>
                <View style={[styles.stripStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.stripStatItem}>
                  <Text style={[styles.stripStatNum, { color: '#818CF8' }]}>{productsEarned}</Text>
                  <Text style={[styles.stripStatLabel, { color: '#818CF8' }]}>Free Products Earned</Text>
                </View>
              </View>

              {/* Rewards Ledger List */}
              {referralCashTransactions.length === 0 && productsEarned === 0 ? (
                <View style={styles.emptyNetwork}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
                    <MaterialIcons name="currency-rupee" size={28} color={colors.textSecondary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No rewards yet</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    Your ledger will populate as soon as your referrals complete their orders and you claim your rewards.
                  </Text>
                </View>
              ) : (
                <View style={styles.networkList}>
                  {referralCashTransactions.map((t: any) => (
                    <View key={t.id} style={[styles.referralCard, { borderBottomColor: colors.border }]}>
                      <View style={styles.refLeft}>
                        <View style={[styles.refAvatar, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ECFDF5' }]}>
                          <MaterialIcons name="currency-rupee" size={16} color={colors.primary} />
                        </View>
                        <View>
                          <Text style={[styles.refName, { color: colors.text }]}>Cash Deposit</Text>
                          <Text style={[styles.refSubDesc, { color: colors.textSecondary }]}>{t.description || 'Referral Reward'}</Text>
                          <Text style={[styles.refDate, { color: colors.textSecondary }]}>
                            {new Date(t.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.ledgerCashAmount, { color: colors.primary }]}>+₹{parseFloat(t.amount || 0).toFixed(0)}</Text>
                    </View>
                  ))}

                  {history.filter(h => h.status === 'COMPLETED').slice(0, productsEarned).map((h, i) => (
                    <View key={`product-${h.id || i}`} style={[styles.referralCard, { borderBottomColor: colors.border }]}>
                      <View style={styles.refLeft}>
                        <View style={[styles.refAvatar, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#EEF2FF' }]}>
                          <Feather name="gift" size={16} color="#818CF8" />
                        </View>
                        <View>
                          <Text style={[styles.refName, { color: colors.text }]}>
                            Free {settings?.referrer_reward_product_name || 'Product'}
                          </Text>
                          <Text style={[styles.refSubDesc, { color: colors.textSecondary }]}>
                            Approved for referring {h.referred_name || 'a friend'}
                          </Text>
                          <Text style={[styles.refDate, { color: colors.textSecondary }]}>
                            {h.completed_at ? new Date(h.completed_at).toLocaleDateString() : 'Recently'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.productBadge}>
                        <Text style={styles.productBadgeText}>1 Item</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modern QR Code Modal matching web ReferAndEarn.jsx with Polling */}
      <Modal
        visible={qrModal.isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setQrModal({ isOpen: false, referralId: null, base64: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Top Close Button */}
            <TouchableOpacity 
              style={styles.modalCloseIconBtn}
              onPress={() => setQrModal({ isOpen: false, referralId: null, base64: null })}
            >
              <Feather name="x" size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>

            <View style={styles.modalIconCircle}>
              <Ionicons name="sparkles" size={26} color="#34D399" />
            </View>

            <Text style={styles.modalTitle}>Claim Reward</Text>
            <Text style={styles.modalSub}>
              Show this QR Pass to the cashier to instantly redeem your reward.
            </Text>

            {/* Glowing White QR Card */}
            <View style={styles.qrCardContainer}>
              {qrModal.base64 ? (
                <Image 
                  source={{ uri: `data:image/png;base64,${qrModal.base64}` }} 
                  style={styles.qrImage} 
                  contentFit="contain"
                />
              ) : (
                <ActivityIndicator size="large" color="#059669" style={{ marginVertical: 30 }} />
              )}
            </View>

            {/* Pro Tip Box */}
            <View style={styles.proTipBox}>
              <Feather name="star" size={16} color="#FBBF24" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.proTipTitle}>Pro Tip</Text>
                <Text style={styles.proTipSubtitle}>Turn up your screen brightness for a faster scan.</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.closeModalBtn}
              onPress={() => setQrModal({ isOpen: false, referralId: null, base64: null })}
            >
              <Text style={styles.closeModalBtnText}>Close Pass</Text>
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
    lineHeight: 28,
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
    paddingBottom: 130,
  },
  heroCard: {
    backgroundColor: '#0F172A', // slate-900
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
    boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.2)',
    elevation: 5,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 30,
    marginBottom: 8,
  },
  heroTitleGreen: {
    color: '#34D399',
  },
  heroSub: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 19,
    marginBottom: 18,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 14,
  },
  codeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  codeText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  copyBtnSuccess: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
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
    backgroundColor: '#25D366', // WhatsApp green
    paddingVertical: 14,
    borderRadius: 16,
    boxShadow: '0px 4px 8px rgba(37, 211, 102, 0.3)',
    elevation: 4,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  milestoneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.03)',
    elevation: 2,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  milestoneTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  milestoneSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  milestoneCounter: {
    alignItems: 'flex-end',
  },
  milestoneCountNum: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4F46E5',
  },
  milestoneCountLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  progressTrackWrapper: {
    paddingTop: 10,
    paddingBottom: 24,
  },
  progressBarBg: {
    height: 8,
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  checkpointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -16,
    paddingHorizontal: 4,
    alignItems: 'flex-start',
  },
  checkpointItem: {
    alignItems: 'center',
    flexShrink: 1,
    maxWidth: 72,
  },
  checkpointZeroItem: {
    maxWidth: 32,
    flexShrink: 0,
  },
  checkpointNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  checkpointAchieved: {
    backgroundColor: '#10B981',
  },
  checkpointNext: {
    backgroundColor: '#FFFFFF',
    borderColor: '#6366F1',
    borderWidth: 2,
  },
  checkpointNodeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
  },
  checkpointNextText: {
    color: '#6366F1',
  },
  checkpointBonusPill: {
    marginTop: 4,
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 68,
  },
  checkpointBonusPillCompact: {
    paddingHorizontal: 3,
    paddingVertical: 2,
    maxWidth: 52,
    borderRadius: 4,
  },
  checkpointBonusText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
  checkpointBonusTextCompact: {
    fontSize: 8,
    lineHeight: 10,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 14,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
    alignItems: 'center',
  },
  stepIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepInfo: {
    flex: 1,
  },
  stepHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  ledgerSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 16,
  },
  tabSelectorRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 4,
    margin: 12,
    borderRadius: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  statsStripRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    paddingVertical: 14,
    backgroundColor: '#FAFAFA',
  },
  stripStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  stripStatNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  stripStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  stripStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },
  emptyNetwork: {
    padding: 36,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  networkList: {
    paddingHorizontal: 16,
  },
  referralCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  refLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  refAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refAvatarLetter: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2563EB',
  },
  refName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  refSubDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  refDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  refRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  statusCompleted: {
    backgroundColor: '#ECFDF5',
  },
  statusPending: {
    backgroundColor: '#FFFBEB',
  },
  refStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusTextCompleted: {
    color: '#059669',
  },
  statusTextPending: {
    color: '#D97706',
  },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    boxShadow: '0px 2px 3px rgba(79, 70, 229, 0.2)',
    elevation: 2,
  },
  claimBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  showQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  showQrBtnText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 11,
  },
  ledgerCashAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#059669',
  },
  productBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  productBadgeText: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalCloseIconBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
  },
  modalIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  qrCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
    elevation: 4,
  },
  qrImage: {
    width: 190,
    height: 190,
  },
  proTipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 12,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  proTipTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  proTipSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeModalBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  closeModalBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  guestStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  guestIconBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  guestSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    boxShadow: '0px 4px 8px rgba(5, 150, 105, 0.2)',
    elevation: 4,
  },
  guestSignInBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
