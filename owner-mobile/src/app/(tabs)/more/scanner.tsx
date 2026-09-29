import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  Platform,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Camera, CameraView, BarcodeScanningResult } from 'expo-camera';
import api, { getErrorMessage } from '../../../services/api';
import { useRouter } from 'expo-router';
import { showAlert, showConfirm } from '../../../utils/alerts';

export default function QRScannerScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let isMounted = true;
    const getCameraPermissions = async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        if (isMounted) setHasPermission(status === 'granted');
      } catch {
        if (isMounted) setHasPermission(false);
      }
    };

    getCameraPermissions();
    return () => {
      isMounted = false;
    };
  }, []);

  const processReferralToken = (rawData: string) => {
    const cleanData = String(rawData || '').trim();
    const parts = cleanData.split(':');
    if (parts.length !== 3 || parts[0] !== 'secure_qr' || !parts[1]) {
      showAlert('Invalid Token', 'This QR code is not a valid referral code.', () => {
        setScanned(false);
      });
      return;
    }

    const id = parts[1];
    showConfirm(
      'Token Scanned',
      'Redeem this referral code?',
      () => redeemToken(id, cleanData),
      () => setScanned(false),
      'Redeem'
    );
  };

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (scanned || !result?.data) return;
    setScanned(true);
    processReferralToken(result.data);
  };

  const redeemToken = async (id: string, token: string) => {
    setSubmitting(true);
    try {
      await api.post(`/offers/referrals/${id}/approve/`, { token });
      showAlert('Success', 'Reward redeemed successfully!', () => router.back());
    } catch (error: any) {
      showAlert('Error', getErrorMessage(error, 'Failed to redeem reward.'), () => {
        setScanned(false);
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <View style={styles.webCard}>
          <Text style={styles.webTitle}>Referral Token Verification</Text>
          <Text style={styles.webSubtitle}>
            Enter or paste a customer referral QR token (format: secure_qr:ID:SIGNATURE) to approve and redeem on Web.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="secure_qr:12:abc123..."
            placeholderTextColor="#64748b"
            value={manualToken}
            onChangeText={setManualToken}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.redeemBtn}
            onPress={() => processReferralToken(manualToken)}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.redeemBtnText}>Verify & Redeem</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        style={StyleSheet.absoluteFill}
      />
      {scanned && (
        <View style={styles.overlay}>
          <Button title="Tap to Scan Again" onPress={() => setScanned(false)} color="#10b981" />
        </View>
      )}
      <View style={styles.crosshair} pointerEvents="none">
        <View style={styles.box} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    padding: 16,
  },
  webCard: {
    backgroundColor: '#1e293b',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  webTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  webSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 15,
  },
  redeemBtn: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  redeemBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  text: {
    color: '#fff',
  },
  overlay: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
    borderRadius: 8,
  },
  crosshair: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#10b981',
    backgroundColor: 'transparent',
  },
});
