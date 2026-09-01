import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../../constants/theme';
import { apiClient } from '../../api/client';

export function AddressesScreen({ navigation }: { navigation: NativeStackNavigationProp<any> }) {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAddresses();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchAddresses = async () => {
    try {
      const res = await apiClient.get('/auth/addresses/');
      setAddresses(res.data);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/auth/addresses/${id}/`);
            fetchAddresses();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete address');
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Addresses</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{item.address_type}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Feather name="trash-2" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
              <Text style={styles.addressLine}>{item.address_line_1}</Text>
              {item.address_line_2 ? <Text style={styles.addressLine}>{item.address_line_2}</Text> : null}
              <Text style={styles.addressLine}>{item.city}, {item.state} - {item.pincode}</Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContent}>
              <Feather name="map-pin" size={48} color={theme.colors.border} />
              <Text style={styles.emptyText}>No saved addresses found</Text>
            </View>
          }
        />
      )}

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddAddressScreen')}>
        <Feather name="plus" color={theme.colors.surface} size={24} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: theme.spacing.md, backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  backButton: { marginRight: theme.spacing.md },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: theme.spacing.md },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  typeBadge: {
    backgroundColor: theme.colors.border,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4,
  },
  typeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  addressLine: { fontSize: 14, color: theme.colors.text, marginBottom: 2 },
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: theme.spacing.md, color: theme.colors.textSecondary },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
  },
});
