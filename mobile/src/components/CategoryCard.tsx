import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fixImageUrl } from '../utils/image';

interface Category {
  id: number;
  name: string;
  image: string | null;
  slug: string;
}

interface Props {
  category: Category;
  onPress: (category: Category) => void;
  index?: number;
}

const CATEGORY_GRADIENTS: readonly [string, string][] = [
  ['#047857', '#065f46'], // emerald-700 to emerald-800
  ['#065f46', '#064e3b'], // emerald-800 to emerald-900
  ['#059669', '#047857'], // emerald-600 to emerald-700
  ['#06b6d4', '#3b82f6'], // cyan-500 to blue-500
  ['#d946ef', '#ec4899'], // fuchsia-500 to pink-500
];

export function CategoryCard({ category, onPress, index = 0 }: Props) {
  const finalImage = fixImageUrl(category.image);
  const colors = CATEGORY_GRADIENTS[index % CATEGORY_GRADIENTS.length];

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress(category)}
      activeOpacity={0.8}
    >
      <LinearGradient 
        colors={colors} 
        style={styles.gradientContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.glassContainer}>
          {finalImage ? (
            <Image source={{ uri: finalImage }} style={styles.image} contentFit="contain" />
          ) : (
            <Feather name="box" size={28} color="rgba(255,255,255,0.8)" />
          )}
        </View>
      </LinearGradient>
      <Text style={styles.name} numberOfLines={2}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 80,
    marginRight: 16,
    alignItems: 'center',
  },
  gradientContainer: {
    width: 80,
    height: 80,
    borderRadius: 20, // rounded-[1.25rem]
    padding: 2,
    marginBottom: 12,
    shadowColor: '#064e3b', // emerald-900
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  glassContainer: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '85%',
    height: '85%',
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155', // slate-700
    textAlign: 'center',
    lineHeight: 16,
  },
});
