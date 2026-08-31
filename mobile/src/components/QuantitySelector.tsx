import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../constants/theme';

interface Props {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  isLoading?: boolean;
}

export function QuantitySelector({ quantity, onIncrease, onDecrease, isLoading = false }: Props) {
  if (quantity === 0) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.button} 
        onPress={onDecrease}
        disabled={isLoading}
      >
        <Feather name="minus" size={16} color={theme.colors.primary} />
      </TouchableOpacity>
      
      <Text style={styles.quantity}>{quantity}</Text>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={onIncrease}
        disabled={isLoading}
      >
        <Feather name="plus" size={16} color={theme.colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    height: 32,
  },
  button: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantity: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primaryDark,
    minWidth: 20,
    textAlign: 'center',
  },
});
