import { Feather } from "@expo/vector-icons";
import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

import { useTheme } from "../context/ThemeContext";

interface Props {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  isLoading?: boolean;
}

export const QuantitySelector = memo(function QuantitySelector({
  quantity,
  onIncrease,
  onDecrease,
  isLoading = false,
}: Props) {
  const { colors, isDark } = useTheme();

  if (quantity === 0) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.surface : "#F8FAFC",
          borderColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.button}
        onPress={onDecrease}
        disabled={isLoading}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="minus" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      <Text style={[styles.quantity, { color: colors.text }]}>{quantity}</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={onIncrease}
        disabled={isLoading}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="plus" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    height: 44,
  },
  button: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  quantity: {
    fontSize: 14,
    fontWeight: "bold",
    minWidth: 20,
    textAlign: "center",
  },
});
