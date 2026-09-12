import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity, 
  Dimensions,
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { apiClient } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { CategoryCard } from '../../components/CategoryCard';
import { CategoryCardSkeleton } from '../../components/SkeletonLoader';

const { width } = Dimensions.get('window');
const HORIZONTAL_PADDING = 14;
const GAP = 10;
const CARD_WIDTH = Math.floor((width - (HORIZONTAL_PADDING * 2) - (GAP * 2)) / 3);
const CARD_ROW_HEIGHT = CARD_WIDTH + GAP;

let cachedGlobalCategories: any[] | null = null;

export function CategoriesScreen({ navigation }: { navigation: AppNavigationProp }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [categories, setCategories] = useState<any[]>(cachedGlobalCategories || []);
  const [loading, setLoading] = useState(!cachedGlobalCategories);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (!cachedGlobalCategories) {
      setLoading(true);
    }

    try {
      const res = await apiClient.get('/categories/');
      const cats = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      cachedGlobalCategories = cats;
      setCategories(cats);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCategoryPress = useCallback((c: any) => {
    navigation.navigate('ProductListScreen', { 
      categoryId: c.id, 
      categoryName: c.name 
    });
  }, [navigation]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: CARD_ROW_HEIGHT,
    offset: CARD_ROW_HEIGHT * Math.floor(index / 3),
    index,
  }), []);

  const renderCategoryItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <View style={{ width: CARD_WIDTH }}>
      <CategoryCard 
        category={item} 
        index={index}
        style={styles.categoryCardStyle}
        onPress={handleCategoryPress} 
      />
    </View>
  ), [handleCategoryPress]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('HomeTab');
              }
            }}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={16} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary }]}>{t('back')}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('categories')}</Text>
        </View>

        <View style={{ paddingHorizontal: HORIZONTAL_PADDING, paddingTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
          {[...Array(12)].map((_, i) => (
            <CategoryCardSkeleton key={i} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header matching web CategoriesPage 1:1 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('HomeTab');
            }
          }}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={16} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>{t('back')}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('categories')}</Text>
      </View>
      
      <FlatList
        data={categories}
        keyExtractor={(item, index) => String(item?.id ?? index)}
        numColumns={3}
        refreshing={refreshing}
        onRefresh={() => fetchCategories(true)}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.columnWrapper}
        initialNumToRender={9}
        maxToRenderPerBatch={9}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        getItemLayout={getItemLayout}
        renderItem={renderCategoryItem}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  listContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 14,
    paddingBottom: 120,
  },
  columnWrapper: {
    gap: GAP,
    marginBottom: GAP,
  },
  categoryCardStyle: {
    width: '100%',
    aspectRatio: 1,
    marginRight: 0,
  },
});


