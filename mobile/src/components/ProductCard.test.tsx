import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProductCard } from './ProductCard';

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: { primary: '#000', text: '#000', textSecondary: '#666', background: '#fff', border: '#ccc', surface: '#fff' },
    isDark: false,
  }),
}));

describe('ProductCard Component', () => {
  const mockProduct = {
    id: 1,
    name: 'Aashirvaad Atta',
    price: '250.00',
    mrp: '300.00',
    is_in_stock: true,
    image: 'http://example.com/atta.jpg',
  };

  it('renders product details correctly', () => {
    const { getByText } = render(
      <ProductCard 
        product={mockProduct} 
        onPress={() => {}} 
        onAddToCart={() => {}} 
      />
    );
    
    expect(getByText('Aashirvaad Atta')).toBeTruthy();
    expect(getByText('₹250.00')).toBeTruthy();
    expect(getByText('₹300.00')).toBeTruthy(); // MRP strikethrough
  });

  it('calls onAddToCart when add button is pressed', () => {
    const mockOnAdd = jest.fn();
    const { getByText } = render(
      <ProductCard 
        product={mockProduct} 
        onPress={() => {}} 
        onAddToCart={mockOnAdd} 
      />
    );
    
    fireEvent.press(getByText('ADD'));
    expect(mockOnAdd).toHaveBeenCalledWith(mockProduct);
    expect(mockOnAdd).toHaveBeenCalledTimes(1);
  });

  it('displays OUT OF STOCK when stock is false', () => {
    const outOfStockProduct = { ...mockProduct, is_in_stock: false };
    const { getByText, queryByText } = render(
      <ProductCard 
        product={outOfStockProduct} 
        onPress={() => {}} 
        onAddToCart={() => {}} 
      />
    );
    
    expect(getByText('OUT OF STOCK')).toBeTruthy();
    expect(queryByText('ADD')).toBeNull(); // Add button should be hidden
  });
});
