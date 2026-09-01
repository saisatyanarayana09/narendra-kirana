import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
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

const { width } = Dimensions.get('window');
const CARD_SIZE = width > 400 ? 120 : 96;

export function CategoryCard({ category, onPress, index = 0 }: Props) {
  const finalImage = fixImageUrl(category.image);
  const colors = CATEGORY_GRADIENTS[index % CATEGORY_GRADIENTS.length];

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress(category)}
      activeOpacity={0.8}
    >
      {finalImage ? (
        <Image source={{ uri: finalImage }} style={styles.image} contentFit="cover" />
      ) : (
        <LinearGradient 
          colors={colors} 
          style={styles.fallbackGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.fallbackText}>{category.name.charAt(0)}</Text>
        </LinearGradient>
      )}

      {/* Dark gradient overlay at the bottom for text readability */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
        style={styles.overlay}
      />
      
      <Text style={styles.name} numberOfLines={2}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#F8FAFC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  fallbackGradient: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontSize: 32,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.3)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  name: {
    position: 'relative',
    zIndex: 10,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    padding: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
