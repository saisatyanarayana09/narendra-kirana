import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api, { getErrorMessage } from '../../services/api';
import { safeStorage } from '../../utils/storage';

const SAVED_USERNAME_KEY = 'smart-kirana-owner-username';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { login } = useAuth();

  useEffect(() => {
    safeStorage.getItem(SAVED_USERNAME_KEY).then((saved) => {
      if (saved) setIdentifier(saved);
    });
  }, []);

  const handleLogin = async () => {
    const cleanId = identifier.trim();
    if (!cleanId || !password) {
      setErrorMsg('Please enter your email/username and password.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      const isEmail = cleanId.includes('@');
      const response = await api.post('/auth/login/', {
        username: cleanId,
        email: isEmail ? cleanId : undefined,
        password,
      });

      const data = response?.data || {};
      const { access, refresh, user } = data;

      if (!access) {
        setErrorMsg('Invalid login response from server.');
        return;
      }

      if (user && !user.is_owner && !user.is_staff) {
        setErrorMsg('This account does not have store owner or staff access.');
        return;
      }

      await safeStorage.setItem(SAVED_USERNAME_KEY, cleanId);
      await login(access, refresh);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        setErrorMsg(
          err?.response?.data?.detail ||
            'Invalid email/username or password. Please verify your owner credentials.'
        );
      } else {
        setErrorMsg(getErrorMessage(err, 'Unable to sign in. Please check your credentials.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Smart Kirana</Text>
        <Text style={styles.subtitle}>Owner Portal</Text>

        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠️ {errorMsg}</Text>
          </View>
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="Owner Email or Username"
          placeholderTextColor="#94a3b8"
          value={identifier}
          onChangeText={(text) => {
            setIdentifier(text);
            if (errorMsg) setErrorMsg(null);
          }}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#94a3b8"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (errorMsg) setErrorMsg(null);
          }}
          secureTextEntry
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
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
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    padding: 24,
    borderRadius: 16,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10b981',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorBanner: {
    backgroundColor: '#450a0a',
    borderColor: '#dc2626',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#fecaca',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    color: '#f8fafc',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
