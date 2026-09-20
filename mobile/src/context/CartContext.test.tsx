import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { CartProvider, useCart } from './CartContext';
import { AuthProvider } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/store';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../api/store', () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
}));

describe('CartContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
      <CartProvider>{children}</CartProvider>
    </AuthProvider>
  );

  it('initializes with an empty cart', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    // Initial state check
    expect(result.current.cart).toBeNull();
    expect(result.current.isLoading).toBe(true); // Assuming it starts loading
  });

  it('addToCart optimistically updates guest cart', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    const mockProduct = {
      id: 101,
      name: 'Test Dal',
      price: '150.00',
      is_in_stock: true,
    };

    // Simulate API resolving the product details for the guest cart
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockProduct });

    await act(async () => {
      await result.current.addToCart(101, 1, mockProduct);
    });

    // Verify cart state updated
    expect(result.current.cart).not.toBeNull();
    expect(result.current.cart?.items.length).toBe(1);
    expect(result.current.cart?.items[0].product.id).toBe(101);
    expect(result.current.cart?.items[0].quantity).toBe(1);
  });

  it('updateQuantity modifies item quantity correctly', async () => {
    // Setup a pre-existing guest cart in AsyncStorage
    const initialCart = {
      id: 1,
      items: [
        { id: 1, product: { id: 101, price: '100' }, quantity: 1, subtotal: '100' }
      ],
      total: '100',
      items_total: '100'
    };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(initialCart));

    const { result } = renderHook(() => useCart(), { wrapper });

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Update quantity
    await act(async () => {
      await result.current.updateQuantity(1, 3);
    });

    expect(result.current.cart?.items[0].quantity).toBe(3);
  });
});
