import { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type GlobalParamList = {
  HomeTab: { screen?: string; params?: any } | undefined;
  CategoriesTab: { screen?: string; params?: any } | undefined;
  OrdersTab: { screen?: string; params?: any } | undefined;
  FavoritesTab: { screen?: string; params?: any } | undefined;
  CartTab: { screen?: string; params?: any } | undefined;
  ProfileTab: { screen?: string; params?: any } | undefined;

  Main: { screen?: string; params?: any } | undefined;
  MainTabs: undefined;
  WelcomeScreen: { forceShow?: boolean } | undefined;
  HomeScreen: undefined;
  ProductListScreen:
    | { categoryId?: number | null; categoryName?: string; search?: string }
    | undefined;
  CategoriesScreen: undefined;
  FavoritesScreen: undefined;
  CartScreen: undefined;
  ProductDetailScreen: { productId: number; initialProduct?: any };
  CheckoutScreen: { deliveryInstructions?: string } | undefined;
  OrderSuccessScreen: { orderId: string | number; initialOrder?: any };
  OrderTrackingScreen: { orderId: string | number; initialOrder?: any };
  InvoiceScreen: { orderId: string | number; initialOrder?: any };
  SearchScreen: { autoStartVoice?: boolean } | undefined;
  ProfileScreen: undefined;
  OrderHistoryScreen: undefined;
  AddressesScreen: undefined;
  AddAddressScreen: { editingAddress?: any } | undefined;
  WalletScreen: undefined;
  ReferAndEarnScreen: undefined;
  AccountSettingsScreen: undefined;
  NotificationsScreen: undefined;
  AppSettingsScreen: undefined;
  OffersScreen: undefined;
  LanguageScreen: undefined;
  ForgotPasswordScreen: undefined;
  ResetPasswordScreen:
    | { uid?: string; token?: string; email?: string; mode?: "otp" | "link" }
    | undefined;
  Auth: { screen?: string; params?: any } | undefined;
  Login: undefined;
  Signup: undefined;
};

export type AppNavigationProp = NativeStackNavigationProp<GlobalParamList>;
