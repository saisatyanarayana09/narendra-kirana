import React, { memo } from 'react';
import { View, Text, StyleSheet, Dimensions, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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
const CARD_SIZE = width > 400 ? 104 : 96;

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
      <View 
        style={[
          styles.card,
          { 
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : bgColor,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : borderColor,
          }
        ]}
      >
        {finalImage ? (
          <>
            <Image 
              source={{ uri: finalImage }} 
              style={styles.image} 
              contentFit="cover" 
              cachePolicy="memory-disk"
              recyclingKey={finalImage}
            />
            {/* Dark gradient overlay matching web */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
              locations={[0.3, 0.7, 1]}
              style={StyleSheet.absoluteFillObject}
            />
          </>
        ) : (
          <View style={styles.fallbackContainer}>
            <Text style={[styles.fallbackLetter, { color: isDark ? colors.text : '#059669', opacity: 0.2 }]}>
              {category.name?.charAt(0)?.toUpperCase() || 'C'}
            </Text>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']}
              locations={[0.4, 0.7, 1]}
              style={StyleSheet.absoluteFillObject}
            />
          </View>
        )}

        {/* Category Name Label (placed over the gradient) */}
        <Text 
          style={styles.name} 
          numberOfLines={2}
        >
          {category.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    width: CARD_SIZE,
    marginRight: 10,
  },
  card: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackLetter: {
    fontSize: 48,
    fontWeight: '900',
    position: 'absolute',
  },
  name: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textAlign: 'center',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    zIndex: 10,
  },
});
