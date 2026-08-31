import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { theme } from '../constants/theme';

interface Category {
  id: number;
  name: string;
  image: string | null;
  slug: string;
}

interface Props {
  category: Category;
  onPress: (category: Category) => void;
}

import { fixImageUrl } from '../utils/image';

export function CategoryCard({ category, onPress }: Props) {
  const finalImage = fixImageUrl(category.image);

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress(category)}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        {finalImage ? (
          <Image source={{ uri: finalImage }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.placeholderImage} />
        )}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 80,
    marginRight: theme.spacing.sm,
    alignItems: 'center',
  },
  imageContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
  },
  image: {
    width: '70%',
    height: '70%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.border,
  },
  name: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 14,
  },
});
