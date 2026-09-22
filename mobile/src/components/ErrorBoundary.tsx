import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import React, { Component, ErrorInfo, ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
} from "react-native";

import { apiClient } from "../api/client";
import { APP_VERSION } from "../constants/config";
import { navigationRef } from "../navigation/navigationRef";
import { triggerHaptic } from "../utils/haptics";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?:
    | ReactNode
    | ((props: { error: Error | null; resetError: () => void }) => ReactNode);
  onReset?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDevDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDevDetails: true,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);

    // Automatically report crash to backend for immediate resolution
    try {
      apiClient
        .post("/notifications/client-error/", {
          error_name: error?.name || "Error",
          error_message: error?.message || String(error),
          stack: error?.stack || "",
          component_stack: errorInfo?.componentStack || "",
          platform: Platform.OS,
          app_version: APP_VERSION,
        })
        .catch(() => {});
    } catch {}
  }

  public resetError = () => {
    triggerHaptic("medium");
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDevDetails: false,
    });
    this.props.onReset?.();
  };

  public handleRestart = () => {
    triggerHaptic("medium");
    try {
      if (navigationRef.isReady()) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: "Main" }],
        });
      }
    } catch (err) {
      console.warn("ErrorBoundary failed to reset navigation route:", err);
    }

    this.resetError();
  };

  public handleClearCacheAndRestart = async () => {
    triggerHaptic("medium");
    try {
      const keys = [
        "home_data_cache",
        "home_sections_cache",
        "cached_orders_list",
        "offline_cached_orders",
        "welcome_screen_shown",
      ];
      await AsyncStorage.multiRemove(keys);
    } catch (err) {
      console.warn("ErrorBoundary failed to clear cache:", err);
    }

    try {
      if (navigationRef.isReady()) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: "Main" }],
        });
      }
    } catch (err) {
      console.warn("ErrorBoundary failed to reset navigation route:", err);
    }

    this.resetError();
  };

  public toggleDevDetails = () => {
    this.setState((prev) => ({ showDevDetails: !prev.showDevDetails }));
  };

  public handleCopyError = async () => {
    try {
      const parts = [
        `Error: ${this.state.error?.name || "Error"}: ${this.state.error?.message || "Unknown error"}`,
        this.state.error?.stack
          ? `Call Stack:\n${this.state.error.stack}`
          : null,
        this.state.errorInfo?.componentStack
          ? `Component Stack:\n${this.state.errorInfo.componentStack}`
          : null,
      ].filter(Boolean);

      await Clipboard.setStringAsync(parts.join("\n\n"));
      triggerHaptic("success");
      this.setState({ copied: true });
      setTimeout(() => {
        this.setState({ copied: false });
      }, 2500);
    } catch (err) {
      console.warn("Failed to copy error to clipboard:", err);
    }
  };

  public render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function") {
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
        <View
          style={[
            styles.safeArea,
            { paddingTop: StatusBar.currentHeight || 44 },
          ]}
        >
          <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.container}>
              {/* Header Icon Graphic */}
              <View style={styles.iconOuterCircle}>
                <View style={styles.iconInnerCircle}>
                  <Feather name="alert-triangle" size={42} color="#D97706" />
                </View>
              </View>

              {/* Recovery Messaging */}
              <Text style={styles.title}>Oops! Something went wrong</Text>
              <Text style={styles.safeNote}>
                Don't worry, your cart and data are safe.
              </Text>
              <Text style={styles.description}>
                We ran into an unexpected hiccup while displaying this screen.
                Let's get you back on track.
              </Text>

              {/* Real-time Error Summary Box */}
              {Boolean(this.state.error) && (
                <View style={styles.errorAlertBox}>
                  <Feather
                    name="alert-circle"
                    size={16}
                    color="#DC2626"
                    style={{ marginTop: 2 }}
                  />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.errorAlertTitle}>
                      Reason for interruption:
                    </Text>
                    <Text style={styles.errorAlertText} selectable>
                      {this.state.error?.name || "Error"}:{" "}
                      {this.state.error?.message || "Unexpected condition"}
                    </Text>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  activeOpacity={0.85}
                  onPress={this.handleRestart}
                >
                  <Feather
                    name="home"
                    size={20}
                    color="#FFFFFF"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.primaryButtonText}>
                    Restart App / Return Home
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  activeOpacity={0.8}
                  onPress={this.resetError}
                >
                  <Feather
                    name="refresh-cw"
                    size={18}
                    color="#059669"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.secondaryButtonText}>Try Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.tertiaryButton}
                  activeOpacity={0.8}
                  onPress={this.handleClearCacheAndRestart}
                >
                  <Feather
                    name="trash-2"
                    size={16}
                    color="#DC2626"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.tertiaryButtonText}>
                    Clear Local Cache & Return Home
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Error Details / Diagnostics (Collapsible) */}
              {Boolean(this.state.error) && (
                <View style={styles.devSection}>
                  <TouchableOpacity
                    style={styles.devToggle}
                    onPress={this.toggleDevDetails}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.devToggleText}>
                      {this.state.showDevDetails
                        ? "Hide Error Details ▲"
                        : "Show Error Details ▼"}
                    </Text>
                  </TouchableOpacity>

                  {this.state.showDevDetails && (
                    <View style={styles.diagnosticsContainer}>
                      <ScrollView
                        style={styles.devScrollView}
                        nestedScrollEnabled
                      >
                        <Text style={styles.devErrorTitle}>Error Details:</Text>
                        <Text style={styles.devErrorText} selectable>
                          {this.state.error?.name}: {this.state.error?.message}
                        </Text>
                        {this.state.error?.stack && (
                          <>
                            <Text style={styles.devStackTitle}>
                              Call Stack:
                            </Text>
                            <Text style={styles.devStackText} selectable>
                              {this.state.error.stack}
                            </Text>
                          </>
                        )}
                        {this.state.errorInfo?.componentStack && (
                          <>
                            <Text style={styles.devStackTitle}>
                              Component Stack:
                            </Text>
                            <Text style={styles.devStackText} selectable>
                              {this.state.errorInfo.componentStack}
                            </Text>
                          </>
                        )}
                      </ScrollView>

                      <TouchableOpacity
                        style={styles.copyErrorBtn}
                        onPress={this.handleCopyError}
                        activeOpacity={0.8}
                      >
                        <Feather
                          name={this.state.copied ? "check" : "copy"}
                          size={13}
                          color="#059669"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.copyErrorBtnText}>
                          {this.state.copied
                            ? "Copied to Clipboard!"
                            : "Copy Error Details"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
  },
  container: {
    width: "100%",
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  iconOuterCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    boxShadow: "0px 4px 12px rgba(217, 119, 6, 0.15)",
    elevation: 4,
  },
  iconInnerCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFFBEB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FDE68A",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 10,
    fontFamily: Platform.select({ ios: "System", default: "sans-serif" }),
  },
  safeNote: {
    fontSize: 16,
    fontWeight: "700",
    color: "#059669",
    textAlign: "center",
    marginBottom: 8,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: "hidden",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 32,
    maxWidth: 320,
  },
  actionsContainer: {
    width: "100%",
    maxWidth: 340,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    boxShadow: "0px 3px 6px rgba(5, 150, 105, 0.25)",
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  secondaryButtonText: {
    color: "#059669",
    fontSize: 15,
    fontWeight: "700",
  },
  devSection: {
    marginTop: 24,
    width: "100%",
    maxWidth: 340,
  },
  devToggle: {
    paddingVertical: 8,
    alignItems: "center",
  },
  devToggleText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  devScrollView: {
    maxHeight: 160,
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  devErrorTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F87171",
    marginBottom: 4,
  },
  devErrorText: {
    fontSize: 11,
    color: "#F1F5F9",
    fontFamily: Platform.select({ ios: "Courier", default: "monospace" }),
    marginBottom: 8,
  },
  devStackTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    marginTop: 6,
    marginBottom: 2,
  },
  devStackText: {
    fontSize: 10,
    color: "#CBD5E1",
    fontFamily: Platform.select({ ios: "Courier", default: "monospace" }),
    lineHeight: 14,
  },
  diagnosticsContainer: {
    width: "100%",
    marginTop: 8,
  },
  copyErrorBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  copyErrorBtnText: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "700",
  },
  errorAlertBox: {
    width: "100%",
    maxWidth: 340,
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorAlertTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#991B1B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  errorAlertText: {
    fontSize: 12,
    color: "#B91C1C",
    fontWeight: "600",
    lineHeight: 16,
  },
  tertiaryButton: {
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  tertiaryButtonText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "700",
  },
});
