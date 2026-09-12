import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface OtaLaunchScreenProps {
  onSkip?: () => void;
}

export function OtaLaunchScreen({ onSkip }: OtaLaunchScreenProps) {
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    // Show a graceful "Skip & Open App" button if download takes > 4 seconds
    const timer = setTimeout(() => {
      setShowSkip(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#064E3B" />
      
      <View style={styles.content}>
        {/* Brand Icon */}
        <View style={styles.iconCircle}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>Updating Narendra Kirana</Text>
        <Text style={styles.subtitle}>
          Downloading the latest improvements & offers...
        </Text>

        {/* Loading Indicator */}
        <View style={styles.indicatorRow}>
          <ActivityIndicator size="small" color="#FDE047" />
          <Text style={styles.statusText}>Installing updates seamlessly...</Text>
        </View>

        {/* Skip button if slow network */}
        {showSkip && onSkip && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            activeOpacity={0.8}
          >
            <Text style={styles.skipButtonText}>Skip & Open App</Text>
            <Feather name="arrow-right" size={14} color="#A7F3D0" />
          </TouchableOpacity>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Ready in just a moment</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#064E3B',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#047857',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  logoImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#A7F3D0',
    textAlign: 'center',
    marginBottom: 28,
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    gap: 10,
  },
  statusText: {
    color: '#FDE047',
    fontSize: 13,
    fontWeight: '700',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 28,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skipButtonText: {
    color: '#A7F3D0',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    paddingBottom: 24,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '500',
  },
});
