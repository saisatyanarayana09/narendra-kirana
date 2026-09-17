import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, StyleProp, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { fixImageUrl, getOptimizedImageUrl } from '../utils/image';
import { useTheme } from '../context/ThemeContext';

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
  style?: StyleProp<ViewStyle>;
}

const PASTEL_BG_COLORS = [
  '#F0FDF4', // Emerald / Green
  '#EFF6FF', // Sky / Blue
  '#FEF3C7', // Amber / Yellow
  '#FDF2F8', // Pink
  '#F5F3FF', // Purple
  '#FFF7ED', // Orange
  '#F0FDFA', // Teal
];

const PASTEL_BORDER_COLORS = [
  '#DCFCE7',
  '#DBEAFE',
  '#FDE68A',
  '#FCE7F3',
  '#EDE9FE',
  '#FFEDD5',
  '#CCFBF1',
];

const { width } = Dimensions.get('window');
const CARD_SIZE = width > 400 ? 92 : 80;

export const CategoryCard = memo(function CategoryCard({ category, onPress, index = 0, style }: Props) {
  const { colors, isDark } = useTheme();
  const finalImage = getOptimizedImageUrl(category.image, 200, 200) || fixImageUrl(category.image);
  
  const colorIndex = Math.abs(index) % PASTEL_BG_COLORS.length;
  const bgColor = PASTEL_BG_COLORS[colorIndex];
  const borderColor = PASTEL_BORDER_COLORS[colorIndex];

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={() => onPress(category)}
      activeOpacity={0.82}
    >
      {/* Category Image Bubble */}
      <View 
        style={[
          styles.bubble,
          { 
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : bgColor,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : borderColor,
          }
        ]}
      >
        {finalImage ? (
          <Image 
            source={{ uri: finalImage }} 
            style={styles.image} 
            contentFit="contain" 
            cachePolicy="memory-disk"
            recyclingKey={finalImage}
          />
        ) : (
          <View style={styles.fallbackContainer}>
            <Text style={[styles.fallbackLetter, { color: isDark ? colors.text : '#059669' }]}>
              {category.name?.charAt(0)?.toUpperCase() || 'C'}
            </Text>
          </View>
        )}
      </View>

      {/* Category Name Label (placed cleanly underneath image) */}
      <Text 
        style={[styles.name, { color: colors.text }]} 
        numberOfLines={2}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    width: CARD_SIZE,
    alignItems: 'center',
    marginRight: 10,
  },
  bubble: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackLetter: {
    fontSize: 28,
    fontWeight: '900',
  },
  name: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 14,
    paddingHorizontal: 2,
  },
});
