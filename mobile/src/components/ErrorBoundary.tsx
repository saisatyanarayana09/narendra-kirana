import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { navigationRef } from '../navigation/navigationRef';
import { triggerHaptic } from '../utils/haptics';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((props: { error: Error | null; resetError: () => void }) => ReactNode);
  onReset?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDevDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDevDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  public resetError = () => {
    triggerHaptic('medium');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDevDetails: false,
    });
    this.props.onReset?.();
  };

  public handleRestart = () => {
    triggerHaptic('medium');
    try {
      if (navigationRef.isReady()) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      }
    } catch (err) {
      console.warn('ErrorBoundary failed to reset navigation route:', err);
    }

    this.resetError();
  };

  public toggleDevDetails = () => {
    this.setState((prev) => ({ showDevDetails: !prev.showDevDetails }));
  };

  public render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({
          error: this.state.error,
          resetError: this.resetError,
        });
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = __DEV__;

      return (
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
          <View style={styles.container}>
            {/* Header Icon Graphic */}
            <View style={styles.iconOuterCircle}>
              <View style={styles.iconInnerCircle}>
                <Feather name="alert-triangle" size={42} color="#D97706" />
              </View>
            </View>

            {/* Recovery Messaging */}
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.safeNote}>Don't worry, your cart and data are safe.</Text>
            <Text style={styles.description}>
              We ran into an unexpected hiccup while displaying this screen. Let's get you back on track.
            </Text>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.85}
                onPress={this.handleRestart}
              >
                <Feather name="home" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.primaryButtonText}>Restart App / Return Home</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.8}
                onPress={this.resetError}
              >
                <Feather name="refresh-cw" size={18} color="#059669" style={styles.buttonIcon} />
                <Text style={styles.secondaryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>

            {/* Developer Error Details (Collapsible in DEV) */}
            {isDev && this.state.error && (
              <View style={styles.devSection}>
                <TouchableOpacity
                  style={styles.devToggle}
                  onPress={this.toggleDevDetails}
                  activeOpacity={0.7}
                >
                  <Text style={styles.devToggleText}>
                    {this.state.showDevDetails ? 'Hide Diagnostics ▲' : 'Show Diagnostics (DEV) ▼'}
                  </Text>
                </TouchableOpacity>

                {this.state.showDevDetails && (
                  <ScrollView style={styles.devScrollView} nestedScrollEnabled>
                    <Text style={styles.devErrorTitle}>Error Details:</Text>
                    <Text style={styles.devErrorText}>
                      {this.state.error.name}: {this.state.error.message}
                    </Text>
                    {this.state.error.stack && (
                      <>
                        <Text style={styles.devStackTitle}>Call Stack:</Text>
                        <Text style={styles.devStackText}>{this.state.error.stack}</Text>
                      </>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <>
                        <Text style={styles.devStackTitle}>Component Stack:</Text>
                        <Text style={styles.devStackText}>
                          {this.state.errorInfo.componentStack}
                        </Text>
                      </>
                    )}
                  </ScrollView>
                )}
              </View>
            )}
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  iconOuterCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  iconInnerCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
  },
  safeNote: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
    textAlign: 'center',
    marginBottom: 8,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 320,
  },
  actionsContainer: {
    width: '100%',
    maxWidth: 340,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  secondaryButtonText: {
    color: '#059669',
    fontSize: 15,
    fontWeight: '700',
  },
  devSection: {
    marginTop: 24,
    width: '100%',
    maxWidth: 340,
  },
  devToggle: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  devToggleText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  devScrollView: {
    maxHeight: 160,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  devErrorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F87171',
    marginBottom: 4,
  },
  devErrorText: {
    fontSize: 11,
    color: '#F1F5F9',
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
    marginBottom: 8,
  },
  devStackTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 6,
    marginBottom: 2,
  },
  devStackText: {
    fontSize: 10,
    color: '#CBD5E1',
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
    lineHeight: 14,
  },
});
