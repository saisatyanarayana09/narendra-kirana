import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import api, { getErrorMessage } from '../../../services/api';
import { useRouter } from 'expo-router';
import { showAlert } from '../../../utils/alerts';

export default function BroadcastScreen() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSend = async () => {
    const cleanTitle = title.trim();
    const cleanMessage = message.trim();
    if (!cleanTitle || !cleanMessage) {
      showAlert('Validation Error', 'Please enter both a title and a message.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/notifications/owner/broadcast/', {
        title: cleanTitle,
        message: cleanMessage,
      });
      showAlert('Success', 'Broadcast sent to all customers!', () => router.back());
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to send broadcast.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.info}>
        Send a push notification alert to all registered customer devices instantly.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Notification Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Flash Sale!"
          placeholderTextColor="#64748b"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Message Body</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Type your message here..."
          placeholderTextColor="#64748b"
          multiline
          numberOfLines={4}
          value={message}
          onChangeText={setMessage}
        />

        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.sendBtnText}>Send Broadcast</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  info: {
    color: '#cbd5e1',
    marginBottom: 20,
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
  },
  label: {
    color: '#94a3b8',
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  sendBtn: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
