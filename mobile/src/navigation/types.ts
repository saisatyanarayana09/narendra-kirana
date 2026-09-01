import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type GlobalParamList = {
  HomeTab: { screen?: string; params?: any } | undefined;
  CategoriesTab: { screen?: string; params?: any } | undefined;
  FavoritesTab: { screen?: string; params?: any } | undefined;
  CartTab: { screen?: string; params?: any } | undefined;
  ProfileTab: { screen?: string; params?: any } | undefined;

  MainTabs: undefined;
  HomeScreen: undefined;
  ProductListScreen: { categoryId: number; categoryName?: string };
  CategoriesScreen: undefined;
  FavoritesScreen: undefined;
  CartScreen: undefined;
  ProductDetailScreen: { productId: number };
  CheckoutScreen: undefined;
  OrderSuccessScreen: { orderId: number };
  OrderTrackingScreen: { orderId: number };
  SearchScreen: undefined;
  ProfileScreen: undefined;
  OrderHistoryScreen: undefined;
  AddressesScreen: undefined;
  AddAddressScreen: undefined;
  WalletScreen: undefined;
  ReferAndEarnScreen: undefined;
  AccountSettingsScreen: undefined;
  NotificationsScreen: undefined;
};

export type AppNavigationProp = NativeStackNavigationProp<GlobalParamList>;
