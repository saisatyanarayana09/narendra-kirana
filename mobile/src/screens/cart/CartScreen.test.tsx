import React from 'react';
import { render } from '@testing-library/react-native';
import { CartScreen } from './CartScreen';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
  }),
}));

// Mock Contexts
let mockCartContext = {
  cart: { items: [] },
  isLoading: false,
  error: null,
  updateQuantity: jest.fn(),
  removeFromCart: jest.fn(),
  clearCart: jest.fn(),
};

jest.mock('../../context/CartContext', () => ({
  useCart: () => mockCartContext,
}));

jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: { primary: '#000', text: '#000', textSecondary: '#666', background: '#fff', border: '#ccc', surface: '#fff' },
    isDark: false,
  }),
}));

// Mock API Client to prevent network calls
jest.mock('../../api/store', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

describe('CartScreen Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays the empty state correctly when cart has no items', () => {
    mockCartContext = {
      ...mockCartContext,
      cart: { items: [] },
      isLoading: false,
    };

    const { getByText } = render(<CartScreen />);
    
    expect(getByText('Your cart is empty')).toBeTruthy();
    expect(getByText('Start adding items to your cart.')).toBeTruthy();
  });

  it('displays a loading spinner when isLoading is true and cart is empty', () => {
    mockCartContext = {
      ...mockCartContext,
      cart: null as any,
      isLoading: true,
    };

    const { getByTestId } = render(<CartScreen />);
    // Assumes LoadingSpinner component renders an ActivityIndicator 
    // You might need to add testID="loading-spinner" to LoadingSpinner if not found
    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('renders cart items when cart is populated', () => {
    mockCartContext = {
      ...mockCartContext,
      cart: {
        id: 1,
        items: [
          {
            id: 101,
            quantity: 2,
            subtotal: '200',
            product: { id: 101, name: 'Test Product', price: '100', is_in_stock: true }
          }
        ],
        total: '200',
        items_total: '200'
      },
      isLoading: false,
    };

    const { getByText } = render(<CartScreen />);
    
    expect(getByText('Test Product')).toBeTruthy();
    expect(getByText('Proceed to Checkout')).toBeTruthy();
  });
});
