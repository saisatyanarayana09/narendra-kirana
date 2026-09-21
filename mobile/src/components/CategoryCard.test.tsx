import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CategoryCard } from './CategoryCard';

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

describe('CategoryCard Component', () => {
  const mockCategory = {
    id: 1,
    name: 'Fresh Vegetables',
    image: 'https://example.com/veg.jpg',
    slug: 'fresh-vegetables',
  };

  it('renders category name correctly', () => {
    const { getByText } = render(
      <CategoryCard category={mockCategory} onPress={() => {}} index={0} />
    );
    
    expect(getByText('Fresh Vegetables')).toBeTruthy();
  });

  it('triggers onPress with correct category data when tapped', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <CategoryCard category={mockCategory} onPress={mockOnPress} index={0} />
    );
    
    fireEvent.press(getByText('Fresh Vegetables'));
    expect(mockOnPress).toHaveBeenCalledWith(mockCategory);
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});
