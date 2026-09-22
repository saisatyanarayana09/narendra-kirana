import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";

import { theme } from "../constants/theme";

interface Props {
  fullScreen?: boolean;
}

export function LoadingSpinner({ fullScreen = false }: Props) {
  if (fullScreen) {
    return (
      <View style={styles.fullScreen} testID="loading-spinner">
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ActivityIndicator
      size="small"
      color={theme.colors.primary}
      testID="loading-spinner"
    />
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
});
