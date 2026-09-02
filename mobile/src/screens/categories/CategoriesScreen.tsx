import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity, 
  Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { apiClient } from '../../api/client';
import { CategoryCard } from '../../components/CategoryCard';
import { CategoryCardSkeleton } from '../../components/SkeletonLoader';

const { width } = Dimensions.get('window');
const HORIZONTAL_PADDING = 14;
const GAP = 10;
const CARD_WIDTH = Math.floor((width - (HORIZONTAL_PADDING * 2) - (GAP * 2)) / 3);

export function CategoriesScreen({ navigation }: { navigation: AppNavigationProp }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await apiClient.get('/categories/');
      setCategories(Array.isArray(res.data) ? res.data : (res.data?.results || []));
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
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
            <Feather name="arrow-left" size={16} color="#475569" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Categories</Text>
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header matching web CategoriesPage 1:1 */}
      <View style={styles.header}>
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
          <Feather name="arrow-left" size={16} color="#475569" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Categories</Text>
      </View>
      
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        refreshing={refreshing}
        onRefresh={() => fetchCategories(true)}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={({ item, index }) => (
          <View style={{ width: CARD_WIDTH }}>
            <CategoryCard 
              category={item} 
              index={index}
              style={styles.categoryCardStyle}
              onPress={(c) => navigation.navigate('ProductListScreen', { 
                categoryId: c.id, 
                categoryName: c.name 
              })} 
            />
          </View>
        )}
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


