import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage } from '../../../services/api';
import { useAppTheme } from '../../../context/ThemeContext';
import { showAlert } from '../../../utils/alerts';
import ScreenHeader from '../../../components/ScreenHeader';

type BroadcastCategory = 'PROMO' | 'ORDER' | 'WALLET' | 'SYSTEM';

const CATEGORIES: { id: BroadcastCategory; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: 'PROMO', label: 'Offer / Deal', icon: 'flame', color: '#f59e0b' },
  { id: 'ORDER', label: 'Order Status', icon: 'cube', color: '#10b981' },
  { id: 'WALLET', label: 'Payment', icon: 'card', color: '#6366f1' },
  { id: 'SYSTEM', label: 'System Alert', icon: 'megaphone', color: '#0ea5e9' },
];

export default function BroadcastScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [category, setCategory] = useState<BroadcastCategory>('PROMO');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const cleanTitle = title.trim();
    const cleanMessage = message.trim();
    if (!cleanTitle || !cleanMessage) {
      showAlert('Validation Error', 'Please enter both a title and a message body.');
      return;
    }

    setSending(true);
    try {
      const payload: any = {
        title: cleanTitle,
        message: cleanMessage,
        category,
        image_url: imageUrl.trim() || undefined,
        action_url: actionUrl.trim() || undefined,
      };

      await api.post('/notifications/owner/broadcast/', payload);
      showAlert('Broadcast Dispatched! 🚀', 'Push notification sent to all registered customer devices.', () =>
        router.back()
      );
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to dispatch push broadcast.'));
    } finally {
      setSending(false);
    }
  };

  const activeCategory = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Universal Screen Header */}
      <ScreenHeader
        title="Push Broadcast"
        subtitle="Campaign alerts & notifications"
        rightAction={
          <TouchableOpacity
            style={[styles.headerSendBtn, { backgroundColor: '#0d9488', opacity: sending ? 0.7 : 1 }]}
            onPress={handleSend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={14} color="#fff" />
                <Text style={styles.headerSendBtnText}>Send</Text>
              </>
            )}
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
      >
      <Text style={[styles.headerSub, { color: colors.textMuted }]}>
        Send push notifications to customers.
      </Text>

      {/* Category / Badge Selector */}
      <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 12 }]}>
        Category / Badge Type
      </Text>
      <View style={styles.catGrid}>
        {CATEGORIES.map((cat) => {
          const isSelected = category === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.catBtn,
                {
                  borderColor: isSelected ? cat.color : colors.border,
                  backgroundColor: isSelected ? (isDark ? '#1e293b' : '#f8fafc') : colors.card,
                },
              ]}
              onPress={() => setCategory(cat.id)}
            >
              <Ionicons
                name={cat.icon}
                size={16}
                color={isSelected ? cat.color : colors.textMuted}
              />
              <Text
                style={[
                  styles.catText,
                  {
                    color: isSelected ? colors.text : colors.textMuted,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main Broadcast Form Card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
          Notification Title *
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
          placeholder="e.g. ⚡ Mega Weekend Atta & Rice Sale!"
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
          Message Body *
        </Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text },
          ]}
          placeholder="e.g. Flat 20% off on all staples today! Tap to shop before stock runs out."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
          value={message}
          onChangeText={setMessage}
        />

        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
          Banner Image URL (Optional)
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
          placeholder="https://example.com/banner.jpg"
          placeholderTextColor={colors.textMuted}
          value={imageUrl}
          onChangeText={setImageUrl}
          autoCapitalize="none"
        />

        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
          Click Action / Deep Link URL (Optional)
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
          placeholder="/offers or /categories"
          placeholderTextColor={colors.textMuted}
          value={actionUrl}
          onChangeText={setActionUrl}
          autoCapitalize="none"
        />

        {/* Live Device Preview Card */}
        <Text style={[styles.previewHeading, { color: colors.text }]}>
          Device Push Preview
        </Text>
        <View style={[styles.previewCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
          <View style={styles.previewTop}>
            <View style={[styles.iconDot, { backgroundColor: activeCategory.color }]}>
              <Ionicons name="storefront" size={14} color="#fff" />
            </View>
            <Text style={[styles.previewAppName, { color: colors.text }]}>NARENDRA KIRANA</Text>
            <View style={[styles.previewBadge, { backgroundColor: activeCategory.color + '25' }]}>
              <Text style={[styles.previewBadgeText, { color: activeCategory.color }]}>
                {activeCategory.id}
              </Text>
            </View>
            <Text style={[styles.previewTime, { color: colors.textMuted }]}>now</Text>
          </View>
          <Text style={[styles.previewTitle, { color: colors.text }]}>
            {title.trim() || 'Headline will appear here'}
          </Text>
          <Text style={[styles.previewBody, { color: colors.textMuted }]} numberOfLines={2}>
            {message.trim() || 'Notification body text will be displayed to customers.'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.sendBtn, { opacity: sending ? 0.7 : 1 }]}
          onPress={handleSend}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="paper-plane" size={18} color="#fff" />
              <Text style={styles.sendBtnText}>Dispatch Push Broadcast</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  headerSendBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerSub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  catText: {
    fontSize: 12,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  previewHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 8,
  },
  previewCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 18,
  },
  previewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  iconDot: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAppName: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  previewBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  previewBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  previewTime: {
    fontSize: 10,
    marginLeft: 'auto',
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  previewBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0d9488',
    paddingVertical: 14,
    borderRadius: 10,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
