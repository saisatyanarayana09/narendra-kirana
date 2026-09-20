import React from 'react';
import { render } from '@testing-library/react-native';
import { FloatingCartBar } from './FloatingCartBar';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock contexts
const mockThemeContext = {
  colors: { primary: '#000', text: '#000', background: '#fff', border: '#ccc', surface: '#fff' },
  isDark: false,
};
jest.mock('../context/ThemeContext', () => ({
  useTheme: () => mockThemeContext,
}));

describe('FloatingCartBar Component', () => {
  it('renders nothing when cart is empty', () => {
    const { toJSON } = render(
      <FloatingCartBar 
        cart={{ items: [] }} 
        storeSettings={{ free_delivery_threshold: '500' }} 
      />
    );
    expect(toJSON()).toBeNull();
  });

  it('calculates total correctly and shows shortfall for free delivery', () => {
    const mockCart = {
      items: [
        { id: 1, quantity: 2, product: { price: '100' }, subtotal: '200' }
      ],
      items_total: '200'
    };

    const { getByText } = render(
      <FloatingCartBar 
        cart={mockCart} 
        storeSettings={{ free_delivery_threshold: '500' }} 
      />
    );
    
    // 2 items
    expect(getByText('2 Items')).toBeTruthy();
    // 500 threshold - 200 total = 300 shortfall
    expect(getByText('Add ₹300 more for FREE Delivery')).toBeTruthy();
  });

  it('shows free delivery unlocked when threshold is met', () => {
    const mockCart = {
      items: [
        { id: 1, quantity: 5, product: { price: '100' }, subtotal: '500' }
      ],
      items_total: '500'
    };

    const { getByText } = render(
      <FloatingCartBar 
        cart={mockCart} 
        storeSettings={{ free_delivery_threshold: '500' }} 
      />
    );
    
    expect(getByText('FREE Delivery Unlocked!')).toBeTruthy();
  });
});
